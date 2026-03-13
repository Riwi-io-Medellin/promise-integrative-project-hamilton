const express = require('express');
const { triggerDirectCall } = require('./service');

function buildDirectCallRouter() {
    const router = express.Router();

    router.post('/candidate', async (req, res) => {
        try {
            const result = await triggerDirectCall(req.body);
            res.status(200).json(result);
        } catch (err) {
            const status = Number.isInteger(err.status) ? err.status : 400;
            res.status(status).json({
                ok: false,
                error: err.message,
            });
        }
    });

    return router;
}

module.exports = {
    buildDirectCallRouter,
};

