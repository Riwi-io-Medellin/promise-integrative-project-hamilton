# SofIA-Integral

Backend Node.js para automatizar llamadas salientes con ElevenLabs + Twilio, con cola en Postgres, concurrencia controlada, y cierre post-llamada via webhook.

Este README documenta **que hace hoy el proyecto**, **como lo hace internamente**, y **como operarlo** para que otra sesion/agente pueda continuar sin perder contexto.

## 1) Objetivo funcional

El sistema ejecuta este ciclo:

1. Detecta franja horaria (manana, tarde, noche) o la fuerza por configuracion.
2. Llena `cola_llamadas` con candidatos `PENDIENTE` priorizados.
3. Un dispatcher toma llamadas pendientes y dispara hasta 4 llamadas concurrentes a ElevenLabs.
4. Marca cada item de cola como `EN_CURSO` antes del envio.
5. Cuando llega resultado final por webhook, aplica reglas de negocio:
    - actualiza candidato,
    - reserva cupo de evento si aplica,
    - registra fila en `llamadas`,
    - cierra la cola (`COMPLETADA` o `CANCELADA` segun caso).

## 2) Arquitectura general

### Entrada principal

- `src/index.js`
    - Levanta Express.
    - Expone webhook `POST /webhooks/eleven/finalize`.
    - Inicia scheduler de llenado de cola.
    - Inicia call dispatcher continuo.

### Configuracion

- `src/config/env.js`
    - Valida variables requeridas:
        - `DATABASE_URL`
        - `ELEVENLABS_API_KEY`
        - `ELEVENLABS_AGENT_ID`
        - `ELEVENLABS_PHONE_NUMBER_ID`
    - Define defaults:
        - `DISPATCH_MAX_CONCURRENT=4`
        - `DISPATCH_INTERVAL_MS=5000`
        - crons de manana/tarde/noche

- `src/config/postgres.js`
    - Pool pg unico para toda la app.
    - helpers `query`, `getClient`, `closePool`.

### Scheduler y cola

- `src/schedulers/index.js`
    - Decide franja por hora Colombia (`America/Bogota`).
    - Programa 3 cron jobs (manana/tarde/noche).
    - En startup ejecuta `runNowIfInTimeslot`.
    - Si esta fuera de horario y `STARTUP_FORCE_MOVE=true`, puede forzar franja.

- `src/schedulers/fillQueueRunner.js`
    - Carga SQL desde `sql/fill_queue.sql`.
    - Usa advisory lock (`QUEUE_LOCK_KEY`) para evitar ejecuciones simultaneas.
    - Inserta candidatos en `cola_llamadas` y retorna ids.

- `sql/fill_queue.sql`
    - Inserta para fecha actual y franja objetivo.
    - Orden por prioridad (`ci_total DESC`) y menos intentos (`intentos_llamada ASC`).
    - Evita duplicados por candidato/dia/franja (`ON CONFLICT DO NOTHING`).

- `sql/move_morning_to_timeslot.sql`
    - Util cuando se fuerza startup fuera de horario normal.
    - Mueve candidatos de `manana` a la franja objetivo.

### Dispatcher de llamadas

- `src/schedulers/callDispatcher.js`
    - Loop cada `DISPATCH_INTERVAL_MS`.
    - Recupera `EN_CURSO` atascadas por timeout (sin webhook) aplicando cierre automatico como `BUZON_VOZ`.
    - Calcula cupos libres: `maxConcurrent - activas`.
    - Toma pendientes con lock transaccional.
    - Cambia estado a `EN_CURSO`.
    - Construye payload y llama ElevenLabs.

- `src/schedulers/dispatcher/repository.js`
    - Orquesta queries SQL del dispatcher.

- `sql/dispatcher/*.sql`
    - `count_active_calls.sql`: cuenta `EN_CURSO` de hoy.
    - `select_pending_for_lock.sql`: selecciona pendientes por prioridad con `FOR UPDATE SKIP LOCKED`.
    - `mark_en_curso.sql`: marca lote como `EN_CURSO`.
    - `fetch_dispatch_context.sql`: arma contexto completo para payload (candidato, ciudad, motivo, eventos disponibles, etc).
    - `update_call_state.sql`: actualiza estado final de cola por id.

- `src/schedulers/dispatcher/payloadBuilder.js`
    - Normaliza variables dinamicas para el agente.
    - Campos que envia:
        - `id`
        - `nombre`
        - `motivo`
        - `ciudad`
        - `lista_horarios` (texto natural)
        - `eventos_disponibles` (JSON serializado en string)
        - `intentos`
        - `nota_previa`

- `src/schedulers/dispatcher/elevenLabsClient.js`
    - `POST` a `ELEVENLABS_API_URL`.
    - Header usado: solo `xi-api-key` + `Content-Type`.

### Cierre post-llamada (webhook)

- `src/postcall/router.js`
    - Endpoint: `POST /webhooks/eleven/finalize`

