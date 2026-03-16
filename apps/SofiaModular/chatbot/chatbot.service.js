// chatbot/chatbot.service.js
'use strict';

const axios = require('axios');
const https = require('https');
// Ajustar ruta relativa al pool de la base de datos
const pool = require('../src/db/pool');

const DAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function formatChatbotDate(fechaHoraIso) {
  // Ajuste timezone similar a dateHelpers
  const cleaned  = String(fechaHoraIso).replace('+00:00', '').replace('Z', '');
  const fecha    = new Date(cleaned);

  const diaNombre = DAYS_ES[fecha.getDay()];
  const horas     = fecha.getHours();
  const minutos   = String(fecha.getMinutes()).padStart(2, '0');
  const ampm      = horas >= 12 ? 'PM' : 'AM';
  const hora12    = horas % 12 || 12;

  return {
    simple: `${diaNombre} ${hora12}:${minutos} ${ampm}`,
    full:   `${diaNombre} a las ${hora12}:${minutos} ${ampm}`
  };
}

/**
 * URL del webhook externo (ngrok) del Chatbot.
 * Debe definirse en .env como CHATBOT_WEBHOOK_URL.
 */
const CHATBOT_WEBHOOK_URL = process.env.CHATBOT_WEBHOOK_URL || 'http://localhost:4000/webhook/initiate';

/**
 * 1. Verifica si el candidato cumple la condición de 9 llamadas NO_CONTESTAS hoy.
 * @param {string} candidatoId - UUID del candidato.
 * @returns {Promise<boolean>}
 */
async function shouldTriggerChatbot(candidatoId) {
  // Contamos llamadas del día actual que resultaron en NO_CONTESTA
  const query = `
    SELECT COUNT(*) as failed_calls
    FROM public.llamadas l
    JOIN public.resultados_llamada rl ON l.resultado_id = rl.id
    WHERE l.candidato_id = $1
      AND l.fecha_hora_llamada::date = CURRENT_DATE
      AND rl.codigo = 'NO_CONTESTA'
  `;
  
  const { rows } = await pool.query(query, [candidatoId]);
  const count = parseInt(rows[0].failed_calls, 10);
  
  // Condición estricta: exactamente 9 llamadas.
  // Esto evita disparar múltiples veces el mismo día si sigue fallando.
  return count === 9;
}

/**
 * 2. Recopila datos del candidato y eventos compatibles.
 * @param {string} candidatoId 
 */
async function gatherCandidateData(candidatoId) {
  // Obtener Info Candidato
  const candidateQuery = `
    SELECT 
      c.id, c.nombre, c.apellido, c.telefono, c.correo, 
      c.fase_actual, c.franja_actual, 
      m.nombre as ciudad_nombre,
      eg.codigo as estado_gestion
    FROM public.candidatos c
    LEFT JOIN public.estados_gestion eg ON c.estado_gestion_id = eg.id
    LEFT JOIN public.municipios m ON c.municipio_id = m.id
    WHERE c.id = $1
  `;
  const candidateRes = await pool.query(candidateQuery, [candidatoId]);
  const candidate = candidateRes.rows[0];

  if (!candidate) throw new Error(`Candidato ${candidatoId} no encontrado.`);

  // Obtener Eventos Compatibles basados en la fase actual
  // Asumimos que la fase coincide con tipo_reunion en eventos
  const eventsQuery = `
    SELECT 
      e.id, e.tipo_reunion, e.fecha_hora, 
      e.inscritos_actuales, e.capacidad_total, e.descripcion,
      s.nombre as sede
    FROM public.eventos e
    LEFT JOIN public.sedes s ON e.sede_id = s.id
    WHERE e.tipo_reunion = $1
      AND e.estado = 'DISPONIBLE'
      AND e.fecha_hora > NOW()
    ORDER BY e.fecha_hora ASC
    LIMIT 5
  `;
  
  const eventsRes = await pool.query(eventsQuery, [candidate.fase_actual]);
  const rawEvents = eventsRes.rows;

  // Procesar eventos para el formato requerido
  const eventos_disponibles = rawEvents.map(e => {
    const formatted = formatChatbotDate(e.fecha_hora);
    return {
      fecha_legible: formatted.full, // "lunes a las 3:00 PM"
      evento_id: e.id,
      _simple: formatted.simple // helper interno
    };
  });

  // Construir string lista_horarios: "1) lunes 3:00 PM\n2) martes 7:00 PM"
  const lista_horarios = eventos_disponibles
      .map((e, idx) => `${idx + 1}) ${e._simple}`)
      .join('\n');

  // Limpiar eventos_disponibles de propiedades internas
  const finalEvents = eventos_disponibles.map(({ _simple, ...rest }) => rest);

  // Mensaje precocinado para facilitar el envío por WhatsApp
  const mensaje = `Hola ${candidate.nombre}, hemos intentado contactarte varias veces sin éxito. ` +
                  `Nos gustaría agendar una cita contigo. Por favor responde con el número de tu preferencia:\n\n${lista_horarios}`;

  // Payload final
  return {
    candidato_id: candidate.id, // Requerido por el chatbot para saber a quién actualizar luego
    telefono: candidate.telefono ? candidate.telefono.replace('+', '') : '', // Quitar '+' si existe
    nombre: candidate.nombre,
    motivo: candidate.fase_actual, // Asumimos fase_actual es el motivo (ej. ENTREVISTA)
    ciudad: candidate.ciudad_nombre || 'Desconocida',
    lista_horarios: lista_horarios,
    eventos_disponibles: finalEvents,
    mensaje: mensaje // Nuevo campo con el texto completo
  };
}

