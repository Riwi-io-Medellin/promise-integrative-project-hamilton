/**
 * scripts/resetear-bd.js
 *
 * Reinicia la BD para empezar desde cero.
 *
 * Modos:
 *   node scripts/resetear-bd.js            → limpia sólo lo que está trabado (EN_CURSO)
 *   node scripts/resetear-bd.js --total    → borra TODAS las llamadas y cola del día,
 *                                            resetea candidatos a PENDIENTE
 *
 * Usa --total cuando quieras simular que el día acaba de empezar.
 */
'use strict';

require('dotenv').config();
const pool = require('../src/db/pool');

const TOTAL = process.argv.includes('--total');

async function run() {
  console.log('\n════════════════════════════════════════════');
  console.log(TOTAL ? '  RESET TOTAL DE LA BD' : '  LIMPIEZA RÁPIDA (solo EN_CURSO)');
  console.log('════════════════════════════════════════════\n');

  // ── IDs necesarios ────────────────────────────────────────────────────────
  const { rows: rl } = await pool.query(
    "SELECT id FROM public.resultados_llamada WHERE codigo IN ('EN_CURSO','NO_CONTESTA') ORDER BY codigo"
  );
  const ids = Object.fromEntries(rl.map(r => [r.codigo === 'EN_CURSO' ? 'enCurso' : 'noContesta', r.id]));

  if (TOTAL) {
    // ── RESET TOTAL ────────────────────────────────────────────────────────

    // 1. Borrar cola de hoy
    const { rowCount: cola } = await pool.query(
      `DELETE FROM public.cola_llamadas WHERE fecha_programada = CURRENT_DATE`
    );
    console.log(`🗑  Cola de hoy borrada        : ${cola} item(s)`);

    // 2. Borrar llamadas de hoy
    const { rowCount: llamadas } = await pool.query(
      `DELETE FROM public.llamadas WHERE fecha_hora_llamada::date = CURRENT_DATE`
    );
    console.log(`🗑  Llamadas de hoy borradas   : ${llamadas} registro(s)`);

    // 3. Resetear candidatos → PENDIENTE, intentos 0
    const { rowCount: cands } = await pool.query(`
      UPDATE public.candidatos
      SET
        estado_gestion_id      = (SELECT id FROM public.estados_gestion WHERE codigo = 'PENDIENTE'),
        intentos_llamada       = 0,
        intentos_franja_actual = 0,
        evento_asignado_id     = NULL,
        ultimo_contacto        = NULL,
        nota_horario           = NULL,
        franja_actual          = 'manana',
        updated_at             = NOW()
      WHERE estado_gestion_id != (SELECT id FROM public.estados_gestion WHERE codigo = 'INSCRITO')
    `);
    console.log(`✅ Candidatos reseteados       : ${cands} candidato(s) → PENDIENTE`);

  } else {
    // ── LIMPIEZA RÁPIDA ────────────────────────────────────────────────────

    // 1. Marcar llamadas EN_CURSO como NO_CONTESTA
    const { rowCount: ll } = await pool.query(`
      UPDATE public.llamadas
      SET resultado_id = $1,
          resumen      = 'Limpiada manualmente'
      WHERE resultado_id = $2
    `, [ids.noContesta, ids.enCurso]);
    console.log(`✅ Llamadas EN_CURSO → NO_CONTESTA : ${ll} registro(s)`);

    // 2. Liberar cola items EN_CURSO de hoy
    const { rowCount: cl } = await pool.query(`
      UPDATE public.cola_llamadas
      SET estado = 'CANCELADA'
      WHERE estado = 'EN_CURSO'
        AND fecha_programada = CURRENT_DATE
    `);
    console.log(`✅ Cola EN_CURSO → CANCELADA        : ${cl} item(s)`);
  }

  // ── Estado final ──────────────────────────────────────────────────────────
  const { rows: [resumen] } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM public.llamadas
        WHERE resultado_id = (SELECT id FROM public.resultados_llamada WHERE codigo = 'EN_CURSO'))
        AS en_curso_llamadas,
      (SELECT COUNT(*) FROM public.cola_llamadas
        WHERE estado = 'EN_CURSO' AND fecha_programada = CURRENT_DATE)
        AS en_curso_cola,
      (SELECT COUNT(*) FROM public.cola_llamadas
        WHERE estado = 'PENDIENTE' AND fecha_programada = CURRENT_DATE)
        AS pendiente_cola,
      (SELECT COUNT(*) FROM public.candidatos c
        JOIN public.estados_gestion eg ON eg.id = c.estado_gestion_id
        WHERE eg.codigo = 'PENDIENTE')
        AS candidatos_pendientes
  `);

  console.log('\n── Estado final ─────────────────────────────');
  console.log(`   Llamadas EN_CURSO   : ${resumen.en_curso_llamadas}  (slots libres: ${4 - resumen.en_curso_llamadas})`);
  console.log(`   Cola EN_CURSO hoy   : ${resumen.en_curso_cola}`);
  console.log(`   Cola PENDIENTE hoy  : ${resumen.pendiente_cola}`);
  console.log(`   Candidatos PENDIENTE: ${resumen.candidatos_pendientes}`);

  if (Number(resumen.en_curso_llamadas) === 0) {
    console.log('\n✅ Slots liberados. El worker va a reanudar llamadas automáticamente.\n');
  } else {
    console.log(`\n⚠️  Quedan ${resumen.en_curso_llamadas} llamadas EN_CURSO. Corre de nuevo si persiste.\n`);
  }

  await pool.end();
  process.exit(0);
}

run().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});

