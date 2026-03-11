/**
 * src/services/cola/processQueue.js – Queue worker
 *
 * Every INTERVAL_SECONDS the worker:
 *   1. (Backfill)   If enough time has passed, fills the queue for the current franja.
 *                   This catches candidates whose previous franja call finished AFTER
 *                   the regular cron ran, ensuring they are not skipped.
 *   2. (Slots)      Counts active EN_CURSO calls and calculates available capacity.
 *   3. (Process)    Fetches PENDIENTE items ordered: personalizada(0) → manana(1)
 *                   → tarde(2) → noche(3), then by prioridad DESC.
 *                   This guarantees mañana calls finish before tarde starts, etc.
 *   4. (Call)       For each item, validates the call window and fires the outbound call.
 *
 * PERSONALIZADA items:
 *   Created when a candidate asks "call me back at X time".
 *   Their hora_programada is checked at the SQL level (only returned once time arrived).
 *   The candidate's default schedule constraint is bypassed — only the global
 *   window (06:00–22:00) applies, since the callback was explicitly requested.
 *
 * Stale call resolution:
 *   EN_CURSO llamadas older than STALE_CALL_MINUTES are auto-resolved as NO_CONTESTA
 *   so they never permanently block Twilio slots.
 */
'use strict';

const { countActiveCalls }                  = require('../../db/llamadas');
const { getPendingQueueItems, markQueueItemEnCurso } = require('../../db/cola');
const { getCandidatoById }                  = require('../../db/candidatos');
const { getAvailableEvents }                = require('../../db/eventos');
const { getMotivoById, getEnCursoResultadoId } = require('../../db/lookups');
const { makeOutboundCall }                  = require('../llamadas/callService');
const { isCallWindowOpen }                  = require('../../utils/timeValidator');
const { colombiaDateString }                = require('../../utils/dateHelpers');
const { llenarColaParaFranja, getFranjaActual } = require('./fillQueue');
const pool                                  = require('../../db/pool');
const logger                                = require('../../utils/logger');

const MAX_CONCURRENT_CALLS = Number(process.env.MAX_CONCURRENT_CALLS)          || 4;
const INTERVAL_SECONDS     = Number(process.env.QUEUE_WORKER_INTERVAL_SECONDS) || 10;
const STALE_CALL_MINUTES   = Number(process.env.STALE_CALL_MINUTES)            || 30;
// How often (ms) the worker triggers a queue backfill for the current franja.
// Keeps the queue populated even when mañana calls finish after the tarde cron ran.
const BACKFILL_INTERVAL_MS = Number(process.env.BACKFILL_INTERVAL_MINUTES || 5) * 60 * 1000;

let workerRunning  = false;
let lastBackfillAt = 0; // epoch ms of last successful backfill

// ── Stale call resolver ───────────────────────────────────────────────────────

/**
 * Auto-resolve EN_CURSO llamadas that have been active for too long.
 * Prevents stale calls from permanently blocking Twilio slots.
 *
 * @param {number} enCursoId
 * @returns {Promise<number>} – rows resolved
 */
