// scripts/diagnostico-red.js
const axios = require('axios');
const https = require('https');

const URL = 'https://rae-compensable-unmunificently.ngrok-free.dev/solicitar-chat';

const payload = {
  test: true,
  mensaje: "Prueba de conexión desde SofIA"
};

async function testConnection() {
  console.log(`📡 Probando conexión a: ${URL}`);

  const agent = new https.Agent({  
    rejectUnauthorized: false
  });

  try {
    const res = await axios.post(URL, payload, {
      httpsAgent: agent,
      headers: {
        'ngrok-skip-browser-warning': 'true',
        'User-Agent': 'SofIA-Diagnostico/1.0',
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Éxito! Status:', res.status);
    console.log('Datos:', res.data);
  } catch (err) {
    console.error('❌ Error de conexión:', err.message);
    if (err.response) {
      console.error('Status:', err.response.status);
      console.error('Headers:', err.response.headers);
      console.error('Body:', err.response.data);
    } else if (err.request) {
      console.error('No hubo respuesta del servidor (timeout o red caída)');
    }
  }
}

testConnection();

