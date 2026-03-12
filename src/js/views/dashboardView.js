// src/js/views/dashboardView.js

export const dashboardView = {
    title: 'Dashboard RiwiCalls',

    // 1. TEMPLATE: Estructura HTML completa
    template: `
    <style>
        .dashboard-container { background: #F8FAFC; padding: 25px; font-family: 'Inter', sans-serif; }
        .card { background: white; border-radius: 16px; border: 1px solid #E2E8F0; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
        .metric-icon { color: #6366F1; width: 20px; height: 20px; }
        .custom-tooltip {
            position: fixed; pointer-events: none; background: rgba(30, 41, 59, 0.95);
            color: white; padding: 8px 12px; border-radius: 8px; font-size: 11px;
            font-weight: 600; z-index: 10000; display: none; backdrop-filter: blur(4px);
        }
        .tooltip-color-dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 6px; }
    </style>
    
    <div class="dashboard-container">
        <div class="grid grid-cols-4 gap-4 mb-6" id="metricas-container"></div>

        <div id="dynamic-charts-container" class="grid grid-cols-12 gap-6 mb-6">
            <div class="card col-span-5 flex flex-col items-center">
                <h4 class="text-slate-500 text-[10px] font-black uppercase tracking-widest self-start mb-10">Distribución por Género</h4>
                <div class="relative w-40 h-40 group chart-hover-zone" data-tip-hombres="5 Hombres (50%)" data-tip-mujeres="5 Mujeres (50%)">
                    <div class="w-full h-full rounded-full cursor-pointer transition-transform duration-300 hover:scale-105" 
                        style="background: conic-gradient(#6366F1 0% 50%, #71C6A0 50% 100%); 
                            mask-image: radial-gradient(transparent 45%, black 46%); 
                            -webkit-mask-image: radial-gradient(transparent 45%, black 46%);">
                    </div>
                    <div style="position: absolute; top: -25px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center;">
                        <span style="font-weight: 900; font-size: 15px; color: #6366F1;">5</span>
                        <div style="width: 1.5px; height: 15px; background: #6366F1;"></div>
                    </div>
                    <div style="position: absolute; bottom: -25px; left: 50%; transform: translateX(-50%); display: flex; flex-direction: column; align-items: center;">
                        <div style="width: 1.5px; height: 15px; background: #71C6A0;"></div>
                        <span style="font-weight: 900; font-size: 15px; color: #71C6A0;">5</span>
                    </div>
                </div>
                <div class="mt-12 flex gap-6">
                    <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm" style="background: #6366F1;"></div><span class="text-[10px] font-bold text-slate-400 uppercase">Hombres</span></div>
                    <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm" style="background: #71C6A0;"></div><span class="text-[10px] font-bold text-slate-400 uppercase">Mujeres</span></div>
                </div>
            </div>

            <div class="card col-span-7 flex flex-col">
                <h4 class="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6">Rangos de Edad</h4>
                <div class="flex h-48 w-full">
                    <div class="flex flex-col justify-between text-[10px] font-bold text-slate-400 pr-2 pb-6">
                        <span>4</span><span>3</span><span>2</span><span>1</span><span>0</span>
                    </div>
                    <div class="flex-1 relative border-l border-b border-slate-200">
                        <div id="barras-edad-container" class="relative z-10 flex items-end justify-around h-full w-full px-4"></div>
                    </div>
                </div>
                <div class="flex justify-around text-[10px] font-bold text-slate-400 uppercase tracking-tighter ml-6 mt-2">
                    <span class="w-20 text-center">17-22</span><span class="w-20 text-center">22-30</span><span class="w-20 text-center">30-35</span>
                </div>
            </div>
        </div>

        <div id="second-row-container" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-bottom: 24px;"></div>

        <div id="third-row-container" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px;"></div>
        </div>


        <div class="grid grid-cols-12 gap-6 mb-6">
    <div class="card col-span-6 flex flex-col" id="estado-candidatos-container">
        <h4 class="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6">Estado de Candidatos</h4>
        <div class="flex flex-1 pr-4">
            <div class="flex flex-col justify-between text-[10px] font-bold text-slate-400 pr-3 pb-6 text-right w-24">
                <span>Filtro CI</span><span>Inscrito</span><span>Llamado</span><span>Interesado</span><span>En proceso</span><span>Admitido</span><span>No interesado</span>
            </div>
            <div class="flex-1 relative border-l border-b border-slate-200">
                <div class="absolute inset-0 flex justify-between pointer-events-none">
                    <div class="border-l border-slate-100 border-dashed h-full"></div>
                    <div class="border-l border-slate-100 border-dashed h-full"></div>
                    <div class="border-l border-slate-100 border-dashed h-full"></div>
                    <div class="border-l border-slate-100 border-dashed h-full"></div>
                </div>
                <div id="barras-estado-candidatos" class="relative z-10 flex flex-col justify-between h-full py-2">
                    </div>
            </div>
        </div>
        <div class="flex justify-between text-[10px] font-bold text-slate-400 ml-[104px] mt-2 pr-4">
            <span>0</span><span>0.75</span><span>1.5</span><span>2.25</span><span>3</span>
        </div>
    </div>

    <div class="card col-span-6 flex flex-col items-center" id="estado-llamadas-container">
    <h4 class="text-slate-500 text-[10px] font-black uppercase tracking-widest self-start mb-6">Estado de Llamadas</h4>
    
    
    <div class="relative w-48 h-48">
        <div class="absolute inset-0 rounded-full chart-hover-zone cursor-pointer" 
            style="background: conic-gradient(#6366F1 0% 40%, transparent 40% 100%); mask-image: radial-gradient(transparent 58%, black 60%); -webkit-mask-image: radial-gradient(transparent 58%, black 60%);"
            data-tip="Pendiente: 3" data-color="#6366F1"></div>
            
        <div class="absolute inset-0 rounded-full chart-hover-zone cursor-pointer" 
            style="background: conic-gradient(transparent 0% 40%, #71C6A0 40% 65%, transparent 65% 100%); mask-image: radial-gradient(transparent 58%, black 60%); -webkit-mask-image: radial-gradient(transparent 58%, black 60%);"
            data-tip="Llamado: 2" data-color="#71C6A0"></div>

        <div class="absolute inset-0 rounded-full chart-hover-zone cursor-pointer" 
            style="background: conic-gradient(transparent 0% 65%, #E9C46A 65% 80%, transparent 80% 100%); mask-image: radial-gradient(transparent 58%, black 60%); -webkit-mask-image: radial-gradient(transparent 58%, black 60%);"
            data-tip="No contesta: 1" data-color="#E9C46A"></div>

        <div class="absolute inset-0 rounded-full chart-hover-zone cursor-pointer" 
            style="background: conic-gradient(transparent 0% 80%, #D89DED 80% 90%, transparent 90% 100%); mask-image: radial-gradient(transparent 58%, black 60%); -webkit-mask-image: radial-gradient(transparent 58%, black 60%);"
            data-tip="Interesado: 1" data-color="#D89DED"></div>

        <div class="absolute inset-0 rounded-full chart-hover-zone cursor-pointer" 
            style="background: conic-gradient(transparent 0% 90%, #E76F51 90% 100%); mask-image: radial-gradient(transparent 58%, black 60%); -webkit-mask-image: radial-gradient(transparent 58%, black 60%);"
            data-tip="No interesado: 0" data-color="#E76F51"></div>

        <!-- Único elemento visual para la dona. data-slices mapea rangos (%) a label/color -->

        <div class="absolute inset-0 rounded-full chart-hover-zone cursor-pointer" 
            style="background: conic-gradient(#6366F1 0% 40%, #71C6A0 40% 65%, #E9C46A 65% 80%, #D89DED 80% 90%, #E76F51 90% 100%); mask-image: radial-gradient(transparent 58%, black 60%); -webkit-mask-image: radial-gradient(transparent 58%, black 60%);"
            data-slices='[{"label":"Pendiente: 3","color":"#6366F1","start":0,"end":40},{"label":"Llamado: 2","color":"#71C6A0","start":40,"end":65},{"label":"No contesta: 1","color":"#E9C46A","start":65,"end":80},{"label":"Interesado: 1","color":"#D89DED","start":80,"end":90},{"label":"No interesado: 0","color":"#E76F51","start":90,"end":100}]'
            data-center-tip="7 Total"></div>

        <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm">
                <span class="text-slate-400 font-bold text-sm">7 Total</span>
            </div>
        </div>
    </div>


    <div class="mt-8 grid grid-cols-3 gap-x-4 gap-y-2">
        <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm bg-[#6366F1]"></div><span class="text-[9px] font-bold text-slate-400 uppercase">Pendiente</span></div>
        <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm bg-[#71C6A0]"></div><span class="text-[9px] font-bold text-slate-400 uppercase">Llamado</span></div>
        <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm bg-[#E9C46A]"></div><span class="text-[9px] font-bold text-slate-400 uppercase">No contesta</span></div>
        <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm bg-[#D89DED]"></div><span class="text-[9px] font-bold text-slate-400 uppercase">Interesado</span></div>
        <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm bg-[#E76F51]"></div><span class="text-[9px] font-bold text-slate-400 uppercase">No interesado</span></div>
    </div>
</div>



    `,

    // 2. LOGIC: Ejecución y comportamiento
    logic: function() {
        // --- 1. EXTRACCIÓN QUIRÚRGICA DE DATOS REALES ---
        const candidatos = JSON.parse(localStorage.getItem('candidatos_riwicalls')) || [];
        //const total = candidatos.length;
        // Conteos por estado (asegúrate de que coincidan con los nombres en tu tabla/excel)
        //const admitidos = candidatos.filter(c => c.estado === 'Admitido').length;
        //const interesados = candidatos.filter(c => c.estado === 'Interesado').length;
        //const inscritos = candidatos.filter(c => c.estado === 'Inscrito').length;
        //const llamados = candidatos.filter(c => c.estado === 'Llamado').length;
        //const noInteresados = candidatos.filter(c => c.estado === 'No interesado').length;
        
        // Conteos por género
        //const hombres = candidatos.filter(c => (c.genero || c.Género) === 'Masculino').length;
        //const mujeres = candidatos.filter(c => (c.genero || c.Género) === 'Femenino').length;
        //const pctHombres = total > 0 ? (hombres / total) * 100 : 50;

        // --- DATOS QUEMADOS (HARDCODED) ---
        const total = 10;
        const interesados = 2;
        const llamadas = 7;
        const admitidos = 1;

        // --- RENDER DE LA BARRA SUPERIOR ---
        const metContainer = document.getElementById('metricas-container');
        if (metContainer) {
            metContainer.innerHTML = `
                ${this._renderMetric('Total Candidatos', total, 'users')}
                ${this._renderMetric('Interesados', interesados, 'star')}
                ${this._renderMetric('Llamadas Realizadas', llamadas, 'phone-call')}
                ${this._renderMetric('Admitidos', admitidos, 'check-circle')}
            `;
        }

// Para que los iconos se dibujen, añade esta línea al final de la lógica si no la tienes:
if (window.lucide) lucide.createIcons();        
        // --- 2. RENDER MÉTRICAS SUPERIORES (USANDO DATA REAL) ---
        //const metContainer = document.getElementById('metricas-container');

        // --- RENDER EDAD ---
        const edadContainer = document.getElementById('barras-edad-container');
        if (edadContainer) {
            const datosEdad = [
                { range: '17-22', count: 4, height: '100%' },
                { range: '22-30', count: 4, height: '100%' },
                { range: '30-35', count: 2, height: '50%' }
            ];
            edadContainer.innerHTML = datosEdad.map(d => `
                <div class="chart-hover-zone group relative flex flex-col items-center w-40" style="height: ${d.height};" 
                    data-tip-hombres="${d.count} Candidatos" data-tip-mujeres="Rango ${d.range}">
                    <div class="w-full bg-[#6366F1] rounded-lg h-full cursor-pointer hover:brightness-110 shadow-sm"></div>
                </div>
            `).join('');
        }

        // --- RENDER FILA 3 (Jornada, Educacion, Ubicacion) ---
        const secondRowContainer = document.getElementById('second-row-container');
        if (secondRowContainer) {
            secondRowContainer.innerHTML = `
                <div>${this._renderChartJornada()}</div>
                <div>${this._renderChartEducacion()}</div>
                <div>${this._renderChartUbicacion()}</div>
            `;
        }

        // --- RENDER FILA 4 (Programacion, Inscripciones) ---
        const thirdRowContainer = document.getElementById('third-row-container');
        if (thirdRowContainer) {
            thirdRowContainer.innerHTML = `
                <div>${this._renderChartNivelProgramacion()}</div>
                <div>${this._renderChartInscripciones()}</div>
            `;
        }

        // --- MOTOR DE TOOLTIPS ---
        this._initTooltips();
        if (window.lucide) lucide.createIcons();
    },

    // 3. MÉTODOS PRIVADOS (Componentes)
    _renderMetric: function(label, val, icon) {
        return `
        <div class="card flex justify-between items-center">
            <div>
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${label}</p>
                <h3 class="text-2xl font-black text-slate-800 mt-1">${val}</h3>
            </div>
            <div class="p-3 bg-indigo-50 rounded-xl"><i data-lucide="${icon}" class="metric-icon"></i></div>
        </div>`;
    },

    _renderChartJornada: function() {
        return `
        <div class="card flex flex-col items-center">
            <h4 class="text-slate-500 text-[10px] font-black uppercase tracking-widest self-start mb-10">Jornada</h4>
            <div class="relative w-40 h-40 group chart-hover-zone" data-tip-hombres="5 Mañana" data-tip-mujeres="5 Tarde">
                <div class="w-full h-full rounded-full cursor-pointer" style="background: conic-gradient(#6366F1 0% 50%, #71C6A0 50% 100%); mask-image: radial-gradient(transparent 45%, black 46%); -webkit-mask-image: radial-gradient(transparent 45%, black 46%);"></div>
            </div>
            <div class="mt-12 flex gap-6">
                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm" style="background: #6366F1;"></div><span class="text-[10px] font-bold text-slate-400 uppercase">Mañana</span></div>
                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm" style="background: #71C6A0;"></div><span class="text-[10px] font-bold text-slate-400 uppercase">Tarde</span></div>
            </div>
        </div>`;
    },

    _renderChartEducacion: function() {
        const datos = [
            { label: 'Bachiller', count: 4, h: '100%' },
            { label: 'Técnico', count: 3, h: '75%' },
            { label: 'Profesional', count: 3, h: '75%' }
        ];

        return `
        <div class="card flex flex-col h-full">
            <h4 class="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6">Nivel Educativo</h4>
            <div class="flex h-48 w-full">
                <div class="flex flex-col justify-between text-[10px] font-bold text-slate-400 pr-3 pb-6">
                    <span>4</span><span>3</span><span>2</span><span>1</span><span>0</span>
                </div>

                <div class="flex-1 relative border-l border-b border-slate-200">
                    <div class="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        <div class="border-t border-slate-100 border-dashed w-full h-0"></div>
                        <div class="border-t border-slate-100 border-dashed w-full h-0"></div>
                        <div class="border-t border-slate-100 border-dashed w-full h-0"></div>
                        <div class="border-t border-slate-100 border-dashed w-full h-0"></div>
                    </div>

                    <div class="relative z-10 flex items-end justify-around h-full w-full px-4">
                        ${datos.map(d => `
                            <div class="chart-hover-zone group relative w-12 flex flex-col items-center" 
                                style="height: ${d.h};"
                                data-tip-hombres="${d.count} Candidatos" 
                                data-tip-mujeres="Nivel: ${d.label}">
                                
                                <div class="w-full bg-[#71C6A0] rounded-t-md transition-all hover:brightness-110 cursor-pointer shadow-sm" 
                                    style="height: 100%;"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="flex justify-around text-[9px] font-bold text-slate-400 uppercase ml-12 mt-2">
                <span>Bachiller</span><span>Técnico</span><span>Profesional</span>
            </div>
        </div>`;
    },

    _renderChartUbicacion: function() {
        return `
        <div class="card flex flex-col items-center h-full">
            <h4 class="text-slate-500 text-[10px] font-black uppercase tracking-widest self-start mb-10">Ubicación</h4>
            <div class="relative w-40 h-40 group chart-hover-zone" data-tip-hombres="6 Medellín" data-tip-mujeres="4 Otros">
                <div class="w-full h-full rounded-full" style="background: conic-gradient(#6366F1 0% 60%, #71C6A0 60% 100%); mask-image: radial-gradient(transparent 45%, black 46%); -webkit-mask-image: radial-gradient(transparent 45%, black 46%);"></div>
            </div>
            <div class="mt-14 flex gap-6">
                <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm" style="background: #6366F1;"></div><span class="text-[10px] font-bold text-slate-400 uppercase">Medellín</span></div>
            </div>
        </div>`;
    },

    _renderChartNivelProgramacion: function() {
        const datos = [
            { label: 'Ninguno', count: 4, h: '100%' },
            { label: 'Básico', count: 3, h: '75%' },
            { label: 'Intermedio', count: 2, h: '50%' },
            { label: 'Avanzado', count: 1, h: '25%' }
        ];

        return `
        <div class="card flex flex-col h-full">
            <h4 class="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6">Nivel de Programación</h4>
            <div class="flex h-48 w-full">
                <div class="flex flex-col justify-between text-[10px] font-bold text-slate-400 pr-3 pb-6">
                    <span>4</span><span>3</span><span>2</span><span>1</span><span>0</span>
                </div>
                
                <div class="flex-1 relative border-l border-b border-slate-200">
                    <div class="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        <div class="border-t border-slate-100 border-dashed w-full h-0"></div>
                        <div class="border-t border-slate-100 border-dashed w-full h-0"></div>
                        <div class="border-t border-slate-100 border-dashed w-full h-0"></div>
                        <div class="border-t border-slate-100 border-dashed w-full h-0"></div>
                    </div>

                    <div class="relative z-10 flex items-end justify-around h-full w-full px-2">
                        ${datos.map(d => `
                            <div class="chart-hover-zone group relative w-14" style="height: ${d.h};"
                                data-tip-hombres="${d.count} Estudiantes" data-tip-mujeres="Nivel: ${d.label}">
                                <div class="w-full bg-[#E0A7FF] rounded-t-md h-full transition-all hover:brightness-105 cursor-pointer"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="flex justify-around text-[9px] font-bold text-slate-400 uppercase ml-12 mt-2">
                <span>Ninguno</span><span>Básico</span><span>Intermedio</span><span>Avanzado</span>
            </div>
        </div>`;
    },

    _renderChartInscripciones: function() {
        const dias = ['jue', 'vie', 'sáb', 'dom', 'lun', 'mar', 'mié'];
        
        // Supongamos que estos son tus datos actuales por día
        const inscritosPorDia = 0; 

        return `
        <div class="card flex flex-col h-full">
            <h4 class="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6">Inscripciones</h4>
            <div class="flex h-48 w-full">
                <div class="flex flex-col justify-between text-[10px] font-bold text-slate-400 pr-3 pb-6">
                    <span>4</span><span>3</span><span>2</span><span>1</span><span>0</span>
                </div>

                <div class="flex-1 relative border-l border-b border-slate-200">
                    <div class="absolute inset-0 flex flex-col justify-between pointer-events-none">
                        <div class="border-t border-slate-100 border-dashed w-full h-0"></div>
                        <div class="border-t border-slate-100 border-dashed w-full h-0"></div>
                        <div class="border-t border-slate-100 border-dashed w-full h-0"></div>
                        <div class="border-t border-slate-100 border-dashed w-full h-0"></div>
                    </div>

                    <div class="absolute bottom-0 w-full h-[2px] bg-indigo-500"></div>

                    <div class="relative z-10 flex items-end justify-around h-full w-full px-2">
                        ${dias.map(dia => `
                            <div class="chart-hover-zone flex flex-col items-center justify-end h-full pb-0 mb-[-6px]" 
                                data-tip-hombres="${inscritosPorDia} Candidatos" 
                                data-tip-mujeres="Día: ${dia}">
                                <div class="w-3 h-3 bg-indigo-500 rounded-full border-2 border-white shadow-sm cursor-pointer hover:scale-150 transition-transform"></div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="flex justify-around text-[9px] font-bold text-slate-400 uppercase ml-12 mt-2">
                ${dias.map(d => `<span>${d}</span>`).join('')}
            </div>
        </div>`;
    },
    
    
    _initTooltips: function() {
    let oldTooltip = document.querySelector('.custom-tooltip');
    if (oldTooltip) oldTooltip.remove();

    const tooltip = document.createElement('div');
    tooltip.className = 'custom-tooltip';
    Object.assign(tooltip.style, {
        position: 'fixed',
        background: '#1e293b',
        color: 'white',
        padding: '10px 14px',
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: '10000',
        display: 'none',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
        pointerEvents: 'none',
        fontFamily: 'Inter, sans-serif'
    });
    document.body.appendChild(tooltip);

    document.querySelectorAll('.chart-hover-zone').forEach(zone => {
        zone.addEventListener('mousemove', (e) => {
            const rect = zone.getBoundingClientRect();

            const show = (text, color) => {
                tooltip.style.display = 'block';
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.top = (e.clientY + 15) + 'px';
                tooltip.innerHTML = `
                    <div style="display:flex;align-items:center;gap:8px;">
                        <span style="width:10px;height:10px;border-radius:2px;background:${color}"></span>
                        <span style="font-weight:700;font-size:13px;">${text}</span>
                    </div>
                `;
            };

            // 1) data-tip explícito (elementos individuales)
            if (zone.dataset.tip) {
                show(zone.dataset.tip, zone.dataset.color || '#6366F1');
                return;
            }

            // 2) dona multi-color con data-slices
            if (zone.dataset.slices) {
                let slices;
                try { slices = JSON.parse(zone.dataset.slices); } catch (err) { slices = null; }
                if (Array.isArray(slices)) {
                    const cx = rect.left + rect.width / 2;
                    const cy = rect.top + rect.height / 2;
                    const dx = e.clientX - cx;
                    const dy = e.clientY - cy;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const outerR = rect.width / 2;
                    const innerR = outerR * 0.58; // coincide con mask 58%
                    if (dist < innerR) {
                        const centerText = zone.dataset.centerTip || '';
                        if (centerText) show(centerText, '#111827'); else tooltip.style.display = 'none';
                        return;
                    }
                    let angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360 + 90) % 360;
                    const percent = angle / 360 * 100;
                    const found = slices.find(s => percent >= s.start && percent < s.end);
                    if (found) {
                        show(found.label, found.color || '#6366F1');
                        return;
                    }
                }
            }

            // 3) fallback para gráficos A/B (tipHombres / tipMujeres)
            const esCircular = Math.abs(rect.width - rect.height) < 10;
            const usarLadoA = esCircular ? (e.clientX - rect.left > rect.width / 2) : (e.clientY - rect.top < rect.height / 2);
            const textoAMostrar = zone.dataset.tip || (usarLadoA ? zone.dataset.tipHombres : zone.dataset.tipMujeres);
            const colorCirculo = zone.dataset.color || (usarLadoA ? '#6366F1' : '#71C6A0');

            if (textoAMostrar) show(textoAMostrar, colorCirculo);
            else tooltip.style.display = 'none';
        });

        zone.addEventListener('mouseleave', () => {
            tooltip.style.display = 'none';
        });
    });
    

    
    

// --- RENDER ESTADO DE CANDIDATOS ---
const candidatosBarras = document.getElementById('barras-estado-candidatos');
if (candidatosBarras) {
    const estados = [
        { label: 'Filtro CI', val: 0, w: '50%' },
        { label: 'Inscrito', val: 3, w: '100%' },
        { label: 'Llamado', val: 2, w: '66%' },
        { label: 'Interesado', val: 2, w: '66%' },
        { label: 'En proceso', val: 1, w: '33%' },
        { label: 'Admitido', val: 1, w: '33%' },
        { label: 'No interesado', val: 1, w: '33%' }
    ];

    candidatosBarras.innerHTML = estados.map(est => `
        <div class="chart-hover-zone group relative h-6 w-full" 
            data-tip-hombres="${est.val} Candidatos" data-tip-mujeres="Estado: ${est.label}">
            <div class="h-full bg-[#6366F1] rounded-r-full transition-all hover:brightness-110 cursor-pointer shadow-sm" 
                style="width: ${est.w};"></div>
        </div>
    `).join('');
}
    }
};