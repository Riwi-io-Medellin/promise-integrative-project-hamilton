# SofIA – Twilio Media Streams Voice Agent

This document explains the new in-house voice agent that replaces the
ElevenLabs "agent" intermediary.

---

## Architecture

```
Twilio Voice (outbound)
        │
        ▼
  TwiML endpoint  ──► /twilio/twiml
        │
        ▼
  WebSocket  ──► /ws/twilio-media
        │
        ├── Inbound µ-law audio → OpenAI Whisper (STT)
        │                              │
        │                              ▼
        │                    OpenAI GPT-4o (LLM + tool calling)
        │                              │
        └── Outbound µ-law audio ◄── ElevenLabs TTS (ulaw_8000)

On tool call `agendar_cita`:
  └── processWebhookResult() → PostgreSQL
        └── (9 failed attempts) → WhatsApp chatbot trigger (existing module)
```

---

## Quick Start (Development)

### 1. Install dependencies

```bash
npm install
```

### 2. Set environment variables

```bash
cp .env.example .env
# Edit .env with your actual values
```

Required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase PostgreSQL connection string |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token |
| `TWILIO_FROM_NUMBER` | Twilio outbound phone number (e.g. `+12025551234`) |
| `OPENAI_API_KEY` | OpenAI API key (for Whisper STT + GPT-4o LLM) |
| `ELEVENLABS_API_KEY` | ElevenLabs API key (TTS only) |
| `BASE_URL` | Your public HTTPS base URL (ngrok in dev) |

Optional:

| Variable | Default | Description |
|---|---|---|
| `OPENAI_MODEL` | `gpt-4o` | LLM model |
| `ELEVENLABS_VOICE_ID` | `21m00Tcm4TlvDq8ikWAM` | ElevenLabs voice (Rachel) |
| `ELEVENLABS_MODEL_ID` | `eleven_turbo_v2` | ElevenLabs TTS model |
| `ELEVENLABS_STABILITY` | `0.5` | Voice stability |
| `ELEVENLABS_SIMILARITY_BOOST` | `0.75` | Voice similarity boost |
| `CHATBOT_WEBHOOK_URL` | — | WhatsApp chatbot partner webhook |

### 3. Start the server

```bash
npm run dev        # development (auto-restart)
npm start          # production
```

### 4. Expose via ngrok

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g. `https://abc123.ngrok-free.app`) and set it in `.env`:

```
BASE_URL=https://abc123.ngrok-free.app
```

### 5. Configure Twilio

In the [Twilio Console](https://console.twilio.com):

- No extra webhook configuration is needed for outbound calls – SofIA passes
  the TwiML and status-callback URLs programmatically when initiating each call.

### 6. Initiate a test call

```bash
curl -X POST http://localhost:3000/api/agent/call \
  -H "Content-Type: application/json" \
  -d '{"candidato_id": "<uuid>"}'
```

Response:

```json
{ "success": true, "callSid": "CA...", "llamadaId": 42 }
```

### 7. Check agent configuration

```bash
curl http://localhost:3000/api/agent/info
```

---

## API Endpoints

### New endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/agent/call` | Initiate an outbound call to a candidate |
| `GET` | `/api/agent/info` | Show current agent configuration |
| `POST` | `/twilio/twiml` | TwiML endpoint (called by Twilio on answer) |
| `POST` | `/twilio/status` | Twilio status callback (lifecycle events) |
| `WS` | `/ws/twilio-media` | Twilio Media Streams bidirectional audio |

### Existing endpoints (unchanged)

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check + DB connectivity |
| `POST` | `/webhook/elevenlabs-resultado` | Legacy ElevenLabs webhook (still works) |
| `POST` | `/api/chatbot/webhook` | WhatsApp chatbot result callback |
| `POST` | `/api/chatbot/trigger-manual` | Manual chatbot trigger |

---

## Module Structure

```
src/
  routes/
    agent.js              ← NEW: /api/agent/*
    twilio.js             ← NEW: /twilio/*
    webhook.js            (unchanged)
    health.js             (unchanged)
  services/
    twilio/
      twilioClient.js     ← NEW: Twilio SDK singleton
      callService.js      ← NEW: Outbound call initiation + state
    openai/
      sttService.js       ← NEW: OpenAI Whisper STT
      llmService.js       ← NEW: GPT-4o LLM + agendar_cita tool
    elevenlabs/
      ttsService.js       ← NEW: ElevenLabs TTS (ulaw_8000)
    voiceAgent/
      audioUtils.js       ← NEW: µ-law ↔ PCM-16, WAV builder, RMS
      agentSession.js     ← NEW: Per-call session orchestrator
    webhook/
      webhookService.js   (unchanged)
  ws/
    twilioMediaStream.js  ← NEW: WebSocket handler
chatbot/                  (unchanged)
```

---

## Business Logic

### Call attempt counting

Every call that does not result in a terminal status (`AGENDADO`,
`DESCARTADO`, `NUM_INVALIDO`) increments `candidatos.intentos_llamada`.

When a candidate reaches **9 `NO_CONTESTA` calls in one day** the existing
`processCandidateCallFail()` function triggers the WhatsApp chatbot fallback
automatically.

### Agent result → DB mapping

| Agent `resultado` | Internal `resultado` | Notes |
|---|---|---|
| `AGENDADO` | `AGENDADO` | Sets `evento_asignado_id`, `dia`, `hora` |
| `PENDIENTE` | `OCUPADO` | Preserves retry; optionally sets `hora_callback` |
| `NO_INTERESADO` | `DESCARTADO` | Stops further attempts |
| `NUMERO_INCORRECTO` | `NUM_INVALIDO` | Stops further attempts |
| `BUZON_VOZ` | `NO_CONTESTA` | Counts toward 9-attempt trigger |

### Unanswered calls (Twilio status callback)

If Twilio reports `busy`, `no-answer`, or `failed` (call never answered),
the status callback at `/twilio/status` writes the result to the DB so
attempt counters advance toward the WhatsApp fallback.

---

## Customising the Agent Personality

The Sofia system prompt lives in:

```
src/services/openai/llmService.js  →  buildSystemPrompt()
```

Edit `buildSystemPrompt()` to change:
- Name / institution
- Tone / script
- Available hours (these are dynamically injected per call from the DB)
- Railguard rules

The `TOOLS` array in the same file defines the `agendar_cita` function
schema. Add or modify parameters there if needed.

---

## Audio Pipeline Details

- **Twilio → backend**: µ-law 8 000 Hz, mono, 160-byte frames (~20 ms each)
- **Backend → Whisper**: µ-law decoded to PCM-16 then wrapped in a WAV header
- **ElevenLabs → Twilio**: `output_format=ulaw_8000` – no re-encoding needed

Silence detection uses a simple RMS energy threshold per frame.
Speech is accumulated until a configurable silence window is reached, then
the buffer is flushed to Whisper.

Constants (in `agentSession.js`):

| Constant | Default | Description |
|---|---|---|
| `SILENCE_THRESHOLD` | `300` | RMS energy below = silent frame |
| `SILENCE_FRAMES_NEEDED` | `50` | Consecutive silent frames to trigger STT (~1 s) |
| `MIN_VOICED_FRAMES` | `5` | Min voiced frames before sending to STT |
| `MAX_RECORDING_SECS` | `20` | Force-flush after this many seconds |
| `MAX_NO_PROGRESS_TURNS` | `2` | Anti-loop: auto-PENDIENTE after N stalled turns |
| `MAX_TOTAL_TURNS` | `20` | Hard turn limit per call |
