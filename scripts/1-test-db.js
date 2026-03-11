/**
 * Prueba 1: Conexión a Supabase y consultas básicas a todas las tablas clave.
 * Ejecutar: node scripts/1-test-db.js
 */
'use strict';
require('dotenv').config();

const pool = require('../src/db/pool');

const CHECK = '✅';
const FAIL  = '❌';

async function run() {
    console.log('\n══════════════════════════════════════');
    console.log('  TEST 1 – Conexión a base de datos');
    console.log('══════════════════════════════════════\n');

    const tests = [
        { label: 'Ping a la DB',              sql: 'SELECT 1 AS ok' },
        { label: 'Leer estados_gestion',      sql: 'SELECT id, codigo FROM public.estados_gestion ORDER BY id' },
        { label: 'Leer resultados_llamada',   sql: 'SELECT id, codigo FROM public.resultados_llamada ORDER BY id' },
        { label: 'Leer horarios',             sql: 'SELECT id, codigo FROM public.horarios ORDER BY id' },
        { label: 'Contar candidatos',         sql: 'SELECT COUNT(*) AS total FROM public.candidatos' },
        { label: 'Contar candidato_ideal',    sql: 'SELECT COUNT(*) AS total FROM public.candidato_ideal' },
        { label: 'Contar eventos DISPONIBLE', sql: "SELECT COUNT(*) AS total FROM public.eventos WHERE estado = 'DISPONIBLE'" },
        { label: 'Contar cola_llamadas hoy',  sql: 'SELECT COUNT(*) AS total FROM public.cola_llamadas WHERE fecha_programada = CURRENT_DATE' },
        { label: 'Contar llamadas EN_CURSO',  sql: "SELECT COUNT(*) AS total FROM public.llamadas l JOIN public.resultados_llamada r ON r.id = l.resultado_id WHERE r.codigo = 'EN_CURSO'" },
    ];

    let passed = 0;
    for (const t of tests) {
        try {
            const { rows } = await pool.query(t.sql);
            console.log(`${CHECK} ${t.label}`);
            console.log('   →', JSON.stringify(rows[0]));
            passed++;
        } catch (err) {
            console.log(`${FAIL} ${t.label}`);
            console.log('   → ERROR:', err.message);
        }
    }

    console.log(`\nResultado: ${passed}/${tests.length} pruebas pasaron\n`);
    await pool.end();
    process.exit(passed === tests.length ? 0 : 1);
}

run().catch(err => { console.error(FAIL, err.message); process.exit(1); });
