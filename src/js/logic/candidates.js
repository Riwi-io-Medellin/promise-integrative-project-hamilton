import {
    configureSupabaseConnection,
    getSupabaseConnectionConfig,
    syncCandidatosFromSupabase
} from '../services/supabase.js';

export function initCandidatesView() {
    // Copiado y adaptado de la lógica original en candidatosView.js
    const inputBusqueda = document.getElementById('searchInput');
    const selectEstado = document.getElementById('filtroEstado');
    const selectGenero = document.getElementById('filtroGenero');
    const modal = document.getElementById('modalRegistro');
    const btnDropdown = document.getElementById('btnDropdownImportar');
    const menuImportar = document.getElementById('menuImportar');
    const optExcel = document.getElementById('optExcel');
    const inputFile = document.getElementById('inputFileExcel');
    const modalDB = document.getElementById('modalDB');
    const optDatabase = document.getElementById('optDatabase');
    const btnSincronizar = document.getElementById('btnSincronizar');

    let editandoIndex = null; 
    const datosEnMemoria = localStorage.getItem('candidatos_riwicalls');
    let listaOriginal = datosEnMemoria ? JSON.parse(datosEnMemoria) : [];

    const guardarEnLocal = () => { localStorage.setItem('candidatos_riwicalls', JSON.stringify(listaOriginal)); };

    const actualizarTabla = (datos) => {
        const tbody = document.getElementById('cuerpoTabla');
        if (!tbody) return;

        tbody.innerHTML = datos.map((c, index) => `
            <tr class="hover:bg-slate-50/50 transition-colors text-sm">
                <td class="px-6 py-4 font-bold text-slate-700">${c.nombre}</td>
                <td class="px-6 py-4 text-slate-500">${c.cedula}</td>
                <td class="px-6 py-4 text-slate-500">${c.edad}</td>
                <td class="px-6 py-4 text-slate-500">${c.genero}</td>
                <td class="px-6 py-4 text-slate-500">${c.tel || ''}</td>
                <td class="px-6 py-4 text-slate-500">${c.municipio}</td>
                <td class="px-6 py-4 text-slate-500">${c.educacion}</td>
                <td class="px-6 py-4 text-slate-500">${c.programacion}</td>
                <td class="px-6 py-4 text-slate-500">${c.jornada}</td>
                <td class="px-6 py-4">
                    <span class="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[11px] font-bold">${c.estado}</span>
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex items-center justify-center gap-3">
                        <button class="btn-editar text-blue-400 hover:text-blue-600 transition-colors" data-index="${index}">
                            <i data-lucide="pencil" class="w-4 h-4"></i>
                        </button>
                        <button class="btn-eliminar text-red-400 hover:text-red-600 transition-colors" data-index="${index}">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        if (window.lucide) lucide.createIcons();

        tbody.querySelectorAll('.btn-editar').forEach(btn => {
            btn.onclick = () => {
                const index = btn.getAttribute('data-index');
                const c = datos[index];
                editandoIndex = listaOriginal.indexOf(c);

                document.querySelector('#modalRegistro h2').innerText = "Editar Candidato";
                document.getElementById('btnGuardar').innerText = "Guardar Cambios";

                const nombres = c.nombre.split(' ');
                document.getElementById('regNombre').value = nombres[0] || '';
                document.getElementById('regApellido').value = nombres.slice(1).join(' ') || '';
                document.getElementById('regCedula').value = c.cedula;
                document.getElementById('regEdad').value = c.edad;
                document.getElementById('regGenero').value = c.genero;
                document.getElementById('regTel').value = c.tel || '';
                document.getElementById('regMunicipio').value = c.municipio;
                document.getElementById('regEducacion').value = c.educacion;
                document.getElementById('regProgramacion').value = c.programacion;
                document.getElementById('regJornada').value = c.jornada;
                document.getElementById('regEstado').value = c.estado;

                modal.classList.remove('hidden');
                modal.classList.add('flex');
            };
        });

        tbody.querySelectorAll('.btn-eliminar').forEach(btn => {
            btn.onclick = () => {
                const index = btn.getAttribute('data-index');
                const c = datos[index];
                if(confirm(`¿Estás seguro de eliminar a ${c.nombre}?`)) {
                    const realIndex = listaOriginal.indexOf(c);
                    listaOriginal.splice(realIndex, 1);
                    guardarEnLocal();
                    filtrar();
                }
            };
        });
    };

    const filtrar = () => {
        const busqueda = inputBusqueda.value.toLowerCase();
        const filtrados = listaOriginal.filter(c => {
            const matchBusqueda = c.nombre.toLowerCase().includes(busqueda) || c.cedula.includes(busqueda);
            const matchEstado = selectEstado.value === "Todos" || c.estado === selectEstado.value;
            const matchGenero = selectGenero.value === "Todos" || c.genero === selectGenero.value;
            return matchBusqueda && matchEstado && matchGenero;
        });
        actualizarTabla(filtrados);
    };

    const cerrar = () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        editandoIndex = null;
        document.querySelector('#modalRegistro h2').innerText = "Nuevo Candidato";
        document.getElementById('btnGuardar').innerText = "Crear Candidato";
        document.querySelectorAll('#modalRegistro input, #modalRegistro select').forEach(el => { el.value = el.defaultValue || (el.tagName === 'SELECT' ? el.options[0].value : ''); });
    };

    inputBusqueda.addEventListener('input', filtrar);
    selectEstado.addEventListener('change', filtrar);
    selectGenero.addEventListener('change', filtrar);

    document.getElementById('btnNuevoCandidato').onclick = () => { cerrar(); modal.classList.remove('hidden'); modal.classList.add('flex'); };
    document.getElementById('btnCancelar').onclick = cerrar;
    document.getElementById('btnCerrarX').onclick = cerrar;

    document.getElementById('btnGuardar').onclick = () => {
        const nuevo = {
            nombre: document.getElementById('regNombre').value + " " + document.getElementById('regApellido').value,
            cedula: document.getElementById('regCedula').value,
            edad: document.getElementById('regEdad').value,
            genero: document.getElementById('regGenero').value,
            tel: document.getElementById('regTel').value,
            municipio: document.getElementById('regMunicipio').value,
            educacion: document.getElementById('regEducacion').value,
            programacion: document.getElementById('regProgramacion').value,
            jornada: document.getElementById('regJornada').value,
            estado: document.getElementById('regEstado').value
        };

    if (nuevo.nombre.trim() && nuevo.cedula) {
        if (editandoIndex !== null) { listaOriginal[editandoIndex] = nuevo; alert("¡Candidato actualizado!"); } else { listaOriginal.unshift(nuevo); alert("¡Candidato creado!"); }
        guardarEnLocal(); filtrar(); cerrar();
    } else { alert("El nombre y la cédula son obligatorios."); }
    };

    btnDropdown.onclick = (e) => { e.stopPropagation(); menuImportar.classList.toggle('hidden'); };
    document.addEventListener('click', () => menuImportar.classList.add('hidden'));
    optExcel.onclick = () => inputFile.click();

    inputFile.onchange = (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = evt.target.result;
                const workbook = XLSX.read(data, { type: 'array' });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const datosCrudos = XLSX.utils.sheet_to_json(sheet);

                const normalizarEstado = (v) => {
                    if (v === undefined || v === null) return '';
                    const s = String(v).trim();
                    if (!s) return '';
                    const lower = s.toLowerCase();
                    if (lower.includes('inscr')) return 'Inscrito';
                    if (lower.includes('llam')) return 'Llamar';
                    if (lower.includes('proceso')) return 'En proceso';
                    if (lower.includes('admit')) return 'Admitido';
                    if (lower.includes('no') && lower.includes('interes')) return 'No Interesado';
                    return s.charAt(0).toUpperCase() + s.slice(1);
                };

                const nuevos = datosCrudos.map(fila => ({
                    nombre: fila.Nombre || fila.nombre || "Sin nombre",
                    cedula: String(fila.Cedula || fila.cedula || "0"),
                    edad: fila.Edad || fila.edad || 18,
                    genero: fila.Genero || fila.genero || "Otro",
                    tel: String(fila.Telefono || fila.telefono || ""),
                    municipio: fila.Municipio || fila.municipio || "Medellín",
                    educacion: fila.Educacion || "Bachiller",
                    programacion: fila.Programacion || "Ninguno",
                    jornada: fila.Jornada || "Mañana",
                    estado: normalizarEstado(fila.Estado || fila.estado || fila['Estado_final'] || fila['Estado Final'] || fila['estado_final'])
                }));

                listaOriginal = [...nuevos, ...listaOriginal];
                guardarEnLocal();
                filtrar();
                alert(`Importados ${nuevos.length} candidatos.`);
            } catch (err) { alert("Error con el Excel"); }
        };
        reader.readAsArrayBuffer(archivo);
        e.target.value = "";
    };

    optDatabase.onclick = () => { modalDB.classList.remove('hidden'); modalDB.classList.add('flex'); };
    const cerrarDB = () => { modalDB.classList.add('hidden'); modalDB.classList.remove('flex'); };
    document.getElementById('btnCerrarDB').onclick = cerrarDB;
    document.getElementById('btnCancelarDB').onclick = cerrarDB;

    const dbUrlInput = document.getElementById('dbUrl');
    const dbAnonKeyInput = document.getElementById('dbAnonKey');
    const connection = getSupabaseConnectionConfig();

    if (dbUrlInput) {
        dbUrlInput.value = connection.supabaseUrl || '/.netlify/edge-functions/supabase-proxy';
    }

    btnSincronizar.onclick = async () => {
        btnSincronizar.disabled = true;
        try {
            const inputUrl = String(dbUrlInput?.value || '').trim();
            const inputAnonKey = String(dbAnonKeyInput?.value || '').trim();
            const wantsDirectSupabase = /\.supabase\.co\/?$/i.test(inputUrl);
            const options = {};

            if (wantsDirectSupabase) {
                options.preferDirect = true;
                options.supabaseUrl = inputUrl;
                if (inputAnonKey) {
                    options.supabaseAnonKey = inputAnonKey;
                }
                configureSupabaseConnection(options);
            }

            const data = await syncCandidatosFromSupabase(options);
            if (Array.isArray(data)) {
                listaOriginal = data;
                guardarEnLocal();
                filtrar();
                alert("Sincronizado");
                cerrarDB();
            } else {
                alert("La respuesta no tiene formato válido.");
            }
        } catch (e) { alert(e?.message || "Error de conexión"); }
        finally { btnSincronizar.disabled = false; }
    };

    // ejecución inicial
    actualizarTabla(listaOriginal);
}
