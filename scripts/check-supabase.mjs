import fs from 'node:fs';

function readEnvFile(path = '.env') {
  const out = {};
  const content = fs.readFileSync(path, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx <= 0) continue;
    const key = line.slice(0, idx).trim();
    let value = line.slice(idx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

async function testTable(baseUrl, apiKey, table) {
  const url = `${baseUrl}/rest/v1/${table}?select=*&limit=1`;
  const res = await fetch(url, {
    headers: {
      apikey: apiKey,
      Authorization: `Bearer ${apiKey}`
    }
  });

  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }

  return {
    table,
    status: res.status,
    ok: res.ok,
    body: parsed
  };
}

async function main() {
  const env = readEnvFile('.env');
  const baseUrl = (env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
  const apiKey = env.VITE_SUPABASE_ANON_KEY || '';

  if (!baseUrl || !apiKey) {
    console.error('Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env');
    process.exit(1);
  }

  const tables = [
    'candidatos',
    'generos',
    'municipios',
    'niveles_educativos',
    'conocimientos_programacion',
    'horarios',
    'estados_gestion'
  ];

  const results = [];
  for (const table of tables) {
    try {
      const r = await testTable(baseUrl, apiKey, table);
      results.push(r);
    } catch (err) {
      results.push({ table, status: 0, ok: false, body: String(err?.message || err) });
    }
  }

  for (const r of results) {
    console.log(`- ${r.table}: ${r.status} ${r.ok ? 'OK' : 'FAIL'}`);
    if (!r.ok) {
      console.log(`  detail: ${typeof r.body === 'string' ? r.body : JSON.stringify(r.body)}`);
    }
  }

  const failed = results.filter(r => !r.ok);
  process.exit(failed.length ? 2 : 0);
}

main();
