const GeneratedTimetable = require('../models/GeneratedTimetable');
const ExcelJS = require('exceljs');

// helper to detect faculty conflicts
const hasFacultyConflict = async (newTimetable) => {
  // fetch all existing timetables
  const existing = await GeneratedTimetable.find();
  for (const oldTT of existing) {
    for (let day = 0; day < 6; day++) {
      for (let period = 0; period < 7; period++) {
        const newCell = newTimetable[day]?.[period];
        const oldCell = oldTT.timetable[day]?.[period];
        const newFacs = [newCell?.facultyId, newCell?.additionalFacultyId].filter(Boolean);
        const oldFacs = [oldCell?.facultyId, oldCell?.additionalFacultyId].filter(Boolean);
        if (newFacs.length && oldFacs.length && newFacs.some(nf=>oldFacs.includes(String(nf)))) {
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
    const { conflict, day, period } = await hasFacultyConflict(timetable);
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

// Export timetable to Excel
exports.exportExcel = async (req, res) => {
  try {
    const { id } = req.params;
    const tt = await GeneratedTimetable.findById(id);
    if (!tt) return res.status(404).json({ message: 'Timetable not found' });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Timetable');

    // Header rows
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    ws.addRow(['Day/Period', ...Array.from({length:7},(_,i)=>`Period ${i+1}`)]).font = { bold: true };

    days.forEach((day, dIdx)=>{
      const rowData = [day];
      for(let p=0;p<7;p++){
        const cell = tt.timetable[dIdx]?.[p];
        if(cell){
          rowData.push(`${cell.courseName}\n${cell.courseCode}\nSec ${cell.section}`);
        }else{
          rowData.push('');
        }
      }
      ws.addRow(rowData);
    });

    ws.columns.forEach(col=>{col.alignment={vertical:'middle', horizontal:'center', wrapText:true}; col.width=20;});

    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',`attachment; filename=timetable_${id}.xlsx`);
    await wb.xlsx.write(res);
    res.end();
  }catch(err){
    console.error(err);
    res.status(500).json({ message:'Failed to export Excel'});
  }
}; 