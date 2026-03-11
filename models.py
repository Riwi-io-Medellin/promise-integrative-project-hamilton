from pydantic import BaseModel, Field
from typing import Optional

class AgendarCitaTool(BaseModel):
    """Guarda el resultado del chat, ya sea una cita confirmada, reprogramación o sin acuerdo."""
    resultado: str = Field(..., description="Estado: 'AGENDADO', 'PENDIENTE', 'NO_INTERESADO', 'NUMERO_INCORRECTO'")
    dia: Optional[str] = Field(None, description="Solo si se agendó (ej: 'miércoles').")
    hora: Optional[str] = Field(None, description="Solo si se agendó (ej: '7:00 PM').")
    nota: Optional[str] = Field(None, description="Detalles útiles para el equipo humano.")
    fecha_seleccionada_legible: Optional[str] = Field(None, description="Valor exacto de fecha_legible del evento elegido.")
    candidato_id: str = Field(..., description="UUID del candidato.")
    evento_id: Optional[int] = Field(None, description="ID del evento elegido.")
