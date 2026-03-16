// scripts/trigger-masivo-chatbot.js
'use strict';

/**
 * script: trigger-masivo-chatbot.js
 * Descripción: Busca candidatos que cumplan la condición de "9 llamadas fallidas hoy"
 * y dispara el chatbot para ellos en lotes (batch) de 4 candidatos.
 * 
 * Uso: node scripts/trigger-masivo-chatbot.js
 */

require('dotenv').config();
const pool = require('../src/db/pool');
const chatbotService = require('../chatbot/chatbot.service');

const BATCH_SIZE = 4;

async function main() {
  console.log('🚀 Iniciando proceso masivo de Chatbot (Lote de 4)...');

  try {
    // 1. Buscar candidatos elegibles
    // Criterio nuevo solicitado: 
    // - Columna 'intentos_llamada' en tabla candidatos >= 9
    
    console.log('🔍 Buscando candidatos con intentos_llamada >= 9 ...');
    
    // Función de reintento para consultas
    async function queryWithRetry(queryText, params, retries = 3) {
      for (let i = 0; i < retries; i++) {
        try {
          return await pool.query(queryText, params);
        } catch (err) {
          console.warn(`⚠️ Intento ${i + 1}/${retries} fallido: ${err.message}`);
          if (i === retries - 1) throw err;
          await new Promise(r => setTimeout(r, 2000)); // Esperar 2s antes de reintentar
        }
      }
    }

    const query = `
      SELECT id as candidato_id, intentos_llamada as failed_count
      FROM public.candidatos
      WHERE intentos_llamada >= 9
      LIMIT $1
    `;

    const res = await queryWithRetry(query, [BATCH_SIZE]);
    const candidatos = res.rows;

    if (candidatos.length === 0) {
      console.log('⚠️ No se encontraron candidatos que cumplan la condición (9 llamadas fallidas hoy).');
      process.exit(0);
    }

    console.log(`✅ Se encontraron ${candidatos.length} candidatos para procesar.`);

    // 2. Procesar en lote
    for (const cand of candidatos) {
      const uuid = cand.candidato_id;
      console.log(`\n-----------------------------------------------------------`);
      console.log(`🤖 Procesando candidato: ${uuid} (Intentos fallidos: ${cand.failed_count})`);
      
      try {
        // Usamos gatherCandidateData y sendToChatbot que ya existen
        // No usamos 'shouldTriggerChatbot' porque ya validamos en la query masiva
        const data = await chatbotService.forceChatbotTrigger(uuid);
        
        if (data.error_envio) {
            console.error(`❌ Falló envío para ${uuid}: ${data.message}`);
        } else {
            console.log(`✅ Envío exitoso para ${uuid}`);
        }

      } catch (err) {
        console.error(`❌ Error procesando candidato ${uuid}:`, err.message);
      }
      
      // Pequeña pausa para no saturar
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log('\n🏁 Proceso masivo finalizado.');
    
  } catch (err) {
    console.error('❌ Error general en script masivo:', err);
  } finally {
    pool.end();
  }
}

main();
