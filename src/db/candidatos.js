/**
 * src/db/candidatos.js – Candidatos repository
 */
'use strict';

const pool = require('./pool');

/**
 * Returns all candidates eligible to be added to the call queue for a given franja.
 *
 * Eligibility rules:
 *   1. estado_gestion IN ('PENDIENTE', 'NO_CONTESTA')
 *   2. evento_asignado_id IS NULL  – not already scheduled
 *   3. No ACTIVE queue row today (PENDIENTE/EN_CURSO) in ANY franja
 *      → prevents calling someone who is currently being processed
 *   4. No queue row today for THIS specific franja (any estado)
 *      → prevents duplicate manana/tarde/noche entries on the same day
 *
 * @param {string} franja – 'manana' | 'tarde' | 'noche'
 * @returns {Promise<Array>}
 */
async function getCandidatesForQueue(franja) {
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
      h.codigo                    AS horario_codigo,
      COALESCE(ci.ci_total, 0)    AS ci_total
    FROM public.candidatos c
    LEFT JOIN public.candidato_ideal  ci ON ci.candidato_id = c.id
    LEFT JOIN public.horarios         h  ON h.id            = c.horario_id
    JOIN  public.estados_gestion      eg ON eg.id           = c.estado_gestion_id
    WHERE
      -- Rule 1: callable states
      eg.codigo IN ('PENDIENTE', 'NO_CONTESTA')
      -- Rule 2: not already scheduled
      AND c.evento_asignado_id IS NULL
      -- Rule 3: no active queue row today (any franja)
      AND NOT EXISTS (
        SELECT 1 FROM public.cola_llamadas cl
        WHERE cl.candidato_id    = c.id
          AND cl.fecha_programada = CURRENT_DATE
          AND cl.estado IN ('PENDIENTE', 'EN_CURSO')
      )
      -- Rule 4: not already in THIS franja today (avoids duplicate manana/tarde/noche)
      AND NOT EXISTS (
        SELECT 1 FROM public.cola_llamadas cl
        WHERE cl.candidato_id    = c.id
          AND cl.fecha_programada = CURRENT_DATE
          AND cl.franja_programada = $1
      )
    ORDER BY ci_total DESC, c.intentos_llamada ASC
    `,
    [franja],
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
