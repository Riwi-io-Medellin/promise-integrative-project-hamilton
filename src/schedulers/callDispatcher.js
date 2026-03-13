const env = require('../config/env');
const {
    countActiveCalls,
    lockNextPendingCalls,
    getDispatchContext,
    lockStaleInProgressCalls,
    setCallState,
} = require('./dispatcher/repository');
const { buildElevenLabsRequest } = require('./dispatcher/payloadBuilder');
const { createOutboundCall } = require('./dispatcher/elevenLabsClient');
const { processPostCallResult } = require('../postcall/service');

const DEFAULT_MAX_CONCURRENT = 4;
const DEFAULT_INTERVAL_MS = 5000;

let intervalHandle = null;
let running = false;

function isClientError(status) {
    return Number.isInteger(status) && status >= 400 && status < 500;
}

async function processQueueRow(row) {
    if (!row || !row.telefono) {
        await setCallState(row.cola_id, 'CANCELADA');
        return;
    }

    try {
        const requestBody = buildElevenLabsRequest(row, env);
        await createOutboundCall(requestBody);
    } catch (err) {
        const status = err.response && err.response.status;
        const fallbackState = isClientError(status) ? 'CANCELADA' : 'PENDIENTE';

        await setCallState(row.cola_id, fallbackState);

        const detail = err.response && err.response.data ? JSON.stringify(err.response.data) : err.message;
        console.error(`Dispatcher: cola ${row.cola_id} fallo al crear llamada (${status || 'no-status'}) ${detail}`);
    }
}

async function recoverStaleInProgressCalls() {
    if (!env.DISPATCH_STALE_RECOVERY_ENABLED) return;

    const staleRows = await lockStaleInProgressCalls(
        env.DISPATCH_STALE_TIMEOUT_MINUTES,
        env.DISPATCH_STALE_BATCH_SIZE
    );

    if (!staleRows.length) return;

    for (const row of staleRows) {
        try {
            await processPostCallResult({
                resultado: 'BUZON_VOZ',
                candidato_id: row.candidato_id,
                nota: `Auto-cierre por timeout: sin webhook final en ${env.DISPATCH_STALE_TIMEOUT_MINUTES} minutos.`,
                conversation_id: `timeout-${row.id}-${Date.now()}`,
            });
            console.warn(`Dispatcher watchdog: cola ${row.id} auto-cerrada por timeout.`);
        } catch (err) {
            console.error(`Dispatcher watchdog: fallo auto-cierre de cola ${row.id}:`, err.message);
        }
    }
}

async function dispatchLoop(maxConcurrent) {
    if (running) return;
    running = true;

    try {
        await recoverStaleInProgressCalls();

        const active = await countActiveCalls();
        const slots = Math.max(0, maxConcurrent - active);
        if (slots === 0) return;

        const locked = await lockNextPendingCalls(slots);
        if (locked.length === 0) return;

        const queueIds = locked.map((row) => row.id);
        const contextRows = await getDispatchContext(queueIds);

        await Promise.all(contextRows.map((row) => processQueueRow(row)));
    } catch (err) {
        console.error('Dispatcher: error en ciclo', err.message);
    } finally {
        running = false;
    }
}

function startDispatcher(options = {}) {
    const maxConcurrent = options.maxConcurrent || env.DISPATCH_MAX_CONCURRENT || DEFAULT_MAX_CONCURRENT;
    const intervalMs = options.intervalMs || env.DISPATCH_INTERVAL_MS || DEFAULT_INTERVAL_MS;

    if (intervalHandle) return;

    dispatchLoop(maxConcurrent).catch((err) => {
        console.error('Dispatcher: error en arranque', err.message);
    });

    intervalHandle = setInterval(() => {
        dispatchLoop(maxConcurrent).catch((err) => {
            console.error('Dispatcher: error programado', err.message);
        });
    }, intervalMs);

    console.log(`Call dispatcher iniciado (interval ${intervalMs}ms, max concurrent ${maxConcurrent})`);
}

function stopDispatcher() {
    if (!intervalHandle) return;
    clearInterval(intervalHandle);
    intervalHandle = null;
}

module.exports = { startDispatcher, stopDispatcher };
