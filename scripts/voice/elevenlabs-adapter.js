/**
 * Conecta un agente de ElevenLabs sin exponer secretos.
 * Solo usa una implementación custom registrada en:
 * window.PromiseElevenLabsAdapter.connect({ agentId, onStatus, onError })
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

  throw new Error(
    "No hay adaptador frontend registrado. Define window.PromiseElevenLabsAdapter.connect para voz y texto."
  );
}
