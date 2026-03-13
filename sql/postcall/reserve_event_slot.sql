UPDATE eventos
SET
  inscritos_actuales = inscritos_actuales + 1,
  estado = CASE
    WHEN inscritos_actuales + 1 >= capacidad_total THEN 'COMPLETO'
    ELSE estado
  END,
  updated_at = now()
WHERE id = $1
  AND estado = 'DISPONIBLE'
  AND inscritos_actuales < capacidad_total
RETURNING id, inscritos_actuales, capacidad_total, estado;

