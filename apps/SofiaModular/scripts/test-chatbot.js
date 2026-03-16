// scripts/test-chatbot.js
'use strict';

require('dotenv').config();
const axios = require('axios');
const pool = require('../src/db/pool');

async function main() {
  const candidatoId = process.argv[2];
  
  if (!candidatoId) {
    console.error('Uso: node scripts/test-chatbot.js <UUID_CANDIDATO>');
    console.log('Buscando un candidato reciente para sugerir...');
    
    try {
        const { rows } = await pool.query('SELECT id, nombre, telefono FROM public.candidatos ORDER BY created_at DESC LIMIT 5');
        console.table(rows);
    } catch (e) {
        console.error('Error db:', e.message);
    }
    process.exit(1);
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

