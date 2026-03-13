UPDATE candidatos
SET
  estado_gestion_id = $2,
  franja_actual = $3,
  intentos_llamada = COALESCE(intentos_llamada, 0) + 1,
  intentos_franja_actual = 0,
  ultimo_contacto = now(),
  nota_horario = COALESCE($4, nota_horario),
  updated_at = now()
WHERE id = $1;

