/**
 * src/db/pool.js – PostgreSQL connection pool (Supabase-ready)
 *
 * Supabase expone un PostgreSQL estándar al que nos conectamos con `pg`.
 * No se necesita @supabase/supabase-js — el driver nativo de pg es más
 * eficiente y permite transacciones, CTEs y cualquier SQL complejo.
 *
 * Supabase SIEMPRE requiere SSL. El certificado usa un CA propio, por lo que
 * `rejectUnauthorized: false` es necesario salvo que descargues el CA bundle.
 *
 * Conexión directa (puerto 5432) — recomendada para servicios persistentes.
 * Si usas el pooler de Supabase (Supavisor, puerto 6543), cambia el puerto
 * en DATABASE_URL y asegúrate de usar mode=session (no transaction).
 */
'use strict';

const { Pool } = require('pg');
const logger   = require('../utils/logger');

// ── SSL config ───────────────────────────────────────────────────────────────
// DB_SSL=false solo para desarrollo local contra un Postgres sin SSL.
// En Supabase siempre debe ser true (o no definida → true por defecto).
const sslConfig = process.env.DB_SSL === 'false'
  ? false
  : { rejectUnauthorized: false }; // Supabase usa CA propio

let poolConfig;

if (process.env.DATABASE_URL) {
  poolConfig = {
    connectionString: process.env.DATABASE_URL,
    ssl: sslConfig,
  };
} else {
  poolConfig = {
    host:     process.env.DB_HOST || 'localhost',
    port:     Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || 'postgres',
    user:     process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl:      sslConfig,
  };
}

const pool = new Pool({
  ...poolConfig,
  // Para Supabase (conexión directa) un pool de 5-10 conexiones es suficiente.
  // El plan gratuito de Supabase tiene un máximo de ~60 conexiones simultáneas.
  max:                    5,             // Reduciendo a 5 para evitar saturate en dev
  idleTimeoutMillis:      10_000,        // Liberar conexiones idle más rápido
  connectionTimeoutMillis: 60_000,       // Aumentar timeout a 60s para redes muy lentas o bloqueadas
  keepAlive:              true,          // Mantener conexión viva
});

pool.on('connect', () => {
  logger.info({ event: 'pg_pool_connect' }, 'New PostgreSQL connection established');
});

pool.on('error', (err) => {
  logger.error({ event: 'pg_pool_error', err: err.message }, 'Unexpected PostgreSQL pool error');
});

module.exports = pool;
