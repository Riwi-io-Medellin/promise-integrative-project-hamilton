from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class EventoDisponible(BaseModel):
    fecha_legible: str
    evento_id: int


class SolicitudChat(BaseModel):
    candidato_id: str
    telefono: str
    nombre: str
    motivo: str
    ciudad: str
    lista_horarios: str
    eventos_disponibles: List[EventoDisponible]
    nota_previa: Optional[str] = ""


class ResultadoCitaChat(BaseModel):
    # Usamos Literal para FORZAR a la IA a escoger solo una de estas dos opciones exactas
    estado_conversacion: Literal["EN_CURSO", "FINALIZADA"] = Field(...,
                                                                   description="Usa 'FINALIZADA' cuando el candidato ya confirmó, dio sus preferencias para esperar, rechazó, o es número equivocado. De lo contrario, 'EN_CURSO'.")

    respuesta_ia_para_usuario: str = Field(...,
                                           description="El mensaje que se enviará al WhatsApp del candidato. Usa formato de WhatsApp (como *negritas*).")

    # También forzamos el resultado
    resultado_agenda: Optional[Literal["AGENDADO", "PENDIENTE", "NO_INTERESADO", "NUMERO_INCORRECTO"]] = Field(None,
                                                                                                               description="El resultado de la negociación.")

    evento_id: Optional[int] = Field(None, description="El ID del evento elegido por el candidato. Null si no agendó.")
    nota_para_equipo: Optional[str] = Field(None,
                                            description="Nota adicional para el equipo humano (ej: 'Prefiere en las mañanas').")
