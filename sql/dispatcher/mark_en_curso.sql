UPDATE cola_llamadas
SET estado = 'EN_CURSO'
WHERE id = ANY($1::int[])
RETURNING id, candidato_id;

