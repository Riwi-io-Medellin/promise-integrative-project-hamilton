const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        await client.connect();
        await client.query('DELETE FROM webhook_logs');
        console.log('✅ Logs limpiados correctamente.');
    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await client.end();
    }
}

main();
