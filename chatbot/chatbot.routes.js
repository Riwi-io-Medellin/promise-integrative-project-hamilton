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

/**
 * GET /preview/:candidato_id
 * Endpoint de diagnóstico para VER el JSON que se enviaría al chatbot.
 * NO envía nada, solo muestra la estructura generada.
 */
router.get('/preview/:candidato_id', async (req, res) => {
  try {
    const { candidato_id } = req.params;
    const data = await chatbotService.gatherCandidateData(candidato_id);
    res.json(data);
  } catch (err) {
    console.error('[ChatbotRoutes] Error en preview:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
