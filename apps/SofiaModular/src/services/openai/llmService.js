/**
 * src/services/openai/llmService.js
 * LLM agent logic using OpenAI Chat Completions with tool calling.
 *
 * Agent: Sofía – Coordinadora de Admisiones
 * Language: Spanish
 * Personality: Professional, warm, concise (2-3 sentences max per turn).
 *
 * Tool:  agendar_cita – records the final call outcome.
 *
 * Railguards enforced via system prompt:
 *   - Only offer hours from `eventosDisponibles`
 *   - Never schedule without explicit confirmation
 *   - Require candidato to say "sí" / "de acuerdo" before calling agendar_cita
 */
'use strict';

const { OpenAI } = require('openai');
const logger     = require('../../utils/logger');

let _openai = null;

function getOpenAI() {
  if (!_openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Missing OPENAI_API_KEY env var');
    _openai = new OpenAI({ apiKey });
  }
  return _openai;
}

// ── Tools ────────────────────────────────────────────────────────────────────

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'agendar_cita',
      description:
        'Registra el resultado final de la llamada. Llama ÚNICAMENTE cuando tengas un resultado definitivo y confirmado. '
        + 'Para AGENDADO: el candidato debe haber dicho explícitamente "sí" o "de acuerdo" al horario propuesto.',
      parameters: {
        type: 'object',
        properties: {
          resultado: {
            type: 'string',
            enum: ['AGENDADO', 'PENDIENTE', 'NO_INTERESADO', 'NUMERO_INCORRECTO', 'BUZON_VOZ'],
            description:
              'AGENDADO=cita confirmada, PENDIENTE=no disponible ahora/llamar después, '
              + 'NO_INTERESADO=no quiere, NUMERO_INCORRECTO=número equivocado, BUZON_VOZ=cayó en buzón',
          },
          evento_id: {
            type: 'number',
            description: 'ID numérico del evento agendado. Obligatorio si resultado=AGENDADO.',
          },
          dia: {
            type: 'string',
            description: 'Día del evento en texto (ej: "lunes"). Obligatorio si resultado=AGENDADO.',
          },
          hora: {
            type: 'string',
            description: 'Hora del evento (ej: "3:00 PM"). Obligatorio si resultado=AGENDADO.',
          },
          nota: {
            type: 'string',
            description: 'Resumen breve de la llamada o motivo del resultado.',
          },
          hora_callback: {
            type: 'string',
            description:
              'Hora para volver a llamar en formato HH:MM de 24h (ej: "15:00"). '
              + 'Usar solo si el candidato pidió que le llamaran más tarde (resultado=PENDIENTE).',
          },
        },
        required: ['resultado'],
      },
    },
  },
];

// ── System prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(candidatoNombre, eventosDisponibles) {
  const eventosText = eventosDisponibles.length
    ? eventosDisponibles
        .map((e, i) => `  ${i + 1}. ${e.fecha_legible} (evento_id: ${e.evento_id})`)
        .join('\n')
    : '  (No hay eventos disponibles en este momento)';

  return `Eres Sofía, Coordinadora de Admisiones de una institución educativa.
Tu objetivo en esta llamada es agendar una cita de orientación con ${candidatoNombre}.

IDENTIDAD Y TONO
- Habla siempre en español, de forma cálida, profesional y concisa.
- Cada respuesta tuya debe tener máximo 2-3 oraciones.
- No digas tu nombre completo ni el nombre de la institución en cada turno; solo al presentarte.

GUIÓN INICIAL (primer mensaje al candidato)
"Hola, ¿hablo con ${candidatoNombre}? Soy Sofía, Coordinadora de Admisiones. Le llamo para agendar su cita de orientación. ¿Tiene un momento?"

REGLAS DE NEGOCIO (OBLIGATORIAS, nunca violar)
1. SOLO ofrece horarios de la lista siguiente. No inventes ni modifiques horarios.
   Horarios disponibles:
${eventosText}

2. NUNCA confirmes la cita sin que el candidato diga explícitamente "sí", "de acuerdo", "está bien" o equivalente.
   - Propón el horario → espera confirmación verbal → solo entonces llama agendar_cita(resultado=AGENDADO).

3. Si el candidato pide que le llamen a otra hora → usa agendar_cita(resultado=PENDIENTE, hora_callback="HH:MM").

4. Si dice que no le interesa → usa agendar_cita(resultado=NO_INTERESADO, nota="...").

5. Si el número es incorrecto o no es la persona → usa agendar_cita(resultado=NUMERO_INCORRECTO).

6. Si detectas que es un buzón de voz → usa agendar_cita(resultado=BUZON_VOZ).

7. ANTI-BUCLE: si llevas 2 turnos sin avanzar hacia un resultado, registra agendar_cita(resultado=PENDIENTE, nota="Sin progreso") y finaliza con cortesía.

FLUJO ESPERADO
1. Preguntar si hablas con la persona correcta.
2. Presentarte brevemente.
3. Indicar el motivo de la llamada.
4. Ofrecer horarios disponibles.
5. Al confirmar, llamar agendar_cita(resultado=AGENDADO, ...) con el evento_id correcto.
6. Despedirte cordialmente.`;
}

// ── Main function ─────────────────────────────────────────────────────────────

/**
 * Send a user turn to the LLM and get the agent response.
 *
 * @param {Array<{role:string,content:string}>} history – Conversation history
 * @param {{ candidatoNombre: string, eventosDisponibles: Array }} context
 * @returns {Promise<{ text: string, toolCall: object|null, updatedHistory: Array }>}
 */
async function processMessage(history, context) {
  const openai = getOpenAI();
  const model  = process.env.OPENAI_MODEL || 'gpt-4o';

  const systemPrompt = buildSystemPrompt(
    context.candidatoNombre  || 'candidato',
    context.eventosDisponibles || [],
  );

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history,
  ];

  const response = await openai.chat.completions.create({
    model,
    messages,
    tools:        TOOLS,
    tool_choice:  'auto',
    temperature:  0.4,
    max_tokens:   250,
  });

  const choice = response.choices[0];
  const msg    = choice.message;

  let toolCall = null;
  const text   = msg.content || '';

  if (msg.tool_calls?.length) {
    const tc = msg.tool_calls[0];
    try {
      toolCall = {
        name: tc.function.name,
        args: JSON.parse(tc.function.arguments),
        raw:  tc,
      };
      logger.info({ event: 'llm_tool_call', tool: toolCall.name, args: toolCall.args });
    } catch (e) {
      logger.error({ event: 'tool_call_parse_error', err: e.message });
    }
  }

  logger.info(
    { event: 'llm_response', model, finish_reason: choice.finish_reason, text_length: text.length },
    'LLM response received',
  );

  const updatedHistory = [...history, msg];
  return { text, toolCall, updatedHistory };
}

module.exports = { processMessage, TOOLS, buildSystemPrompt };
