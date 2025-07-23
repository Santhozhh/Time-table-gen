import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MdAdd, MdSchedule, MdSchool, MdSave, MdDelete,  MdClose, MdChevronLeft, MdEdit } from 'react-icons/md';
import { MdClass } from 'react-icons/md';
import { generatedTimetableApi } from '../services/api';
// we'll reuse generatedTimetableApi to fetch other timetables for availability
import { usePeriods } from '../context/PeriodsContext';
import { usePersistedState } from '../hooks/usePersistedState';
import Select from 'react-select';
const apis = import.meta.env.VITE_API_URL || '/api'; // Fallback for local dev
interface TimetableForm {
  courseName: string;
  courseCode: string;
  shortForm?: string; // NEW
  type: 'theory' | 'practical' | 'theory_practical' | 'one_credit' | 'honors' | 'other'|'placement' | 'project work';
  hoursPerWeek: number;
  facultyId: string;
  additionalFacultyId?: string;
  labNumber?: number; // NEW
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
  shortForm?: string; // NEW
  facultyId: string;
  additionalFacultyId?: string;
  type: 'theory' | 'practical' | 'theory_practical' | 'one_credit' | 'honors' | 'other' | 'placement' | 'project work';
  labNumber?: number; // NEW
  section: string;
  year?: number;
  subjectId: string;
}
type TimetableSlot = TimetableCell[];
const days = ['1','2','3','4','5','6'];

