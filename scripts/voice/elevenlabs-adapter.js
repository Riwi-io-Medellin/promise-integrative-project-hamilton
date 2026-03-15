const LIB_HINT = [
  "https://unpkg.com/@elevenlabs/convai-widget-embed",
  "https://cdn.jsdelivr.net/npm/@elevenlabs/convai-widget-embed"
];

async function loadScript(url) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-elevenlabs-src="${url}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = url;
    script.async = true;
    script.dataset.elevenlabsSrc = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`No fue posible cargar ${url}`));
    document.head.append(script);
  });
}

async function ensurePublicLibrary() {
  for (const url of LIB_HINT) {
    try {
      await loadScript(url);
      return true;
    } catch (_error) {
      // Intentamos otra fuente.
    }
  }
  return false;
}

/**
 * Conecta un agente público de ElevenLabs sin exponer secretos.
 * Este adaptador prioriza una implementación custom registrada en:
 * window.PromiseElevenLabsAdapter.connect({ agentId, onStatus, onError })
 *
 * Si no existe, intenta preparar el entorno para web component público.
 */
export async function connectElevenLabsPublicAgent({
  agentId,
  mountElement,
  onStatus = () => {},
  onError = () => {}
}) {
  if (!agentId) {
    throw new Error("Agent ID no definido.");
  }

  if (window.PromiseElevenLabsAdapter?.connect) {
    onStatus("Conectando con adaptador personalizado...");
    return window.PromiseElevenLabsAdapter.connect({ agentId, mountElement, onStatus, onError });
  }

  const loaded = await ensurePublicLibrary();
  if (!loaded) {
    throw new Error("No se pudo preparar la librería pública de ElevenLabs.");
  }

  if (!mountElement) {
    throw new Error("No se encontró contenedor para la sesión de voz.");
  }

  mountElement.replaceChildren();

  const widget = document.createElement("elevenlabs-convai");
  widget.setAttribute("agent-id", agentId);
  widget.setAttribute("variant", "expanded");
  widget.setAttribute("action-text", "Hablar con Promise");
  widget.setAttribute("start-call-text", "Iniciar llamada");
  widget.setAttribute("end-call-text", "Finalizar");
  widget.setAttribute("expand-text", "Abrir voz");
  widget.setAttribute("listening-text", "Escuchando...");
  widget.setAttribute("speaking-text", "Promise hablando");
  mountElement.append(widget);

  onStatus("Live conectado");

  return {
    connected: true,
    stop() {
      mountElement.replaceChildren();
      onStatus("Sesión finalizada.");
    }
  };
}
