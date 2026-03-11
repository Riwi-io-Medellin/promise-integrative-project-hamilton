# SofIA – Servicio de Llamadas Automáticas 📞

Backend en Node.js que reemplaza los flujos n8n (**Asesor Nueva BD** + **Varios**).  
Gestiona la cola de llamadas, llama a candidatos vía **ElevenLabs ConvAI** y actualiza
Supabase cuando llega el webhook con el resultado.

---

## 📋 Tabla de contenidos

1. [Requisitos previos](#-requisitos-previos)
2. [Instalación](#-instalación)
3. [Variables de entorno](#-variables-de-entorno)
4. [Comandos npm](#-comandos-npm)
5. [Flujo recomendado](#-flujo-recomendado)
6. [Endpoints HTTP](#-endpoints-http)
7. [Estructura del proyecto](#-estructura-del-proyecto)
8. [Diagnóstico de problemas](#-diagnóstico-de-problemas)

---

## 🛠 Requisitos previos

- **Node.js 18+**
- Proyecto en [Supabase](https://supabase.com) con el esquema SQL ya aplicado (`sql_sofia.txt`)
- Cuenta en [ElevenLabs](https://elevenlabs.io) con agente ConvAI y número Twilio configurados
- [ngrok](https://ngrok.com) instalado en `C:\ngrok\ngrok.exe` (solo para pruebas locales)

---

## 📦 Instalación

```powershell
# 1. Instalar dependencias
npm install

# 2. Crear archivo de configuración
copy .env.example .env

# 3. Editar .env con tus credenciales reales
notepad .env
```

---

## 🔑 Variables de entorno

Crea un archivo `.env` en la raíz del proyecto con lo siguiente:

```env
# ── Base de datos Supabase ─────────────────────────────────────────────────
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# ── ElevenLabs ConvAI ──────────────────────────────────────────────────────
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_AGENT_ID=agent_...
ELEVENLABS_PHONE_NUMBER_ID=phnum_...

# ── Modo mock: true = sin llamadas reales, false = llamadas reales ──────────
ELEVENLABS_MOCK=true

# ── Worker y concurrencia ──────────────────────────────────────────────────
MAX_CONCURRENT_CALLS=3
QUEUE_INTERVAL_MS=10000

# ── Cron jobs (hora Colombia, UTC-5) ──────────────────────────────────────
CRON_FILL_MANANA=0 7 * * *
CRON_FILL_TARDE=0 14 * * *
CRON_FILL_NOCHE=0 19 * * *

# ── Servidor HTTP ─────────────────────────────────────────────────────────
PORT=3000
```

### Variables que envía el sistema al agente de ElevenLabs

El agente necesita estas variables dinámicas en cada llamada:

| Variable | Descripción |
|---|---|
| `id` | UUID del candidato |
| `nombre` | Nombre completo (nombre + apellido) |
| `motivo` | Fase actual o motivo de la llamada |
| `ciudad` | Municipio del candidato |
| `lista_horarios` | Opciones de fecha en texto legible |
| `eventos_disponibles` | Fechas con IDs para que el agente confirme |
| `intentos` | Número de intentos previos de llamada |
| `nota_previa` | Nota del último contacto o preferencia de horario |

---

## 📜 Comandos npm

### `npm start`
Arranca el servidor en **producción**.

- Levanta el servidor HTTP en el puerto configurado (por defecto 3000)
- Registra los 3 cron jobs diarios para llenar la cola (mañana / tarde / noche)
- Inicia el worker que procesa la cola cada `QUEUE_INTERVAL_MS` milisegundos
- **Úsalo cuando todo funcione y quieras correrlo en serio**

```powershell
npm start
```

---

### `npm run dev`
Igual que `npm start` pero con **hot-reload** automático (`node --watch`).

- Si modificas cualquier archivo `.js`, Node reinicia solo
- **Úsalo mientras desarrollas o ajustas el código**

```powershell
npm run dev
```

---

### `npm run tunnel`
Abre un túnel **ngrok** apuntando al puerto 3000.

- Genera una URL pública como `https://xxxx.ngrok-free.app`
- Esa URL es la que debes configurar en ElevenLabs como webhook
- **Requiere que el servidor esté corriendo en otra terminal**

```powershell
npm run tunnel
```

> ⚠️ Cada vez que reinicias ngrok la URL cambia. Recuerda actualizarla en el dashboard de ElevenLabs.

---

### `npm run test:db`
**Prueba 1** — Verifica la conexión a Supabase y lee todas las tablas clave.

Comprueba:
- Ping a la base de datos (`SELECT 1`)
- Lectura de tablas de lookup: `estados_gestion`, `resultados_llamada`, `horarios`
- Conteos de: `candidatos`, `candidato_ideal`, `eventos`, `cola_llamadas`, `llamadas`

```powershell
npm run test:db
```

> **Cuándo usarlo:** Antes de cualquier otra cosa. Si esto falla, revisa `DATABASE_URL` en tu `.env`.

---

### `npm run test:fill`
**Prueba 2** — Llena `cola_llamadas` para la franja **mañana** y muestra el resultado.

Comprueba:
- Cálculo de prioridades usando `candidato_ideal.ci_total`
- Filtro de candidatos ya procesados hoy
- Inserción de filas en `cola_llamadas` con `estado = 'PENDIENTE'`
- Lista de candidatos encolados ordenados por prioridad

```powershell
npm run test:fill
```

> **Cuándo usarlo:** Para verificar que la lógica de llenado de cola funciona antes de hacer llamadas.

---

### `npm run test:worker`
**Prueba 3** — Ejecuta **una sola iteración** del worker en **modo mock** (sin llamadas reales).

Comprueba:
- Conteo de llamadas activas (`EN_CURSO`)
- Lectura de la cola `PENDIENTE` de hoy
- Validación de ventana horaria (06:00–22:00 hora Colombia)
- Marca la fila de cola como `ENCURSO`
- Crea un registro en `llamadas` con `resultado = EN_CURSO`
- Muestra las llamadas creadas con su `conversation_id`

```powershell
npm run test:worker
```

> 🟡 Este script fuerza `ELEVENLABS_MOCK=true` internamente, sin importar lo que diga tu `.env`.  
> **Cuándo usarlo:** Para validar el worker completo sin gastar créditos de ElevenLabs.

---

### `npm run test:webhook`
**Prueba 4** — Envía un webhook simulado (`AGENDADO`) al servidor HTTP local.

Comprueba:
- El endpoint `POST /webhook/elevenlabs-resultado` recibe el payload
- Actualiza `llamadas` (resultado, día agendado, hora agendada, evento)
- Actualiza `candidatos` (estado_gestion → AGENDADO, ultimo_contacto, evento_asignado_id)
- Actualiza `eventos` (incrementa `inscritos_actuales`)
- Actualiza `cola_llamadas` → estado `COMPLETADA`

```powershell
# Terminal 1: servidor corriendo
npm run dev

# Terminal 2: enviar el webhook simulado
npm run test:webhook
```

> ⚠️ **El servidor DEBE estar corriendo** antes de ejecutar este comando.

---

### `npm run llamada`
**Script 5** — Dispara una **llamada real** a ElevenLabs para el primer candidato `PENDIENTE`.

- No necesita que el servidor esté corriendo (es standalone)
- Conecta directamente a la API de ElevenLabs
- Muestra el `llamada_id` y `conversation_id` al terminar
- Acepta `--telefono=+57XXXXXXXXXX` para llamar a un número específico

```powershell
# Llamar al primer candidato PENDIENTE
npm run llamada

# Llamar a un teléfono específico
node scripts/5-llamada-real.js --telefono=+573001234567
```

> ⚠️ Requiere `ELEVENLABS_MOCK=false` en tu `.env`. Si está en `true`, el script aborta con error.  
> **Cuándo usarlo:** Para verificar que ElevenLabs llama realmente al teléfono y el agente habla.

---

### `npm run estado`
**Script 6** — Muestra el estado actual de todas las tablas en un solo vistazo.

Muestra:
- 📞 Llamadas de hoy (resultado, hora, `conversation_id`)
- ⏳ Cola de llamadas de hoy (estado, prioridad, franja)
- 👤 Candidatos (estado_gestion, fase, intentos, evento asignado)
- 🟢 Eventos (inscritos / capacidad, estado DISPONIBLE / COMPLETO)
- 📊 Resumen rápido con totales

```powershell
npm run estado
```

> **Cuándo usarlo:** Antes y después de cualquier prueba para ver exactamente qué cambió.

---

### `npm run limpiar`
**Script 7** — Marca **todas** las llamadas `EN_CURSO` como `NO_CONTESTA`.

Útil cuando:
- Hiciste pruebas mock y los slots quedaron bloqueados en `EN_CURSO`
- Una llamada real no recibió webhook y sigue activa
- El worker dejó de procesar porque ya se alcanzó `MAX_CONCURRENT_CALLS`

```powershell
# Limpiar solo llamadas con más de 30 minutos (por defecto)
node scripts/7-limpiar-llamadas.js

# Limpiar TODAS sin importar el tiempo
npm run limpiar
```

---

### `npm run test:all`
Ejecuta las pruebas 1, 2 y 3 en secuencia (conexión → llenar cola → worker mock).

```powershell
npm run test:all
```

---

## 🚀 Flujo recomendado

### PASO 1 — Primera configuración (solo una vez)

```
1.  npm install                ← instalar dependencias
2.  Crear y llenar .env        ← credenciales de Supabase y ElevenLabs
3.  npm run test:db            ← ¿conecta a Supabase? ¿lee todas las tablas?
```

---

### PASO 2 — Probar el llenado de cola

```
4.  npm run test:fill          ← ¿inserta candidatos en cola_llamadas?
5.  npm run estado             ← verificar que aparecen en la cola de hoy
```

---

### PASO 3 — Probar el worker en modo mock (sin llamadas reales)

```
# Asegúrate de tener ELEVENLABS_MOCK=true en .env

6.  npm run test:worker        ← ¿procesa la cola y crea registros EN_CURSO?
7.  npm run estado             ← verificar llamadas creadas
```

---

### PASO 4 — Probar el webhook completo (sin llamadas reales)

```
# Terminal 1
8.  npm run dev                ← servidor corriendo

# Terminal 2
9.  npm run test:worker        ← crear registro EN_CURSO en llamadas
10. npm run test:webhook       ← simular que ElevenLabs responde AGENDADO
11. npm run estado             ← verificar que llamadas, candidatos y eventos se actualizaron
```

---

### PASO 5 — Probar llamadas reales con ngrok

```
# 1. Cambiar en .env:
#    ELEVENLABS_MOCK=false

# Terminal 1
12. npm run dev                ← servidor HTTP corriendo

# Terminal 2
13. npm run tunnel
    → Copia la URL pública: https://xxxx.ngrok-free.app

# En ElevenLabs (dashboard del agente):
    → Webhook URL: https://xxxx.ngrok-free.app/webhook/elevenlabs-resultado

# Terminal 1 o 3 (cuando quieras hacer la llamada):
14. npm run estado             ← ver estado ANTES de la llamada
15. npm run llamada            ← el teléfono sonará en segundos
    → El agente de ElevenLabs hablará con el candidato

# Al terminar la llamada (ElevenLabs envía el webhook automáticamente):
16. npm run estado             ← verificar resultado final en todas las tablas
```

---

### PASO 6 — Producción

```
# 1. ELEVENLABS_MOCK=false en .env
# 2. Webhook configurado con URL pública permanente (Railway, Render, VPS, etc.)
# 3. npm start
#    → Servidor HTTP en el puerto configurado
#    → Cron jobs registrados: 7am, 2pm, 7pm (hora Colombia)
#    → Worker procesando cola cada QUEUE_INTERVAL_MS ms (default 10s)
```

---

## 📡 Endpoints HTTP

| Método | Ruta | Descripción |
|--------|------|-------------|
| `GET` | `/health` | Health check del servidor |
| `POST` | `/webhook/elevenlabs-resultado` | Recibe el resultado de una llamada desde ElevenLabs |

### Payload esperado por el webhook

```json
{
  "candidato_id":  "uuid-del-candidato",
  "resultado":     "AGENDADO",
  "dia":           "martes",
  "hora":          "10:00 AM",
  "evento_id":     5,
  "nota":          "El candidato confirmó asistencia sin problemas"
}
```

### Valores válidos para `resultado`

| Valor | Efecto en `candidatos.estado_gestion` | Efecto en eventos |
|-------|---------------------------------------|-------------------|
| `AGENDADO` | → AGENDADO | Incrementa `inscritos_actuales` |
| `NO_CONTESTA` | → NO_CONTESTA | Sin cambios |
| `RECHAZADO` | → DESCARTADO | Sin cambios |
| `REPROGRAMAR` | → PENDIENTE | Sin cambios |

---

## 🗂 Estructura del proyecto

```
SofIA/
├── index.js                        # Punto de entrada: servidor + crons + worker
├── .env                            # Variables de entorno (NO subir a git)
├── package.json
│
├── src/
│   ├── app.js                      # Express: rutas y middleware
│   │
│   ├── db/                         # Capa de acceso a datos (queries SQL)
│   │   ├── pool.js                 # Conexión PostgreSQL a Supabase
│   │   ├── candidatos.js           # Queries sobre la tabla candidatos
│   │   ├── cola.js                 # Queries sobre cola_llamadas
│   │   ├── eventos.js              # Queries sobre eventos
│   │   ├── llamadas.js             # Queries sobre llamadas
│   │   └── lookups.js              # IDs de estados, resultados, horarios
│   │
│   ├── routes/
│   │   ├── health.js               # GET /health
│   │   └── webhook.js              # POST /webhook/elevenlabs-resultado
│   │
│   ├── schedulers/
│   │   └── index.js                # Cron jobs × 3 diarios (mañana/tarde/noche)
│   │
│   ├── services/
│   │   ├── cola/
│   │   │   ├── fillQueue.js        # llenarColaParaFranja() → INSERT cola_llamadas
│   │   │   └── processQueue.js     # runQueueIteration() + startQueueWorker()
│   │   ├── llamadas/
│   │   │   └── callService.js      # makeOutboundCall() → API ElevenLabs
│   │   └── webhook/
│   │       └── webhookService.js   # Actualiza DB al recibir resultado
│   │
│   └── utils/
│       ├── dateHelpers.js          # Formateo de fechas legibles para el agente
│       ├── logger.js               # Logger JSON estructurado
│       └── timeValidator.js        # Valida ventana horaria Colombia (06-22h)
│
└── scripts/                        # Scripts de prueba y utilidades
    ├── 1-test-db.js                # npm run test:db
    ├── 2-test-fill-queue.js        # npm run test:fill
    ├── 3-test-worker.js            # npm run test:worker
    ├── 4-test-webhook.js           # npm run test:webhook
    ├── 5-llamada-real.js           # npm run llamada
    ├── 6-ver-estado.js             # npm run estado
    └── 7-limpiar-llamadas.js       # npm run limpiar
```

---

## 🔍 Diagnóstico de problemas

| Síntoma | Causa probable | Solución |
|---------|---------------|----------|
| `test:db` falla en todos los tests | `DATABASE_URL` incorrecta | Revisar credenciales en `.env` |
| `test:fill` inserta 0 filas | No hay candidatos `PENDIENTE` | Verificar tabla `candidatos` en Supabase |
| `test:worker` no procesa a nadie | Cola vacía o fuera del horario 06–22h | Correr `test:fill` primero; verificar hora Colombia |
| Worker siempre llama al mismo candidato | `MAX_CONCURRENT_CALLS=1` y hay candidatos bloqueados | Aumentar el valor o correr `npm run limpiar` |
| Llamada real no suena | `ELEVENLABS_MOCK=true` en `.env` | Cambiar a `ELEVENLABS_MOCK=false` |
| El agente llama pero no habla | Variables dinámicas mal configuradas en ElevenLabs | Verificar que el agente usa `{{id}}`, `{{nombre}}`, etc. |
| Tabla `llamadas` no se actualiza tras la llamada | ElevenLabs no puede alcanzar el webhook | Verificar URL de ngrok en el dashboard de ElevenLabs |
| Worker bloqueado (slots llenos) | Llamadas mock antiguas en `EN_CURSO` | `npm run limpiar` para liberar los slots |
| ngrok deja de funcionar | Límite de sesión del plan gratuito | Reiniciar ngrok y actualizar la URL en ElevenLabs |
| `conversation_id` llega null | Error silencioso en la API de ElevenLabs | Revisar logs del servidor; verificar `ELEVENLABS_API_KEY` |

---

## ♻️ Flujo interno del sistema

```
[npm start / npm run dev]
         │
         ├──► Servidor HTTP :3000
         │         └──► POST /webhook/elevenlabs-resultado
         │
         ├──► Cron 07:00 ──► llenarColaParaFranja('manana')
         ├──► Cron 14:00 ──► llenarColaParaFranja('tarde')
         ├──► Cron 19:00 ──► llenarColaParaFranja('noche')
         │         └──► INSERT INTO cola_llamadas (PENDIENTE)
         │
         └──► Worker cada 10s
                   ├──► Cuenta EN_CURSO → si ya llegó al máximo, espera
                   ├──► Lee cola PENDIENTE de hoy (ORDER BY prioridad DESC)
                   ├──► Valida ventana horaria Colombia (06:00 – 22:00)
                   ├──► Valida horario del candidato (AM / PM / AMPM)
                   ├──► POST → API ElevenLabs (llamada saliente)
                   ├──► INSERT INTO llamadas (EN_CURSO)
                   └──► UPDATE cola_llamadas → ENCURSO

[ElevenLabs termina la llamada y envía webhook]
         └──► POST /webhook/elevenlabs-resultado
                   ├──► UPDATE llamadas  (resultado, dia_agendado, hora_agendado, nota)
                   ├──► UPDATE candidatos (estado_gestion, ultimo_contacto, evento_asignado_id)
                   ├──► UPDATE eventos   (inscritos_actuales; si lleno → estado = 'COMPLETO')
                   └──► UPDATE cola_llamadas → COMPLETADA / CANCELADA
```

