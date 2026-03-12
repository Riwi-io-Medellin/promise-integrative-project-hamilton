/**
 * index.js – SofIA entry point
 */
'use strict';

require('dotenv').config();

const http    = require('http');
const app     = require('./src/app');
const { setupWebSocketServer } = require('./src/ws/twilioMediaStream');
const logger  = require('./src/utils/logger');

const PORT = process.env.PORT || 3000;

async function main() {
  // Create a plain HTTP server so we can share it with the WS server
  const server = http.createServer(app);

  // Attach Twilio Media Streams WebSocket server at /ws/twilio-media
  setupWebSocketServer(server);

  await new Promise((resolve) => {
    server.listen(PORT, () => {
      logger.info({ event: 'server_started', port: PORT }, `HTTP server listening on :${PORT}`);
      resolve();
    });
  });

  logger.info({ event: 'sofia_ready' }, '✅ SofIA Voice Agent Service is running');
}

main().catch((err) => {
  logger.error({ event: 'fatal_startup_error', err: err.message }, 'Failed to start SofIA');
  process.exit(1);
});
