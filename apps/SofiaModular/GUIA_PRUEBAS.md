# 🧪 Guía de Pruebas y Ejecución - SofIA Chatbot

Esta guía detalla cómo ejecutar los procesos y pruebas disponibles actualmente para el proyecto SofIA, con foco especial en la integración del **Chatbot de WhatsApp**.

---

## 🚀 1. Iniciar el Servidor (Requisito Principal)

Para que cualquier prueba funcione, el servidor debe estar corriendo.

```powershell
npm run dev
```

*   Esto inicia el servidor en el puerto 3000 (o el definido en tu `.env`).
*   Verás logs indicando que el servidor está listo.

---

## 🤖 2. Pruebas del Chatbot

### A. Prueba de Integración Directa (Lo que pidió tu compañera)
Esta prueba envía un JSON de ejemplo ("Andrea") a tu servidor local, el cual lo reenvía automáticamente al webhook de tu compañera en ngrok.

**Objetivo:** Verificar que a ella le llegue la solicitud y se dispare el mensaje de WhatsApp.

**Comando:**
```powershell
npm run test:wa
```

**Flujo:**
1.  El script envía datos a `http://localhost:3000/solicitar-chat`.
2.  Tu servidor recibe, procesa y reenvía a `CHATBOT_WEBHOOK_URL` (definido en `.env`).
3.  Tu compañera recibe la petición y su bot inicia el chat.

### B. Prueba de Lógica con Datos Reales (Base de Datos)
Simula el escenario donde un candidato real ha fallado 9 llamadas. Extrae sus datos reales de la BD y los envía al chatbot.

**Objetivo:** Verificar que la extracción de datos de la BD y el formateo de horarios funcionen bien con un candidato real.

**Comando:**
```powershell
# Reemplaza el UUID por uno real de tu tabla 'candidatos'
npm run test:chatbot -- 0dd9d7da-525f-44ad-997a-8e52103b765b
```

---

## ⚙️ 3. Configuración Actual (.env)

Asegúrate de que tu archivo `.env` tenga estas variables correctas para que las pruebas funcionen:

```ini
# URL de ngrok de tu compañera (donde ella recibe las solicitudes)
CHATBOT_WEBHOOK_URL=https://rae-compensable-unmunificently.ngrok-free.dev/solicitar-chat

# Puerto del servidor local
PORT=3000
```

---

## 🛠️ 4. Otros Scripts Útiles

| Comando | Descripción |
| :--- | :--- |
| `node scripts/llenar-cola.js` | Llena la cola de llamadas simulando los horarios (mañana/tarde/noche). Útil para probar volumen. |
| `node scripts/resetear-bd.js` | **¡Cuidado!** Borra y reinicia la base de datos. Útil para empezar pruebas desde cero. |
| `node scripts/debug-chatbot.js` | Script de diagnóstico para verificar conexión básica del chatbot. |

---

## 🔄 5. Flujo Automático (Regla de Negocio)

El sistema está programado para disparar el chatbot automáticamente si:
1.  Un candidato recibe una llamada con resultado `NO_CONTESTA`.
2.  El sistema cuenta que ya lleva **9 intentos fallidos** hoy.
3.  Automáticamente "despierta" al módulo chatbot y envía los datos.

*Este proceso es automático y no requiere intervención manual, pero puedes simularlo con los scripts de prueba arriba.*

