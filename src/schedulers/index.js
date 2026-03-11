/**
 * src/schedulers/index.js – Cron job definitions
 *
 * Three daily jobs fill cola_llamadas at the START of each calling franja.
 * The queue worker also has a built-in backfill mechanism (every 5 min by
 * default) that catches candidates whose previous-franja call finished after
 * the cron ran.  Together they guarantee no candidate is ever skipped.
 *
 *   manana  → default 07:00 Colombia time  (cron starts filling for 06–13 window)
 *   tarde   → default 14:00 Colombia time
 *   noche   → default 19:00 Colombia time
 *
 * Override via .env:
 *   CRON_FILL_MANANA=0 7 * * *
 *   CRON_FILL_TARDE=0 14 * * *
 *   CRON_FILL_NOCHE=0 19 * * *
 */
'use strict';

const cron                     = require('node-cron');
const { llenarColaParaFranja } = require('../services/cola/fillQueue');
const logger                   = require('../utils/logger');

const TZ = 'America/Bogota';

/**
 * Schedule a single fill-queue job for a franja.
 *
 * @param {'manana'|'tarde'|'noche'} franja
 * @param {string} cronExpr
 */
function scheduleJob(franja, cronExpr) {
  if (!cron.validate(cronExpr)) {
    logger.error(
      { event: 'invalid_cron', franja, cronExpr },
      `Invalid cron expression for franja ${franja}: "${cronExpr}"`,
    );
    return;
  }

  cron.schedule(cronExpr, async () => {
    logger.info({ event: 'cron_triggered', franja }, `Cron: filling queue for ${franja}`);
    try {
      const count = await llenarColaParaFranja(franja);
      logger.info({ event: 'cron_done', franja, inserted: count }, `Cron done: ${count} item(s) for ${franja}`);
    } catch (err) {
      logger.error({ event: 'cron_error', franja, err: err.message }, `Cron error for ${franja}`);
    }
  }, { timezone: TZ });

  logger.info({ event: 'cron_registered', franja, cronExpr, timezone: TZ }, `Cron registered: ${franja} @ "${cronExpr}"`);
}

/**
 * Register the three daily fill-queue cron jobs.
 * Called once at startup from index.js.
 */
function initSchedulers() {
  scheduleJob('manana', process.env.CRON_FILL_MANANA || '0 7 * * *');
  scheduleJob('tarde',  process.env.CRON_FILL_TARDE  || '0 14 * * *');
  scheduleJob('noche',  process.env.CRON_FILL_NOCHE  || '0 19 * * *');
  logger.info({ event: 'schedulers_initialized' }, 'All cron jobs registered');
}

module.exports = { initSchedulers };
