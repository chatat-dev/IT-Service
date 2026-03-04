const pool = require('../config/db');

async function migrate() {
    console.log('Starting PC Inventory Migration...');
    try {
        // Master Data Tables
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`device_types\` (
              \`id\` int(11) NOT NULL AUTO_INCREMENT,
              \`name\` varchar(255) NOT NULL,
              \`description\` text DEFAULT NULL,
              \`status\` tinyint(1) NOT NULL DEFAULT 1,
              \`created_at\` timestamp NULL DEFAULT current_timestamp(),
              \`updated_at\` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
              PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`operating_systems\` (
              \`id\` int(11) NOT NULL AUTO_INCREMENT,
              \`name\` varchar(255) NOT NULL,
              \`description\` text DEFAULT NULL,
              \`status\` tinyint(1) NOT NULL DEFAULT 1,
              \`created_at\` timestamp NULL DEFAULT current_timestamp(),
              \`updated_at\` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
              PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`ms_offices\` (
              \`id\` int(11) NOT NULL AUTO_INCREMENT,
              \`name\` varchar(255) NOT NULL,
              \`description\` text DEFAULT NULL,
              \`status\` tinyint(1) NOT NULL DEFAULT 1,
              \`created_at\` timestamp NULL DEFAULT current_timestamp(),
              \`updated_at\` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
              PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`service_life_groups\` (
              \`id\` int(11) NOT NULL AUTO_INCREMENT,
              \`name\` varchar(255) NOT NULL,
              \`description\` text DEFAULT NULL,
              \`status\` tinyint(1) NOT NULL DEFAULT 1,
              \`created_at\` timestamp NULL DEFAULT current_timestamp(),
              \`updated_at\` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
              PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`script_install_statuses\` (
              \`id\` int(11) NOT NULL AUTO_INCREMENT,
              \`name\` varchar(255) NOT NULL,
              \`description\` text DEFAULT NULL,
              \`status\` tinyint(1) NOT NULL DEFAULT 1,
              \`created_at\` timestamp NULL DEFAULT current_timestamp(),
              \`updated_at\` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
              PRIMARY KEY (\`id\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Computers Table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`computers\` (
              \`id\` int(11) NOT NULL AUTO_INCREMENT,
              \`location_id\` int(11) DEFAULT NULL,
              \`company_id\` int(11) DEFAULT NULL,
              \`site_id\` int(11) DEFAULT NULL,
              \`department_id\` int(11) DEFAULT NULL,
              \`device_type_id\` int(11) DEFAULT NULL,
              \`status_pc\` enum('Y', 'N') NOT NULL DEFAULT 'Y',
              \`emp_id\` varchar(100) DEFAULT NULL,
              \`user_id\` int(11) DEFAULT NULL,
              \`pc_asset_no\` varchar(255) DEFAULT NULL,
              \`device_name\` varchar(255) DEFAULT NULL,
              \`notebook_brand_model\` varchar(255) DEFAULT NULL,
              \`serial_number\` varchar(255) DEFAULT NULL,
              \`os_id\` int(11) DEFAULT NULL,
              \`ms_office_id\` int(11) DEFAULT NULL,
              \`purchase_date\` date DEFAULT NULL,
              \`issue_date\` date DEFAULT NULL,
              \`service_life_group_id\` int(11) DEFAULT NULL,
              \`cpu_core\` varchar(100) DEFAULT NULL,
              \`ram_gb\` varchar(50) DEFAULT NULL,
              \`script_install_status_id\` int(11) DEFAULT NULL,
              \`vpn_status\` enum('Y', 'N') NOT NULL DEFAULT 'N',
              \`windows_product_key\` varchar(255) DEFAULT NULL,
              \`backup_status\` enum('Y', 'N') NOT NULL DEFAULT 'N',
              \`ups_asset_no\` varchar(255) DEFAULT NULL,
              \`accessories\` text DEFAULT NULL,
              \`extension_no\` varchar(100) DEFAULT NULL,
              \`created_at\` timestamp NULL DEFAULT current_timestamp(),
              \`updated_at\` timestamp NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
              PRIMARY KEY (\`id\`),
              FOREIGN KEY (\`location_id\`) REFERENCES \`locations\`(\`id\`) ON DELETE SET NULL,
              FOREIGN KEY (\`company_id\`) REFERENCES \`companies\`(\`id\`) ON DELETE SET NULL,
              FOREIGN KEY (\`site_id\`) REFERENCES \`sites\`(\`id\`) ON DELETE SET NULL,
              FOREIGN KEY (\`department_id\`) REFERENCES \`departments\`(\`id\`) ON DELETE SET NULL,
              FOREIGN KEY (\`device_type_id\`) REFERENCES \`device_types\`(\`id\`) ON DELETE SET NULL,
              FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL,
              FOREIGN KEY (\`os_id\`) REFERENCES \`operating_systems\`(\`id\`) ON DELETE SET NULL,
              FOREIGN KEY (\`ms_office_id\`) REFERENCES \`ms_offices\`(\`id\`) ON DELETE SET NULL,
              FOREIGN KEY (\`service_life_group_id\`) REFERENCES \`service_life_groups\`(\`id\`) ON DELETE SET NULL,
              FOREIGN KEY (\`script_install_status_id\`) REFERENCES \`script_install_statuses\`(\`id\`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Computer Notes
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`computer_notes\` (
              \`id\` int(11) NOT NULL AUTO_INCREMENT,
              \`computer_id\` int(11) NOT NULL,
              \`user_id\` int(11) DEFAULT NULL,
              \`note_text\` text NOT NULL,
              \`created_at\` timestamp NULL DEFAULT current_timestamp(),
              PRIMARY KEY (\`id\`),
              FOREIGN KEY (\`computer_id\`) REFERENCES \`computers\`(\`id\`) ON DELETE CASCADE,
              FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // System Logs
        await pool.query(`
            CREATE TABLE IF NOT EXISTS \`system_logs\` (
              \`id\` int(11) NOT NULL AUTO_INCREMENT,
              \`user_id\` int(11) DEFAULT NULL,
              \`action\` varchar(255) NOT NULL,
              \`details\` text DEFAULT NULL,
              \`ip_address\` varchar(50) DEFAULT NULL,
              \`created_at\` timestamp NULL DEFAULT current_timestamp(),
              PRIMARY KEY (\`id\`),
              FOREIGN KEY (\`user_id\`) REFERENCES \`users\`(\`id\`) ON DELETE SET NULL
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `);

        // Alter Tickets explicitly suppressing errors if column exists
        try {
            await pool.query(`
                ALTER TABLE \`tickets\` ADD COLUMN \`computer_id\` int(11) DEFAULT NULL AFTER \`user_id\`;
            `);
            await pool.query(`
                ALTER TABLE \`tickets\` ADD FOREIGN KEY (\`computer_id\`) REFERENCES \`computers\`(\`id\`) ON DELETE SET NULL;
            `);
            console.log('Added computer_id to tickets table.');
        } catch (alterErr) {
            if (alterErr.code === 'ER_DUP_FIELDNAME') {
                console.log('computer_id already exists in tickets table. Skipping alter.');
            } else {
                console.error('Error altering tickets table:', alterErr);
            }
        }

        console.log('PC Inventory Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
