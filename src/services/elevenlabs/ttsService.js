/**
 * src/services/elevenlabs/ttsService.js
 * Text-to-speech using ElevenLabs API.
 *
 * Streams raw µ-law audio at 8 000 Hz (ulaw_8000) so it can be sent
 * directly to Twilio Media Streams without any re-encoding.
 */
'use strict';

const axios  = require('axios');
const logger = require('../../utils/logger');

const BASE_URL    = 'https://api.elevenlabs.io/v1/text-to-speech';
const OUT_FORMAT  = 'ulaw_8000';
const TWILIO_FRAME_BYTES = 160;

function buildTtsRequest(text) {
  return {
    text,
    model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5',
    language_code: process.env.ELEVENLABS_LANGUAGE_CODE || 'es',
    voice_settings: {
      stability:        Number(process.env.ELEVENLABS_STABILITY        ?? 0.5),
      similarity_boost: Number(process.env.ELEVENLABS_SIMILARITY_BOOST ?? 0.75),
      style:            0.0,
      use_speaker_boost: true,
    },
  };
}

/**
 * Stream text to speech and forward µ-law frames as they arrive.
 *
 * @param {string} text – Text to synthesize
 * @param {{ onChunk: (chunk: Buffer) => void }} opts
 * @returns {Promise<{ bytes: number, firstChunkMs: number|null }>}
 */
async function streamSpeech(text, opts = {}) {
  const apiKey  = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM'; // Rachel (default)
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5';
  const onChunk = typeof opts.onChunk === 'function' ? opts.onChunk : () => {};

  if (!apiKey) throw new Error('Missing ELEVENLABS_API_KEY env var');

  const url = `${BASE_URL}/${voiceId}/stream`;
  const startedAt = Date.now();

  logger.info({ event: 'tts_request', voice_id: voiceId, model_id: modelId, text_length: text.length });

  const response = await axios.post(
    url,
    buildTtsRequest(text),
    {
      headers: {
        'xi-api-key':   apiKey,
        'Content-Type': 'application/json',
        Accept:         'audio/basic',
      },
      params: {
        output_format: OUT_FORMAT,
        optimize_streaming_latency: Number(process.env.ELEVENLABS_STREAM_OPTIMIZE ?? 3),
      },
      responseType: 'stream',
      timeout:      20_000,
    },
  );

  return await new Promise((resolve, reject) => {
    let pending = Buffer.alloc(0);
    let totalBytes = 0;
    let firstChunkMs = null;

    response.data.on('data', (chunk) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      if (!buf.length) return;

      totalBytes += buf.length;
      pending = Buffer.concat([pending, buf]);

      if (firstChunkMs === null) {
        firstChunkMs = Date.now() - startedAt;
        logger.info({
          event: 'tts_first_chunk',
          voice_id: voiceId,
          model_id: modelId,
          first_chunk_ms: firstChunkMs,
        });
      }

      while (pending.length >= TWILIO_FRAME_BYTES) {
        onChunk(pending.subarray(0, TWILIO_FRAME_BYTES));
        pending = pending.subarray(TWILIO_FRAME_BYTES);
      }
    });

    response.data.on('end', () => {
      if (pending.length > 0) {
        onChunk(pending);
      }

      logger.info({
        event: 'tts_complete',
        bytes: totalBytes,
        streamed: true,
      });
      resolve({ bytes: totalBytes, firstChunkMs });
    });

    response.data.on('error', (err) => {
      reject(err);
    });
  });
}

module.exports = { streamSpeech };
