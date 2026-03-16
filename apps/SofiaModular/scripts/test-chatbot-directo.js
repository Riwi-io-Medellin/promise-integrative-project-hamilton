// scripts/test-chatbot-directo.js
'use strict';

require('dotenv').config();
const { forceChatbotTrigger } = require('../chatbot/chatbot.service');
const pool = require('../src/db/pool');

async function main() {
  const candidatoId = process.argv[2];

  if (!candidatoId) {
    console.error('❌ Error: Debes proporcionar un UUID de candidato.');
    console.error('Uso: node scripts/test-chatbot-directo.js <UUID>');
    process.exit(1);
  }

  console.log(`🔍 Iniciando prueba directa para candidato: ${candidatoId}`);
  console.log('   (Esto consultará la BD real y enviará al Chatbot real)');

  try {
    // 1. Probar conexión DB primero para descartar problemas básicos
    const client = await pool.connect();
    const res = await client.query('SELECT NOW()');
    client.release();
    console.log(`✅ Conexión DB OK: ${res.rows[0].now}`);

    // 2. Ejecutar lógica del servicio
    const resultado = await forceChatbotTrigger(candidatoId);
    
    console.log('\n✅ Resultado del Chatbot Service:');
    console.log(JSON.stringify(resultado, null, 2));

  } catch (err) {
    console.error('\n❌ Error durante la prueba:');
    console.error(err.message);
    if (err.response) {
        console.error('Detalles respuesta HTTP error:', err.response.data);
    }
  } finally {
    // Forzar cierre del pool para terminar el script
    await pool.end(); 
    console.log('🔌 Conexión cerrada.');
  }
}

main();

