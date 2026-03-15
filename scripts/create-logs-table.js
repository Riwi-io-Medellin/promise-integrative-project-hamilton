const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    console.log('🔗 Conectado a DB para crear logs table.');
    await client.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id SERIAL PRIMARY KEY,
        payload JSONB,
        recibido_en TIMESTAMP DEFAULT NOW(),
        procesado_exitosamente BOOLEAN DEFAULT FALSE,
        error_log TEXT
      );
    `);
    console.log('✅ Tabla webhook_logs creada y lista.');
  } catch (err) {
    console.error('❌ Error creando tabla:', err);
  } finally {
    await client.end();
  }
}

main();

