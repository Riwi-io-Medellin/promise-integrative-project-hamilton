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

    telefono_limpio = telefono_destino.replace("+", "")

    payload = {
        "number": telefono_limpio,
        "text": texto,
        "options": {
            "delay": 1200,
            "presence": "composing"
        }
    }

    # AÑADIMOS UN TIMEOUT MÁS LARGO (ej: 30 segundos) para aguantar picos de peticiones
    timeout = httpx.Timeout(30.0)

    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(url, headers=headers, json=payload)
        if response.status_code not in [200, 201]:
            print(f"Error enviando WA: {response.text}")
        response.raise_for_status()
