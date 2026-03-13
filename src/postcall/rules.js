const RESULT_RULES = {
    AGENDADO: {
        resultadoLlamadaCodigo: 'AGENDADO',
        estadoGestionCodigo: 'AGENDADO',
        queueState: 'COMPLETADA',
        updateMode: 'AGENDADO',
        requiresEvent: true,
    },
    PENDIENTE: {
        resultadoLlamadaCodigo: 'COMPLETADO',
        estadoGestionCodigo: 'PENDIENTE',
        queueState: 'COMPLETADA',
        updateMode: 'RETRY_SHIFT',
        requiresEvent: false,
    },
    NO_INTERESADO: {
        resultadoLlamadaCodigo: 'COMPLETADO',
        estadoGestionCodigo: 'DESCARTADO',
        queueState: 'COMPLETADA',
        updateMode: 'ESTADO',
        requiresEvent: false,
    },
    NUMERO_INCORRECTO: {
        resultadoLlamadaCodigo: 'NUM_INVALIDO',
        estadoGestionCodigo: 'DESCARTADO',
        queueState: 'COMPLETADA',
        updateMode: 'ESTADO',
        requiresEvent: false,
    },
    BUZON_VOZ: {
        resultadoLlamadaCodigo: 'NO_CONTESTA',
        estadoGestionCodigo: 'NO_CONTESTA',
        queueState: 'COMPLETADA',
        updateMode: 'RETRY_SHIFT',
        requiresEvent: false,
    },
};

function getNextFranja(current) {
    if (current === 'manana') return 'tarde';
    if (current === 'tarde') return 'noche';
    return 'manana';
}

module.exports = {
    RESULT_RULES,
    getNextFranja,
};
