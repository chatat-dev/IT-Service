const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    createGuestTicket, trackGuestTicket,
    createUserTicket, getUserTickets,
    getTicketBoard, updateTicketStatus, assignTicket, transferTicket, closeTicket,
    deleteUnassignedTicket, addNote, getNotes, inviteParticipant, linkTicket,
    toggleKeepChatHistory, togglePinTicket, markTicketViewed
} = require('../controllers/ticketController');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const pool = require('../config/db');

// File upload setup
const uploadDir = path.join(__dirname, '..', 'uploads', 'tickets');
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

// --- GUEST ROUTES (Public) ---
router.post('/guest', createGuestTicket);
router.get('/track', trackGuestTicket);
router.post('/upload', uploadWrapper, (req, res) => {
    const files = req.files.map(f => ({
        name: f.originalname,
        url: `/uploads/tickets/${f.filename}`,
        size: f.size,
        uploaded_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    }));
    res.json({ files });
});

// --- PROTECTED ROUTES ---
router.use(protect);

// USER ROUTES
router.post('/', authorize('user', 'admin'), createUserTicket);
router.get('/my-tickets', authorize('user', 'admin'), getUserTickets);

// IT & ADMIN ROUTES
// IT Staff list (for transfer dropdown - accessible by IT role)
router.get('/it-staff/list', authorize('it', 'admin'), async (req, res) => {
    try {
        const db = require('../config/db');
        const [users] = await db.query("SELECT id, name, lname FROM users WHERE role = 'it'");
        res.json(users);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});
router.get('/board', authorize('it', 'admin'), getTicketBoard);
router.put('/:id/status', authorize('it', 'admin'), updateTicketStatus);
router.put('/:id/assign', authorize('it', 'admin'), assignTicket);
router.put('/:id/transfer', authorize('it', 'admin'), transferTicket);
router.put('/:id/close', authorize('it', 'admin'), closeTicket);
router.put('/:id/view', authorize('it', 'admin'), markTicketViewed);
router.delete('/:id', authorize('it', 'admin'), deleteUnassignedTicket);

// IT Notes & Links
router.get('/:id/notes', authorize('it', 'admin'), getNotes);
router.post('/:id/notes', authorize('it', 'admin'), addNote);
router.post('/:id/invite', authorize('it', 'admin'), inviteParticipant);
router.put('/:id/link', authorize('it', 'admin'), linkTicket);
router.put('/:id/keep-history', authorize('it', 'admin'), toggleKeepChatHistory);
router.put('/:id/pin', authorize('it', 'admin'), togglePinTicket);

module.exports = router;
