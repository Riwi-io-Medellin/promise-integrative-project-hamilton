/**
 * src/services/webhook/webhookService.js – ElevenLabs webhook processor
 *
 * Expected payload from ElevenLabs agent:
 * {
 *   "candidato_id":      "uuid",
 *   "resultado":         "AGENDADO",        ← resultados_llamada.codigo
 *   "dia":               "martes",          ← only when AGENDADO
 *   "hora":              "10:00 AM",        ← only when AGENDADO
 *   "evento_id":         2,                 ← only when AGENDADO
 *   "nota":              "texto libre",     ← optional summary / reason for callback
 *   "hora_callback":     "21:00",           ← HH:MM Colombia time; triggers PERSONALIZADA call
 *   "duracion_segundos": 120                ← optional
 * }
 *
 * hora_callback flow:
 *   When a candidate says "llámame a las 9 PM", ElevenLabs sends hora_callback="21:00"
 *   (and resultado="OCUPADO").  We:
 *     1. Save the note on candidatos.nota_horario
 *     2. Insert a PERSONALIZADA cola_llamadas row for today at that time
 *     3. The queue worker will pick it up the moment the time arrives
 */
'use strict';

const pool                     = require('../../db/pool');
const { insertPersonalizadaItem } = require('../../db/cola');
const { colombiaDateString }   = require('../../utils/dateHelpers');
const logger                   = require('../../utils/logger');

/** resultados that permanently close the queue row */
const FINAL_RESULTADOS = new Set(['AGENDADO', 'COMPLETADO', 'NUM_INVALIDO', 'DESCARTADO']);

/** resultados where intentos_franja_actual should NOT be incremented (call was conclusive) */
const NO_INCREMENT_FRANJA = new Set(['AGENDADO', 'COMPLETADO', 'NUM_INVALIDO', 'DESCARTADO']);

/**
 * Maps resultado_llamada.codigo → estados_gestion.codigo
 */
function mapResultadoToEstadoGestion(codigo) {
  const MAP = {
    AGENDADO:     'AGENDADO',
    NO_CONTESTA:  'NO_CONTESTA',
    OCUPADO:      'NO_CONTESTA',   // OCUPADO → keep as NO_CONTESTA for re-queuing
    NUM_INVALIDO: 'DESCARTADO',
    COMPLETADO:   'INSCRITO',
    DESCARTADO:   'DESCARTADO',
    EN_CURSO:     'PENDIENTE',
  };
  return MAP[codigo] || 'PENDIENTE';
}

/**
 * Parse a time string into HH:MM (24-hour).
 * Accepts "21:00", "9:00 PM", "9 PM", "21:00:00", etc.
 * Returns null if unparseable.
 *
 * @param {string} raw
 * @returns {string|null}
 */
