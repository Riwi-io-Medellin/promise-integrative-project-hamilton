console.log('Iniciando script de prueba...');
const axios = require('axios');
require('dotenv').config(); // Cargar variables de entorno para ver puerto configurado

// Intentar leer el puerto del .env, si no usar 8000 por defecto según solicitud del usuario
const PORT = process.env.PORT || 8000;
const BASE_URL = `http://localhost:${PORT}`;

const payload = {
  "telefono": "+573112790495",
  "nombre": "Andrea",
  "motivo": "ENTREVISTA",
  "ciudad": "Medellín",
  "lista_horarios": "1) lunes 16 de marzo a las 3:00 PM\n2) martes 17 de marzo a las 7:00 PM",
  "eventos_disponibles": [
    {
      "fecha_legible": "lunes 16 de marzo a las 3:00 PM",
      "evento_id": 99
    },
    {
      "fecha_legible": "martes 17 de marzo a las 7:00 PM",
      "evento_id": 105
    }
  ],
  "nota_previa": ""
};

async function test() {
  const url = `${BASE_URL}/solicitar-chat`;
  try {
    console.log(`Enviando solicitud a ${url} ...`);
    const res = await axios.post(url, payload);
    console.log('Respuesta del servidor local:', res.data);
  } catch (err) {
    console.error(`Error conectando a ${url}:`, err.message);
    if (err.code === 'ECONNREFUSED') {
        console.error(`\n⚠️  El servidor no parece estar corriendo en el puerto ${PORT}.`);
        console.error(`    Por favor verifica en qué puerto iniciaste SofIA (revisa tu .env o la terminal donde corre).`);
        console.error(`    Si corre en otro puerto (ej: 3000), cambia el puerto en este script o en tu .env.`);
    }
    if (err.response) {
      console.error('Detalles respuesta error:', err.response.data);
    }
  }
}

test();
