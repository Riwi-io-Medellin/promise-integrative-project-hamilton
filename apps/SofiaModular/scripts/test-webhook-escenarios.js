/**
 * scripts/test-webhook-escenarios.js
 *
 * Simula 3 escenarios reales de webhook para validar:
 *   1) Cierre de llamadas EN_CURSO -> NO_CONTESTA
 *   2) Alineacion de franja_actual con preferencia horaria (AM/PM)
 *   3) Extraccion de hora callback desde nota libre (ej. 15:00 de la tarde)
 *
 * Seguridad:
 *   - Modo DRY-RUN por defecto (no envia nada)
 *   - Bloquea ejecucion en produccion salvo --force
 *   - Bloquea base URL remota salvo --force
 *
 * Uso:
 *   node scripts/test-webhook-escenarios.js --run
 *   node scripts/test-webhook-escenarios.js --run --base-url=http://localhost:3000
 *   node scripts/test-webhook-escenarios.js --run --force
 */
'use strict';

require('dotenv').config();

const axios = require('axios');
const pool = require('../src/db/pool');
const { colombiaDateString } = require('../src/utils/dateHelpers');

function getFlag(name) {
  return process.argv.includes(`--${name}`);
}

function getArgValue(name, fallback = null) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : fallback;
}

function section(title) {
  console.log(`\n${'='.repeat(72)}`);
  console.log(title);
  console.log('='.repeat(72));
}

function rowLine(label, value) {
  console.log(`${label.padEnd(34)} ${value}`);
}

function isLocalBaseUrl(rawUrl) {
  try {
    const u = new URL(rawUrl);
    return ['localhost', '127.0.0.1'].includes(u.hostname);
  } catch (_) {
    return false;
  }
}

function ensureSafeExecution({ dryRun, force, baseUrl }) {
  if (dryRun) return;

  if (process.env.NODE_ENV === 'production' && !force) {
    throw new Error('Bloqueado: NODE_ENV=production. Usa --force solo si estas 100% seguro.');
  }

  if (!isLocalBaseUrl(baseUrl) && !force) {
    throw new Error(`Bloqueado: base URL remota (${baseUrl}). Usa --force para continuar.`);
  }
}

async function findEnCursoFixture() {
  const { rows } = await pool.query(
    `SELECT
       l.id,
       l.candidato_id,
       l.conversation_id,
       c.nombre || ' ' || c.apellido AS candidato
     FROM public.llamadas l
     JOIN public.resultados_llamada rl ON rl.id = l.resultado_id
     JOIN public.candidatos c ON c.id = l.candidato_id
     WHERE rl.codigo = 'EN_CURSO'
     ORDER BY l.fecha_hora_llamada DESC
     LIMIT 1`,
  );
  return rows[0] || null;
}

async function findCandidateByHorario(horarioCodigo) {
  const { rows } = await pool.query(
    `SELECT
       c.id,
       c.nombre || ' ' || c.apellido AS candidato,
       c.franja_actual,
       h.codigo AS horario_codigo
     FROM public.candidatos c
     JOIN public.horarios h ON h.id = c.horario_id
     JOIN public.estados_gestion eg ON eg.id = c.estado_gestion_id
     WHERE h.codigo = $1
       AND eg.codigo IN ('PENDIENTE', 'NO_CONTESTA', 'AGENDADO')
     ORDER BY c.updated_at DESC NULLS LAST, c.created_at DESC
     LIMIT 1`,
    [horarioCodigo],
  );
  return rows[0] || null;
}

async function postWebhook(baseUrl, payload) {
  const url = `${baseUrl.replace(/\/$/, '')}/webhook/elevenlabs-resultado`;
  const response = await axios.post(url, payload, {
    headers: { 'Content-Type': 'application/json' },
    timeout: 15000,
  });
  return response.data;
}