const EditTimetable: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const keyPrefix = `editTT_${id || 'temp'}`;
  const [forms, setForms] = usePersistedState<TimetableForm[]>(`${keyPrefix}_forms`, []);
  const [fixedYear,setFixedYear]=useState<number>(1);
  const [fixedSection,setFixedSection]=useState<string>('A');
  // index for timetable navigation (reuse if needed later)
  const { numPeriods: NUM_PERIODS } = usePeriods();
  const emptyMatrix = () => Array(6).fill(null).map(() => Array(NUM_PERIODS).fill(null).map(() => [] as TimetableSlot));
  const [timetable, setTimetable] = usePersistedState<TimetableSlot[][]>(`${keyPrefix}_matrix`, emptyMatrix());
  // Track unavailable slots for currently selected faculty (across other timetables)
  const [unavailable, setUnavailable] = useState<(TimetableCell|null)[][]>(Array(6).fill(null).map(()=>Array(NUM_PERIODS).fill(null)));
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFormIndex, setCurrentFormIndex] = useState(0);
  // per-cell faculty editing
  const [editInfo, setEditInfo] = useState<{day:number; period:number; entry:number}|null>(null);
  const [editFacultyId, setEditFacultyId] = useState<string>('');
  const [editAdditionalId, setEditAdditionalId] = useState<string>('');

  // helper to find existing allocations of a faculty in current timetable
  const findAllocations = (facId:string)=>{
    if(!facId) return [] as {day:number;period:number}[];
    const list: {day:number;period:number}[] = [];
    timetable.forEach((dayRow, d)=>{
      dayRow.forEach((slot,p)=>{
        const entries = Array.isArray(slot)? slot : [slot as any];
        entries.forEach(ent=>{
          if(ent && (ent.facultyId===facId || ent.additionalFacultyId===facId)){
            if(!(editInfo && editInfo.day===d && editInfo.period===p)){
              list.push({day:d, period:p});
            }
          }
        });
      });
    });
    return list;
  };

  // helper to compute unavailable slots for a faculty across all generated timetables (excluding this one)
  const computeUnavailable = async (facultyIds:string[] = [])=>{
    if(!facultyIds.length){
      setUnavailable(Array(6).fill(null).map(()=>Array(NUM_PERIODS).fill(null)));
      return;
    }
    try{
      const { data } = await generatedTimetableApi.getAll();
      const matrix:(TimetableCell|null)[][] = Array(6).fill(null).map(()=>Array(NUM_PERIODS).fill(null));
      data.forEach((tt:any)=>{
        if(String(tt._id)===String(id)) return; // skip current timetable
        tt.timetable.forEach((dayRow:any,dIdx:number)=>{
          dayRow.forEach((cell:any,pIdx:number)=>{
            const entries:Array<any> = Array.isArray(cell)? cell : cell? [cell]: [];
            const found = entries.find((c:any)=> facultyIds.includes(c.facultyId) || (c.additionalFacultyId && facultyIds.includes(c.additionalFacultyId)) );
            if(found){
              matrix[dIdx][pIdx] = found as TimetableCell;
            }
          });
        });
      });
      setUnavailable(matrix);
    }catch(err){ console.error('computeUnavailable err',err); }
  };

  // recompute when currentFormIndex changes
  useEffect(()=>{
    const fac1 = forms[currentFormIndex]?.facultyId;
    const fac2 = forms[currentFormIndex]?.additionalFacultyId;
    computeUnavailable([fac1, fac2].filter(Boolean) as string[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[currentFormIndex]);

  // Fetch faculty and timetable data
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const facRes = await fetch(`${apis}/faculty`);
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
          // Normalize timetable so every cell is an array (supports legacy single-object cells)
          const normalized = (data.timetable||[]).map((dayRow:any)=> dayRow.map((cell:any)=>{
            if(!cell) return [] as TimetableSlot;
            return Array.isArray(cell) ? cell as TimetableSlot : [cell as TimetableCell];
          })) as TimetableSlot[][];
          setTimetable(normalized.length? normalized : emptyMatrix());
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
    if(name==='hoursPerWeek' || name==='year' || name==='labNumber') parsed = parseInt(value,10)||0;
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
    if(index===currentFormIndex && (name==='facultyId' || name==='additionalFacultyId')){
      const f1 = (name==='facultyId'? parsed : newForms[index].facultyId) as string;
      const f2 = (name==='additionalFacultyId'? parsed : newForms[index].additionalFacultyId) as string;
      computeUnavailable([f1, f2].filter(Boolean) as string[]);
    }
  };

  const genId = () => Math.random().toString(36).slice(2,10);
  const addSubject = () => {
    setForms([
      ...forms,
      {
        courseName: '',
        courseCode: '',
        shortForm: '', // NEW
        type: 'theory',
        hoursPerWeek: 0,
        facultyId: '',
        additionalFacultyId: '',
        labNumber: undefined,
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
        // clear persisted
        localStorage.removeItem(`${keyPrefix}_forms`);
        localStorage.removeItem(`${keyPrefix}_matrix`);
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

    // boundary check & faculty availability
    if(slotIndices[slotIndices.length-1] >= NUM_PERIODS){
      alert(`This subject requires ${blockLength} consecutive periods. Please choose an earlier period.`);
      return;
    }

    // check faculty unavailable
    for(const pIdx of slotIndices){
      if(unavailable[dayIdx][pIdx]){
        alert('Faculty already allocated in another class at this time');
        return;
      }
    }

    const newEntry: TimetableCell = {
      courseName: currentForm.courseName,
      courseCode: currentForm.courseCode,
      shortForm: currentForm.shortForm,
      facultyId: currentForm.facultyId,
      additionalFacultyId: currentForm.additionalFacultyId,
      type: currentForm.type,
      labNumber: currentForm.labNumber,
      section: currentForm.section,
      year: currentForm.year,
      subjectId: currentForm.id
    };

    const entryExistsInAll = slotIndices.every(colIdx =>
      timetable[dayIdx][colIdx].some(s => s.subjectId === newEntry.subjectId)
    );

    // ---- Hours per week validation BEFORE mutating timetable ----
    if (!entryExistsInAll) {
      const currentHours = timetable.flat(2).filter(c => c.subjectId === currentForm.id).length;
      const hoursToAdd = slotIndices.length;
      if (currentHours + hoursToAdd > currentForm.hoursPerWeek) {
        alert('All hours for this course have already been allocated!');
        return;
      }
    }

    const newTT = timetable.map((day,rowIdx)=> day.map((slot,colIdx)=>{
      if(rowIdx===dayIdx && slotIndices.includes(colIdx)){
        if(entryExistsInAll){
          return slot.filter(s=> s.subjectId!==newEntry.subjectId);
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
            <button onClick={()=>navigate('/')} className="p-1 rounded hover:bg-white/20" title="Back to Home"><MdChevronLeft className="text-3xl text-white"/></button>
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
                  <label className="form-label">Short Form</label>
                  <input
                    name="shortForm"
                    value={form.shortForm || ''}
                    onChange={(e) => handleInputChange(idx, e)}
                    className="input-field"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Type</label>
                  <select name="type" value={form.type} onChange={(e)=>handleInputChange(idx,e)} className="input-field">
                    <option value="theory">Theory</option>
                    <option value="practical">Practical</option>
                    <option value="one_credit">One Credit</option>
                    <option value="project work">Project Work</option>
                    <option value="placement">Placement</option>
                    <option value="honors">Honors</option>  
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Hours per Week</label>
                  <input type="number" name="hoursPerWeek" min="1"  value={form.hoursPerWeek} onChange={(e)=>handleInputChange(idx,e)} className="input-field" />
                  <p className="text-xs text-gray-500 mt-1">Free periods available: {freePeriods}</p>
                </div>
                {(form.type==='practical' || form.type==='theory_practical') && (
                  <div className="form-group">
                    <label className="form-label">Lab Number</label>
                    <select name="labNumber" value={form.labNumber ?? ''} onChange={(e)=>handleInputChange(idx,e)} className="input-field">
                      <option value="">Select Lab</option>
                      {[1,2,3].map(n=>(<option key={n} value={n}>Lab {n}</option>))}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">{form.type==='honors'?'Ordinary Faculty':'Faculty'}</label>
                  <Select
                    name="facultyId"
                    value={faculty.find(f=>f._id===form.facultyId)? {value:form.facultyId,label:faculty.find(f=>f._id===form.facultyId)?.name}:null}
                    onChange={opt=>{
                      const value = opt? opt.value:'';
                      handleInputChange(idx, {target:{name:'facultyId', value} } as any);
                    }}
                    options={faculty.map(f=>({value:f._id,label:`${f.name}${f.grade?` (${f.grade})`:''}`}))}
                    isClearable
                    classNamePrefix="react-select"
                  />
                </div>
                {(form.type==='practical' || form.type==='theory_practical' || form.type==='honors') && (
                <div className="form-group">
                    <label className="form-label">{form.type==='honors'?'Honors Faculty':'Additional Faculty (Practical)'}</label>
                    <Select
                      name="additionalFacultyId"
                      value={faculty.find(f=>f._id===form.additionalFacultyId)? {value:form.additionalFacultyId,label:faculty.find(f=>f._id===form.additionalFacultyId)?.name}:null}
                      onChange={opt=>{
                        const value = opt? opt.value:'';
                        handleInputChange(idx, {target:{name:'additionalFacultyId', value}} as any);
                      }}
                      options={faculty.map(f=>({value:f._id,label:`${f.name}${f.grade?` (${f.grade})`:''}`}))}
                      isClearable
                      classNamePrefix="react-select"
                    />
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
                          const practicalTypes=['practical','theory_practical'];
                          const isMergeable = practicalTypes.includes(slot[0].type);
                          const startIdx = periodIdx; // capture starting column index
                          let span = 1;
                          if(isMergeable){
                            while(periodIdx+span < NUM_PERIODS){
                              const next = timetable[dIdx]?.[periodIdx+span] || [];
                              if(next && next.length && practicalTypes.includes(next[0].type) && next.map(s=>s.subjectId).sort().join('|') === sig){
                                span++;
                              }else break;
                            }
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
                                  {(() => {
                                    const names = [s.facultyId, s.additionalFacultyId]
                                      .filter(Boolean)
                                      .map(id => faculty.find(f => f._id === id)?.name)
                                      .filter(Boolean)
                                      .join(', ');
                                    return (
                                      <div className="text-[9px] text-gray-500 flex items-center gap-1">
                                        {names}
                                        <button onClick={(e)=>{e.stopPropagation(); setEditInfo({day:dIdx, period:startIdx, entry:idx}); setEditFacultyId(s.facultyId||''); setEditAdditionalId(s.additionalFacultyId||'');}} className="text-blue-500 hover:text-blue-700 " title="Edit faculty"><MdEdit className='size-4'/></button>
                                      </div>
                                    );
                                  })()}
                                </div>
                              ))}
                            </td>
                          );
                          periodIdx += span;
                        }else{
                          const emptyIdx = periodIdx;
                          const isUnavailable = unavailable[dIdx][emptyIdx];
                          cells.push(
                            <td key={emptyIdx} className={`table-cell cursor-pointer ${isUnavailable?'bg-red-50/60 cursor-not-allowed':''}`} onClick={()=>handleCellClick(dIdx,emptyIdx)} onDragOver={handleDragOver} onDrop={(e)=>handleDrop(dIdx,emptyIdx,e)}>
                              {isUnavailable && (
                                <div className="space-y-1 opacity-70 text-red-700 text-[10px]">
                                  <div className="font-medium leading-none">{unavailable[dIdx][emptyIdx]?.courseName}</div>
                                  <div>{unavailable[dIdx][emptyIdx]?.courseCode}</div>
                                  <div>Year {unavailable[dIdx][emptyIdx]?.year} – Sec {unavailable[dIdx][emptyIdx]?.section}</div>
                                </div>
                              )}
                            </td>
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
                {(() => {
                  const conf = findAllocations(editFacultyId);
                  if(!conf.length) return null;
                  return (<p className="text-red-600 text-xs mt-1">Allocated in: {conf.map(c=>`Day ${c.day+1} P${c.period+1}`).join(', ')}</p>);
                })()}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Additional Faculty</label>
                <Select
                  options={faculty.map(f=>({value:f._id,label:`${f.name}${f.grade?` (${f.grade})`:''}`}))}
                  value={faculty.find(f=>f._id===editAdditionalId)? {value:editAdditionalId,label:faculty.find(f=>f._id===editAdditionalId)?.name}:null}
                  onChange={opt=> setEditAdditionalId(opt? opt.value:'' )}
                  isClearable
                  classNamePrefix="react-select"
                />
                {(() => {
                  const conf2 = findAllocations(editAdditionalId);
                  if(!conf2.length) return null;
                  return (<p className="text-red-600 text-xs mt-1">Allocated in: {conf2.map(c=>`Day ${c.day+1} P${c.period+1}`).join(', ')}</p>);
                })()}
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <button onClick={()=> setEditInfo(null)} className="btn-secondary">Cancel</button>
              <button onClick={()=>{
                if(!editInfo) return;
                const {day,period,entry} = editInfo;
                setTimetable(prev=> prev.map((dayRow,d)=> dayRow.map((slot,p)=>{
                  if(d===day && p===period){
                    return slot.map((s,idx)=> idx===entry ? {...s, facultyId: editFacultyId, additionalFacultyId: editAdditionalId}: s);
                  }
                  return slot;
                })));
                setEditInfo(null);
              }} className="btn-primary">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditTimetable; 
