const { getClient, query } = require('../../config/postgres');
const {
    COUNT_ACTIVE_CALLS,
    SELECT_PENDING_FOR_LOCK,
    MARK_EN_CURSO,
    INCREMENT_CANDIDATE_ATTEMPTS,
    FETCH_DISPATCH_CONTEXT,
    FETCH_CANDIDATE_DISPATCH_CONTEXT,
    SELECT_STALE_IN_PROGRESS,
    UPDATE_CALL_STATE,
} = require('./queries');

async function countActiveCalls() {
    const res = await query(COUNT_ACTIVE_CALLS);
    return res.rows[0] ? res.rows[0].cnt : 0;
}

async function lockNextPendingCalls(limit) {
    const client = await getClient();

    try {
        await client.query('BEGIN');

        const pending = await client.query(SELECT_PENDING_FOR_LOCK, [limit]);
        if (!pending.rowCount) {
            await client.query('COMMIT');
            return [];
        }

        const ids = pending.rows.map((row) => row.id);
        const updated = await client.query(MARK_EN_CURSO, [ids]);

        const candidateIds = updated.rows.map((row) => row.candidato_id);
        if (candidateIds.length) {
            await client.query(INCREMENT_CANDIDATE_ATTEMPTS, [candidateIds]);
        }

        await client.query('COMMIT');
        return updated.rows;
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

async function getDispatchContext(queueIds) {
    if (!queueIds || queueIds.length === 0) {
        return [];
    }

    const res = await query(FETCH_DISPATCH_CONTEXT, [queueIds]);
    return res.rows;
}

async function getDispatchContextByCandidateId(candidateId) {
    const res = await query(FETCH_CANDIDATE_DISPATCH_CONTEXT, [candidateId]);
    return res.rowCount ? res.rows[0] : null;
}

async function lockStaleInProgressCalls(staleMinutes, limit) {
    const client = await getClient();

    try {
        await client.query('BEGIN');
        const res = await client.query(SELECT_STALE_IN_PROGRESS, [staleMinutes, limit]);
        await client.query('COMMIT');
        return res.rows;
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

async function incrementCandidateAttempts(candidateIds) {
    if (!candidateIds || candidateIds.length === 0) return [];
    const res = await query(INCREMENT_CANDIDATE_ATTEMPTS, [candidateIds]);
    return res.rows;
}

async function setCallState(queueId, state) {
    await query(UPDATE_CALL_STATE, [queueId, state]);
}

module.exports = {
    countActiveCalls,
    lockNextPendingCalls,
    getDispatchContext,
    getDispatchContextByCandidateId,
    lockStaleInProgressCalls,
    incrementCandidateAttempts,
    setCallState,
};
