export const Analitica = {
    title: 'Analítica de RiwiCalls',
    cssPath: 'src/css/analitica.css',
    template: `
    <div class="analitica-container animate-in">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div class="card-stat">
                <div class="flex items-center justify-between mb-4">
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest">Efectividad de IA</h4>
                    <i data-lucide="trending-up" class="text-emerald-500 w-5 h-5"></i>
                </div>
                <div class="flex items-end gap-2">
                    <span class="text-5xl font-black text-slate-800">78%</span>
                    <span class="text-emerald-500 font-bold mb-1 text-sm">↑ 5%</span>
                </div>
                <p class="text-xs text-slate-400 mt-2">Candidatos interesados tras llamada de RiwiCalls</p>
            </div>

            <div class="card-stat">
                <div class="flex items-center justify-between mb-4">
                    <h4 class="text-xs font-bold text-slate-400 uppercase tracking-widest">Tiempo Ahorrado</h4>
                    <i data-lucide="clock" class="text-indigo-500 w-5 h-5"></i>
                </div>
                <div class="flex items-end gap-2">
                    <span class="text-5xl font-black text-slate-800">12h</span>
                    <span class="text-slate-400 font-bold mb-1 text-sm">Esta semana</span>
                </div>
                <p class="text-xs text-slate-400 mt-2">Esfuerzo humano optimizado por la automatización</p>
            </div>
        </div>

        <div class="card-stat col-span-2">
            <h4 class="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2">Actividad de Llamadas (Últimos 5 días)</h4>
            <div class="bar-container" id="chart-activity"></div>
            <div class="flex justify-around mt-4 text-[10px] font-bold text-slate-400 uppercase">
                <span>Lun</span><span>Mar</span><span>Mie</span><span>Jue</span><span>Hoy</span>
            </div>
        </div>
    </div>
    `,

    logic: () => {
        const chartContainer = document.getElementById('chart-activity');
        if (!chartContainer) return;

        const stats = [
            { day: 'Lun', value: 45, label: '45 llamadas' },
            { day: 'Mar', value: 65, label: '65 llamadas' },
            { day: 'Mie', value: 90, label: '90 llamadas' },
            { day: 'Jue', value: 75, label: '75 llamadas' },
            { day: 'Hoy', value: 95, label: '95 llamadas' }
        ];

        // Render barras
        chartContainer.innerHTML = '';
        // asegurar que el contenedor use flex
        chartContainer.style.display = 'flex';
        chartContainer.style.alignItems = 'flex-end';
        chartContainer.style.gap = '8px';

        stats.forEach(s => {
            const div = document.createElement('div');
            div.className = 'bar-item';
            div.style.height = '0%';
            div.style.flex = '1';
            div.style.minWidth = '20px';

            const tooltip = document.createElement('span');
            tooltip.className = 'bar-tooltip';
            tooltip.textContent = s.label;

            div.appendChild(tooltip);
            chartContainer.appendChild(div);

            // Animar altura
            setTimeout(() => {
                div.style.height = s.value + '%';
                if (s.value > 90) div.style.background = '#10B981';
            }, 50);

            // Mostrar tooltip al click
            div.addEventListener('click', () => alert(s.label));
        });
    }
};
