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

// --- GUEST ROUTES (Public) ---
router.post('/guest', createGuestTicket);
router.get('/track', trackGuestTicket);

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
