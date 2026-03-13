const axios = require('axios');
const env = require('../../config/env');

async function createOutboundCall(body) {
    const headers = {
        'xi-api-key': env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
    };

    const response = await axios.post(env.ELEVENLABS_API_URL, body, {
        headers,
        timeout: 20000,
    });

    return response.data;
}

module.exports = {
    createOutboundCall,
};

