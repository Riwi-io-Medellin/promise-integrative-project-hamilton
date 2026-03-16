// scripts/test-webhook-respuesta.js
'use strict';

/**
 * Script para simular una respuesta del Chatbot externo (Webhook).
 * Envía un payload JSON al endpoint local /api/chatbot/webhook
 * 
 * Uso:
 *   node scripts/test-webhook-respuesta.js [CANDIDATO_UUID] [RESULTADO] [EVENTO_UUID]
 * 
 * Ejemplos:
 *   1. Agendado (con evento):
 *      node scripts/test-webhook-respuesta.js "SU-UUID" "AGENDADO" "UUID-EVENTO"
 * 
 *   2. No interesado (sin evento):
 *      node scripts/test-webhook-respuesta.js "SU-UUID" "NO_INTERESADO"
 * 
 *   3. Solo nota:
 *      node scripts/test-webhook-respuesta.js "SU-UUID" "OTRO" "" "Nota explicativa"
 */

const axios = require('axios');
require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.PORT || 3000}/api/chatbot/webhook`;

// Argumentos
const args = process.argv.slice(2);
const candidato_id = args[0] || '00000000-0000-0000-0000-000000000000'; // UUID dummy
const resultado = args[1] || 'AGENDADO';
const evento_id = args[2] || ''; // Opcional
const nota = args[3] || 'Prueba desde script local';

async function main() {
  console.log('🤖 Simulando respuesta del Chatbot...');
  console.log(`📡 URL Destino: ${BASE_URL}`);

  const payload = {
    candidato_id: candidato_id,
    telefono: '+573001234567', // Dummy phone
    resultado_agenda: resultado,
    evento_id: evento_id,
    nota: nota
  };

  console.log('\n📦 Payload a enviar:');
  console.log(JSON.stringify(payload, null, 2));

  try {
    const response = await axios.post(BASE_URL, payload);
    console.log('\n✅ Respuesta del Servidor:', response.status, response.statusText);
    console.log('📄 Datos:', response.data);
  } catch (error) {
    console.error('\n❌ Error enviando webhook:');
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Data: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.error(error.message);
    }
  }
}

main();

