// Opcional: pega aquí tu URL de proyecto Supabase para dejarla fija en despliegue.
const SUPABASE_URL = '';
// Opcional: pega aquí tu anon key si tu tabla requiere autenticación.
const SUPABASE_ANON_KEY = '';

const json = (payload, status = 200) => new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
});

const ALLOWED_TABLES = new Set([
    'candidato_ideal',
    'candidatos',
    'cola_llamadas',
    'conocimientos_programacion',
    'departamentos',
    'estados_gestion',
    'estratos',
    'eventos',
    'generos',
    'historial_fases',
    'horarios',
    'llamadas',
    'medios_comunicacion',
    'motivos_llamada',
    'municipios',
    'niveles_educativos',
    'ocupaciones',
    'resultados_llamada',
    'sedes',
    'tipos_convenio',
    'tipos_documento'
]);

const isValidSupabaseUrl = (value) => {
    try {
        const parsed = new URL(value);
        return parsed.protocol === 'https:' && parsed.hostname.endsWith('.supabase.co');
    } catch (error) {
        return false;
    }
};

export default async (request) => {
    const requestUrl = new URL(request.url);
    const table = requestUrl.searchParams.get('table') || 'candidatos';
    const supabaseUrl = requestUrl.searchParams.get('supabaseUrl') || SUPABASE_URL;

    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(table)) {
        return json({ error: 'Nombre de tabla inválido.' }, 400);
    }
    if (!ALLOWED_TABLES.has(table)) {
        return json({ error: 'La tabla solicitada no está permitida.' }, 403);
    }

    if (!supabaseUrl) {
        return json({
            error: 'Falta la URL de Supabase. Pégala en Configuración o en netlify/edge-functions/supabase-proxy.js'
        }, 400);
    }
    if (!isValidSupabaseUrl(supabaseUrl)) {
        return json({
            error: 'La URL de Supabase no es válida. Debe ser https://*.supabase.co'
        }, 400);
    }

    const baseUrl = supabaseUrl.endsWith('/') ? supabaseUrl.slice(0, -1) : supabaseUrl;
    const supabaseEndpoint = `${baseUrl}/rest/v1/${table}?select=*`;
    const headers = { 'Content-Type': 'application/json' };

    if (SUPABASE_ANON_KEY) {
        headers.apikey = SUPABASE_ANON_KEY;
        headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
    }

    try {
        const response = await fetch(supabaseEndpoint, { headers });
        const data = await response.json();

        if (!response.ok) {
            return json({
                error: 'Supabase devolvió un error.',
                detail: data
            }, response.status);
        }

        return json(data);
    } catch (error) {
        return json({
            error: 'No fue posible conectar con Supabase desde Netlify Edge Function.',
            detail: String(error?.message || error)
        }, 502);
    }
};
