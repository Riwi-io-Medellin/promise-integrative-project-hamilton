export const kpiData = [
  {
    value: "16x",
    label: "Más productividad",
    description: "Comparado con un equipo humano en contacto masivo bajo el mismo objetivo."
  },
  {
    value: "2.400",
    label: "Llamadas por jornada",
    description: "Capacidad objetivo operativa del agente de voz en escenarios de alto volumen."
  },
  {
    value: "86%",
    label: "Reducción de costos",
    description: "Frente al proceso manual equivalente en campañas repetitivas."
  }
];

export const agentData = [
  {
    id: "sofia",
    index: "01",
    theme: "voice",
    name: "SofIA",
    role: "Agente integral de voz",
    status: "En producción · RiwiCall",
    summary:
      "Primer agente operativo de Promise. Llama, escucha, comprende respuestas ambiguas y registra decisiones en tiempo real.",
    capabilities: [
      "Confirmación y reprogramación de citas sin intervención manual.",
      "Comprensión de lenguaje natural en escenarios coloquiales.",
      "Registro automático del resultado de cada conversación.",
      "Escalamiento a humano cuando el caso lo requiere."
    ],
    architecture: [
      "Call: motor de llamadas de voz",
      "Core: comprensión contextual y decisiones",
      "Orquestador central en Node.js",
      "Dashboard en tiempo real para campañas"
    ],
    channels: ["Voz saliente", "Dashboard de operación"],
    kpis: ["2.400 llamadas/jornada", "16x productividad", "86% ahorro operativo"]
  },
  {
    id: "modular",
    index: "02",
    theme: "modular",
    name: "Motor Modular",
    role: "Arquitectura de orquestación",
    status: "En migración · roadmap Promise",
    summary:
      "Evolución arquitectónica propia de Promise para unificar potencia de voz y eficiencia operativa en un solo núcleo escalable.",
    capabilities: [
      "Priorización inteligente de colas por historial de intentos.",
      "Programación de reintentos en franjas horarias óptimas.",
      "Escalado independiente por microservicio.",
      "Configuración por cliente sin tocar lógica base."
    ],
    architecture: [
      "Orquestador propio Node.js (sin dependencia N8N en estado final)",
      "Microservicios desacoplados: Call, Chat, Core, Dashboard",
      "Comunicación interna consistente entre eventos",
      "Preparado para consolidar voz + texto"
    ],
    channels: ["API interna", "Operación multi-cliente"],
    kpis: ["Menor latencia entre servicios", "Mayor control de cola", "Base para unificación total"]
  },
  {
    id: "texto",
    index: "03",
    theme: "text",
    name: "Agente de Texto",
    role: "Conversación multicanal",
    status: "Canal activo vía API Promise",
    summary:
      "Misma inteligencia conversacional de Promise para WhatsApp, Telegram y web. Diseñado para atención masiva con contexto.",
    capabilities: [
      "Respuestas coherentes por canal con base de conocimiento unificada.",
      "Mantenimiento de contexto durante toda la sesión.",
      "Escalamiento a humano en consultas de mayor sensibilidad.",
      "Registro de historial por usuario y flujo."
    ],
    architecture: [
      "Conexión por API Promise",
      "Reutiliza lógica del Core conversacional",
      "Eventos sincronizados con orquestador",
      "Diseño listo para widget web propio"
    ],
    channels: ["WhatsApp", "Telegram", "Widget Web Promise"],
    kpis: ["<3s objetivo de respuesta", "Coherencia cross-channel", "Integración rápida en sitios web"]
  }
];

