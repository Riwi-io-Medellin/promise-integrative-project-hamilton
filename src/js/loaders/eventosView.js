export async function eventosView() {
    const resp = await fetch('/src/views/eventosView.html');
    const template = await resp.text();
    return {
        title: 'Sistema de Eventos',
        cssPath: 'src/css/eventos.css',
        template,
        logic: async () => {
            const mod = await import('../logic/eventos.js');
            if (mod && typeof mod.initEventosView === 'function') mod.initEventosView();
        }
    };
}