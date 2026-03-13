export function initSeguimientoView() {
    const board = document.getElementById('kanban-board');
    const summary = document.getElementById('summary-steps');
    if (!board || !summary) return;

    const datosGuardados = localStorage.getItem('candidatos_riwicalls');
    const listaCandidatos = datosGuardados ? JSON.parse(datosGuardados) : [];

    const pipelineData = {
        'inscritos': [],
        'llamar': [],
        'enProceso': [],
        'admitidos': [],
        'noInteresado': []
    };

    listaCandidatos.forEach(can => {
        const estadoCandidato = can.estado ? can.estado.toLowerCase() : 'inscritos';
        if (estadoCandidato.includes('admitido')) pipelineData['admitidos'].push(can);
        else if (estadoCandidato.includes('proceso')) pipelineData['enProceso'].push(can);
        else if (estadoCandidato.includes('no interesado') || estadoCandidato.includes('nointeresado')) pipelineData['noInteresado'].push(can);
        else if (estadoCandidato.includes('llamar')) pipelineData['llamar'].push(can);
        else pipelineData['inscritos'].push(can);
    });

    const columnas = [
        { key: 'inscritos', label: 'Inscritos' },
        { key: 'llamar', label: 'Llamar' },
        { key: 'enProceso', label: 'En proceso' },
        { key: 'admitidos', label: 'Admitidos' },
        { key: 'noInteresado', label: 'No Interesado' }
    ];

    summary.innerHTML = columnas.map((col, index) => `
        <div class="step-box">
            <span class="step-num">${pipelineData[col.key].length}</span>
            <span class="step-label">${col.label}</span>
        </div>
        ${index < columnas.length - 1 ? '<i data-lucide="arrow-right" class="text-slate-300 w-4 h-4"></i>' : ''}
    `).join('');

    board.innerHTML = columnas.map(col => `
        <div class="kanban-col">
            <div class="kanban-col-title">
                <span>${col.label}</span>
                <span class="col-count">${pipelineData[col.key].length}</span>
            </div>
            <div class="cards-list">
                ${pipelineData[col.key].map(can => `
                    <div class="candidate-card p-3 mb-2 bg-white rounded-lg shadow-sm border border-slate-100">
                        <span class="can-name block font-bold text-slate-700 text-sm">${can.nombre}</span>
                        <span class="can-id block text-[10px] text-slate-400">CC: ${can.cedula}</span>
                        <span class="text-[10px] text-indigo-500 font-medium">${can.municipio || 'Medellín'}</span>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
}
