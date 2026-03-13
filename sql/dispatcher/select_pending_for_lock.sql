SELECT q.id, q.candidato_id
FROM cola_llamadas q
WHERE q.estado = 'PENDIENTE'
  AND q.fecha_programada = CURRENT_DATE
ORDER BY q.prioridad DESC, q.created_at ASC
LIMIT $1
FOR UPDATE SKIP LOCKED;