- `src/postcall/normalizer.js`
    - Valida y normaliza payload entrante.
    - Resultados soportados:
        - `AGENDADO`
        - `PENDIENTE`
        - `NO_INTERESADO`
        - `NUMERO_INCORRECTO`
        - `BUZON_VOZ`

- `src/postcall/rules.js`
    - Define reglas por resultado:
        - estado gestion destino
        - resultado llamada destino
        - estado final de cola
        - modo de actualizacion candidato
        - si requiere evento

- `src/postcall/service.js`
    - Transaccional (`BEGIN/COMMIT/ROLLBACK`).
    - Flujo:
        1. Bloquea candidato (`FOR UPDATE`).
        2. Resuelve ids de catalogos (`estados_gestion`, `resultados_llamada`).
        3. Si `AGENDADO`, reserva cupo en `eventos`.
        4. Actualiza candidato segun regla.
        5. Cierra item de cola en `EN_CURSO` -> estado final.
        6. Inserta registro en `llamadas`.

- `sql/postcall/*.sql`
    - Consultas separadas y modularizadas para cada paso.

## 3) Flujo end-to-end (operacion)

1. **Scheduler** corre por cron o startup.
2. `fillCallQueue` inserta filas `PENDIENTE` en `cola_llamadas`.
3. **Dispatcher** toma hasta N cupos libres (max 4 por defecto).
4. Bloquea pendientes y los cambia a `EN_CURSO`.
5. Para cada fila:
    - construye request con datos del candidato,
    - invoca ElevenLabs outbound call.
6. Si falla creacion de llamada:
    - error 4xx -> `CANCELADA`
    - otros errores -> vuelve a `PENDIENTE`.
7. Si una llamada queda en `EN_CURSO` sin webhook final por timeout:
    - watchdog la auto-cierra como `BUZON_VOZ`,
    - rota franja al siguiente turno e incrementa intentos,
    - libera el cupo en cola para que no se estanque el dispatcher.
8. Cuando entra webhook final:
    - aplica regla segun resultado,
    - nunca deja la llamada en `EN_CURSO`, la cierra,
    - persiste trazabilidad en `llamadas`.

## 4) Estructura de carpetas

```text
sql/
  fill_queue.sql
  move_morning_to_timeslot.sql
  dispatcher/
    count_active_calls.sql
    fetch_dispatch_context.sql
    mark_en_curso.sql
    select_pending_for_lock.sql
    update_call_state.sql
  postcall/
    close_queue_state.sql
    find_candidate_for_update.sql
    find_estado_gestion_id.sql
    find_open_queue_by_candidate.sql
    find_resultado_llamada_id.sql
    insert_llamada.sql
    reserve_event_slot.sql
    update_candidate_agendado.sql
    update_candidate_estado.sql
    update_candidate_retry.sql
src/
  index.js
  config/
  schedulers/
  postcall/
  utils/
```

## 5) Contratos de integracion

### 5.1 Request a ElevenLabs (saliente)

Metodo:
- `POST https://api.elevenlabs.io/v1/convai/twilio/outbound-call`

Body que usa el sistema:

```json
{
  "agent_id": "...",
  "agent_phone_number_id": "...",
  "to_number": "+57...",
  "conversation_initiation_client_data": {
    "dynamic_variables": {
      "id": "uuid",
      "nombre": "Nombre Apellido",
      "motivo": "Examen tecnico",
      "ciudad": "Medellin",
      "lista_horarios": "texto natural",
      "eventos_disponibles": "[{\"fecha_legible\":\"...\",\"evento_id\":\"...\"}]",
      "intentos": 2,
      "nota_previa": "texto o vacio"
    }
  }
}
```

Notas clave:
- `ciudad` corresponde a la **sede de interes** del candidato (ej. Medellin/Barranquilla).
- `eventos_disponibles` viaja como **string JSON** (no array directo).
- Header de auth: usar **solo** `xi-api-key`.

### 5.2 Webhook de cierre (entrante)

Endpoint local:
- `POST /webhooks/eleven/finalize`

Ejemplo:

```json
{
  "resultado": "AGENDADO",
  "dia": "Miercoles",
  "hora": "7:28 AM",
  "nota": "Confirmo asistencia",
  "fecha_seleccionada_legible": "viernes 13 de marzo a las 7:28 a. m.",
  "candidato_id": "22222222-2222-2222-2222-222222222222",
  "evento_id": "1",
  "conversation_id": "optional"
}
```

### 5.3 Llamada directa (sin cola)

Endpoint local:
- `POST /calls/candidate`

Body:

```json
{
  "candidato_id": "22222222-2222-2222-2222-222222222222",
  "force": false
}
```

Notas:
- No inserta fila en `cola_llamadas`.
- Reutiliza el mismo armado de payload del dispatcher y el mismo cliente ElevenLabs.
- Si `force=false`, respeta cupos de concurrencia global (`DISPATCH_MAX_CONCURRENT`) segun llamadas de cola en `EN_CURSO`.
- El cierre sigue llegando por `POST /webhooks/eleven/finalize` y aplica las mismas reglas post-llamada.

## 6) Reglas de negocio post-llamada

