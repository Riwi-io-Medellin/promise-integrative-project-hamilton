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

async function runNowIfInTimeslot(limit = 1000) {
    let franja = getTimeslotNow();
    if (!franja) {
        if (env.STARTUP_FORCE_MOVE) {
            franja = env.STARTUP_FORCE_FRANJA;
            console.log(`Fuera de horarios objetivo, se forzará arranque en franja '${franja}'.`);
        } else {
            console.log('Fuera de horarios objetivo, no se llenará la cola al inicio.');
            return;
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

            if (env.STARTUP_FORCE_MOVE) {
                console.log('STARTUP_FORCE_MOVE habilitado: moviendo candidatos desde "manana" hacia la franja actual...');
                // Mover hasta STARTUP_FORCE_MOVE_LIMIT candidatos 'manana' que estén PENDIENTE y no estén ya en cola
                const moveSqlPath = path.join(__dirname, '../../sql/move_morning_to_timeslot.sql');
                if (!fs.existsSync(moveSqlPath)) {
                    console.error('No se encontró el archivo SQL para mover candidatos:', moveSqlPath);
                    return;
                }
                const moveSql = fs.readFileSync(moveSqlPath, 'utf8');
                const moveRes = await query(moveSql, [franja, env.STARTUP_FORCE_MOVE_LIMIT]);

                if (moveRes && moveRes.rowCount && moveRes.rowCount > 0) {
                    console.log(`Movidos ${moveRes.rowCount} candidatos a la franja '${franja}'. Ahora se ejecutará fillCallQueue.`);
                    await fillCallQueue(franja, limit);
                    return;
                }
                console.log('No se encontraron candidatos "manana" elegibles para mover. Se omite llenado.');
                return;
            }
            console.log(`Se omite llenado.`);
            return;
        }

        await fillCallQueue(franja, limit);
    } catch (err) {
        console.error('Error en runNowIfInTimeslot:', err.message);
    }
}

function startScheduler(options = {}) {
    const { limit = 1000, scheduleStartup = true } = options;

    cron.schedule(env.SCHED_CRON_MORNING, () => {
        console.log('Cron: llenando cola para franja "manana"');
        fillCallQueue('manana', limit).catch(err => console.error(err));
    }, { timezone: TIMEZONE });

    cron.schedule(env.SCHED_CRON_AFTERNOON, () => {
        console.log('Cron: llenando cola para franja "tarde"');
        fillCallQueue('tarde', limit).catch(err => console.error(err));
    }, { timezone: TIMEZONE });

    cron.schedule(env.SCHED_CRON_NIGHT, () => {
        console.log('Cron: llenando cola para franja "noche"');
        fillCallQueue('noche', limit).catch(err => console.error(err));
    }, { timezone: TIMEZONE });

    if (scheduleStartup) {
        runNowIfInTimeslot(limit).catch(err => console.error(err));
    }

    console.log('Scheduler iniciado (cron programado según variables en .env).');
}

module.exports = { startScheduler, getTimeslotNow, runNowIfInTimeslot };
