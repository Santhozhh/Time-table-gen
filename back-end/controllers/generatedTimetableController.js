const GeneratedTimetable = require('../models/GeneratedTimetable');
const constants = require('../constants');
const ExcelJS = require('exceljs');

// helper to detect faculty conflicts. Optionally exclude a timetable (when updating)
const hasFacultyConflict = async (newTimetable, excludeId = null) => {
  // fetch all existing timetables
  const existing = await GeneratedTimetable.find();
  const extractFacs = (slot) => {
    if (!slot) return [];
    const entries = Array.isArray(slot) ? slot : [slot];
    const facs = [];
    entries.forEach((c)=>{
      if (c && c.facultyId) facs.push(String(c.facultyId));
      if (c && c.additionalFacultyId) facs.push(String(c.additionalFacultyId));
    });
    return facs;
  };

  for (const oldTT of existing) {
    if (excludeId && String(oldTT._id) === String(excludeId)) continue; // skip comparing with itself
    for (let day = 0; day < 6; day++) {
      for (let period = 0; period < constants.NUM_PERIODS; period++) {
        const newSlot = newTimetable[day]?.[period];
        const oldSlot = oldTT.timetable[day]?.[period];
        const newFacs = extractFacs(newSlot);
        const oldFacs = extractFacs(oldSlot);
        if (newFacs.length && oldFacs.length && newFacs.some(nf=>oldFacs.includes(nf))) {
          return { conflict: true, day, period };
        }
      }
    }
  }
  return { conflict: false };
};
// Create new generated timetable
exports.createGeneratedTimetable = async (req, res) => {
  try {
    const { timetable, courses } = req.body;
    if (!timetable || !courses) {
      return res.status(400).json({ message: 'Missing timetable or courses' });
    }

    // Conflict detection
    const { conflict, day, period } = await hasFacultyConflict(timetable, null);
    if (conflict) {
      return res.status(409).json({ message: `Faculty conflict detected on day ${day + 1}, period ${period + 1}` });
    }

    const newGen = new GeneratedTimetable({ timetable, courses });
    const saved = await newGen.save();
    res.status(201).json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get all generated timetables (latest first)
exports.getAllGeneratedTimetables = async (req, res) => {
  try {
    const list = await GeneratedTimetable.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get single generated timetable by ID
exports.getGeneratedTimetableById = async (req, res) => {
  try {
    const { id } = req.params;
    const tt = await GeneratedTimetable.findById(id);
    if (!tt) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    res.json(tt);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update an existing generated timetable
exports.updateGeneratedTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const { timetable, courses } = req.body;

    // Validate input
    if (!timetable || !courses) {
      return res.status(400).json({ message: 'Missing timetable or courses' });
    }

    // Optional: conflict detection (skip conflict check with same doc)
    const { conflict, day, period } = await hasFacultyConflict(timetable, id);
    if (conflict) {
      return res.status(409).json({ message: `Faculty conflict detected on day ${day + 1}, period ${period + 1}` });
    }

    const updated = await GeneratedTimetable.findByIdAndUpdate(
      id,
      { timetable, courses },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: 'Timetable not found' });
    }

    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Export timetable to Excel
exports.exportExcel = async (req, res) => {
  try {
    const { id } = req.params;
    const tt = await GeneratedTimetable.findById(id);
    if (!tt) return res.status(404).json({ message: 'Timetable not found' });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Timetable');

    // Header rows
    const days = ['1','2','3','4','5','6'];
    ws.addRow(['Day/Period', ...Array.from({length: constants.NUM_PERIODS},(_,i)=>`Period ${i+1}`)]).font = { bold: true };

    days.forEach((day, dIdx)=>{
      const rowData = [day];
      for(let p=0;p<constants.NUM_PERIODS;p++){
        const slot = tt.timetable[dIdx]?.[p];
        if(slot){
          const entries = Array.isArray(slot) ? slot : [slot];
          const cellText = entries.map(c=>`${c.courseName}\n${c.courseCode}\nSec ${c.year || ''}${c.section}`).join('\n---\n');
          rowData.push(cellText);
        }else{
          rowData.push('');
        }
      }
      ws.addRow(rowData);
    });

    ws.columns.forEach(col=>{col.alignment={vertical:'middle', horizontal:'center', wrapText:true}; col.width=20;});

    /* ---------- Course List Section ---------- */
    ws.addRow([]); // empty row

    // prepare faculty name lookup
    const Faculty = require('../models/Faculty');
    const facIds = new Set();
    tt.courses.forEach(c=>{
      if(c.facultyId) facIds.add(String(c.facultyId));
      if(c.additionalFacultyId) facIds.add(String(c.additionalFacultyId));
    });
    const facDocs = await Faculty.find({ _id: { $in: Array.from(facIds) } }).lean();
    const facMap = Object.fromEntries(facDocs.map(f=>[String(f._id), f.name]));

    const groups = {
      theory: 'Theory Courses',
      honors: 'Theory Courses (Honors)',
      practical: 'Practical Courses',
      other: 'Other',
    };

    let sNo = 1;
    Object.entries(groups).forEach(([key,label])=>{
      const list = tt.courses.filter(c=>{
        if(key==='other') return !['theory','honors','practical'].includes(c.type);
        if(key==='honors') return c.type==='honors';
        return c.type===key;
      });
      if(!list.length) return;
      ws.addRow([ '', '', label ]).font={bold:true};
      list.forEach(crs=>{
        const primaryFac = facMap[crs.facultyId] || crs.facultyId || '';
        const hrs = crs.hoursPerWeek || '';
        ws.addRow([sNo++, crs.courseCode, crs.courseName, primaryFac, hrs, (crs.type||'').toUpperCase()]);
      });
    });

    // Determine class year & section for filename if available
    let fileSuffix = id;
    const firstCourse = tt.courses.find(c=>c.year && c.section);
    if(firstCourse){
      fileSuffix = `Class_${firstCourse.year}${firstCourse.section}`;
    }

    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',`attachment; filename=${fileSuffix}_timetable.xlsx`);
    await wb.xlsx.write(res);
    res.end();
  }catch(err){
    console.error(err);
    res.status(500).json({ message:'Failed to export Excel'});
  }
}; 