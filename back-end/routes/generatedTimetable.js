const express = require('express');
const router = express.Router();
const generatedTimetableController = require('../controllers/generatedTimetableController');

router.get('/', generatedTimetableController.getAllGeneratedTimetables);
router.get('/:id', generatedTimetableController.getGeneratedTimetableById);
router.post('/', generatedTimetableController.createGeneratedTimetable);
router.put('/:id', generatedTimetableController.updateGeneratedTimetable);
router.get('/:id/excel', generatedTimetableController.exportExcel);

module.exports = router; 