export async function seguimientoView() {
    const resp = await fetch('/src/views/seguimientoView.html');
    const template = await resp.text();
    return {
        title: 'Seguimiento de Estados',
        cssPath: 'src/css/seguimiento.css',
        template,
        logic: async () => {
            const mod = await import('../logic/seguimiento.js');
            if (mod && typeof mod.initSeguimientoView === 'function') mod.initSeguimientoView();
        }
    };
}