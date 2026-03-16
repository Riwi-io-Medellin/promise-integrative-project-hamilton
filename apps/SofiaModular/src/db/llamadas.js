/**
 * src/db/llamadas.js – Llamadas repository
 *
 * Covers public.llamadas
 */
'use strict';

const pool = require('./pool');

/**
 * Count active calls (resultado_id = EN_CURSO).
 *
 * Equivalent to "Contar llamadas activas" node in Varios.
 *
 * @param {number} enCursoResultadoId
 * @returns {Promise<number>}
 */
async function countActiveCalls(enCursoResultadoId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM public.llamadas
     WHERE resultado_id = $1`,
    [enCursoResultadoId],
  );
  return rows[0].total;
}

/**
 * Insert a new llamada record (status = EN_CURSO when call is initiated).
 *
 * Equivalent to "Crear Llamada" node in both n8n flows.
 *
 * @param {object} data
 * @param {string} data.candidatoId
 * @param {number} data.resultadoId
 * @param {string|null} data.conversationId
 * @param {string} [data.resumen]
 * @returns {Promise<object>} – inserted row
 */
async function createLlamada(data) {
  const { rows } = await pool.query(
    `INSERT INTO public.llamadas
       (candidato_id, fecha_hora_llamada, resultado_id, conversation_id, resumen)
     VALUES ($1, NOW(), $2, $3, $4)
     RETURNING *`,
    [
      data.candidatoId,
      data.resultadoId,
      data.conversationId || null,
      data.resumen || 'Llamada iniciada',
    ],
  );
  return rows[0];
}

/**
 * Find the most recent EN_CURSO llamada for a candidate.
 *
 * @param {string} candidatoId
 * @param {number} enCursoResultadoId
 * @returns {Promise<object|null>}
 */
async function getLatestActiveLlamada(candidatoId, enCursoResultadoId) {
  const { rows } = await pool.query(
    `SELECT * FROM public.llamadas
     WHERE candidato_id = $1
       AND resultado_id = $2
     ORDER BY fecha_hora_llamada DESC
     LIMIT 1`,
    [candidatoId, enCursoResultadoId],
  );
  return rows[0] || null;
}

/**
 * Update a llamada after receiving the ElevenLabs webhook result.
 *
 * Equivalent to "Actualizar tabla llamada" node in Asesor Nueva BD.
 *
 * @param {number|bigint} llamadaId
 * @param {object} fields
 * @param {number}      fields.resultadoId
 * @param {string|null} [fields.diaAgendado]
 * @param {string|null} [fields.horaAgendado]
 * @param {number|null} [fields.eventoAsignadoId]
 * @param {string|null} [fields.resumen]
 * @param {number|null} [fields.duracionSegundos]
 * @returns {Promise<void>}
 */
async function updateLlamada(llamadaId, fields) {
  const sets   = [];
  const values = [];
  let   idx    = 1;

  sets.push(`resultado_id = $${idx++}`);
  values.push(fields.resultadoId);

  if (fields.diaAgendado !== undefined) {
    sets.push(`dia_agendado = $${idx++}`);
    values.push(fields.diaAgendado);
  }
  if (fields.horaAgendado !== undefined) {
    sets.push(`hora_agendado = $${idx++}`);
    values.push(fields.horaAgendado);
  }
  if (fields.eventoAsignadoId !== undefined) {
    sets.push(`evento_asignado_id = $${idx++}`);
    values.push(fields.eventoAsignadoId);
  }
  if (fields.resumen !== undefined) {
    sets.push(`resumen = $${idx++}`);
    values.push(fields.resumen);
  }
  if (fields.duracionSegundos !== undefined) {
    sets.push(`duracion_segundos = $${idx++}`);
    values.push(fields.duracionSegundos);
  }

  values.push(llamadaId);
  await pool.query(
    `UPDATE public.llamadas SET ${sets.join(', ')} WHERE id = $${idx}`,
    values,
  );
}

module.exports = {
  countActiveCalls,
  createLlamada,
  getLatestActiveLlamada,
  updateLlamada,
};

