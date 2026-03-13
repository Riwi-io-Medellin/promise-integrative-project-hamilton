const fs = require('fs');
const path = require('path');

const SQL_DIR = path.join(__dirname, '../../../sql/dispatcher');

function loadSql(fileName) {
    const filePath = path.join(SQL_DIR, fileName);
    if (!fs.existsSync(filePath)) {
        throw new Error(`No se encontro SQL del dispatcher: ${filePath}`);
    }
    return fs.readFileSync(filePath, 'utf8');
}

const COUNT_ACTIVE_CALLS = loadSql('count_active_calls.sql');
const SELECT_PENDING_FOR_LOCK = loadSql('select_pending_for_lock.sql');
const MARK_EN_CURSO = loadSql('mark_en_curso.sql');
const FETCH_DISPATCH_CONTEXT = loadSql('fetch_dispatch_context.sql');
const UPDATE_CALL_STATE = loadSql('update_call_state.sql');

module.exports = {
    COUNT_ACTIVE_CALLS,
    SELECT_PENDING_FOR_LOCK,
    MARK_EN_CURSO,
    FETCH_DISPATCH_CONTEXT,
    UPDATE_CALL_STATE,
};

