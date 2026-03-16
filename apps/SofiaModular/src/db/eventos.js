/**
 * src/db/eventos.js – Eventos repository
 *
 * Covers public.eventos
 */
'use strict';

const pool = require('./pool');

/**
 * Get available events for a given phase (tipo_reunion).
 *
 * Equivalent to "Obtener Eventos" node in both n8n flows.
 *
 * @param {string} tipoReunion – 'PRUEBA_LOGICA' | 'ENTREVISTA' | 'BIENVENIDA'
 * @param {number} [limit=10]
 * @returns {Promise<Array>}
 */
async function getAvailableEvents(tipoReunion, limit = 10) {
  const { rows } = await pool.query(
    `SELECT id, tipo_reunion, sede_id, horario_id, fecha_hora,
            inscritos_actuales, capacidad_total, estado, descripcion
     FROM public.eventos
     WHERE tipo_reunion = $1
       AND estado = 'DISPONIBLE'
     ORDER BY fecha_hora ASC
     LIMIT $2`,
    [tipoReunion, limit],
  );
  return rows;
}

/**
 * Get a single event by id.
 *
 * Equivalent to "Obtener evento" node in Asesor Nueva BD.
 *
 * @param {number} id
 * @returns {Promise<object|null>}
 */
async function getEventoById(id) {
  const { rows } = await pool.query(
    `SELECT id, tipo_reunion, inscritos_actuales, capacidad_total, estado
     FROM public.eventos
     WHERE id = $1
     LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

/**
 * Increment inscritos_actuales for an event. If it reaches capacity, mark as COMPLETO.
 *
 * Equivalent to "Parsear evento" + "Actualizar EVENTO" nodes in Asesor Nueva BD.
 *
 * @param {number} eventoId
 * @returns {Promise<{inscritos_actuales: number, estado: string}>} – updated values
 */
async function incrementEventoInscritos(eventoId) {
  const { rows } = await pool.query(
    `UPDATE public.eventos
     SET
       inscritos_actuales = inscritos_actuales + 1,
       estado = CASE
                  WHEN inscritos_actuales + 1 >= capacidad_total THEN 'COMPLETO'
                  ELSE estado
                END,
       updated_at = NOW()
     WHERE id = $1
     RETURNING inscritos_actuales, estado`,
    [eventoId],
  );
  return rows[0] || null;
}

module.exports = {
  getAvailableEvents,
  getEventoById,
  incrementEventoInscritos,
};

