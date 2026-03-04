const pool = require('./config/db');

async function check() {
    try {
        const [rows] = await pool.query(`
            SELECT k.TABLE_NAME, k.COLUMN_NAME, k.CONSTRAINT_NAME, r.DELETE_RULE 
            FROM information_schema.KEY_COLUMN_USAGE k
            JOIN information_schema.REFERENTIAL_CONSTRAINTS r USING (CONSTRAINT_NAME) 
            WHERE k.REFERENCED_TABLE_NAME = 'users'
        `);
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        process.exit();
    }
}
check();
