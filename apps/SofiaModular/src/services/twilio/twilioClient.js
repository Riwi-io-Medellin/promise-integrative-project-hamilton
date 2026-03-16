/**
 * src/services/twilio/twilioClient.js
 * Initialises and exports a singleton Twilio REST client.
 */
'use strict';

const twilio = require('twilio');
const logger = require('../../utils/logger');

let _client = null;

function getTwilioClient() {
  if (_client) return _client;

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken  = process.env.TWILIO_AUTH_TOKEN;

  if (!accountSid || !authToken) {
    throw new Error('Missing required env vars: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN');
  }

  _client = twilio(accountSid, authToken);
  logger.info({ event: 'twilio_client_init' }, 'Twilio client initialised');
  return _client;
}

module.exports = { getTwilioClient };
