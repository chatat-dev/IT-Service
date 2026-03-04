const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getPendingUsers, approveUser, rejectUser } = require('../controllers/adminController');

// IT can approve/reject pending users
router.use(protect);
router.use(authorize('it', 'admin'));

router.get('/pending-users', getPendingUsers);
router.put('/pending-users/:id/approve', approveUser);
router.delete('/pending-users/:id/reject', rejectUser);

module.exports = router;
