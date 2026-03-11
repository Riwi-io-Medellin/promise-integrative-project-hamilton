/**
 * scripts/7-limpiar-llamadas.js
 *
 * Limpia TODAS las llamadas EN_CURSO que llevan más de X minutos sin webhook.
 * Útil para liberar slots bloqueados por pruebas mock o llamadas fallidas.
 *
 * Uso:
 *   node scripts/7-limpiar-llamadas.js          ← limpia las >30 min
 *   node scripts/7-limpiar-llamadas.js --todas  ← limpia TODAS sin importar edad
 */
'use strict';

require('dotenv').config();
const pool = require('../src/db/pool');

const TODAS = process.argv.includes('--todas');

async function run() {
  console.log('\n════════════════════════════════════════════');
  console.log('  LIMPIEZA DE LLAMADAS EN_CURSO COLGADAS');
  console.log('════════════════════════════════════════════\n');

  // Ver cuántas hay antes
  const { rows: antes } = await pool.query(`
    SELECT l.id, c.nombre || ' ' || c.apellido AS candidato,
           l.conversation_id, l.fecha_hora_llamada,
           EXTRACT(EPOCH FROM (NOW() - l.fecha_hora_llamada))/60 AS minutos_activa
    FROM public.llamadas l
    JOIN public.candidatos c ON c.id = l.candidato_id
    JOIN public.resultados_llamada r ON r.id = l.resultado_id
    WHERE r.codigo = 'EN_CURSO'
    ORDER BY l.fecha_hora_llamada ASC
  `);

  if (antes.length === 0) {
    console.log('✅ No hay llamadas EN_CURSO. Todo limpio.\n');
    await pool.end();
    process.exit(0);
  }

  console.log(`Llamadas EN_CURSO encontradas: ${antes.length}`);
  antes.forEach(l => {
    const tipo = l.conversation_id?.startsWith('mock_') ? '[MOCK]' : '[REAL]';
    console.log(`  ${tipo} #${l.id} | ${l.candidato} | hace ${Math.round(l.minutos_activa)} min | conv: ${l.conversation_id || 'sin conv_id'}`);
  });

  // Obtener id de NO_CONTESTA
  const { rows: nc } = await pool.query(
    "SELECT id FROM public.resultados_llamada WHERE codigo = 'NO_CONTESTA' LIMIT 1"
  );
  const { rows: en } = await pool.query(
    "SELECT id FROM public.resultados_llamada WHERE codigo = 'EN_CURSO' LIMIT 1"
  );
  const noContestaId = nc[0].id;
  const enCursoId    = en[0].id;

  // Ejecutar limpieza
  let sql, params;
  if (TODAS) {
    console.log('\n⚠️  Modo --todas: limpiando TODAS las EN_CURSO...');
    sql    = `UPDATE public.llamadas SET resultado_id = $1, resumen = 'Limpiada manualmente - sin webhook' WHERE resultado_id = $2`;
    params = [noContestaId, enCursoId];
  } else {
    const minutos = Number(process.env.STALE_CALL_MINUTES) || 30;
    console.log(`\nLimpiando llamadas EN_CURSO con más de ${minutos} minutos...`);
    sql    = `UPDATE public.llamadas SET resultado_id = $1, resumen = 'Auto-resuelta: sin webhook tras ${minutos} min'
              WHERE resultado_id = $2
              AND fecha_hora_llamada < NOW() - ($3 || ' minutes')::interval`;
    params = [noContestaId, enCursoId, minutos];
  }

  const result = await pool.query(sql, params);
  console.log(`\n✅ ${result.rowCount} llamada(s) marcadas como NO_CONTESTA`);

  // ── Limpiar cola_llamadas EN_CURSO ───────────────────────────────────────
  // Si la llamada fue limpiada manualmente, el webhook nunca llegará para
  // actualizar la cola. Lo hacemos acá para que el candidato pueda ser
  // re-encolado en la siguiente ronda.
  // NOTA: no se filtra por fecha_programada para capturar también items de
  // días anteriores que quedaron colgados (fecha_programada usa hora Colombia,
  // CURRENT_DATE usa UTC → pueden diferir entre 7 PM y medianoche Colombia).
  const colaResult = await pool.query(`
    UPDATE public.cola_llamadas
    SET estado = 'CANCELADA'
    WHERE estado = 'EN_CURSO'
  `);
  console.log(`✅ ${colaResult.rowCount} item(s) de cola marcados como CANCELADA`);

  // Ver cuántas quedan
  const { rows: despues } = await pool.query(
    "SELECT COUNT(*) AS total FROM public.llamadas l JOIN public.resultados_llamada r ON r.id = l.resultado_id WHERE r.codigo = 'EN_CURSO'"
  );
  console.log(`   EN_CURSO restantes: ${despues[0].total}`);
  console.log('\n✅ Slots liberados. Ya puedes llenar la cola y hacer llamadas.\n');

  await pool.end();
  process.exit(0);
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });

