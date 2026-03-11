/**
 * index.js – SofIA entry point
 *
 * Boot sequence:
 *  1. Express HTTP server   → /health  /webhook/elevenlabs-resultado
 *  2. Smart queue init      → fills any franja that hasn't been filled today
 *  3. Daily cron jobs       → fill queue at the start of each franja (7h / 14h / 19h)
 *  4. Queue worker          → picks up PENDIENTE items every N seconds, max 4 calls
 *
 * After booting you NEVER need to run any manual command.
 * Just `npm start` (prod) or `npm run dev` (local with hot-reload).
 */
'use strict';

require('dotenv').config();

const app                    = require('./src/app');
const { initSchedulers }     = require('./src/schedulers');
const { startQueueWorker }   = require('./src/services/cola/processQueue');
const { inicializarColaDelDia } = require('./src/services/cola/fillQueue');
const logger                 = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

async function main() {
  // ── 1. HTTP server ─────────────────────────────────────────────────────────
  await new Promise((resolve) => {
    app.listen(PORT, () => {
      logger.info({ event: 'server_started', port: PORT }, `HTTP server listening on :${PORT}`);
      resolve();
    });
  });

  // ── 2. Smart queue initialisation ──────────────────────────────────────────
  // Checks every franja that should have started today.
  // Fills only those with 0 items (server was down / first boot / DB reset).
  // Skips franjas already filled — completely idempotent.
  await inicializarColaDelDia();

  // ── 3. Daily cron jobs (normal schedule) ──────────────────────────────────
  // These fill the queue at the exact start of each franja every day.
  // Together with the startup init above, no manual intervention is ever needed.
  initSchedulers();

  // ── 4. Queue worker ────────────────────────────────────────────────────────
  // Processes PENDIENTE items every QUEUE_WORKER_INTERVAL_SECONDS seconds.
  // Has a built-in backfill (every BACKFILL_INTERVAL_MINUTES) to catch
  // candidates whose previous-franja call finished after the cron ran.
  startQueueWorker();

  logger.info({ event: 'sofia_ready' }, '✅ SofIA is running — no manual steps needed');
}

main().catch((err) => {
  logger.error({ event: 'fatal_startup_error', err: err.message }, 'Failed to start SofIA');
  process.exit(1);
});
