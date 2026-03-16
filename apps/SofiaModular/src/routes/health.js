/**
 * src/routes/health.js – Health check endpoint
 *
 * GET /health → returns service status + DB connectivity check
 */
'use strict';

const express = require('express');
const pool    = require('../db/pool');
const logger  = require('../utils/logger');

const router = express.Router();

router.get('/', async (_req, res) => {
  let dbOk = false;
  let dbLatencyMs = null;

  try {
    const t0 = Date.now();
    await pool.query('SELECT 1');
    dbLatencyMs = Date.now() - t0;
    dbOk = true;
  } catch (err) {
    logger.warn({ event: 'health_db_error', err: err.message }, 'DB health check failed');
  }

  const status = dbOk ? 200 : 503;
  res.status(status).json({
    status:  dbOk ? 'ok' : 'degraded',
    service: 'sofia',
    version: '2.0.0',
    db: {
      connected:  dbOk,
      latency_ms: dbLatencyMs,
    },
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

