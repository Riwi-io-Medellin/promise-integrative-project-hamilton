-- Parámetros:
--   $1 = franja objetivo ('manana' | 'tarde' | 'noche')
--   $2 = limit (integer, opcional)

WITH estado_pendiente AS (
    SELECT id FROM estados_gestion WHERE codigo = 'PENDIENTE' LIMIT 1
    ),
    params AS (
SELECT $1::text AS target
    ),
    prev_f AS (
SELECT
    target,
    CASE
    WHEN target = 'manana' THEN 'noche'
    WHEN target = 'tarde'  THEN 'manana'
    WHEN target = 'noche'  THEN 'tarde'
    ELSE target
    END AS prev
FROM params
    ),
    candidates AS (
SELECT c.id, COALESCE(ci.ci_total, 0) AS ci_total, c.intentos_llamada
FROM candidatos c
    LEFT JOIN candidato_ideal ci ON ci.candidato_id = c.id
WHERE c.estado_gestion_id = (SELECT id FROM estado_pendiente)
  AND (
    c.franja_actual = (SELECT target FROM prev_f)
    OR (
      (SELECT prev FROM prev_f) <> 'manana'
      AND c.franja_actual = (SELECT prev FROM prev_f)
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM cola_llamadas q
    WHERE q.candidato_id = c.id
  AND q.fecha_programada = CURRENT_DATE
  AND q.franja_programada = (SELECT target FROM params)
    )
ORDER BY ci_total DESC, c.intentos_llamada ASC
    LIMIT COALESCE($2, 1000)
    ),
    ins AS (
INSERT INTO cola_llamadas (candidato_id, prioridad, franja_programada, fecha_programada)
SELECT id, ci_total, (SELECT target FROM params), CURRENT_DATE
FROM candidates
ON CONFLICT ON CONSTRAINT unica_llamada_dia_franja DO NOTHING
    RETURNING candidato_id
    )
SELECT candidato_id FROM ins;
