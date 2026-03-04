const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const {
    getAllNews, createNews, updateNews, deleteNews, getActiveNews
} = require('../controllers/newsController');

router.use(protect);

// Anyone logged in can fetch active news
router.get('/active', getActiveNews);

// Only admins can manage news
router.use(authorize('admin'));
router.get('/', getAllNews);
router.post('/', createNews);
router.put('/:id', updateNews);
router.delete('/:id', deleteNews);

module.exports = router;
