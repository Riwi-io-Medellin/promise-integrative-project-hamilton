/**
 * src/utils/dateHelpers.js – Date / time utilities
 *
 * All times for scheduling and display use Colombia Standard Time (UTC-5).
 * Colombia does NOT observe daylight saving time, so the offset is always -5.
 */
'use strict';

const COLOMBIA_OFFSET_HOURS = -5;

const DAYS_ES   = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MONTHS_ES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/**
 * Returns the current hour (0-23) in Colombia time.
 */
function colombiaHour() {
  const nowUtc = new Date();
  const utcHour = nowUtc.getUTCHours();
  return ((utcHour + COLOMBIA_OFFSET_HOURS) + 24) % 24;
}

/**
 * Returns the current minute (0-59) in Colombia time.
 */
function colombiaMinute() {
  return new Date().getUTCMinutes();
}

/**
 * Returns today's date string (YYYY-MM-DD) in Colombia time.
 * (May differ from UTC date near midnight.)
 */
function colombiaDateString() {
  const now       = new Date();
  // Apply Colombia offset
  const offsetMs  = COLOMBIA_OFFSET_HOURS * 60 * 60 * 1000;
  const local     = new Date(now.getTime() + offsetMs);
  return local.toISOString().split('T')[0]; // YYYY-MM-DD
}

/**
 * Formats an event fecha_hora (ISO string) into a human-readable Spanish string.
 *
 * Equivalent to the "Parseo de fecha" node in both n8n flows.
 *
 * Example output: "martes 18 de marzo a las 7:00 PM"
 *
 * NOTE: The n8n code strips '+00:00' and constructs a Date without timezone
 * conversion, meaning it treats the stored UTC value as the display time.
 * We replicate that exact behavior here so the output is identical.
 *
 * @param {string} fechaHoraIso – ISO timestamp from the DB (e.g. "2025-03-18T19:00:00+00:00")
 * @returns {string}
 */
function formatEventDate(fechaHoraIso) {
  // Strip timezone info exactly as n8n does (replaces '+00:00' with '')
  const cleaned  = String(fechaHoraIso).replace('+00:00', '').replace('Z', '');
  const fecha    = new Date(cleaned);

  const dia       = DAYS_ES[fecha.getDay()];
  const numeroDia = fecha.getDate();
  const mes       = MONTHS_ES[fecha.getMonth()];
  const horas     = fecha.getHours();
  const minutos   = String(fecha.getMinutes()).padStart(2, '0');
  const ampm      = horas >= 12 ? 'PM' : 'AM';
  const hora12    = horas % 12 || 12;

  return `${dia} ${numeroDia} de ${mes} a las ${hora12}:${minutos} ${ampm}`;
}

/**
 * Builds the "lista_horarios" text and "eventos_disponibles" text
 * that are sent to ElevenLabs as dynamic variables.
 *
 * Equivalent to the "JSON ElevenLabs" node in both n8n flows.
 *
 * @param {Array<{id: number, fecha_hora: string}>} eventos
 * @returns {{ fechasTexto: string, eventosTexto: string }}
 */
function buildEventTexts(eventos) {
  const enriched = eventos.map((e) => ({
    ...e,
    fecha_legible: formatEventDate(e.fecha_hora),
  }));

  const fechasTexto = enriched
    .map((e, i) => `opción ${i + 1}: ${e.fecha_legible}`)
    .join(', ');

  const eventosTexto = enriched
    .map((e) => `${e.fecha_legible} (ID: ${e.id})`)
    .join('; ');

  return { fechasTexto, eventosTexto };
}

module.exports = {
  colombiaHour,
  colombiaMinute,
  colombiaDateString,
  formatEventDate,
  buildEventTexts,
};

