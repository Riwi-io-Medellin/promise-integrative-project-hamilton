/**
 * src/services/voiceAgent/audioUtils.js
 * Low-level audio helpers:
 *   - µ-law ↔ PCM-16 codec (ITU-T G.711)
 *   - PCM-16 → WAV file buffer
 *   - RMS energy computation (for silence detection)
 */
'use strict';

// ── µ-law codec ──────────────────────────────────────────────────────────────

/**
 * ITU-T G.711 exponent-to-magnitude lookup table.
 * Entry i is the linear base value for exponent segment i.
 */
const MULAW_EXP_LUT = [0, 132, 396, 924, 1980, 4092, 8316, 16764];

/**
 * Decode a single µ-law byte to a 16-bit signed PCM sample.
 * Reference: ITU-T G.711 §4.4 / G.191 reference implementation.
 *
 * @param {number} byte – unsigned 8-bit µ-law value (0–255)
 * @returns {number} 16-bit signed PCM sample
 */
function mulawToLinear(byte) {
  // Invert all bits per G.711 spec
  byte = (~byte) & 0xFF;
  const sign      = byte & 0x80;
  const exponent  = (byte >> 4) & 0x07;
  const mantissa  = byte & 0x0F;
  // magnitude = base[exponent] + mantissa shifted by (exponent + 3)
  const magnitude = MULAW_EXP_LUT[exponent] + (mantissa << (exponent + 3));
  return sign ? -magnitude : magnitude;
}

/**
 * Encode a 16-bit signed PCM sample to a µ-law byte.
 * Reference: ITU-T G.711 / Sun Microsystems reference implementation.
 *
 * @param {number} sample – 16-bit signed PCM value
 * @returns {number} unsigned 8-bit µ-law value
 */
function linearToMulaw(sample) {
  const BIAS  = 0x84;   // 132
  const CLIP  = 32635;
  let sign = 0;

  if (sample < 0) {
    sample = -sample;
    sign = 0x80;
  }
  if (sample > CLIP) sample = CLIP;
  sample += BIAS;

  let exponent = 7;
  for (let mask = 0x4000; (sample & mask) === 0 && exponent > 0; exponent--, mask >>= 1) {}

  const mantissa = (sample >> (exponent + 3)) & 0x0F;
  return (~(sign | (exponent << 4) | mantissa)) & 0xFF;
}

// ── Buffer converters ────────────────────────────────────────────────────────

/**
 * Decode a µ-law Buffer to a PCM-16 LE Buffer.
 *
 * @param {Buffer} mulawBuf
 * @returns {Buffer} PCM-16 little-endian samples
 */
function mulawToPcm16(mulawBuf) {
  const out = Buffer.alloc(mulawBuf.length * 2);
  for (let i = 0; i < mulawBuf.length; i++) {
    out.writeInt16LE(mulawToLinear(mulawBuf[i]), i * 2);
  }
  return out;
}

/**
 * Encode a PCM-16 LE Buffer to a µ-law Buffer.
 *
 * @param {Buffer} pcmBuf – Int16 LE samples
 * @returns {Buffer} µ-law bytes
 */
function pcm16ToMulaw(pcmBuf) {
  const out = Buffer.alloc(pcmBuf.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = linearToMulaw(pcmBuf.readInt16LE(i * 2));
  }
  return out;
}

// ── WAV builder ──────────────────────────────────────────────────────────────

/**
 * Wrap a raw PCM-16 LE buffer in a RIFF/WAV container.
 *
 * @param {Buffer} pcm16     – Raw Int16 LE audio samples
 * @param {number} sampleRate – Samples per second (default 8 000)
 * @param {number} channels   – Number of channels (default 1)
 * @returns {Buffer} Complete WAV file
 */
function pcm16ToWav(pcm16, sampleRate = 8000, channels = 1) {
  const bitsPerSample = 16;
  const byteRate      = (sampleRate * channels * bitsPerSample) / 8;
  const blockAlign    = (channels * bitsPerSample) / 8;
  const dataLen       = pcm16.length;

  const header = Buffer.alloc(44);

  // RIFF chunk descriptor
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + dataLen, 4);
  header.write('WAVE', 8, 'ascii');

  // fmt sub-chunk
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);            // sub-chunk size
  header.writeUInt16LE(1, 20);             // AudioFormat = PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);

  // data sub-chunk
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataLen, 40);

  return Buffer.concat([header, pcm16]);
}

// ── Silence detection ────────────────────────────────────────────────────────

/**
 * Compute RMS energy of a µ-law buffer.
 * Returns a value in the range 0–32 768.
 *
 * @param {Buffer} mulawBuf
 * @returns {number}
 */
function computeRmsEnergy(mulawBuf) {
  if (!mulawBuf || mulawBuf.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < mulawBuf.length; i++) {
    const s = mulawToLinear(mulawBuf[i]);
    sum += s * s;
  }
  return Math.sqrt(sum / mulawBuf.length);
}

module.exports = {
  mulawToLinear,
  linearToMulaw,
  mulawToPcm16,
  pcm16ToMulaw,
  pcm16ToWav,
  computeRmsEnergy,
};