- `AGENDADO`
    - Reserva cupo de `eventos`.
    - Si se llena capacidad, evento pasa a `COMPLETO`.
    - Candidato a estado gestion `AGENDADO`.
    - Cola `COMPLETADA`.

- `PENDIENTE`
    - Candidato sigue `PENDIENTE`.
    - Cambia `franja_actual` al siguiente turno para reintento.
    - Incrementa `intentos_llamada`.
    - Cola `COMPLETADA`.

- `NO_INTERESADO`
    - Candidato a `DESCARTADO`.
    - Cola `COMPLETADA`.

- `NUMERO_INCORRECTO`
    - Resultado llamada `NUM_INVALIDO`.
    - Candidato a `DESCARTADO`.
    - Cola `COMPLETADA`.

- `BUZON_VOZ`
    - Resultado llamada `NO_CONTESTA`.
    - Candidato a `NO_CONTESTA`.
    - Cambia `franja_actual` al siguiente turno para reintento.
    - Incrementa `intentos_llamada`.
    - Cola `COMPLETADA`.

## 7) Variables de entorno

Definir en `.env`:

- Base de datos:
    - `DATABASE_URL`

- ElevenLabs:
    - `ELEVENLABS_API_KEY`
    - `ELEVENLABS_AGENT_ID`
    - `ELEVENLABS_PHONE_NUMBER_ID`
    - `ELEVENLABS_API_URL` (opcional)

- Servidor:
    - `PORT` (default 3000)

- Scheduler:
    - `SCHED_CRON_MANANA`
    - `SCHED_CRON_TARDE`
    - `SCHED_CRON_NOCHE`
    - aliases compatibles: `SCHED_CRON_MORNING`, `SCHED_CRON_AFTERNOON`, `SCHED_CRON_NIGHT`

- Operacion startup:
    - `STARTUP_FORCE_MOVE` (`true|false`)
    - `STARTUP_FORCE_MOVE_LIMIT`
    - `STARTUP_FORCE_FRANJA`

- Cola/disparador:
    - `QUEUE_LOCK_KEY`
    - `DISPATCH_MAX_CONCURRENT` (default 4)
    - `DISPATCH_INTERVAL_MS` (default 5000)
    - `DISPATCH_STALE_RECOVERY_ENABLED` (default `true`, usar `false` para desactivar watchdog)
    - `DISPATCH_STALE_TIMEOUT_MINUTES` (default 20)
    - `DISPATCH_STALE_BATCH_SIZE` (default 20)

## 8) Ejecucion local

Instalacion:

```bash
npm install
```

Desarrollo:

```bash
npm run dev
```

Produccion local:

```bash
npm start
```

## 9) Logs esperados

Arranque normal:
- `Scheduler iniciado...`
- `Call dispatcher iniciado (interval 5000ms, max concurrent 4)`
- `App started on port 3000`

Llenado:
- `fillCallQueue: insertados X candidatos para franja='...'`

Errores de dispatch:
- `Dispatcher: cola <id> fallo al crear llamada (...) ...`

## 10) Troubleshooting rapido

### 401 en ElevenLabs

Sintoma:
- `Only one of xi-api-key and authorization headers must be provided`

Causa:
- Se estan enviando ambos headers.

Accion:
- Dejar solo `xi-api-key`.

### 422 missing fields `agent_phone_number_id` / `to_number`

Causa:
- Body con nombres antiguos (`phone_number_id`, `to`).

Accion:
- Usar nombres correctos actuales:
    - `agent_phone_number_id`
    - `to_number`

### 422 en `eventos_disponibles`

Causa:
- Se envio array/objeto en lugar de string en dynamic variables.

Accion:
- Enviar `JSON.stringify(eventos)`.

### `duplicate key value violates unique constraint unica_llamada_dia_franja`

Causa:
- Se intento insertar candidato ya agendado en cola para mismo dia/franja.

Accion:
- Mantener `ON CONFLICT DO NOTHING` y revisar filtros de seleccion.

### Se queda en "Fuera de horarios objetivo..."

Causa:
- Hora actual fuera de ventana 07:00-21:00 Colombia.

Accion:
- Esperar cron o activar `STARTUP_FORCE_MOVE=true` + `STARTUP_FORCE_FRANJA`.

## 11) Estado actual del proyecto (snapshot funcional)

- Scheduler por franjas: activo.
- Llenado de cola con lock: activo.
- Dispatcher concurrente (max 4): activo.
- Integracion outbound ElevenLabs: activa con payload normalizado.
- Webhook post-llamada: activo.
- Reglas de cierre y persistencia en BD: activas.
- SQL modularizado en `sql/dispatcher` y `sql/postcall`: activo.

## 12) Siguientes mejoras recomendadas

1. Agregar pruebas automaticas (unitarias + integracion SQL).
2. Firmar/verificar webhook entrante para seguridad.
3. Agregar idempotencia en webhook (`conversation_id` unico) para evitar doble cierre.
4. Agregar metricas (intentos, tasas de conversion, no contesta por franja).
5. Agregar endpoint de salud y observabilidad (health/readiness).