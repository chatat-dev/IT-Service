const pool = require('../config/db');
const { logAction } = require('./logController');

// Search employee from users table
const searchEmployee = async (req, res) => {
    try {
        const { emp_id } = req.query;
        if (!emp_id) return res.status(400).json({ message: 'Employee ID is required' });

        const [users] = await pool.query(
            `SELECT u.id, u.emp_id, u.name, u.lname, u.phone, u.location_id, u.company_id, u.site_id, u.department_id 
             FROM users u 
             WHERE u.emp_id LIKE ? LIMIT 1`,
            [`%${emp_id}%`]
        );

        if (users.length === 0) {
            return res.status(404).json({ message: 'Employee not found' });
        }

        res.json(users[0]);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get all computers
const getComputers = async (req, res) => {
    try {
        const { keyword, status } = req.query;
        let query = `
            SELECT c.*, 
                   dt.name as device_type_name,
                   l.name as location_name,
                   comp.name as company_name,
                   d.name as department_name,
                   u.name as user_name
            FROM computers c
            LEFT JOIN device_types dt ON c.device_type_id = dt.id
            LEFT JOIN locations l ON c.location_id = l.id
            LEFT JOIN companies comp ON c.company_id = comp.id
            LEFT JOIN departments d ON c.department_id = d.id
            LEFT JOIN users u ON c.user_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (keyword) {
            query += ` AND (c.pc_asset_no LIKE ? OR c.device_name LIKE ? OR c.emp_id LIKE ? OR u.name LIKE ?)`;
            const search = `%${keyword}%`;
            params.push(search, search, search, search);
        }

        if (status) {
            query += ` AND c.status_pc = ?`;
            params.push(status); // 'Y' or 'N'
        }

        query += ` ORDER BY c.created_at DESC`;

        const [computers] = await pool.query(query, params);
        res.json(computers);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Get single computer with notes
const getComputerById = async (req, res) => {
    try {
        const { id } = req.params;
        const [computers] = await pool.query(
            `SELECT c.*, 
                   dt.name as device_type_name,
                   l.name as location_name,
                   comp.name as company_name,
                   s.name as site_name,
                   d.name as department_name,
                   u.name as user_name,
                   os.name as os_name,
                   mo.name as ms_office_name,
                   slg.name as service_life_group_name,
                   sis.name as script_install_status_name
            FROM computers c
            LEFT JOIN device_types dt ON c.device_type_id = dt.id
            LEFT JOIN locations l ON c.location_id = l.id
            LEFT JOIN companies comp ON c.company_id = comp.id
            LEFT JOIN sites s ON c.site_id = s.id
            LEFT JOIN departments d ON c.department_id = d.id
            LEFT JOIN users u ON c.user_id = u.id
            LEFT JOIN operating_systems os ON c.os_id = os.id
            LEFT JOIN ms_offices mo ON c.ms_office_id = mo.id
            LEFT JOIN service_life_groups slg ON c.service_life_group_id = slg.id
            LEFT JOIN script_install_statuses sis ON c.script_install_status_id = sis.id
            WHERE c.id = ?`,
            [id]
        );

        if (!computers || computers.length === 0) {
            console.log(`Computer with id ${id} not found.`);
            return res.status(404).json({ message: 'Computer not found' });
        }

        const computer = computers[0];

        // Fetch notes
        const [notes] = await pool.query(
            `SELECT cn.*, u.name as user_name 
             FROM computer_notes cn 
             LEFT JOIN users u ON cn.user_id = u.id 
             WHERE cn.computer_id = ? 
             ORDER BY cn.created_at DESC`,
            [id]
        );

        computer.notes = notes;

        // Fetch related tickets
        const [tickets] = await pool.query(
            `SELECT id, ticket_no, status, created_at, closed_at, description 
             FROM tickets 
             WHERE computer_id = ? 
             ORDER BY created_at DESC`,
            [id]
        );

        computer.tickets = tickets;

        res.json(computer);
    } catch (err) {
        res.status(500).json({ message: 'Server error', error: err.message });
    }
};

// Create a computer
const createComputer = async (req, res) => {
    try {
        const data = req.body;
        // Basic mapping
        const keys = [
            'location_id', 'company_id', 'building_name', 'site_id', 'department_id', 'device_type_id',
            'status_pc', 'emp_id', 'emp_name', 'user_id', 'pc_asset_no', 'device_name',
            'notebook_brand_model', 'serial_number', 'os_id', 'ms_office_id',
            'purchase_date', 'issue_date', 'cpu_core',
            'ram_gb', 'script_install_status_id', 'vpn_status', 'windows_product_key',
            'backup_status', 'ups_asset_no', 'accessories', 'extension_no'
        ];

        const values = [];
        const placeholders = [];
        const insertKeys = [];

        keys.forEach(k => {
            if (data[k] !== undefined) {
                insertKeys.push(k);
                placeholders.push('?');
                values.push(data[k] === '' ? null : data[k]);
            }
        });

        const query = `INSERT INTO computers (${insertKeys.join(', ')}) VALUES (${placeholders.join(', ')})`;
        const [result] = await pool.query(query, values);

        // Insert notes if provided
        if (data.notes && Array.isArray(data.notes)) {
            const validNotes = data.notes.filter(n => n.trim() !== '');
            for (const note of validNotes) {
                await pool.query(
                    'INSERT INTO computer_notes (computer_id, user_id, note_text) VALUES (?, ?, ?)',
                    [result.insertId, req.user.id, note.trim()]
                );
            }
        }

        // Log action
        await logAction(req.user.id, 'CREATE_COMPUTER', `Created PC Asset: ${data.pc_asset_no || result.insertId}`, req.ip);

        res.status(201).json({ id: result.insertId, message: 'Computer created successfully' });
    } catch (err) {
        console.error("CREATE COMPUTER SQL ERROR:", err.message, "Payload:", req.body);
        res.status(500).json({ message: 'Error creating computer', error: err.message });
    }
};

// Update a computer
const updateComputer = async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        const keys = [
            'location_id', 'company_id', 'building_name', 'site_id', 'department_id', 'device_type_id',
            'status_pc', 'emp_id', 'emp_name', 'user_id', 'pc_asset_no', 'device_name',
            'notebook_brand_model', 'serial_number', 'os_id', 'ms_office_id',
            'purchase_date', 'issue_date', 'cpu_core',
            'ram_gb', 'script_install_status_id', 'vpn_status', 'windows_product_key',
            'backup_status', 'ups_asset_no', 'accessories', 'extension_no'
        ];

        const values = [];
        const updateStrings = [];

        keys.forEach(k => {
            if (data[k] !== undefined) {
                updateStrings.push(`${k} = ?`);
                values.push(data[k] === '' ? null : data[k]);
            }
        });

        if (updateStrings.length === 0) return res.status(400).json({ message: 'No fields to update' });

        values.push(id);
        const query = `UPDATE computers SET ${updateStrings.join(', ')} WHERE id = ?`;

        await pool.query(query, values);

        // Insert new notes if provided
        if (data.notes && Array.isArray(data.notes)) {
            const validNotes = data.notes.filter(n => n.trim() !== '');
            for (const note of validNotes) {
                await pool.query(
                    'INSERT INTO computer_notes (computer_id, user_id, note_text) VALUES (?, ?, ?)',
                    [id, req.user.id, note.trim()]
                );
            }
        }

        await logAction(req.user.id, 'UPDATE_COMPUTER', `Updated PC ID: ${id}`, req.ip);

        res.json({ message: 'Computer updated successfully' });
    } catch (err) {
        console.error("UPDATE COMPUTER SQL ERROR:", err.message, "Payload:", req.body);
        res.status(500).json({ message: 'Error updating computer', error: err.message });
    }
};

// Add note to computer
const addComputerNote = async (req, res) => {
    try {
        const { id } = req.params;
        const { note_text } = req.body;

        if (!note_text) return res.status(400).json({ message: 'Note text required' });

        const [result] = await pool.query(
            'INSERT INTO computer_notes (computer_id, user_id, note_text) VALUES (?, ?, ?)',
            [id, req.user.id, note_text]
        );

        const [newNote] = await pool.query(
            `SELECT cn.*, u.name as user_name 
             FROM computer_notes cn 
             LEFT JOIN users u ON cn.user_id = u.id 
             WHERE cn.id = ?`,
            [result.insertId]
        );

        await logAction(req.user.id, 'ADD_COMPUTER_NOTE', `Added note to PC ID: ${id}`, req.ip);

        res.status(201).json(newNote[0]);
    } catch (err) {
        res.status(500).json({ message: 'Error adding note', error: err.message });
    }
};

// Delete a computer
const deleteComputer = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        await connection.beginTransaction();

        // Delete associated notes and tickets first if schema doesn't cascade
        await connection.query('DELETE FROM computer_notes WHERE computer_id = ?', [id]);
        // Note: Assuming there is no strict constraint on tickets or it's allowed.

        const [result] = await connection.query('DELETE FROM computers WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Computer not found or already deleted' });
        }

        await connection.commit();
        await logAction(req.user.id, 'DELETE_COMPUTER', `Deleted PC ID: ${id}`, req.ip);

        res.json({ message: 'Computer deleted successfully' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ message: 'Error deleting computer', error: err.message });
    } finally {
        connection.release();
    }
};

// Search computers by employee ID or name (for Link Asset)
const searchComputersByEmployee = async (req, res) => {
    try {
        const { q } = req.query;
        if (!q || q.trim().length < 1) return res.json([]);

        const search = `%${q.trim()}%`;
        const [rows] = await pool.query(
            `SELECT c.id, c.pc_asset_no, c.device_name, c.emp_id, c.status_pc,
                    u.name as user_name, u.lname as user_lname,
                    l.name as location_name, comp.name as company_name
             FROM computers c
             LEFT JOIN users u ON c.user_id = u.id
             LEFT JOIN locations l ON c.location_id = l.id
             LEFT JOIN companies comp ON c.company_id = comp.id
             WHERE c.emp_id LIKE ? 
                OR CONCAT(u.name, ' ', u.lname) LIKE ? 
                OR u.name LIKE ? 
                OR u.lname LIKE ? 
                OR c.pc_asset_no LIKE ?
             ORDER BY c.emp_id ASC
             LIMIT 10`,
            [search, search, search, search, search]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error searching computers', error: err.message });
    }
};

// Get repair history (linked tickets + manual logs) for a computer
const getComputerRepairHistory = async (req, res) => {
    try {
        const { id } = req.params;
        // Ticket-based repairs
        const [tickets] = await pool.query(
            `SELECT t.id, t.ticket_no, t.status, t.description, t.solution, t.created_at, t.closed_at,
                    u.name as assigned_name,
                    gu.name as requester_name, gu.lname as requester_lname,
                    t.guest_name, t.guest_phone,
                    c.name as category_name,
                    'ticket' as source
             FROM tickets t
             LEFT JOIN users u ON t.assigned_to = u.id
             LEFT JOIN users gu ON t.user_id = gu.id
             LEFT JOIN categories c ON t.category_id = c.id
             WHERE t.computer_id = ?
             ORDER BY t.created_at DESC`,
            [id]
        );
        // Manual repair logs
        const [manualLogs] = await pool.query(
            `SELECT r.id, r.repair_date, r.description, r.solution, r.technician, r.created_by, r.created_at,
                    u.name as created_by_name
             FROM computer_repair_logs r
             LEFT JOIN users u ON r.created_by = u.id
             WHERE r.computer_id = ?
             ORDER BY r.repair_date DESC`,
            [id]
        );
        res.json({ tickets, manualLogs });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching repair history', error: err.message });
    }
};

// Add manual repair log (technician = logged-in user automatically)
const addManualRepairLog = async (req, res) => {
    try {
        const { id } = req.params;
        const { repair_date, description, solution } = req.body;
        if (!repair_date || !description) {
            return res.status(400).json({ message: 'repair_date and description are required' });
        }
        // Auto-set technician from logged-in user
        const [userRows] = await pool.query('SELECT name, lname FROM users WHERE id = ?', [req.user.id]);
        const techName = userRows.length > 0 ? `${userRows[0].name || ''} ${userRows[0].lname || ''}`.trim() : '';
        await pool.query(
            `INSERT INTO computer_repair_logs (computer_id, repair_date, description, solution, technician, created_by)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [id, repair_date, description, solution || null, techName, req.user.id]
        );
        res.status(201).json({ message: 'Repair log added successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error adding repair log', error: err.message });
    }
};

// Delete manual repair log (only creator can delete)
const deleteManualRepairLog = async (req, res) => {
    try {
        const { logId } = req.params;
        const [rows] = await pool.query('SELECT created_by FROM computer_repair_logs WHERE id = ?', [logId]);
        if (rows.length === 0) return res.status(404).json({ message: 'Log not found' });
        if (rows[0].created_by !== req.user.id) return res.status(403).json({ message: 'Only the technician who created this log can delete it' });
        await pool.query('DELETE FROM computer_repair_logs WHERE id = ?', [logId]);
        res.json({ message: 'Repair log deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting repair log', error: err.message });
    }
};

// Update manual repair log (only creator can edit)
const updateManualRepairLog = async (req, res) => {
    try {
        const { logId } = req.params;
        const { repair_date, description, solution } = req.body;
        const [rows] = await pool.query('SELECT created_by FROM computer_repair_logs WHERE id = ?', [logId]);
        if (rows.length === 0) return res.status(404).json({ message: 'Log not found' });
        if (rows[0].created_by !== req.user.id) return res.status(403).json({ message: 'Only the technician who created this log can edit it' });
        await pool.query(
            'UPDATE computer_repair_logs SET repair_date = ?, description = ?, solution = ? WHERE id = ?',
            [repair_date, description, solution || null, logId]
        );
        res.json({ message: 'Repair log updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating repair log', error: err.message });
    }
};

// Get IT staff list for technician autocomplete
const getITStaffList = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT id, name, lname, emp_id FROM users WHERE role IN ('it','admin') AND status = 1 ORDER BY name ASC`
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching IT staff', error: err.message });
    }
};

module.exports = {
    searchEmployee, getComputers, getComputerById, createComputer, updateComputer, addComputerNote, deleteComputer, searchComputersByEmployee, getComputerRepairHistory, addManualRepairLog, deleteManualRepairLog, updateManualRepairLog, getITStaffList
};