async function verifyLlamadaClosed(candidatoId) {
  const { rows } = await pool.query(
    `SELECT rl.codigo AS resultado, l.resumen, l.conversation_id
     FROM public.llamadas l
     JOIN public.resultados_llamada rl ON rl.id = l.resultado_id
     WHERE l.candidato_id = $1
     ORDER BY l.fecha_hora_llamada DESC
     LIMIT 1`,
    [candidatoId],
  );
  return rows[0] || null;
}

async function verifyCandidateFranja(candidatoId) {
  const { rows } = await pool.query(
    `SELECT c.franja_actual, h.codigo AS horario_codigo
     FROM public.candidatos c
     LEFT JOIN public.horarios h ON h.id = c.horario_id
     WHERE c.id = $1`,
    [candidatoId],
  );
  return rows[0] || null;
}

async function verifyPersonalizadaToday(candidatoId, horaEsperada) {
  const hoy = colombiaDateString();
  const { rows } = await pool.query(
    `SELECT franja_programada, hora_programada::text AS hora_programada, estado
     FROM public.cola_llamadas
     WHERE candidato_id = $1
       AND fecha_programada = $2
       AND franja_programada = 'personalizada'
     ORDER BY created_at DESC
     LIMIT 1`,
    [candidatoId, hoy],
  );

  const row = rows[0] || null;
  if (!row) return { ok: false, row: null };

  const horaActual = (row.hora_programada || '').slice(0, 5);
  return { ok: horaActual === horaEsperada, row };
}

async function runScenarioEnCursoToNoContesta({ dryRun, baseUrl }) {
  let fixture = null;
  try {
    fixture = await findEnCursoFixture();
  } catch (err) {
    if (!dryRun) throw err;
  }

  if (!fixture && dryRun) {
    fixture = {
      candidato_id: '11111111-1111-1111-1111-111111111111',
      conversation_id: 'conv_dryrun_demo_1',
      candidato: 'Demo EN_CURSO',
    };
  }

  if (!fixture) {
    return { name: 'Escenario 1', skipped: true, reason: 'No hay llamada EN_CURSO para probar.' };
  }

  const payload = {
    candidato_id: fixture.candidato_id,
    conversation_id: fixture.conversation_id || undefined,
    resultado: 'NO_CONTESTA',
    nota: '[Prueba automatizada] No respondio la llamada',
  };

  if (dryRun) {
    return {
      name: 'Escenario 1',
      skipped: false,
      dryRun: true,
      payload,
      info: `Candidato: ${fixture.candidato}`,
    };
  }

  const response = await postWebhook(baseUrl, payload);
  const latest = await verifyLlamadaClosed(fixture.candidato_id);

  return {
    name: 'Escenario 1',
    skipped: false,
    dryRun: false,
    payload,
    response,
    checks: {
      llamadaResultado: latest?.resultado || 'N/A',
      ok: latest?.resultado === 'NO_CONTESTA',
    },
  };
}

async function runScenarioFranjaPM({ dryRun, baseUrl }) {
  let fixture = null;
  try {
    fixture = await findCandidateByHorario('PM');
  } catch (err) {
    if (!dryRun) throw err;
  }

  if (!fixture && dryRun) {
    fixture = {
      id: '11111111-1111-1111-1111-111111111111',
      candidato: 'Demo Horario PM',
      franja_actual: 'manana',
      horario_codigo: 'PM',
    };
  }

  if (!fixture) {
    return { name: 'Escenario 2', skipped: true, reason: 'No hay candidato con horario PM.' };
  }

  const payload = {
    candidato_id: fixture.id,
    resultado: 'OCUPADO',
    nota: '[Prueba automatizada] Solicita llamada en horario de tarde',
  };

  if (dryRun) {
    return {
      name: 'Escenario 2',
      skipped: false,
      dryRun: true,
      payload,
      info: `Candidato PM: ${fixture.candidato}`,
    };
  }

  const response = await postWebhook(baseUrl, payload);
  const candidate = await verifyCandidateFranja(fixture.id);

  return {
    name: 'Escenario 2',
    skipped: false,
    dryRun: false,
    payload,
    response,
    checks: {
      horarioCodigo: candidate?.horario_codigo || 'N/A',
      franjaActual: candidate?.franja_actual || 'N/A',
      ok: candidate?.horario_codigo !== 'PM' || candidate?.franja_actual === 'tarde',
    },
  };
}

