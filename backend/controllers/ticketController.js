const pool = require('../config/db');

// Utility to generate a ticket number
const generateTicketNo = () => {
    const date = new Date();
    const year = date.getFullYear().toString().substr(-2);
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `REQ${year}${month}-${random}`;
};

// --- GUEST ---
const createGuestTicket = async (req, res) => {
    const { guest_name, guest_phone, location_id, company_id, site_id, department_id, description, category_id, attachment_urls } = req.body;
    const ip_address = req.ip || req.connection.remoteAddress;

    try {
        const ticket_no = generateTicketNo();
        await pool.query(
            'INSERT INTO tickets (ticket_no, guest_name, guest_phone, location_id, company_id, site_id, department_id, description, category_id, ip_address, status, attachment_urls) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [ticket_no, guest_name, guest_phone, location_id, company_id, site_id, department_id, description, category_id || null, ip_address, 'open', attachment_urls ? JSON.stringify(attachment_urls) : null]
        );
        res.status(201).json({ message: 'Ticket created', ticket_no });

        // Emit real-time update
        const io = req.app.get('io');
        if (io) io.emit('refresh_tickets');
    } catch (err) {
        res.status(500).json({ message: 'Error creating ticket', error: err.message });
    }
};

const trackGuestTicket = async (req, res) => {
    const { keyword } = req.query; // search by ticket_no, phone, or name
    try {
        const [rows] = await pool.query(
            `SELECT t.*, u.name as assigned_name, c.name as category_name 
       FROM tickets t 
       LEFT JOIN users u ON t.assigned_to = u.id 
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE (t.ticket_no LIKE ? OR t.guest_phone LIKE ? OR t.guest_name LIKE ?) AND t.user_id IS NULL
       ORDER BY t.created_at DESC`,
            [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error tracking ticket', error: err.message });
    }
};

// --- GENERAL USER ---
const createUserTicket = async (req, res) => {
    const { description, category_id, attachment_urls } = req.body;
    const ip_address = req.ip || req.connection.remoteAddress;
    const user = req.user;

    try {
        // Fetch user details for defaults
        const [userRows] = await pool.query('SELECT * FROM users WHERE id = ?', [user.id]);
        if (userRows.length === 0) return res.status(404).json({ message: 'User not found' });
        const u = userRows[0];

        const ticket_no = generateTicketNo();

        // Auto-link: find computer matching this user's emp_id or user_id
        let autoComputerId = null;
        if (u.emp_id) {
            const [compRows] = await pool.query(
                'SELECT id FROM computers WHERE emp_id = ? OR user_id = ? LIMIT 1',
                [u.emp_id, u.id]
            );
            if (compRows.length > 0) autoComputerId = compRows[0].id;
        }

        await pool.query(
            'INSERT INTO tickets (ticket_no, user_id, computer_id, location_id, company_id, site_id, department_id, description, category_id, ip_address, status, attachment_urls) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [ticket_no, u.id, autoComputerId, u.location_id, u.company_id, u.site_id, u.department_id, description, category_id || null, ip_address, 'open', attachment_urls ? JSON.stringify(attachment_urls) : null]
        );
        res.status(201).json({ message: 'Ticket created', ticket_no });

        // Emit real-time update
        const io = req.app.get('io');
        if (io) io.emit('refresh_tickets');
    } catch (err) {
        res.status(500).json({ message: 'Error creating ticket', error: err.message });
    }
};

const getUserTickets = async (req, res) => {
    try {
        const [rows] = await pool.query(
            `SELECT t.*, u.name as assigned_name, c.name as category_name 
       FROM tickets t 
       LEFT JOIN users u ON t.assigned_to = u.id 
       LEFT JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = ?
       ORDER BY t.created_at DESC`,
            [req.user.id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching user tickets', error: err.message });
    }
};

// --- IT / SUPER USER ---
const getTicketBoard = async (req, res) => {
    const { status } = req.query; // 'open', 'in_progress', 'closed'
    const userId = req.user.id;

    let query = `
    SELECT t.*,
        u.name as assigned_name,
        gu.name as user_name, gu.lname as user_lname, gu.emp_id as user_emp_id, gu.phone as user_phone,
        c.name as category_name,
        l.name as location_name,
        comp.name as company_name,
        s.name as site_name,
        d.name as dept_name,
        c_asset.pc_asset_no, c_asset.device_name as computer_device_name,
        GROUP_CONCAT(tp.user_id) as participant_ids,
        CASE 
            WHEN t.status = 'closed' AND t.closed_at IS NOT NULL AND t.keep_chat_history = 0
            THEN GREATEST(0, 7 - DATEDIFF(NOW(), t.closed_at))
            ELSE NULL
        END as days_until_delete,
        IF(tv.viewed_at IS NOT NULL, 1, 0) as is_viewed_by_me
    FROM tickets t 
    LEFT JOIN users u ON t.assigned_to = u.id 
    LEFT JOIN users gu ON t.user_id = gu.id
    LEFT JOIN categories c ON t.category_id = c.id
    LEFT JOIN locations l ON t.location_id = l.id
    LEFT JOIN companies comp ON t.company_id = comp.id
    LEFT JOIN sites s ON t.site_id = s.id
    LEFT JOIN departments d ON t.department_id = d.id
    LEFT JOIN computers c_asset ON t.computer_id = c_asset.id
    LEFT JOIN ticket_participants tp ON t.id = tp.ticket_id
    LEFT JOIN ticket_views tv ON t.id = tv.ticket_id AND tv.user_id = ?
        `;
    const params = [userId];

    if (status) {
        query += ' WHERE t.status = ?';
        params.push(status);
    }
    query += ' GROUP BY t.id ORDER BY t.created_at DESC';

    try {
        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching ticket board', error: err.message });
    }
};

const assignTicket = async (req, res) => {
    const { id } = req.params;
    try {
        // Guard: prevent double-accept
        const [existing] = await pool.query('SELECT assigned_to FROM tickets WHERE id = ?', [id]);
        if (existing.length === 0) return res.status(404).json({ message: 'Ticket not found' });
        if (existing[0].assigned_to) return res.status(409).json({ message: 'This ticket has already been accepted by another IT staff.' });

        await pool.query('UPDATE tickets SET assigned_to = ?, status = ? WHERE id = ?', [req.user.id, 'in_progress', id]);
        res.json({ message: 'Ticket assigned to you' });
    } catch (err) {
        res.status(500).json({ message: 'Error assigning ticket', error: err.message });
    }
};

const inviteParticipant = async (req, res) => {
    const { id } = req.params;
    const { user_id } = req.body;

    try {
        await pool.query('INSERT IGNORE INTO ticket_participants (ticket_id, user_id) VALUES (?, ?)', [id, user_id]);

        const io = req.app.get('io');
        if (io) {
            io.emit('refresh_tickets');
        }

        res.json({ message: 'User added to chat' });
    } catch (err) {
        res.status(500).json({ message: 'Error adding user to chat', error: err.message });
    }
};

const transferTicket = async (req, res) => {
    const { id } = req.params;
    const { new_assignee_id } = req.body;
    try {
        await pool.query('UPDATE tickets SET assigned_to = ? WHERE id = ?', [new_assignee_id, id]);
        await pool.query('INSERT INTO ticket_logs (ticket_id, user_id, action) VALUES (?, ?, ?)', [id, req.user.id, `Transferred to user_id ${new_assignee_id} `]);

        const io = req.app.get('io');
        if (io) {
            io.emit('refresh_tickets');
        }

        res.json({ message: 'Ticket transferred' });
    } catch (err) {
        res.status(500).json({ message: 'Error transferring ticket', error: err.message });
    }
};

const updateTicketStatus = async (req, res) => {
    const { id } = req.params;
    const { category_id } = req.body;
    try {
        await pool.query('UPDATE tickets SET category_id = ? WHERE id = ?', [category_id, id]);
        res.json({ message: 'Ticket category updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating ticket', error: err.message });
    }
};

const closeTicket = async (req, res) => {
    const { id } = req.params;
    const { solution, category_id } = req.body;
    try {
        await pool.query(
            'UPDATE tickets SET status = ?, solution = ?, category_id = COALESCE(?, category_id), closed_at = CURRENT_TIMESTAMP WHERE id = ? AND assigned_to = ?',
            ['closed', solution, category_id || null, id, req.user.id]
        );
        res.json({ message: 'Ticket closed' });
    } catch (err) {
        res.status(500).json({ message: 'Error closing ticket', error: err.message });
    }
};

// IT: delete unassigned ticket only
const deleteUnassignedTicket = async (req, res) => {
    const { id } = req.params;
    try {
        const [ticket] = await pool.query('SELECT assigned_to FROM tickets WHERE id = ?', [id]);
        if (ticket.length === 0) return res.status(404).json({ message: 'Ticket not found' });
        if (ticket[0].assigned_to) return res.status(403).json({ message: 'Cannot delete a ticket that has been accepted. Ask Admin to delete.' });

        await pool.query('DELETE FROM tickets WHERE id = ?', [id]);
        res.json({ message: 'Ticket deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting ticket', error: err.message });
    }
};

// ADMIN: force delete any ticket
const adminDeleteTicket = async (req, res) => {
    const { id } = req.params;
    try {
        const [ticket] = await pool.query('SELECT id FROM tickets WHERE id = ?', [id]);
        if (ticket.length === 0) return res.status(404).json({ message: 'Ticket not found' });

        await pool.query('DELETE FROM ticket_logs WHERE ticket_id = ?', [id]);
        await pool.query('DELETE FROM chats WHERE ticket_id = ?', [id]);
        await pool.query('DELETE FROM tickets WHERE id = ?', [id]);
        res.json({ message: 'Ticket and related data deleted by admin' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting ticket', error: err.message });
    }
};

// IT Internal Notes
const addNote = async (req, res) => {
    const { id } = req.params;
    const { note } = req.body;
    try {
        await pool.query('INSERT INTO ticket_logs (ticket_id, user_id, action) VALUES (?, ?, ?)', [id, req.user.id, note]);
        res.json({ message: 'Note added' });
    } catch (err) {
        res.status(500).json({ message: 'Error adding note', error: err.message });
    }
};

const getNotes = async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await pool.query(
            `SELECT tl.*, u.name as user_name FROM ticket_logs tl LEFT JOIN users u ON tl.user_id = u.id WHERE tl.ticket_id = ? ORDER BY tl.created_at DESC`, [id]
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching notes', error: err.message });
    }
};
// Link ticket to specific computer and/or user
const linkTicket = async (req, res) => {
    const { id } = req.params;
    const { computer_id, user_id } = req.body;
    try {
        let updates = [];
        let values = [];
        if (computer_id !== undefined) {
            updates.push('computer_id = ?');
            values.push(computer_id || null);
        }
        if (user_id !== undefined) {
            updates.push('user_id = ?');
            values.push(user_id || null);
        }

        if (updates.length > 0) {
            values.push(id);
            await pool.query(`UPDATE tickets SET ${updates.join(', ')} WHERE id = ? `, values);
            await pool.query('INSERT INTO ticket_logs (ticket_id, user_id, action) VALUES (?, ?, ?)', [id, req.user.id, 'Linked ticket to specific asset/user']);
        }
        res.json({ message: 'Ticket linked successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error linking ticket', error: err.message });
    }
};

const toggleKeepChatHistory = async (req, res) => {
    const { id } = req.params;
    const { keep } = req.body; // boolean
    try {
        await pool.query('UPDATE tickets SET keep_chat_history = ? WHERE id = ?', [keep ? 1 : 0, id]);

        // Broadcast the refresh
        const io = req.app.get('io');
        if (io) io.emit('refresh_tickets');

        res.json({ message: 'Chat history retention updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating chat history retention', error: err.message });
    }
};

const togglePinTicket = async (req, res) => {
    const { id } = req.params;
    const { is_pinned } = req.body;
    try {
        await pool.query('UPDATE tickets SET is_pinned = ? WHERE id = ?', [is_pinned ? 1 : 0, id]);
        res.json({ message: 'Pin status updated' });
    } catch (err) {
        res.status(500).json({ message: 'Error pinning ticket', error: err.message });
    }
};

const markTicketViewed = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('INSERT IGNORE INTO ticket_views (ticket_id, user_id) VALUES (?, ?)', [id, req.user.id]);
        res.json({ message: 'Ticket marked as viewed' });
    } catch (err) {
        res.status(500).json({ message: 'Error marking ticket viewed', error: err.message });
    }
};

module.exports = {
    createGuestTicket, trackGuestTicket,
    createUserTicket, getUserTickets,
    getTicketBoard, updateTicketStatus, assignTicket, transferTicket, closeTicket,
    deleteUnassignedTicket, adminDeleteTicket, addNote, getNotes, inviteParticipant,
    linkTicket, toggleKeepChatHistory,
    togglePinTicket, markTicketViewed
};
