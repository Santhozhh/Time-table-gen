const express = require('express');
const router = express.Router();
const facultyController = require('../controllers/facultyController');

// Get all faculty members
router.get('/', facultyController.getAllFaculty);

// Get a single faculty member
router.get('/:id', facultyController.getFaculty);

// Create a new faculty member
router.post('/', facultyController.createFaculty);

// Update a faculty member
router.put('/:id', facultyController.updateFaculty);

// Delete a faculty member
router.delete('/:id', facultyController.deleteFaculty);

module.exports = router; 