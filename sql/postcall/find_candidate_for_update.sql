SELECT id, franja_actual, intentos_llamada, evento_asignado_id
FROM candidatos
WHERE id = $1
FOR UPDATE;
