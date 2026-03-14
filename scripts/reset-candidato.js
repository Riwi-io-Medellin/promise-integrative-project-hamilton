// Archivo: scripts/reset-candidato.js
require('dotenv').config();
const pool = require('../src/db/pool');

async function main() {
  // Tomamos el UUID del argumento (ej: node scripts/reset-candidato.js 0dd9d...)
  const cid = process.argv[2];

  if (!cid) {
    console.error('❌ Error: Debes proporcionar un UUID de candidato.');
    process.exit(1);
  }

  try {
    // 1. Obtener ID del estado PENDIENTE
    const resId = await pool.query("SELECT id FROM public.estados_gestion WHERE codigo = 'PENDIENTE'");
    const idPendiente = resId.rows[0].id;

    // 2. Obtener el nombre del candidato para el log
    const candQuery = await pool.query("SELECT nombre FROM public.candidatos WHERE id = $1", [cid]);
    const nombre = candQuery.rowCount > 0 ? candQuery.rows[0].nombre : 'Desconocido';

    // 3. Resetear candidato
    const { rowCount } = await pool.query(`
      UPDATE public.candidatos 
      SET estado_gestion_id = $1, evento_asignado_id = NULL, nota_horario = NULL, intentos_llamada = 9
      WHERE id = $2
    `, [idPendiente, cid]);

    if (rowCount > 0) {
      console.log(`✅ Candidato ${nombre} (${cid}) reseteado a estado PENDIENTE, sin eventos y con 9 intentos listos para chatbot.`);
    } else {
      console.log(`⚠️ No se encontró ningún candidato con el UUID ${cid}.`);
    }
  } catch (err) {
    console.error('❌ Error al resetear:', err);
  } finally {
    pool.end();
  }
}

main();
