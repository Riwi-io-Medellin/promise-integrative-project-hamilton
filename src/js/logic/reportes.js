export function initReportesView() {
    const botones = document.querySelectorAll('.btn-dl');
    botones.forEach(boton => {
        boton.addEventListener('click', (e) => {
            const tipo = e.target.closest('.card-descarga').querySelector('h3').innerText;
            const formato = e.target.innerText;
            console.log(`Descargando reporte: ${tipo} en formato ${formato}`);
        });
    });
    if (window.lucide) lucide.createIcons();
}
