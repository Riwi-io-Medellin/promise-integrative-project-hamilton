// scripts/test-webhook-escenarios.js
'use strict';

/**
 * Script para simular múltiples escenarios de respuesta del Webhook.
 * Útil para probar la lógica de recepción sin usar WhatsApp real.
 */

const axios = require('axios');
const pool = require('../src/db/pool');
require('dotenv').config();

const BASE_URL = `http://localhost:${process.env.PORT || 3000}/api/chatbot/webhook`;

async function main() {
    console.log('🧪 INICIANDO PRUEBA DE ESCENARIOS WEBHOOK');
    console.log('=======================================');

    try {
        // 1. Obtener un candidato real para las pruebas
        const res = await pool.query('SELECT id, nombre, telefono FROM public.candidatos ORDER BY created_at DESC LIMIT 1');
        if (res.rows.length === 0) {
            throw new Error('No hay candidatos en la BD para probar.');
        }
        const candidato = res.rows[0];
        console.log(`👤 Candidato de prueba: ${candidato.nombre} (${candidato.id})`);

        // Escenario A: Agendado Exitosamente
        console.log('\n--- Escenario A: AGENDADO ---');
        try {
             // Buscar un evento disponible cualquiera
             const eventRes = await pool.query('SELECT id FROM public.eventos WHERE estado = \'DISPONIBLE\' LIMIT 1');
             const eventId = eventRes.rows.length > 0 ? eventRes.rows[0].id : 999;

             const payloadA = {
                 candidato_id: candidato.id,
                 telefono: candidato.telefono,
                 resultado_agenda: 'AGENDADO',
                 evento_id: eventId,
                 nota: 'Simulación: El usuario eligió el primer horario disponible.'
             };
             console.log('Enviando:', JSON.stringify(payloadA, null, 2));
             const responseA = await axios.post(BASE_URL, payloadA);
             console.log('✅ Respuesta:', responseA.data);

        } catch (err) {
            console.error('❌ Falló Escenario A:', err.message);
        }

        // Esperar un poco
        await new Promise(r => setTimeout(r, 2000));

        // Escenario B: Interesado pero sin agenda (Ej: pide llamar luego)
        console.log('\n--- Escenario B: LLAMAR_LUEGO (Nota) ---');
        try {
            const payloadB = {
                candidato_id: candidato.id,
                telefono: candidato.telefono,
                resultado_agenda: 'LLAMAR_LUEGO',
                evento_id: null,
                nota: 'Simulación: El usuario pide que lo llamen mañana.'
            };
            console.log('Enviando:', JSON.stringify(payloadB, null, 2));
            const responseB = await axios.post(BASE_URL, payloadB);
            console.log('✅ Respuesta:', responseB.data);
        } catch (err) {
            console.error('❌ Falló Escenario B:', err.message);
        }

        console.log('\n=======================================');
        console.log('🏁 Pruebas finalizadas. Revisa la tabla de logs o el estado del candidato.');

    } catch (err) {
        console.error('❌ Error general en el script:', err.message);
    } finally {
        // Forzar cierre porque el pool de conexioens puede dejar el proceso abierto
        process.exit(0);
    }
}

main();

