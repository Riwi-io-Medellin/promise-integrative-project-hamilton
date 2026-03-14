/**
 * scripts/invitar-jurado.js
 *
 * Busca un jurado/candidato en la BD y envía el payload con la estructura exacta:
 * {
 *   "candidato_id": "...",
 *   "telefono": "+57...",
 *   "nombre": "...",
 *   "motivo": "PRESENTACION_PROYECTOS",
 *   "ciudad": "Medellín",
 *   "lista_horarios": "Lunes 16 de marzo a las 10:00 AM",
 *   "eventos_disponibles": [...],
 *   "nota_previa": "Invitación_Especial"
 * }
 */
'use strict';

require('dotenv').config();
const axios = require('axios');
const https = require('https');
const pool = require('../src/db/pool');

const CHATBOT_WEBHOOK_URL = process.env.CHATBOT_WEBHOOK_URL || 'http://localhost:4000/webhook/initiate';
const EVENTO_JURADOS_ID = 5; // <--- ID DEL EVENTO DE PRESENTACIÓN

// Helper para formato de fecha: "Lunes 16 de marzo a las 10:00 AM"
const DAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function formatChatbotDate(fechaHoraIso) {
    const cleaned  = String(fechaHoraIso).replace('+00:00', '').replace('Z', '');
    const fecha    = new Date(cleaned);

    const diaNombre = DAYS_ES[fecha.getDay()];
    // Capitalizar primera letra del día
    const diaCap    = diaNombre.charAt(0).toUpperCase() + diaNombre.slice(1);

    const diaNum    = fecha.getDate();
    const mesNombre = MONTHS_ES[fecha.getMonth()];

    const horas     = fecha.getHours();
    const minutos   = String(fecha.getMinutes()).padStart(2, '0');
    const ampm      = horas >= 12 ? 'PM' : 'AM';
    const hora12    = horas % 12 || 12;

    const legible = `${diaCap} ${diaNum} de ${mesNombre} a las ${hora12}:${minutos} ${ampm}`;

    return {
        legible: legible
    };
}

async function main() {
    const candidatoId = process.argv[2];

    if (!candidatoId) {
        console.error('❌ Error: Debes proporcionar el UUID del jurado/candidato.');
        console.error('Uso: node scripts/invitar-jurado.js <UUID>');
        process.exit(1);
    }

    try {
        console.log(`🔍 Buscando jurado ${candidatoId}...`);

        // 1. Obtener datos del Jurado
        const candidateRes = await pool.query(`
            SELECT c.id, c.nombre, c.telefono, m.nombre as ciudad
            FROM public.candidatos c
            LEFT JOIN public.municipios m ON c.municipio_id = m.id
            WHERE c.id = $1
        `, [candidatoId]);

        const candidate = candidateRes.rows[0];
        if (!candidate) throw new Error('Jurado no encontrado en BD. Verifica el UUID.');

        // 2. Obtener el evento de Presentación (ID 5)
        console.log(`📅 Buscando evento de presentación (ID ${EVENTO_JURADOS_ID})...`);
        const eventRes = await pool.query(`
            SELECT id, tipo_reunion, fecha_hora 
            FROM public.eventos 
            WHERE id = $1
        `, [EVENTO_JURADOS_ID]);

        const evento = eventRes.rows[0];
        if (!evento) throw new Error(`El evento ID ${EVENTO_JURADOS_ID} no existe en la BD.`);

        const fechaFmt = formatChatbotDate(evento.fecha_hora);

        // 3. Crear Payload con la estructura "EXACTAMENTE ASI"
        const payload = {
            candidato_id: candidate.id,
            telefono: candidate.telefono, // Enviamos el teléfono tal cual viene de BD (con + si lo tiene)
            nombre: candidate.nombre,
            motivo: "PRESENTACION_PROYECTOS",
            ciudad: candidate.ciudad || 'Medellín',
            lista_horarios: fechaFmt.legible,
            eventos_disponibles: [
                {
                    fecha_legible: fechaFmt.legible,
                    evento_id: evento.id
                }
            ],
            nota_previa: "Invitación_Especial"
        };

        // 4. Enviar
        console.log(`🚀 Enviando invitación a ${candidate.nombre}...`);
        console.log(`📦 Payload a enviar:\n${JSON.stringify(payload, null, 2)}`);
        console.log(`📡 URL: ${CHATBOT_WEBHOOK_URL}`);

        const agent = new https.Agent({ rejectUnauthorized: false });
        await axios.post(CHATBOT_WEBHOOK_URL, payload, {
            httpsAgent: agent,
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
            }
        });

        console.log('\n✅ Invitación enviada con éxito.');

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        if (err.response) console.error('🔴 Detalle HTTP:', err.response.data);
    } finally {
        await pool.end();
    }
}

main();
