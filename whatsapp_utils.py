import os
import httpx
from dotenv import load_dotenv

load_dotenv()

EVO_URL = os.environ.get("EVOLUTION_API_URL")
EVO_TOKEN = os.environ.get("EVOLUTION_API_TOKEN")
INSTANCE_NAME = os.environ.get("EVOLUTION_INSTANCE_NAME")


async def enviar_mensaje_whatsapp(telefono_destino: str, texto: str):
    url = f"{EVO_URL}/message/sendText/{INSTANCE_NAME}"

    headers = {
        "apikey": EVO_TOKEN,
        "Content-Type": "application/json"
    }

    # Evolution v2 requiere que el número vaya SIN el '+'.
    # Por si la base de datos nos pasó el número con '+', se lo quitamos aquí.
    telefono_limpio = telefono_destino.replace("+", "")

    # El Payload actualizado para Evolution API v2
    payload = {
        "number": telefono_limpio,
        "text": texto,  # En v2 es simplemente 'text', ya no es 'textMessage'
        "options": {
            "delay": 1200,
            "presence": "composing"
        }
    }

    # Manejo de errores más detallado para que sepamos exactamente qué falla si vuelve a pasar
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload)

        if response.status_code != 201 and response.status_code != 200:
            print(f"Error enviando mensaje. Código: {response.status_code}")
            print(f"Detalle del error: {response.text}")

        response.raise_for_status()

