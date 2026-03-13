import { initRouter } from './router/routes.js';
import { Sidebar } from './components/sidebar.js';

/**
 * OBJETO APP: El motor principal de RiwiCalls
 */
export const App = {
    container: document.getElementById('app'),
    tituloPagina: document.getElementById('titulo-pagina'),

    _currentCss: null,

    async render(view) {
        if (!this.container) return;
        
        // 1. Inyectamos el HTML de la vista modular
        this.container.innerHTML = view.template;
        
        // 1b. Cargamos CSS si la vista define cssPath
        if (this._currentCss) this._removeCss(this._currentCss);
        if (view.cssPath) this._loadCss(view.cssPath);

        // 2. Actualizamos el título en la UI (el h1 del header global)
        if (this.tituloPagina) {
            this.tituloPagina.textContent = view.title;
        }

        // 3. Actualizamos el título de la pestaña del navegador
        document.title = `RiwiCalls | ${view.title}`;
        
        // 4. Ejecutamos la lógica específica de la vista (eventos, botones)
        if (view.logic) {
            try {
                const maybePromise = view.logic();
                if (maybePromise && typeof maybePromise.then === 'function') await maybePromise;
            } catch (err) { console.error('Error en la lógica de la vista', err); }
        }

        // 5. Renderizamos los iconos de Lucide
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // 6. Scroll al inicio por si la vista anterior era muy larga
        window.scrollTo(0, 0);
    },

    _loadCss(path) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = path;
        link.dataset.dynamic = 'true';
        document.head.appendChild(link);
        this._currentCss = link;
    },

    _removeCss(link) {
        if (!link) return;
        try { link.remove(); } catch (err) { console.warn('No se pudo remover css', err); }
        this._currentCss = null;
    }
};

// --- ARRANQUE DE LA APLICACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    // Dibujamos el Sidebar una sola vez (se mantiene fijo)
    Sidebar.render(); 
    
    // Encendemos el Router para que detecte la URL actual
    initRouter();     
});

