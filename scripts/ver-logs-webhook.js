const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function main() {
    try {
        await client.connect();
        
        console.log('\n🔍 BÚSQUEDA DE LOGS RECIENTES DE WEBHOOK (ÚLTIMOS 10) 🔍');
        console.log('='.repeat(60));

        const res = await client.query(`
            SELECT id, payload, recibido_en, procesado_exitosamente, error_log 
            FROM webhook_logs 
            ORDER BY recibido_en DESC 
            LIMIT 10
        `);

        if (res.rows.length === 0) {
            console.log('⚠️ No se encontraron logs. El webhook no ha sido llamado recientemente.');
        } else {
            res.rows.forEach(row => {
                console.log(`\n📅 [${row.recibido_en.toLocaleString()}] - ID: ${row.id}`);
                console.log(`📦 PAYLOAD:`);
                console.log(JSON.stringify(row.payload, null, 2));
                if (row.error_log) {
                    console.log(`❌ ERROR AL PROCESAR: ${row.error_log}`);
                }
                console.log('-'.repeat(60));
            });
        }

    } catch (err) {
        console.error('❌ Error consultando logs:', err);
    } finally {
        await client.end();
    }
}

main();
