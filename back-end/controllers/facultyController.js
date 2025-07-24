const Faculty = require('../models/Faculty');

exports.getAllFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.find({ active: true });
    res.json(faculty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }
    res.json(faculty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createFaculty = async (req, res) => {
  const facultyPayload = {
    name: req.body.name,
    grade: req.body.grade,
    specialization: req.body.specialization,
    maxHoursPerWeek: req.body.maxHoursPerWeek,
  };
  if (req.body.code) facultyPayload.code = req.body.code; 

  const faculty = new Faculty(facultyPayload);

  try {
    const newFaculty = await faculty.save();
    res.status(201).json(newFaculty);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    Object.assign(faculty, req.body);
    const updatedFaculty = await faculty.save();
    res.json(updatedFaculty);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteFaculty = async (req, res) => {
  try {
    const facultyId = req.params.id;

    const faculty = await Faculty.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    faculty.active = false;
    await faculty.save();

    const Timetable = require('../models/Timetable');
    const GeneratedTimetable = require('../models/GeneratedTimetable');

    await Timetable.updateMany(
      { 'days.periods.facultyId': facultyId },
      { $pull: { 'days.$[].periods': { facultyId: facultyId } } }
    );

    const affectedGenTTs = await GeneratedTimetable.find({
      $or: [
        { 'timetable': { $elemMatch: { $elemMatch: { facultyId: facultyId } } } },
        { 'timetable': { $elemMatch: { $elemMatch: { additionalFacultyId: facultyId } } } }
      ]
    });

    for (const tt of affectedGenTTs) {
      let modified = false;

      for (let day = 0; day < tt.timetable.length; day++) {
        for (let period = 0; period < tt.timetable[day].length; period++) {
          const slot = tt.timetable[day][period];
          if (!slot) continue;

          const isRemoved = (cell) =>
            cell && (String(cell.facultyId) === facultyId || String(cell.additionalFacultyId) === facultyId);

          if (Array.isArray(slot)) {
            const filtered = slot.filter((cell) => !isRemoved(cell));
            if (filtered.length !== slot.length) {
              modified = true;
              tt.timetable[day][period] = filtered.length ? filtered : null;
            }
          } else if (isRemoved(slot)) {
            modified = true;
            tt.timetable[day][period] = null; 
          }
        }
      }

      if (modified) await tt.save();
    }

    res.json({ message: 'Faculty deleted successfully and timetables updated' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 