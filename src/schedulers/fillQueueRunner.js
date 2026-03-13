const path = require('path');
const fs = require('fs');
const { getClient } = require('../config/postgres');
const env = require('../config/env');

const SQL_PATH = path.join(__dirname, '../../sql/fill_queue.sql');

const LOCK_KEY = env.QUEUE_LOCK_KEY;

async function fillCallQueue(franja, limit = 1000) {
    if (!franja) {
        throw new Error('Parámetro "franja" requerido (manana|tarde|noche).');
    }

    if (!fs.existsSync(SQL_PATH)) {
        throw new Error(`No se encontró el archivo SQL en ${SQL_PATH}`);
    }

    const sql = fs.readFileSync(SQL_PATH, 'utf8');
    const client = await getClient();

    try {

        const lockRes = await client.query('SELECT pg_try_advisory_lock($1) AS locked', [LOCK_KEY]);
        const locked = lockRes.rows && lockRes.rows[0] && lockRes.rows[0].locked;
        if (!locked) {
            console.log('fillCallQueue: otra ejecución está en curso, se omite esta ejecución.');
            return [];
        }

        // Ejecutar la query parametrizada ($1 = franja, $2 = limit)
        const res = await client.query(sql, [franja, limit]);
        const rows = res.rows || [];
        console.log(`fillCallQueue: insertados ${rows.length} candidatos para franja='${franja}'`);
        return rows;
    } catch (err) {
        console.error('fillCallQueue error:', err);
        throw err;
    } finally {
        try {
            await client.query('SELECT pg_advisory_unlock($1)', [LOCK_KEY]);
        } catch (unlockErr) {
            console.warn('Error al liberar advisory lock:', unlockErr.message);
        }
        client.release();
    }
}

module.exports = { fillCallQueue };
