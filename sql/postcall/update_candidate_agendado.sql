UPDATE candidatos
SET
  estado_gestion_id = $2,
  evento_asignado_id = $3,
  ultimo_contacto = now(),
  nota_horario = COALESCE($4, nota_horario),
  updated_at = now()
WHERE id = $1;

