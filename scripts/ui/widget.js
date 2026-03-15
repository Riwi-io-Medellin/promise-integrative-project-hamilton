import { Conversation } from "@11labs/client";

const MAX_MESSAGES = 10;

/* ════════════════════════════════════════
   VOICE RIPPLE VISUALIZER
   Concentric rings that expand from a glowing core.
   Reacts to the agent's audio via Web Audio API;
   falls back to a simulated speech envelope.
════════════════════════════════════════ */
class VoiceWaveVisualizer {
  constructor(canvas) {
    this.canvas   = canvas;
    this.ctx      = canvas.getContext("2d");
    this.phase    = 0;
    this.amp      = 0;
    this.speaking = false;
    this.rafId    = null;
    this._kick    = 0;   // burst on speaking start, decays quickly

    /* Audio analysis */
    this._audioCtx  = null;
    this._analyser  = null;
    this._dataArray = null;
    this._connected = false;
    this._observer  = null;
  }

  initAudio() {
    try {
      this._audioCtx = new AudioContext();
      this._analyser = this._audioCtx.createAnalyser();
      this._analyser.fftSize = 128;
      this._analyser.smoothingTimeConstant = 0.80;
      this._dataArray = new Uint8Array(this._analyser.frequencyBinCount);
      this._watchAudio();
    } catch (_) { /* AudioContext unavailable */ }
  }

  _watchAudio() {
    this._tryConnect();
    this._observer = new MutationObserver(() => this._tryConnect());
    this._observer.observe(document.body, { childList: true, subtree: true });
  }

  _tryConnect() {
    if (this._connected || !this._audioCtx) return;
    for (const el of document.querySelectorAll("audio")) {
      if (el._wvDone) continue;
      try {
        const src = this._audioCtx.createMediaElementSource(el);
        src.connect(this._analyser);
        this._analyser.connect(this._audioCtx.destination);
        el._wvDone      = true;
        this._connected = true;
        this._audioCtx.resume().catch(() => {});
        break;
      } catch (_) { el._wvDone = true; }
    }
  }

  _level() {
    if (this._analyser && this._connected) {
      this._analyser.getByteFrequencyData(this._dataArray);
      let s = 0;
      for (let i = 0; i < this._dataArray.length; i++) s += this._dataArray[i];
      return s / (this._dataArray.length * 255);
    }
    /* Simulated speech: envelope + harmonic variation + noise */
    if (!this.speaking) return 0.02;
    const t = performance.now() / 1000;
    const env  = 0.38 + 0.20 * Math.sin(t * 2.1);
    const harm = 0.17 * Math.sin(t * 8.6) + 0.11 * Math.sin(t * 14.3);
    const noise = 0.06 * (Math.random() - 0.5);
    return Math.max(0.05, env + harm + noise);
  }

  setSpeaking(val) {
    const prev = this.speaking;
    this.speaking = Boolean(val);
    /* Surge on speaking start for immediate visual feedback */
    if (!prev && this.speaking) this._kick = 0.55;
  }