async function resolveStaleActiveCalls(enCursoId) {
  const { rows: noContestaRows } = await pool.query(
    "SELECT id FROM public.resultados_llamada WHERE codigo = 'NO_CONTESTA' LIMIT 1",
  );
  if (!noContestaRows.length) return 0;
  const noContestaId = noContestaRows[0].id;

  // 1. Mark stale EN_CURSO llamadas as NO_CONTESTA
  const { rowCount } = await pool.query(
    `UPDATE public.llamadas
     SET resultado_id = $1,
         resumen      = 'Auto-resuelta: sin respuesta del webhook tras ' || $2 || ' minutos'
     WHERE resultado_id = $3
       AND fecha_hora_llamada < NOW() - ($2 || ' minutes')::interval`,
    [noContestaId, STALE_CALL_MINUTES, enCursoId],
  );

  if (rowCount > 0) {
    logger.warn(
      { event: 'stale_calls_resolved', count: rowCount, minutes: STALE_CALL_MINUTES },
      `Resolved ${rowCount} stale EN_CURSO call(s) older than ${STALE_CALL_MINUTES} min`,
    );
  }

  // 2. Cancel orphaned EN_CURSO cola items:
  //    a cola item is "orphaned" when it's EN_CURSO but the candidate has
  //    NO active EN_CURSO llamada (the call ended or was never created properly).
  //
  //    NOTE: fecha_programada is stored using colombiaDateString() (UTC-5), while
  //    PostgreSQL's CURRENT_DATE uses the server clock (UTC). After midnight UTC
  //    (= 7 PM Colombia) the dates differ and the old filter missed stuck items.
  //    We intentionally check ALL dates so items from any day get resolved.
  const { rowCount: colaRowCount } = await pool.query(
    `UPDATE public.cola_llamadas
     SET estado = 'CANCELADA'
     WHERE estado = 'EN_CURSO'
       AND NOT EXISTS (
         SELECT 1 FROM public.llamadas l
         WHERE l.candidato_id = cola_llamadas.candidato_id
           AND l.resultado_id = $1
       )`,
    [enCursoId],
  );

  if (colaRowCount > 0) {
    logger.warn(
      { event: 'orphaned_cola_resolved', count: colaRowCount },
      `Cancelled ${colaRowCount} orphaned EN_CURSO cola item(s)`,
    );
  }

  return rowCount;
}

// ── Backfill ──────────────────────────────────────────────────────────────────

/**
 * Fills the queue for the current franja if enough time has passed since the last fill.
 * This is the safety net that handles the case where a mañana call finishes after the
 * tarde cron already ran — those candidates would otherwise miss their tarde call.
 */
async function maybeBackfillQueue() {
  const now     = Date.now();
  const franja  = getFranjaActual();

  if (!franja) return; // outside all calling windows — nothing to backfill
  if (now - lastBackfillAt < BACKFILL_INTERVAL_MS) return; // too soon

  lastBackfillAt = now;
  try {
    const inserted = await llenarColaParaFranja(franja);
    if (inserted > 0) {
      logger.info(
        { event: 'backfill_done', franja, inserted },
        `Backfill: added ${inserted} new item(s) for franja ${franja}`,
      );
    }
  } catch (err) {
    logger.error({ event: 'backfill_error', franja, err: err.message }, 'Queue backfill failed');
  }
}

// ── Main iteration ────────────────────────────────────────────────────────────

/**
 * Single iteration of the queue worker.
 */
async function runQueueIteration() {
  const enCursoId = await getEnCursoResultadoId();

  // ── 0. Backfill (idempotent, rate-limited) ────────────────────────────────
  await maybeBackfillQueue();

  // ── 1. Resolve stale calls ────────────────────────────────────────────────
  await resolveStaleActiveCalls(enCursoId);

  // ── 2. Count active calls and calculate slots ─────────────────────────────
  const activeCount = await countActiveCalls(enCursoId);
  const available   = Math.max(0, MAX_CONCURRENT_CALLS - activeCount);

  logger.info(
    { event: 'queue_iteration', active: activeCount, available, max: MAX_CONCURRENT_CALLS },
    `Worker tick: ${activeCount} active, ${available} slot(s) available`,
  );

  if (available <= 0) {
    logger.info({ event: 'queue_no_slots' }, 'No available slots – skipping iteration');
    return;
  }

  // ── 3. Fetch pending items (ordered: franja ASC, prioridad DESC) ──────────
  const today = colombiaDateString();
  const items  = await getPendingQueueItems(today, available);

  if (items.length === 0) {
    logger.info({ event: 'queue_empty_today', fecha: today }, 'No pending items for today');
    return;
  }

  logger.info({ event: 'queue_processing', count: items.length }, `Processing ${items.length} item(s)`);

  // ── 4. Process each item sequentially ────────────────────────────────────
  for (const item of items) {
    try {
      await processQueueItem(item);
    } catch (err) {
      logger.error(
        { event: 'queue_item_error', cola_id: item.id, candidato_id: item.candidato_id, err: err.message },
        'Error processing queue item – skipping to next',
      );
    }
  }
}

