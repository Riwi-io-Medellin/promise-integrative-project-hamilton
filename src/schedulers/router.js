const express = require('express');
const { runNowIfInTimeslot } = require('./index');

function buildSchedulerRouter() {
    const router = express.Router();

    router.post('/run-now', async (req, res) => {
        try {
            const { franja, forceMove = false, limit = 1000 } = req.body || {};
            const result = await runNowIfInTimeslot(limit, { forceMove, forceFranja: franja });
            res.status(200).json({ ok: true, result });
        } catch (err) {
            res.status(500).json({ ok: false, error: err.message });
        }
    });

    return router;
}

module.exports = { buildSchedulerRouter };
