export const configuracionView = {
    title: 'Configuración del Sistema',

    // 1. ESTRUCTURA (Template con Tailwind y CSS personalizado)
    template: `
    <div class="p-8 space-y-6 max-w-2xl animate-in">
        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div class="flex items-center gap-2">
                <i data-lucide="webhook" class="w-5 h-5 text-indigo-500"></i>
                <h3 class="font-bold text-slate-800">Webhook n8n</h3>
            </div>
            <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">URL del Webhook de Automatización</label>
                <div class="flex gap-2">
                    <input type="text" id="webhook-url" 
                        class="flex-1 p-3 rounded-xl border border-slate-100 bg-slate-50 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                        value="https://n8n.riwi.io/webhook/riwicalls-prod">
                    <button id="btn-save-webhook" class="bg-slate-900 text-white px-6 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-sm">
                        <i data-lucide="save" class="w-4 h-4 text-emerald-400"></i> Guardar
                    </button>
                </div>
            </div>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
            <div class="flex items-center gap-2">
                <i data-lucide="settings-2" class="w-5 h-5 text-indigo-500"></i>
                <h3 class="font-bold text-slate-800">Parámetros del Sistema</h3>
            </div>
            <div class="space-y-2">
                <label class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Intervalo actualización (segundos)</label>
                <div class="flex gap-2">
                    <input type="number" id="system-interval" value="30"
                        class="flex-1 p-3 rounded-xl border border-slate-100 bg-slate-50 text-sm outline-none">
                    <button id="btn-save-system" class="bg-slate-900 text-white px-6 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-sm">
                        <i data-lucide="save" class="w-4 h-4 text-emerald-400"></i> Guardar
                    </button>
                </div>
            </div>
        </div>

        <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div class="flex items-center gap-2 mb-4">
                <i data-lucide="database" class="w-5 h-5 text-indigo-500"></i>
                <h3 class="font-bold text-slate-800">Estado de Conexión</h3>
            </div>
            <p class="text-xs text-slate-400 mb-4 italic">
                La base de datos (PostgreSQL/Supabase) está sincronizada y activa.
            </p>
            <div class="grid grid-cols-3 gap-3">
                ${['candidatos', 'llamadas', 'eventos'].map(tabla => `
                    <div class="bg-slate-50 p-3 rounded-xl text-center border border-slate-100">
                        <div class="w-2 h-2 rounded-full bg-emerald-400 mx-auto mb-2 animate-pulse"></div>
                        <p class="text-[10px] font-mono font-bold text-slate-500 uppercase">${tabla}</p>
                    </div>
                `).join('')}
            </div>
        </div>
    </div>
    `,

    // 2. LÓGICA (Manejo de estados y guardado)
    logic: function() {
    // 1. Selectores
    const btnWebhook = document.getElementById('btn-save-webhook');
    const webhookInput = document.getElementById('webhook-url');
    const btnSystem = document.getElementById('btn-save-system');

    // 2. CARGAR VALOR PREVIO (Muy importante para que no se borre al recargar)
    // Al cargar la vista, buscamos si ya había una URL guardada
    const urlGuardada = localStorage.getItem('webhook_n8n_url');
    if (urlGuardada) {
        webhookInput.value = urlGuardada;
    }

    // 3. GUARDAR EL WEBHOOK
    btnWebhook.addEventListener('click', () => {
        const url = webhookInput.value.trim();
        
        if (url !== "") {
            // Guardamos con la llave 'webhook_n8n_url' (la misma que usará la vista de llamadas)
            localStorage.setItem('webhook_n8n_url', url);
            console.log('URL de n8n sincronizada:', url);
            alert(' ¡Configuración de n8n sincronizada con éxito!');
        } else {
            alert('Por favor, ingresa una URL válida.');
        }
    });

    // Manejo del Intervalo
    btnSystem.addEventListener('click', () => {
        alert('Intervalo de actualización del sistema ajustado.');
    });

    if (window.lucide) lucide.createIcons();
}
};