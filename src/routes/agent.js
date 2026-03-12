/**
 * src/routes/agent.js
 *
 * API endpoints for the voice agent:
 *
 *   POST /api/agent/call        – Initiate an outbound call to a candidate
 *   GET  /api/agent/info        – Return agent configuration info (for debugging)
 */
'use strict';

const express              = require('express');
const { initiateCall }     = require('../services/twilio/callService');
const logger               = require('../utils/logger');

const router = express.Router();

// ── POST /api/agent/call ──────────────────────────────────────────────────────
/**
 * Body: { candidato_id: "uuid" }
 *
 * Initiates a Twilio outbound call to the candidate.
 * Returns { callSid, llamadaId } on success.
 */
router.post('/call', async (req, res) => {
  const candidatoId = req.body?.candidato_id || req.body?.candidatoId;

  if (!candidatoId) {
    return res.status(400).json({ error: 'Missing required field: candidato_id' });
  }

  try {
    const result = await initiateCall(candidatoId);
    logger.info({ event: 'api_call_initiated', candidato_id: candidatoId, call_sid: result.callSid });
    return res.status(201).json({ success: true, ...result });
  } catch (err) {
    logger.error({ event: 'api_call_error', candidato_id: candidatoId, err: err.message });
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/agent/info ───────────────────────────────────────────────────────
/**
 * Returns the current voice agent configuration (redacts secrets).
 * Useful for verifying env vars are set correctly before a test call.
 */
router.get('/info', (_req, res) => {
  const voiceId    = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
  const modelId    = process.env.ELEVENLABS_MODEL_ID || 'eleven_turbo_v2';
  const llmModel   = process.env.OPENAI_MODEL        || 'gpt-4o';
  const baseUrl    = process.env.BASE_URL             || '(not set)';
  const fromNumber = process.env.TWILIO_FROM_NUMBER   || '(not set)';

  const config = {
    twilio: {
      account_sid:  process.env.TWILIO_ACCOUNT_SID  ? '***' : '(not set)',
      auth_token:   process.env.TWILIO_AUTH_TOKEN   ? '***' : '(not set)',
      from_number:  fromNumber,
      base_url:     baseUrl,
    },
    openai: {
      api_key: process.env.OPENAI_API_KEY ? '***' : '(not set)',
      model:   llmModel,
    },
    elevenlabs: {
      api_key:   process.env.ELEVENLABS_API_KEY ? '***' : '(not set)',
      voice_id:  voiceId,
      model_id:  modelId,
    },
    websocket: {
      endpoint: `${baseUrl.replace(/^http/, 'ws')}/ws/twilio-media`,
    },
  };

  return res.json(config);
});

module.exports = router;
