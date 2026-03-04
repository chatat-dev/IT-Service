const pool = require('../config/db');
const fs = require('fs');
const path = require('path');

const getTicketChatHistory = async (req, res) => {
    const { ticket_id } = req.params;

    try {
        // Automatically delete chats 7 days after ticket was CLOSED, only if keep_chat_history is FALSE
        await pool.query(`
            DELETE c FROM chats c
            JOIN tickets t ON c.ticket_id = t.id
            WHERE t.status = 'closed'
            AND t.closed_at IS NOT NULL
            AND t.closed_at < NOW() - INTERVAL 7 DAY
            AND t.keep_chat_history = FALSE
        `);

        const [rows] = await pool.query(
            `SELECT c.*, u.name as sender_name, u.role as sender_role 
       FROM chats c
       LEFT JOIN users u ON c.sender_id = u.id
       WHERE c.ticket_id = ?
       ORDER BY c.created_at ASC`,
            [ticket_id]
        );

        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching chat history', error: err.message });
    }
};

const clearChatHistory = async (req, res) => {
    const { ticket_id } = req.params;

    try {
        await pool.query('DELETE FROM chats WHERE ticket_id = ?', [ticket_id]);
        res.json({ message: 'Chat history cleared successfully' });

        // Optionally emit a socket event to clear frontend clients if needed
        const io = req.app.get('io');
        if (io) io.to(`ticket_${ticket_id}`).emit('chat_cleared');

    } catch (err) {
        res.status(500).json({ message: 'Error clearing chat history', error: err.message });
    }
};

const getUnreadChatCount = async (req, res) => {
    const userId = req.user.id;
    try {
        // Count tickets where user has unread messages (messages newer than last_read_at or never read)
        const [rows] = await pool.query(`
            SELECT COUNT(DISTINCT c.ticket_id) as unread_count
            FROM chats c
            JOIN tickets t ON c.ticket_id = t.id
            WHERE t.user_id = ?
            AND c.sender_id != ?
            AND (
                c.created_at > COALESCE(
                    (SELECT cr.last_read_at FROM chat_reads cr WHERE cr.ticket_id = c.ticket_id AND cr.user_id = ?),
                    '1970-01-01'
                )
            )
        `, [userId, userId, userId]);
        res.json({ unreadCount: rows[0].unread_count });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching unread count', error: err.message });
    }
};

const markChatRead = async (req, res) => {
    const { ticket_id } = req.params;
    const userId = req.user.id;
    try {
        await pool.query(
            'INSERT INTO chat_reads (ticket_id, user_id, last_read_at) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE last_read_at = NOW()',
            [ticket_id, userId]
        );
        res.json({ message: 'Chat marked as read' });
    } catch (err) {
        res.status(500).json({ message: 'Error marking chat read', error: err.message });
    }
};

const unsendChatMessage = async (req, res) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const [msgRows] = await pool.query('SELECT * FROM chats WHERE id = ?', [id]);
        if (msgRows.length === 0) {
            return res.status(404).json({ message: 'Message not found' });
        }

        const msg = msgRows[0];

        // 1. Check sender
        if (msg.sender_id !== userId) {
            return res.status(403).json({ message: 'Not authorized to unsend this message' });
        }

        // 2. Check time (within 1 hour)
        const msgTime = new Date(msg.created_at).getTime();
        const now = Date.now();
        if (now - msgTime > 60 * 60 * 1000) {
            return res.status(403).json({ message: 'Cannot unsend message older than 1 hour' });
        }

        // 3. Delete files if any
        if (msg.file_urls) {
            try {
                const files = JSON.parse(msg.file_urls);
                files.forEach(f => {
                    if (f.url) { // e.g. /uploads/chat/filename.jpg
                        const filePath = path.join(__dirname, '..', f.url);
                        if (fs.existsSync(filePath)) {
                            fs.unlinkSync(filePath);
                        }
                    }
                });
            } catch (e) {
                console.error("Error deleting files:", e);
            }
        }

        // 4. Delete the message from DB
        await pool.query('DELETE FROM chats WHERE id = ?', [id]);

        // 5. Emit socket event
        const io = req.app.get('io');
        if (io) io.to(`ticket_${msg.ticket_id}`).emit('message_unsent', id);

        res.json({ message: 'Message unsent successfully', id });
    } catch (err) {
        res.status(500).json({ message: 'Error unsending message', error: err.message });
    }
};

const getItUnreadChatCount = async (req, res) => {
    const userId = req.user.id;
    try {
        // Count tickets where IT staff has unread messages from users
        const [rows] = await pool.query(`
            SELECT COUNT(DISTINCT c.ticket_id) as unread_count
            FROM chats c
            JOIN tickets t ON c.ticket_id = t.id
            WHERE t.status != 'closed'
            AND c.sender_id != ?
            AND (
                c.created_at > COALESCE(
                    (SELECT cr.last_read_at FROM chat_reads cr WHERE cr.ticket_id = c.ticket_id AND cr.user_id = ?),
                    '1970-01-01'
                )
            )
        `, [userId, userId]);
        res.json({ unreadCount: rows[0].unread_count });
    } catch (err) {
        res.status(500).json({ message: 'Error fetching IT unread count', error: err.message });
    }
};

module.exports = { getTicketChatHistory, clearChatHistory, getUnreadChatCount, getItUnreadChatCount, markChatRead, unsendChatMessage };
