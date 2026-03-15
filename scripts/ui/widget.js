import { connectElevenLabsPublicAgent } from "../voice/elevenlabs-adapter.js";

const demoResponses = {
  "¿Qué es Promise?":
    "Promise es una empresa que diseña agentes conversacionales a medida para automatizar flujos repetitivos conectados a datos.",
  "¿Cómo funciona RiwiCall?":
    "RiwiCall está impulsado por SofIA. Ejecuta llamadas, entiende respuestas y registra resultados sin intervención manual.",
  "¿Qué hace cada agente?":
    "SofIA opera voz en producción, el motor modular está en migración y el agente de texto cubre WhatsApp, Telegram y web."
};

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
    actions: userConfig.actions || Object.keys(demoResponses)
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
  startVoice.textContent = "Iniciar sesión de voz";

  const note = document.createElement("p");
  note.className = "widget-note";
  note.textContent =
    "El modo live usa solo agentId público. Para producción privada, migra a token firmado desde backend.";

  const liveHost = document.createElement("div");
  liveHost.className = "widget-live-host";
  liveHost.hidden = true;

  body.append(log, actions, startVoice, liveHost, note);
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
      status.textContent = "Demo activo";
      log.append(
        createMessage(
          "No hay configuración live activa. Mantenemos el modo demo para explicar Promise y sus agentes."
        )
      );
      log.scrollTop = log.scrollHeight;
      return;
    }

    status.classList.add("live");
    status.textContent = "Conectando live...";
    log.append(createMessage("Intentando conexión con ElevenLabs en modo público..."));
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
        status.textContent = "Live conectado";
        log.append(createMessage("Sesión live lista. El agente de voz ya puede operar desde este widget."));
      } else {
        status.textContent = "Live parcial";
        log.append(
          createMessage(
            "Conexión pública preparada, pero falta adaptador final para manejar audio bidireccional en esta UI."
          )
        );
      }
    } catch (error) {
      status.classList.remove("live");
      status.textContent = "Fallback demo";
      log.append(createMessage(`No se pudo abrir modo live. ${error.message}`));
      log.append(
        createMessage("Seguimos en demo para que puedas validar experiencia y narrativa del agente.")
      );
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
