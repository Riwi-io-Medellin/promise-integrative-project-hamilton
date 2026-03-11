/**
 * src/services/llamadas/callService.js
 *
 * Dynamic variables sent to ElevenLabs agent:
 *   id, nombre, motivo, ciudad, lista_horarios,
 *   eventos_disponibles, intentos, nota_previa
 */
'use strict';

const axios  = require('axios');
const { createLlamada }         = require('../../db/llamadas');
const { getEnCursoResultadoId } = require('../../db/lookups');
const { buildEventTexts }       = require('../../utils/dateHelpers');
const logger                    = require('../../utils/logger');

const ELEVENLABS_API_URL      = process.env.ELEVENLABS_API_URL
  || 'https://api.elevenlabs.io/v1/convai/twilio/outbound-call';
const ELEVENLABS_API_KEY      = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_AGENT_ID     = process.env.ELEVENLABS_AGENT_ID
  || 'agent_4501khbynht9ennvk32madk7k1jj';
const ELEVENLABS_PHONE_NUM_ID = process.env.ELEVENLABS_PHONE_NUMBER_ID
  || 'phnum_8101khntfkmbeq6amer4dt70p5vs';

/**
 * Build the ElevenLabs request body with ALL required dynamic variables.
 *
 * Variables required by the agent:
 *   id                 – candidato UUID
 *   nombre            – nombre completo
 *   motivo             – motivo/fase de la llamada
 *   ciudad             – municipio del candidato
 *   lista_horarios     – opciones de fecha en texto legible
 *   eventos_disponibles– fechas con IDs para que el agente confirme
 *   intentos           – número de intentos previos de llamada
 *   nota_previa        – nota del último contacto o preferencia de horario
 *
 * @param {object} candidato  – row from getCandidatoById (includes ciudad, nota_previa)
 * @param {string} motivo
 * @param {Array}  eventos
 * @returns {object}
 */
function buildElevenLabsBody(candidato, motivo, eventos) {
  const { fechasTexto, eventosTexto } = buildEventTexts(eventos);

  return {
    agent_id: ELEVENLABS_AGENT_ID,
    agent_phone_number_id: ELEVENLABS_PHONE_NUM_ID,
    to_number: candidato.telefono,
    conversation_initiation_client_data: {
      dynamic_variables: {
        id:                  String(candidato.id),
        nombre:             `${candidato.nombre} ${candidato.apellido}`,
        motivo:              motivo,
        ciudad:              candidato.ciudad || 'Colombia',
        lista_horarios:      fechasTexto      || 'No hay horarios disponibles por el momento',
        eventos_disponibles: eventosTexto     || 'No hay eventos disponibles por el momento',
        intentos:            String(candidato.intentos_llamada || 0),
        nota_previa:         candidato.nota_previa || '',
      },
    },
  };
}

/**
 * Make an outbound call via ElevenLabs and record it in the DB.
 *
 * @param {object} candidato  – row from getCandidatoById
 * @param {string} motivo
 * @param {Array}  eventos
 * @returns {Promise<{llamada: object, conversationId: string|null}>}
 */
async function makeOutboundCall(candidato, motivo, eventos) {
  const body = buildElevenLabsBody(candidato, motivo, eventos);

  logger.info(
    {
      event:        'elevenlabs_call_attempt',
      candidato_id: candidato.id,
      nombre:      `${candidato.nombre} ${candidato.apellido}`,
      telefono:     candidato.telefono,
      ciudad:       candidato.ciudad,
      intentos:     candidato.intentos_llamada,
    },
    'Making outbound call via ElevenLabs',
  );

  let conversationId = null;

  // ── MOCK MODE (ELEVENLABS_MOCK=true) ─────────────────────────────────────
  if (process.env.ELEVENLABS_MOCK === 'true') {
    conversationId = `mock_conv_${Date.now()}`;
    logger.info(
      { event: 'elevenlabs_mock', candidato_id: candidato.id, conversationId },
      '[MOCK] Skipping real ElevenLabs call',
    );
  } else {
    // ── LLAMADA REAL ────────────────────────────────────────────────────────
    try {
      const response = await axios.post(ELEVENLABS_API_URL, body, {
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key':   ELEVENLABS_API_KEY,
        },
        timeout: 15_000,
      });
      conversationId = response.data?.conversation_id || null;
      logger.info(
        { event: 'elevenlabs_call_success', candidato_id: candidato.id, conversationId },
        'ElevenLabs call initiated successfully',
      );
    } catch (err) {
      const status  = err.response?.status;
      const errBody = err.response?.data;
      logger.error(
        { event: 'elevenlabs_call_error', candidato_id: candidato.id, status, errBody, err: err.message },
        'ElevenLabs call failed',
      );
      throw err;
    }
  }

  // ── Registrar en DB con EN_CURSO ─────────────────────────────────────────
  const enCursoId = await getEnCursoResultadoId();
  const llamada   = await createLlamada({
    candidatoId:    candidato.id,
    resultadoId:    enCursoId,
    conversationId: conversationId,
    resumen:        'Llamada iniciada',
  });

  logger.info(
    { event: 'llamada_created', llamada_id: llamada.id, candidato_id: candidato.id },
    'Llamada record created in DB',
  );

  return { llamada, conversationId };
}

module.exports = { makeOutboundCall, buildElevenLabsBody };
