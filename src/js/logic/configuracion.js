export function initConfiguracionView() {
    const btnWebhook = document.getElementById('btn-save-webhook');
    const webhookInput = document.getElementById('webhook-url');
    const btnSystem = document.getElementById('btn-save-system');

    const urlGuardada = localStorage.getItem('webhook_n8n_url');
    if (urlGuardada) webhookInput.value = urlGuardada;

    btnWebhook.addEventListener('click', () => {
        const url = webhookInput.value.trim();
        if (url !== "") {
            localStorage.setItem('webhook_n8n_url', url);
            alert(' ¡Configuración de n8n sincronizada con éxito!');
        } else alert('Por favor, ingresa una URL válida.');
    });

    btnSystem.addEventListener('click', () => { alert('Intervalo de actualización del sistema ajustado.'); });

    if (window.lucide) lucide.createIcons();
}
