import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MdAdd, MdSchedule, MdSchool,  MdPlayArrow, MdSave, MdDelete, MdClose, MdEdit, MdChevronLeft } from 'react-icons/md';
import { generatedTimetableApi } from '../services/api';
import { usePeriods } from '../context/PeriodsContext';
import Select from 'react-select';
import { usePersistedState } from '../hooks/usePersistedState';

interface TimetableForm {
  courseName: string;
  courseCode: string;
  type: 'theory' | 'practical' | 'theory_practical' | 'one_credit' | 'honors' | 'other' | 'placement' | 'project Work';
  hoursPerWeek: number;
  facultyId: string;
  additionalFacultyId?: string;
  section: string;
  year: number; // 1 – 4
  id: string; // unique identifier for tracking
}

interface Faculty {
  _id: string;
  name: string;
  code: string;
  specialization: string;
  maxHoursPerWeek: number;
  grade?: string; // Added grade property
}

interface TimetableCell {
  courseName: string;
  courseCode: string;
  facultyId: string;
  additionalFacultyId?: string;
  type: 'theory' | 'practical' | 'theory_practical' | 'one_credit' | 'honors' | 'other'| 'placement' | 'project Work';
  section: string;
  year?: number; // optional for backward compatibility
  subjectId: string; // link back to form
}

type TimetableSlot = TimetableCell[]; // NEW – allows multiple entries per period

