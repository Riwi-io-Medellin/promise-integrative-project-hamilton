const { getClient, query } = require('../../config/postgres');
const {
    COUNT_ACTIVE_CALLS,
    SELECT_PENDING_FOR_LOCK,
    MARK_EN_CURSO,
    FETCH_DISPATCH_CONTEXT,
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

async function setCallState(queueId, state) {
    await query(UPDATE_CALL_STATE, [queueId, state]);
}

module.exports = {
    countActiveCalls,
    lockNextPendingCalls,
    getDispatchContext,
    setCallState,
};

