/**
 * src/ws/twilioMediaStream.js
 *
 * Attaches a WebSocket server to an existing Node.js HTTP server.
 * Handles Twilio Media Streams connections at path /ws/twilio-media.
 *
 * Each connection maps to one AgentSession.
 *
 * Twilio Media Streams protocol reference:
 *   https://www.twilio.com/docs/voice/twiml/stream#message-types
 */
'use strict';

const { WebSocketServer } = require('ws');
const { AgentSession }    = require('../services/voiceAgent/agentSession');
const { gatherCandidateData } = require('../../chatbot/chatbot.service');
const logger              = require('../utils/logger');

/**
 * Milliseconds to wait after a session ends before closing the WebSocket.
 * This allows the final TTS audio to finish streaming to Twilio before the
 * connection is torn down.
 */
const CLOSE_DELAY_MS = 3_500;

/**
 * Attach the Twilio Media Streams WebSocket server to `httpServer`.
 *
 * @param {import('http').Server} httpServer
 * @returns {WebSocketServer}
 */
function setupWebSocketServer(httpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/twilio-media' });

  wss.on('connection', (ws, req) => {
    // Extract candidato_id from the URL query string
    // e.g. wss://server/ws/twilio-media?candidato_id=<uuid>
    const reqUrl      = new URL(req.url, 'http://localhost');
    const candidatoId = reqUrl.searchParams.get('candidato_id') || null;

    logger.info({ event: 'ws_connected', candidato_id: candidatoId });

    /** @type {AgentSession|null} */
    let session   = null;
    let streamSid = null;

    // ── Inbound message handler ─────────────────────────────────────────────
    ws.on('message', async (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }

      switch (msg.event) {

        // ── Handshake ───────────────────────────────────────────────────────
        case 'connected':
          logger.info({ event: 'ws_handshake', protocol: msg.protocol, version: msg.version });
          break;

        // ── Stream started – create agent session ───────────────────────────
        case 'start': {
          streamSid = msg.start?.streamSid ?? msg.streamSid ?? null;
          logger.info({ event: 'ws_stream_start', stream_sid: streamSid, candidato_id: candidatoId });

          if (!candidatoId) {
            logger.warn({ event: 'ws_no_candidato_id' }, 'No candidato_id in stream URL; closing');
            ws.close();
            break;
          }

          try {
            // Load candidate context (name + available events)
            const candidateData = await gatherCandidateData(candidatoId);

            session = new AgentSession({
              candidatoId,
              candidatoNombre:    candidateData.nombre,
              eventosDisponibles: candidateData.eventos_disponibles,
            });

            session.setStreamSid(streamSid);

            // Wire TTS output → Twilio
            session.setSendAudio((base64Audio) => {
              if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify({
                  event:     'media',
                  streamSid,
                  media:     { payload: base64Audio },
                }));
              }
            });

            // When agent decides the call is done, wait briefly for audio then close
            session.on('session_ended', ({ resultado }) => {
              logger.info({ event: 'session_ended', candidato_id: candidatoId, resultado });
              // Delay close to allow final TTS audio to finish streaming to Twilio
              setTimeout(() => {
                if (ws.readyState === ws.OPEN) ws.close();
              }, CLOSE_DELAY_MS);
            });

            await session.start();
          } catch (err) {
            logger.error({
              event: 'ws_session_init_error',
              candidato_id: candidatoId,
              err:   err.message,
            });
            ws.close();
          }
          break;
        }

        // ── Inbound audio frame ─────────────────────────────────────────────
        case 'media': {
          if (session && msg.media?.track === 'inbound' && msg.media?.payload) {
            session.handleAudioChunk(msg.media.payload);
          }
          break;
        }

        // ── Stream ended by Twilio ──────────────────────────────────────────
        case 'stop':
          logger.info({ event: 'ws_stream_stop', stream_sid: streamSid });
          if (session && !session.ended) session.end();
          break;

        default:
          break;
      }
    });

    // ── Connection closed ───────────────────────────────────────────────────
    ws.on('close', (code, reason) => {
      logger.info({
        event:        'ws_close',
        candidato_id: candidatoId,
        code,
        reason:       reason?.toString(),
      });
      if (session && !session.ended) session.end();
      session = null;
    });

    // ── WS error ────────────────────────────────────────────────────────────
    ws.on('error', (err) => {
      logger.error({ event: 'ws_error', candidato_id: candidatoId, err: err.message });
    });
  });

  logger.info({ event: 'ws_server_ready', path: '/ws/twilio-media' }, 'Twilio Media Streams WS ready');
  return wss;
}

module.exports = { setupWebSocketServer };
