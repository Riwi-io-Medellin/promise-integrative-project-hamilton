export function initEventosView() {
    // Elementos del DOM
    const grid = document.getElementById('grid-eventos');
    const modalEv = document.getElementById('modalNuevoEvento');
    const selectCand = document.getElementById('evCandidato');
    const btnCerrarEv = document.getElementById('btnCerrarEv');
    const btnGuardarEv = document.getElementById('btnGuardarEvento');
    const btnAbrirEv = document.getElementById('btn-add-event');

    const cargarCandidatosDinamicos = () => {
        const lista = JSON.parse(localStorage.getItem('candidatos_riwicalls')) || [];
        if (!selectCand) return;
        selectCand.innerHTML = '<option value="Ninguno">Ninguno</option>';
        lista.forEach(c => {
            const nombre = c.nombre || c.Nombre || "Sin nombre";
            const opt = document.createElement('option'); opt.value = nombre; opt.textContent = nombre; selectCand.appendChild(opt);
        });
    };

    const renderizarCards = (lista) => {
        if (!grid) return;
        grid.innerHTML = lista.map((ev, index) => `
            <div class="event-card ${ev.destacado ? 'destacada' : ''}">
                <div class="card-header">
                    <h3 class="card-title">${ev.titulo || ev.nombre}</h3>
                    <span class="card-status">${ev.estado}</span>
                </div>
                <p class="card-subtitle">${ev.tipo}</p>
                <div class="info-row"><i data-lucide="calendar" class="w-4 h-4"></i><span>${ev.fecha}</span></div>
                ${ev.candidato ? `<div class="info-row"><i data-lucide="user" class="w-4 h-4"></i><span>Candidato: ${ev.candidato}</span></div>` : ''}
                <p class="card-desc">${ev.descripcion}</p>
                <div class="card-actions"><i data-lucide="pencil" class="w-4 h-4 edit-ev" data-index="${index}"></i><i data-lucide="trash-2" class="w-4 h-4 delete-ev" data-index="${index}"></i></div>
            </div>
        `).join('');
        if (window.lucide) lucide.createIcons();
    };

    // Usar únicamente localStorage; no datos hardcodeados aquí para evitar duplicados
    let eventosGuardados = JSON.parse(localStorage.getItem('eventos_riwicalls')) || [];
    renderizarCards(eventosGuardados);

    btnAbrirEv?.addEventListener('click', () => { cargarCandidatosDinamicos(); if (modalEv) modalEv.style.display = 'flex'; });
    btnCerrarEv?.addEventListener('click', () => { if (modalEv) modalEv.style.display = 'none'; });

    btnGuardarEv?.addEventListener('click', () => {
        const datosEvento = {
            titulo: document.getElementById('evNombre')?.value,
            tipo: document.getElementById('evTipo')?.value,
            estado: document.getElementById('evEstado')?.value,
            fecha: document.getElementById('evFecha')?.value || new Date().toLocaleString(),
            candidato: document.getElementById('evCandidato')?.value,
            descripcion: document.getElementById('evDescripcion')?.value
        };
        eventosGuardados.push(datosEvento);
        localStorage.setItem('eventos_riwicalls', JSON.stringify(eventosGuardados));
        renderizarCards(eventosGuardados);
        if (modalEv) modalEv.style.display = 'none';
    });

    // Delegación de eventos
    grid?.addEventListener('click', (e) => {
        const deleteBtn = e.target.closest('.delete-ev');
        const editBtn = e.target.closest('.edit-ev');
        if (deleteBtn) {
            const index = deleteBtn.getAttribute('data-index');
            if (confirm('¿Seguro que quieres eliminar este evento?')) {
                eventosGuardados.splice(index, 1);
                localStorage.setItem('eventos_riwicalls', JSON.stringify(eventosGuardados));
                renderizarCards(eventosGuardados);
            }
        }
        if (editBtn) {
            const index = editBtn.getAttribute('data-index');
            const ev = eventosGuardados[index];
            document.getElementById('evNombre').value = ev.titulo || ev.nombre || '';
            document.getElementById('evTipo').value = ev.tipo || '';
            document.getElementById('evEstado').value = ev.estado || '';
            document.getElementById('evDescripcion').value = ev.descripcion || '';
            cargarCandidatosDinamicos();
            document.getElementById('evCandidato').value = ev.candidato || 'Ninguno';
            if (modalEv) modalEv.style.display = 'flex';
        }
    });
}
