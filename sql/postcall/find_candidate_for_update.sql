SELECT id, franja_actual, intentos_llamada
FROM candidatos
WHERE id = $1
FOR UPDATE;