function parseHoraCallback(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const s = raw.trim();

  // Already HH:MM or HH:MM:SS
  const hhmm = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (hhmm) {
    const h = parseInt(hhmm[1], 10);
    const m = parseInt(hhmm[2], 10);
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  // "9:00 PM" / "9 PM" / "9:00 AM"
  const ampm = s.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
  if (ampm) {
    let h    = parseInt(ampm[1], 10);
    const m  = parseInt(ampm[2] || '0', 10);
    const ap = ampm[3].toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  return null;
}

/**
 * Process an ElevenLabs webhook result.
 * All DB writes run inside a single transaction.
 *
 * @param {object} payload
 * @returns {Promise<{success: boolean, details: object}>}
 */
async function processWebhookResult(payload) {
  // ── 1. Normalise payload ──────────────────────────────────────────────────
  const candidatoId = payload.candidato_id;

  // ElevenLabs may send "PENDIENTE" when the candidate was reached but no
  // slot was available.  This code does not exist in resultados_llamada, so
  // we map it to OCUPADO (same re-queue behaviour) before any DB look-up.
  let resultadoCodigo = (payload.resultado || '').toUpperCase();
  if (resultadoCodigo === 'PENDIENTE') {
    logger.info(
      { event: 'resultado_normalizado', original: 'PENDIENTE', normalizado: 'OCUPADO', candidato_id: candidatoId },
      'resultado PENDIENTE normalizado a OCUPADO para look-up en BD',
    );
    resultadoCodigo = 'OCUPADO';
  }

  const diaAgendado     = payload.dia              || null;
  const horaAgendado    = payload.hora             || null;
  const eventoId        = payload.evento_id ? Number(payload.evento_id) : null;
  const nota            = payload.nota             || null;
  const horaCallbackRaw = payload.hora_callback    || null;
  const duracion        = payload.duracion_segundos ? Number(payload.duracion_segundos) : null;

  // Parse hora_callback into HH:MM 24h format
  const horaCallback = parseHoraCallback(horaCallbackRaw);

  logger.info(
    {
      event:        'webhook_received',
      candidato_id: candidatoId,
      resultado:    resultadoCodigo,
      evento_id:    eventoId,
      hora_callback: horaCallback,
    },
    'Processing ElevenLabs webhook result',
  );

  if (!candidatoId || !resultadoCodigo) {
    throw new Error('Missing required fields: candidato_id and resultado');
  }

  // ── 2. Resolve lookup IDs (read-only, before transaction) ─────────────────
  const { rows: rlRows } = await pool.query(
    'SELECT id FROM public.resultados_llamada WHERE codigo = $1 LIMIT 1',
    [resultadoCodigo],
  );
  if (!rlRows.length) throw new Error(`Unknown resultado codigo: ${resultadoCodigo}`);
  const resultadoId = rlRows[0].id;

  const { rows: enCursoRows } = await pool.query(
    "SELECT id FROM public.resultados_llamada WHERE codigo = 'EN_CURSO' LIMIT 1",
  );
  if (!enCursoRows.length) throw new Error("resultados_llamada row 'EN_CURSO' not found");
  const enCursoId = enCursoRows[0].id;

  const estadoGestionCodigo = mapResultadoToEstadoGestion(resultadoCodigo);
  const { rows: egRows } = await pool.query(
    'SELECT id FROM public.estados_gestion WHERE codigo = $1 LIMIT 1',
    [estadoGestionCodigo],
  );
  if (!egRows.length) throw new Error(`Unknown estado_gestion codigo: ${estadoGestionCodigo}`);
  const estadoGestionId = egRows[0].id;

  // ── 3. Open transaction ───────────────────────────────────────────────────
  const client  = await pool.connect();
  const details = {};

  try {
    await client.query('BEGIN');

    // ── 4. Update llamadas ────────────────────────────────────────────────
    // Find the EN_CURSO llamada for this candidate; fall back to most recent today.
    const { rows: llamadaRows } = await client.query(
      `SELECT id FROM public.llamadas
       WHERE candidato_id = $1
         AND resultado_id = $2
       ORDER BY fecha_hora_llamada DESC
       LIMIT 1`,
      [candidatoId, enCursoId],
    );

    let llamadaId = llamadaRows[0]?.id || null;

    if (!llamadaId) {
      const { rows: fallback } = await client.query(
        `SELECT id FROM public.llamadas
         WHERE candidato_id = $1
           AND fecha_hora_llamada::date = CURRENT_DATE
         ORDER BY fecha_hora_llamada DESC
         LIMIT 1`,
        [candidatoId],
      );
      llamadaId = fallback[0]?.id || null;
      if (llamadaId) {
        logger.warn(
          { event: 'llamada_fallback', candidato_id: candidatoId, llamada_id: String(llamadaId) },
          'No EN_CURSO llamada found – using most recent llamada of today',
        );
      }
    }

    if (llamadaId) {
      await client.query(
        `UPDATE public.llamadas
         SET resultado_id       = $1,
             dia_agendado       = $2,
             hora_agendado      = $3,
             evento_asignado_id = $4,
             resumen            = $5,
             duracion_segundos  = $6
         WHERE id = $7`,
        [resultadoId, diaAgendado, horaAgendado, eventoId, nota, duracion, llamadaId],
      );
      details.llamada_id = String(llamadaId);
      logger.info({ event: 'llamada_updated', llamada_id: String(llamadaId) }, 'Llamada updated');
    } else {
      logger.warn(
        { event: 'llamada_not_found', candidato_id: candidatoId },
        'No llamada found for this candidate today – skipping llamadas update',
      );
    }

    // ── 5. Update candidato ───────────────────────────────────────────────
    // - Always increment intentos_llamada (total call counter)
    // - Increment intentos_franja_actual only for non-conclusive results
    //   (reset to 0 when call is definitively done: AGENDADO, COMPLETADO, etc.)
    // - Save nota_horario when candidate gave a callback preference
    const incrementFranja = !NO_INCREMENT_FRANJA.has(resultadoCodigo);

    await client.query(
      `UPDATE public.candidatos
       SET ultimo_contacto       = NOW(),
           evento_asignado_id    = $1,
           estado_gestion_id     = $2,
           intentos_llamada      = intentos_llamada + 1,
           intentos_franja_actual = CASE
             WHEN $3 THEN intentos_franja_actual + 1
             ELSE         0
           END,
           nota_horario          = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE nota_horario END,
           updated_at            = NOW()
       WHERE id = $5`,
      [eventoId, estadoGestionId, incrementFranja, nota, candidatoId],
    );
    details.candidato_updated = true;
    logger.info(
      { event: 'candidato_updated', candidato_id: candidatoId, estado: estadoGestionCodigo, intentos_incrementados: incrementFranja },
      'Candidato updated',
    );

    // ── 6. Update evento if AGENDADO ──────────────────────────────────────
    if (resultadoCodigo === 'AGENDADO' && eventoId) {
      const { rows: evUpdated } = await client.query(
        `UPDATE public.eventos
         SET inscritos_actuales = inscritos_actuales + 1,
             estado = CASE
               WHEN inscritos_actuales + 1 >= capacidad_total THEN 'COMPLETO'
               ELSE estado
             END,
             updated_at = NOW()
         WHERE id = $1
           AND estado != 'COMPLETO'
         RETURNING inscritos_actuales, estado`,
        [eventoId],
      );
      if (evUpdated.length) {
        details.evento_updated = { evento_id: eventoId, ...evUpdated[0] };
        logger.info({ event: 'evento_updated', evento_id: eventoId, ...evUpdated[0] }, 'Evento updated');
      }
    }

    // ── 7. Update cola_llamadas ───────────────────────────────────────────
    const today           = colombiaDateString();
    const nuevoEstadoCola = FINAL_RESULTADOS.has(resultadoCodigo) ? 'COMPLETADA' : 'CANCELADA';

    await client.query(
      `UPDATE public.cola_llamadas
       SET estado = $1
       WHERE candidato_id    = $2
         AND fecha_programada = $3
         AND estado IN ('PENDIENTE', 'EN_CURSO')`,
      [nuevoEstadoCola, candidatoId, today],
    );
    details.queue_estado = nuevoEstadoCola;
    logger.info({ event: 'cola_updated', nuevo_estado: nuevoEstadoCola }, `Cola → ${nuevoEstadoCola}`);

    await client.query('COMMIT');

    // ── 8. Schedule PERSONALIZADA callback (outside transaction — not critical) ─
    // If the candidate asked to be called back at a specific time,
    // insert a high-priority PERSONALIZADA queue item for today.
    if (horaCallback && !FINAL_RESULTADOS.has(resultadoCodigo)) {
      try {
        const inserted = await insertPersonalizadaItem({
          candidatoId:     candidatoId,
          prioridad:       100, // user-requested → highest priority
          horaProgramada:  horaCallback,
          fechaProgramada: today,
        });
        if (inserted) {
          details.personalizada_scheduled = { hora: horaCallback };
          logger.info(
            { event: 'personalizada_scheduled', candidato_id: candidatoId, hora: horaCallback },
            `Personalizada callback scheduled at ${horaCallback}`,
          );
        }
      } catch (err) {
        // Non-fatal: log and continue
        logger.error(
          { event: 'personalizada_insert_error', candidato_id: candidatoId, err: err.message },
          'Could not insert personalizada queue item',
        );
      }
    }

    logger.info(
      { event: 'webhook_processed', candidato_id: candidatoId, resultado: resultadoCodigo },
      'Webhook processed successfully',
    );
    return { success: true, details };

  } catch (err) {
    await client.query('ROLLBACK');
    logger.error(
      { event: 'webhook_transaction_error', candidato_id: candidatoId, err: err.message },
      'Transaction rolled back',
    );
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { processWebhookResult };

