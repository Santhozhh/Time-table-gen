import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MdAdd, MdSchedule, MdSchool, MdSave, MdDelete,  MdClose } from 'react-icons/md';
import { MdClass } from 'react-icons/md';
import { generatedTimetableApi } from '../services/api';
import { usePeriods } from '../context/PeriodsContext';

interface TimetableForm {
  courseName: string;
  courseCode: string;
  type: 'theory' | 'practical' | 'theory_practical' | 'one_credit' | 'honors' | 'other';
  hoursPerWeek: number;
  facultyId: string;
  additionalFacultyId?: string;
  section: string;
  year: number;
  id: string;
}
interface Faculty {
  _id: string;
  name: string;
  code: string;
  specialization: string;
  maxHoursPerWeek: number;
  grade?: string; // Added for new faculty selection
}
interface TimetableCell {
  courseName: string;
  courseCode: string;
  facultyId: string;
  additionalFacultyId?: string;
  type: 'theory' | 'practical' | 'theory_practical' | 'one_credit' | 'honors' | 'other';
  section: string;
  year?: number;
  subjectId: string;
}
type TimetableSlot = TimetableCell[];
const days = ['1','2','3','4','5','6'];

const EditTimetable: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [forms, setForms] = useState<TimetableForm[]>([]);
  const [fixedYear,setFixedYear]=useState<number>(1);
  const [fixedSection,setFixedSection]=useState<string>('A');
  // index for timetable navigation (reuse if needed later)
  const { numPeriods: NUM_PERIODS } = usePeriods();
  const emptyMatrix = () => Array(6).fill(null).map(() => Array(NUM_PERIODS).fill(null).map(() => [] as TimetableSlot));
  const [timetable, setTimetable] = useState<TimetableSlot[][]>(emptyMatrix());
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFormIndex, setCurrentFormIndex] = useState(0);

  // Fetch faculty and timetable data
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const facRes = await fetch('http://localhost:5000/api/faculty');
        setFaculty(await facRes.json());
        if (id) {
          const { data } = await generatedTimetableApi.getById(id);
          const genId = () => Math.random().toString(36).slice(2,10);
          const courseList = (data.courses||[]).map((c:any)=> ({...c, id: c.id || c.subjectId || genId()}));
          setForms(courseList);
          if(courseList.length){
             setFixedYear(courseList[0].year||1);
             setFixedSection(courseList[0].section||'A');
          }
          setTimetable(data.timetable || emptyMatrix());
        }
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newForms = [...forms];
    const prevType = newForms[index].type;
    let parsed: any = value;
    if(name==='hoursPerWeek' || name==='year') parsed = parseInt(value,10)||0;
    newForms[index] = { ...newForms[index], [name]: parsed } as TimetableForm;
    setForms(newForms);

    // If type changed from practical-like to theory/other, trim multi-slot allocations
    if(name==='type' && (prevType==='practical' || prevType==='theory_practical') && !['practical','theory_practical'].includes(parsed)){
      const subjId = newForms[index].id;
      setTimetable(prev=> prev.map(day=>{
        let hasFirst=false;
        return day.map(slot=>{
          const filtered = slot.filter(s=> s.subjectId!==subjId) as TimetableSlot;
          if(!hasFirst && slot.some(s=> s.subjectId===subjId)){
            // keep first occurrence in this day
            const first = slot.find(s=> s.subjectId===subjId)!;
            filtered.push(first);
            hasFirst=true;
          }
          return filtered;
        }) as TimetableSlot[];
      }));
    }
  };

  const genId = () => Math.random().toString(36).slice(2,10);
  const addSubject = () => {
    setForms([
      ...forms,
      {
        courseName: '',
        courseCode: '',
        type: 'theory',
        hoursPerWeek: 0,
        facultyId: '',
        additionalFacultyId: '',
        section: fixedSection,
        year: fixedYear,
        id: genId(),
      },
    ]);
  };

  const removeSubject = (idx: number) => {
    const subjId = forms[idx].id;
    // Remove form
    setForms(forms.filter((_, i) => i !== idx));
    // Remove all allocations tied to that subject from timetable
    setTimetable(prev => prev.map(day => day.map(slot => slot.filter(s => s.subjectId !== subjId))));
  };

  const handleUpdate = async () => {
    if (!id) return;
    try {
      const { status } = await generatedTimetableApi.update(id, {
        timetable,
        courses: forms,
      });
      if (status === 200) {
        alert('Timetable updated successfully');
        navigate('/view-student-timetables');
      } else {
        alert('Update failed');
      }
    } catch (err: any) {
      console.error('Update error', err);
      alert(err.response?.data?.message || 'Failed to update');
    }
  };

  // Handle click to allocate / deallocate a period
  const handleCellClick = (dayIdx:number, periodIdx:number)=>{
    const currentForm = forms[currentFormIndex];
    if(!currentForm) return;

    const isPractical = currentForm.type === 'practical' || currentForm.type === 'theory_practical';
    const blockLength = isPractical ? Math.max(1,currentForm.hoursPerWeek) : 1;
    const slotIndices = Array.from({length:blockLength},(_,i)=>periodIdx+i);

    // boundary check
    if(slotIndices[slotIndices.length-1] >= NUM_PERIODS){
      alert(`This subject requires ${blockLength} consecutive periods. Please choose an earlier period.`);
      return;
    }

    const newEntry: TimetableCell = {
      courseName: currentForm.courseName,
      courseCode: currentForm.courseCode,
      facultyId: currentForm.facultyId,
      additionalFacultyId: currentForm.additionalFacultyId,
      type: currentForm.type,
      section: currentForm.section,
      year: currentForm.year,
      subjectId: currentForm.id
    };

    const entryExistsInAll = slotIndices.every(colIdx =>
      timetable[dayIdx][colIdx].some(s => s.subjectId === newEntry.subjectId)
    );

    const newTT = timetable.map((day,rowIdx)=> day.map((slot,colIdx)=>{
      if(rowIdx===dayIdx && slotIndices.includes(colIdx)){
        if(entryExistsInAll){
          return slot.filter(s=> s.subjectId!==newEntry.subjectId);
        }
        // Before adding, ensure weekly hours limit isn't exceeded; only evaluate on first slot.
        if(colIdx === slotIndices[0]){
          const currentHours = timetable.flat(2).filter(c=> c.subjectId===currentForm.id).length;
          const hoursToAdd = slotIndices.length;
          if(currentHours + hoursToAdd > currentForm.hoursPerWeek){
             alert('All hours for this course have already been allocated!');
             return slot;
          }
        }
        // Avoid duplicate entry in slot
        if(slot.some(s=> s.subjectId===newEntry.subjectId)) return slot;
        return [...slot,newEntry];
      }
      return slot;
    }));

    setTimetable(newTT);
  };

  /* ------- Clear all allocations for a subject ------- */
  const clearAllocations = (index:number)=>{
    const subj = forms[index];
    const newTT = timetable.map(day=> day.map(slot=> slot.filter(s=> s.subjectId!==subj.id)));
    setTimetable(newTT);
  };

  // Remove a subject entry across all contiguous slots in the selected day
  const removeEntry = (dayIdx:number, periodIdx:number, entryIdx:number)=>{
    const entry = timetable[dayIdx]?.[periodIdx]?.[entryIdx];
    if(!entry) return;
    const subjId = entry.subjectId;
    setTimetable(prev=> prev.map((day,d)=>{
      if(d!==dayIdx) return day;
      // Remove the subject from every slot of this day (handles merged practical blocks)
      return day.map(slot=> slot.filter(s=> s.subjectId!==subjId));
    }));
  };

  /* ---------- Drag & Drop Helpers ---------- */
  const handleDragStart = (index:number, e:React.DragEvent<HTMLLIElement>)=>{
    e.dataTransfer.setData('subjectIndex', String(index));
  };

  const handleDragOver = (e:React.DragEvent<HTMLTableCellElement>)=>{
    e.preventDefault();
  };

  const handleDrop = (dayIndex:number, periodIndex:number, e:React.DragEvent<HTMLTableCellElement>)=>{
    e.preventDefault();
    const idxStr = e.dataTransfer.getData('subjectIndex');
    if(!idxStr) return;
    const subIdx = parseInt(idxStr,10);
    setCurrentFormIndex(subIdx);
    handleCellClick(dayIndex, periodIndex);
  };

  // Helper to render subject item (shared)
  const renderSubjectItem = (subj: TimetableForm, idx:number) => {
     const allocated = timetable.flat(2).filter(c=> c.subjectId===subj.id).length;
     const fully = allocated >= subj.hoursPerWeek && subj.hoursPerWeek>0;
     let itemCls='subject-item cursor-move ';
     if(idx===currentFormIndex) itemCls+='bg-indigo-50 border-indigo-400 ';
     else if(fully) itemCls+='border-red-400 bg-red-50 ';
     else itemCls+='bg-white ';
     return (
       <li key={idx} className={itemCls.trim()} draggable onDragStart={(e)=>handleDragStart(idx,e)} onClick={()=>setCurrentFormIndex(idx)}>
         <div>
           <p className="font-medium text-gray-800">{subj.courseName}</p>
           <p className="text-sm text-blue-600">{subj.courseCode}</p>
         </div>
         <div className="text-sm text-gray-500 capitalize">{subj.type}</div>
         <div className="text-xs text-gray-500">Hrs {allocated}/{subj.hoursPerWeek}</div>
         <button onClick={(e)=>{e.stopPropagation(); clearAllocations(idx);}} title="Clear allocated periods" className="text-red-500 hover:text-red-700 text-lg"><MdDelete/></button>
       </li>
     );
  };

  if (loading) return <p>Loading...</p>;

  const totalPeriods = 6 * NUM_PERIODS; // total teaching periods
  const allocatedTotal = timetable.flat(2).filter(Boolean).length;
  const freePeriods = totalPeriods - allocatedTotal;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card">
        <div className="card-gradient-header">
          <div className="flex items-center gap-4">
            <div className="icon-container">
              <MdSchedule className="text-3xl text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Edit Timetable</h2>
          </div>
        </div>
        <div className="p-6 space-y-6">
          {/* Simple subject list editing */}
          <h3 className="text-lg font-semibold text-gray-800">Subjects</h3>
          {forms.map((form, idx) => (
            <div key={idx} className="form-section">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  <MdSchool className="text-blue-600" /> Subject {idx + 1}
                </h3>
                <button type="button" onClick={() => removeSubject(idx)} className="btn-danger">
                  <MdDelete className="text-lg" /> Remove
                </button>
              </div>
              <div className="form-container" onClick={()=>setCurrentFormIndex(idx)}>
                <div className="form-group">
                  <label className="form-label">Course Name</label>
                  <input
                    name="courseName"
                    value={form.courseName}
                    onChange={(e) => handleInputChange(idx, e)}
                    className="input-field"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Course Code</label>
                  <input name="courseCode" value={form.courseCode} onChange={(e) => handleInputChange(idx, e)} className="input-field" />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select name="type" value={form.type} onChange={(e)=>handleInputChange(idx,e)} className="input-field">
                    <option value="theory">Theory</option>
                    <option value="practical">Practical</option>
                    <option value="one_credit">One Credit</option>
                    <option value="honors">Honors</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Hours per Week</label>
                  <input type="number" name="hoursPerWeek" min="1" max={freePeriods} value={form.hoursPerWeek} onChange={(e)=>handleInputChange(idx,e)} className="input-field" />
                  <p className="text-xs text-gray-500 mt-1">Free periods available: {freePeriods}</p>
                </div>
                <div className="form-group">
                  <label className="form-label">{form.type==='honors'?'Ordinary Faculty':'Faculty'}</label>
                  <select name="facultyId" value={form.facultyId} onChange={(e) => handleInputChange(idx, e)} className="input-field">
                    <option value="">Select</option>
                    {faculty.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.name} {f.grade?`(${f.grade})`:''}
                      </option>
                    ))}
                  </select>
                </div>
                {(form.type==='practical' || form.type==='theory_practical' || form.type==='honors') && (
                <div className="form-group">
                    <label className="form-label">{form.type==='honors'?'Honors Faculty':'Additional Faculty (Practical)'}</label>
                    <select name="additionalFacultyId" value={form.additionalFacultyId} onChange={(e)=>handleInputChange(idx,e)} className="input-field">
                      <option value="">Select</option>
                      {faculty.map(f=>(<option key={f._id} value={f._id}>{f.name} {f.grade?`(${f.grade})`:''}</option>))}
                  </select>
                </div>
                )}
                {/* Year & Section are fixed for this timetable */}
              </div>
            </div>
          ))}
          <button type="button" onClick={addSubject} className="btn-primary">
            <MdAdd /> Add Subject
          </button>

          {/* Timetable grid */}
          <h3 className="text-lg font-semibold text-gray-800 mt-8 flex items-center gap-2"><MdClass /> Allocate Periods</h3>
          <div className="overflow-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr>
                  <th rowSpan={1} className="table-header align-middle">Day / Period</th>
                  {Array(NUM_PERIODS).fill(null).map((_,i)=>(<th key={i} className="table-header">Period {i+1}</th>))}
                </tr>
              </thead>
              <tbody>
                {days.map((day,dIdx)=>(
                  <tr key={day}>
                    <td className="table-header">{day}</td>
                    {/* Render merged cells */}
                    {(()=>{
                      const cells:JSX.Element[] = [];
                      for(let periodIdx=0; periodIdx<NUM_PERIODS;){
                        const slot = timetable[dIdx]?.[periodIdx] || [];
                        if(slot.length){
                          const sig = slot.map(s=>s.subjectId).sort().join('|');
                          let span = 1;
                          const startIdx = periodIdx; /* capture */
                          while(periodIdx+span < NUM_PERIODS){
                            const nextSlot = timetable[dIdx]?.[periodIdx+span] || [];
                            const nextSig = nextSlot.map(s=>s.subjectId).sort().join('|');
                            if(nextSig === sig && sig){
                              span++;
                            }else break;
                          }
                          cells.push(
                            <td key={startIdx} colSpan={span} className="table-cell cursor-pointer" onClick={()=>handleCellClick(dIdx,startIdx)} onDragOver={handleDragOver} onDrop={(e)=>handleDrop(dIdx,startIdx,e)}>
                              {slot.map((s,idx)=>(
                                <div key={idx} className="space-y-1 relative group">
                                  <button onClick={(e)=>{e.stopPropagation(); removeEntry(dIdx,startIdx,idx);}} className="absolute top-0 right-0 p-0.5 hidden group-hover:block hover:bg-red-100 rounded" title="Remove">
                                    <MdClose className="text-red-600 text-xs" />
                                  </button>
                                  <div className="font-medium text-gray-800 text-xs">{s.courseName}</div>
                                  <div className="text-[10px] text-blue-600">{s.courseCode}</div>
                                </div>
                              ))}
                            </td>
                          );
                          periodIdx += span;
                        }else{
                          const emptyIdx = periodIdx;
                          cells.push(
                            <td key={emptyIdx} className="table-cell cursor-pointer" onClick={()=>handleCellClick(dIdx,emptyIdx)} onDragOver={handleDragOver} onDrop={(e)=>handleDrop(dIdx,emptyIdx,e)} />
                          );
                          periodIdx++;
                        }
                      }
                      return cells;
                    })()}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Subject List */}
          <div className="mt-6">
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Subject List</h3>
              {/* Theory */}
              {forms.some(f=>f.type==='theory') && (
                <div className="mb-6">
                  <h4 className="font-semibold text-gray-700 mb-2">Theory</h4>
              <ul className="space-y-3">
                    {forms.map((subj,idx)=> subj.type==='theory'? renderSubjectItem(subj,idx): null)}
                  </ul>
                </div>) }

              {/* Practical & Others */}
              {forms.some(f=>f.type==='practical') && (
                    <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Practical </h4>
                  <ul className="space-y-3">
                    {forms.map((subj,idx)=> subj.type==='practical' ? renderSubjectItem(subj,idx): null)}
              </ul>
                </div>) }
                {forms.some(f=>f.type==='theory_practical') && (
                    <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Theory With Practical </h4>
                  <ul className="space-y-3">
                    {forms.map((subj,idx)=> subj.type==='theory_practical' ? renderSubjectItem(subj,idx): null)}
              </ul>
                </div>) }
                {forms.some(f=>f.type==='honors') && (
                    <div>
                  <h4 className="font-semibold text-gray-700 mb-2">honors</h4>
                  <ul className="space-y-3">
                    {forms.map((subj,idx)=> subj.type==='honors' ? renderSubjectItem(subj,idx): null)}
              </ul>
                </div>) }
                {forms.some(f=>f.type==='one_credit') && (
                    <div>
                  <h4 className="font-semibold text-gray-700 mb-2">One Credit</h4>
                  <ul className="space-y-3">
                    {forms.map((subj,idx)=> subj.type==='one_credit'? renderSubjectItem(subj,idx): null)}
              </ul>
                </div>) }
                {forms.some(f=>f.type==='other') && (
                    <div>
                  <h4 className="font-semibold text-gray-700 mb-2">Others</h4>
                  <ul className="space-y-3">
                    {forms.map((subj,idx)=> subj.type==='other' ? renderSubjectItem(subj,idx): null)}
              </ul>
                </div>) }
            </div>
          </div>
        </div>
        <div className="p-6 flex justify-end">
          <button type="button" onClick={handleUpdate} className="btn-primary flex items-center gap-2">
            <MdSave /> Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditTimetable; 