SELECT id
FROM resultados_llamada
WHERE codigo = $1
LIMIT 1;

