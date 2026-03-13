SELECT q.id, q.candidato_id
FROM cola_llamadas q
WHERE q.estado = 'EN_CURSO'
  AND q.created_at <= NOW() - (($1::int || ' minutes')::interval)
ORDER BY q.created_at ASC
LIMIT $2
FOR UPDATE SKIP LOCKED;

