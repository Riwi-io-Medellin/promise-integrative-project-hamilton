/**
 * scripts/5-llamada-real.js
 *
 * Dispara UNA llamada real a ElevenLabs para el primer candidato PENDIENTE.
 * No espera el cron ni el worker automático — lo hace ahora mismo.
 *
 * Uso:
 *   node scripts/5-llamada-real.js
 *   node scripts/5-llamada-real.js --telefono=+573001234567   (candidato específico)
 *
 * Requisitos:
 *   - ELEVENLABS_MOCK=false en .env
 *   - El servidor NO necesita estar corriendo (este script es standalone)
 */
'use strict';

require('dotenv').config();

const pool                  = require('../src/db/pool');
const { makeOutboundCall }  = require('../src/services/llamadas/callService');
const { getAvailableEvents } = require('../src/db/eventos');
const { getMotivoById }     = require('../src/db/lookups');

// ── Leer argumento opcional --telefono=XXXX ──────────────────────────────────
const argTelefono = process.argv
  .find(a => a.startsWith('--telefono='))
  ?.split('=')[1] || null;

async function run() {
  console.log('\n════════════════════════════════════════════');
  console.log('  LLAMADA REAL – ElevenLabs outbound call');
  console.log('════════════════════════════════════════════');

  if (process.env.ELEVENLABS_MOCK === 'true') {
    console.error('\n❌ ELEVENLABS_MOCK=true en tu .env');
    console.error('   Cámbialo a ELEVENLABS_MOCK=false para llamadas reales.\n');
    process.exit(1);
  }

  // ── 1. Buscar candidato ────────────────────────────────────────────────────
  let candidato;
  if (argTelefono) {
    const { rows } = await pool.query(
      `SELECT c.*, h.codigo AS horario_codigo
       FROM public.candidatos c
       LEFT JOIN public.horarios h ON h.id = c.horario_id
       WHERE c.telefono = $1 LIMIT 1`,
      [argTelefono],
    );
    candidato = rows[0];
    if (!candidato) {
      console.error(`❌ No se encontró candidato con teléfono: ${argTelefono}`);
      process.exit(1);
    }
  } else {
    // Primer candidato PENDIENTE
    const { rows } = await pool.query(
      `SELECT c.*, h.codigo AS horario_codigo
       FROM public.candidatos c
       LEFT JOIN public.horarios h ON h.id = c.horario_id
       JOIN public.estados_gestion eg ON eg.id = c.estado_gestion_id
       WHERE eg.codigo = 'PENDIENTE'
         AND c.evento_asignado_id IS NULL
       ORDER BY c.created_at ASC
       LIMIT 1`,
    );
    candidato = rows[0];
    if (!candidato) {
      console.error('❌ No hay candidatos en estado PENDIENTE.');
      console.error('   Verifica la tabla candidatos en Supabase.');
      process.exit(1);
    }
  }

  console.log(`\n✅ Candidato seleccionado:`);
  console.log(`   Nombre   : ${candidato.nombre} ${candidato.apellido}`);
  console.log(`   Teléfono : ${candidato.telefono}`);
  console.log(`   Fase     : ${candidato.fase_actual}`);
  console.log(`   Horario  : ${candidato.horario_codigo || 'sin restricción'}`);

  // ── 2. Obtener motivo ──────────────────────────────────────────────────────
  let motivo = candidato.fase_actual;
  if (candidato.motivo_llamada_id) {
    const motivoRow = await getMotivoById(candidato.motivo_llamada_id);
    if (motivoRow) motivo = motivoRow.codigo;
  }

  // ── 3. Obtener eventos disponibles ────────────────────────────────────────
  const eventos = await getAvailableEvents(candidato.fase_actual);
  console.log(`\n✅ Eventos disponibles para ${candidato.fase_actual}: ${eventos.length}`);
  eventos.forEach(e => console.log(`   - ID ${e.id}: ${e.fecha_hora}`));

  if (eventos.length === 0) {
    console.warn('\n⚠️  No hay eventos DISPONIBLES para esta fase.');
    console.warn('   La llamada se hará igual pero el agente no tendrá horarios para ofrecer.');
  }

  // ── 4. Confirmar antes de llamar ──────────────────────────────────────────
  console.log(`\n📞 Llamando a ${candidato.nombre} al ${candidato.telefono}...`);
  console.log('   (ElevenLabs iniciará la llamada en segundos)\n');

  // ── 5. Hacer la llamada ───────────────────────────────────────────────────
  const { llamada, conversationId } = await makeOutboundCall(candidato, motivo, eventos);

  console.log('════════════════════════════════════════════');
  console.log('✅ LLAMADA INICIADA EXITOSAMENTE');
  console.log('════════════════════════════════════════════');
  console.log(`   llamada_id     : ${llamada.id}`);
  console.log(`   candidato_id   : ${candidato.id}`);
  console.log(`   conversation_id: ${conversationId}`);
  console.log(`   estado actual  : EN_CURSO`);
  console.log('\n📋 Próximos pasos:');
  console.log('   1. El teléfono sonará en segundos.');
  console.log('   2. Cuando el agente termine, ElevenLabs enviará el resultado');
  console.log('      al webhook: POST /webhook/elevenlabs-resultado');
  console.log('   3. Verifica el resultado con: node scripts/6-ver-estado.js\n');

  await pool.end();
  process.exit(0);
}

run().catch(err => {
  console.error('\n❌ Error:', err.message);
  if (err.response?.data) console.error('   ElevenLabs:', JSON.stringify(err.response.data));
  process.exit(1);
});

