const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getDashboardStats, exportTickets } = require('../controllers/reportController');

router.use(protect);
router.use(authorize('it', 'admin'));

router.get('/stats', getDashboardStats);
router.get('/export', exportTickets);

module.exports = router;
