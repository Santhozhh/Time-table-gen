const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  grade: {
    type: String,
    enum: ['Professor/HoD','Professor','Associate Professor','Assistant Professor I','Assistant Professor II','Assistant Professor III'],
    default: 'Assistant Professor I'
  },
  code: {
    type: String,
    trim: true
  },
  specialization: {
    type: String,
    required: true
  },
  maxHoursPerWeek: {
    type: Number,
    default: 42
  },
  active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Faculty', facultySchema); 