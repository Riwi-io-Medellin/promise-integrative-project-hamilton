export async function llamadasView() {
    const resp = await fetch('/src/views/llamadasView.html');
    const template = await resp.text();
    return {
        title: 'Gestión de Llamadas',
        cssPath: 'src/css/llamadas.css',
        template,
        logic: async () => {
            const mod = await import('../logic/llamadas.js');
            if (mod && typeof mod.initLlamadasView === 'function') mod.initLlamadasView();
        }
    };
}