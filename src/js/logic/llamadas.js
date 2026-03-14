import { syncLlamadasFromSupabase } from '../services/supabase.js';

export function initLlamadasView() {
    const tabla = document.getElementById('lista-llamadas');
    const modal = document.getElementById('modalNuevaLlamada');
    const btnAbrir = document.getElementById('btn-nueva-llamada');
    const btnN8n = document.getElementById('btn-n8n-flow');
    let indexEdicion = null;

    let llamadas = JSON.parse(localStorage.getItem('llamadas_riwicalls')) || [];

    const renderizarFilas = (datos) => {
        if (!tabla) return;
        tabla.innerHTML = datos.map((c, index) => {
            const nombreReal = c.nombre || c.Nombre || "Sin nombre";
            const fechaMostrar = c.fechaLlamada ? new Date(c.fechaLlamada).toLocaleString() : '';

            return `
                <tr>
                    <td>
                        <div class="font-bold text-slate-700">${nombreReal}</div>
                        <div style="font-size: 11px; color: #6366F1; font-weight:500;">${c.motivo || ''}</div>
                    </td>
                    <td class="text-slate-600">${c.tel || c.Telefono || ''}</td>
                    <td><span class="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold">${c.estado}</span></td>
                    <td class="text-slate-400 text-xs">${fechaMostrar}</td>
                    <td>
                        <div style="display:flex; gap:12px; align-items:center;">
                            <i data-lucide="phone" style="color: #94A3B8; width: 16px;"></i>
                            <button class="btn-editar-gestion" data-index="${index}" style="border:none; background:none; cursor:pointer; padding:0;">
                                <i data-lucide="pencil" style="color: #6366F1; width: 16px;"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        if (window.lucide) lucide.createIcons();

        document.querySelectorAll('.btn-editar-gestion').forEach(btn => {
            btn.onclick = () => {
                indexEdicion = btn.getAttribute('data-index');
                const cand = llamadas[indexEdicion];
                document.getElementById('nuevoNombre').value = cand.nombre || cand.Nombre;
                document.getElementById('nuevoTel').value = cand.tel || cand.Telefono;
                document.getElementById('detalleMotivo').value = cand.motivo || '';
                modal.style.display = 'flex';
            };
        });
    };

    if (btnN8n) {
        btnN8n.addEventListener('click', async () => {
            const urlConfigurada = localStorage.getItem('webhook_n8n_url');
            if (!urlConfigurada) { alert('⚠️ Primero debes configurar la URL del Webhook en la sección de Configuración.'); return; }
            btnN8n.innerHTML = 'Enviando...'; btnN8n.disabled = true;
            try {
                const respuesta = await fetch(urlConfigurada, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ proyecto: "RiwiCalls", usuario: "Andrea Lizcano", datos: llamadas })
                });
                if (respuesta.ok) alert(' Flujo de n8n iniciado con éxito.');
            } catch (error) { alert(' Error de conexión con n8n. Revisa la URL en Configuración.'); }
            finally { btnN8n.innerHTML = '<i data-lucide="share-2" class="w-4 h-4"></i> Iniciar flujo con n8n'; btnN8n.disabled = false; if (window.lucide) lucide.createIcons(); }
        });
    }

    btnAbrir?.addEventListener('click', () => modal.style.display = 'flex');
    const cerrarModal = () => modal.style.display = 'none';
    document.getElementById('cerrarModal')?.addEventListener('click', cerrarModal);
    document.getElementById('btnCancelar')?.addEventListener('click', cerrarModal);

    document.getElementById('btnGuardarLlamada')?.addEventListener('click', () => {
            const motivo = document.getElementById('detalleMotivo').value;

        if (indexEdicion !== null) {
            if (llamadas[indexEdicion].estado === 'Inscrito') {
                llamadas[indexEdicion].estado = 'Llamar';
                llamadas[indexEdicion].fechaLlamada = new Date().toLocaleString();
            }
            llamadas[indexEdicion].motivo = motivo;
            localStorage.setItem('llamadas_riwicalls', JSON.stringify(llamadas));
            renderizarFilas(llamadas);
            modal.style.display = 'none';
            indexEdicion = null;
            document.getElementById('nuevoNombre').value = '';
            document.getElementById('nuevoTel').value = '';
            document.getElementById('detalleMotivo').value = '';
        } else { alert("Llena nombre y teléfono"); }
    });

    const cargarLlamadas = async () => {
        try {
            const llamadasSupabase = await syncLlamadasFromSupabase();
            if (Array.isArray(llamadasSupabase) && llamadasSupabase.length) {
                llamadas = llamadasSupabase;
                localStorage.setItem('llamadas_riwicalls', JSON.stringify(llamadas));
            }
        } catch (error) {
            console.warn('No se pudieron cargar llamadas desde Supabase:', error);
        }

        renderizarFilas(llamadas);
    };

    cargarLlamadas();
}
