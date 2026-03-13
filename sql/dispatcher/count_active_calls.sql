SELECT COUNT(*)::int AS cnt
FROM cola_llamadas
WHERE estado = 'EN_CURSO'
  AND fecha_programada = CURRENT_DATE;

