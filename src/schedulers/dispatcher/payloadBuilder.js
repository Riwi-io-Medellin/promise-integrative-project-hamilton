const { formatEventDate, formatPreferredTime } = require('../../utils/dateFormatters');

function parseJsonValue(value, fallback) {
    if (value == null) return fallback;
    if (typeof value !== 'string') return value;

    try {
        return JSON.parse(value);
    } catch (_) {
        return fallback;
    }
}

function normalizeText(value, fallback = '') {
    if (value == null) return fallback;
    const text = String(value).trim();
    return text || fallback;
}

function buildListaHorarios(row, events) {
    const options = events.slice(0, 3).map((event) => event.fecha_legible);
    if (options.length === 1) {
        return options[0];
    }
    if (options.length === 2) {
        return `${options[0]} o ${options[1]}`;
    }
    if (options.length === 3) {
        return `${options[0]} o ${options[1]}, o tambien ${options[2]}`;
    }

    if (row.nota_horario && String(row.nota_horario).trim()) {
        return row.nota_horario.trim();
    }

    const preferred = formatPreferredTime(row.hora_preferida_llamada);
    if (preferred) {
        return `Preferencia alrededor de las ${preferred}`;
    }

    if (row.horario_descripcion && String(row.horario_descripcion).trim()) {
        return row.horario_descripcion.trim();
    }

    return '';
}

function parseEventosDisponibles(row) {
    const rawEvents = parseJsonValue(row.eventos_disponibles, []);
    if (!Array.isArray(rawEvents)) return [];

    return rawEvents
        .map((event) => ({
            fecha_legible: formatEventDate(event.fecha_hora),
            evento_id: normalizeText(event.evento_id),
        }))
        .filter((event) => event.fecha_legible && event.evento_id);
}

function buildDynamicVariables(row) {
    const events = parseEventosDisponibles(row);

    return {
        id: normalizeText(row.candidato_id),
        nombre: normalizeText([row.nombre, row.apellido].filter(Boolean).join(' ')),
        motivo: normalizeText(row.motivo),
        ciudad: normalizeText(row.ciudad),
        lista_horarios: buildListaHorarios(row, events),
        eventos_disponibles: JSON.stringify(events),
        intentos: Number(row.intentos) || 0,
        nota_previa: normalizeText(row.nota_previa),
    };
}

function buildElevenLabsRequest(row, env) {
    return {
        agent_id: env.ELEVENLABS_AGENT_ID,
        agent_phone_number_id: env.ELEVENLABS_PHONE_NUMBER_ID,
        to_number: row.telefono,
        conversation_initiation_client_data: {
            dynamic_variables: buildDynamicVariables(row),
        },
    };
}

module.exports = {
    buildElevenLabsRequest,
};
