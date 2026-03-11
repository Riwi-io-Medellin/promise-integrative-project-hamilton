import os
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

supabase: Client = create_client(
    os.environ.get("SUPABASE_URL"),
    os.environ.get("SUPABASE_KEY")
)


def obtener_contexto_candidato(telefono: str):
    # Asegurar el formato +57 para buscar en BD
    telefono_bd = f"+{telefono}" if not telefono.startswith("+") else telefono

    # 1. Buscar al candidato
    response_cand = supabase.table("candidatos").select("*, sedes(nombre), horarios(descripcion)").eq("telefono",
                                                                                                      telefono_bd).execute()

    if not response_cand.data:
        return None

    candidato = response_cand.data[0]
    sede_id = candidato["sede_interes_id"]
    fase_actual = candidato["fase_actual"]

    # 2. Buscar eventos reales disponibles para este candidato (misma sede y misma fase)
    response_eventos = supabase.table("eventos").select("id, fecha_hora, horarios(descripcion)").eq("sede_id",
                                                                                                    sede_id).eq(
        "tipo_reunion", fase_actual).eq("estado", "DISPONIBLE").execute()

    eventos_db = response_eventos.data
    eventos_disponibles = []
    lista_horarios_texto = ""

    # Formatear los eventos encontrados para pasárselos a la IA
    if eventos_db:
        for idx, evento in enumerate(eventos_db):
            # Parsear la fecha_hora que viene de Supabase (ej: '2026-03-14T14:00:00+00:00')
            # En un entorno real, usarías librerías como dateutil, aquí hacemos un parseo básico
            fecha_obj = datetime.fromisoformat(evento["fecha_hora"].replace("Z", "+00:00"))

            # Formatear a algo legible (ej: "miércoles 18 de febrero a las 3:00 PM")
            # Nota: datetime en python no formatea nombres de días en español por defecto sin locale,
            # lo mantenemos simple para la IA con el formato YYYY-MM-DD Hora
            fecha_legible = f"{fecha_obj.strftime('%Y-%m-%d')} a las {evento['horarios']['descripcion']}"

            eventos_disponibles.append({
                "fecha_legible": fecha_legible,
                "evento_id": evento["id"]
            })
            lista_horarios_texto += f"{idx + 1}) {fecha_legible}\n"
    else:
        lista_horarios_texto = "Actualmente no tenemos horarios disponibles en tu sede. Pronto abriremos nuevos cupos."

    return {
        "id": candidato["id"],
        "nombre": candidato["nombre"],
        "motivo": fase_actual,
        "ciudad": candidato["sedes"]["nombre"] if candidato.get("sedes") else "Medellín",
        "lista_horarios": lista_horarios_texto.strip(),
        "eventos_disponibles": eventos_disponibles,
        "intentos": candidato["intentos_llamada"],
        "nota_previa": candidato["nota_horario"] or ""
    }
