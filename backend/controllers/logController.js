const pool = require('../config/db');

const logAction = async (user_id, action, details, ip_address = null) => {
    try {
        await pool.query(
            'INSERT INTO system_logs (user_id, action, details, ip_address) VALUES (?, ?, ?, ?)',
            [user_id || null, action, details || null, ip_address]
        );
    } catch (err) {
        console.error('Failed to log action:', err);
    }
};

const getLogs = async (req, res) => {
    try {
        const { startDate, endDate, search } = req.query;
        let query = `
            SELECT l.*, u.name as user_name 
            FROM system_logs l 
            LEFT JOIN users u ON l.user_id = u.id 
            WHERE 1=1
        `;
        const params = [];

        if (startDate) {
            query += ` AND DATE(l.created_at) >= ?`;
            params.push(startDate);
        }
        if (endDate) {
            query += ` AND DATE(l.created_at) <= ?`;
            params.push(endDate);
        }
        if (search) {
            query += ` AND (l.action LIKE ? OR l.details LIKE ? OR u.name LIKE ?)`;
            const searchPattern = `%${search}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        query += ` ORDER BY l.created_at DESC LIMIT 500`; // Limit to prevent huge loads

        const [logs] = await pool.query(query, params);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching logs', error: error.message });
    }
};

module.exports = { logAction, getLogs };
