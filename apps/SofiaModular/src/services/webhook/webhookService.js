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
const { colombiaDateString }   = require('../../utils/dateHelpers');
const logger                   = require('../../utils/logger');
const { processCandidateCallFail } = require('../../../chatbot/chatbot.service');

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
 * Try to infer callback hour from free text.
 * Examples: "llamame a las 15:00", "llamame a las 3 de la tarde", "a las 9 PM".
 *
 * @param {string|null} nota
 * @returns {string|null}
 */
function parseHoraCallbackFromNota(nota) {
  if (!nota || typeof nota !== 'string') return null;
  const text = nota.trim();

  const hasPmHint = /\b(tarde|noche)\b/i.test(text);
  const hasAmHint = /\b(manana|mañana)\b/i.test(text);

  const withMinutes = text.match(/\b(\d{1,2}):(\d{2})(?:\s*(AM|PM))?\b/i);
  if (withMinutes) {
    let h = parseInt(withMinutes[1], 10);
    const m = parseInt(withMinutes[2], 10);
    const ap = withMinutes[3] ? withMinutes[3].toUpperCase() : (hasPmHint ? 'PM' : (hasAmHint ? 'AM' : null));

    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;

    if (h >= 0 && h < 24 && m >= 0 && m < 60) {
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
  }

  const hourOnly = text.match(/\ba\s+las\s+(\d{1,2})(?:\s*(AM|PM))?/i)
    || text.match(/\b(\d{1,2})\s*(AM|PM)\b/i)
    || text.match(/\b(\d{1,2})\s*(?:de la)?\s*(manana|mañana|tarde|noche)\b/i);

  if (hourOnly) {
    let h = parseInt(hourOnly[1], 10);
    const token = (hourOnly[2] || '').toUpperCase();
    const ap = token === 'AM' || token === 'PM'
      ? token
      : (hasPmHint ? 'PM' : (hasAmHint ? 'AM' : null));

    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;

    if (h >= 0 && h < 24) return `${String(h).padStart(2, '0')}:00`;
  }

  return null;
}

/**
 * Accepts slight payload variations from senders.
 *
 * @param {object} payload
 * @returns {object}
 */
function normalizePayload(payload) {
  return {
    candidatoId: payload?.candidato_id || payload?.candidatoId || payload?.id || null,
    conversationId: payload?.conversation_id || payload?.conversationId || null,
    resultado: payload?.resultado || payload?.result || null,
    dia: payload?.dia || null,
    hora: payload?.hora || null,
    eventoIdRaw: payload?.evento_id ?? payload?.eventoId ?? null,
    nota: payload?.nota || payload?.note || payload?.resumen || null,
    horaCallbackRaw: payload?.hora_callback || payload?.horaCallback || null,
    duracionRaw: payload?.duracion_segundos ?? payload?.duracionSegundos ?? null,
  };
}

function isCallbackHourAllowed(hhmm) {
  if (!hhmm) return false;
  const [hRaw, mRaw] = hhmm.split(':');
  const h = Number(hRaw);
  const m = Number(mRaw);
  return Number.isInteger(h) && Number.isInteger(m) && h >= 6 && h < 22 && m >= 0 && m < 60;
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
  const normalized = normalizePayload(payload);
  const candidatoId = normalized.candidatoId;
  const conversationId = normalized.conversationId;

  // ElevenLabs may send "PENDIENTE" when the candidate was reached but no
  // slot was available.  This code does not exist in resultados_llamada, so
  // we map it to OCUPADO (same re-queue behaviour) before any DB look-up.
  let resultadoCodigo = String(normalized.resultado || '').toUpperCase();
  if (resultadoCodigo === 'PENDIENTE') {
    logger.info(
      { event: 'resultado_normalizado', original: 'PENDIENTE', normalizado: 'OCUPADO', candidato_id: candidatoId },
      'resultado PENDIENTE normalizado a OCUPADO para look-up en BD',
    );
    resultadoCodigo = 'OCUPADO';
  }

  const diaAgendado     = normalized.dia;
  const horaAgendado    = normalized.hora;
  const eventoId        = normalized.eventoIdRaw !== null ? Number(normalized.eventoIdRaw) : null;
  const nota            = normalized.nota;
  const horaCallbackRaw = normalized.horaCallbackRaw;
  const duracion        = normalized.duracionRaw !== null ? Number(normalized.duracionRaw) : null;

  // Parse hora_callback into HH:MM 24h format. If missing, infer from note.
  const horaCandidate = parseHoraCallback(horaCallbackRaw) || parseHoraCallbackFromNota(nota);
  const horaCallback = isCallbackHourAllowed(horaCandidate) ? horaCandidate : null;

  logger.info(
    {
      event:        'webhook_received',
      candidato_id: candidatoId,
      conversation_id: conversationId,
      resultado:    resultadoCodigo,
      evento_id:    eventoId,
      hora_callback: horaCallback,
    },
    'Processing ElevenLabs webhook result',
  );

  if ((!candidatoId && !conversationId) || !resultadoCodigo) {
    throw new Error('Missing required fields: (candidato_id or conversation_id) and resultado');
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
    let llamadaRows = [];
    if (conversationId) {
      const byConversation = await client.query(
        `SELECT id, candidato_id FROM public.llamadas
         WHERE conversation_id = $1
         ORDER BY fecha_hora_llamada DESC
         LIMIT 1`,
        [conversationId],
      );
      llamadaRows = byConversation.rows;
    }

    if (!llamadaRows.length && candidatoId) {
      const byCandidate = await client.query(
        `SELECT id, candidato_id FROM public.llamadas
         WHERE candidato_id = $1
           AND resultado_id = $2
         ORDER BY fecha_hora_llamada DESC
         LIMIT 1`,
        [candidatoId, enCursoId],
      );
      llamadaRows = byCandidate.rows;
    }

    let llamadaId = llamadaRows[0]?.id || null;
    const resolvedCandidatoId = llamadaRows[0]?.candidato_id || candidatoId;

    if (!llamadaId && resolvedCandidatoId) {
      const { rows: fallback } = await client.query(
        `SELECT id FROM public.llamadas
         WHERE candidato_id = $1
           AND fecha_hora_llamada::date = CURRENT_DATE
         ORDER BY fecha_hora_llamada DESC
         LIMIT 1`,
        [resolvedCandidatoId],
      );
      llamadaId = fallback[0]?.id || null;
      if (llamadaId) {
        logger.warn(
          { event: 'llamada_fallback', candidato_id: resolvedCandidatoId, llamada_id: String(llamadaId) },
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
        { event: 'llamada_not_found', candidato_id: resolvedCandidatoId, conversation_id: conversationId },
        'No llamada found for this candidate today – skipping llamadas update',
      );
    }

    // ── 5. Update candidato ───────────────────────────────────────────────
    // - Always increment intentos_llamada (total call counter)
    // - Increment intentos_franja_actual only for non-conclusive results
    //   (reset to 0 when call is definitively done: AGENDADO, COMPLETADO, etc.)
    // - Save nota_horario when candidate gave a callback preference
    const incrementFranja = !NO_INCREMENT_FRANJA.has(resultadoCodigo);

    if (resolvedCandidatoId) {
      await client.query(
        `UPDATE public.candidatos c
         SET ultimo_contacto        = NOW(),
             evento_asignado_id     = $1,
             estado_gestion_id      = $2,
             intentos_llamada       = c.intentos_llamada + 1,
             intentos_franja_actual = CASE
               WHEN $3 THEN c.intentos_franja_actual + 1
               ELSE         0
             END,
             franja_actual          = CASE
               WHEN (SELECT h.codigo FROM public.horarios h WHERE h.id = c.horario_id) = 'PM' THEN 'tarde'
               WHEN (SELECT h.codigo FROM public.horarios h WHERE h.id = c.horario_id) = 'AM' THEN 'manana'
               ELSE c.franja_actual
             END,
             nota_horario           = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE c.nota_horario END,
             updated_at             = NOW()
         WHERE c.id = $5`,
        [eventoId, estadoGestionId, incrementFranja, nota, resolvedCandidatoId],
      );
    }
    details.candidato_updated = Boolean(resolvedCandidatoId);
    logger.info(
      { event: 'candidato_updated', candidato_id: resolvedCandidatoId, estado: estadoGestionCodigo, intentos_incrementados: incrementFranja },
      'Candidato updated',
    );

    await client.query('COMMIT');

    logger.info(
      { event: 'webhook_processed', candidato_id: candidatoId, resultado: resultadoCodigo },
      'Webhook processed successfully',
    );

    // ── 9. Chatbot Trigger (Despertar a SofIA Chat) ───────────────────────
    // Si la llamada no fue contestada, verificamos si cumplimos la regla de 9 llamadas
    if (resultadoCodigo === 'NO_CONTESTA' && candidatoId) {
       // Ejecutar en background (no await para no bloquear respuesta webhook)
       processCandidateCallFail(candidatoId).catch(err => {
         logger.error({ event: 'chatbot_trigger_error', err: err.message }, 'Error triggering chatbot');
       });
    }

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

