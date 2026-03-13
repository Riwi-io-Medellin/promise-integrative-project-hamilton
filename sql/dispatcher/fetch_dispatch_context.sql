SELECT
    q.id AS cola_id,
    c.id::text AS candidato_id,
    c.telefono,
    c.nombre,
    c.apellido,
    COALESCE(ml.descripcion, c.fase_actual) AS motivo,
    s.nombre AS ciudad,
    c.intentos_llamada AS intentos,
    c.nota_horario,
    h.descripcion AS horario_descripcion,
    c.hora_preferida_llamada,
    last_call.resumen AS nota_previa,
    COALESCE(events.eventos_disponibles, '[]'::json) AS eventos_disponibles
FROM cola_llamadas q
JOIN candidatos c ON c.id = q.candidato_id
LEFT JOIN motivos_llamada ml ON ml.id = c.motivo_llamada_id
LEFT JOIN sedes s ON s.id = c.sede_interes_id
LEFT JOIN horarios h ON h.id = c.horario_id
LEFT JOIN LATERAL (
    SELECT l.resumen
    FROM llamadas l
    WHERE l.candidato_id = c.id
      AND l.resumen IS NOT NULL
      AND BTRIM(l.resumen) <> ''
    ORDER BY l.created_at DESC
    LIMIT 1
) AS last_call ON TRUE
LEFT JOIN LATERAL (
    SELECT json_agg(
        json_build_object(
            'evento_id', ev.id::text,
            'fecha_hora', ev.fecha_hora
        )
        ORDER BY ev.fecha_hora ASC
    ) AS eventos_disponibles
    FROM (
        SELECT e.id, e.fecha_hora
        FROM eventos e
        WHERE e.estado = 'DISPONIBLE'
          AND e.fecha_hora >= NOW()
          AND e.tipo_reunion = c.fase_actual
          AND (e.sede_id IS NULL OR e.sede_id = c.sede_interes_id)
        ORDER BY e.fecha_hora ASC
        LIMIT 5
    ) ev
) AS events ON TRUE
WHERE q.id = ANY($1::int[]);
