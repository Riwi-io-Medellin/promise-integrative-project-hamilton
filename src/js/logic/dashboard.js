export function initDashboard() {
    // Datos y estados iniciales
    const candidatos = JSON.parse(localStorage.getItem('candidatos_riwicalls')) || [];
    const total = candidatos.length || 10;
    const interesados = candidatos.filter(c => (c.fase_actual || '').toLowerCase().includes('interes')).length || 2;
    const llamadas = candidatos.filter(c => (c.intentos_llamada || 0) > 0).length || 7;
    const admitidos = candidatos.filter(c => (c.fase_actual || '').toLowerCase().includes('admit')).length || 1;

    // 1) Métricas superiores
    const metContainer = document.getElementById('metricas-container');
    if (metContainer) {
        metContainer.innerHTML = `
            ${renderMetric('Total Candidatos', total, 'users')}
            ${renderMetric('Interesados', interesados, 'star')}
            ${renderMetric('Llamadas Realizadas', llamadas, 'phone-call')}
            ${renderMetric('Admitidos', admitidos, 'check-circle')}
        `;
    }

    // 2) Barras de edad
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

    // 3) Fila 3 (Jornada, Educacion, Ubicacion)
    const secondRowContainer = document.getElementById('second-row-container');
    if (secondRowContainer) {
        secondRowContainer.innerHTML = `
            <div>${renderChartJornada()}</div>
            <div>${renderChartEducacion()}</div>
            <div>${renderChartUbicacion()}</div>
        `;
    }

    // 4) Fila 4 (Programacion, Inscripciones)
    const thirdRowContainer = document.getElementById('third-row-container');
    if (thirdRowContainer) {
        thirdRowContainer.innerHTML = `
            <div>${renderChartNivelProgramacion()}</div>
            <div>${renderChartInscripciones()}</div>
        `;
    }

    // 5) Tooltips y lucide
    initTooltips();
    if (window.lucide) window.lucide.createIcons();

    // 6) Estado de candidatos (barras)
    renderEstadoCandidatos();
}

// Helpers / componentes ligeros
function renderMetric(label, val, icon) {
    return `
    <div class="card flex justify-between items-center">
        <div>
            <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">${label}</p>
            <h3 class="text-2xl font-black text-slate-800 mt-1">${val}</h3>
        </div>
        <div class="p-3 bg-indigo-50 rounded-xl"><i data-lucide="${icon}" class="metric-icon"></i></div>
    </div>`;
}

function renderChartJornada() {
    return `
    <div class="card flex flex-col items-center">
        <h4 class="text-slate-500 text-[10px] font-black uppercase tracking-widest self-start mb-10">Jornada</h4>
        <div class="relative w-40 h-40 group chart-hover-zone" data-tip-hombres="5 Mañana" data-tip-mujeres="5 Tarde">
            <div class="w-full h-full rounded-full cursor-pointer" style="background: conic-gradient(#6366F1 0% 50%, #71C6A0 50% 100%);"></div>
        </div>
        <div class="mt-12 flex gap-6">
            <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm" style="background: #6366F1;"></div><span class="text-[10px] font-bold text-slate-400 uppercase">Mañana</span></div>
            <div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm" style="background: #71C6A0;"></div><span class="text-[10px] font-bold text-slate-400 uppercase">Tarde</span></div>
        </div>
    </div>`;
}

