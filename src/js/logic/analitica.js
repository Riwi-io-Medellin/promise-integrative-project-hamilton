export function initAnaliticaView() {
    const chartContainer = document.getElementById('chart-activity');
    if (!chartContainer) return;

    // Datos de ejemplo para las barras (alturas en %)
    const stats = [
        { day: 'Lun', value: 45, label: '45 llamadas' },
        { day: 'Mar', value: 65, label: '65 llamadas' },
        { day: 'Mie', value: 90, label: '90 llamadas' },
        { day: 'Jue', value: 75, label: '75 llamadas' },
        { day: 'Hoy', value: 95, label: '95 llamadas' }
    ];

    // Inyectamos las barras con altura 0 primero
    chartContainer.innerHTML = stats.map((s, index) => `
        <div class="bar-item" id="bar-${index}" style="height: 0%">
            <div class="bar-tooltip">${s.label}</div>
        </div>
    `).join('');

    // Disparamos la animación después de un breve delay
    setTimeout(() => {
        stats.forEach((s, index) => {
            const bar = document.getElementById(`bar-${index}`);
            if (bar) {
                bar.style.height = `${s.value}%`;
                if (s.value > 90) bar.style.background = '#10B981';
            }
        });
    }, 100);

    // Re-activar iconos
    if (window.lucide) lucide.createIcons();
}
