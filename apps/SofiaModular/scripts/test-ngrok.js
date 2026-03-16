// scripts/test-ngrok.js
const axios = require('axios');

// Tomar la URL del argumento
const args = process.argv.slice(2);
let baseUrl = args[0];

if (!baseUrl) {
    console.log("❌ Error: Debes indicar la URL de ngrok (la que te salió en la terminal de ngrok).");
    console.log("Ejemplo: node scripts/test-ngrok.js https://tu-url.ngrok-free.app/api/chatbot/webhook");
    process.exit(1);
}

// Si el usuario pone solo el dominio base, le agregamos el path del webhook
if (!baseUrl.includes('/api/chatbot/webhook')) {
    // Si termina en slash, quitarlo
    if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
    
    baseUrl = baseUrl + '/api/chatbot/webhook';
    console.log(`ℹ️ Ajustando URL a: ${baseUrl}`);
}

const payload = {
  candidato_id: '0dd9d7da-525f-44ad-997a-8e52103b765b',
  resultado_agenda: 'AGENDADO',
  nota: 'Prueba de Ngrok -> Localhost (Desde Script)'
};

console.log(`📡 Enviando prueba a: ${baseUrl}`);

// Configurar headers para evitar la página de advertencia de ngrok
const config = {
    headers: {
        'ngrok-skip-browser-warning': 'true',
        'Content-Type': 'application/json',
        'User-Agent': 'SofIA-Test-Script/1.0'
    }
};

axios.post(baseUrl, payload, config)
  .then(res => {
      console.log('✅ ¡ÉXITO! El servidor local respondió correctamente:');
      console.log(JSON.stringify(res.data, null, 2));
  })
  .catch(err => {
      console.error('❌ FALLÓ EL ENVÍO.');
      if (err.response) {
          console.error(`Status code: ${err.response.status}`);
          // Mostrar algo del HTML/JSON recibido
          const dataPreview = typeof err.response.data === 'string' 
              ? err.response.data.substring(0, 300) 
              : JSON.stringify(err.response.data);
          console.error('Respuesta:', dataPreview);
      } else {
          console.error('Error:', err.message);
          console.log('Consejo: Verifica que la terminal de "ngrok http 3000" siga abierta y no haya expirado la sesión.');
      }
  });
