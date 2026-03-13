const ALLOWED_RESULTS = new Set([
    'AGENDADO',
    'PENDIENTE',
    'NO_INTERESADO',
    'NUMERO_INCORRECTO',
    'BUZON_VOZ',
]);

function normalizeResult(value) {
    return String(value || '').trim().toUpperCase();
}

function parseOptionalInt(value) {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
}

function normalizePostCallPayload(payload) {
    const data = payload || {};
    const resultado = normalizeResult(data.resultado);
    if (!ALLOWED_RESULTS.has(resultado)) {
        throw new Error(`Resultado no soportado: ${data.resultado}`);
    }

    const candidatoId = String(data.candidato_id || '').trim();
    if (!candidatoId) {
        throw new Error('candidato_id es requerido');
    }

    return {
        resultado,
        candidatoId,
        dia: data.dia ? String(data.dia).trim() : null,
        hora: data.hora ? String(data.hora).trim() : null,
        nota: data.nota ? String(data.nota).trim() : null,
        fechaSeleccionadaLegible: data.fecha_seleccionada_legible ? String(data.fecha_seleccionada_legible).trim() : null,
        eventoId: parseOptionalInt(data.evento_id),
        conversationId: data.conversation_id ? String(data.conversation_id).trim() : null,
    };
}

module.exports = {
    normalizePostCallPayload,
};

