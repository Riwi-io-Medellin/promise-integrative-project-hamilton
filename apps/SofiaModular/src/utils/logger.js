/**
 * src/utils/logger.js – JSON structured logger
 *
 * Thin wrapper that produces JSON logs compatible with log aggregators
 * (Datadog, Logtail, Railway, etc.).
 *
 * Usage:
 *   logger.info({ event: 'queue_filled', count: 5 }, 'Queue filled');
 *   logger.error({ event: 'db_error', err: e.message }, 'DB query failed');
 */
'use strict';

const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

function log(level, meta, message) {
  const entry = {
    ts:      new Date().toISOString(),
    level,
    message: message || meta,
    ...(typeof meta === 'object' ? meta : {}),
  };
  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

const logger = {
  debug: (meta, msg) => log('debug', meta, msg),
  info:  (meta, msg) => log('info',  meta, msg),
  warn:  (meta, msg) => log('warn',  meta, msg),
  error: (meta, msg) => log('error', meta, msg),
};

module.exports = logger;

