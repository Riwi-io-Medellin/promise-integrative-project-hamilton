import { defineConfig, loadEnv } from 'vite';

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
    } catch {
        return false;
    }
};

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const supabaseUrl = (env.SUPABASE_URL || env.VITE_SUPABASE_URL || '').replace(/\/+$/, '');
    const serviceOrKey = (env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY || '').trim();

    return {
        server: {
            port: 5173
        },
        plugins: [
            {
                name: 'local-supabase-proxy',
                configureServer(server) {
                    server.middlewares.use('/__local/supabase-proxy', async (req, res) => {
                        const requestUrl = new URL(req.url || '', 'http://localhost');
                        const table = requestUrl.searchParams.get('table') || 'candidatos';

                        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(table)) {
                            res.statusCode = 400;
                            res.setHeader('content-type', 'application/json; charset=utf-8');
                            res.end(JSON.stringify({ error: 'Nombre de tabla inválido.' }));
                            return;
                        }
                        if (!ALLOWED_TABLES.has(table)) {
                            res.statusCode = 403;
                            res.setHeader('content-type', 'application/json; charset=utf-8');
                            res.end(JSON.stringify({ error: 'La tabla solicitada no está permitida.' }));
                            return;
                        }

                        if (!supabaseUrl || !serviceOrKey || !isValidSupabaseUrl(supabaseUrl)) {
                            res.statusCode = 500;
                            res.setHeader('content-type', 'application/json; charset=utf-8');
                            res.end(JSON.stringify({
                                error: 'Falta SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY (o VITE_*) para proxy local.'
                            }));
                            return;
                        }

                        try {
                            const endpoint = `${supabaseUrl}/rest/v1/${table}?select=*`;
                            const upstream = await fetch(endpoint, {
                                headers: {
                                    apikey: serviceOrKey,
                                    Authorization: `Bearer ${serviceOrKey}`
                                }
                            });

                            const text = await upstream.text();
                            res.statusCode = upstream.status;
                            res.setHeader('content-type', 'application/json; charset=utf-8');
                            res.end(text);
                        } catch (error) {
                            res.statusCode = 502;
                            res.setHeader('content-type', 'application/json; charset=utf-8');
                            res.end(JSON.stringify({
                                error: 'No fue posible conectar con Supabase desde el proxy local de Vite.',
                                detail: String(error?.message || error)
                            }));
                        }
                    });
                }
            }
        ]
    };
});
