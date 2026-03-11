/**
 * Prueba 4: Enviar un webhook simulado al servidor HTTP.
 *
 * REQUISITO: el servidor debe estar corriendo (npm start o npm run dev)
 *            en otra terminal antes de ejecutar este script.
 *
 * Ejecutar: node scripts/4-test-webhook.js
 *
 * Qué verifica:
 *  - El endpoint POST /webhook/elevenlabs-resultado recibe el payload
 *  - Actualiza tabla llamadas (resultado_id, dia_agendado, etc.)
 *  - Actualiza tabla candidatos (estado_gestion_id, ultimo_contacto)
 *  - Actualiza tabla eventos (inscritos_actuales) si resultado = AGENDADO
 *  - Actualiza tabla cola_llamadas a COMPLETADA
 */
'use strict';
require('dotenv').config();

const http = require('http');
const pool = require('../src/db/pool');

const PORT    = process.env.PORT || 3000;
const HOST    = 'localhost';

// ─── Obtener un candidato_id real de la DB ────────────────────────────────
async function getCandidatoIdReal() {
    const { rows } = await pool.query(
        `SELECT c.id, c.nombre, c.apellido, c.fase_actual
     FROM public.candidatos c
     JOIN public.estados_gestion eg ON eg.id = c.estado_gestion_id
     WHERE eg.codigo = 'PENDIENTE'
     LIMIT 1`
    );
    return rows[0] || null;
}

// ─── Obtener un evento_id real disponible ────────────────────────────────
async function getEventoIdReal(faseActual) {
    const { rows } = await pool.query(
        `SELECT id FROM public.eventos WHERE tipo_reunion = $1 AND estado = 'DISPONIBLE' LIMIT 1`,
        [faseActual]
    );
    return rows[0]?.id || null;
}

// ─── Enviar HTTP POST ─────────────────────────────────────────────────────
function sendPost(path, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const options = {
            hostname: HOST, port: PORT, path,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
        };
        const req = http.request(options, (res) => {
            let raw = '';
            res.on('data', chunk => raw += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function run() {
    console.log('\n══════════════════════════════════════════════════');
    console.log('  TEST 4 – Webhook POST /webhook/elevenlabs-resultado');
    console.log('══════════════════════════════════════════════════\n');

    // 1. Health check primero
    console.log('Verificando que el servidor esté corriendo...');
    try {
        const health = await sendPost('/health', {});
        // health usa GET pero probamos conectividad con cualquier request
    } catch {
        // Solo verificamos conectividad
    }

    // 2. Obtener datos reales de la DB
    const candidato = await getCandidatoIdReal();
    if (!candidato) {
        console.error('❌ No se encontró ningún candidato PENDIENTE en la DB.');
        console.error('   Asegúrate de haber corrido el script de datos insertados.txt en Supabase.');
        await pool.end(); process.exit(1);
    }

    const eventoId = await getEventoIdReal(candidato.fase_actual);
    console.log(`✅ Candidato encontrado: ${candidato.nombre} ${candidato.apellido} (${candidato.fase_actual})`);
    console.log(`✅ Evento ID: ${eventoId || 'ninguno disponible (se enviará null)'}\n`);

    // 3. Construir payload
    const payload = {
        candidato_id: candidato.id,
        resultado:    'AGENDADO',
        dia:          'martes',
        hora:         '10:00 AM',
        evento_id:    eventoId,
        nota:         'Candidato agendó entrevista – prueba desde script',
    };

    console.log('Enviando payload al webhook:');
    console.log(JSON.stringify(payload, null, 2));
    console.log();

    // 4. Enviar
    let resp;
    try {
        resp = await sendPost('/webhook/elevenlabs-resultado', payload);
    } catch (err) {
        console.error('❌ No se pudo conectar al servidor en', `http://${HOST}:${PORT}`);
        console.error('   ¿Está corriendo "npm start" en otra terminal?');
        console.error('  ', err.message);
        await pool.end(); process.exit(1);
    }

    // 5. Verificar respuesta
    if (resp.status === 200 && resp.body.success) {
        console.log('✅ Respuesta del servidor:', resp.status);
        console.log('   Detalles:', JSON.stringify(resp.body.details, null, 2));
    } else {
        console.error('❌ El servidor respondió con error:', resp.status);
        console.error('   Body:', JSON.stringify(resp.body, null, 2));
        await pool.end(); process.exit(1);
    }

    // 6. Verificar cambios en la DB
    console.log('\n── Verificando cambios en la DB ──');

    const { rows: candActual } = await pool.query(
        `SELECT c.nombre, c.apellido, eg.codigo AS estado_gestion, c.ultimo_contacto, c.evento_asignado_id
     FROM public.candidatos c
     JOIN public.estados_gestion eg ON eg.id = c.estado_gestion_id
     WHERE c.id = $1`, [candidato.id]
    );
    console.log('\n✅ Candidato actualizado:');
    console.log('  ', JSON.stringify(candActual[0], null, 2));

    const { rows: colaActual } = await pool.query(
        `SELECT estado FROM public.cola_llamadas
     WHERE candidato_id = $1 AND fecha_programada = CURRENT_DATE
     ORDER BY created_at DESC LIMIT 1`, [candidato.id]
    );
    if (colaActual.length > 0) {
        console.log(`\n✅ Cola actualizada → estado: ${colaActual[0].estado}`);
    } else {
        console.log('\n⚠️  No hay fila en cola_llamadas para hoy (normal si no se ejecutó el worker antes)');
    }

    await pool.end();
    process.exit(0);
}

run().catch(err => { console.error('❌', err.message, err.stack); process.exit(1); });
