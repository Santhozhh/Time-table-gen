const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');

// Get all timetables
router.get('/', timetableController.getAllTimetables);

// Get timetable by ID
router.get('/:id', timetableController.getTimetable);

// Get faculty's timetables
router.get('/faculty/:facultyId', timetableController.getFacultyTimetables);

// Create new timetable
router.post('/', timetableController.createTimetable);

// Update timetable
router.put('/:id', timetableController.updateTimetable);

// Delete timetable
router.delete('/:id', timetableController.deleteTimetable);

// Check faculty availability
router.post('/check-availability', timetableController.checkFacultyAvailability);

module.exports = router; 