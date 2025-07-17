import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MdAdd, MdSchedule, MdSchool,  MdPlayArrow, MdSave, MdDelete } from 'react-icons/md';
import { generatedTimetableApi } from '../services/api';

interface TimetableForm {
  courseName: string;
  courseCode: string;
  type: 'theory' | 'practical' | 'theory_practical' | 'one_credit' | 'honors' | 'other';
  hoursPerWeek: number;
  facultyId: string;
  additionalFacultyId?: string;
  section: string;
  year: number; // 1 – 4
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
  type: 'theory' | 'practical' | 'theory_practical' | 'one_credit' | 'honors' | 'other';
  section: string;
  year?: number; // optional for backward compatibility
}

type TimetableSlot = TimetableCell[]; // NEW – allows multiple entries per period

const MakeTimetable: React.FC = () => {
  const [searchParams]=useSearchParams();
  const defaultYear=parseInt(searchParams.get('year')||'3',10);
  const defaultSection=(searchParams.get('section')||'A').toUpperCase();

  const [forms, setForms] = useState<TimetableForm[]>([{
    courseName: '',
    courseCode: '',
    type: 'theory',
    hoursPerWeek: 0,
    facultyId: '',
    additionalFacultyId: '',
    section: defaultSection as any,
    year: defaultYear
  }]);

  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const emptyMatrix = () => Array(6).fill(null).map(() => Array(7).fill(null).map(()=>[] as TimetableSlot));
  const [timetable, setTimetable] = useState<TimetableSlot[][]>(emptyMatrix());
  const [showTimetable, setShowTimetable] = useState(false);
  const [currentFormIndex, setCurrentFormIndex] = useState(0);
  const [unavailable, setUnavailable] = useState<(TimetableCell | null)[][]>(Array(6).fill(null).map(()=>Array(7).fill(null)));

  // compute unavailable slots for faculty
  const computeUnavailable = async (facultyId:string)=>{
    if(!facultyId) { setUnavailable(Array(6).fill(null).map(()=>Array(7).fill(null))); return; }
    try{
      const { data } = await generatedTimetableApi.getAll();
      const matrix:(TimetableCell|null)[][] = Array(6).fill(null).map(()=>Array(7).fill(null));
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
      year: base.year
    }]);
  };

  const removeSubject = (index: number) => {
    if (forms.length > 1) {
      const newForms = forms.filter((_, i) => i !== index);
      setForms(newForms);
      if (currentFormIndex >= index && currentFormIndex > 0) {
        setCurrentFormIndex(currentFormIndex - 1);
      }
    }
  };

  const handleCellClick = (dayIndex: number, periodIndex: number) => {
    const currentForm = forms[currentFormIndex];

    // Calculate current allocated hours for this subject (flatten 2 levels)
    const currentHours = timetable.flat(2).filter(cell => 
      cell.courseName === currentForm.courseName && 
      cell.courseCode === currentForm.courseCode &&
      cell.section === currentForm.section &&
      cell.year === currentForm.year
    ).length;

    // If faculty already busy elsewhere (unavailable matrix marks first clash)
    if (unavailable[dayIndex][periodIndex]) {
      alert('Faculty already allocated in another class at this time');
      return;
    }

    if (currentHours >= currentForm.hoursPerWeek) {
      alert('All hours for this course have been allocated!');
      return;
    }

    const newEntry: TimetableCell = {
      courseName: currentForm.courseName,
      courseCode: currentForm.courseCode,
      facultyId: currentForm.facultyId,
      additionalFacultyId: currentForm.additionalFacultyId,
      type: currentForm.type,
      section: currentForm.section,
      year: currentForm.year
    };

    const newTimetable = timetable.map((day, dIdx) =>
      day.map((slot, pIdx) => {
        if (dIdx === dayIndex && pIdx === periodIndex) {
          // Toggle behaviour: if the exact entry exists, remove it, else add.
          const existsIdx = slot.findIndex(s => 
            s.courseCode === newEntry.courseCode &&
            s.section === newEntry.section &&
            s.year === newEntry.year
          );
          if (existsIdx >= 0) {
            const cloned = [...slot];
            cloned.splice(existsIdx,1);
            return cloned;
          }
          return [...slot, newEntry];
        }
        return slot;
      })
    );

    setTimetable(newTimetable);
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

  return (
    <div className="space-y-6 animate-fade-in">
      {!showTimetable ? (
        <div className="card">
          <div className="card-gradient-header">
            <div className="flex items-center gap-4">
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
                      <option value="theory_practical">Theory + Practical</option>
                      <option value="one_credit">One Credit Course</option>
                      <option value="honors">Honors</option>
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
                      max="42"
                      required
                      placeholder="Enter hours"
                      className="input-field"
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">{form.type==='honors' ? 'Ordinary Faculty' : 'Faculty'}</label>
                    <select
                      name="facultyId"
                      value={form.facultyId}
                      onChange={(e) => handleInputChange(index, e)}
                      required
                      className="input-field"
                    >
                      <option value="">Select Faculty</option>
                      {faculty.map((f) => (
                        <option key={f._id} value={f._id}>
                          {f.name} {f.grade ? `(${f.grade})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(form.type==='practical' || form.type==='theory_practical' || form.type==='honors') && (
                    <div className="form-group">
                      <label className="form-label">{form.type==='honors' ? 'Honors Faculty' : 'Additional Faculty (Practical)'}</label>
                      <select name="additionalFacultyId" value={form.additionalFacultyId} onChange={(e)=>handleInputChange(index,e)} required className="input-field">
                        <option value="">Select Faculty</option>
                        {faculty.map(f=>(<option key={f._id} value={f._id}>{f.name} {f.grade ? `(${f.grade})` : ''}</option>))}
                      </select>
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
                <div className="icon-container">
                  <MdSchedule className="text-3xl text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Create Timetable</h2>
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
                  <th rowSpan={2} className="table-header align-middle">Day / Period</th>
                  {/* Header cells with breaks */}
                  {[
                    {type:'period',label:'Period 1'},
                    {type:'period',label:'Period 2'},
                    {type:'break',label:'Tea Break'},
                    {type:'period',label:'Period 3'},
                    {type:'period',label:'Period 4'},
                    {type:'break',label:'Lunch'},
                    {type:'period',label:'Period 5'},
                    {type:'period',label:'Period 6'},
                    {type:'period',label:'Period 7'},
                  ].map((h,i)=>(
                    <th key={i} className={`table-header ${h.type==='break' ? 'bg-gray-50 text-gray-500 font-medium italic' : ''}`}>{h.label}</th>
                  ))}
                </tr>
                <tr>
                  {[
                    '09:00 – 09:50',
                    '09:50 – 10:40',
                    '',
                    '11:00 – 11:50',
                    '11:50 – 12:40',
                    '',
                    '01:20 – 02:10',
                    '02:10 – 03:00',
                    '03:20 – 04:10'
                  ].map((t,i)=>(
                    <th key={i} className="table-header text-xs font-normal">{t}</th>
                  ))}
                </tr>
              </thead>
               <tbody>
                 {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, dayIndex) => (
                   <tr key={day}>
                     <td className="table-header">{day}</td>
                     {/* Iterate through 9 columns (periods + breaks) */}
                     {Array(9).fill(null).map((_, colIdx) => {
                       // Break columns (index 2 and 5)
                       if (colIdx === 2) {
                         return <td key={colIdx} className="table-cell bg-gray-50 text-center italic text-sm">Tea Break</td>;
                       }
                       if (colIdx === 5) {
                         return <td key={colIdx} className="table-cell bg-gray-50 text-center italic text-sm">Lunch</td>;
                       }

                       // Map colIdx to matrix period index (skip break positions)
                       const periodIndex = colIdx > 5 ? colIdx - 2 : colIdx > 2 ? colIdx - 1 : colIdx;
                       const slot = timetable[dayIndex][periodIndex];

                       return (
                         <td
                           key={colIdx}
                           onClick={() => handleCellClick(dayIndex, periodIndex)}
                           onDragOver={handleDragOver}
                           onDrop={(e)=>handleDrop(dayIndex, periodIndex, e)}
                           className={`table-cell-interactive ${slot.length ? 'bg-blue-50/50' : unavailable[dayIndex][periodIndex] ? 'bg-red-50/60 cursor-not-allowed' : 'bg-white'}`}
                         >
                           {slot.length ? (
                            <div className="space-y-1">
                              {slot.map((sub,idx)=>(
                                <div key={idx} className="border-b last:border-none pb-1 mb-1 last:pb-0 last:mb-0">
                                  <div className="font-medium text-gray-800">{sub.courseName}</div>
                                  <div className="text-sm text-[#4169E1]">{sub.courseCode}</div>
                                  <div className="text-xs text-gray-500">
                                    {[sub.facultyId, sub.additionalFacultyId].filter(Boolean).map(id=>faculty.find(f=>f._id===id)?.name).filter(Boolean).join(', ')} - Sec {sub.year}{sub.section}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            unavailable[dayIndex][periodIndex] && (
                              <div className="space-y-1 opacity-70 text-red-700">
                                <div className="font-medium">{unavailable[dayIndex][periodIndex]?.courseName}</div>
                                <div className="text-sm">{unavailable[dayIndex][periodIndex]?.courseCode}</div>
                                <div className="text-xs">Sec {unavailable[dayIndex][periodIndex]?.section}</div>
                              </div>
                            )
                          )}
                         </td>
                       );
                     })}
                   </tr>
                 ))}
               </tbody>
            </table>
          </div>

          {/* Subject List */}
          <div className="mt-6">
            <div className="card p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Subject List</h3>
              <ul className="space-y-3">
                {forms.map((subj, idx) => (
                  <li
                    key={idx}
                    className="subject-item cursor-move"
                    draggable
                    onDragStart={(e)=>handleDragStart(idx,e)}
                    onClick={()=>setCurrentFormIndex(idx)}
                  >
                    <div>
                      <p className="font-medium text-gray-800">{subj.courseName}</p>
                      <p className="text-sm text-blue-600">{subj.courseCode}</p>
                    </div>
                    <div className="text-sm text-gray-500 capitalize">{subj.type}</div>
                    <div className="text-xs text-gray-500">Year {subj.year} • Sec {subj.section}</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MakeTimetable; 