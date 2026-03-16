// scripts/test-db-connection.js
'use strict';

require('dotenv').config();
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function testConnection() {
  console.log('Probando conexión directa a Supabase...');
  console.log('URL (masked):', process.env.DATABASE_URL?.replace(/:[^:/@]+@/, ':***@'));

  try {
    await client.connect();
    console.log('✅ Conexión establecida correctamente.');
    
    const res = await client.query('SELECT NOW() as now, version()');
    console.log('✅ Query ejecutada:', res.rows[0]);
    
    await client.end();
    console.log('✅ Conexión cerrada correctamente.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error de conexión:', err);
    
    if (err.message.includes('timeout')) {
        console.error('\nSUGERENCIA: Revisa si tu IP tiene acceso o si la base de datos está pausada en Supabase.');
    }
    process.exit(1);
  }
}

testConnection();

