/**
 * src/services/cola/fillQueue.js – Fill the call queue for a time slot
 */
'use strict';

const { getCandidatesForQueue }                        = require('../../db/candidatos');
const { bulkInsertQueue, countQueueItemsForFranja }    = require('../../db/cola');
const { colombiaHour, colombiaDateString }             = require('../../utils/dateHelpers');
const logger                                           = require('../../utils/logger');

const DEFAULT_HORA = { manana: '09:00', tarde: '15:00', noche: '19:00' };

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the active franja for the current Colombia time, or null if outside
 * all calling windows.
 *   manana  → 06:00 – 12:59
 *   tarde   → 14:00 – 18:59
 *   noche   → 19:00 – 21:59
 * @returns {'manana'|'tarde'|'noche'|null}
 */
function getFranjaActual() {
  const hora = colombiaHour();
  if (hora >= 6  && hora < 13) return 'manana';
  if (hora >= 14 && hora < 19) return 'tarde';
  if (hora >= 19 && hora < 22) return 'noche';
  return null;
}

/**
 * Returns every franja whose start time has already passed today.
 * manana starts at 06:00, tarde at 14:00, noche at 19:00.
 * @returns {string[]}
 */
function getFranjasPasadasHoy() {
  const hora = colombiaHour();
  const franjas = [];
  if (hora >= 6)  franjas.push('manana');
  if (hora >= 14) franjas.push('tarde');
  if (hora >= 19) franjas.push('noche');
  return franjas;
}

/** Returns true if HH:MM falls inside the franja window. */
function horaFitsFranja(horaStr, franja) {
  if (!horaStr) return false;
  const h = parseInt(horaStr.split(':')[0], 10);
  if (franja === 'manana') return h >= 6  && h < 13;
  if (franja === 'tarde')  return h >= 14 && h < 19;
  if (franja === 'noche')  return h >= 19 && h < 22;
  return false;
}

/** Compute numeric priority (higher = called first). */
function computePriority(candidato) {
  const ciTotal        = Number(candidato.ci_total)              || 0;
  const intentos       = Number(candidato.intentos_llamada)      || 0;
  const intentosFranja = Number(candidato.intentos_franja_actual) || 0;
  let daysBonus = 10;
  if (candidato.ultimo_contacto) {
    const daysSince = Math.floor(
      (Date.now() - new Date(candidato.ultimo_contacto).getTime()) / 86_400_000,
    );
    daysBonus = Math.min(daysSince, 10);
  }
  return (ciTotal * 10) - (intentos * 3) - (intentosFranja * 1) + daysBonus;
}

// ─── Core fill ────────────────────────────────────────────────────────────────

/**
 * Fill cola_llamadas for a given franja.
 * Idempotent — safe to call multiple times; duplicates are silently skipped.
 *
 * @param {'manana'|'tarde'|'noche'} franja
 * @returns {Promise<number>} rows inserted
 */
async function llenarColaParaFranja(franja) {
  if (!['manana', 'tarde', 'noche'].includes(franja)) {
    throw new Error(`Franja inválida: "${franja}"`);
  }

  logger.info({ event: 'fill_queue_start', franja }, `Filling queue for franja: ${franja}`);

  const candidates = await getCandidatesForQueue(franja);

  if (candidates.length === 0) {
    logger.info({ event: 'fill_queue_empty', franja }, 'No eligible candidates');
    return 0;
  }

  const fechaHoy = colombiaDateString();
  const entries  = candidates.map((c) => ({
    candidatoId:      c.id,
    prioridad:        computePriority(c),
    franjaProgramada: franja,
    horaProgramada:   horaFitsFranja(c.hora_preferida_llamada, franja)
      ? c.hora_preferida_llamada
      : DEFAULT_HORA[franja],
  }));

  const inserted = await bulkInsertQueue(entries, fechaHoy);

  logger.info(
    { event: 'fill_queue_done', franja, candidates: candidates.length, inserted },
    `Queue filled: ${inserted} new row(s) for ${franja}`,
  );
  return inserted;
}

// ─── Smart startup initializer ────────────────────────────────────────────────

/**
 * Intelligent startup fill — called automatically when the app boots.
 *
 * Determines which franjas should have been filled already today (based on
 * current Colombia time) and fills only those that have zero items in the queue.
 *
 * Examples:
 *   - Boot at 09:00 → checks manana  → 0 items → fills manana
 *   - Boot at 15:00 → checks manana (items exist → skip) + tarde (0 → fills)
 *   - Boot at 20:00 → checks manana (skip) + tarde (skip) + noche (0 → fills)
 *   - Boot at 04:00 → no franjas started yet → nothing to do
 *   - DB was reset  → all franjas show 0 items → fills everything needed
 *
 * This means you NEVER need to run `npm run llenar:todas` manually.
 * The cron jobs handle the normal daily schedule; this handles restarts.
 *
 * @returns {Promise<void>}
 */
async function inicializarColaDelDia() {
  const franjasPasadas = getFranjasPasadasHoy();

  if (franjasPasadas.length === 0) {
    logger.info(
      { event: 'startup_fill_skip', hora: colombiaHour() },
      'Startup: antes del inicio del día de llamadas (< 06:00) – nada que hacer',
    );
    return;
  }

  logger.info(
    { event: 'startup_init_start', franjas: franjasPasadas },
    `Startup: verificando cola para franjas del día → [${franjasPasadas.join(', ')}]`,
  );

  const fechaHoy = colombiaDateString();

  for (const franja of franjasPasadas) {
    try {
      const existentes = await countQueueItemsForFranja(fechaHoy, franja);

      if (existentes > 0) {
        logger.info(
          { event: 'startup_fill_skip_franja', franja, existentes },
          `Startup: franja "${franja}" ya tiene ${existentes} item(s) hoy → se omite`,
        );
        continue;
      }

      // No items for this franja today → fill it now
      logger.info(
        { event: 'startup_fill_franja', franja },
        `Startup: franja "${franja}" sin items hoy → llenando...`,
      );
      const inserted = await llenarColaParaFranja(franja);
      logger.info(
        { event: 'startup_fill_franja_done', franja, inserted },
        `Startup: franja "${franja}" → ${inserted} candidato(s) encolado(s)`,
      );
    } catch (err) {
      logger.error(
        { event: 'startup_fill_franja_error', franja, err: err.message },
        `Startup: error llenando franja "${franja}" – el worker lo reintentará vía backfill`,
      );
    }
  }

  logger.info({ event: 'startup_init_done' }, 'Startup: inicialización de cola completada');
}

module.exports = { llenarColaParaFranja, getFranjaActual, inicializarColaDelDia };
