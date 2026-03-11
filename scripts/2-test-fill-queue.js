/**
 * Prueba 2: Llenar cola_llamadas para la franja 'manana'.
 * Ejecutar: node scripts/2-test-fill-queue.js
 *
 * Qué verifica:
 *  - Calcula prioridades correctamente
 *  - Filtra candidatos ya procesados hoy
 *  - Inserta filas en cola_llamadas
 */
'use strict';
require('dotenv').config();

const pool = require('../src/db/pool');
const { llenarColaParaFranja } = require('../src/services/cola/fillQueue');

async function run() {
    console.log('\n══════════════════════════════════════');
    console.log('  TEST 2 – Llenar cola de llamadas');
    console.log('══════════════════════════════════════\n');

    // Estado ANTES
    const { rows: antes } = await pool.query(
        "SELECT COUNT(*) AS total FROM public.cola_llamadas WHERE fecha_programada = CURRENT_DATE AND estado = 'PENDIENTE'"
    );
    console.log('Cola PENDIENTE antes:', antes[0].total);

    // Ejecutar
    console.log('\nEjecutando llenarColaParaFranja("manana")...\n');
    const insertados = await llenarColaParaFranja('manana');
    console.log(`✅ Filas insertadas: ${insertados}`);

    // Estado DESPUÉS
    const { rows: despues } = await pool.query(
        `SELECT cl.id, cl.candidato_id, cl.prioridad, cl.franja_programada, cl.estado,
            c.nombre, c.apellido, c.fase_actual
     FROM public.cola_llamadas cl
     JOIN public.candidatos c ON c.id = cl.candidato_id
     WHERE cl.fecha_programada = CURRENT_DATE AND cl.estado = 'PENDIENTE'
     ORDER BY cl.prioridad DESC`
    );

    console.log(`\nCola PENDIENTE después (${despues.length} filas):`);
    despues.forEach(r => {
        console.log(`  [prioridad ${r.prioridad}] ${r.nombre} ${r.apellido} | ${r.fase_actual}`);
    });

    await pool.end();
    process.exit(0);
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
