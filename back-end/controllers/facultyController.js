const Faculty = require('../models/Faculty');

// Get all faculty members
exports.getAllFaculty = async (req, res) => {
  try {
    const faculty = await Faculty.find({ active: true });
    res.json(faculty);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single faculty member
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

// Create a new faculty mem ber
exports.createFaculty = async (req, res) => {
  const facultyPayload = {
    name: req.body.name,
    grade: req.body.grade,
    specialization: req.body.specialization,
    maxHoursPerWeek: req.body.maxHoursPerWeek,
  };
  if (req.body.code) facultyPayload.code = req.body.code; // include only if provided

  const faculty = new Faculty(facultyPayload);

  try {
    const newFaculty = await faculty.save();
    res.status(201).json(newFaculty);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update a faculty member
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

// Delete a faculty member (soft delete)
exports.deleteFaculty = async (req, res) => {
  try {
    const facultyId = req.params.id;

    const faculty = await Faculty.findById(facultyId);
    if (!faculty) {
      return res.status(404).json({ message: 'Faculty not found' });
    }

    // Soft-delete – mark as inactive
    faculty.active = false;
    await faculty.save();

    /* ------------------------------------------------------------------
       Cascade update: Remove the faculty from all timetables so that the
       corresponding periods become free for allocation.
    ------------------------------------------------------------------ */
    const Timetable = require('../models/Timetable');
    const GeneratedTimetable = require('../models/GeneratedTimetable');

    // 1) Remove the faculty from classic Timetable documents
    //    Any period that references the faculty will be removed from the
    //    day's periods array, effectively freeing the slot.
    await Timetable.updateMany(
      { 'days.periods.facultyId': facultyId },
      { $pull: { 'days.$[].periods': { facultyId: facultyId } } }
    );

    // 2) Remove the faculty from GeneratedTimetable matrices
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

          // Helper to compare ids as strings
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
            tt.timetable[day][period] = null; // free the period
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