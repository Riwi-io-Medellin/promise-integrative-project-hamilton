import os
from fastapi import FastAPI, Request
from database import supabase, obtener_contexto_candidato
from ai_agent import procesar_mensaje, generar_prompt_chat, memoria_conversaciones
from whatsapp_utils import enviar_mensaje_whatsapp

app = FastAPI(title="Sofia Chatbot Riwi - Evolution API")


# =====================================================================
# 1. ENDPOINT: RECIBIR MENSAJES DE WHATSAPP (WEBHOOK)
# =====================================================================
@app.post("/webhook")
async def recibir_mensaje(request: Request):
    """Recepción de mensajes desde Evolution API"""
    body = await request.json()

    # Evolution notifica varios eventos, solo nos interesa cuando llega un mensaje nuevo
    event_type = body.get("event")

    if event_type == "messages.upsert":
        data = body.get("data", {})

        # Evitar auto-responder a nuestros propios mensajes enviados
        if data.get("key", {}).get("fromMe"):
            return {"status": "ignorado (mensaje propio)"}

        # Extraer teléfono (Evolution lo envía como '573001234567@s.whatsapp.net')
        remote_jid = data.get("key", {}).get("remoteJid", "")
        telefono = remote_jid.split("@")[0]

        # Extraer el texto del mensaje del usuario
        message_data = data.get("message", {})
        texto = message_data.get("conversation") or message_data.get("extendedTextMessage", {}).get("text", "")

        if not texto:
            return {"status": "ignorado (no es texto)"}

        # 1. Buscar si el candidato existe en BD y obtener sus eventos reales
        contexto = obtener_contexto_candidato(telefono)

        if not contexto:
            print(f"Candidato con teléfono {telefono} no encontrado en BD.")
            return {"status": "ok"}  # Ignoramos números desconocidos

        # 2. Procesar la respuesta con la IA de Sofía
        respuesta = await procesar_mensaje(telefono, texto, contexto)

        # 3. Enviar la respuesta usando Evolution API
        try:
            await enviar_mensaje_whatsapp(telefono, respuesta)
            print(f"Respuesta enviada a {telefono}")
        except Exception as e:
            print(f"Error al enviar mensaje a {telefono}: {e}")

    return {"status": "ok"}


# =====================================================================
# 2. ENDPOINT: INICIAR CONVERSACIÓN PROACTIVA (CAMPAÑA)
# =====================================================================
@app.post("/iniciar-campana")
async def iniciar_campana_proactiva():
    """Endpoint para iniciar conversación con todos los candidatos PENDIENTES"""

    # 1. Buscar el ID del estado 'PENDIENTE' en la tabla estados_gestion
    resp_estado = supabase.table("estados_gestion").select("id").eq("codigo", "PENDIENTE").execute()
    if not resp_estado.data:
        return {"error": "No existe el estado PENDIENTE en la BD"}

    estado_pendiente_id = resp_estado.data[0]["id"]

    # 2. Obtener todos los candidatos que están en estado PENDIENTE
    resp_candidatos = supabase.table("candidatos").select("telefono").eq("estado_gestion_id",
                                                                         estado_pendiente_id).execute()
    candidatos_pendientes = resp_candidatos.data

    if not candidatos_pendientes:
        return {"mensaje": "No hay candidatos pendientes por contactar."}

    mensajes_enviados = 0

    # 3. Iterar sobre cada candidato y enviarle el primer mensaje
    for cand in candidatos_pendientes:
        # Evolution requiere el número sin el '+'. Aseguramos que esté limpio.
        telefono = cand["telefono"].replace("+", "")

        # Obtenemos su contexto con los eventos reales de la BD
        contexto = obtener_contexto_candidato(telefono)

        # Si el candidato existe y tiene eventos disponibles en su sede
        if contexto and contexto["eventos_disponibles"]:

            # Inicializamos la memoria de la IA para esta persona con las instrucciones
            memoria_conversaciones[telefono] = [
                {"role": "system", "content": generar_prompt_chat(contexto)}
            ]

            # Armamos el primer mensaje proactivo
            primer_mensaje = f"¡Hola {contexto['nombre']}! 👋 Soy Sofía de Riwi. Hace unos meses te inscribiste para formarte como developer y ser parte de nuestras becas 100% condonables. ¡Ya haces parte del proceso! 🚀\n\nPara continuar, necesito confirmar tu asistencia a tu {contexto['motivo']}. Tengo estos espacios disponibles:\n\n{contexto['lista_horarios']}\n\n¿Te funciona alguno?"

            # Lo guardamos en la memoria como si la IA ya lo hubiera dicho
            memoria_conversaciones[telefono].append({"role": "assistant", "content": primer_mensaje})

            # Lo enviamos por WhatsApp
            try:
                await enviar_mensaje_whatsapp(telefono, primer_mensaje)
                mensajes_enviados += 1
                print(f"Primer mensaje enviado proactivamente a {telefono}")
            except Exception as e:
                print(f"Error enviando mensaje proactivo a {telefono}: {e}")

    return {
        "status": "Completado",
        "candidatos_contactados": mensajes_enviados
    }