// ── Single item processor ─────────────────────────────────────────────────────

/**
 * Process one cola_llamadas item.
 *
 * @param {object} item – row from cola_llamadas
 */
async function processQueueItem(item) {
  // ── a. Fetch candidato ────────────────────────────────────────────────────
  const candidato = await getCandidatoById(item.candidato_id);
  if (!candidato) {
    logger.warn({ event: 'candidato_not_found', candidato_id: item.candidato_id }, 'Candidate not found – skipping');
    return;
  }

  // ── b. Validate call window ───────────────────────────────────────────────
  // We check the GLOBAL window (06:00–22:00 Colombia) only.
  // The candidate's horario_codigo (AM/PM/AMPM) is a scheduling priority hint —
  // it influenced WHEN they were queued, but must NOT block the call itself.
  // If they didn't answer in their preferred window we still call them now.
  // PERSONALIZADA items: SQL already ensures hora_programada has arrived.
  if (!isCallWindowOpen(null)) {
    logger.info(
      { event: 'call_window_closed', candidato_id: candidato.id, franja: item.franja_programada },
      'Outside global calling window (06:00–22:00) – leaving item as PENDIENTE',
    );
    return;
  }

  // ── c. Mark queue item as EN_CURSO ────────────────────────────────────────
  await markQueueItemEnCurso(item.id);

  // ── d. Resolve motivo_llamada ─────────────────────────────────────────────
  let motivo = candidato.fase_actual; // safe fallback
  if (candidato.motivo_llamada_id) {
    const motivoRow = await getMotivoById(candidato.motivo_llamada_id);
    if (motivoRow) motivo = motivoRow.codigo;
  }

  // ── e. Fetch available events ─────────────────────────────────────────────
  const eventos = await getAvailableEvents(candidato.fase_actual);

  logger.info(
    {
      event:          'processing_candidate',
      candidato_id:   candidato.id,
      nombre:        `${candidato.nombre} ${candidato.apellido}`,
      franja:         item.franja_programada,
      fase_actual:    candidato.fase_actual,
      motivo,
      intentos:       candidato.intentos_llamada,
      eventos_count:  eventos.length,
    },
    'Preparing outbound call',
  );

  // ── f. Fire outbound call + create llamada record ─────────────────────────
  await makeOutboundCall(candidato, motivo, eventos);
}

// ── Worker loop ───────────────────────────────────────────────────────────────

/**
 * Start the background queue worker.
 * Uses a flag to prevent overlapping iterations.
 */
function startQueueWorker() {
  logger.info(
    {
      event:            'queue_worker_start',
      interval_seconds: INTERVAL_SECONDS,
      stale_minutes:    STALE_CALL_MINUTES,
      backfill_minutes: BACKFILL_INTERVAL_MS / 60000,
    },
    `Queue worker started (tick: ${INTERVAL_SECONDS}s | stale: ${STALE_CALL_MINUTES}min | backfill: ${BACKFILL_INTERVAL_MS / 60000}min)`,
  );

  setInterval(async () => {
    if (workerRunning) {
      logger.warn({ event: 'queue_worker_overlap' }, 'Previous iteration still running – skipping tick');
      return;
    }
    workerRunning = true;
    try {
      await runQueueIteration();
    } catch (err) {
      logger.error({ event: 'queue_iteration_fatal', err: err.message }, 'Fatal error in queue iteration');
    } finally {
      workerRunning = false;
    }
  }, INTERVAL_SECONDS * 1000);
}

module.exports = { startQueueWorker, runQueueIteration };
