import os
import json
from openai import AsyncOpenAI
from models import AgendarCitaTool
from database import supabase

client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

# Diccionario en memoria para historial (En producción, guarda esto en Supabase/Redis)
memoria_conversaciones = {}


def generar_prompt_chat(contexto: dict) -> str:
    # EL PROMPT HA SIDO ADAPTADO A CHAT (Lectura en pantalla, emojis, interacciones cortas)
    return f"""Eres Sofía, Coordinadora de Admisiones de Riwi (centro de entrenamiento para desarrolladores).
Tu medio de comunicación es WhatsApp. Tu tono es profesional, alentador y ágil. Usas emojis moderadamente.

# VARIABLES DE CONTEXTO
- ID: {contexto['id']}
- Nombre: {contexto['nombre']}
- Evento: {contexto['motivo']} (Si es PRUEBA_LOGICA: lógica básica. Si es ENTREVISTA: conocer perfil)
- Ciudad: {contexto['ciudad']}
- Horarios: {contexto['lista_horarios']}
- Eventos disponibles: {json.dumps(contexto['eventos_disponibles'])}
- Nota previa: {contexto['nota_previa']}

# OBJETIVO
Confirmar la asistencia al {contexto['motivo']}.

# GUIÓN (Sigue este orden adaptándote a las respuestas del usuario)
1. Saludo (SOLO EN EL PRIMER MENSAJE):
"¡Hola {contexto['nombre']}! 👋 Soy Sofía de Riwi. Hace unos meses te inscribiste para formarte como developer. ¡Ya haces parte del proceso de beca 100% condonable! 🚀"

2. Oferta:
"Para continuar, necesito confirmar tu asistencia al {contexto['motivo']}. Tengo estos espacios disponibles:\n{contexto['lista_horarios']}\n¿Cuál te sirve?"

3. Cierre (SOLO tras confirmar día y hora):
"¡Listo! Quedas agendado para el [Día] a las [Hora]. 🗓️\n\n📌 Recuerda:\n- Traer audífonos de cable 🎧 y tu documento 🪪.\n📍 Ubicación: [Medellín: Outlet de Moda, 3er piso, Guayabal | Barranquilla: Calle 40 #46-223, centro histórico]."

# USO DE HERRAMIENTA
Una vez el usuario confirme la hora exacta, DEBES llamar a la herramienta `AgendarCitaTool`. NO la llames si solo dijo "el miércoles" sin confirmar la hora.
Si el usuario ya no está interesado, llama la herramienta con "NO_INTERESADO".
"""


async def procesar_mensaje(telefono: str, mensaje_usuario: str, contexto_db: dict):
    if telefono not in memoria_conversaciones:
        # Inicializar historial con el System Prompt dinámico
        memoria_conversaciones[telefono] = [
            {"role": "system", "content": generar_prompt_chat(contexto_db)}
        ]

    memoria_conversaciones[telefono].append({"role": "user", "content": mensaje_usuario})

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=memoria_conversaciones[telefono],
        tools=[{
            "type": "function",
            "function": {
                "name": "AgendarCitaTool",
                "description": AgendarCitaTool.__doc__,
                "parameters": AgendarCitaTool.model_json_schema()
            }
        }],
        tool_choice="auto"
    )

    msg_ia = response.choices[0].message

    if msg_ia.tool_calls:
        tool_call = msg_ia.tool_calls[0]
        args = json.loads(tool_call.function.arguments)

        # 1. Guardar en Base de Datos (Mapeo a tu tabla 'candidatos' o 'llamadas')
        estado_gestion = args.get("resultado")  # AGENDADO, PENDIENTE, etc.
        supabase.table("candidatos").update({
            "nota_horario": args.get("nota") or "Agendado vía WhatsApp Bot",
            "evento_asignado_id": args.get("evento_id")
        }).eq("id", args.get("candidato_id")).execute()

        # Opcional: Generar mensaje final de despedida
        respuesta_final = "¡Hecho! Tu cita ha sido guardada en nuestro sistema. Nos vemos pronto en Riwi. 🚀"
        memoria_conversaciones[telefono].append({"role": "assistant", "content": respuesta_final})
        return respuesta_final
    else:
        respuesta_texto = msg_ia.content
        memoria_conversaciones[telefono].append({"role": "assistant", "content": respuesta_texto})
        return respuesta_texto
