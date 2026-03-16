// scripts/check-candidate.js
require('dotenv').config();
const pool = require('../src/db/pool');

// IDs conocidos de pruebas
const IDS = [
    '0dd9d7da-525f-44ad-997a-8e52103b765b', // Maryhug
    'be12eae3-c284-41db-864c-30995ed5f26a', // Andrea
    'a09e8dc8-5229-43af-86e4-1aab64ba9be8', // Angelo
    '11111111-1111-1111-1111-111111111111', // Emmanuel
    '22222222-2222-2222-2222-222222222222'  // Daniela
];

async function main() {
  try {
    const res = await pool.query(`
      SELECT c.id, c.nombre, c.intentos_llamada, eg.codigo as estado, c.evento_asignado_id, c.nota_horario
      FROM public.candidatos c
      LEFT JOIN public.estados_gestion eg ON c.estado_gestion_id = eg.id
      WHERE c.id = ANY($1) 
      OR c.intentos_llamada >= 1
      ORDER BY c.nombre ASC
    `, [IDS]);
    
    console.log('--- ESTADO DE CANDIDATOS (PRUEBAS Y FALLIDOS) ---');
    console.table(res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

main();
