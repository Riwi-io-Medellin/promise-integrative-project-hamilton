/**
 * formato-payload-bot.js
 * 
 * Este script contiene la lógica solicitada para validar y construir el payload del chatbot.
 * El requerimiento es que 'candidato_id', 'telefono' y 'resultado_agenda' sean obligatorios,
 * mientras que 'evento_id' y 'nota' pueden quedar vacíos.
 */

function construirPayload(sesiones_activas, telefono, resultado) {
    // Verificar que existen los datos en sesiones_activas
    if (!sesiones_activas[telefono] || !sesiones_activas[telefono]["candidato_id"]) {
        throw new Error(`Candidato ID no encontrado para el teléfono ${telefono}`);
    }

    const candidato_id = sesiones_activas[telefono]["candidato_id"];
    const resultado_agenda = resultado.resultado_agenda;

    // Validación: estos campos NO pueden estar vacíos
    if (!candidato_id) throw new Error("El campo 'candidato_id' es obligatorio.");
    if (!telefono) throw new Error("El campo 'telefono' es obligatorio.");
    if (!resultado_agenda) throw new Error("El campo 'resultado_agenda' es obligatorio.");

    // Construcción del objeto
    // evento_id y nota se asignan tal cual, permitiendo null/undefined (o forzando null si se prefiere)
    return {
        "candidato_id": candidato_id,
        "telefono": telefono,
        "resultado_agenda": resultado_agenda,
        "evento_id": resultado.evento_id || null, // Se permite vacío (null)
        "nota": resultado.nota_para_equipo || null // Se permite vacío (null)
    };
}

module.exports = { construirPayload };

