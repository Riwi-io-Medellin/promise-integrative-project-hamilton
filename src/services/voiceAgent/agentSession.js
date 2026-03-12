/**
 * src/services/voiceAgent/agentSession.js
 *
 * Manages a single live call session.
 *
 * Pipeline per utterance:
 *   Twilio audio (µ-law 8 kHz) →
 *   Silence detection →
 *   OpenAI Whisper STT →
 *   OpenAI GPT-4o LLM (tool calling) →
 *   ElevenLabs TTS (µ-law 8 kHz) →
 *   back to Twilio
 *
 * Railguards
 *   - After MAX_NO_PROGRESS_TURNS turns without scheduling progress,
 *     auto-registers PENDIENTE and ends the call.
 *   - MAX_TOTAL_TURNS hard-stops runaway conversations.
 */
'use strict';

const EventEmitter = require('events');

const { transcribeAudio }     = require('../openai/sttService');
const { processMessage }      = require('../openai/llmService');
const { synthesizeSpeech }    = require('../elevenlabs/ttsService');
const { mulawToPcm16, pcm16ToWav, computeRmsEnergy } = require('./audioUtils');
const { processWebhookResult } = require('../webhook/webhookService');
const logger                  = require('../../utils/logger');

// ── Silence / VAD constants ───────────────────────────────────────────────────
/** RMS energy (0–32 768) below which a frame is considered silent */
const SILENCE_THRESHOLD = 300;
/** Consecutive silent 20-ms frames needed to trigger processing (~1.0 s) */
const SILENCE_FRAMES_NEEDED = 50;
/** Minimum voiced frames required before we attempt STT (filters spurious noise) */
const MIN_VOICED_FRAMES = 5;
/** Absolute max recording time in seconds before forced processing */
const MAX_RECORDING_SECS = 20;
/** ~50 Twilio frames per second at 8 kHz / 160 bytes per frame */
const FRAMES_PER_SEC = 50;

// ── Conversation limits ───────────────────────────────────────────────────────
const MAX_NO_PROGRESS_TURNS = 2;
const MAX_TOTAL_TURNS       = 20;

// ── Agent resultado → internal webhook resultado ──────────────────────────────
const RESULTADO_MAP = {
  AGENDADO:          'AGENDADO',
  PENDIENTE:         'OCUPADO',
  NO_INTERESADO:     'DESCARTADO',
  NUMERO_INCORRECTO: 'NUM_INVALIDO',
  BUZON_VOZ:         'NO_CONTESTA',
};

// ── Progress keywords (any match = a "progress" turn, resetting the anti-loop counter) ──
// These Spanish root fragments match: agendar, agendado, horario, confirmación, cita,
// disponible, reunión, perfecto, encantada/o – all words indicating forward momentum.
const PROGRESS_RE = /\bagend|horario|confirm|cita|disponible|reuni[oó]n|perfecto|encantad/i;

/**
 * @class AgentSession
 * @extends EventEmitter
 *
 * Emits:
 *   'session_ended'  { resultado: string }  – when the call outcome is decided
 */
class AgentSession extends EventEmitter {
  /**
   * @param {object} opts
   * @param {string}   opts.candidatoId
   * @param {string}   opts.candidatoNombre
   * @param {Array}    opts.eventosDisponibles  – [{ fecha_legible, evento_id }]
   */
  constructor(opts) {
    super();
    this.candidatoId        = opts.candidatoId;
    this.candidatoNombre    = opts.candidatoNombre    || 'candidato';
    this.eventosDisponibles = opts.eventosDisponibles || [];

    this.streamSid    = null;
    this._sendAudio   = null;   // (base64: string) => void  – injected by WS handler

    this.history      = [];
    this._audioBuf    = Buffer.alloc(0);
    this._silentCnt   = 0;
    this._voicedCnt   = 0;
    this._isListening = false;
    this._isSpeaking  = false;
    this._processing  = false;
    this.ended        = false;

    this._noProgressTurns = 0;
    this._totalTurns      = 0;
  }

  // ── Public setters ──────────────────────────────────────────────────────────

