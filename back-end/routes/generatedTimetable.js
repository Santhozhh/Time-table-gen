const express = require('express');
const router = express.Router();
const generatedTimetableController = require('../controllers/generatedTimetableController');

router.get('/', generatedTimetableController.getAllGeneratedTimetables);
router.post('/', generatedTimetableController.createGeneratedTimetable);
router.get('/:id/excel', generatedTimetableController.exportExcel);

module.exports = router; 