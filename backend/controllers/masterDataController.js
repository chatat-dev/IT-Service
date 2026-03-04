const pool = require('../config/db');

// Generic helper to create CRUD functions for standard lookup tables
const createMasterDataController = (tableName) => {
    return {
        getAll: async (req, res) => {
            try {
                const [rows] = await pool.query(`SELECT * FROM ${tableName} ORDER BY created_at DESC`);
                res.json(rows);
            } catch (error) {
                res.status(500).json({ message: 'Server Error' });
            }
        },
        create: async (req, res) => {
            const { name, description } = req.body;
            try {
                const [result] = await pool.query(
                    `INSERT INTO ${tableName} (name, description) VALUES (?, ?)`,
                    [name, description || null]
                );
                const [newItem] = await pool.query(`SELECT * FROM ${tableName} WHERE id = ?`, [result.insertId]);
                res.status(201).json(newItem[0]);
            } catch (error) {
                res.status(500).json({ message: 'Error creating item', error });
            }
        },
        update: async (req, res) => {
            const { name, description } = req.body;
            try {
                await pool.query(
                    `UPDATE ${tableName} SET name = ?, description = ? WHERE id = ?`,
                    [name, description || null, req.params.id]
                );
                const [updatedItem] = await pool.query(`SELECT * FROM ${tableName} WHERE id = ?`, [req.params.id]);
                res.json(updatedItem[0]);
            } catch (error) {
                res.status(500).json({ message: 'Error updating item', error });
            }
        },
        toggleStatus: async (req, res) => {
            try {
                const [item] = await pool.query(`SELECT status FROM ${tableName} WHERE id = ?`, [req.params.id]);
                if (item.length === 0) return res.status(404).json({ message: 'Not found' });

                const newStatus = item[0].status === 1 ? 0 : 1;
                await pool.query(`UPDATE ${tableName} SET status = ? WHERE id = ?`, [newStatus, req.params.id]);
                res.json({ id: req.params.id, status: newStatus });
            } catch (error) {
                res.status(500).json({ message: 'Error updating status', error });
            }
        }
    };
};

module.exports = {
    deviceTypes: createMasterDataController('device_types'),
    operatingSystems: createMasterDataController('operating_systems'),
    msOffices: createMasterDataController('ms_offices'),
    scriptInstallStatuses: createMasterDataController('script_install_statuses')
};
