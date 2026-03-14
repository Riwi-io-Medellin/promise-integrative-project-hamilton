// Archivo: scripts/get-candidatos.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function run() {
    try {
        // Consultamos el id, nombre y teléfono de la tabla candidatos
        const result = await pool.query('SELECT id, nombre, telefono FROM candidatos ORDER BY nombre ASC');

        // Usamos una etiqueta especial (___JSON_START___) para que si tu servidor imprime
        // otros logs ("Conectado a BD..."), no rompa la lectura de la lista en el Frontend.
        console.log(`___JSON_START___${JSON.stringify(result.rows)}___JSON_END___`);
    } catch (error) {
        console.error('Error obteniendo candidatos:', error);
    } finally {
        await pool.end();
    }
}

run();
