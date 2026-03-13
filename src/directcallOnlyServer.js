const env = require('./config/env');
const express = require('express');
const { buildDirectCallRouter } = require('./directcall/router');
const { buildPostCallRouter } = require('./postcall/router');

function startDirectCallOnlyServer() {
    const app = express();
    app.use(express.json({ limit: '1mb' }));

    // Modo manual: llamada directa + webhook de cierre, sin scheduler ni dispatcher.
    app.use('/calls', buildDirectCallRouter());
    app.use('/webhooks', buildPostCallRouter());

    app.listen(env.PORT, () => {
        console.log(`Direct-call mode iniciado en puerto ${env.PORT}`);
    });
}

startDirectCallOnlyServer();

