// chatbot/chatbot.routes.js
'use strict';

const express = require('express');
const router = express.Router();
const chatbotService = require('./chatbot.service');

/**
 * POST /webhook
 * Webhook endpoint que recibe los resultados del Chatbot.
 */
router.post('/webhook', async (req, res) => {
  try {
    console.log('[ChatbotRoutes] Webhook recibido:', req.body);
    const result = await chatbotService.handleBotWebhook(req.body);
    res.json(result);
  } catch (err) {
    console.error('[ChatbotRoutes] Error en webhook:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /trigger-manual
 * Endpoint para disparar manualmente el chatbot para un candidato.
 * Body: { "candidato_id": "uuid" }
 */
router.post('/trigger-manual', async (req, res) => {
  const { candidato_id } = req.body;
  if (!candidato_id) return res.status(400).json({ error: 'Falta candidato_id' });

  try {
    const result = await chatbotService.forceChatbotTrigger(candidato_id);
    res.json({ message: 'Trigger ejecutado', result });
  } catch (err) {
    console.error('[ChatbotRoutes] Error en trigger manual:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
