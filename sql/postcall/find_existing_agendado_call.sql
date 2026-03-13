SELECT l.id
FROM llamadas l
JOIN resultados_llamada rl ON rl.id = l.resultado_id
WHERE l.candidato_id = $1
  AND l.evento_asignado_id = $2
  AND rl.codigo = 'AGENDADO'
LIMIT 1;