async function runScenarioNotaHoraCallback({ dryRun, baseUrl }) {
  let fixture = null;
  try {
    fixture = await findCandidateByHorario('AMPM') || await findCandidateByHorario('PM') || await findCandidateByHorario('AM');
  } catch (err) {
    if (!dryRun) throw err;
  }

  if (!fixture && dryRun) {
    fixture = {
      id: '11111111-1111-1111-1111-111111111111',
      candidato: 'Demo Nota 15:00',
      horario_codigo: 'AMPM',
    };
  }

  if (!fixture) {
    return { name: 'Escenario 3', skipped: true, reason: 'No hay candidato elegible para probar nota con hora.' };
  }

  const payload = {
    candidato_id: fixture.id,
    resultado: 'PENDIENTE',
    nota: 'Ningun horario disponible le sirve. Prefiere disponibilidad por las tardes. Llamame a las 15:00 de la tarde.',
  };

  if (dryRun) {
    return {
      name: 'Escenario 3',
      skipped: false,
      dryRun: true,
      payload,
      info: `Candidato: ${fixture.candidato}`,
    };
  }

  const response = await postWebhook(baseUrl, payload);
  const personalizada = await verifyPersonalizadaToday(fixture.id, '15:00');

  return {
    name: 'Escenario 3',
    skipped: false,
    dryRun: false,
    payload,
    response,
    checks: {
      personalizada: personalizada.row,
      ok: personalizada.ok,
    },
  };
}

function printScenarioResult(result) {
  section(result.name);

  if (result.skipped) {
    rowLine('Estado', `SKIPPED - ${result.reason}`);
    return;
  }

  if (result.dryRun) {
    rowLine('Estado', 'DRY-RUN (sin enviar webhook)');
    if (result.info) rowLine('Fixture', result.info);
    rowLine('Payload', JSON.stringify(result.payload));
    return;
  }

  rowLine('Estado', 'EJECUTADO');
  rowLine('Payload', JSON.stringify(result.payload));
  rowLine('HTTP success', String(Boolean(result.response?.success)));
  if (result.checks) {
    rowLine('Checks', JSON.stringify(result.checks));
  }
}

async function main() {
  const dryRun = !getFlag('run');
  const force = getFlag('force');
  const baseUrl = getArgValue('base-url', process.env.WEBHOOK_BASE_URL || 'http://localhost:3000');

  section('SofIA - Simulador de Webhook (3 escenarios)');
  rowLine('Modo', dryRun ? 'DRY-RUN (seguro)' : 'RUN (escribe en DB)');
  rowLine('Base URL', baseUrl);
  rowLine('NODE_ENV', process.env.NODE_ENV || '(no definido)');

  ensureSafeExecution({ dryRun, force, baseUrl });

  const results = [];
  results.push(await runScenarioEnCursoToNoContesta({ dryRun, baseUrl }));
  results.push(await runScenarioFranjaPM({ dryRun, baseUrl }));
  results.push(await runScenarioNotaHoraCallback({ dryRun, baseUrl }));

  results.forEach(printScenarioResult);

  section('Resumen Final');
  const executed = results.filter((r) => !r.skipped && !r.dryRun);
  const passed = executed.filter((r) => r.checks?.ok === true).length;

  rowLine('Total escenarios', String(results.length));
  rowLine('Ejecutados', String(executed.length));
  rowLine('Checks OK', `${passed}/${executed.length}`);

  if (!dryRun && executed.length > 0 && passed < executed.length) {
    process.exitCode = 2;
  }
}

main()
  .catch((err) => {
    console.error('\n❌ Error en simulador:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await pool.end();
    } catch (_) {
      // ignore close errors
    }
  });


