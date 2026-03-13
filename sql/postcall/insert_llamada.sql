INSERT INTO llamadas (
  candidato_id,
  fecha_hora_llamada,
  resultado_id,
  conversation_id,
  resumen,
  dia_agendado,
  hora_agendado,
  evento_asignado_id,
  agente_id
)
VALUES (
  $1,
  now(),
  $2,
  $3,
  $4,
  $5,
  $6,
  $7,
  $8
)
RETURNING id;

