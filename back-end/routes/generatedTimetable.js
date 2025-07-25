const express = require('express');
const router = express.Router();
const generatedTimetableController = require('../controllers/generatedTimetableController');

router.get('/faculty-summary', generatedTimetableController.exportFacultySummary);
router.get('/faculty/:facId/timetable', generatedTimetableController.exportFacultyTimetable);
router.get('/', generatedTimetableController.getAllGeneratedTimetables);
router.get('/:id', generatedTimetableController.getGeneratedTimetableById);
router.post('/', generatedTimetableController.createGeneratedTimetable);
router.put('/:id', generatedTimetableController.updateGeneratedTimetable);
router.get('/:id/excel', generatedTimetableController.exportExcel);
router.delete('/:id', generatedTimetableController.deleteGeneratedTimetable);

module.exports = router; 