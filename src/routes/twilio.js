/**
 * src/routes/twilio.js
 *
 * HTTP endpoints for Twilio:
 *
 *   POST /twilio/twiml        – TwiML to connect Twilio call to our WebSocket
 *   POST /twilio/status       – Twilio status callback (ringing, answered, etc.)
 */
'use strict';

const express              = require('express');
const { processWebhookResult } = require('../services/webhook/webhookService');
const { getCallState, removeCallState } = require('../services/twilio/callService');
const logger               = require('../utils/logger');

const router = express.Router();

// ── Helper: derive WSS base URL ───────────────────────────────────────────────
function getWssBase() {
  const base = (process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`).replace(/\/$/, '');
  // http(s) → ws(s)
  return base.replace(/^http/, 'ws');
}

// ── POST /twilio/twiml ────────────────────────────────────────────────────────
/**
 * Twilio calls this URL when the outbound call is answered.
 * We respond with TwiML that opens a bidirectional Media Stream to our WS server.
 *
 * candidato_id is passed as a query-string parameter when we create the call.
 */
router.post('/twiml', (req, res) => {
  const candidatoId = req.query.candidato_id || req.body?.candidato_id || '';
  const wssBase     = getWssBase();
  const streamUrl   = `${wssBase}/ws/twilio-media?candidato_id=${encodeURIComponent(candidatoId)}`;

  logger.info({ event: 'twiml_served', candidato_id: candidatoId, stream_url: streamUrl });

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="${streamUrl}"/>
  </Connect>
</Response>`;

  res.set('Content-Type', 'text/xml; charset=utf-8');
  res.send(twiml);
});

// ── POST /twilio/status ───────────────────────────────────────────────────────
/**
 * Twilio posts call lifecycle events here.
 *
 * For calls that are NEVER answered (busy / no-answer / failed), we write
 * the result to the DB so attempt counters keep accumulating toward the
 * 9-attempt WhatsApp fallback.
 *
 * For answered calls the AgentSession already handles DB writes; we only
 * need to clean up memory state.
 */
router.post('/status', async (req, res) => {
  const {
    CallSid,
    CallStatus,
    To,
    Duration,
  } = req.body;

  // candidato_id may come from query string (set when initiating the call)
  const candidatoId = req.query.candidato_id || null;

  logger.info({
    event:        'twilio_status_callback',
    call_sid:     CallSid,
    status:       CallStatus,
    to:           To,
    duration:     Duration,
    candidato_id: candidatoId,
  });

  // Map Twilio terminal-failure statuses to internal resultado codes.
  // 'canceled' means the call was cancelled before ringing or while ringing
  // (system or caller side); treated as NO_CONTESTA so attempt counters advance.
  const unansweredMap = {
    busy:        'OCUPADO',
    'no-answer': 'NO_CONTESTA',
    failed:      'NO_CONTESTA',
    canceled:    'NO_CONTESTA',
  };

  const internalResultado = unansweredMap[CallStatus];

  if (internalResultado && candidatoId) {
    // Call was never answered – record the attempt so counters advance
    try {
      await processWebhookResult({
        candidato_id: candidatoId,
        resultado:    internalResultado,
        nota:         `Twilio status: ${CallStatus}`,
      });
      logger.info({
        event:        'unanswered_call_recorded',
        candidato_id: candidatoId,
        resultado:    internalResultado,
      });
    } catch (err) {
      logger.error({
        event:        'status_callback_db_error',
        candidato_id: candidatoId,
        err:          err.message,
      });
    }
  }

  // Clean up in-memory call state when the call is fully complete
  if (['completed', 'busy', 'no-answer', 'failed', 'canceled'].includes(CallStatus) && CallSid) {
    removeCallState(CallSid);
  }

  res.sendStatus(200);
});

module.exports = router;