/**
 * 3. Envía el payload al Chatbot externo.
 * @param {object} payload 
 */
async function sendToChatbot(payload) {
  try {
    console.log(`[ChatbotService] Enviando datos de usuario ${payload.nombre} a ${CHATBOT_WEBHOOK_URL}...`);
    
    // Configurar agente HTTPS para evitar errores de certificado con ngrok/dev
    const agent = new https.Agent({  
      rejectUnauthorized: false
    });

    const response = await axios.post(CHATBOT_WEBHOOK_URL, payload, {
      timeout: 10000, // 10s timeout
      httpsAgent: agent,
      headers: {
        'ngrok-skip-browser-warning': 'true', // Salta la pantalla de advertencia de ngrok gratuito
        'User-Agent': 'SofIA-Bot/2.0'
      }
    });
    console.log(`[ChatbotService] Respuesta del bot: ${response.status}`);
    return response.data;
  } catch (error) {
    console.error('[ChatbotService] Error enviando a webhook externo:', error.message);
    // Retornar detalle del error para facilitar depuración en endpoints manuales
    return { 
        error_envio: true, 
        message: error.message,
        details: error.response ? error.response.data : 'Sin respuesta del servidor remoto'
    };
  }
}

/**
 * Funcionalidad Principal: Verifica condición y ejecuta si se cumple.
 * Debe ser llamada cuando se registre una llamada fallida.
 */
async function processCandidateCallFail(candidatoId) {
  try {
    const trigger = await shouldTriggerChatbot(candidatoId);
    if (trigger) {
      console.log(`[ChatbotService] Condición cumplida (9 llamadas fallidas hoy) para candidato ${candidatoId}. Despertando a SofIA Chat...`);
      const data = await gatherCandidateData(candidatoId);
      await sendToChatbot(data);
    } 
  } catch (err) {
    console.error('[ChatbotService] Error en processCandidateCallFail:', err);
  }
}

/**
 * Trigger manual para pruebas (salta la verificación de 9 llamadas).
 */
async function forceChatbotTrigger(candidatoId) {
  console.log(`[ChatbotService] Forzando trigger manual para candidato ${candidatoId}...`);
  const data = await gatherCandidateData(candidatoId);
  return await sendToChatbot(data);
}

/**
 * 4. Procesa la respuesta del Chatbot (Webhook entrante).
 * Actualiza la BD con los resultados del chat.
 * @param {object} body - Payload recibido del bot.
 */
