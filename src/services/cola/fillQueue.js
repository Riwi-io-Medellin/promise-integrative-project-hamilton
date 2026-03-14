// Archivo: src/services/cola/fillQueue.js
'use strict';

const { colombiaHour, colombiaDateString } = require('../../utils/dateHelpers');
const { getCandidatesForQueue } = require('../../db/candidatos');
const { bulkInsertQueue } = require('../../db/cola');

/**
 * Determina la franja actual basada en la hora de Colombia.
 * Reglas:
 *   06:00 - 11:59 -> 'manana'
 *   12:00 - 17:59 -> 'tarde'
 *   18:00 - 21:59 -> 'noche'
 *   Fuera de rango -> null
 */
function getFranjaActual() {
    const hour = colombiaHour();

    // Ajusta estos rangos según tu preferencia horaria real
    if (hour >= 6 && hour < 12) return 'manana';
    if (hour >= 12 && hour < 18) return 'tarde';
    if (hour >= 18 && hour < 22) return 'noche';

    return null;
}

/**
 * Busca candidatos aptos para la franja y los inserta en la cola de hoy.
 * @param {string} franja - 'manana' | 'tarde' | 'noche'
 */
async function llenarColaParaFranja(franja) {
    const fechaHoy = colombiaDateString(); // YYYY-MM-DD

    // 1. Obtener candidatos elegibles de la BD
    console.log(`🔎 Buscando candidatos para franja '${franja}'...`);
    const candidatos = await getCandidatesForQueue(franja);

    if (!candidatos || candidatos.length === 0) {
        console.log(`   No se encontraron candidatos pendientes para '${franja}'.`);
        return 0;
    }

    // 2. Mapear al formato que espera bulkInsertQueue
    //    (candidatoId, prioridad, franjaProgramada, horaProgramada)
    const entries = candidatos.map(c => ({
        candidatoId: c.id,
        prioridad: c.ci_total || 0, // Prioridad basada en su puntaje (Candidato Ideal)
        franjaProgramada: franja,
        horaProgramada: null        // Por defecto null, se llenará si es agendada específica
    }));

    // 3. Insertar en lote (ignorando duplicados si ya existen hoy)
    const insertados = await bulkInsertQueue(entries, fechaHoy);
    return insertados;
}

module.exports = {
    getFranjaActual,
    llenarColaParaFranja
};
