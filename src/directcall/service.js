const env = require('../config/env');
const {
    countActiveCalls,
    getDispatchContextByCandidateId,
} = require('../schedulers/dispatcher/repository');
const { buildElevenLabsRequest } = require('../schedulers/dispatcher/payloadBuilder');
const { createOutboundCall } = require('../schedulers/dispatcher/elevenLabsClient');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function toBoolean(value) {
    return value === true || value === 'true' || value === 1 || value === '1';
}

function buildHttpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}

async function triggerDirectCall(payload) {
    const body = payload || {};
    const candidatoId = String(body.candidato_id || '').trim();
    const force = toBoolean(body.force);

    if (!UUID_RE.test(candidatoId)) {
        throw buildHttpError(400, 'candidato_id invalido, se espera UUID');
    }

    if (!force) {
        const active = await countActiveCalls();
        if (active >= env.DISPATCH_MAX_CONCURRENT) {
            throw buildHttpError(
                409,
                `No hay cupos de dispatch (${active}/${env.DISPATCH_MAX_CONCURRENT}). Usa force=true si quieres forzarla.`
            );
        }
    }

    const row = await getDispatchContextByCandidateId(candidatoId);
    if (!row) {
        throw buildHttpError(404, `No existe candidato ${candidatoId}`);
    }

    if (!row.telefono || !String(row.telefono).trim()) {
        throw buildHttpError(400, 'El candidato no tiene telefono valido para llamada saliente');
    }

    const requestBody = buildElevenLabsRequest(row, env);
    const providerResponse = await createOutboundCall(requestBody);

    return {
        ok: true,
        mode: 'DIRECT_CALL',
        forced: force,
        candidato_id: candidatoId,
        provider_response: providerResponse,
    };
}

module.exports = {
    triggerDirectCall,
};