async function handleBotWebhook(body) {
  console.log('[ChatbotService] Procesando webhook del bot:', JSON.stringify(body));

  // Desestructuramos solo los campos esperados según requerimiento
  const { candidato_id, telefono, resultado_agenda, evento_id, nota } = body;
  let targetId = candidato_id;

  // Validación básica de campos obligatorios (según usuario, solo nota y evento_id pueden ser vacíos)
  if (!candidato_id && !telefono) {
      throw new Error('Faltan identificadores: candidato_id o telefono son requeridos.');
  }

  // Si no llega candidato_id, intentar buscar por telefono (como respaldo)
  if (!targetId && telefono) {
      // Intentar formatear telefono para buscar: "+57..." o "57..."
      let tel = telefono;
      if (!tel.startsWith('+')) tel = '+' + tel; // La BD guarda con + usualmente

      const searchRes = await pool.query('SELECT id FROM public.candidatos WHERE telefono = $1 LIMIT 1', [tel]);
      if (searchRes.rows.length > 0) {
          targetId = searchRes.rows[0].id;
      } else {
        throw new Error(`No se encontró candidato con telefono ${telefono}`);
      }
  }

  if (!targetId) throw new Error('No se pudo identificar al candidato (targetId nulo).');
  
  // Validación de resultado_agenda
  if (!resultado_agenda) {
      console.warn('[ChatbotService] Webhook recibido sin resultado_agenda. Se procesará solo nota si existe.');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Manejo de estado basado en resultado_agenda
    let statusToSet = null;

    // Lógica de mapeo de estados del bot a estados internos
    if (resultado_agenda === 'AGENDADO') {
        // En la BD el estado se llama 'AGENDADO' (según consulta reciente)
        const statusRes = await client.query("SELECT id FROM public.estados_gestion WHERE codigo = 'AGENDADO' LIMIT 1");
        if (statusRes.rows.length > 0) {
            statusToSet = statusRes.rows[0].id;
        } else {
             // Fallback: intentar buscar 'CITA_AGENDADA' por si acaso
             const statusResBackup = await client.query("SELECT id FROM public.estados_gestion WHERE codigo = 'CITA_AGENDADA' LIMIT 1");
             if (statusResBackup.rows.length > 0) statusToSet = statusResBackup.rows[0].id;
        }
    } 
    // Aquí se pueden agregar más mapeos (ej. 'NO_INTERESADO' -> 'DADO_DE_BAJA' o similar)

    if (statusToSet) {
        await client.query(
            'UPDATE public.candidatos SET estado_gestion_id = $1, updated_at = NOW() WHERE id = $2',
            [statusToSet, targetId]
        );
        console.log(`[ChatbotService] Estado actualizado a ${resultado_agenda} (ID: ${statusToSet}) para candidato ${targetId}`);
    }

    // 2. Manejo de Inscripción a Evento (si vino AGENDADO y hay evento_id válido)
    if (resultado_agenda === 'AGENDADO' && evento_id) {
        // Permitimos cualquier ID (UUID o Entero), la DB validará la existencia
        try {
             await client.query('UPDATE public.candidatos SET evento_asignado_id = $1 WHERE id = $2', [evento_id, targetId]);
             // Incrementar inscritos 
             await client.query('UPDATE public.eventos SET inscritos_actuales = inscritos_actuales + 1 WHERE id = $1', [evento_id]);
             console.log(`[ChatbotService] Candidato ${targetId} inscrito en evento ${evento_id}`);
        } catch (dbErr) {
            console.error(`[ChatbotService] Error asignando evento ${evento_id}:`, dbErr.message);
            // No hacemos throw para no tumbar toda la transacción si el evento falla, 
            // aunque idealmente debería ser atómico. Mantendremos la transacción viva para guardar la nota.
        }
    }

    // 3. Insertar nota histórica si se provee
    if (nota) {
        // En vez de sobrescribir, idealmente concatenamos o guardamos en historial. 
        // Por ahora, actualizamos nota_horario como solicitado previamente.
        await client.query(
            'UPDATE public.candidatos SET nota_horario = $1 WHERE id = $2',
            [nota, targetId]
        );
         console.log(`[ChatbotService] Nota actualizada para candidato ${targetId}`);
    }

    await client.query('COMMIT');
    return { success: true, message: 'Datos procesados correctamente' };

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[ChatbotService] Error actualizando DB desde bot:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  processCandidateCallFail,
  handleBotWebhook,
  forceChatbotTrigger,
  sendToChatbot,
  gatherCandidateData // Exportada para debug
};
