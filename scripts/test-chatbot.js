// scripts/test-chatbot.js
'use strict';

require('dotenv').config();
const axios = require('axios');
const pool = require('../src/db/pool');

async function main() {
  let candidatoId = process.argv[2];
  
  if (!candidatoId) {
    console.log('⚠️ No se proporcionó ID. Buscando el último candidato para probar...');
    try {
        const { rows } = await pool.query('SELECT id, nombre, telefono FROM public.candidatos ORDER BY created_at DESC LIMIT 1');
        if (rows.length > 0) {
            candidatoId = rows[0].id;
            console.log(`🎯 Usando candidato: ${rows[0].nombre} (${candidatoId})`);
        } else {
            console.error('❌ No hay candidatos en la base de datos para probar.');
            process.exit(1);
        }
    } catch (e) {
        console.error('Error db:', e.message);
        process.exit(1);
    }
  }

  const url = `http://localhost:${process.env.PORT || 3000}/api/chatbot/trigger-manual`;
  console.log(`Enviando petición a: ${url}`);
  
  try {
    const res = await axios.post(url, { candidato_id: candidatoId });
    console.log('Respuesta del servidor:', res.data);
  } catch (err) {
    console.error('Error ejecutando test:', err.message);
    if (err.response) {
        console.error('Detalle error:', err.response.data);
    }
  } finally {
      process.exit(0);
  }
}

main();
