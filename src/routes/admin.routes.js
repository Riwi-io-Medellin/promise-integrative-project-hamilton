// Archivo: src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const ngrok = require('ngrok');

// LISTA BLANCA ACTUALIZADA (Sin llenar-cola.js)
const ALLOWED_SCRIPTS = [
    'test-db-connection.js',
    'resetear-bd.js',
    'trigger-masivo-chatbot.js',
    'ver-payload-candidato.js',
    'diagnostico-red.js',
    'test-chatbot-directo.js',
    'test-chatbot.js',
    'test-webhook-escenarios.js',
    'test-webhook-respuesta.js',
    'get-candidatos.js',
    'check-candidate.js',
    'reset-candidato.js'
];

// Endpoint para ejecutar scripts
router.post('/run-script', (req, res) => {
    const { scriptName, arg, flag } = req.body;

    if (!ALLOWED_SCRIPTS.includes(scriptName)) {
        return res.status(403).json({ output: `❌ Error: El script '${scriptName}' no está permitido.` });
    }

    let safeArg = arg ? arg.replace(/[;&|`$]/g, '') : '';
    let safeFlag = flag === '--total' ? '--total' : '';

    const cmdParts = ['node', `scripts/${scriptName}`];
    if (safeFlag) cmdParts.push(safeFlag);
    if (safeArg) cmdParts.push(safeArg);

    const command = cmdParts.join(' ');

    exec(command, (error, stdout, stderr) => {
        if (error) {
            return res.status(500).json({ output: `⚠️ Error de ejecución:\n${stderr || error.message}` });
        }
        res.json({ output: stdout || '✅ Ejecutado correctamente (sin salida en consola).' });
    });
});

// Endpoint de ngrok
router.post('/start-ngrok', async (req, res) => {
    try {
        const port = process.env.PORT || 3000;
        const url = await ngrok.connect(port);
        res.json({ output: `✅ Ngrok conectado exitosamente.\nURL: ${url}`, url: url });
    } catch (err) {
        res.status(500).json({ output: `❌ Error al iniciar Ngrok:\n${err.message}` });
    }
});

module.exports = router;
