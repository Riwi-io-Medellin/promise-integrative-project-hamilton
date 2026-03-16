const { Pool } = require('pg');
require('dotenv').config();

async function test(ssl) {
  console.log(`Testing connection with SSL=${ssl ? 'YES' : 'NO'}...`);
  const config = {
    connectionString: process.env.DATABASE_URL,
    ssl: ssl ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 5000
  };
  
  const pool = new Pool(config);
  try {
    const res = await pool.query('SELECT NOW()');
    console.log('✅ Connected! Time:', res.rows[0].now);
  } catch (err) {
    console.log('❌ Failed:', err.message);
  } finally {
    await pool.end();
  }
}

(async () => {
    await test(true);
    await test(false);
})();

