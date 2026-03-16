# Módulo Chatbot SofIA

Este módulo implementa la "Regla de las 9 llamadas" para despertar al Chatbot.

## Regla de Negocio

> "Despertar a SofIA cada 9 llamadas no contestadas (3 mañana, 3 tarde, 3 noche)."

Cuando un candidato acumula **9 llamadas fallidas en el día de hoy**, el sistema:
1.  Recopila sus datos y eventos compatibles (según su fase).
2.  Envía un POST a un webhook externo (ngrok).
3.  Espera un webhook de vuelta para actualizar la base de datos.

## Estructura

*   `chatbot.service.js`: Lógica de negocio (conteo, envío, actualización).
*   `chatbot.routes.js`: Router Express para recibir respuestas del bot.

## Instalación

1.  Asegúrate de tener la URL del bot configurada en `.env`:
    ```env
    CHATBOT_WEBHOOK_URL=https://tu-url-ngrok.com/api/start-chat
    ```

2.  En tu archivo principal (`app.js` o `index.js`), monta las rutas:
    ```javascript
    const chatbotRoutes = require('./chatbot/chatbot.routes');
    app.use('/api/chatbot', chatbotRoutes);
    ```

3.  En el servicio de llamadas (`webhookService.js`), invoca el trigger cuando una llamada falle:
    ```javascript
    const { processCandidateCallFail } = require('../../chatbot/chatbot.service');
    
    // Al detectar NO_CONTESTA:
    await processCandidateCallFail(candidatoId);
    ```

## API Webhook (Callback)

El Chatbot debe responder a `POST /api/chatbot/webhook` con:

```json
{
  "candidato_id": "uuid...",
  "estado_gestion": "CONTACTADO", 
  "nota": "Texto de resumen",
  "extra_candidato_fields": {
     "telefono": "3001234567"
  }
}
```

