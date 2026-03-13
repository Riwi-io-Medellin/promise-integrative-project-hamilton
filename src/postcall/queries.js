const fs = require('fs');
const path = require('path');

const SQL_DIR = path.join(__dirname, '../../sql/postcall');

function loadSql(fileName) {
    const filePath = path.join(SQL_DIR, fileName);
    if (!fs.existsSync(filePath)) {
        throw new Error(`No se encontro SQL postcall: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf8');
}

module.exports = {
    FIND_CANDIDATE_FOR_UPDATE: loadSql('find_candidate_for_update.sql'),
    FIND_OPEN_QUEUE_BY_CANDIDATE: loadSql('find_open_queue_by_candidate.sql'),
    CLOSE_QUEUE_STATE: loadSql('close_queue_state.sql'),
    FIND_ESTADO_GESTION_ID: loadSql('find_estado_gestion_id.sql'),
    FIND_RESULTADO_LLAMADA_ID: loadSql('find_resultado_llamada_id.sql'),
    FIND_CALL_BY_CONVERSATION_ID: loadSql('find_call_by_conversation_id.sql'),
    RESERVE_EVENT_SLOT: loadSql('reserve_event_slot.sql'),
    UPDATE_CANDIDATE_AGENDADO: loadSql('update_candidate_agendado.sql'),
    UPDATE_CANDIDATE_ESTADO: loadSql('update_candidate_estado.sql'),
    UPDATE_CANDIDATE_RETRY: loadSql('update_candidate_retry.sql'),
    INSERT_LLAMADA: loadSql('insert_llamada.sql'),
};