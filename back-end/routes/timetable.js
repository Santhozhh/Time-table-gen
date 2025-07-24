const express = require('express');
const router = express.Router();
const timetableController = require('../controllers/timetableController');

router.get('/', timetableController.getAllTimetables);

router.get('/:id', timetableController.getTimetable);

router.get('/faculty/:facultyId', timetableController.getFacultyTimetables);

router.post('/', timetableController.createTimetable);

router.put('/:id', timetableController.updateTimetable);

router.delete('/:id', timetableController.deleteTimetable);

router.post('/check-availability', timetableController.checkFacultyAvailability);

module.exports = router; 