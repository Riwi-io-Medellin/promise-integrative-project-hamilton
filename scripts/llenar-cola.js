/**
 * scripts/llenar-cola.js
 *
 * Llena la cola de llamadas manualmente para una franja específica o
 * para la franja activa según la hora actual de Colombia.
 *
 * Uso:
 *   node scripts/llenar-cola.js              ← usa la franja activa ahora
 *   node scripts/llenar-cola.js manana       ← fuerza franja mañana
 *   node scripts/llenar-cola.js tarde        ← fuerza franja tarde
 *   node scripts/llenar-cola.js noche        ← fuerza franja noche
 *   node scripts/llenar-cola.js todas        ← llena las 3 franjas (útil para pruebas)
 */
'use strict';

require('dotenv').config();

const { llenarColaParaFranja, getFranjaActual } = require('../src/services/cola/fillQueue');
const pool = require('../src/db/pool');

const arg = process.argv[2]?.toLowerCase() || null;

async function run() {
  console.log('\n════════════════════════════════════════════');
  console.log('  LLENADO MANUAL DE COLA DE LLAMADAS');
  console.log('════════════════════════════════════════════\n');

  let franjas = [];

  if (arg === 'todas') {
    franjas = ['manana', 'tarde', 'noche'];
    console.log('📋 Modo: todas las franjas\n');
  } else if (['manana', 'tarde', 'noche'].includes(arg)) {
    franjas = [arg];
    console.log(`📋 Franja forzada: ${arg}\n`);
  } else {
    const actual = getFranjaActual();
    if (!actual) {
      console.log('⏰ Hora actual fuera de ventana de llamadas (06:00–22:00 COL)');
      console.log('   Puedes forzar una franja: node scripts/llenar-cola.js manana\n');
      await pool.end();
      process.exit(0);
    }
    franjas = [actual];
    console.log(`📋 Franja activa detectada automáticamente: ${actual}\n`);
  }

  let total = 0;
  for (const franja of franjas) {
    try {
      const inserted = await llenarColaParaFranja(franja);
      console.log(`✅ ${franja.padEnd(6)} → ${inserted} candidato(s) insertados`);
      total += inserted;
    } catch (err) {
      console.error(`❌ ${franja}: ${err.message}`);
    }
  }

  console.log(`\n📊 Total insertados: ${total}`);
  if (total === 0) {
    console.log('   ℹ️  Es normal si ya hay items PENDIENTE/EN_CURSO para hoy.');
    console.log('   ℹ️  Verifica con: node scripts/6-ver-estado.js');
  } else {
    console.log('\n▶  Ahora el worker va a procesar la cola automáticamente.');
    console.log('   Verifica con: node scripts/6-ver-estado.js');
  }

  console.log();
  await pool.end();
  process.exit(0);
}

run().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});

