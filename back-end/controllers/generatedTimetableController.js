const GeneratedTimetable = require('../models/GeneratedTimetable');
const constants = require('../constants');
const ExcelJS = require('exceljs');

const hasFacultyConflict = async (newTimetable, excludeId = null) => {
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
    if (excludeId && String(oldTT._id) === String(excludeId)) continue; 
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
exports.createGeneratedTimetable = async (req, res) => {
  try {
    const { timetable, courses } = req.body;
    if (!timetable || !courses) {
      return res.status(400).json({ message: 'Missing timetable or courses' });
    }

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

exports.getAllGeneratedTimetables = async (req, res) => {
  try {
    const list = await GeneratedTimetable.find().sort({ createdAt: -1 });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

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
exports.updateGeneratedTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const { timetable, courses } = req.body;

    if (!timetable || !courses) {
      return res.status(400).json({ message: 'Missing timetable or courses' });
    }

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

    ws.addRow([]); 
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

exports.deleteGeneratedTimetable = async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await GeneratedTimetable.findByIdAndDelete(id);
    if (!removed) {
      return res.status(404).json({ message: 'Timetable not found' });
    }
    res.json({ message: 'Timetable deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
}; 

const Faculty = require('../models/Faculty');

// Generate faculty summary Excel
exports.exportFacultySummary = async (req, res) => {
  try {
    const timetables = await GeneratedTimetable.find();
    const facDocs = await Faculty.find();
    const facMap = {};
    facDocs.forEach(f=>{
      facMap[String(f._id)] = {
        name: f.name,
        grade: f.grade,
        code: f.code || '',
        theory: 0,
        lab: 0,
        total: 0,
        theorySubs: [],
        labSubs: []
      };
    });

    // accumulate hours from courses list
    timetables.forEach(tt=>{
      tt.courses.forEach(c=>{
        const hrs = c.hoursPerWeek || 0;
        const type = c.type || 'theory';
        const primary = String(c.facultyId||'');
        const additional = c.additionalFacultyId ? String(c.additionalFacultyId) : null;
        const addHours = (fid)=>{
          if(!facMap[fid]) return;
          if(type==='practical' || type==='theory_practical') facMap[fid].lab += hrs; else facMap[fid].theory += hrs;
          facMap[fid].total += hrs;
          if(type==='practical' || type==='theory_practical') facMap[fid].labSubs.push({name:c.courseName, hrs:hrs});
          else facMap[fid].theorySubs.push({name:c.courseName, hrs:hrs});
        };
        if(primary) addHours(primary);
        if(additional) addHours(additional);
      });
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Faculty Summary');

    // --- College Header ---
    const yearNow = new Date().getFullYear();
    const acadYear = `${yearNow}-${(yearNow+1).toString().slice(-2)}`;

    const fullCols = 12; // we will merge across 12 columns (A–L)
    ws.mergeCells(1,1,1,fullCols);
    ws.getCell('A1').value = 'VELAMMAL COLLEGE OF ENGINEERING AND TECHNOLOGY (MADURAI-9)';
    ws.getCell('A1').alignment = { horizontal:'center'};
    ws.getCell('A1').font = { bold:true, size:14 };

    ws.mergeCells(2,1,2,fullCols);
    ws.getCell('A2').value = '(Autonomous)';
    ws.getCell('A2').alignment = { horizontal:'center'};
    ws.getCell('A2').font = { bold:true, size:12 };

    ws.mergeCells(3,1,3,fullCols);
    ws.getCell('A3').value = 'DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING';
    ws.getCell('A3').alignment = { horizontal:'center'};
    ws.getCell('A3').font = { bold:true, size:12 };

    ws.mergeCells(4,1,4,fullCols);
    ws.getCell('A4').value = `SUBJECT ALLOCATION (ACADEMIC YEAR ${acadYear})`;
    ws.getCell('A4').alignment = { horizontal:'center'};
    ws.getCell('A4').font = { bold:true, size:12 };

    ws.addRow([]); // blank row before table header

    ws.addRow(['S.No','Faculty Name','Grade','Theory 1','Theory 2','Theory 3','Theory 4','Lab 1','Lab 2','Lab 3','Lab 4','Total Hrs']).font={bold:true};
    let sNo=1;
    Object.values(facMap).forEach(f=>{
      const theoryCells = f.theorySubs.slice(0,4).map(t=>`${t.name} – ${t.hrs}`).concat(Array(4).fill('')).slice(0,4);
      const labCells = f.labSubs.slice(0,4).map(l=>`${l.name} – ${l.hrs}`).concat(Array(4).fill('')).slice(0,4);
      ws.addRow([sNo++, f.name, f.grade, ...theoryCells, ...labCells, f.total]);
    });
    ws.columns.forEach(col=>{col.alignment = {vertical:'middle', horizontal:'center', wrapText:true}; col.width=28;});

    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition','attachment; filename=faculty_summary.xlsx');
    await wb.xlsx.write(res);
    res.end();
  }catch(err){
    console.error(err);
    res.status(500).json({ message:'Failed to export summary'});
  }
};

// Export single faculty timetable Excel
exports.exportFacultyTimetable = async (req, res) => {
  try {
    const { facId } = req.params;
    const faculty = await Faculty.findById(facId);
    if(!faculty) return res.status(404).json({ message:'Faculty not found'});

    const timetables = await GeneratedTimetable.find();
    // build matrix 6 x NUM_PERIODS
    const matrix = Array(6).fill(null).map(()=>Array(constants.NUM_PERIODS).fill(null));

    timetables.forEach(tt=>{
      tt.timetable.forEach((dayRow,dIdx)=>{
        dayRow.forEach((slot,pIdx)=>{
          if(matrix[dIdx][pIdx]) return;
          if(!slot) return;
          const entries = Array.isArray(slot)? slot:[slot];
          const match = entries.find(c=>c && (String(c.facultyId)===facId || String(c.additionalFacultyId)===facId));
          if(match) matrix[dIdx][pIdx]=match;
        });
      });
    });

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Timetable');

    // ---- College Header ----
    const yearNow2 = new Date().getFullYear();
    const acadYear2 = `${yearNow2}-${(yearNow2+1).toString().slice(-2)}`;
    const fullCols2 = constants.NUM_PERIODS + 1; // Day column + periods columns

    ws.mergeCells(1,1,1,fullCols2);
    ws.getCell('A1').value = 'VELAMMAL COLLEGE OF ENGINEERING AND TECHNOLOGY (MADURAI-9)';
    ws.getCell('A1').alignment = { horizontal:'center'};
    ws.getCell('A1').font = { bold:true, size:14 };

    ws.mergeCells(2,1,2,fullCols2);
    ws.getCell('A2').value = '(Autonomous)';
    ws.getCell('A2').alignment = { horizontal:'center'};
    ws.getCell('A2').font = { bold:true, size:12 };

    ws.mergeCells(3,1,3,fullCols2);
    ws.getCell('A3').value = 'DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING';
    ws.getCell('A3').alignment = { horizontal:'center'};
    ws.getCell('A3').font = { bold:true, size:12 };

    ws.mergeCells(4,1,4,fullCols2);
    ws.getCell('A4').value = `FACULTY TIMETABLE (ACADEMIC YEAR ${acadYear2})`;
    ws.getCell('A4').alignment = { horizontal:'center'};
    ws.getCell('A4').font = { bold:true, size:12 };

    ws.mergeCells(5,1,5,fullCols2);
    ws.getCell('A5').value = `${faculty.name.toUpperCase()} - ${faculty.grade}`;
    ws.getCell('A5').alignment = { horizontal:'center'};
    ws.getCell('A5').font = { bold:true, size:12 };

    ws.addRow([]);

    // after headers, row number adjustment handled automatically by addRow
    ws.addRow(['Day/Period', ...Array.from({length: constants.NUM_PERIODS},(_,i)=>`Period ${i+1}`)]).font={bold:true};

    const days=['1','2','3','4','5','6'];
    days.forEach((d,idx)=>{
      const row=[d];
      for(let p=0;p<constants.NUM_PERIODS;p++){
        const cell=matrix[idx][p];
        if(cell){
          row.push(`${cell.courseCode}\n${cell.courseName}`);
        }else row.push('');
      }
      ws.addRow(row);
    });

    // Blank row and footer with faculty name centered
    ws.addRow([]);
    const footerRowNum = ws.lastRow.number + 1;
    const endCol = constants.NUM_PERIODS + 1; // Day column + periods
    ws.mergeCells(footerRowNum, 1, footerRowNum, endCol);
    ws.getCell(`A${footerRowNum}`).value = faculty.name.toUpperCase();
    ws.getCell(`A${footerRowNum}`).alignment = { horizontal: 'center' };
    ws.getCell(`A${footerRowNum}`).font = { bold: true };

    ws.columns.forEach(col=>{col.alignment={vertical:'middle', horizontal:'center', wrapText:true}; col.width=22;});

    res.setHeader('Content-Type','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition',`attachment; filename=${faculty.name.replace(/\s+/g,'_')}_timetable.xlsx`);
    await wb.xlsx.write(res);
    res.end();
  }catch(err){
    console.error(err);
    res.status(500).json({ message:'Failed to export faculty timetable'});
  }
}; 