const MakeTimetable: React.FC = () => {
  const [searchParams]=useSearchParams();
  const defaultYear=parseInt(searchParams.get('year')||'1',10);
  const defaultSection=(searchParams.get('section')||'A').toUpperCase();

  const classKey = `makeTT_${defaultYear}${defaultSection}`;
  const genId = () => Math.random().toString(36).slice(2,10);
  const [forms, setForms] = usePersistedState<TimetableForm[]>(`${classKey}_forms`, [{
    courseName: '',
    courseCode: '',
    type: 'theory',
    hoursPerWeek: 0,
    facultyId: '',
    additionalFacultyId: '',
    section: defaultSection as any,
    year: defaultYear,
    id: genId()
  }]);

  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const { numPeriods: NUM_PERIODS } = usePeriods();
  const emptyMatrix = () => Array(6).fill(null).map(() => Array(NUM_PERIODS).fill(null).map(()=>[] as TimetableSlot));
  const [timetable, setTimetable] = usePersistedState<TimetableSlot[][]>(`${classKey}_matrix`, emptyMatrix());
  const [showTimetable, setShowTimetable] = usePersistedState<boolean>(`${classKey}_show`, false);
  const [currentFormIndex, setCurrentFormIndex] = useState(0);
  const [unavailable, setUnavailable] = useState<(TimetableCell | null)[][]>(Array(6).fill(null).map(()=>Array(NUM_PERIODS).fill(null)));
  // State for editing a single cell's faculty
  const [editInfo, setEditInfo] = useState<{day:number; period:number; entry:number}|null>(null);
  const [editFacultyId, setEditFacultyId] = useState<string>('');
  const [editAdditionalId, setEditAdditionalId] = useState<string>('');

  // Find other allocations of a faculty in current timetable (excluding current editing cell)
  const findAllocations = (facId:string)=>{
    if(!facId) return [] as {day:number;period:number}[];
    const result: {day:number;period:number}[] = [];
    timetable.forEach((dayRow,d)=>{
      dayRow.forEach((slot,p)=>{
        const entries = Array.isArray(slot)? slot : [slot as any];
        entries.forEach(ent=>{
          if(ent && (ent.facultyId===facId || ent.additionalFacultyId===facId)){
            if(!(editInfo && editInfo.day===d && editInfo.period===p)){
              result.push({day:d, period:p});
            }
          }
        });
      });
    });
    return result;
  };

  // compute unavailable slots for faculty
  const computeUnavailable = async (facultyId:string)=>{
    if(!facultyId) { setUnavailable(Array(6).fill(null).map(()=>Array(NUM_PERIODS).fill(null))); return; }
    try{
      const { data } = await generatedTimetableApi.getAll();
      const matrix:(TimetableCell|null)[][] = Array(6).fill(null).map(()=>Array(NUM_PERIODS).fill(null));
      data.forEach((tt:any)=>{
        tt.timetable.forEach((dayRow:any, dIdx:number)=>{
          dayRow.forEach((cell:any, pIdx:number)=>{
            const entries:Array<any> = Array.isArray(cell) ? cell : cell ? [cell] : [];
            const found = entries.find((c)=>c.facultyId===facultyId || c.additionalFacultyId===facultyId);
            if(found){
              matrix[dIdx][pIdx]=found as TimetableCell;
            }
          });
        });
      });
      setUnavailable(matrix);
    }catch(err){console.error('unavailable calc err',err);}
  };

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/faculty');
        const data = await response.json();
        setFaculty(data);
      } catch (error) {
        console.error('Error fetching faculty:', error);
      }
    };
    fetchFaculty();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setShowTimetable(true);
  };

  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const newForms = [...forms];
    let parsed: any = value;
    // Convert numeric fields to numbers to maintain consistent types
    if (name === 'year' || name === 'hoursPerWeek') {
      parsed = parseInt(value, 10) || 0;
    }
    const prevType = newForms[index].type;
    newForms[index] = {
      ...newForms[index],
      [name]: parsed
    };
    // if updating year/section of first subject propagate to others
    if(index===0 && (name==='year' || name==='section')){
      for(let i=1;i<newForms.length;i++){
        newForms[i] = { ...newForms[i], [name]: parsed } as TimetableForm;
      }
    }
    setForms(newForms);
    if(name==='type' && (prevType==='practical' || prevType==='theory_practical') && !['practical','theory_practical'].includes(parsed)){
      const subjId = newForms[index].id;
      setTimetable(prev=> prev.map(day=>{
        let hasFirst=false;
        return day.map(slot=>{
          const filtered = slot.filter(s=> s.subjectId!==subjId) as TimetableSlot;
          if(!hasFirst && slot.some(s=> s.subjectId===subjId)){
            const first = slot.find(s=> s.subjectId===subjId)!;
            filtered.push(first);
            hasFirst = true;
          }
          return filtered;
        }) as TimetableSlot[];
      }));
    }
    if(index===currentFormIndex && (e.target.name==='facultyId')){
      computeUnavailable(e.target.value);
    }
  };

  // when currentFormIndex changes update unavailable for that faculty
  useEffect(()=>{
    const facId = forms[currentFormIndex]?.facultyId;
    computeUnavailable(facId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[currentFormIndex]);

  const addNewSubject = () => {
    const base = forms[0] || {year:3,section:'A'} as any;
    setForms([...forms, {
      courseName: '',
      courseCode: '',
      type: 'theory',
      hoursPerWeek: 0,
      facultyId: '',
      additionalFacultyId: '',
      section: base.section,
      year: base.year,
      id: genId()
    }]);
  };

  const removeSubject = (index: number) => {
    const subjId = forms[index].id;
    if (forms.length > 1) {
      const newForms = forms.filter((_, i) => i !== index);
      setForms(newForms);
      if (currentFormIndex >= index && currentFormIndex > 0) {
        setCurrentFormIndex(currentFormIndex - 1);
      }
    }
    // clear allocations for this subject
    setTimetable(prev=> prev.map(day=>day.map(slot=> slot.filter(s=> s.subjectId!==subjId))));
  };

  /* -------- Persist state to sessionStorage -------- */
  // Load saved draft on mount
  useEffect(()=>{
    const saved = sessionStorage.getItem(`${classKey}_draft`);
    if(saved){
      try{
        const obj = JSON.parse(saved);
        if(obj.ts && Date.now() - obj.ts < 60_000){
          if(Array.isArray(obj.forms)) setForms(obj.forms);
          if(Array.isArray(obj.timetable)) setTimetable(obj.timetable);
        }else{
          sessionStorage.removeItem(`${classKey}_draft`);
        }
      }catch(e){/* ignore */}
    }
  },[]);

  // Save on change
  useEffect(()=>{
    sessionStorage.setItem(`${classKey}_draft`, JSON.stringify({ts: Date.now(), forms, timetable}));
  },[forms, timetable]);

  const handleCellClick = (dayIndex: number, periodIndex: number) => {
    const currentForm = forms[currentFormIndex];
    if (!currentForm) return;

    // Determine required contiguous block length
    const isPractical = currentForm.type === 'practical' || currentForm.type === 'theory_practical';
    const blockLength = isPractical ? Math.max(1, currentForm.hoursPerWeek) : 1;

    // Build indices for contiguous allocation
    const slotIndices = Array.from({ length: blockLength }, (_, i) => periodIndex + i);

    // Boundary check – ensure block fits within the day
    if (slotIndices[slotIndices.length - 1] >= NUM_PERIODS) {
      alert(`This subject requires ${blockLength} consecutive periods. Please choose an earlier period.`);
      return;
    }

    // Check faculty availability for all required slots
    for (const pIdx of slotIndices) {
      if (unavailable[dayIndex][pIdx]) {
        alert('Faculty already allocated in another class at this time');
        return;
      }
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

    // Helper to decide if the entry already exists in ALL required slots
    const entryExistsInAll = slotIndices.every(pIdx =>
      timetable[dayIndex][pIdx].some(s =>
        s.subjectId === newEntry.subjectId
      )
    );

    const newTimetable = timetable.map((day, dIdx) =>
      day.map((slot, pIdx) => {
        if (dIdx === dayIndex && slotIndices.includes(pIdx)) {
          // REMOVE: If entry present in all required slots and we click again, remove it from each.
          if (entryExistsInAll) {
            const filtered = slot.filter(s => !(s.subjectId === newEntry.subjectId));
            return filtered;
          }

          // ADD: Ensure hours limit not exceeded before adding to first slot only (since we add to blocks below)
          if (pIdx === slotIndices[0]) {
            const currentHours = timetable.flat(2).filter(cell => cell.subjectId===currentForm.id).length;
            const hoursToAdd = slotIndices.length; // 1 or more
            if (currentHours + hoursToAdd > currentForm.hoursPerWeek) {
            alert('All hours for this course have been allocated!');
            return slot;
            }
          }

          // Avoid duplicate entries in the same slot
          if (slot.some(s=> s.subjectId===newEntry.subjectId)) return slot;
          return [...slot, newEntry];
        }
        return slot;
      })
    );

    setTimetable(newTimetable);
  };

  /* ------- Clear all allocations for a subject ------- */
  const clearAllocations = (index:number)=>{
    const subj = forms[index];
    const newTT = timetable.map(day=> day.map(slot=> slot.filter(s=> s.subjectId!==subj.id)));
    setTimetable(newTT);
  };

  /* -------------------- Drag & Drop -------------------- */
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
    // use click logic reuse
    handleCellClick(dayIndex, periodIndex);
  };

  const handleGenerate = async () => {
    try {
      const { status, data } = await generatedTimetableApi.create({
        timetable,
        courses: forms
      });

      if (status === 201 || status === 200) {
        alert('Timetable generated and saved successfully!');
        // Clear persisted state after successful save
        localStorage.removeItem(`${classKey}_forms`);
        localStorage.removeItem(`${classKey}_matrix`);
        localStorage.removeItem(`${classKey}_show`);
        navigate('/view-student-timetables');
      } else if (status === 409) {
        alert(data.message || 'Faculty conflict detected!');
      } else {
        alert('Failed to generate timetable. Please try again.');
      }
    } catch (error) {
      console.error('Error generating timetable:', error);
      alert('Failed to generate timetable. Please try again.');
    }
  };

  const navigate = useNavigate();

  // Remove single entry from a slot
  const removeEntry = (dayIdx:number, periodIdx:number, entryIdx:number)=>{
    const entry = timetable[dayIdx]?.[periodIdx]?.[entryIdx];
    if(!entry) return;
    const subjId = entry.subjectId;
    setTimetable(prev=> prev.map((day,d)=>{
      if(d!==dayIdx) return day;
      return day.map(slot=> slot.filter(s=> s.subjectId!==subjId));
    }));
  };

  // Helper to render a single subject item (shared by grouped lists)
  const renderSubjectItem = (subj: TimetableForm, idx: number) => {
    // Guard: ensure subject matches requested category will be handled by caller
    const allocated = timetable.flat(2).filter(c=> c.subjectId===subj.id).length;
    const fully = allocated >= subj.hoursPerWeek && subj.hoursPerWeek>0;
    let itemCls = 'subject-item cursor-move ';
    if(idx===currentFormIndex) itemCls += 'bg-indigo-50 border-indigo-400 ';
    else if(fully) itemCls += 'border-red-400 bg-red-50 ';
    else itemCls += 'bg-white ';
    return (
      <li
        key={idx}
        className={itemCls.trim()}
        draggable
        onDragStart={(e)=>handleDragStart(idx,e)}
        onClick={()=>setCurrentFormIndex(idx)}
      >
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

  return (
    <div className="space-y-6 animate-fade-in">
      {!showTimetable ? (
        <div className="card">
          <div className="card-gradient-header">
            <div className="flex items-center gap-4">
              <button onClick={()=>navigate('/')} className="p-1 rounded hover:bg-white/20" title="Back to Home">
                <MdChevronLeft className="text-3xl text-white" />
              </button>
              <div className="icon-container">
                <MdSchedule className="text-3xl text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Create New Timetable</h2>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {forms.map((form, index) => (
              <div key={index} className="form-section">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <MdSchool className="text-blue-600 text-xl" />
                    Subject {index + 1}
                  </h3>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => removeSubject(index)}
                      className="btn-danger"
                    >
                      <MdDelete className="text-lg" />
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="form-container">
                  <div className="form-group">
                    <label className="form-label">Course Name</label>
                    <input
                      type="text"
                      name="courseName"
                      value={form.courseName}
                      onChange={(e) => handleInputChange(index, e)}
                      required
                      placeholder="Enter course name"
                      className="input-field"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Course Code</label>
                    <input
                      type="text"
                      name="courseCode"
                      value={form.courseCode}
                      onChange={(e) => handleInputChange(index, e)}
                      required
                      placeholder="Enter course code"
                      className="input-field"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Type</label>
                    <select
                      name="type"
                      value={form.type}
                      onChange={(e) => handleInputChange(index, e)}
                      required
                      className="input-field"
                    >
                      <option value="theory">Theory</option>
                      <option value="practical">Practical</option>
                      <option value="one_credit">One Credit Course</option>
                      <option value="honors">Honors</option>
                      <option value="placement">Placement</option>
                      <option value="project Work">Project Work</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Hours per Week</label>
                    <input
                      type="number"
                      name="hoursPerWeek"
                      value={form.hoursPerWeek}
                      onChange={(e) => handleInputChange(index, e)}
                      min="1"
                      max={6 * NUM_PERIODS}
                      required
                      placeholder="Enter hours"
                      className="input-field"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{form.type==='honors' ? 'Ordinary Faculty' : 'Faculty'}</label>
                    <Select
                      name="facultyId"
                      value={faculty.find(f => f._id === form.facultyId) ? { value: form.facultyId, label: faculty.find(f => f._id === form.facultyId)?.name } : null}
                      onChange={option => {
                        const value = option ? option.value : '';
                        setForms(prev => {
                          const newForms = [...prev];
                          newForms[index] = { ...newForms[index], facultyId: value };
                          return newForms;
                        });
                        if(index === currentFormIndex) {
                          computeUnavailable(value);
                        }
                      }}
                      options={faculty.map(f => ({ value: f._id, label: `${f.name}${f.grade ? ` (${f.grade})` : ''}` }))}
                      classNamePrefix="react-select"
                      isClearable
                      placeholder="Select Faculty..."
                    />
                  </div>

                  {(form.type==='practical' || form.type==='theory_practical' || form.type==='honors') && (
                    <div className="form-group">
                      <label className="form-label">{form.type==='honors' ? 'Honors Faculty' : 'Additional Faculty (Practical)'}</label>
                      <Select
                        name="additionalFacultyId"
                        value={faculty.find(f => f._id === form.additionalFacultyId) ? { value: form.additionalFacultyId, label: faculty.find(f => f._id === form.additionalFacultyId)?.name } : null}
                        onChange={option => {
                          const value = option ? option.value : '';
                          setForms(prev => {
                            const newForms = [...prev];
                            newForms[index] = { ...newForms[index], additionalFacultyId: value };
                            return newForms;
                          });
                        }}
                        options={faculty.map(f => ({ value: f._id, label: `${f.name}${f.grade ? ` (${f.grade})` : ''}` }))}
                        classNamePrefix="react-select"
                        isClearable
                        placeholder="Select Faculty..."
                      />
                    </div>
                  )}

                  {index===0 && (
                  <>
                  <div className="form-group">
                    <label className="form-label">Year</label>
                    <select name="year" value={form.year} onChange={(e)=>handleInputChange(index,e)} className="input-field">
                      {[1,2,3,4].map(y=>(<option key={y} value={y}>{y}</option>))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Section</label>
                    <select name="section" value={form.section} onChange={(e)=>handleInputChange(index,e)} className="input-field">
                      {['A','B','C'].map(sec=>(<option key={sec} value={sec}>{sec}</option>))}
                    </select>
                  </div>
                  </>) }
                </div>
              </div>
            ))}

            <div className="flex gap-4 justify-between mt-6">
              <button
                type="button"
                onClick={addNewSubject}
                className="btn-primary"
              >
                <MdAdd className="text-xl" />
                Add Subject
              </button>

              <button
                type="submit"
                className="btn-primary"
              >
                <MdPlayArrow className="text-xl" />
                Continue
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="card">
          <div className="card-gradient-header">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <button onClick={()=>setShowTimetable(false)} className="p-1 rounded hover:bg-white/20" title="Back to Form">
                  <MdChevronLeft className="text-2xl text-white" />
                </button>
                <div className="flex items-center gap-4">
                  <div className="icon-container">
                    <MdSchedule className="text-3xl text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Create Timetable</h2>
                </div>
              </div>
              <button
                onClick={handleGenerate}
                className="btn-secondary bg-white/90 hover:bg-white"
              >
                <MdSave className="text-xl" />
                Generate Timetable
              </button>
            </div>
          </div>

          <div className="p-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="table-header align-middle">Period <br/>/<br/>Day Order</th>
                  {Array(NUM_PERIODS).fill(null).map((_,i)=>(
                    <th key={i} className="table-header">Period {i+1}</th>
                  ))}
                </tr>
                {/* Optional second header row removed for simplicity when periods are dynamic */}
              </thead>
              <tbody>
                {['I', 'II', 'III', 'IV', 'V', 'VI'].map((day, dayIndex) => (
                  <tr key={day}>
                    <td className="table-header">{day}</td>
                    {/* Render cells with merging (practicals) */}
                    {(() => {
                      const cells: JSX.Element[] = [];
                      let periodIndex = 0;
                      while (periodIndex < NUM_PERIODS) {
                        const slot = timetable[dayIndex][periodIndex];
                        const isUnavailable = unavailable[dayIndex][periodIndex];

                        if (slot.length) {
                          const practicalTypes = ['practical','theory_practical'];
                          const isMergeable = slot.every(s=> practicalTypes.includes(s.type));
                          // create signature using subjectIds (assuming same subject repeated)
                          const sig = slot.map(s => s.subjectId).sort().join('|');
                          let span = 1;
                          const startIdx = periodIndex; /* capture start index */
                          if(isMergeable){
                            while (periodIndex + span < NUM_PERIODS) {
                              const nextSlot = timetable[dayIndex][periodIndex + span];
                              const nextSig = nextSlot.map(s => s.subjectId).sort().join('|');
                              const nextMergeable = nextSlot.every(s=> practicalTypes.includes(s.type));
                              if (nextMergeable && nextSig === sig && sig) {
                                span++;
                              } else break;
                            }
                          }
                          cells.push(
                            <td key={startIdx}
                                colSpan={span}
                                onClick={() => handleCellClick(dayIndex, startIdx)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(dayIndex, startIdx, e)}
                                className={`table-cell-interactive bg-blue-50/50`}
                            >
                              <div className="space-y-1">
                                {slot.map((sub, idx) => (
                                  <div key={idx} className="border-b last:border-none pb-1 mb-1 last:pb-0 last:mb-0 relative group">
                                    <button onClick={(e) => { e.stopPropagation(); removeEntry(dayIndex, startIdx, idx); }} className="absolute top-0 right-0 p-0.5 rounded hover:bg-red-100 hidden group-hover:block" title="Remove">
                                      <MdClose className="text-red-600 text-xs" />
                                    </button>
                                    <div className="font-medium text-gray-800">{sub.courseName}</div>
                                    <div className="text-sm text-[#4169E1]">{sub.courseCode}</div>
                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                      {[sub.facultyId, sub.additionalFacultyId].filter(Boolean).map(id => faculty.find(f => f._id === id)?.name).filter(Boolean).join(', ')} - Sec {sub.year}{sub.section}
                                      <button onClick={(e)=>{e.stopPropagation(); setEditInfo({day:dayIndex, period:startIdx, entry:idx}); setEditFacultyId(sub.facultyId||''); setEditAdditionalId(sub.additionalFacultyId||'');}} title="Edit faculty" className="text-blue-500 hover:text-blue-700"><MdEdit/></button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </td>
                          );
                          periodIndex += span;
                        } else {
                          const emptyIdx = periodIndex; // capture before increment
                          cells.push(
                            <td key={emptyIdx}
                                onClick={() => handleCellClick(dayIndex, emptyIdx)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(dayIndex, emptyIdx, e)}
                                className={`table-cell-interactive ${isUnavailable ? 'bg-red-50/60 cursor-not-allowed' : 'bg-white'}`}
                            >
                              {isUnavailable && (
                                <div className="space-y-1 opacity-70 text-red-700">
                                  <div className="font-medium">{unavailable[dayIndex][emptyIdx]?.courseName}</div>
                                  <div className="text-sm">{unavailable[dayIndex][emptyIdx]?.courseCode}</div>
                                  <div className="text-xs">Year {unavailable[dayIndex][emptyIdx]?.year} – Sec {unavailable[dayIndex][emptyIdx]?.section}</div>
                                </div>
                              )}
                            </td>
                          );
                          periodIndex++;
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

              {/* Theory Subjects */}
              {forms.some(f=>f.type==='theory') && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-2">Theory</h4>
              <ul className="space-y-3">
                 {forms.map((subj, idx)=> subj.type==='theory' ? renderSubjectItem(subj,idx) : null)}
                </ul>
              </div>)}

              {/* Practical & Others */}
              {forms.some(f=>f.type==='practical') && (
                    <div>
                <h4 className="font-semibold text-gray-700 mb-2">Practical </h4>
                <ul className="space-y-3">
                 {forms.map((subj, idx)=> subj.type==='practical' ? renderSubjectItem(subj,idx) : null)}
              </ul>
              </div>)}
                {forms.some(f=>f.type==='theory_practical') && (
                  <div>
                    <h4 className='font-semibold text-gray-700 mb-2'>Theory with Practicals</h4>
                    <ul className='space-y-3'>
                      {forms.map((subj,idx)=>subj.type==='theory_practical' ? renderSubjectItem(subj,idx):null)}
                    </ul>
                    </div>
                )}
                 {forms.some(f=>f.type==='placement') && (
                  <div>
                    <h4 className='font-semibold text-gray-700 mb-2'>placement</h4>
                    <ul className='space-y-3'>
                      {forms.map((subj,idx)=>subj.type==='placement' ? renderSubjectItem(subj,idx):null)}
                    </ul>
                    </div>
                )}
                 {forms.some(f=>f.type==='project Work') && (
                  <div>
                    <h4 className='font-semibold text-gray-700 mb-2'>project work</h4>
                    <ul className='space-y-3'>
                      {forms.map((subj,idx)=>subj.type==='project Work' ? renderSubjectItem(subj,idx):null)}
                    </ul>
                    </div>
                )}
                {forms.some(f=>f.type==='other') && (
                  <div>
                    <h4 className='font-semibold text-gray-700 mb-2'>others</h4>
                    <ul className='space-y-3'>
                      {forms.map((subj,idx)=>subj.type==='other' ? renderSubjectItem(subj,idx):null)}
                    </ul>
                    </div>
                )}
                {forms.some(f=>f.type==='one_credit') && (
                  <div>
                    <h4 className='font-semibold text-gray-700 mb-2'>one Credit</h4>
                    <ul className='space-y-3'>
                      {forms.map((subj,idx)=>subj.type==='one_credit' ? renderSubjectItem(subj,idx):null)}
                    </ul>
                    </div>
                )}
              {forms.some(f=>f.type==='honors') && (
                <div>
                    <h4 className='font-semibold text-gray-700 mb-2'>Honors</h4>
                    <ul className='space-y-3'>
                      {forms.map((subj,idx)=> subj.type==='honors' ? renderSubjectItem(subj,idx):null)}
                    </ul>
                  </div>
              )}

            </div>
          </div>
        </div>
      )}
      {/* ------------- Edit Faculty Modal ------------- */}
      {editInfo && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2"><MdEdit/> Update Faculty</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Faculty</label>
                <Select
                  options={faculty.map(f=>({value:f._id,label:`${f.name}${f.grade?` (${f.grade})`:''}`}))}
                  value={faculty.find(f=>f._id===editFacultyId)? {value:editFacultyId,label:faculty.find(f=>f._id===editFacultyId)?.name}:null}
                  onChange={opt=> setEditFacultyId(opt? opt.value:'' )}
                  isClearable
                  classNamePrefix="react-select"
                />
              </div>
              {(() => {
                const conf = findAllocations(editFacultyId);
                if(!conf.length) return null;
                return (<p className="text-red-600 text-xs mt-1">Allocated in: {conf.map(c=>`Day ${c.day+1} P${c.period+1}`).join(', ')}</p>);
              })()}
              <div>
                <label className="block text-sm font-medium mb-1">Additional Faculty</label>
                <Select
                  options={faculty.map(f=>({value:f._id,label:`${f.name}${f.grade?` (${f.grade})`:''}`}))}
                  value={faculty.find(f=>f._id===editAdditionalId)? {value:editAdditionalId,label:faculty.find(f=>f._id===editAdditionalId)?.name}:null}
                  onChange={opt=> setEditAdditionalId(opt? opt.value:'' )}
                  isClearable
                  classNamePrefix="react-select"
                />
              </div>
              {(() => {
                const conf2 = findAllocations(editAdditionalId);
                if(!conf2.length) return null;
                return (<p className="text-red-600 text-xs mt-1">Allocated in: {conf2.map(c=>`Day ${c.day+1} P${c.period+1}`).join(', ')}</p>);
              })()}
            </div>
            {(() => {
              const primaryConf = findAllocations(editFacultyId);
              const addConf = findAllocations(editAdditionalId);
              const hasConf = (editFacultyId && primaryConf.length) || (editAdditionalId && addConf.length);
              return (
              <div className="flex justify-end gap-3 pt-4">
                <button onClick={()=> setEditInfo(null)} className="btn-secondary">Cancel</button>
                <button disabled={hasConf} onClick={()=>{
                  if(hasConf) return;
                  if(!editInfo) return;
                  const {day,period,entry} = editInfo;
                  setTimetable(prev=> prev.map((d,dIdx)=> d.map((slot,pIdx)=>{
                    if(dIdx===day && pIdx===period){
                      return slot.map((s,idx)=> idx===entry ? {...s, facultyId: editFacultyId, additionalFacultyId: editAdditionalId}: s);
                    }
                    return slot;
                  })));
                  setEditInfo(null);
                }} className={`btn-primary ${hasConf?'opacity-50 cursor-not-allowed':''}`}>Save</button>
              </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default MakeTimetable; 