SELECT id
FROM cola_llamadas
WHERE candidato_id = $1
  AND estado = 'EN_CURSO'
ORDER BY created_at DESC
LIMIT 1
FOR UPDATE;

