/**
 * src/app.js – Express application factory
 */
'use strict';

const express        = require('express');
const healthRoutes   = require('./routes/health');
const webhookRoutes  = require('./routes/webhook');
const twilioRoutes   = require('./routes/twilio');
const agentRoutes    = require('./routes/agent');
const chatbotRoutes  = require('../chatbot/chatbot.routes');
const logger         = require('./utils/logger');

const app = express();

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
// Parse application/x-www-form-urlencoded (Twilio status callbacks)
app.use(express.urlencoded({ extended: false }));

// Request logger
app.use((req, _res, next) => {
  logger.info({ event: 'http_request', method: req.method, url: req.originalUrl });
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/health',       healthRoutes);
app.use('/webhook',      webhookRoutes);
app.use('/twilio',       twilioRoutes);
app.use('/api/agent',    agentRoutes);
app.use('/api/chatbot',  chatbotRoutes);

// Endpoint temporal solicitado para pruebas directas de envío al webhook
app.post('/solicitar-chat', async (req, res) => {
  try {
    const chatbotService = require('../chatbot/chatbot.service');
    console.log('[App] Recibida solicitud manual en /solicitar-chat para enviar a compañera:', req.body);
    const result = await chatbotService.sendToChatbot(req.body);
    res.json({ success: true, remote_response: result });
  } catch (err) {
    console.error('[App] Error en /solicitar-chat:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Global error handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  logger.error({ event: 'unhandled_express_error', err: err.message });
  res.status(500).json({ error: 'Internal server error' });
});

module.exports = app;
