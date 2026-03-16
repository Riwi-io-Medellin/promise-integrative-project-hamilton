// scripts/debug-chatbot.js
'use strict';

require('dotenv').config();
const { forceChatbotTrigger } = require('../chatbot/chatbot.service');
const pool = require('../src/db/pool');

async function main() {
  const candidatoId = process.argv[2];
  if (!candidatoId) {
    console.error('Falta ID de candidato');
    process.exit(1);
  }

  console.log(`Debuggeando trigger para candidato: ${candidatoId}`);

  try {
    // Probar conexión DB primero
    console.log('Probando conexión a base de datos...');
    const res = await pool.query('SELECT NOW()');
    console.log('DB Conectada:', res.rows[0]);

    console.log('Ejecutando forceChatbotTrigger...');
    const result = await forceChatbotTrigger(candidatoId);
    console.log('Resultado Exitoso:', result);

  } catch (err) {
    console.error('❌ ERROR CAPTURADO:');
    console.error(err);
    if (err.response) {
        console.error('Detalle respuesta axios:', err.response.data);
    }
  } finally {
    await pool.end();
  }
}

main();