export const useCases = [
  {
    industry: "Admisiones educativas",
    how: "Filtra, contacta y confirma aspirantes con reintentos inteligentes para reducir embudos manuales.",
    impact: "Más cobertura en menos tiempo y mejor foco del equipo humano en entrevistas clave."
  },
  {
    industry: "Clínicas y salud",
    how: "Confirma citas, recupera inasistencias y reprograma agenda automáticamente por voz o chat.",
    impact: "Menor tasa de no-show y mejor utilización de agendas médicas."
  },
  {
    industry: "Banca y cartera",
    how: "Ejecuta seguimientos de pago con reglas por segmento y prioridad según comportamiento histórico.",
    impact: "Mayor recuperación sin saturar equipos de cobranza."
  },
  {
    industry: "Onboarding comercial",
    how: "Automatiza bienvenida, verificación de datos y activación de clientes por canal preferido.",
    impact: "Arranque más rápido de cuentas y menor fricción operativa."
  },
  {
    industry: "Eventos y asistencia",
    how: "Confirma asistencia, envía recordatorios y captura cambios de último minuto en tiempo real.",
    impact: "Mejor previsión logística y menor desperdicio de cupos."
  },
  {
    industry: "Operaciones internas",
    how: "Automatiza flujos repetitivos conectados a base de datos, con trazabilidad y control por campaña.",
    impact: "Menos tareas mecánicas, más tiempo para decisiones de valor."
  }
];

export const implementationSteps = [
  {
    title: "Diagnóstico del flujo",
    description:
      "Mapeamos el proceso real del cliente, datos históricos, reglas de negocio y puntos de fricción."
  },
  {
    title: "Diseño conversacional",
    description:
      "Definimos escenarios, excepciones y tono de interacción para que el agente actúe con precisión."
  },
  {
    title: "Integración técnica",
    description:
      "Conectamos canales y datos al stack Promise, con operación visible desde dashboard y métricas."
  },
  {
    title: "Despliegue y mejora",
    description:
      "Lanzamos por fases, medimos en producción y optimizamos el agente con feedback del negocio."
  }
];

export const integrations = [
  {
    name: "WhatsApp",
    description: "Atención y seguimiento conversacional con contexto."
  },
  {
    name: "Telegram",
    description: "Canal alterno para procesos de respuesta rápida."
  },
  {
    name: "Web API Promise",
    description: "Integración directa en portales y formularios."
  },
  {
    name: "Dashboard Campaigns",
    description: "Monitoreo en tiempo real de estado y resultados."
  }
];

export const roadmap = [
  {
    title: "Hoy: SofIA + RiwiCall",
    description:
      "Operación validada con datos reales en contacto masivo y reducción significativa de costo.",
    status: "Producción"
  },
  {
    title: "Ahora: migración modular",
    description:
      "Unificación progresiva de capacidades de voz hacia el motor modular propio de Promise.",
    status: "En curso"
  },
  {
    title: "Siguiente: unificación completa",
    description:
      "Voz + texto sobre una arquitectura única, más flexible para múltiples clientes e industrias.",
    status: "Próximo"
  }
];

export const faqData = [
  {
    question: "¿Promise reemplaza al equipo humano?",
    answer:
      "No. Promise automatiza el volumen repetitivo para que el equipo humano se concentre en casos estratégicos, empatía y decisiones complejas."
  },
  {
    question: "¿Cuánto tarda una implementación?",
    answer:
      "Depende del flujo y del canal, pero normalmente iniciamos con una fase corta de diagnóstico y un despliegue incremental para validar rápido."
  },
  {
    question: "¿Puedo empezar solo con texto y luego pasar a voz?",
    answer:
      "Sí. La arquitectura está pensada para crecer por etapas y mantener coherencia conversacional entre canales."
  },
  {
    question: "¿Se puede adaptar a mi CRM o base de datos?",
    answer:
      "Sí, siempre que exista una fuente de datos estructurada. El diseño de integración se define en diagnóstico técnico."
  }
];

export const pricingTiers = [
  {
    name: "Starter",
    range: "USD 1.500 - 3.000 / mes",
    target: "Equipos con un único flujo repetitivo de volumen medio.",
    features: [
      "1 canal principal (voz o texto)",
      "Configuración inicial de campaña",
      "Dashboard operativo base",
      "Soporte de optimización mensual"
    ],
    highlighted: false
  },
  {
    name: "Growth",
    range: "USD 3.200 - 6.500 / mes",
    target: "Operaciones multi-campaña con necesidad de reglas y segmentación.",
    features: [
      "Hasta 2 canales activos",
      "Priorización inteligente de intentos",
      "Automatizaciones por segmento",
      "Acompañamiento quincenal de performance"
    ],
    highlighted: true
  },
  {
    name: "Scale",
    range: "Desde USD 7.000 / mes",
    target: "Empresas con alto volumen y requerimientos de arquitectura dedicada.",
    features: [
      "Canales y flujos personalizados",
      "Arquitectura modular extendida",
      "SLA y soporte prioritario",
      "Roadmap técnico conjunto"
    ],
    highlighted: false
  }
];

