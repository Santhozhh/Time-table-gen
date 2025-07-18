const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');

router.get('/periods', settingsController.getPeriods);
router.put('/periods', settingsController.updatePeriods);

module.exports = router; 