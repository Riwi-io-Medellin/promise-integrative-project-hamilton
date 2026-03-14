const STORAGE_KEYS = {
    supabaseUrl: 'supabase_url',
    netlifyEdgeUrl: 'netlify_edge_supabase_url'
};

const DEFAULT_EDGE_URL = '/.netlify/edge-functions/supabase-proxy';

export function getSupabaseUrl() {
    return localStorage.getItem(STORAGE_KEYS.supabaseUrl) || '';
}

export function saveSupabaseUrl(url) {
    localStorage.setItem(STORAGE_KEYS.supabaseUrl, url.trim());
}

export function getNetlifyEdgeUrl() {
    return localStorage.getItem(STORAGE_KEYS.netlifyEdgeUrl) || DEFAULT_EDGE_URL;
}

export function saveNetlifyEdgeUrl(url) {
    const finalUrl = url.trim() || DEFAULT_EDGE_URL;
    localStorage.setItem(STORAGE_KEYS.netlifyEdgeUrl, finalUrl);
}

export function isSupabaseProjectUrl(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
    } catch (error) {
        return false;
    }
}

export async function syncCandidatosFromSupabase() {
    const [
        candidatos,
        generos,
        municipios,
        nivelesEducativos,
        conocimientosProgramacion,
        horarios,
        estadosGestion
    ] = await Promise.all([
        fetchSupabaseTable('candidatos'),
        fetchSupabaseTable('generos'),
        fetchSupabaseTable('municipios'),
        fetchSupabaseTable('niveles_educativos'),
        fetchSupabaseTable('conocimientos_programacion'),
        fetchSupabaseTable('horarios'),
        fetchSupabaseTable('estados_gestion')
    ]);

    const porId = (list) => new Map((list || []).map(item => [String(item.id), item]));
    const generosMap = porId(generos);
    const municipiosMap = porId(municipios);
    const nivelesMap = porId(nivelesEducativos);
    const conocimientosMap = porId(conocimientosProgramacion);
    const horariosMap = porId(horarios);
    const estadosMap = porId(estadosGestion);

    return (candidatos || []).map((candidato) => {
        const genero = generosMap.get(String(candidato.genero_id));
        const municipio = municipiosMap.get(String(candidato.municipio_id));
        const nivelEducativo = nivelesMap.get(String(candidato.nivel_educativo_id));
        const nivelProg = conocimientosMap.get(String(candidato.conocimiento_programacion_id));
        const horario = horariosMap.get(String(candidato.horario_id));
        const estadoGestion = estadosMap.get(String(candidato.estado_gestion_id));
        const fechaNacimiento = candidato.fecha_nacimiento ? new Date(candidato.fecha_nacimiento) : null;
        const edad = fechaNacimiento && !Number.isNaN(fechaNacimiento.getTime())
            ? Math.max(0, Math.floor((Date.now() - fechaNacimiento.getTime()) / (1000 * 60 * 60 * 24 * 365.25)))
            : '';

        return {
            id: candidato.id,
            nombre: [candidato.nombre, candidato.apellido].filter(Boolean).join(' ').trim() || 'Sin nombre',
            cedula: candidato.numero_documento ? String(candidato.numero_documento) : '',
            edad,
            genero: genero?.descripcion || 'Otro',
            tel: candidato.telefono || '',
            municipio: municipio?.nombre || '',
            educacion: nivelEducativo?.descripcion || '',
            programacion: nivelProg?.descripcion || '',
            jornada: horario?.descripcion || '',
            estado: estadoGestion?.descripcion || candidato.fase_actual || 'Inscrito',
            fase_actual: candidato.fase_actual || '',
            intentos_llamada: candidato.intentos_llamada || 0
        };
    });
}

export async function syncLlamadasFromSupabase() {
    const [llamadas, candidatos, resultados, motivos] = await Promise.all([
        fetchSupabaseTable('llamadas'),
        fetchSupabaseTable('candidatos'),
        fetchSupabaseTable('resultados_llamada'),
        fetchSupabaseTable('motivos_llamada')
    ]);

    const candidatosMap = new Map((candidatos || []).map(c => [String(c.id), c]));
    const resultadosMap = new Map((resultados || []).map(r => [String(r.id), r]));
    const motivosMap = new Map((motivos || []).map(m => [String(m.id), m]));

    return (llamadas || []).map((llamada) => {
        const candidato = candidatosMap.get(String(llamada.candidato_id));
        const resultado = resultadosMap.get(String(llamada.resultado_id));
        const motivo = motivosMap.get(String(candidato?.motivo_llamada_id));
        const nombre = [candidato?.nombre, candidato?.apellido].filter(Boolean).join(' ').trim() || 'Sin nombre';
        return {
            id: llamada.id,
            nombre,
            tel: candidato?.telefono || '',
            estado: resultado?.descripcion || 'Pendiente',
            fechaLlamada: llamada.fecha_hora_llamada || llamada.created_at || '',
            motivo: llamada.resumen || motivo?.descripcion || ''
        };
    });
}

export async function syncEventosFromSupabase() {
    const [eventos, horarios, candidatos] = await Promise.all([
        fetchSupabaseTable('eventos'),
        fetchSupabaseTable('horarios'),
        fetchSupabaseTable('candidatos')
    ]);

    const horariosMap = new Map((horarios || []).map(h => [String(h.id), h]));
    const candidatosPorEvento = new Map();

    (candidatos || []).forEach((candidato) => {
        if (candidato.evento_asignado_id) {
            const eventoId = String(candidato.evento_asignado_id);
            const nombre = [candidato.nombre, candidato.apellido].filter(Boolean).join(' ').trim();
            const actuales = candidatosPorEvento.get(eventoId) || [];
            candidatosPorEvento.set(eventoId, [...actuales, nombre].filter(Boolean));
        }
    });

    return (eventos || []).map((evento) => {
        const horario = horariosMap.get(String(evento.horario_id));
        return {
            id: evento.id,
            titulo: evento.tipo_reunion || 'Evento',
            tipo: horario?.descripcion || 'Programación',
            estado: evento.estado || 'Programado',
            fecha: evento.fecha_hora || '',
            candidato: (candidatosPorEvento.get(String(evento.id)) || []).join(', ') || 'Ninguno',
            descripcion: evento.descripcion || ''
        };
    });
}

export async function fetchSupabaseTable(table) {
    const edgeUrl = getNetlifyEdgeUrl();
    const supabaseUrl = getSupabaseUrl();
    const endpoint = new URL(edgeUrl, window.location.origin);

    if (supabaseUrl) endpoint.searchParams.set('supabaseUrl', supabaseUrl);
    endpoint.searchParams.set('table', table);

    try {
        const response = await fetch(endpoint.toString());
        if (!response.ok) {
            throw new Error(`No fue posible sincronizar la tabla ${table} (${response.status})`);
        }

        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch (error) {
        throw new Error(error?.message || String(error));
    }
}
