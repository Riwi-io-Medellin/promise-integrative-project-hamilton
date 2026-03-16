/**
 * src/db/cola.js – Cola llamadas repository
 *
 * Covers public.cola_llamadas
 */
'use strict';

const pool = require('./pool');

/**
 * Bulk-insert candidates into cola_llamadas for a given franja.
 * ON CONFLICT DO NOTHING is intentional: if a row already exists for
 * (candidato_id, fecha, franja) it is silently skipped. This makes
 * the fill operation idempotent so we can call it safely at any frequency.
 *
 * @param {Array<{candidatoId, prioridad, franjaProgramada, horaProgramada}>} entries
 * @param {string} fechaProgramada – YYYY-MM-DD
 * @returns {Promise<number>} – rows actually inserted
 */
async function bulkInsertQueue(entries, fechaProgramada) {
  if (entries.length === 0) return 0;

  const values       = [];
  const placeholders = entries.map((e, i) => {
    const base = i * 5;
    values.push(
      e.candidatoId,
      e.prioridad,
      e.franjaProgramada,
      e.horaProgramada || null,
      fechaProgramada,
    );
    return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, 'PENDIENTE')`;
  });

  const sql = `
    INSERT INTO public.cola_llamadas
      (candidato_id, prioridad, franja_programada, hora_programada, fecha_programada, estado)
    VALUES ${placeholders.join(', ')}
    ON CONFLICT DO NOTHING
  `;

  const result = await pool.query(sql, values);
  return result.rowCount;
}

/**
 * Get pending queue items for today ordered by:
 *   1. franja_programada: manana(1) → tarde(2) → noche(3), personalizada(0) when ready
 *   2. prioridad DESC  (higher CI score first within each franja)
 *   3. created_at ASC  (FIFO tie-break)
 *
 * Personalizada items are only returned when their hora_programada has arrived
 * (uses Colombia time via AT TIME ZONE 'America/Bogota').
 *
 * This ordering ensures we finish all mañana calls before starting tarde,
 * finish tarde before noche, and honour user-requested callbacks the moment
 * their scheduled time arrives (highest priority = 0).
 *
 * @param {string} fechaHoy – YYYY-MM-DD
 * @param {number} limit
 * @returns {Promise<Array>}
 */
async function getPendingQueueItems(fechaHoy, limit) {
  const { rows } = await pool.query(
    `SELECT *
     FROM public.cola_llamadas
     WHERE estado = 'PENDIENTE'
       AND fecha_programada = $1
       AND (
         -- Regular franjas: always include when PENDIENTE
         franja_programada != 'personalizada'
         OR
         -- Personalizada: only include once the requested time has arrived
         hora_programada <= (NOW() AT TIME ZONE 'America/Bogota')::time
       )
     ORDER BY
       CASE franja_programada
         WHEN 'personalizada' THEN 0   -- user-requested callback → highest priority
         WHEN 'manana'        THEN 1
         WHEN 'tarde'         THEN 2
         WHEN 'noche'         THEN 3
         ELSE                      4
       END ASC,
       prioridad   DESC,
       created_at  ASC
     LIMIT $2`,
    [fechaHoy, limit],
  );
  return rows;
}

/**
 * Mark a queue item as EN_CURSO.
 *
 * @param {number} colaId
 */
async function markQueueItemEnCurso(colaId) {
  await pool.query(
    `UPDATE public.cola_llamadas SET estado = 'EN_CURSO' WHERE id = $1`,
    [colaId],
  );
}

/**
 * Finalise all active queue items for a candidate on a given date.
 *
 * @param {string} candidatoId
 * @param {string} fechaHoy     – YYYY-MM-DD
 * @param {string} nuevoEstado  – 'COMPLETADA' | 'CANCELADA'
 */
async function finalizeCandidateQueueItems(candidatoId, fechaHoy, nuevoEstado) {
  await pool.query(
    `UPDATE public.cola_llamadas
     SET estado = $1
     WHERE candidato_id    = $2
       AND fecha_programada = $3
       AND estado IN ('PENDIENTE', 'EN_CURSO')`,
    [nuevoEstado, candidatoId, fechaHoy],
  );
}

/**
 * Insert a single PERSONALIZADA queue item for a candidate.
 *
 * Used when ElevenLabs webhook returns hora_callback — the candidate
 * explicitly asked to be called back at a specific time today.
 *
 * @param {object} opts
 * @param {string} opts.candidatoId
 * @param {number} opts.prioridad     – use a high value (e.g. 100) for user-requested callbacks
 * @param {string} opts.horaProgramada – HH:MM  (Colombia time)
 * @param {string} opts.fechaProgramada – YYYY-MM-DD
 * @returns {Promise<object|null>}   – inserted row, or null if already existed
 */
async function insertPersonalizadaItem({ candidatoId, prioridad, horaProgramada, fechaProgramada }) {
  const { rows } = await pool.query(
    `INSERT INTO public.cola_llamadas
       (candidato_id, prioridad, franja_programada, hora_programada, fecha_programada, estado)
     VALUES ($1, $2, 'personalizada', $3::time, $4, 'PENDIENTE')
     ON CONFLICT DO NOTHING
     RETURNING *`,
    [candidatoId, prioridad, horaProgramada, fechaProgramada],
  );
  return rows[0] || null;
}

/**
 * Count all queue items for a specific franja and date (any estado).
 * Returns > 0 if the franja was already filled today (even if calls are done).
 * Used at startup to skip refilling franjas that were already processed.
 *
 * @param {string} fechaProgramada – YYYY-MM-DD
 * @param {string} franja
 * @returns {Promise<number>}
 */
async function countQueueItemsForFranja(fechaProgramada, franja) {
  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total
     FROM public.cola_llamadas
     WHERE fecha_programada  = $1
       AND franja_programada = $2`,
    [fechaProgramada, franja],
  );
  return rows[0].total;
}

module.exports = {
  bulkInsertQueue,
  getPendingQueueItems,
  markQueueItemEnCurso,
  finalizeCandidateQueueItems,
  insertPersonalizadaItem,
  countQueueItemsForFranja,
};
