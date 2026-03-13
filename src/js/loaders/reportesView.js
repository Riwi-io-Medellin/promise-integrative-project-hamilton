export const reportesView = {
    title: 'Reportes y Descargas',

    // 1. ESTRUCTURA (HTML y CSS)
    template: `
    <style>
        .reportes-container { padding: 32px; background: #F8FAFC; min-height: 100vh; }
        .text-hint { color: #64748B; font-size: 14px; margin-bottom: 24px; }
        
        /* Grid de tarjetas */
        .grid-descargas { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 24px; margin-bottom: 40px; }
        
        .card-descarga { background: white; padding: 24px; border-radius: 24px; border: 1px solid #E2E8F0; transition: all 0.3s ease; }
        .card-descarga:hover { transform: translateY(-5px); box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); border-color: #C7D2FE; }
        
        .card-icon { width: 48px; height: 48px; background: #F5F3FF; color: #6366F1; border-radius: 12px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        
        .card-info h3 { font-size: 18px; font-weight: 700; color: #1E293B; margin-bottom: 4px; }
        .card-info p { font-size: 13px; color: #64748B; margin-bottom: 20px; }
        
        .btn-group { display: flex; gap: 12px; }
        .btn-dl { flex: 1; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 10px; border-radius: 12px; font-size: 13px; font-weight: 700; cursor: pointer; transition: 0.2s; border: none; }
        .btn-csv { background: #6366F1; color: white; }
        .btn-json { background: #F1F5F9; color: #475569; }
        .btn-dl:active { transform: scale(0.95); }

        /* Sección de Resumen */
        .resumen-card { background: white; padding: 32px; border-radius: 24px; border: 1px solid #E2E8F0; }
        .grid-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        .stat-item { padding: 20px; text-align: center; border-radius: 16px; background: #F8FAFC; border: 1px solid #F1F5F9; }
        .stat-value { font-size: 24px; font-weight: 800; color: #1E293B; display: block; }
        .stat-label { font-size: 12px; color: #94A3B8; font-weight: 600; text-transform: uppercase; }
    </style>

    <div class="reportes-container animate-in">
        <h1 class="text-2xl font-black text-slate-800 mb-2">Centro de Reportes</h1>
        <p class="text-hint">Exporta los datos de RiwiCalls en formatos estándar para análisis externo.</p>

        <div class="grid-descargas">
            <div class="card-descarga">
                <div class="card-icon"><i data-lucide="users"></i></div>
                <div class="card-info">
                    <h3>Candidatos</h3>
                    <p>Base de datos completa de inscritos.</p>
                </div>
                <div class="btn-group">
                    <button class="btn-dl btn-csv" onclick="alert('Generando CSV de Candidatos...')">CSV</button>
                    <button class="btn-dl btn-json">JSON</button>
                </div>
            </div>

            <div class="card-descarga">
                <div class="card-icon"><i data-lucide="phone-call"></i></div>
                <div class="card-info">
                    <h3>Llamadas</h3>
                    <p>Historial de interacciones de la IA.</p>
                </div>
                <div class="btn-group">
                    <button class="btn-dl btn-csv">CSV</button>
                    <button class="btn-dl btn-json">JSON</button>
                </div>
            </div>

            <div class="card-descarga">
                <div class="card-icon"><i data-lucide="calendar"></i></div>
                <div class="card-info">
                    <h3>Eventos</h3>
                    <p>Log de actividades del sistema.</p>
                </div>
                <div class="btn-group">
                    <button class="btn-dl btn-csv">CSV</button>
                    <button class="btn-dl btn-json">JSON</button>
                </div>
            </div>
        </div>

        <div class="resumen-card">
            <h4 class="text-slate-400 font-bold uppercase text-xs mb-6 tracking-widest">Resumen General</h4>
            <div class="grid-stats">
                <div class="stat-item">
                    <span class="stat-value">10</span>
                    <span class="stat-label">Registros</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">60%</span>
                    <span class="stat-label">Conversión</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">5</span>
                    <span class="stat-label">Municipios</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">12h</span>
                    <span class="stat-label">Optimizadas</span>
                </div>
            </div>
        </div>
    </div>
    `,

    // 2. LÓGICA (Funcionalidad de botones)
    logic: function() {
        // Seleccionamos todos los botones de descarga
        const botones = document.querySelectorAll('.btn-dl');
        
        botones.forEach(boton => {
            boton.addEventListener('click', (e) => {
                const tipo = e.target.closest('.card-descarga').querySelector('h3').innerText;
                const formato = e.target.innerText;
                console.log(`Descargando reporte: ${tipo} en formato ${formato}`);
                // Aquí podrías integrar una librería como XLSX o simplemente un console.log por ahora
            });
        });

        if (window.lucide) lucide.createIcons();
    }
};