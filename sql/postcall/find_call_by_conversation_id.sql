SELECT id, candidato_id, evento_asignado_id
FROM llamadas
WHERE conversation_id = $1
LIMIT 1;

