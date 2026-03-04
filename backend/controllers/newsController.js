const pool = require('../config/db');

// --- ADMIN / IT: Manage News ---

// Get all news (for admin table)
const getAllNews = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT n.*, u.name as author_name 
            FROM news n 
            LEFT JOIN users u ON n.author_id = u.id 
            ORDER BY n.id DESC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching news', error: err.message });
    }
};

// Create news
const createNews = async (req, res) => {
    const { title, content, status } = req.body;
    try {
        const [result] = await pool.query(
            'INSERT INTO news (title, content, status, author_id) VALUES (?, ?, ?, ?)',
            [title, content, status !== undefined ? status : 1, req.user.id]
        );
        res.status(201).json({ id: result.insertId, title, status });
    } catch (err) {
        res.status(500).json({ message: 'Error creating news', error: err.message });
    }
};

// Update news
const updateNews = async (req, res) => {
    const { id } = req.params;
    const { title, content, status } = req.body;
    try {
        await pool.query(
            'UPDATE news SET title = ?, content = ?, status = ? WHERE id = ?',
            [title, content, status, id]
        );
        res.json({ message: 'News updated successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error updating news', error: err.message });
    }
};

// Delete news
const deleteNews = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM news WHERE id = ?', [id]);
        res.json({ message: 'News deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting news', error: err.message });
    }
};

// --- PUBLIC (Logged In Users): Fetch Active News ---
const getActiveNews = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT id, title, content, created_at FROM news WHERE status = 1 ORDER BY id DESC'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching active news', error: err.message });
    }
};

module.exports = {
    getAllNews, createNews, updateNews, deleteNews, getActiveNews
};