export const pricingMatrix = {
  columns: ["Capacidad", "Starter", "Growth", "Scale"],
  rows: [
    ["Canales de atención", "1", "Hasta 2", "Personalizado"],
    ["Dashboard en tiempo real", "Incluido", "Incluido", "Incluido + extendido"],
    ["Reintentos inteligentes", "Parcial", "Completo", "Completo + avanzado"],
    ["Escalamiento a humano", "Incluido", "Incluido", "Incluido"],
    ["Onboarding técnico", "Base", "Guiado", "Dedicado"],
    ["Revisión de performance", "Mensual", "Quincenal", "Semanal"]
  ]
};

export const aboutValues = [
  {
    title: "Precisión antes que plantilla",
    description:
      "No entregamos herramientas genéricas. Diseñamos agentes para el flujo real de cada cliente."
  },
  {
    title: "IA con personas",
    description:
      "Nuestro enfoque es arquitectura híbrida: automatizar desgaste para potenciar criterio humano."
  },
  {
    title: "Evidencia operativa",
    description:
      "Construimos con validación en producción, trazabilidad técnica y mejora continua."
  }
];

export const aboutEvidence = [
  {
    title: "Caso de referencia: RiwiCall",
    description:
      "Primer producto validado con SofIA en un escenario real de admisiones de alto volumen."
  },
  {
    title: "Método de ingeniería",
    description:
      "Requisitos levantados desde operación, priorización iterativa y decisiones técnicas documentadas."
  },
  {
    title: "Arquitectura escalable",
    description:
      "Microservicios desacoplados para evolucionar cada canal sin bloquear al resto del sistema."
  },
  {
    title: "Roadmap claro",
    description:
      "Migración de capacidades de voz al motor modular para consolidar potencia y eficiencia."
  }
];

export const processFlow = [
  {
    title: "1. Entender el cuello de botella",
    description: "Evaluamos la carga actual, la tasa de respuesta y los puntos donde se pierde tiempo."
  },
  {
    title: "2. Diseñar decisiones del agente",
    description:
      "Definimos reglas, variantes del lenguaje y criterios para escalar a humano sin perder contexto."
  },
  {
    title: "3. Conectar datos y canales",
    description:
      "Unimos base de datos, orquestación y canal operativo para ejecutar campañas consistentes."
  },
  {
    title: "4. Lanzar en producción",
    description:
      "Desplegamos por fases para validar resultados, estabilidad y experiencia de usuario final."
  },
  {
    title: "5. Optimizar con métricas",
    description:
      "Medimos desempeño real y afinamos el agente para mantener eficiencia y calidad conversacional."
  }
];

export const architectureBlocks = [
  {
    title: "Orquestador central",
    description:
      "Coordina eventos, prioridades y estado global de campañas para evitar pérdida o duplicidad de tareas."
  },
  {
    title: "Call / Voz",
    description:
      "Ejecuta llamadas automatizadas y aplica decisiones conversacionales en tiempo real."
  },
  {
    title: "Chat / Texto",
    description:
      "Gestiona conversaciones en WhatsApp, Telegram y web con coherencia en lógica de negocio."
  },
  {
    title: "Core IA",
    description:
      "Interpreta lenguaje natural, contexto y ambigüedad para accionar respuestas útiles."
  }
];

export const qualityPillars = [
  {
    title: "Rendimiento",
    description: "Objetivo de operación en alto volumen con degradación controlada."
  },
  {
    title: "Disponibilidad",
    description: "Tolerancia a fallos por microservicio sin colapsar la operación completa."
  },
  {
    title: "Mantenibilidad",
    description: "Módulos desacoplados y trazabilidad para mejorar sin rehacer todo."
  },
  {
    title: "Escalabilidad",
    description: "Capacidad de crecer por cliente, canal y campaña de forma progresiva."
  }
];
