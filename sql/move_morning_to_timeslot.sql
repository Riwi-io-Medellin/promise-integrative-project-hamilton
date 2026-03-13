-- Parámetros:
--   $1 = franja objetivo (text) -> 'manana' | 'tarde' | 'noche'
--   $2 = límite de filas (integer)

UPDATE candidatos
SET franja_actual = $1,
    intentos_franja_actual = 0,
    updated_at = now()
WHERE id IN (
  SELECT id FROM candidatos c
  WHERE c.estado_gestion_id = (
    SELECT id FROM estados_gestion WHERE codigo = 'PENDIENTE' LIMIT 1
  )
  AND c.franja_actual = 'manana'
  ORDER BY c.intentos_llamada ASC
  LIMIT $2
)
RETURNING id;
