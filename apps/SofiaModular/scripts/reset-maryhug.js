// scripts/reset-maryhug.js
require('dotenv').config();
const pool = require('../src/db/pool');

async function main() {
  try {
    const cid = '0dd9d7da-525f-44ad-997a-8e52103b765b';
    
    // Obtener ID del estado PENDIENTE
    const resId = await pool.query("SELECT id FROM public.estados_gestion WHERE codigo = 'PENDIENTE'");
    const idPendiente = resId.rows[0].id;

    // Resetear candidato
    await pool.query(`
      UPDATE public.candidatos 
      SET estado_gestion_id = $1, evento_asignado_id = NULL, nota_horario = NULL, intentos_llamada = 9
      WHERE id = $2
    `, [idPendiente, cid]);
    
    console.log('✅ Maryhug (0dd9d7da-...) reseteada a estado PENDIENTE, sin eventos y con 9 intentos.');
  } catch (err) {
    console.error(err);
  } finally {
    pool.end();
  }
}

main();
