const pool = require('../src/db/pool');

async function createLogsTable() {
  try {
    console.log('Creando tabla de logs para webhooks...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id SERIAL PRIMARY KEY,
        payload JSONB,
        recibido_en TIMESTAMP DEFAULT NOW(),
        procesado_exitosamente BOOLEAN DEFAULT FALSE,
        error_log TEXT
      );
    `);
    console.log('✅ Tabla webhook_logs creada/verificada correctamente.');
  } catch (err) {
    console.error('❌ Error creando tabla webhook_logs:', err);
  } finally {
    // No cerramos el pool aquí bruscamente para evitar conflictos si se usa importado, 
    // pero como es script standalone, forzamos salida.
    process.exit(0);
  }
}

createLogsTable();

