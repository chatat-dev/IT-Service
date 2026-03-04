const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const { getTicketChatHistory, clearChatHistory, getUnreadChatCount, getItUnreadChatCount, getUnreadChatsPerTicket, markChatRead, unsendChatMessage } = require('../controllers/chatController');

// File upload setup
const uploadDir = path.join(__dirname, '..', 'uploads', 'chat');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, unique + '-' + file.originalname);
    }
});

const uploadWrapper = async (req, res, next) => {
    try {
        const [rows] = await pool.query('SELECT * FROM attachment_settings LIMIT 1');
        const settings = rows[0] || { max_file_size_mb: 5, allowed_extensions: '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx', is_active: 1 };

        if (!settings.is_active) {
            return res.status(403).json({ message: 'File uploads are currently disabled by the administrator.' });
        }

        const extArray = settings.allowed_extensions.split(',').map(ext => ext.trim().toLowerCase());
        const maxSize = settings.max_file_size_mb * 1024 * 1024;

        const dynamicUpload = multer({
            storage: storage,
            limits: { fileSize: maxSize },
            fileFilter: (req, file, cb) => {
                const ext = path.extname(file.originalname).toLowerCase();
                if (!extArray.includes(ext)) {
                    return cb(new Error(`File extension ${ext} not allowed. Please use: ${settings.allowed_extensions}`));
                }
                cb(null, true);
            }
        }).array('files', 5);

        dynamicUpload(req, res, function (err) {
            if (err instanceof multer.MulterError) {
                return res.status(400).json({ message: `Upload error: ${err.message}. Limit is ${settings.max_file_size_mb}MB per file.` });
            } else if (err) {
                return res.status(400).json({ message: err.message });
            }
            next();
        });
    } catch (error) {
        console.error('Upload wrapper error:', error);
        res.status(500).json({ message: 'Server error processing file upload' });
    }
};
router.use(protect);
router.get('/unread-count', getUnreadChatCount);
router.get('/it-unread-count', getItUnreadChatCount);
router.get('/user-unread-tickets', getUnreadChatsPerTicket);
router.delete('/message/:id', unsendChatMessage);
router.put('/:ticket_id/read', markChatRead);
router.get('/:ticket_id', getTicketChatHistory);
router.delete('/:ticket_id', clearChatHistory);

// File upload endpoint
router.post('/upload', uploadWrapper, (req, res) => {
    const files = req.files.map(f => ({
        name: f.originalname,
        url: `/uploads/chat/${f.filename}`,
        size: f.size,
        uploaded_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    }));
    res.json({ files });
});

module.exports = router;
