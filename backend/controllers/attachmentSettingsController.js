const pool = require('../config/db');

const getSettings = async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM attachment_settings LIMIT 1');
        if (rows.length === 0) {
            return res.json({ id: 1, max_file_size_mb: 5, allowed_extensions: '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx', is_active: 1 });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching attachment settings:', error);
        res.status(500).json({ message: 'Error fetching settings' });
    }
};

const updateSettings = async (req, res) => {
    const { max_file_size_mb, allowed_extensions, is_active } = req.body;
    try {
        await pool.query(
            `UPDATE attachment_settings 
             SET max_file_size_mb = ?, allowed_extensions = ?, is_active = ? 
             WHERE id = 1`,
            [max_file_size_mb || 5, allowed_extensions || '', is_active === undefined ? 1 : is_active]
        );
        res.json({ message: 'Settings updated successfully' });
    } catch (error) {
        console.error('Error updating attachment settings:', error);
        res.status(500).json({ message: 'Error updating settings' });
    }
};

module.exports = {
    getSettings,
    updateSettings
};
