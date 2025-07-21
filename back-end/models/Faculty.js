const mongoose = require('mongoose');

const facultySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  grade: {
    type: String,
<<<<<<< HEAD
    enum: ['Professor/HoD','Professor','Associate Professor','Assistant Professor I','Assistant Professor II','Assistant Professor III'],
=======
    enum: ['Professor','Professor/HoD','Associate Professor','Assistant Professor I','Assistant Professor II','Assistant Professor III'],
>>>>>>> 74df81e5ad8460ec85a52f90e0b844ebf4e5c555
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