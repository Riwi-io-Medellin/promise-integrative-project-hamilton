const env = require('../config/env');
const { getClient } = require('../config/postgres');
const { normalizePostCallPayload } = require('./normalizer');
const { RESULT_RULES, getNextFranja } = require('./rules');
const {
    FIND_CANDIDATE_FOR_UPDATE,
    FIND_OPEN_QUEUE_BY_CANDIDATE,
    CLOSE_QUEUE_STATE,
    FIND_ESTADO_GESTION_ID,
    FIND_RESULTADO_LLAMADA_ID,
    RESERVE_EVENT_SLOT,
    UPDATE_CANDIDATE_AGENDADO,
    UPDATE_CANDIDATE_ESTADO,
    UPDATE_CANDIDATE_RETRY,
    INSERT_LLAMADA,
} = require('./queries');

async function getCatalogId(client, sql, code, label) {
    const res = await client.query(sql, [code]);
    if (!res.rowCount) {
        throw new Error(`No existe ${label} con codigo ${code}`);
    }
    return res.rows[0].id;
}

async function processPostCallResult(payload) {
    const data = normalizePostCallPayload(payload);
    const rule = RESULT_RULES[data.resultado];

    if (!rule) {
        throw new Error(`No hay regla para resultado ${data.resultado}`);
    }

    if (rule.requiresEvent && !data.eventoId) {
        throw new Error('evento_id es requerido para AGENDADO');
    }

    const client = await getClient();
    try {
        await client.query('BEGIN');

        const candidateRes = await client.query(FIND_CANDIDATE_FOR_UPDATE, [data.candidatoId]);
        if (!candidateRes.rowCount) {
            throw new Error(`No existe candidato ${data.candidatoId}`);
        }

        const candidate = candidateRes.rows[0];
        const estadoGestionId = await getCatalogId(client, FIND_ESTADO_GESTION_ID, rule.estadoGestionCodigo, 'estado_gestion');
        const resultadoLlamadaId = await getCatalogId(client, FIND_RESULTADO_LLAMADA_ID, rule.resultadoLlamadaCodigo, 'resultado_llamada');

        let reservedEventId = null;
        if (rule.requiresEvent) {
            const reserveRes = await client.query(RESERVE_EVENT_SLOT, [data.eventoId]);
            if (!reserveRes.rowCount) {
                throw new Error(`No fue posible reservar cupo para evento ${data.eventoId}`);
            }
            reservedEventId = reserveRes.rows[0].id;
        }

        if (rule.updateMode === 'AGENDADO') {
            await client.query(UPDATE_CANDIDATE_AGENDADO, [
                data.candidatoId,
                estadoGestionId,
                reservedEventId,
                data.nota || data.fechaSeleccionadaLegible,
            ]);
        } else if (rule.updateMode === 'RETRY_SHIFT') {
            const nextFranja = getNextFranja(candidate.franja_actual);
            await client.query(UPDATE_CANDIDATE_RETRY, [
                data.candidatoId,
                estadoGestionId,
                nextFranja,
                data.nota,
            ]);
        } else {
            await client.query(UPDATE_CANDIDATE_ESTADO, [
                data.candidatoId,
                estadoGestionId,
                data.nota,
            ]);
        }

        const queueRes = await client.query(FIND_OPEN_QUEUE_BY_CANDIDATE, [data.candidatoId]);
        const queueId = queueRes.rowCount ? queueRes.rows[0].id : null;
        if (queueId) {
            await client.query(CLOSE_QUEUE_STATE, [queueId, rule.queueState]);
        }

        const note = [data.nota, data.fechaSeleccionadaLegible].filter(Boolean).join(' | ') || null;
        const llamadaRes = await client.query(INSERT_LLAMADA, [
            data.candidatoId,
            resultadoLlamadaId,
            data.conversationId,
            note,
            data.dia,
            data.hora,
            reservedEventId,
            env.ELEVENLABS_AGENT_ID,
        ]);

        await client.query('COMMIT');

        return {
            ok: true,
            candidato_id: data.candidatoId,
            resultado: data.resultado,
            llamada_id: llamadaRes.rows[0].id,
            cola_id: queueId,
            evento_id: reservedEventId,
        };
    } catch (err) {
        try {
            await client.query('ROLLBACK');
        } catch (_) {
            // ignore rollback secondary error
        }
        throw err;
    } finally {
        client.release();
    }
}

module.exports = {
    processPostCallResult,
};