  start() {
    if (this.rafId) return;
    const draw = () => {
      this.rafId = requestAnimationFrame(draw);

      /* Sync canvas pixel dimensions */
      const dpr = window.devicePixelRatio || 1;
      const cw  = Math.round(this.canvas.offsetWidth  * dpr);
      const ch  = Math.round(this.canvas.offsetHeight * dpr);
      if (this.canvas.width !== cw || this.canvas.height !== ch) {
        this.canvas.width  = cw;
        this.canvas.height = ch;
      }
      if (!cw || !ch) return;

      const W   = this.canvas.width;
      const H   = this.canvas.height;
      const ctx = this.ctx;

      ctx.clearRect(0, 0, W, H);

      /* Decay the kick burst */
      this._kick *= 0.88;

      /* Smooth amplitude + add kick */
      const raw   = this._level() + this._kick;
      const lerpK = this.speaking ? 0.18 : 0.06;
      this.amp   += (raw - this.amp) * lerpK;
      const a = Math.min(this.amp, 1);

      /* Phase drives ring expansion speed */
      this.phase = (this.phase + 0.005 + a * 0.022) % 1;

      const cx      = W / 2;
      const cy      = H / 2;
      const minDim  = Math.min(W, H);
      const maxR    = minDim * 0.46;
      const coreR   = minDim * 0.07 + a * minDim * 0.048;

      /* ── Gold ripple rings ── */
      const RINGS = 5;
      for (let i = 0; i < RINGS; i++) {
        const t  = (this.phase + i / RINGS) % 1;
        const r  = coreR + t * maxR;
        const op = (1 - t) * (0.10 + a * 0.85);
        const lw = (1 - t) * (1.5 + a * 3.8);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(254,184,0,${op.toFixed(3)})`;
        ctx.lineWidth   = lw;
        ctx.stroke();
      }

      /* ── Amber secondary rings (offset phase) ── */
      for (let i = 0; i < RINGS - 1; i++) {
        const t  = (this.phase * 0.62 + 0.2 + i / (RINGS - 1)) % 1;
        const r  = coreR * 1.5 + t * maxR * 0.82;
        const op = (1 - t) * (0.06 + a * 0.46);
        const lw = (1 - t) * (1 + a * 2.2);
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255,105,40,${op.toFixed(3)})`;
        ctx.lineWidth   = lw;
        ctx.stroke();
      }

      /* ── Glow halo ── */
      const haloR = coreR * 2.4;
      const glow  = ctx.createRadialGradient(cx, cy, coreR * 0.4, cx, cy, haloR);
      glow.addColorStop(0,   `rgba(255,242,190,${(0.4 + a * 0.45).toFixed(3)})`);
      glow.addColorStop(0.5, `rgba(254,184,0,${(0.18 + a * 0.28).toFixed(3)})`);
      glow.addColorStop(1,   "rgba(150,20,20,0)");
      ctx.beginPath();
      ctx.arc(cx, cy, haloR, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();

      /* ── Core sphere ── */
      const cg = ctx.createRadialGradient(
        cx - coreR * 0.28, cy - coreR * 0.28, 0,
        cx, cy, coreR
      );
      cg.addColorStop(0,    "#fffce0");
      cg.addColorStop(0.45, "#ffc84a");
      cg.addColorStop(1,    "#8a1e1e");
      ctx.beginPath();
      ctx.arc(cx, cy, coreR, 0, Math.PI * 2);
      ctx.fillStyle = cg;
      ctx.fill();
    };
    draw();
  }

  stop() {
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }

  destroy() {
    this.stop();
    if (this._observer) { this._observer.disconnect();           this._observer  = null; }
    if (this._audioCtx) { this._audioCtx.close().catch(() => {}); this._audioCtx  = null; }
    this._analyser  = null;
    this._dataArray = null;
    this._connected = false;
  }
}

/* ════════════════════════════════════════ */

function normalizeConfig(userConfig = {}) {
  const envAgentId =
    import.meta.env.VITE_ELEVENLABS_AGENT_ID || import.meta.env.VITE_AGENT_ID || "";
  return {
    agentId: userConfig.agentId || envAgentId,
    title:   userConfig.title   || "Promi, agente asesor",
    logoSrc: userConfig.logoSrc || "./assets/brand/ISOLOGO-CLARO.png"
  };
}

export function initPromiseVoiceWidget(userConfig = {}) {
  if (document.querySelector("[data-promise-widget-root]")) return;

  const config = normalizeConfig(userConfig);

  /* ── Root ── */
  const root = document.createElement("aside");
  root.className = "promise-widget";
  root.dataset.promiseWidgetRoot = "true";
  root.dataset.widgetMode = "text";

  /* ── Panel ── */
  const panel = document.createElement("div");
  panel.className = "widget-panel";

  /* ── Header ── */
  const head = document.createElement("header");
  head.className = "widget-head";

  const headLogo = document.createElement("img");
  headLogo.className = "widget-head-logo";
  headLogo.src = config.logoSrc;
  headLogo.alt = "Promi";

  const headInfo = document.createElement("div");
  headInfo.className = "widget-head-info";

  const titleEl = document.createElement("strong");
  titleEl.className = "widget-title";
  titleEl.textContent = config.title;

  const statusEl = document.createElement("span");
  statusEl.className = "widget-status";
  statusEl.textContent = "Elige un modo para comenzar";

  headInfo.append(titleEl, statusEl);

  const closeBtn = document.createElement("button");
  closeBtn.className = "widget-close-btn";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Cerrar asistente");
  closeBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;

  head.append(headLogo, headInfo, closeBtn);

  /* ── Tabs ── */
  const tabs = document.createElement("div");
  tabs.className = "widget-tabs";

  const textTab = document.createElement("button");
  textTab.type = "button";
  textTab.className = "widget-tab active";
  textTab.dataset.mode = "text";
  textTab.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Texto`;

  const voiceTab = document.createElement("button");
  voiceTab.type = "button";
  voiceTab.className = "widget-tab";
  voiceTab.dataset.mode = "voice";
  voiceTab.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Voz`;

  tabs.append(textTab, voiceTab);

  /* ════════════════════════════════════════
     TEXT PANE
  ════════════════════════════════════════ */
  const textPane = document.createElement("div");
  textPane.className = "widget-pane widget-pane--text";

  const chat = document.createElement("div");
  chat.className = "widget-chat";
  chat.setAttribute("aria-live", "polite");

  const chatPlaceholder = document.createElement("div");
  chatPlaceholder.className = "widget-chat-placeholder";
  chatPlaceholder.innerHTML = `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <p>Inicia la conversación para chatear con Promi</p>`;
  chat.append(chatPlaceholder);

  const textFoot = document.createElement("div");
  textFoot.className = "widget-text-foot";

  const btnStartText = document.createElement("button");
  btnStartText.type = "button";
  btnStartText.className = "widget-primary-btn";
  btnStartText.textContent = "Iniciar chat";

  const textForm = document.createElement("form");
  textForm.className = "widget-form";
  textForm.hidden = true;

  const textInput = document.createElement("input");
  textInput.className = "widget-input";
  textInput.type = "text";
  textInput.name = "widgetPrompt";
  textInput.placeholder = "Escribe tu mensaje...";
  textInput.autocomplete = "off";

  const sendBtn = document.createElement("button");
  sendBtn.type = "submit";
  sendBtn.className = "widget-send-btn";
  sendBtn.setAttribute("aria-label", "Enviar mensaje");
  sendBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

  textForm.append(textInput, sendBtn);

  const btnStopText = document.createElement("button");
  btnStopText.type = "button";
  btnStopText.className = "widget-stop-btn";
  btnStopText.textContent = "Detener";
  btnStopText.hidden = true;

  textFoot.append(btnStartText, textForm, btnStopText);
  textPane.append(chat, textFoot);

  /* ════════════════════════════════════════
     VOICE PANE
  ════════════════════════════════════════ */
  const voicePane = document.createElement("div");
  voicePane.className = "widget-pane widget-pane--voice";
  voicePane.hidden = true;

  const voiceStage = document.createElement("div");
  voiceStage.className = "widget-voice-stage";
  voiceStage.setAttribute("aria-hidden", "true");

  const voiceCanvas = document.createElement("canvas");
  voiceCanvas.className = "voice-canvas";

  const voiceOverlay = document.createElement("div");
  voiceOverlay.className = "voice-overlay";

  const voiceCaption = document.createElement("p");
  voiceCaption.className = "voice-caption";
  voiceCaption.textContent = "Promi está lista para hablar contigo";

  voiceOverlay.append(voiceCaption);
  voiceStage.append(voiceCanvas, voiceOverlay);

  const voiceFoot = document.createElement("div");
  voiceFoot.className = "widget-voice-foot";

  const btnStartVoice = document.createElement("button");
  btnStartVoice.type = "button";
  btnStartVoice.className = "widget-primary-btn";
  btnStartVoice.textContent = "Iniciar conversación de voz";

  const voiceActiveControls = document.createElement("div");
  voiceActiveControls.className = "widget-voice-active-controls";
  voiceActiveControls.hidden = true;

  const btnMic = document.createElement("button");
  btnMic.type = "button";
  btnMic.className = "widget-action-btn";
  btnMic.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 10v2a7 7 0 01-14 0v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Silenciar`;

  const btnStopVoice = document.createElement("button");
  btnStopVoice.type = "button";
  btnStopVoice.className = "widget-action-btn widget-action-btn--danger";
  btnStopVoice.textContent = "Detener";

  voiceActiveControls.append(btnMic, btnStopVoice);
  voiceFoot.append(btnStartVoice, voiceActiveControls);
  voicePane.append(voiceStage, voiceFoot);

  /* ── Assemble panel ── */
  panel.append(head, tabs, textPane, voicePane);

  /* ════════════════════════════════════════
     LAUNCHER BUBBLE
  ════════════════════════════════════════ */
  const launcher = document.createElement("div");
  launcher.className = "widget-launcher";

  const launcherBadge = document.createElement("div");
  launcherBadge.className = "widget-launcher-badge";
  launcherBadge.textContent = "Habla con Promi";

  const toggleBtn = document.createElement("button");
  toggleBtn.className = "widget-toggle";
  toggleBtn.type = "button";
  toggleBtn.setAttribute("aria-label", "Abrir asistente Promi");
  toggleBtn.innerHTML = `
    <span class="toggle-ring toggle-ring-1"></span>
    <span class="toggle-ring toggle-ring-2"></span>
    <span class="toggle-ring toggle-ring-3"></span>
    <img src="${config.logoSrc}" alt="Promi" class="toggle-logo" />`;

  launcher.append(launcherBadge, toggleBtn);

  root.append(panel, launcher);
  document.body.append(root);

  /* ════════════════════════════════════════
     STATE
  ════════════════════════════════════════ */
  let conversation  = null;
  let selectedMode  = "text";
  let micMuted      = false;
  let userMsgCount  = 0;
  let limitReached  = false;
  let visualizer    = null;

  /* ── Helpers ── */
  const openWidget  = () => root.classList.add("open");
  const closeWidget = () => root.classList.remove("open");

  function setStatus(text) { statusEl.textContent = text; }

  function addChatMessage(message, author = "bot") {
    if (!message) return;
    const ph = chat.querySelector(".widget-chat-placeholder");
    if (ph) ph.remove();
    const item = document.createElement("p");
    item.className = `widget-msg ${author}`;
    item.textContent = String(message);
    chat.append(item);
    chat.scrollTop = chat.scrollHeight;
  }

  function setVoiceCaption(text) { voiceCaption.textContent = text; }

  function enterConnectedTextUi() {
    btnStartText.hidden  = true;
    textForm.hidden      = false;
    btnStopText.hidden   = false;
    textInput.disabled   = false;
    sendBtn.disabled     = false;
    textInput.focus();
  }

  function enterConnectedVoiceUi() {
    btnStartVoice.hidden         = true;
    voiceActiveControls.hidden   = false;
    visualizer?.start();
  }

  function resetTextUi() {
    btnStartText.hidden  = false;
    btnStartText.disabled = false;
    textForm.hidden      = true;
    btnStopText.hidden   = true;
  }

  function resetVoiceUi() {
    btnStartVoice.hidden         = false;
    btnStartVoice.disabled       = false;
    voiceActiveControls.hidden   = true;
    root.classList.remove("agent-speaking");
    setVoiceCaption("Promi está lista para hablar contigo");
    micMuted = false;
    btnMic.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 10v2a7 7 0 01-14 0v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Silenciar`;
    if (visualizer) { visualizer.destroy(); visualizer = null; }
  }

