const pool = require('../config/db');

async function migrate() {
    console.log('Starting computer table updates for 30 fields...');
    try {
        // 1. Find and drop foreign key for service_life_group_id if it exists
        const [fkRows] = await pool.query(`
            SELECT CONSTRAINT_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_NAME = 'computers' 
              AND COLUMN_NAME = 'service_life_group_id' 
              AND TABLE_SCHEMA = DATABASE()
        `);

        if (fkRows.length > 0) {
            const fkName = fkRows[0].CONSTRAINT_NAME;
            await pool.query(`ALTER TABLE \`computers\` DROP FOREIGN KEY \`${fkName}\``);
            console.log(`Dropped foreign key ${fkName}`);
        }

        // 2. Drop service_life_group_id column if it exists
        try {
            await pool.query(`ALTER TABLE \`computers\` DROP COLUMN \`service_life_group_id\``);
            console.log('Dropped service_life_group_id column');
        } catch (e) {
            if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                console.log('Column service_life_group_id does not exist, skipping drop.');
            } else {
                throw e;
            }
        }

        // 3. Add building_name if missing
        try {
            await pool.query(`ALTER TABLE \`computers\` ADD COLUMN \`building_name\` varchar(255) DEFAULT NULL AFTER \`company_id\``);
            console.log('Added building_name column');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('Column building_name already exists, skipping.');
            } else {
                throw e;
            }
        }

        // 4. Add emp_name if missing
        try {
            await pool.query(`ALTER TABLE \`computers\` ADD COLUMN \`emp_name\` varchar(255) DEFAULT NULL AFTER \`emp_id\``);
            console.log('Added emp_name column');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') {
                console.log('Column emp_name already exists, skipping.');
            } else {
                throw e;
            }
        }

        // 5. Drop service_life_groups table
        await pool.query(`DROP TABLE IF EXISTS \`service_life_groups\``);
        console.log('Dropped service_life_groups table');

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        process.exit();
    }
}

migrate();
