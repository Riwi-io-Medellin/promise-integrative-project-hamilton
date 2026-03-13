export async function analiticaView() {
    const resp = await fetch('/src/views/analiticaView.html');
    const template = await resp.text();
    return {
        title: 'Analítica de RiwiCalls',
        cssPath: 'src/css/analitica.css',
        template,
        logic: async () => {
            const mod = await import('../logic/analitica.js');
            if (mod && typeof mod.initAnaliticaView === 'function') mod.initAnaliticaView();
        }
    };
}