import os
import httpx
from fastapi import FastAPI, Request
from models import SolicitudChat
from ai_agent import procesar_mensaje, generar_prompt_chat, sesiones_activas
from whatsapp_utils import enviar_mensaje_whatsapp
from dotenv import load_dotenv

load_dotenv()
app = FastAPI(title="Sofia Chat Microservicio")

URL_SISTEMA_CENTRAL = os.environ.get("WEBHOOK_SISTEMA_CENTRAL")


@app.post("/solicitar-chat")
async def iniciar_chat(solicitud: SolicitudChat):
    """Recibe la orden desde Sofía Calls para iniciar el chat con un candidato."""
    telefono = solicitud.telefono.replace("+", "")

    contexto = solicitud.model_dump()
    sesiones_activas[telefono] = {
        "candidato_id": solicitud.candidato_id,
        "contexto_original": contexto,
        "historial": [
            {"role": "system", "content": generar_prompt_chat(contexto)}
        ]
    }

    # Mensaje inicial basado en la nota previa
    if solicitud.nota_previa == "Ocupado":
        primer_mensaje = f"¡Hola {solicitud.nombre}! 👋 Soy Sofía de Riwi. Te escribo de nuevo porque en nuestra llamada anterior estabas ocupado. ¿Tienes un minuto ahora para continuar con tu proceso de beca? Tengo estos espacios para tu {solicitud.motivo}:\n\n{solicitud.lista_horarios}\n\n¿Te funciona alguno?"
    else:
        primer_mensaje = f"¡Hola {solicitud.nombre}! 👋 Soy Sofía de Riwi. Hace unos meses te inscribiste con nosotros para formarte como developer. Intentamos contactarte por llamada sin éxito, así que te escribo por aquí. 🚀\n\nPara continuar tu proceso, necesito confirmar tu asistencia a tu {solicitud.motivo}. Tengo estos espacios:\n\n{solicitud.lista_horarios}\n\n¿Cuál te sirve?"

    sesiones_activas[telefono]["historial"].append({"role": "assistant", "content": primer_mensaje})
    await enviar_mensaje_whatsapp(telefono, primer_mensaje)

    return {"status": "ok", "mensaje": f"Chat iniciado exitosamente con {solicitud.nombre}"}


@app.post("/webhook")
async def recibir_mensaje_whatsapp(request: Request):
    """Recibe los mensajes de texto que el usuario envía por WhatsApp (Vía Evolution API)."""
    body = await request.json()

    if body.get("event") == "messages.upsert":
        data = body.get("data", {})

        # Ignorar mensajes propios
        if data.get("key", {}).get("fromMe"):
            return {"status": "ignorado"}

        telefono = data.get("key", {}).get("remoteJid", "").split("@")[0]
        texto = data.get("message", {}).get("conversation") or data.get("message", {}).get("extendedTextMessage",
                                                                                           {}).get("text", "")

        if not texto or telefono not in sesiones_activas:
            return {"status": "ignorado o sin sesión activa"}

        try:
            # Mandar a procesar a la IA
            resultado = await procesar_mensaje(telefono, texto)

            # --- NUEVO: Imprimir TODO lo que decidió la IA en consola para debug ---
            print("\n" + "=" * 40)
            print(f"📩 MENSAJE DEL USUARIO: {texto}")
            print(f"🤖 DECISIÓN DE LA IA:")
            print(resultado.model_dump_json(indent=2))
            print("=" * 40 + "\n")

            # Responder al usuario por WhatsApp
            await enviar_mensaje_whatsapp(telefono, resultado.respuesta_ia_para_usuario)

            # Si la IA cerró la negociación, enviar el resultado a Sofía Calls
            if resultado.estado_conversacion == "FINALIZADA":
                payload_final = {
                    "candidato_id": sesiones_activas[telefono]["candidato_id"],
                    "telefono": telefono,
                    "resultado_agenda": resultado.resultado_agenda,
                    "evento_id": resultado.evento_id,
                    "nota": resultado.nota_para_equipo
                }

                print(f"✅ CHAT FINALIZADO CORRECTAMENTE. Payload a enviar a la BD: {payload_final}")

                # Enviar al backend de Sofía Calls
                if URL_SISTEMA_CENTRAL:
                    async with httpx.AsyncClient() as client:
                        await client.post(URL_SISTEMA_CENTRAL, json=payload_final)

                # Liberar memoria
                del sesiones_activas[telefono]

        except Exception as e:
            print(f"Error procesando mensaje: {e}")

    return {"status": "ok"}
