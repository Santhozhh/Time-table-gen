const mongoose = require('mongoose');

const generatedTimetableSchema = new mongoose.Schema({
  timetable: {
    type: Array, // 6x7 matrix stored as array of arrays
    required: true
  },
  courses: {
    type: Array, // list of subject objects from front-end
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('GeneratedTimetable', generatedTimetableSchema); 