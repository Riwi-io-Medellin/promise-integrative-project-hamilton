UPDATE candidatos
SET
  estado_gestion_id = $2,
  ultimo_contacto = now(),
  nota_horario = COALESCE($3, nota_horario),
  updated_at = now()
WHERE id = $1;

