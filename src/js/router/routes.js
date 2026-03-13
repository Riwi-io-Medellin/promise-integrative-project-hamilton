import { App } from '../app.js';
import { Analitica } from '../components/analitica.js';
import { Seguimiento } from '../components/seguimiento.js';
import { dashboardView } from '../loaders/dashboardView.js';
import { candidatosView } from '../loaders/candidatosView.js';
import { configuracionView } from '../loaders/configuracionView.js';
import { eventosView } from '../loaders/eventosView.js';
import { llamadasView } from '../loaders/llamadasView.js';
import { reportesView } from '../loaders/reportesView.js';

const routes = {
    '#/dashboard': dashboardView,
    '#/candidatos': candidatosView,
    '#/analitica': Analitica,
    '#/configuracion': configuracionView,
    '#/eventos': eventosView,
    '#/llamadas': llamadasView,
    '#/reportes': reportesView,
    '#/seguimiento': Seguimiento
};

export const initRouter = () => {
    const handleRoute = async () => {
        const hash = window.location.hash || '#/dashboard';
        let view = routes[hash] || { title: '404', template: '<div>Not Found</div>' };

        // Soportar vistas que sean funciones async (p.ej. loader que hace fetch de un .html)
        if (typeof view === 'function') {
            try { view = await view(); } catch (err) { console.error('Error cargando vista', err); view = { title: '500', template: '<div>Error</div>' }; }
        }

        App.render(view);
    };

    window.addEventListener('hashchange', handleRoute);
    window.addEventListener('load', handleRoute);
};

export default routes;