UPDATE candidatos
SET intentos_llamada = COALESCE(intentos_llamada, 0) + 1,
    updated_at = NOW()
WHERE id = ANY($1::uuid[])
RETURNING id, intentos_llamada;

