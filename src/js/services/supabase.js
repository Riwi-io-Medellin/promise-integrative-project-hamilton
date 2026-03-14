const EDGE_PROXY_URL = '/.netlify/edge-functions/supabase-proxy';
const LOCAL_DEV_PROXY_URL = '/__local/supabase-proxy';
const SUPABASE_URL_STORAGE_KEY = 'supabase_direct_url';
const LEGACY_SUPABASE_ANON_KEY_STORAGE_KEY = 'supabase_direct_anon_key';
const SUPABASE_URL_ENV = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY_ENV = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const isRunningOnNetlify = () => window.location.hostname.endsWith('.netlify.app');
const isLocalDevHost = () => ['localhost', '127.0.0.1'].includes(window.location.hostname);
const isSecretKey = (value) => String(value || '').trim().startsWith('sb_secret_');

const normalizeSupabaseUrl = (value) => {
    if (!value) return '';

    try {
        const parsed = new URL(value);
        if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.supabase.co')) {
            return '';
        }
        return parsed.toString().replace(/\/+$/, '');
    } catch (error) {
        return '';
    }
};

const getStoredConnection = () => ({
    supabaseUrl: normalizeSupabaseUrl(localStorage.getItem(SUPABASE_URL_STORAGE_KEY) || '')
});

export function configureSupabaseConnection({ supabaseUrl = '', supabaseAnonKey = '' } = {}) {
    const normalizedUrl = normalizeSupabaseUrl(supabaseUrl);

    if (normalizedUrl) {
        localStorage.setItem(SUPABASE_URL_STORAGE_KEY, normalizedUrl);
    }

    // Never persist keys client-side; keep them in .env or pass only at runtime.
    localStorage.removeItem(LEGACY_SUPABASE_ANON_KEY_STORAGE_KEY);
    void supabaseAnonKey;
}

export function getSupabaseConnectionConfig() {
    localStorage.removeItem(LEGACY_SUPABASE_ANON_KEY_STORAGE_KEY);

    const stored = getStoredConnection();
    const envUrl = normalizeSupabaseUrl(SUPABASE_URL_ENV);
    const envKey = SUPABASE_ANON_KEY_ENV.trim();
    return {
        // Prefer env over localStorage so local setup is reproducible and avoids stale browser data.
        supabaseUrl: envUrl || stored.supabaseUrl,
        supabaseAnonKey: envKey
    };
}

export async function syncCandidatosFromSupabase(options = {}) {
    const [
        candidatos,
        generos,
        municipios,
        nivelesEducativos,
        conocimientosProgramacion,
        horarios,
        estadosGestion
    ] = await Promise.all([
        fetchSupabaseTable('candidatos', options),
        fetchSupabaseTable('generos', options),
        fetchSupabaseTable('municipios', options),
        fetchSupabaseTable('niveles_educativos', options),
        fetchSupabaseTable('conocimientos_programacion', options),
        fetchSupabaseTable('horarios', options),
        fetchSupabaseTable('estados_gestion', options)
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

export async function syncLlamadasFromSupabase(options = {}) {
    const [llamadas, candidatos, resultados, motivos] = await Promise.all([
        fetchSupabaseTable('llamadas', options),
        fetchSupabaseTable('candidatos', options),
        fetchSupabaseTable('resultados_llamada', options),
        fetchSupabaseTable('motivos_llamada', options)
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

export async function syncEventosFromSupabase(options = {}) {
    const [eventos, horarios, candidatos] = await Promise.all([
        fetchSupabaseTable('eventos', options),
        fetchSupabaseTable('horarios', options),
        fetchSupabaseTable('candidatos', options)
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

const readFromEdgeProxy = async (table) => {
    const endpoint = new URL(EDGE_PROXY_URL, window.location.origin);
    endpoint.searchParams.set('table', table);

    const response = await fetch(endpoint.toString());
    if (!response.ok) {
        throw new Error(`Edge Function devolvió ${response.status}`);
    }

    const data = await response.json().catch(() => {
        throw new Error('Edge devolvió contenido no JSON.');
    });
    return Array.isArray(data) ? data : [];
};

const readFromLocalDevProxy = async (table) => {
    const endpoint = new URL(LOCAL_DEV_PROXY_URL, window.location.origin);
    endpoint.searchParams.set('table', table);

    const response = await fetch(endpoint.toString());
    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const detail = typeof data === 'object' && data !== null
            ? (data.error || data.message || JSON.stringify(data))
            : String(data || '');
        throw new Error(`Proxy local devolvió ${response.status}${detail ? `: ${detail}` : ''}`);
    }

    return Array.isArray(data) ? data : [];
};

const readDirectFromSupabase = async (table, supabaseUrl, supabaseAnonKey) => {
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Faltan SUPABASE_URL o SUPABASE_ANON_KEY para conexión directa.');
    }
    if (isSecretKey(supabaseAnonKey)) {
        throw new Error('La secret key no se puede usar directo en navegador. Usa proxy local o Edge Function.');
    }

    const endpoint = `${supabaseUrl}/rest/v1/${table}?select=*`;
    const response = await fetch(endpoint, {
        headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${supabaseAnonKey}`
        }
    });

    const data = await response.json().catch(() => null);
    if (!response.ok) {
        const detail = typeof data === 'object' && data !== null
            ? (data.message || data.error || data.hint || JSON.stringify(data))
            : String(data || '');
        throw new Error(`Supabase REST devolvió ${response.status}${detail ? `: ${detail}` : ''}`);
    }

    return Array.isArray(data) ? data : [];
};

export async function fetchSupabaseTable(table, options = {}) {
    const config = getSupabaseConnectionConfig();
    const overrideUrl = normalizeSupabaseUrl(options.supabaseUrl || '');
    const overrideKey = String(options.supabaseAnonKey || '').trim();
    const supabaseUrl = overrideUrl || config.supabaseUrl;
    const supabaseAnonKey = overrideKey || config.supabaseAnonKey;
    const preferDirect = typeof options.preferDirect === 'boolean'
        ? options.preferDirect
        : !isRunningOnNetlify();

    const strategies = [];
    if (isLocalDevHost()) {
        strategies.push(() => readFromLocalDevProxy(table));
        strategies.push(() => readFromEdgeProxy(table));
        if (!isSecretKey(supabaseAnonKey)) {
            strategies.push(() => readDirectFromSupabase(table, supabaseUrl, supabaseAnonKey));
        }
    } else if (preferDirect) {
        strategies.push(() => readDirectFromSupabase(table, supabaseUrl, supabaseAnonKey));
        strategies.push(() => readFromEdgeProxy(table));
    } else {
        strategies.push(() => readFromEdgeProxy(table));
        strategies.push(() => readDirectFromSupabase(table, supabaseUrl, supabaseAnonKey));
    }

    const errors = [];
    for (const strategy of strategies) {
        try {
            return await strategy();
        } catch (error) {
            errors.push(error?.message || String(error));
        }
    }

    throw new Error(`No fue posible sincronizar ${table}. ${errors.join(' | ')}`);
}
