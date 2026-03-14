const env = require('./config/env');
const express = require('express');
const { startDispatcher } = require('./schedulers/callDispatcher');
const { buildPostCallRouter } = require('./postcall/router');
const { buildDirectCallRouter } = require('./directcall/router');
const { buildSchedulerRouter } = require('./schedulers/router'); // nuevo

async function main() {
    try {
        const app = express();
        app.use(express.json({ limit: '1mb' }));
        app.use('/webhooks', buildPostCallRouter());
        app.use('/calls', buildDirectCallRouter());
        app.use('/admin', buildSchedulerRouter());

        startDispatcher({
            intervalMs: env.DISPATCH_INTERVAL_MS,
            maxConcurrent: env.DISPATCH_MAX_CONCURRENT,
        });

        app.listen(env.PORT, () => {
            console.log(`App started on port ${env.PORT}`);
        });
    } catch (err) {
        console.error('Error starting app:', err);
        process.exit(1);
    }
}

main();