  /** Inject the function that sends base64 µ-law audio back to Twilio */
  setSendAudio(fn) { this._sendAudio = fn; }

  setStreamSid(sid) { this.streamSid = sid; }

  // ── Lifecycle ───────────────────────────────────────────────────────────────

  /**
   * Called when the Media Stream is established.
   * Plays the opening greeting and starts listening.
   */
  async start() {
    logger.info({ event: 'agent_session_start', candidato_id: this.candidatoId });
    const greeting =
      `Hola, ¿hablo con ${this.candidatoNombre}? Soy Sofía, Coordinadora de Admisiones. `
      + 'Le llamo para agendar su cita de orientación. ¿Tiene un momento?';

    this.history.push({ role: 'assistant', content: greeting });
    await this._speak(greeting);
    this._isListening = true;
  }

  /**
   * Feed a raw inbound audio chunk from Twilio (base64-encoded µ-law 8 kHz).
   * @param {string} base64Payload
   */
  handleAudioChunk(base64Payload) {
    if (this.ended || this._isSpeaking || this._processing) return;
    if (!this._isListening) return;

    const chunk  = Buffer.from(base64Payload, 'base64');
    const energy = computeRmsEnergy(chunk);

    if (energy > SILENCE_THRESHOLD) {
      this._voicedCnt++;
      this._silentCnt = 0;
      this._audioBuf  = Buffer.concat([this._audioBuf, chunk]);
    } else {
      if (this._voicedCnt > 0) {
        this._silentCnt++;
        this._audioBuf = Buffer.concat([this._audioBuf, chunk]);
      }
    }

    const totalFrames = this._audioBuf.length / 160;
    const enoughSilence =
      this._silentCnt >= SILENCE_FRAMES_NEEDED && this._voicedCnt >= MIN_VOICED_FRAMES;
    const tooLong = totalFrames > MAX_RECORDING_SECS * FRAMES_PER_SEC;

    if (enoughSilence || tooLong) {
      this._triggerProcessing();
    }
  }

  /** Force-end the session (called when Twilio stream closes unexpectedly) */
  end() {
    if (this.ended) return;
    this.ended = true;
    logger.info({ event: 'agent_session_force_end', candidato_id: this.candidatoId });
    this.emit('session_ended', { resultado: 'CALL_ENDED' });
  }

  // ── Internal pipeline ───────────────────────────────────────────────────────

  _triggerProcessing() {
    if (this._processing || this.ended) return;
    const audio    = this._audioBuf;
    this._audioBuf = Buffer.alloc(0);
    this._silentCnt = 0;
    this._voicedCnt = 0;
    this._isListening = false;
    this._processing  = true;

    this._processUtterance(audio).finally(() => {
      this._processing = false;
    });
  }

  async _processUtterance(mulawAudio) {
    if (this.ended) return;

    // ── STT ──────────────────────────────────────────────────────────────────
    let transcript = '';
    try {
      const pcm16 = mulawToPcm16(mulawAudio);
      const wav   = pcm16ToWav(pcm16, 8000, 1);
      transcript  = await transcribeAudio(wav);
    } catch (err) {
      logger.error({ event: 'stt_error', candidato_id: this.candidatoId, err: err.message });
      this._isListening = true;
      return;
    }

    if (!transcript) {
      logger.info({ event: 'empty_transcript', candidato_id: this.candidatoId });
      this._isListening = true;
      return;
    }

    logger.info({ event: 'user_utterance', candidato_id: this.candidatoId, text: transcript });
    this.history.push({ role: 'user', content: transcript });
    this._totalTurns++;

    // ── Hard turn limit ───────────────────────────────────────────────────────
    if (this._totalTurns > MAX_TOTAL_TURNS) {
      logger.warn({ event: 'max_turns_reached', candidato_id: this.candidatoId });
      await this._finalizeCall({ resultado: 'PENDIENTE', nota: 'Límite de turnos alcanzado' });
      return;
    }

    // ── LLM ──────────────────────────────────────────────────────────────────
    let text, toolCall, updatedHistory;
    try {
      ({ text, toolCall, updatedHistory } = await processMessage(this.history, {
        candidatoNombre:    this.candidatoNombre,
        eventosDisponibles: this.eventosDisponibles,
      }));
      this.history = updatedHistory;
    } catch (err) {
      logger.error({ event: 'llm_error', candidato_id: this.candidatoId, err: err.message });
      this._isListening = true;
      return;
    }

    // ── Tool call: agendar_cita ───────────────────────────────────────────────
    if (toolCall && toolCall.name === 'agendar_cita') {
      await this._finalizeCall(toolCall.args);
      return;
    }

    // ── Progress tracking (anti-loop) ─────────────────────────────────────────
    if (PROGRESS_RE.test(text)) {
      this._noProgressTurns = 0;
    } else {
      this._noProgressTurns++;
    }

    if (this._noProgressTurns >= MAX_NO_PROGRESS_TURNS) {
      logger.info({ event: 'anti_loop', candidato_id: this.candidatoId });
      await this._finalizeCall({
        resultado: 'PENDIENTE',
        nota: 'Sin progreso en la conversación – activando fallback WhatsApp',
      });
      return;
    }

    // ── Speak and keep listening ──────────────────────────────────────────────
    if (text) {
      await this._speak(text);
    }
    this._isListening = true;
  }

