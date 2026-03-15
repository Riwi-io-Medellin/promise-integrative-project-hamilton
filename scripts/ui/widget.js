import { connectElevenLabsPublicAgent } from "../voice/elevenlabs-adapter.js";

const demoResponses = {
  "¿Qué es Promise?":
    "Promise es una empresa que diseña agentes conversacionales a medida para automatizar flujos repetitivos conectados a datos.",
  "¿Cómo funciona RiwiCall?":
    "RiwiCall está impulsado por SofIA. Ejecuta llamadas, entiende respuestas y registra resultados sin intervención manual.",
  "¿Qué hace cada agente?":
    "SofIA opera voz en producción, el motor modular está en migración y el agente de texto cubre WhatsApp, Telegram y web."
};

function createDemoAnswer(question) {
  const normalized = question.toLowerCase();
  if (normalized.includes("riwicall")) {
    return "RiwiCall es el caso activo: SofIA ejecuta llamadas de admisión, clasifica respuestas y deja registro operativo.";
  }
  if (normalized.includes("texto") || normalized.includes("chat") || normalized.includes("whatsapp")) {
    return "El agente de texto usa la misma lógica conversacional y puede operar por web, WhatsApp o Telegram.";
  }
  if (normalized.includes("voz") || normalized.includes("llamad")) {
    return "El canal de voz conecta al agente con ElevenLabs para llamadas y seguimiento de campañas.";
  }
  return "Gracias por tu pregunta. Promise diseña agentes por flujo real y canal para automatizar tareas repetitivas.";
}

function createMessage(text, author = "bot") {
  const item = document.createElement("p");
  item.className = `widget-msg ${author}`;
  item.textContent = text;
  return item;
}

function normalizeConfig(userConfig = {}) {
  const envMode = (import.meta.env.VITE_ELEVENLABS_MODE || "demo").toLowerCase();
  const envAgentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID || "";

  const mode = userConfig.mode || envMode;
  const agentId = userConfig.agentId || envAgentId;

  return {
    mode: mode === "live" ? "live" : "demo",
    agentId,
    title: userConfig.title || "Agente Promise",
    subtitle: userConfig.subtitle || "Asistente de arquitectura híbrida",
    actions: userConfig.actions || Object.keys(demoResponses),
    placeholder: userConfig.placeholder || "Escribe tu pregunta sobre Promise, RiwiCall o los agentes"
  };
}

