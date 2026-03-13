export async function dashboardView() {
    const resp = await fetch('/src/views/dashboardView.html');
    const template = await resp.text();
    return {
        title: 'Dashboard RiwiCalls',
        cssPath: 'src/css/dashboard.css',
        template,
        logic: async () => {
            // import dinamico de la lógica y ejecucion
            const mod = await import('../logic/dashboard.js');
            if (mod && typeof mod.initDashboard === 'function') mod.initDashboard();
        }
    };
}
