/**
 * src/services/openai/sttService.js
 * Speech-to-text using OpenAI Whisper API.
 * Accepts a WAV-format audio Buffer and returns a Spanish transcript string.
 */
'use strict';

const { OpenAI, toFile } = require('openai');
const logger = require('../../utils/logger');

/**
 * Minimum transcript character length to be considered valid.
 * Very short transcripts (1 char) are typically noise artefacts.
 */
const MIN_TRANSCRIPT_LENGTH = 2;

let _openai = null;

function getOpenAI() {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY env var');
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

/**
 * Transcribe audio using OpenAI Whisper.
 *
 * @param {Buffer} wavBuffer – PCM audio packaged as a WAV file
 * @returns {Promise<string>} Spanish transcript (empty string if silent/inaudible)
 */
async function transcribeAudio(wavBuffer) {
  const openai = getOpenAI();

  const file = await toFile(wavBuffer, 'audio.wav', { type: 'audio/wav' });

  const response = await openai.audio.transcriptions.create({
    file,
    model:           'whisper-1',
    language:        'es',
    response_format: 'verbose_json',
  });

  const text = response.text?.trim() ?? '';

  logger.info(
    { event: 'stt_transcript', length: text.length, no_speech_prob: response.segments?.[0]?.no_speech_prob },
    'Whisper transcription completed',
  );

  // Filter out obvious non-speech or very low confidence
  if (!text || text.length < MIN_TRANSCRIPT_LENGTH) return '';

  return text;
}

module.exports = { transcribeAudio };
