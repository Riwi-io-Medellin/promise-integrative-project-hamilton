/**
 * src/db/lookups.js – Lookup table queries
 *
 * Covers:
 *   public.resultados_llamada
 *   public.estados_gestion
 *   public.horarios
 *   public.motivos_llamada
 */
'use strict';

const pool = require('./pool');

// ─── resultados_llamada ──────────────────────────────────────────────────────

/**
 * Fetch a resultado_llamada row by its codigo.
 * @param {string} codigo – e.g. 'EN_CURSO', 'AGENDADO', 'NO_CONTESTA'
 * @returns {Promise<{id: number, codigo: string, descripcion: string}|null>}
 */
async function getResultadoByCodigo(codigo) {
  const { rows } = await pool.query(
    'SELECT id, codigo, descripcion FROM public.resultados_llamada WHERE codigo = $1 LIMIT 1',
    [codigo.toUpperCase()],
  );
  return rows[0] || null;
}

/**
 * Returns the id of resultados_llamada where codigo = 'EN_CURSO'.
 * Cached after the first call.
 */
let _enCursoId = null;
async function getEnCursoResultadoId() {
  if (_enCursoId) return _enCursoId;
  const row = await getResultadoByCodigo('EN_CURSO');
  if (!row) throw new Error("resultados_llamada row with codigo='EN_CURSO' not found");
  _enCursoId = row.id;
  return _enCursoId;
}

// ─── estados_gestion ────────────────────────────────────────────────────────

/**
 * Fetch an estado_gestion row by its codigo.
 * @param {string} codigo – e.g. 'PENDIENTE', 'AGENDADO', 'NO_CONTESTA'
 * @returns {Promise<{id: number, codigo: string, descripcion: string}|null>}
 */
async function getEstadoGestionByCodigo(codigo) {
  const { rows } = await pool.query(
    'SELECT id, codigo, descripcion FROM public.estados_gestion WHERE codigo = $1 LIMIT 1',
    [codigo.toUpperCase()],
  );
  return rows[0] || null;
}

/**
 * Returns the id of estados_gestion where codigo = 'PENDIENTE'.
 * Cached after the first call.
 */
let _pendienteId = null;
async function getPendienteEstadoId() {
  if (_pendienteId) return _pendienteId;
  const row = await getEstadoGestionByCodigo('PENDIENTE');
  if (!row) throw new Error("estados_gestion row with codigo='PENDIENTE' not found");
  _pendienteId = row.id;
  return _pendienteId;
}

// ─── horarios ────────────────────────────────────────────────────────────────

/**
 * Fetch a horario row by its id.
 * @param {number} id
 * @returns {Promise<{id: number, codigo: string, descripcion: string, hora_inicio: string, hora_fin: string}|null>}
 */
async function getHorarioById(id) {
  const { rows } = await pool.query(
    'SELECT id, codigo, descripcion, hora_inicio, hora_fin FROM public.horarios WHERE id = $1 LIMIT 1',
    [id],
  );
  return rows[0] || null;
}

// ─── motivos_llamada ─────────────────────────────────────────────────────────

/**
 * Fetch a motivo_llamada row by its id.
 * @param {number} id
 * @returns {Promise<{id: number, codigo: string, descripcion: string}|null>}
 */
async function getMotivoById(id) {
  const { rows } = await pool.query(
    'SELECT id, codigo, descripcion FROM public.motivos_llamada WHERE id = $1 LIMIT 1',
    [id],
  );
  return rows[0] || null;
}

module.exports = {
  getResultadoByCodigo,
  getEnCursoResultadoId,
  getEstadoGestionByCodigo,
  getPendienteEstadoId,
  getHorarioById,
  getMotivoById,
};

