const LOCALE = 'es-CO';
const TIMEZONE = 'America/Bogota';

function formatEventDate(value) {
    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const weekday = new Intl.DateTimeFormat(LOCALE, {
        weekday: 'long',
        timeZone: TIMEZONE
    }).format(date);

    const day = new Intl.DateTimeFormat(LOCALE, {
        day: 'numeric',
        timeZone: TIMEZONE
    }).format(date);

    const month = new Intl.DateTimeFormat(LOCALE, {
        month: 'long',
        timeZone: TIMEZONE
    }).format(date);

    const time = new Intl.DateTimeFormat(LOCALE, {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: TIMEZONE
    }).format(date);

    return `${weekday} ${day} de ${month} a las ${time}`;
}

function formatPreferredTime(value) {
    if (!value) return null;

    const [hours, minutes] = String(value).split(':');
    if (!hours || !minutes) return null;

    const h = Number(hours);
    const m = Number(minutes);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;

    const suffix = h >= 12 ? 'PM' : 'AM';
    const displayHour = ((h + 11) % 12) + 1;
    const displayMinute = String(m).padStart(2, '0');

    return `${displayHour}:${displayMinute} ${suffix}`;
}

module.exports = { formatEventDate, formatPreferredTime };

