# RiwiCall Dashboard

RiwiCall Dashboard is a modular single-page application for call center operations, candidate follow-up, and event tracking.

## Stack

- Vanilla JavaScript (ES modules)
- Tailwind CSS (CDN)
- Lucide icons (CDN)
- XLSX (CDN, for Excel import)
- Netlify Edge Functions (Supabase proxy)
- Vite (local development and build)

## Project Structure

```text
src/
  css/
  js/
    components/
    loaders/
    logic/
    router/
    services/
  views/
netlify/
  edge-functions/
```

## Run Locally

```bash
npm install
npm run dev
```

Open: `http://localhost:5173`

## Build

```bash
npm run build
npm run preview
```

## Test Supabase Connection

Run a direct connectivity check against the main dashboard tables:

```bash
npm run check:supabase
```

## Netlify Environment Variables

The Edge Function uses Netlify environment variables only:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Edge function file:

- `netlify/edge-functions/supabase-proxy.js`

## Local Development Without Netlify Edge

If you are not running on Netlify, the app uses a local Vite proxy first (`/__local/supabase-proxy`) and can also connect directly to Supabase REST as fallback.

Set these Vite variables in your local `.env`:

- `VITE_SUPABASE_URL=https://<project>.supabase.co`
- `VITE_SUPABASE_ANON_KEY=<anon-key>`

Optional server-side vars for local proxy (recommended for `sb_secret_*` keys):

- `SUPABASE_URL=https://<project>.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY=<service-role-or-secret-key>`

Behavior:

- On Netlify: tries Edge Function first, then direct Supabase fallback if configured.
- On localhost: tries local Vite proxy first, then Edge Function, then direct Supabase (only for non-secret keys).
- Outside Netlify/localhost: tries direct Supabase first, then Edge Function.

## Notes

- Dashboard statistics are generated from synchronized Supabase data (`candidatos` + `llamadas`) and cached in localStorage as fallback.
- The settings page keeps only the call flow webhook configuration (`Webhook flujo llamadas`).
- Legacy hash routes remain available for backward compatibility.
