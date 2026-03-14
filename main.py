import os
import httpx
from fastapi import FastAPI, Request
from models import SolicitudChat
from ai_agent import procesar_mensaje, generar_prompt_chat, generar_prompt_faq, sesiones_activas
from whatsapp_utils import enviar_mensaje_whatsapp
from dotenv import load_dotenv

load_dotenv()
app = FastAPI(title="Sofia Chat Microservicio")

URL_SISTEMA_CENTRAL = os.environ.get("WEBHOOK_SISTEMA_CENTRAL")


@app.post("/solicitar-chat")
async def iniciar_chat(solicitud: SolicitudChat):
    """Recibe la orden desde Sofía Calls para iniciar el chat con un candidato o invitado."""
    telefono = solicitud.telefono.replace("+", "")

    contexto = solicitud.model_dump()
    sesiones_activas[telefono] = {
        "candidato_id": solicitud.candidato_id,
        "es_faq": False,  # Marcador: esto NO es orgánico, es evento oficial
        "contexto_original": contexto,
        "historial": [
            {"role": "system", "content": generar_prompt_chat(contexto)}
        ]
    }

    # Lógica condicional para el mensaje inicial basado en el motivo del evento
    if solicitud.motivo == "PRESENTACION_PROYECTOS":
        primer_mensaje = f"¡Hola {solicitud.nombre}! 👋 Soy Sofía, el primer agente de Inteligencia Artificial creado por *Promise*.\n\nTe escribo para invitarte muy especialmente a nuestra presentación de proyectos ante jurados este *lunes a las 10:00 AM*. En Promise creamos agentes a medida para empresas que quieren dejar de perder tiempo en tareas repetitivas, multiplicando la capacidad operativa y devolviéndole el tiempo a las personas.\n\nMe encantaría verte allí y mostrarte lo que puedo hacer. ¿Tienes alguna pregunta sobre el evento o sobre nosotros? 🤖✨"

    elif solicitud.nota_previa == "Ocupado":
        primer_mensaje = f"¡Hola {solicitud.nombre}! 👋 Soy Sofía de Riwi. Te escribo de nuevo porque en nuestra llamada anterior estabas ocupado. ¿Tienes un minuto ahora para continuar con tu proceso de beca? Tengo estos espacios para tu {solicitud.motivo}:\n\n{solicitud.lista_horarios}\n\n¿Te funciona alguno?"

    else:
        primer_mensaje = f"¡Hola {solicitud.nombre}! 👋 Soy Sofía de Riwi. Hace unos meses te inscribiste con nosotros para formarte como developer. Intentamos contactarte por llamada sin éxito, así que te escribo por aquí. 🚀\n\nPara continuar tu proceso, necesito confirmar tu asistencia a tu {solicitud.motivo}. Tengo estos espacios:\n\n{solicitud.lista_horarios}\n\n¿Cuál te sirve?"

    sesiones_activas[telefono]["historial"].append({"role": "assistant", "content": primer_mensaje})
    await enviar_mensaje_whatsapp(telefono, primer_mensaje)

    return {"status": "ok", "mensaje": f"Chat iniciado exitosamente con {solicitud.nombre}"}


@app.post("/webhook")
async def recibir_mensaje_whatsapp(request: Request):
    """Recibe los mensajes de texto que el usuario envía por WhatsApp (Vía Evolution API)."""
    try:
        body = await request.json()

        # Verificar evento de mensajes
        evento = body.get("event", "")
        if evento not in ["messages.upsert", "MESSAGES_UPSERT"]:
            return {"status": "ignorado", "reason": "No es un evento de mensaje"}

        # Extraer estructura del mensaje
        data = body.get("data", {})
        msg_data = data.get("message", data) if "key" not in data else data

        key = msg_data.get("key", {})
        from_me = key.get("fromMe", False)
        remote_jid = key.get("remoteJid", "")

        # Ignorar mensajes propios o de grupos
        if from_me or "@g.us" in remote_jid or "status@broadcast" in remote_jid:
            return {"status": "ignorado", "reason": "Mensaje del bot o irrelevante"}

        telefono = remote_jid.split("@")[0]

        # Extraer texto
        message_content = msg_data.get("message", {})
        texto = ""
        if "conversation" in message_content:
            texto = message_content["conversation"]
        elif "extendedTextMessage" in message_content:
            texto = message_content["extendedTextMessage"].get("text", "")

        if not texto:
            return {"status": "ignorado", "reason": "Sin texto"}

        # --- SISTEMA DE DESPERTAR AUTOMÁTICO (MODO FAQ) ---
        if telefono not in sesiones_activas:
            print(f"\n⚠️ El usuario {telefono} inició el chat orgánicamente. Modo FAQ activado.")

            sesiones_activas[telefono] = {
                "candidato_id": "contacto_organico_faq",
                "es_faq": True,  # Etiqueta clave para no enviar esto a la base de datos
                "historial": [
                    {"role": "system", "content": generar_prompt_faq()}  # Obtenemos el prompt desde ai_agent.py
                ]
            }

        # --- PROCESAMIENTO DE LA IA ---
        resultado = await procesar_mensaje(telefono, texto)

        print("\n" + "=" * 40)
        print(f"📩 MENSAJE DEL USUARIO ({telefono}): {texto}")
        print(f"🤖 DECISIÓN DE LA IA:")
        print(resultado.model_dump_json(indent=2))
        print("=" * 40 + "\n")

        # Responder al usuario por WhatsApp
        await enviar_mensaje_whatsapp(telefono, resultado.respuesta_ia_para_usuario)

        # --- GESTIÓN DE CIERRE DE CONVERSACIÓN ---
        if resultado.estado_conversacion == "FINALIZADA":

            # Si NO es FAQ (fue un chat iniciado por Sofía Calls)
            if not sesiones_activas[telefono].get("es_faq", False):
                payload_final = {
                    "candidato_id": sesiones_activas[telefono].get("candidato_id"),
                    "telefono": telefono,
                    "resultado_agenda": resultado.resultado_agenda,
                    "evento_id": resultado.evento_id,
                    "nota": resultado.nota_para_equipo
                }

                print(f"✅ CHAT FINALIZADO. Payload a enviar a la BD: {payload_final}")

                if URL_SISTEMA_CENTRAL and URL_SISTEMA_CENTRAL.startswith("http"):
                    try:
                        async with httpx.AsyncClient() as client_http:
                            await client_http.post(URL_SISTEMA_CENTRAL, json=payload_final)
                    except Exception as e:
                        print(f"❌ Error enviando webhook al backend: {e}")
            else:
                # Si ERA un chat orgánico/FAQ, no enviamos nada a la base de datos
                print(f"✅ CHAT INFORMATIVO FINALIZADO orgánicamente. (No se envía a BD).")

            # En ambos casos, borramos la sesión
            del sesiones_activas[telefono]

        return {"status": "ok"}

    except Exception as e:
        print(f"❌ Error procesando mensaje del webhook: {e}")
        return {"status": "error", "message": str(e)}
