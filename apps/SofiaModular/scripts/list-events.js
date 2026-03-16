// scripts/list-events.js
require('dotenv').config();
const pool = require('../src/db/pool');

async function main() {
  try {
    const res = await pool.query(`
      SELECT id, fecha_hora, tipo_reunion, inscritos_actuales 
      FROM public.eventos 
      WHERE estado = 'DISPONIBLE'
      LIMIT 3
    `);
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();

