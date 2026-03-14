// Archivo: public/app.js

const terminal = document.getElementById('terminal');
const loader = document.getElementById('loader');

// Lógica de SPA (Navegación)
function showView(viewId, element) {
    // 1. Quitar la clase 'active' de todos los items del menú
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    // 2. Ponérsela al que clickeaste
    if(element) element.classList.add('active');

    // 3. Ocultar todas las tarjetas de la derecha
    document.querySelectorAll('.info-card').forEach(el => el.classList.remove('active-view'));

    // 4. Mostrar solo la tarjeta solicitada
    document.getElementById(viewId).classList.add('active-view');
}

// Imprimir en consola
function appendToTerminal(text) {
    const time = new Date().toLocaleTimeString();
    terminal.innerHTML += `\n[${time}] > ${text}\n`;
    terminal.scrollTop = terminal.scrollHeight;
    terminal.scrollLeft = 0;
}

function clearTerminal() {
    terminal.innerHTML = `> Terminal limpiada.`;
}

// Iniciar Ngrok
async function startNgrok() {
    loader.style.display = 'block';
    appendToTerminal(`Ejecutando: npm run tunnel ...`);
    try {
        const res = await fetch('/api/admin/start-ngrok', { method: 'POST' });
        const data = await res.json();
        appendToTerminal(data.output);
    } catch (error) {
        appendToTerminal(`❌ Error de red: ${error.message}`);
    } finally { loader.style.display = 'none'; }
}

// Cargar la lista de usuarios (Guarda los usuarios en TODOS los selects de la app)
async function loadUsers() {
    // AHORA TENEMOS 3 SELECTORES EN LA APP
    const selects = [
        document.getElementById('select-payload'),
        document.getElementById('select-test-direct'),
        document.getElementById('select-reset-cand') // <-- El nuevo para Preparar Candidato
    ];

    selects.forEach(sel => { if(sel) sel.innerHTML = '<option value="">⏳ Buscando en BD...</option>'; });
    loader.style.display = 'block';

    try {
        const res = await fetch('/api/admin/run-script', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scriptName: 'get-candidatos.js' })
        });
        const data = await res.json();
        const match = data.output.match(/___JSON_START___(.*?)___JSON_END___/);

        if (match) {
            const users = JSON.parse(match[1]);
            selects.forEach(sel => {
                if(sel) {
                    sel.innerHTML = '<option value="">✅ 2. Selecciona un candidato...</option>';
                    users.forEach(u => sel.innerHTML += `<option value="${u.id}">${u.nombre} (Tel: ${u.telefono})</option>`);
                }
            });
            appendToTerminal(`✅ Se cargaron ${users.length} candidatos en los selectores.`);
        } else { throw new Error("Formato JSON no encontrado."); }
    } catch (error) { appendToTerminal(`⚠️ Error: ${error.message}`); }
    finally { loader.style.display = 'none'; }
}


// Validar selección de una vista específica antes de ejecutar
function runScriptWithSelect(scriptName, selectId) {
    const uuid = document.getElementById(selectId).value;
    if (!uuid) {
        alert('⚠️ ¡Atención!\n\nDebes hacer clic en "1. Cargar Usuarios" y seleccionar uno de la lista.');
        return;
    }
    runScript(scriptName, uuid);
}

// Motor principal
async function runScript(scriptName, arg = '', flag = '') {
    loader.style.display = 'block';
    let cmdStr = scriptName;
    if (flag) cmdStr += ` ${flag}`;
    if (arg) cmdStr += ` ${arg}`;

    appendToTerminal(`Ejecutando: node scripts/${cmdStr}`);

    try {
        const res = await fetch('/api/admin/run-script', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ scriptName, arg, flag })
        });
        const data = await res.json();
        appendToTerminal(data.output);
    } catch (error) { appendToTerminal(`❌ Error de red: ${error.message}`); }
    finally { loader.style.display = 'none'; }
}
