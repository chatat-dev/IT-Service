const express = require('express');
const router = express.Router();
const { getPublicData } = require('../controllers/publicController');
const { getActiveNews } = require('../controllers/newsController');

router.get('/data', getPublicData);
router.get('/news/active', getActiveNews);

module.exports = router;
