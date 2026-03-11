/**
 * src/services/webhook/webhookService.js – ElevenLabs webhook processor
 *
 * ALL DB writes use the same pg client so BEGIN/COMMIT actually wraps them.
 * Previously, repo functions used pool.query (outside the transaction) which
 * meant the transaction was a no-op and updates could be lost on error.
 *
 * Expected payload from ElevenLabs agent:
 * {
 *   "candidato_id": "uuid",
 *   "resultado":    "AGENDADO",   ← resultados_llamada.codigo
 *   "dia":          "martes",
 *   "hora":         "10:00 AM",
 *   "evento_id":    2,
 *   "nota":         "texto libre"
 * }
 */
'use strict';

const pool   = require('../../db/pool');
const { colombiaDateString } = require('../../utils/dateHelpers');
const logger = require('../../utils/logger');

/** Resultados that close the queue row as COMPLETADA */
const FINAL_RESULTADOS = new Set(['AGENDADO', 'COMPLETADO', 'NUM_INVALIDO', 'DESCARTADO']);

/**
 * Maps resultado_llamada.codigo → estados_gestion.codigo
 * (mirrors "Obtener estado_gestion" node – uses resultado directly)
 */
function mapResultadoToEstadoGestion(codigo) {
  const MAP = {
    AGENDADO:     'AGENDADO',
    NO_CONTESTA:  'NO_CONTESTA',
    OCUPADO:      'NO_CONTESTA',
    NUM_INVALIDO: 'DESCARTADO',
    COMPLETADO:   'INSCRITO',
    DESCARTADO:   'DESCARTADO',
    EN_CURSO:     'PENDIENTE',
  };
  return MAP[codigo] || codigo;
}

/**
 * Process an ElevenLabs webhook result.
 * All DB operations run inside a single transaction.
 *
 * @param {object} payload
 * @returns {Promise<{success: boolean, details: object}>}
 */
async function processWebhookResult(payload) {
  // ── 1. Normalise payload ────────────────────────────────────────────────────
  const candidatoId     = payload.candidato_id;
  const resultadoCodigo = (payload.resultado || '').toUpperCase();
  const diaAgendado     = payload.dia       || null;
  const horaAgendado    = payload.hora      || null;
  const eventoId        = payload.evento_id ? Number(payload.evento_id) : null;
  const nota            = payload.nota      || null;
  const duracion        = payload.duracion_segundos ? Number(payload.duracion_segundos) : null;

  logger.info(
    { event: 'webhook_received', candidato_id: candidatoId, resultado: resultadoCodigo, evento_id: eventoId },
    'Processing ElevenLabs webhook result',
  );

  if (!candidatoId || !resultadoCodigo) {
    throw new Error('Missing required fields: candidato_id and resultado');
  }

  // ── 2. Resolve IDs BEFORE opening transaction (read-only lookups) ───────────
  // Equivalent to "Obtener resultado_llamada" + "Obtener estado_gestion" nodes
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

  // ── 3. Open transaction – all writes use this client ───────────────────────
  const client  = await pool.connect();
  const details = {};

  try {
    await client.query('BEGIN');

    // ── 4. Update llamadas ──────────────────────────────────────────────────
    // Equivalent to "Actualizar tabla llamada" node in Asesor Nueva BD.
    //
    // Strategy:
    //   a) Try to find the EN_CURSO llamada for this candidate (normal path).
    //   b) If not found, fall back to the most recent llamada of today.
    //      (covers edge case where the call was already moved out of EN_CURSO)
    const { rows: llamadaRows } = await client.query(
      `SELECT id FROM public.llamadas
       WHERE candidato_id = $1
         AND resultado_id = $2
       ORDER BY fecha_hora_llamada DESC
       LIMIT 1`,
      [candidatoId, enCursoId],
    );

    let llamadaId = llamadaRows[0]?.id || null;

    // Fallback: most recent llamada today for this candidate
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
          'No EN_CURSO llamada found – using most recent llamada of today as fallback',
        );
      }
    }

    if (llamadaId) {
      await client.query(
        `UPDATE public.llamadas
         SET resultado_id      = $1,
             dia_agendado      = $2,
             hora_agendado     = $3,
             evento_asignado_id = $4,
             resumen           = $5,
             duracion_segundos = $6
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

    // ── 5. Update candidato ─────────────────────────────────────────────────
    // Equivalent to "Actualizar Candidato" node
    await client.query(
      `UPDATE public.candidatos
       SET ultimo_contacto    = NOW(),
           evento_asignado_id = $1,
           estado_gestion_id  = $2,
           updated_at         = NOW()
       WHERE id = $3`,
      [eventoId, estadoGestionId, candidatoId],
    );
    details.candidato_updated = true;
    logger.info({ event: 'candidato_updated', candidato_id: candidatoId }, 'Candidato updated');

    // ── 6. Update evento if AGENDADO ────────────────────────────────────────
    // Equivalent to "¿Fue agendado?" → "Parsear evento" → "Actualizar EVENTO"
    if (resultadoCodigo === 'AGENDADO' && eventoId) {
      const { rows: evRows } = await client.query(
        'SELECT inscritos_actuales, capacidad_total, estado FROM public.eventos WHERE id = $1 LIMIT 1',
        [eventoId],
      );
      if (evRows.length && evRows[0].estado !== 'COMPLETO') {
        const { rows: evUpdated } = await client.query(
          `UPDATE public.eventos
           SET inscritos_actuales = inscritos_actuales + 1,
               estado = CASE
                 WHEN inscritos_actuales + 1 >= capacidad_total THEN 'COMPLETO'
                 ELSE estado
               END,
               updated_at = NOW()
           WHERE id = $1
           RETURNING inscritos_actuales, estado`,
          [eventoId],
        );
        details.evento_updated = { evento_id: eventoId, ...evUpdated[0] };
        logger.info({ event: 'evento_updated', evento_id: eventoId, ...evUpdated[0] }, 'Evento updated');
      }
    }

    // ── 7. Update cola_llamadas ─────────────────────────────────────────────
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
    logger.info({ event: 'webhook_processed', candidato_id: candidatoId, resultado: resultadoCodigo }, 'Webhook OK');
    return { success: true, details };

  } catch (err) {
    await client.query('ROLLBACK');
    logger.error({ event: 'webhook_transaction_error', candidato_id: candidatoId, err: err.message }, 'Rolled back');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { processWebhookResult };

