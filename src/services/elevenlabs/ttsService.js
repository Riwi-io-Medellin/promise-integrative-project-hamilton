/**
 * src/services/elevenlabs/ttsService.js
 * Text-to-speech using ElevenLabs API.
 *
 * Returns raw µ-law audio at 8 000 Hz (ulaw_8000) so it can be sent
 * directly to Twilio Media Streams without any re-encoding.
 */
'use strict';

const axios  = require('axios');
const logger = require('../../utils/logger');

const BASE_URL    = 'https://api.elevenlabs.io/v1/text-to-speech';
const OUT_FORMAT  = 'ulaw_8000';

/**
 * Convert text to speech and return a raw µ-law audio Buffer.
 *
 * @param {string} text – Text to synthesize
 * @returns {Promise<Buffer>} Raw µ-law audio bytes at 8 000 Hz mono
 */
async function synthesizeSpeech(text) {
  const apiKey  = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel (default)
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_turbo_v2';

  if (!apiKey) throw new Error('Missing ELEVENLABS_API_KEY env var');

  const url = `${BASE_URL}/${voiceId}`;

  logger.info({ event: 'tts_request', voice_id: voiceId, model_id: modelId, text_length: text.length });

  const response = await axios.post(
    url,
    {
      text,
      model_id: modelId,
      voice_settings: {
        stability:        Number(process.env.ELEVENLABS_STABILITY        ?? 0.5),
        similarity_boost: Number(process.env.ELEVENLABS_SIMILARITY_BOOST ?? 0.75),
        style:            0.0,
        use_speaker_boost: true,
      },
    },
    {
      headers: {
        'xi-api-key':   apiKey,
        'Content-Type': 'application/json',
        Accept:         'audio/basic',
      },
      params:       { output_format: OUT_FORMAT },
      responseType: 'arraybuffer',
      timeout:      20_000,
    },
  );

  const buf = Buffer.from(response.data);
  logger.info({ event: 'tts_complete', bytes: buf.length });
  return buf;
}

module.exports = { synthesizeSpeech };
