const pool = require('../config/db');

const getPublicData = async (req, res) => {
    try {
        const [locations] = await pool.query('SELECT id, name FROM locations WHERE status = 1');
        const [companies] = await pool.query('SELECT id, location_id, name FROM companies WHERE status = 1');
        const [sites] = await pool.query('SELECT id, company_id, name FROM sites WHERE status = 1');
        const [departments] = await pool.query('SELECT id, site_id, name FROM departments WHERE status = 1');
        const [categories] = await pool.query('SELECT id, name FROM categories WHERE status = 1');
        const [deviceTypes] = await pool.query('SELECT id, name FROM device_types WHERE status = 1');
        const [operatingSystems] = await pool.query('SELECT id, name FROM operating_systems WHERE status = 1');
        const [msOffices] = await pool.query('SELECT id, name FROM ms_offices WHERE status = 1');
        const [scriptInstallStatuses] = await pool.query('SELECT id, name FROM script_install_statuses WHERE status = 1');
        const [attachmentSettings] = await pool.query('SELECT * FROM attachment_settings LIMIT 1');

        res.json({
            locations, companies, sites, departments, categories,
            deviceTypes, operatingSystems, msOffices, scriptInstallStatuses,
            attachmentSettings: attachmentSettings[0] || { max_file_size_mb: 5, allowed_extensions: '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx', is_active: 1 }
        });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching public data', error: err.message });
    }
};

module.exports = { getPublicData };
