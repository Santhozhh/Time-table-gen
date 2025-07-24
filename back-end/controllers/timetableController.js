const Timetable = require('../models/Timetable');
const Faculty = require('../models/Faculty');

exports.getAllTimetables = async (req, res) => {
  try {
    const timetables = await Timetable.find()
      .populate('days.periods.facultyId', 'name code');
    res.json(timetables);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id)
      .populate('days.periods.facultyId', 'name code');
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    res.json(timetable);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFacultyTimetables = async (req, res) => {
  try {
    const facultyId = req.params.facultyId;
    const timetables = await Timetable.find({
      'days.periods.facultyId': facultyId,
      status: 'published'
    }).populate('days.periods.facultyId', 'name code');
    res.json(timetables);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createTimetable = async (req, res) => {
  try {
    const timetable = new Timetable(req.body);
    const newTimetable = await timetable.save();
    res.status(201).json(newTimetable);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id);
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }

    Object.assign(timetable, req.body);
    const updatedTimetable = await timetable.save();
    res.json(updatedTimetable);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteTimetable = async (req, res) => {
  try {
    const timetable = await Timetable.findById(req.params.id);
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable not found' });
    }

    await timetable.remove();
    res.json({ message: 'Timetable deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.checkFacultyAvailability = async (req, res) => {
  try {
    const { facultyId, day, period } = req.body;
    
    const conflicts = await Timetable.find({
      'days.periods': {
        $elemMatch: {
          facultyId: facultyId
        }
      },
      status: 'published'
    });

    const hasConflict = conflicts.some(timetable => 
      timetable.days[day]?.periods[period]?.facultyId.equals(facultyId)
    );

    res.json({ available: !hasConflict });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 