const pool = require('./config/db');

async function checkAdmin() {
    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', ['admin']);
        console.log('Admin user found:', rows);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err);
        process.exit(1);
    }
}

checkAdmin();