function renderChartEducacion() {
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
                <div class="absolute inset-0 flex flex-col justify-between pointer-events-none"></div>

                <div class="relative z-10 flex items-end justify-around h-full w-full px-4">
                    ${datos.map(d => `
                        <div class="chart-hover-zone group relative w-12 flex flex-col items-center" style="height: ${d.h};" data-tip-hombres="${d.count} Candidatos" data-tip-mujeres="Nivel: ${d.label}">
                            <div class="w-full bg-[#71C6A0] rounded-t-md transition-all hover:brightness-110 cursor-pointer shadow-sm" style="height: 100%;"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        <div class="flex justify-around text-[9px] font-bold text-slate-400 uppercase ml-12 mt-2"><span>Bachiller</span><span>Técnico</span><span>Profesional</span></div>
    </div>`;
}

function renderChartUbicacion() {
    return `
    <div class="card flex flex-col items-center h-full">
        <h4 class="text-slate-500 text-[10px] font-black uppercase tracking-widest self-start mb-10">Ubicación</h4>
        <div class="relative w-40 h-40 group chart-hover-zone" data-tip-hombres="6 Medellín" data-tip-mujeres="4 Otros">
            <div class="w-full h-full rounded-full" style="background: conic-gradient(#6366F1 0% 60%, #71C6A0 60% 100%);"></div>
        </div>
        <div class="mt-14 flex gap-6"><div class="flex items-center gap-2"><div class="w-3 h-3 rounded-sm" style="background: #6366F1;"></div><span class="text-[10px] font-bold text-slate-400 uppercase">Medellín</span></div></div>
    </div>`;
}

function renderChartNivelProgramacion() {
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
            <div class="flex flex-col justify-between text-[10px] font-bold text-slate-400 pr-3 pb-6"><span>4</span><span>3</span><span>2</span><span>1</span><span>0</span></div>
            <div class="flex-1 relative border-l border-b border-slate-200">
                <div class="relative z-10 flex items-end justify-around h-full w-full px-2">
                    ${datos.map(d => `
                        <div class="chart-hover-zone group relative w-14" style="height: ${d.h};" data-tip-hombres="${d.count} Estudiantes" data-tip-mujeres="Nivel: ${d.label}">
                            <div class="w-full bg-[#E0A7FF] rounded-t-md h-full transition-all hover:brightness-105 cursor-pointer"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        <div class="flex justify-around text-[9px] font-bold text-slate-400 uppercase ml-12 mt-2"><span>Ninguno</span><span>Básico</span><span>Intermedio</span><span>Avanzado</span></div>
    </div>`;
}

function renderChartInscripciones() {
    const dias = ['jue', 'vie', 'sáb', 'dom', 'lun', 'mar', 'mié'];
    const inscritosPorDia = 0;

    return `
    <div class="card flex flex-col h-full">
        <h4 class="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-6">Inscripciones</h4>
        <div class="flex h-48 w-full">
            <div class="flex flex-col justify-between text-[10px] font-bold text-slate-400 pr-3 pb-6"><span>4</span><span>3</span><span>2</span><span>1</span><span>0</span></div>
            <div class="flex-1 relative border-l border-b border-slate-200">
                <div class="absolute bottom-0 w-full h-[2px] bg-indigo-500"></div>
                <div class="relative z-10 flex items-end justify-around h-full w-full px-2">
                    ${dias.map(dia => `
                        <div class="chart-hover-zone flex flex-col items-center justify-end h-full pb-0 mb-[-6px]" data-tip-hombres="${inscritosPorDia} Candidatos" data-tip-mujeres="Día: ${dia}">
                            <div class="w-3 h-3 bg-indigo-500 rounded-full border-2 border-white shadow-sm cursor-pointer hover:scale-150 transition-transform"></div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
        <div class="flex justify-around text-[9px] font-bold text-slate-400 uppercase ml-12 mt-2">${dias.map(d => `<span>${d}</span>`).join('')}</div>
    </div>`;
}

function renderEstadoCandidatos() {
    const candidatosBarras = document.getElementById('barras-estado-candidatos');
    if (!candidatosBarras) return;

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
        <div class="chart-hover-zone group relative h-6 w-full" data-tip-hombres="${est.val} Candidatos" data-tip-mujeres="Estado: ${est.label}">
            <div class="h-full bg-[#6366F1] rounded-r-full transition-all hover:brightness-110 cursor-pointer shadow-sm" style="width: ${est.w};"></div>
        </div>
    `).join('');
}

function initTooltips() {
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

            if (zone.dataset.tip) { show(zone.dataset.tip, zone.dataset.color || '#6366F1'); return; }

            if (zone.dataset.slices) {
                let slices; try { slices = JSON.parse(zone.dataset.slices); } catch (err) { slices = null; }
                if (Array.isArray(slices)) {
                    const cx = rect.left + rect.width / 2;
                    const cy = rect.top + rect.height / 2;
                    const dx = e.clientX - cx; const dy = e.clientY - cy;
                    const dist = Math.sqrt(dx*dx + dy*dy);
                    const outerR = rect.width / 2; const innerR = outerR * 0.58;
                    if (dist < innerR) { const centerText = zone.dataset.centerTip || ''; if (centerText) show(centerText, '#111827'); else tooltip.style.display = 'none'; return; }
                    let angle = (Math.atan2(dy, dx) * 180 / Math.PI + 360 + 90) % 360;
                    const percent = angle / 360 * 100;
                    const found = slices.find(s => percent >= s.start && percent < s.end);
                    if (found) { show(found.label, found.color || '#6366F1'); return; }
                }
            }

            const esCircular = Math.abs(rect.width - rect.height) < 10;
            const usarLadoA = esCircular ? (e.clientX - rect.left > rect.width / 2) : (e.clientY - rect.top < rect.height / 2);
            const textoAMostrar = zone.dataset.tip || (usarLadoA ? zone.dataset.tipHombres : zone.dataset.tipMujeres);
            const colorCirculo = zone.dataset.color || (usarLadoA ? '#6366F1' : '#71C6A0');
            if (textoAMostrar) show(textoAMostrar, colorCirculo); else tooltip.style.display = 'none';
        });

        zone.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
    });
}
