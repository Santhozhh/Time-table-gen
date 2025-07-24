const mongoose = require('mongoose');

const generatedTimetableSchema = new mongoose.Schema({
  timetable: {
    type: Array, 
    required: true
  },
  courses: {
    type: Array,
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('GeneratedTimetable', generatedTimetableSchema); 