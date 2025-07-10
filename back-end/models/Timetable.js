const mongoose = require('mongoose');

const periodSchema = new mongoose.Schema({
  facultyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Faculty',
    required: true
  },
  courseName: {
    type: String,
    required: true
  },
  courseCode: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['theory', 'practical', 'theory_practical', 'one_credit', 'honors', 'other'],
    required: true
  }
});

const daySchema = new mongoose.Schema({
  periods: {
    type: [periodSchema],
    validate: [
      {
        validator: function(periods) {
          return periods.length <= 7; // Maximum 7 periods per day
        },
        message: 'Cannot exceed 7 periods per day'
      }
    ]
  }
});

const timetableSchema = new mongoose.Schema({
  class: {
    type: String,
    required: true
  },
  semester: {
    type: String,
    required: true
  },
  academicYear: {
    type: String,
    required: true
  },
  days: {
    type: [daySchema],
    validate: [
      {
        validator: function(days) {
          return days.length <= 6; // Maximum 6 days per week
        },
        message: 'Cannot exceed 6 days per week'
      }
    ]
  },
  totalHoursPerWeek: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published'],
    default: 'draft'
  }
}, {
  timestamps: true
});

// Middleware to check faculty conflicts before saving
timetableSchema.pre('save', async function(next) {
  try {
    const Timetable = this.constructor;
    const conflictingTimetables = await Timetable.find({
      _id: { $ne: this._id },
      status: 'published'
    });

    // Check for faculty conflicts
    for (let day = 0; day < this.days.length; day++) {
      for (let period = 0; period < this.days[day].periods.length; period++) {
        const currentFacultyId = this.days[day].periods[period]?.facultyId;
        
        if (currentFacultyId) {
          for (const timetable of conflictingTimetables) {
            if (timetable.days[day]?.periods[period]?.facultyId?.equals(currentFacultyId)) {
              throw new Error(`Faculty conflict detected on day ${day + 1}, period ${period + 1}`);
            }
          }
        }
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Timetable', timetableSchema); 