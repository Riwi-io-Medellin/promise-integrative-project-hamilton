const { getColombiaHour } = require('../utils/dateHelpers');
const cron = require('node-cron');
const { fillCallQueue } = require('./fillQueueRunner');
const env = require('../config/env');

const TIMEZONE = 'America/Bogota';

function getTimeslotNow() {
    const hour = getColombiaHour();
    if (hour >= 7 && hour < 12) return 'manana';
    if (hour >= 12 && hour < 18) return 'tarde';
    if (hour >= 18 && hour < 21) return 'noche';
    return null;
}

const { query } = require('../config/postgres');
const fs = require('fs');
const path = require('path');

async function runNowIfInTimeslot(limit = 1000, options = {}) {
    const { forceMove = false, forceFranja = null } = options;

    let franja = forceFranja || getTimeslotNow();
    if (!franja) {
        if (forceMove || env.STARTUP_FORCE_MOVE) {
            franja = forceFranja || env.STARTUP_FORCE_FRANJA;
            console.log(`Fuera de horarios objetivo, se forzará arranque en franja '${franja}'.`);
        } else {
            console.log('Fuera de horarios objetivo, no se llenará la cola al inicio.');
            return { ok: false, reason: 'out_of_timeslot', message: 'Fuera de horarios objetivo y STARTUP_FORCE_MOVE deshabilitado.' };
        }
    }

    try {
        const existsRes = await query(
            `SELECT 1 FROM candidatos c WHERE c.estado_gestion_id = (SELECT id FROM estados_gestion WHERE codigo = 'PENDIENTE' LIMIT 1) AND c.franja_actual = $1 LIMIT 1`,
            [franja]
        );

        const hasCandidates = existsRes && existsRes.rowCount && existsRes.rowCount > 0;
        if (!hasCandidates) {
            console.log(`No hay candidatos pendientes para la franja '${franja}' al inicio.`);

            if (forceMove || env.STARTUP_FORCE_MOVE) {
                console.log('STARTUP_FORCE_MOVE habilitado (o forceMove=true): moviendo candidatos desde "manana" hacia la franja actual...');
                // Mover hasta STARTUP_FORCE_MOVE_LIMIT candidatos 'manana' que estén PENDIENTE y no estén ya en cola
                const moveSqlPath = path.join(__dirname, '../../sql/move_morning_to_timeslot.sql');
                if (!fs.existsSync(moveSqlPath)) {
                    const msg = `No se encontró el archivo SQL para mover candidatos: ${moveSqlPath}`;
                    console.error(msg);
                    return { ok: false, error: msg };
                }
                const moveSql = fs.readFileSync(moveSqlPath, 'utf8');
                const moveRes = await query(moveSql, [franja, env.STARTUP_FORCE_MOVE_LIMIT]);

                const movedCount = moveRes && moveRes.rowCount ? moveRes.rowCount : 0;
                if (movedCount > 0) {
                    console.log(`Movidos ${movedCount} candidatos a la franja '${franja}'. Ahora se ejecutará fillCallQueue.`);
                    const rows = await fillCallQueue(franja, limit);
                    const filled = Array.isArray(rows) ? rows.length : 0;
                    return { ok: true, action: 'moved_and_filled', franja, movedCount, filled };
                }
                console.log('No se encontraron candidatos "manana" elegibles para mover. Se omite llenado.');
                return { ok: false, action: 'no_candidates_to_move', franja, movedCount: 0, message: 'No se movieron candidatos.' };
            }
            console.log(`Se omite llenado.`);
            return { ok: false, action: 'no_candidates', franja, message: 'No hay candidatos pendientes y no se fuerza movimiento.' };
        }

        const rows = await fillCallQueue(franja, limit);
        const filled = Array.isArray(rows) ? rows.length : 0;
        return { ok: true, action: 'filled', franja, filled };
    } catch (err) {
        console.error('Error en runNowIfInTimeslot:', err.message);
        return { ok: false, error: err.message };
    }
}

module.exports = { runNowIfInTimeslot, };
