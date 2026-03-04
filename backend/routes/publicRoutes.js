const express = require('express');
const router = express.Router();
const { getPublicData } = require('../controllers/publicController');

router.get('/data', getPublicData);

module.exports = router;
