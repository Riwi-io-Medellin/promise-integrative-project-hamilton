/**
 * src/db/candidatos.js – Candidatos repository
 */
'use strict';

const pool = require('./pool');

/**
 * Returns all candidates that are eligible to be queued for a given franja.
 *
 * Eligibility rules (mirrors the llenar_cola_llamadas RPC logic):
 *   1. estado_gestion_id = ID of 'PENDIENTE'
 *   2. evento_asignado_id IS NULL  (not already scheduled)
 *   3. No llamada already completed today
 *      (llamadas.candidato_id = candidatos.id
 *       AND fecha_hora_llamada::date = CURRENT_DATE
 *       AND resultado_id <> EN_CURSO id)
 *   4. No cola_llamadas row for today with estado IN ('PENDIENTE','EN_CURSO')
 *
 * Also joins candidato_ideal to get ci_total for priority calculation.
 *
 * @param {number} pendienteEstadoId  – estados_gestion.id for 'PENDIENTE'
 * @param {number} enCursoResultadoId – resultados_llamada.id for 'EN_CURSO'
 * @returns {Promise<Array>}
 */
async function getCandidatesForQueue(pendienteEstadoId, enCursoResultadoId) {
  const { rows } = await pool.query(
    `
    SELECT
      c.id,
      c.nombre,
      c.apellido,
      c.telefono,
      c.fase_actual,
      c.motivo_llamada_id,
      c.estado_gestion_id,
      c.ultimo_contacto,
      c.evento_asignado_id,
      c.intentos_llamada,
      c.intentos_franja_actual,
      c.horario_id,
      c.franja_actual,
      c.hora_preferida_llamada,
      COALESCE(ci.ci_total, 0) AS ci_total
    FROM public.candidatos c
    LEFT JOIN public.candidato_ideal ci ON ci.candidato_id = c.id
    WHERE
      -- Rule 1: must be in PENDIENTE management state
      c.estado_gestion_id = $1
      -- Rule 2: must not be already scheduled for an event
      AND c.evento_asignado_id IS NULL
      -- Rule 3: no completed call today (non-EN_CURSO result)
      AND NOT EXISTS (
        SELECT 1 FROM public.llamadas l
        WHERE l.candidato_id = c.id
          AND l.fecha_hora_llamada::date = CURRENT_DATE
          AND l.resultado_id <> $2
      )
      -- Rule 4: no active queue row for today
      AND NOT EXISTS (
        SELECT 1 FROM public.cola_llamadas cl
        WHERE cl.candidato_id = c.id
          AND cl.fecha_programada = CURRENT_DATE
          AND cl.estado IN ('PENDIENTE', 'EN_CURSO')
      )
    ORDER BY ci_total DESC, c.intentos_llamada ASC
    `,
    [pendienteEstadoId, enCursoResultadoId],
  );
  return rows;
}

/**
 * Fetch a single candidato by id, including ciudad and nota_previa.
 * Also brings the resumen of the last completed llamada as nota_previa.
 * @param {string} id – UUID
 * @returns {Promise<object|null>}
 */
async function getCandidatoById(id) {
  const { rows } = await pool.query(
    `SELECT
       c.*,
       h.codigo        AS horario_codigo,
       m.nombre        AS ciudad,
       -- nota_previa: use nota_horario if set, otherwise last llamada resumen
       COALESCE(
         c.nota_horario,
         (SELECT l.resumen
          FROM public.llamadas l
          JOIN public.resultados_llamada rl ON rl.id = l.resultado_id
          WHERE l.candidato_id = c.id
            AND rl.codigo <> 'EN_CURSO'
          ORDER BY l.fecha_hora_llamada DESC
          LIMIT 1),
         ''
       ) AS nota_previa
     FROM public.candidatos c
     LEFT JOIN public.horarios  h ON h.id = c.horario_id
     LEFT JOIN public.municipios m ON m.id = c.municipio_id
     WHERE c.id = $1
     LIMIT 1`,
    [id],
  );
  return rows[0] || null;
}

/**
 * Update a candidato's management state and last-contact timestamp.
 *
 * Equivalent to the "Actualizar Candidato" node in Asesor Nueva BD.
 *
 * @param {string}  candidatoId
 * @param {object}  fields
 * @param {string}  [fields.ultimoContacto]   – ISO timestamp
 * @param {number|null} [fields.eventoAsignadoId]
 * @param {number}  [fields.estadoGestionId]
 * @param {string}  [fields.faseActual]        – optional phase change
 * @returns {Promise<void>}
 */
async function updateCandidato(candidatoId, fields) {
  const sets   = [];
  const values = [];
  let   idx    = 1;

  if (fields.ultimoContacto !== undefined) {
    sets.push(`ultimo_contacto = $${idx++}`);
    values.push(fields.ultimoContacto);
  }
  if (fields.eventoAsignadoId !== undefined) {
    sets.push(`evento_asignado_id = $${idx++}`);
    values.push(fields.eventoAsignadoId);
  }
  if (fields.estadoGestionId !== undefined) {
    sets.push(`estado_gestion_id = $${idx++}`);
    values.push(fields.estadoGestionId);
  }
  if (fields.faseActual !== undefined) {
    sets.push(`fase_actual = $${idx++}`);
    values.push(fields.faseActual);
  }

  if (sets.length === 0) return;

  sets.push(`updated_at = NOW()`);
  values.push(candidatoId);

  await pool.query(
    `UPDATE public.candidatos SET ${sets.join(', ')} WHERE id = $${idx}`,
    values,
  );
}

module.exports = {
  getCandidatesForQueue,
  getCandidatoById,
  updateCandidato,
};
