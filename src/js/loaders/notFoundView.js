export const notFoundView = {
    title: '404 - Página no encontrada',
    template: `
    <div class="flex flex-col items-center justify-center min-h-[80vh] text-center p-8 animate-in">
        <div class="bg-indigo-50 p-6 rounded-full mb-6">
            <i data-lucide="map-pin-off" class="w-16 h-16 text-indigo-500"></i>
        </div>
        <h1 class="text-6xl font-black text-slate-800 mb-4">404</h1>
        <p class="text-xl text-slate-500 mb-8 max-w-md">
            Parece que te has perdido en el sistema. La ruta que buscas no existe o ha sido movida.
        </p>
        <a href="#/dashboard" class="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg flex items-center gap-2">
            <i data-lucide="home" class="w-5 h-5"></i>
            Regresar al Dashboard
        </a>
    </div>
    `,
    logic: () => {
        if (window.lucide) lucide.createIcons();
    }
};