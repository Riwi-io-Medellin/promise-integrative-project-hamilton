/**
 * src/routes/webhook.js – ElevenLabs webhook route
 *
 * POST /webhook/elevenlabs-resultado
 *
 * Expected body from ElevenLabs agent:
 * {
 *   "candidato_id":      "uuid",          ← required
 *   "resultado":         "AGENDADO",      ← required  (resultados_llamada.codigo)
 *   "dia":               "miércoles",     ← when AGENDADO
 *   "hora":              "7:00 PM",       ← when AGENDADO
 *   "evento_id":         2,               ← when AGENDADO
 *   "nota":              "...",           ← optional summary
 *   "hora_callback":     "21:00",         ← optional HH:MM; schedules a PERSONALIZADA call
 *   "duracion_segundos": 120              ← optional
 * }
 */
'use strict';

const express              = require('express');
const { processWebhookResult } = require('../services/webhook/webhookService');
const logger               = require('../utils/logger');

const router = express.Router();

/**
 * POST /webhook/elevenlabs-resultado
 */
router.post('/elevenlabs-resultado', async (req, res) => {
  try {
    const payload = req.body;

    // Basic validation
    if (!payload || !payload.candidato_id || !payload.resultado) {
      logger.warn(
        { event: 'webhook_invalid_payload', body: payload },
        'Webhook received invalid payload',
      );
      return res.status(400).json({
        error: 'Missing required fields: candidato_id and resultado',
      });
    }

    const result = await processWebhookResult(payload);

    return res.status(200).json({
      success: true,
      ...result,
    });

  } catch (err) {
    logger.error(
      { event: 'webhook_route_error', err: err.message },
      'Error processing webhook',
    );
    return res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  }
});

module.exports = router;

