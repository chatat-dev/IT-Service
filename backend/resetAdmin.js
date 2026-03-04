/**
 * Reset admin password script.
 * Run with: node resetAdmin.js
 */
const bcrypt = require('bcryptjs');
const pool = require('./config/db');

async function resetAdmin() {
    try {
        const plainPassword = '123456';
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        console.log('Generated hash:', hashedPassword);

        // Check if admin exists
        const [rows] = await pool.query("SELECT id, username, role FROM users WHERE username = 'admin'");
        console.log('Admin user found:', rows);

        if (rows.length === 0) {
            // Admin doesn't exist, create it
            await pool.query(
                "INSERT INTO users (name, username, password, role, status) VALUES ('Administrator', 'admin', ?, 'admin', 1)",
                [hashedPassword]
            );
            console.log('✅ Admin user created successfully!');
        } else {
            // Update the existing admin password
            await pool.query(
                "UPDATE users SET password = ?, status = 1, role = 'admin' WHERE username = 'admin'",
                [hashedPassword]
            );
            console.log('✅ Admin password reset successfully!');
        }

        console.log('👤 Username: admin');
        console.log('🔑 Password: 123456');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

resetAdmin();