export function initPromiseVoiceWidget(userConfig = {}) {
  const existing = document.querySelector("[data-promise-widget-root]");
  if (existing) {
    return;
  }

  const config = normalizeConfig(userConfig);

  const root = document.createElement("aside");
  root.className = "promise-widget";
  root.dataset.promiseWidgetRoot = "true";

  const toggle = document.createElement("button");
  toggle.className = "widget-toggle";
  toggle.type = "button";
  toggle.setAttribute("aria-label", "Abrir asistente de Promise");
  toggle.innerHTML = '<img src="./assets/brand/ISOLOGO-OSCURO.png" alt="" />';

  const panel = document.createElement("div");
  panel.className = "widget-panel";

  const head = document.createElement("header");
  head.className = "widget-head";

  const headingWrap = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = config.title;
  const status = document.createElement("p");
  status.className = "widget-status";
  status.textContent =
    config.mode === "live" && config.agentId
      ? "Live: intentando conexión de voz"
      : "Demo: explicaciones interactivas";
  headingWrap.append(title, status);

  const close = document.createElement("button");
  close.className = "widget-action";
  close.type = "button";
  close.textContent = "Cerrar";
  close.setAttribute("aria-label", "Cerrar asistente");
  head.append(headingWrap, close);

  const body = document.createElement("div");
  body.className = "widget-body";

  const log = document.createElement("div");
  log.className = "widget-log";
  log.setAttribute("aria-live", "polite");
  log.append(
    createMessage(
      "Hola, soy el asistente de Promise. Te explico cómo automatizamos flujos repetitivos y cómo encaja cada agente."
    )
  );

  const actions = document.createElement("div");
  actions.className = "widget-actions";
  config.actions.forEach((action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "widget-action";
    button.textContent = action;
    button.addEventListener("click", () => {
      log.append(createMessage(action, "user"));
      const response = demoResponses[action] || "Te comparto más detalle en la reunión de diagnóstico.";
      log.append(createMessage(response));
      log.scrollTop = log.scrollHeight;
    });
    actions.append(button);
  });

  const startVoice = document.createElement("button");
  startVoice.type = "button";
  startVoice.className = "btn btn-primary";
  startVoice.textContent = "Conectar voz";

  const textForm = document.createElement("form");
  textForm.className = "widget-form";
  const textInput = document.createElement("input");
  textInput.className = "widget-input";
  textInput.type = "text";
  textInput.name = "widgetPrompt";
  textInput.placeholder = config.placeholder;
  textInput.autocomplete = "off";
  const sendButton = document.createElement("button");
  sendButton.type = "submit";
  sendButton.className = "widget-action";
  sendButton.textContent = "Enviar";
  textForm.append(textInput, sendButton);

  const note = document.createElement("p");
  note.className = "widget-note";
  note.textContent =
    "Este widget mantiene la experiencia dentro del frontend de Promise. Voz y texto se conectan por adaptador personalizado.";

  const liveHost = document.createElement("div");
  liveHost.className = "widget-live-host";
  liveHost.hidden = true;

  body.append(log, actions, textForm, startVoice, liveHost, note);
  panel.append(head, body);
  root.append(panel, toggle);
  document.body.append(root);

  let liveSession = null;

  const openWidget = () => root.classList.add("open");
  const closeWidget = () => root.classList.remove("open");

  toggle.addEventListener("click", () => {
    root.classList.toggle("open");
  });
  close.addEventListener("click", closeWidget);

  startVoice.addEventListener("click", async () => {
    openWidget();

    if (config.mode !== "live" || !config.agentId) {
      status.classList.remove("live");
      status.textContent = "Texto demo activo";
      log.append(
        createMessage(
          "No hay configuración live activa. Mantenemos el modo demo para explicar Promise y sus agentes."
        )
      );
      log.scrollTop = log.scrollHeight;
      return;
    }

    status.classList.add("live");
    status.textContent = "Conectando voz...";
    log.append(createMessage("Intentando conexión de voz con el adaptador frontend de Promise..."));
    log.scrollTop = log.scrollHeight;

    try {
      liveSession = await connectElevenLabsPublicAgent({
        agentId: config.agentId,
        onStatus: (message) => {
          status.textContent = message;
        },
        mountElement: liveHost,
        onError: (errorMessage) => {
          if (!errorMessage) {
            return;
          }
          log.append(createMessage(errorMessage));
          log.scrollTop = log.scrollHeight;
        }
      });

      if (liveSession?.connected) {
        liveHost.hidden = false;
        status.textContent = "Voz conectada";
        log.append(createMessage("Sesión de voz lista. Puedes seguir usando texto y voz desde este mismo widget."));
      } else {
        status.textContent = "Conexión parcial";
        log.append(createMessage("Adaptador conectado parcialmente. Valida eventos de audio bidireccional."));
      }
    } catch (error) {
      status.classList.remove("live");
      status.textContent = "Texto disponible";
      log.append(createMessage(`No se pudo abrir voz. ${error.message}`));
      log.append(createMessage("Seguimos activos por texto en este widget."));
    } finally {
      log.scrollTop = log.scrollHeight;
    }
  });

  textForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const content = textInput.value.trim();
    if (!content) {
      return;
    }

    log.append(createMessage(content, "user"));
    textInput.value = "";

    try {
      if (liveSession?.sendText) {
        const response = await liveSession.sendText(content);
        if (response) {
          log.append(createMessage(response));
        }
      } else {
        log.append(createMessage(createDemoAnswer(content)));
      }
    } catch (_error) {
      log.append(createMessage("No pude procesar ese mensaje ahora. Intenta de nuevo en unos segundos."));
    } finally {
      log.scrollTop = log.scrollHeight;
    }
  });

  window.addEventListener("beforeunload", () => {
    if (liveSession?.stop) {
      liveSession.stop();
    }
  });
}

window.initPromiseVoiceWidget = initPromiseVoiceWidget;