  function syncMode() {
    root.dataset.widgetMode = selectedMode;
    textTab.classList.toggle("active",  selectedMode === "text");
    voiceTab.classList.toggle("active", selectedMode === "voice");
    textPane.hidden  = selectedMode !== "text";
    voicePane.hidden = selectedMode !== "voice";
  }

  function resetAll() {
    conversation = null;
    userMsgCount = 0;
    limitReached = false;
    resetTextUi();
    resetVoiceUi();
    setStatus("Elige un modo para comenzar");
  }

  /* ════════════════════════════════════════
     LIMIT REACHED
  ════════════════════════════════════════ */
  async function handleLimitReached() {
    if (limitReached) return;
    limitReached = true;

    addChatMessage("Has llegado al límite de la demo (10 mensajes). ¡Gracias por probar Promi!", "bot");
    textInput.disabled = true;
    sendBtn.disabled   = true;
    setStatus("Demo finalizada");

    await new Promise(r => setTimeout(r, 2800));
    if (conversation) {
      try { await conversation.endSession(); } catch (_) {}
    }
    conversation = null;
    resetAll();
    await new Promise(r => setTimeout(r, 600));
    closeWidget();
  }

  /* ════════════════════════════════════════
     START / STOP
  ════════════════════════════════════════ */
  async function startConversation(mode) {
    if (!config.agentId) {
      alert("No se encontró AGENT_ID. Configura VITE_ELEVENLABS_AGENT_ID.");
      return;
    }

    if (mode === "text") btnStartText.disabled  = true;
    else                 btnStartVoice.disabled = true;

    setStatus(mode === "voice" ? "Conectando en modo voz..." : "Conectando en modo texto...");

    /* Create visualizer before connecting so audio init runs in parallel */
    if (mode === "voice") {
      visualizer = new VoiceWaveVisualizer(voiceCanvas);
      visualizer.initAudio();
      /* Start a calm idle animation immediately */
      visualizer.start();
    }

    try {
      if (mode === "voice") {
        await navigator.mediaDevices.getUserMedia({ audio: true });
      }

      conversation = await Conversation.startSession({
        agentId:        config.agentId,
        connectionType: "webrtc",
        ...(mode === "text" ? { textOnly: true } : {}),

        onConnect: () => {
          setStatus(mode === "voice" ? "Conectada · en voz" : "Conectada · escríbeme");
          if (mode === "text") {
            enterConnectedTextUi();
            addChatMessage("Hola, soy Promi. ¿En qué puedo ayudarte hoy?", "bot");
          } else {
            enterConnectedVoiceUi();
            setVoiceCaption("Promi conectada, ya puedes hablar");
          }
        },

        onDisconnect: () => {
          conversation = null;
          if (!limitReached) {
            if (mode === "text") resetTextUi();
            else                 resetVoiceUi();
            setStatus("Desconectado");
          }
        },

        onModeChange: (modePayload) => {
          if (mode !== "voice") return;
          const val = modePayload?.mode || String(modePayload);
          if (val === "speaking") {
            root.classList.add("agent-speaking");
            setVoiceCaption("Promi está hablando...");
            visualizer?.setSpeaking(true);
          } else if (val === "listening") {
            root.classList.remove("agent-speaking");
            setVoiceCaption("Escuchándote...");
            visualizer?.setSpeaking(false);
          } else {
            root.classList.remove("agent-speaking");
            visualizer?.setSpeaking(false);
          }
        },

        onMessage: (payload) => {
          if (mode !== "text") return;
          const source = payload?.source === "user" ? "user" : "bot";
          addChatMessage(payload?.message, source);
        },

        onError: (error) => {
          setStatus("Error en la conversación");
          alert(`Error: ${error?.message || String(error)}`);
        }
      });
    } catch (error) {
      conversation = null;
      if (mode === "text") resetTextUi();
      else                 resetVoiceUi();
      alert(`No se pudo iniciar: ${error?.message || String(error)}`);
    }
  }