  // ── Call finalisation ───────────────────────────────────────────────────────

  /**
   * Map agent resultado to internal code, update DB, speak goodbye.
   * @param {{ resultado, evento_id?, dia?, hora?, nota?, hora_callback? }} args
   */
  async _finalizeCall(args) {
    if (this.ended) return;
    this.ended = true;

    const internalResultado = RESULTADO_MAP[args.resultado] || 'OCUPADO';

    logger.info({
      event:        'call_finalize',
      candidato_id: this.candidatoId,
      agent_result: args.resultado,
      internal:     internalResultado,
    });

    // ── Persist to DB via existing webhook logic ──────────────────────────────
    try {
      await processWebhookResult({
        candidato_id: this.candidatoId,
        resultado:    internalResultado,
        evento_id:    args.evento_id   ?? null,
        dia:          args.dia         ?? null,
        hora:         args.hora        ?? null,
        nota:         args.nota        ?? null,
        hora_callback: args.hora_callback ?? null,
      });
    } catch (err) {
      logger.error({ event: 'finalize_db_error', candidato_id: this.candidatoId, err: err.message });
    }

    // ── Goodbye utterance ─────────────────────────────────────────────────────
    const goodbye = this._buildGoodbye(args.resultado);
    await this._speak(goodbye);

    this.emit('session_ended', { resultado: internalResultado });
  }

  _buildGoodbye(agentResultado) {
    const nombre = this.candidatoNombre;
    switch (agentResultado) {
      case 'AGENDADO':
        return `Perfecto, ${nombre}. Su cita ha sido agendada. Le llegará una confirmación. ¡Hasta pronto!`;
      case 'NO_INTERESADO':
        return `Entiendo, ${nombre}. Gracias por su tiempo. ¡Que tenga un buen día!`;
      case 'NUMERO_INCORRECTO':
        return 'Disculpe la confusión. ¡Hasta pronto!';
      default:
        return `Muy bien, ${nombre}. Le contactaremos nuevamente. ¡Hasta pronto!`;
    }
  }

  // ── TTS helper ──────────────────────────────────────────────────────────────

  /**
   * Synthesise `text` and stream the µ-law audio back to Twilio in 160-byte chunks.
   * @param {string} text
   */
  async _speak(text) {
    if (!this._sendAudio || !text) return;
    this._isSpeaking = true;
    try {
      const audio     = await synthesizeSpeech(text);
      const chunkSize = 160; // 20 ms at 8 kHz mono µ-law
      for (let i = 0; i < audio.length; i += chunkSize) {
        const slice = audio.subarray(i, i + chunkSize);
        this._sendAudio(slice.toString('base64'));
      }
    } catch (err) {
      logger.error({ event: 'speak_error', candidato_id: this.candidatoId, err: err.message });
    } finally {
      this._isSpeaking = false;
    }
  }
}

module.exports = { AgentSession };
