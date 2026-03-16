// scripts/ver-payload-candidato.js
'use strict';

console.log('📢 Iniciando script de diagnóstico...');

require('dotenv').config();
const service = require('../chatbot/chatbot.service');
const pool = require('../src/db/pool');

async function main() {
  const candidatoId = process.argv[2];
  
  if (!candidatoId) {
    console.error('❌ Error: Debes pasar un UUID.');
    console.error('Uso: node scripts/ver-payload-candidato.js <UUID>');
    process.exit(1);
  }

  console.log(`🔍 Inspeccionando datos para candidato: ${candidatoId}`);

  try {
     // Verificar si la función existe
     if (typeof service.gatherCandidateData !== 'function') {
         throw new Error('La función gatherCandidateData no está exportada en chatbot.service.js. Revisa que el archivo tenga "gatherCandidateData" en el module.exports.');
     }

     console.log('📊 Consultando base de datos...');
     const data = await service.gatherCandidateData(candidatoId);
     
     console.log('\n📦 --- PAYLOAD QUE SE ENVIARÍA AL CHATBOT ---');
     console.log(JSON.stringify(data, null, 2));
     console.log('--------------------------------------------\n');

     // Diagnóstico de problemas comunes
     if (!data.lista_horarios || data.eventos_disponibles.length === 0) {
         console.warn('⚠️  ADVERTENCIA CRÍTICA: La lista de horarios está vacía.');
         console.warn('    Esto casi seguro causará un ERROR 500 en el chatbot de tu compañera,');
         console.warn('    ya que el bot esperará opciones para ofrecer.');
         console.warn('    Solución: Verifica que haya eventos DISPONIBLES en la tabla eventos para la fase del candidato.');
     } else {
         console.log('✅ El payload parece correcto (tiene horarios y eventos).');
     }

  } catch (err) {
    console.error('❌ Error fatal en el script:', err.message);
    console.error(err);
  } finally {
    console.log('🔌 Cerrando conexión a la DB...');
    await pool.end();
  }
}

main();