  async function stopConversation() {
    try {
      if (conversation) await conversation.endSession();
    } catch (_) {}
    resetAll();
  }

  /* ════════════════════════════════════════
     MODE SWITCH
  ════════════════════════════════════════ */
  async function changeMode(nextMode) {
    if (selectedMode === nextMode) return;
    if (conversation) await stopConversation();
    selectedMode = nextMode;
    syncMode();
    setStatus("Elige un modo para comenzar");
  }

  /* ════════════════════════════════════════
     EVENT LISTENERS
  ════════════════════════════════════════ */
  toggleBtn.addEventListener("click", () => root.classList.toggle("open"));
  closeBtn.addEventListener("click", closeWidget);

  /* ── Logo follows cursor — page-wide with rAF lerp ── */
  const toggleLogo = toggleBtn.querySelector(".toggle-logo");
  let lgTgtX = 0, lgTgtY = 0, lgCurX = 0, lgCurY = 0;

  window.addEventListener("mousemove", (e) => {
    const r  = toggleBtn.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width  / 2);
    const dy = e.clientY - (r.top  + r.height / 2);
    const d  = Math.hypot(dx, dy) || 1;
    const MAX = 8;
    lgTgtX = (dx / d) * MAX;
    lgTgtY = (dy / d) * MAX;
  });

  (function animateLogo() {
    lgCurX += (lgTgtX - lgCurX) * 0.1;
    lgCurY += (lgTgtY - lgCurY) * 0.1;
    toggleLogo.style.transform = `translate(${lgCurX.toFixed(2)}px, ${lgCurY.toFixed(2)}px)`;
    requestAnimationFrame(animateLogo);
  })();

  tabs.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-mode]");
    if (btn) await changeMode(btn.dataset.mode);
  });

  btnStartText.addEventListener("click",  () => startConversation("text"));
  btnStopText.addEventListener("click",   stopConversation);
  btnStartVoice.addEventListener("click", () => startConversation("voice"));
  btnStopVoice.addEventListener("click",  stopConversation);

  btnMic.addEventListener("click", () => {
    if (!conversation?.setMicMuted) return;
    micMuted = !micMuted;
    conversation.setMicMuted(micMuted);
    btnMic.innerHTML = micMuted
      ? `<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9 9v3a3 3 0 005.12 2.12M15 9.34V4a3 3 0 00-5.94-.6M17 16.95A7 7 0 015 12v-2m14 0v2a7 7 0 01-.11 1.23M12 19v4M8 23h8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Activar mic`
      : `<svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 10v2a7 7 0 01-14 0v-2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> Silenciar`;
  });

  textInput.addEventListener("input", () => {
    if (conversation?.sendUserActivity) conversation.sendUserActivity();
  });

  textForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (limitReached) return;
    const text = textInput.value.trim();
    if (!text || !conversation?.sendUserMessage) return;

    userMsgCount++;
    addChatMessage(text, "user");
    conversation.sendUserMessage(text);
    textInput.value = "";

    if (userMsgCount >= MAX_MESSAGES) {
      await handleLimitReached();
    }
  });

  /* ── Init ── */
  syncMode();

  window.addEventListener("beforeunload", () => {
    if (conversation?.endSession) conversation.endSession().catch(() => {});
  });
}

window.initPromiseVoiceWidget = initPromiseVoiceWidget;
