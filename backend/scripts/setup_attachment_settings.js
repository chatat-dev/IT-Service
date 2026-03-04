const pool = require('../config/db');

async function initAttachmentSettings() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS attachment_settings (
                id INT PRIMARY KEY AUTO_INCREMENT,
                max_file_size_mb INT NOT NULL DEFAULT 5,
                allowed_extensions VARCHAR(255) NOT NULL DEFAULT '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx',
                is_active BOOLEAN DEFAULT TRUE
            );
        `);

        await pool.query(`
            INSERT IGNORE INTO attachment_settings (id, max_file_size_mb, allowed_extensions) 
            VALUES (1, 5, '.jpg,.png,.pdf,.docx,.xlsx');
        `);

        console.log("attachment_settings table created/verified successfully.");
        process.exit(0);
    } catch (e) {
        console.error("Error setting up attachment_settings:", e);
        process.exit(1);
    }
}

initAttachmentSettings();
