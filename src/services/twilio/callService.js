/**
 * src/services/twilio/callService.js
 * Initiates outbound Twilio calls and tracks in-flight call state.
 */
'use strict';

const { getTwilioClient } = require('./twilioClient');
const pool                = require('../../db/pool');
const { getEnCursoResultadoId } = require('../../db/lookups');
const { getLatestActiveLlamada } = require('../../db/llamadas');
const logger              = require('../../utils/logger');

/**
 * In-memory map: callSid → { candidatoId, llamadaId }
 * Used to correlate Twilio status callbacks with internal records.
 */
const _activeCallState = new Map();

function getInMemoryActiveCallForCandidate(candidatoId) {
  for (const [callSid, state] of _activeCallState.entries()) {
    if (state?.candidatoId === candidatoId) {
      return { callSid, ...state };
    }
  }
  return null;
}

function getBaseUrl() {
  return (process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
}

function assertPublicBaseUrl(baseUrl) {
  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error(
      `BASE_URL is invalid: "${baseUrl}". Set a public URL such as https://tu-subdominio.ngrok-free.app`,
    );
  }

  const hostname = parsed.hostname.toLowerCase();
  const blockedHosts = new Set(['localhost', '0.0.0.0']);
  const isLoopback = hostname === '127.0.0.1' || hostname === '::1';

  if (blockedHosts.has(hostname) || isLoopback) {
    throw new Error(
      `BASE_URL must be a public URL for Twilio callbacks. Current value: "${baseUrl}". `
      + 'Use an HTTPS tunnel such as ngrok and restart the server.',
    );
  }
}

/**
 * Initiate an outbound call to a candidate.
 * Creates a `llamadas` DB record, dials via Twilio and stores call state.
 *
 * @param {string} candidatoId – UUID of the candidate to call
 * @returns {Promise<{ callSid: string, llamadaId: number|null }>}
 */
async function initiateCall(candidatoId) {
  const existingInMemory = getInMemoryActiveCallForCandidate(candidatoId);
  if (existingInMemory) {
    const err = new Error(`Candidate already has an active call: ${existingInMemory.callSid}`);
    err.statusCode = 409;
    throw err;
  }

  const { rows } = await pool.query(
    'SELECT telefono, nombre FROM public.candidatos WHERE id = $1 LIMIT 1',
    [candidatoId],
  );
  if (!rows.length) throw new Error(`Candidato not found: ${candidatoId}`);
  const { telefono, nombre } = rows[0];

  const fromNumber = process.env.TWILIO_FROM_NUMBER;
  if (!fromNumber) throw new Error('Missing TWILIO_FROM_NUMBER env var');

  const baseUrl = getBaseUrl();
  assertPublicBaseUrl(baseUrl);
  const twimlUrl      = `${baseUrl}/twilio/twiml?candidato_id=${encodeURIComponent(candidatoId)}`;
  const statusCbUrl   = `${baseUrl}/twilio/status?candidato_id=${encodeURIComponent(candidatoId)}`;

  // ── Create EN_CURSO llamada record ─────────────────────────────────────────
  const enCursoId = await getEnCursoResultadoId();

  const existingDbCall = await getLatestActiveLlamada(candidatoId, enCursoId);
  if (existingDbCall) {
    const err = new Error(`Candidate already has an EN_CURSO call in DB: ${existingDbCall.id}`);
    err.statusCode = 409;
    throw err;
  }

  let llamadaId = null;
  if (enCursoId) {
    const { rows: ins } = await pool.query(
      `INSERT INTO public.llamadas (candidato_id, resultado_id, fecha_hora_llamada)
       VALUES ($1, $2, NOW())
       RETURNING id`,
      [candidatoId, enCursoId],
    );
    llamadaId = ins[0]?.id || null;
  }

  // ── Dial via Twilio ────────────────────────────────────────────────────────
  const client = getTwilioClient();
  const call   = await client.calls.create({
    to:                   telefono,
    from:                 fromNumber,
    url:                  twimlUrl,
    statusCallback:       statusCbUrl,
    statusCallbackMethod: 'POST',
    statusCallbackEvent:  ['ringing', 'answered', 'completed'],
  });

  _activeCallState.set(call.sid, { candidatoId, llamadaId });

  logger.info(
    { event: 'call_initiated', call_sid: call.sid, candidato_id: candidatoId, llamada_id: String(llamadaId) },
    `Outbound call initiated to ${nombre} (${telefono})`,
  );

  return { callSid: call.sid, llamadaId };
}

/**
 * Retrieve stored call state by Twilio CallSid.
 * @param {string} callSid
 * @returns {{ candidatoId: string, llamadaId: number|null }|null}
 */
function getCallState(callSid) {
  return _activeCallState.get(callSid) || null;
}

/**
 * Remove stored call state when a call is fully resolved.
 * @param {string} callSid
 */
function removeCallState(callSid) {
  _activeCallState.delete(callSid);
}

module.exports = { initiateCall, getCallState, removeCallState };
