const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { getLogs } = require('../controllers/logController');

router.use(protect);
router.use(authorize('admin')); // Only admins can view logs

router.get('/admin', getLogs);

module.exports = router;
