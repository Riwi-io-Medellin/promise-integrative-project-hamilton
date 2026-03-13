export const Seguimiento = {
    title: 'Seguimiento de Estados',
    cssPath: 'src/css/seguimiento.css',
    template: `
    <div class="seguimiento-wrapper animate-in">
        <div class="pipeline-card">
            <div class="pipeline-steps" id="summary-steps"></div>
        </div>

        <div class="kanban-container" id="kanban-board"></div>
    </div>
    `,

    logic: function() {
        const board = document.getElementById('kanban-board');
        const summary = document.getElementById('summary-steps');
        if (!board || !summary) return;

        const datosGuardados = localStorage.getItem('candidatos_riwicalls');
        const listaCandidatos = datosGuardados ? JSON.parse(datosGuardados) : [];

        // Pipeline vacío por defecto (orden claro)
        this._pipelineData = {
            inscritos: [],
            llamar: [],
            interesados: [],
            enProceso: [],
            admitidos: [],
            noInteresado: []
        };

        // Normalización y mapeo de fases
        const mapeo = {
            'INSCRITO': 'inscritos', 'INSCRITOS': 'inscritos', 'INSCRIBIR': 'inscritos',
            'LLAMAR': 'llamar', 'LLAMADO': 'llamar', 'LLAMADOS': 'llamar',
            'INTERESADO': 'interesados', 'INTERESADOS': 'interesados',
            'ENPROCESO': 'enProceso', 'EN_PROCESO': 'enProceso', 'EN PROCESO': 'enProceso',
            'EN PROCESO': 'enProceso',
            'ADMITIDO': 'admitidos', 'ADMITADOS': 'admitidos',
            'NO_INTERESADO': 'noInteresado', 'NO_INTERESADOS': 'noInteresado'
        };

        // Si hay candidatos, agrupamos por fase_actual (normalizando nombres)
        listaCandidatos.forEach(c => {
            const faseRaw = (c.fase_actual || 'inscritos').toString();
            const key = mapeo[faseRaw.toUpperCase()] || (this._pipelineData[faseRaw] ? faseRaw : 'inscritos');
            if (!this._pipelineData[key]) this._pipelineData[key] = [];
            this._pipelineData[key].push(c);
        });

        // Render summary
        summary.innerHTML = '';
        Object.keys(this._pipelineData).forEach((key) => {
            const count = this._pipelineData[key].length;
            const div = document.createElement('div');
            div.className = 'step-box';
            // etiqueta amigable
            const label = key === 'enProceso' ? 'En proceso' : (key === 'noInteresado' ? 'No interesado' : key.charAt(0).toUpperCase() + key.slice(1));
            div.innerHTML = `<span class="step-num">${count}</span><span class="step-label">${label}</span>`;
            summary.appendChild(div);
        });

        // Render kanban columns (crear columna por cada key)
        board.innerHTML = '';
        Object.keys(this._pipelineData).forEach(key => {
            const colContainer = document.createElement('div');
            colContainer.className = 'kanban-column';

            const items = this._pipelineData[key];
            const label = key === 'enProceso' ? 'En proceso' : (key === 'noInteresado' ? 'No interesado' : key.charAt(0).toUpperCase() + key.slice(1));
            colContainer.innerHTML = `
                <div class="kanban-col-title">
                    <span>${label}</span>
                    <span class="col-count">${items.length}</span>
                </div>
                <div class="kanban-col" data-key="${key}"></div>
            `;

            const colInner = colContainer.querySelector('.kanban-col');
            items.forEach(it => {
                const card = document.createElement('div');
                card.className = 'candidate-card';
                card.innerHTML = `<span class="can-name">${it.nombre || it.form_name || 'Sin nombre'}</span><span class="can-id">${it.numero_documento || it.id || ''}</span>`;
                colInner.appendChild(card);
            });

            board.appendChild(colContainer);
        });
    }
};
