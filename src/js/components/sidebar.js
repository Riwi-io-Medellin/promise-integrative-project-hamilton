export const Sidebar = {
    render: () => {
        const menuLateral = document.getElementById('menu-lateral');
        if (!menuLateral) return;

        menuLateral.innerHTML = `
            <div class="flex items-center gap-3 mb-10 px-2">
                <div class="bg-riwi-mint w-8 h-8 rounded-lg shadow-lg shadow-riwi-mint/30"></div>
                <div>
                    <h2 class="text-xl font-bold tracking-tight text-white leading-none">PROMISE</h2>
                    <span class="text-[10px] text-riwi-mint font-bold uppercase tracking-widest">RiwiCalls AI</span>
                </div>
            </div>
            
            <nav class="flex flex-col gap-2 overflow-y-auto max-h-[80vh] pr-2">
                <p class="text-[10px] text-white/30 font-bold uppercase tracking-widest px-3 mb-1">Principal</p>
                
                <a href="#/dashboard" class="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-white transition-all group">
                    <i data-lucide="layout-dashboard" class="w-5 h-5 text-riwi-mint"></i>
                    <span class="font-medium text-sm">Dashboard</span>
                </a>
                
                <a href="#/candidatos" class="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-white transition-all group">
                    <i data-lucide="users" class="w-5 h-5 text-riwi-mint"></i>
                    <span class="font-medium text-sm">Candidatos</span>
                </a>

                <a href="#/seguimiento" class="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-white transition-all group">
                    <i data-lucide="trello" class="w-5 h-5 text-riwi-mint"></i>
                    <span class="font-medium text-sm">Seguimiento</span>
                </a>

                <p class="text-[10px] text-white/30 font-bold uppercase tracking-widest px-3 mt-4 mb-1">Operaciones</p>

                <a href="#/llamadas" class="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-white transition-all group">
                    <i data-lucide="phone-incoming" class="w-5 h-5 text-riwi-mint"></i>
                    <span class="font-medium text-sm">Llamadas</span>
                </a>

                <a href="#/eventos" class="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-white transition-all group">
                    <i data-lucide="calendar" class="w-5 h-5 text-riwi-mint"></i>
                    <span class="font-medium text-sm">Eventos</span>
                </a>

                <p class="text-[10px] text-white/30 font-bold uppercase tracking-widest px-3 mt-4 mb-1">Reportes</p>

                <a href="#/analitica" class="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-white transition-all group">
                    <i data-lucide="bar-chart-3" class="w-5 h-5 text-riwi-mint"></i>
                    <span class="font-medium text-sm">Analítica</span>
                </a>

                <a href="#/reportes" class="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-white transition-all group">
                    <i data-lucide="file-text" class="w-5 h-5 text-riwi-mint"></i>
                    <span class="font-medium text-sm">Reportes</span>
                </a>

                <div class="mt-4 pt-4 border-t border-white/10">
                    <a href="#/configuracion" class="flex items-center gap-3 p-3 rounded-xl hover:bg-white/10 text-white transition-all group">
                        <i data-lucide="settings" class="w-5 h-5 text-riwi-mint"></i>
                        <span class="font-medium text-sm">Configuración</span>
                    </a>
                </div>
            </nav>
        `;
    }
};