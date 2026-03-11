/**
 * scripts/6-ver-estado.js
 *
 * Muestra el estado actual de todas las tablas relevantes:
 *   llamadas, candidatos, cola_llamadas, eventos
 *
 * Útil para verificar ANTES y DESPUÉS de una llamada real.
 *
 * Uso: node scripts/6-ver-estado.js
 */
'use strict';

require('dotenv').config();
const pool = require('../src/db/pool');

function sep(titulo) {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`  ${titulo}`);
  console.log('─'.repeat(50));
}

async function run() {
  console.log('\n══════════════════════════════════════════════════');
  console.log('  ESTADO ACTUAL DEL SISTEMA – SofIA');
  console.log(`  Fecha: ${new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`);
  console.log('══════════════════════════════════════════════════');

  // ── Llamadas de hoy ────────────────────────────────────────────────────────
  sep('LLAMADAS DE HOY');
  const { rows: llamadas } = await pool.query(`
    SELECT
      l.id,
      c.nombre || ' ' || c.apellido AS candidato,
      c.telefono,
      rl.codigo                      AS resultado,
      l.dia_agendado,
      l.hora_agendado,
      l.evento_asignado_id,
      l.resumen,
      l.conversation_id,
      l.fecha_hora_llamada AT TIME ZONE 'America/Bogota' AS hora_col
    FROM public.llamadas l
    JOIN public.candidatos c         ON c.id  = l.candidato_id
    JOIN public.resultados_llamada rl ON rl.id = l.resultado_id
    WHERE l.fecha_hora_llamada::date = CURRENT_DATE
    ORDER BY l.fecha_hora_llamada DESC
  `);

  if (llamadas.length === 0) {
    console.log('  (sin llamadas hoy)');
  } else {
    llamadas.forEach(l => {
      console.log(`\n  📞 Llamada #${l.id}`);
      console.log(`     Candidato   : ${l.candidato} (${l.telefono})`);
      console.log(`     Resultado   : ${l.resultado}`);
      console.log(`     Agendado    : ${l.dia_agendado || '-'} ${l.hora_agendado || ''}`);
      console.log(`     Evento ID   : ${l.evento_asignado_id || '-'}`);
      console.log(`     Resumen     : ${l.resumen || '-'}`);
      console.log(`     ConvID      : ${l.conversation_id || '-'}`);
      console.log(`     Hora (COL)  : ${l.hora_col}`);
    });
  }

  // ── Cola de hoy ────────────────────────────────────────────────────────────
  sep('COLA DE LLAMADAS HOY');
  const { rows: cola } = await pool.query(`
    SELECT
      cl.id,
      c.nombre || ' ' || c.apellido AS candidato,
      cl.prioridad,
      cl.franja_programada,
      cl.hora_programada,
      cl.estado
    FROM public.cola_llamadas cl
    JOIN public.candidatos c ON c.id = cl.candidato_id
    WHERE cl.fecha_programada = CURRENT_DATE
    ORDER BY cl.prioridad DESC, cl.created_at ASC
  `);

  if (cola.length === 0) {
    console.log('  (cola vacía para hoy)');
  } else {
    cola.forEach(cl => {
      const icon = cl.estado === 'COMPLETADA' ? '✅' :
                   cl.estado === 'EN_CURSO'   ? '🔄' :
                   cl.estado === 'CANCELADA'  ? '❌' : '⏳';
      console.log(`  ${icon} [${cl.estado.padEnd(10)}] ${cl.candidato.padEnd(30)} | prioridad: ${cl.prioridad} | ${cl.franja_programada} ${cl.hora_programada || ''}`);
    });
  }

  // ── Estado de candidatos ───────────────────────────────────────────────────
  sep('CANDIDATOS – ESTADO ACTUAL');
  const { rows: candidatos } = await pool.query(`
    SELECT
      c.nombre || ' ' || c.apellido AS candidato,
      c.telefono,
      c.fase_actual,
      eg.codigo                      AS estado_gestion,
      c.evento_asignado_id,
      c.intentos_llamada,
      c.ultimo_contacto AT TIME ZONE 'America/Bogota' AS ultimo_col
    FROM public.candidatos c
    JOIN public.estados_gestion eg ON eg.id = c.estado_gestion_id
    ORDER BY c.created_at ASC
  `);

  candidatos.forEach(c => {
    const icon = c.estado_gestion === 'AGENDADO'   ? '📅' :
                 c.estado_gestion === 'PENDIENTE'   ? '⏳' :
                 c.estado_gestion === 'NO_CONTESTA' ? '📵' :
                 c.estado_gestion === 'DESCARTADO'  ? '🚫' : '✅';
    console.log(`  ${icon} ${c.candidato.padEnd(30)} | ${c.estado_gestion.padEnd(12)} | fase: ${c.fase_actual} | intentos: ${c.intentos_llamada} | evento: ${c.evento_asignado_id || '-'}`);
    if (c.ultimo_col) console.log(`     Último contacto: ${c.ultimo_col}`);
  });

  // ── Eventos disponibles ────────────────────────────────────────────────────
  sep('EVENTOS');
  const { rows: eventos } = await pool.query(`
    SELECT
      e.id,
      e.tipo_reunion,
      e.fecha_hora AT TIME ZONE 'America/Bogota' AS fecha_col,
      e.inscritos_actuales,
      e.capacidad_total,
      e.estado
    FROM public.eventos e
    ORDER BY e.tipo_reunion, e.fecha_hora ASC
  `);

  if (eventos.length === 0) {
    console.log('  (sin eventos)');
  } else {
    eventos.forEach(e => {
      const pct  = Math.round((e.inscritos_actuales / e.capacidad_total) * 100);
      const icon = e.estado === 'DISPONIBLE' ? '🟢' : e.estado === 'COMPLETO' ? '🔴' : '⚫';
      console.log(`  ${icon} ID ${e.id} | ${e.tipo_reunion.padEnd(15)} | ${e.fecha_col} | ${e.inscritos_actuales}/${e.capacidad_total} (${pct}%) | ${e.estado}`);
    });
  }

  // ── Resumen rápido ─────────────────────────────────────────────────────────
  sep('RESUMEN');
  const { rows: [resumen] } = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM public.llamadas  WHERE fecha_hora_llamada::date = CURRENT_DATE)              AS llamadas_hoy,
      (SELECT COUNT(*) FROM public.llamadas l JOIN public.resultados_llamada r ON r.id = l.resultado_id
        WHERE r.codigo = 'EN_CURSO')                                                                     AS en_curso,
      (SELECT COUNT(*) FROM public.cola_llamadas WHERE fecha_programada = CURRENT_DATE AND estado = 'PENDIENTE') AS cola_pendiente,
      (SELECT COUNT(*) FROM public.candidatos c JOIN public.estados_gestion eg ON eg.id = c.estado_gestion_id
        WHERE eg.codigo = 'PENDIENTE')                                                                   AS candidatos_pendientes,
      (SELECT COUNT(*) FROM public.candidatos c JOIN public.estados_gestion eg ON eg.id = c.estado_gestion_id
        WHERE eg.codigo = 'AGENDADO')                                                                    AS candidatos_agendados
  `);
  console.log(`  Llamadas hoy        : ${resumen.llamadas_hoy}`);
  console.log(`  En curso ahora      : ${resumen.en_curso}`);
  console.log(`  Cola pendiente hoy  : ${resumen.cola_pendiente}`);
  console.log(`  Candidatos pendientes: ${resumen.candidatos_pendientes}`);
  console.log(`  Candidatos agendados : ${resumen.candidatos_agendados}`);

  console.log('\n');
  await pool.end();
  process.exit(0);
}

run().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});

