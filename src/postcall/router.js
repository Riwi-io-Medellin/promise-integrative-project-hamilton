const express = require('express');
const { processPostCallResult } = require('./service');

function buildPostCallRouter() {
    const router = express.Router();

    router.post('/eleven/finalize', async (req, res) => {
        try {
            const result = await processPostCallResult(req.body);
            res.status(200).json(result);
        } catch (err) {
            res.status(400).json({
                ok: false,
                error: err.message,
            });
        }
    });

    return router;
}

module.exports = {
    buildPostCallRouter,
};

