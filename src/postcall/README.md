# Post-llamada

Webhook local: `POST /webhooks/eleven/finalize`

Payload esperado:

```json
{
  "resultado": "AGENDADO",
  "dia": "Miercoles",
  "hora": "7:28 AM",
  "nota": "Confirmo asistencia",
  "fecha_seleccionada_legible": "viernes 13 de marzo a las 7:28 a. m.",
  "candidato_id": "22222222-2222-2222-2222-222222222222",
  "evento_id": "1"
}
```

## Reglas de negocio

- `AGENDADO`:
  - Reserva cupo en `eventos`.
  - Si se llena, marca evento `COMPLETO`.
  - Actualiza candidato a estado de gestion `AGENDADO`.
  - Cierra cola en `COMPLETADA`.
- `NO_INTERESADO` y `NUMERO_INCORRECTO`:
  - Candidato pasa a `DESCARTADO`.
  - Cierra cola en `COMPLETADA`.
- `BUZON_VOZ`:
  - Candidato pasa a `NO_CONTESTA`.
  - Cambia `franja_actual` al siguiente turno para reintento.
  - Cierra cola en `COMPLETADA`.
- `PENDIENTE`:
  - Mantiene candidato en estado `PENDIENTE`.
  - Cierra cola en `COMPLETADA`.

Siempre inserta registro en `llamadas` y ninguna llamada queda en `EN_CURSO` cuando entra el cierre.

