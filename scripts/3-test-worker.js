/**
 * Prueba 3: Ejecutar UNA iteración del queue worker.
 * Usa ELEVENLABS_MOCK=true para no hacer llamadas reales.
 *
 * Ejecutar: node scripts/3-test-worker.js
 *
 * Qué verifica:
 *  - Cuenta llamadas activas
 *  - Lee la cola
 *  - Valida ventana de horario
 *  - Marca cola como EN_CURSO
 *  - Crea registro en llamadas con estado EN_CURSO
 */
'use strict';

// Forzar mock ANTES de cargar dotenv (por si acaso)
process.env.ELEVENLABS_MOCK = 'true';
require('dotenv').config();

const pool = require('../src/db/pool');
const { runQueueIteration } = require('../src/services/cola/processQueue');

async function run() {
    console.log('\n══════════════════════════════════════');
    console.log('  TEST 3 – Queue worker (mock)');
    console.log('══════════════════════════════════════');
    console.log('  ⚡ ELEVENLABS_MOCK=true → sin llamadas reales\n');

    // Llamadas EN_CURSO antes
    const { rows: r1 } = await pool.query(
        "SELECT COUNT(*) AS total FROM public.llamadas l JOIN public.resultados_llamada r ON r.id = l.resultado_id WHERE r.codigo = 'EN_CURSO'"
    );
    console.log('Llamadas EN_CURSO antes:', r1[0].total);

    // Ejecutar una iteración
    console.log('\nEjecutando runQueueIteration()...\n');
    await runQueueIteration();

    // Llamadas EN_CURSO después
    const { rows: r2 } = await pool.query(
        `SELECT l.id, l.candidato_id, l.conversation_id, l.resumen, l.fecha_hora_llamada,
            c.nombre, c.apellido
     FROM public.llamadas l
     JOIN public.resultados_llamada r ON r.id = l.resultado_id
     JOIN public.candidatos c ON c.id = l.candidato_id
     WHERE r.codigo = 'EN_CURSO'
     ORDER BY l.fecha_hora_llamada DESC`
    );
    console.log(`\nLlamadas EN_CURSO después (${r2.length} total):`);
    r2.forEach(l => {
        console.log(`  ✅ llamada #${l.id} | ${l.nombre} ${l.apellido} | conv: ${l.conversation_id}`);
    });

    await pool.end();
    process.exit(0);
}

run().catch(err => { console.error('❌', err.message); process.exit(1); });
