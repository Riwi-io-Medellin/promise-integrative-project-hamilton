require('dotenv').config();

const requiredEnvVars = [
    'DATABASE_URL',
    'ELEVENLABS_API_KEY',
    'ELEVENLABS_AGENT_ID',
    'ELEVENLABS_PHONE_NUMBER_ID'
];

for (const key of requiredEnvVars) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}

module.exports = {
    DATABASE_URL: process.env.DATABASE_URL,
    ELEVENLABS_API_KEY: process.env.ELEVENLABS_API_KEY,
    ELEVENLABS_AGENT_ID: process.env.ELEVENLABS_AGENT_ID,
    ELEVENLABS_PHONE_NUMBER_ID: process.env.ELEVENLABS_PHONE_NUMBER_ID,
    PORT: process.env.PORT || 3000,
    ELEVENLABS_API_URL: process.env.ELEVENLABS_API_URL || 'https://api.elevenlabs.io/v1/convai/twilio/outbound-call',

    SCHED_CRON_MANANA: process.env.SCHED_CRON_MANANA || '0 7 * * *',
    SCHED_CRON_TARDE: process.env.SCHED_CRON_TARDE || '0 13 * * *',
    SCHED_CRON_NOCHE: process.env.SCHED_CRON_NOCHE || '0 19 * * *',

    SCHED_CRON_MORNING: process.env.SCHED_CRON_MORNING || process.env.SCHED_CRON_MANANA || '0 7 * * *',
    SCHED_CRON_AFTERNOON: process.env.SCHED_CRON_AFTERNOON || process.env.SCHED_CRON_TARDE || '0 13 * * *',
    SCHED_CRON_NIGHT: process.env.SCHED_CRON_NIGHT || process.env.SCHED_CRON_NOCHE || '0 19 * * *',
    QUEUE_LOCK_KEY: process.env.QUEUE_LOCK_KEY ? parseInt(process.env.QUEUE_LOCK_KEY, 10) : 987654321,

    STARTUP_FORCE_MOVE: (process.env.STARTUP_FORCE_MOVE === 'true'),
    STARTUP_FORCE_MOVE_LIMIT: process.env.STARTUP_FORCE_MOVE_LIMIT ? parseInt(process.env.STARTUP_FORCE_MOVE_LIMIT, 10) : 1000,
    STARTUP_FORCE_FRANJA: process.env.STARTUP_FORCE_FRANJA || 'noche',
    DISPATCH_MAX_CONCURRENT: process.env.DISPATCH_MAX_CONCURRENT ? parseInt(process.env.DISPATCH_MAX_CONCURRENT, 10) : 4,
    DISPATCH_INTERVAL_MS: process.env.DISPATCH_INTERVAL_MS ? parseInt(process.env.DISPATCH_INTERVAL_MS, 10) : 5000,
    DISPATCH_STALE_RECOVERY_ENABLED: process.env.DISPATCH_STALE_RECOVERY_ENABLED !== 'false',
    DISPATCH_STALE_TIMEOUT_MINUTES: process.env.DISPATCH_STALE_TIMEOUT_MINUTES ? parseInt(process.env.DISPATCH_STALE_TIMEOUT_MINUTES, 10) : 20,
    DISPATCH_STALE_BATCH_SIZE: process.env.DISPATCH_STALE_BATCH_SIZE ? parseInt(process.env.DISPATCH_STALE_BATCH_SIZE, 10) : 20,
};
