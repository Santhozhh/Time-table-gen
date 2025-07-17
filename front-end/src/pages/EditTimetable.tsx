import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MdAdd, MdSchedule, MdSchool, MdSave, MdDelete, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { MdClass } from 'react-icons/md';
import { generatedTimetableApi } from '../services/api';

interface TimetableForm {
  courseName: string;
  courseCode: string;
  type: 'theory' | 'practical' | 'theory_practical' | 'one_credit' | 'honors' | 'other';
  hoursPerWeek: number;
  facultyId: string;
  additionalFacultyId?: string;
  section: string;
  year: number;
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
}
type TimetableSlot = TimetableCell[];
const days = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

const EditTimetable: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [forms, setForms] = useState<TimetableForm[]>([]);
  const [fixedYear,setFixedYear]=useState<number>(1);
  const [fixedSection,setFixedSection]=useState<string>('A');
  // index for timetable navigation (reuse if needed later)
  const [listCollapsed,setListCollapsed]=useState(false);
  const emptyMatrix = () => Array(6).fill(null).map(() => Array(7).fill(null).map(() => [] as TimetableSlot));
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
          const courseList = data.courses||[];
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
    let parsed: any = value;
    if(name==='hoursPerWeek' || name==='year') parsed = parseInt(value,10)||0;
    newForms[index] = { ...newForms[index], [name]: parsed } as TimetableForm;
    setForms(newForms);
  };

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
      },
    ]);
  };

  const removeSubject = (idx: number) => {
    setForms(forms.filter((_, i) => i !== idx));
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

    const newEntry: TimetableCell = {
      courseName: currentForm.courseName,
      courseCode: currentForm.courseCode,
      facultyId: currentForm.facultyId,
      additionalFacultyId: currentForm.additionalFacultyId,
      type: currentForm.type,
      section: currentForm.section,
      year: currentForm.year
    };

    const newTT = timetable.map((day,rowIdx)=> day.map((slot,colIdx)=>{
      if(rowIdx===dayIdx && colIdx===periodIdx){
        const idx = slot.findIndex(s=> s.courseCode===newEntry.courseCode && s.section===newEntry.section && s.year===newEntry.year);
        if(idx>=0){
          const cloned=[...slot]; cloned.splice(idx,1); return cloned; // remove
        }
        return [...slot,newEntry]; // add
      }
      return slot;
    }));

    setTimetable(newTT);
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

  if (loading) return <p>Loading...</p>;

  const totalPeriods = 42; // 6 days * 7 teaching periods
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
                    <option value="theory_practical">Theory + Practical</option>
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
                  <th rowSpan={2} className="table-header align-middle">Day / Period</th>
                  {[{type:'period',label:'Period 1'},{type:'period',label:'Period 2'},{type:'break',label:'Tea Break'},{type:'period',label:'Period 3'},{type:'period',label:'Period 4'},{type:'break',label:'Lunch'},{type:'period',label:'Period 5'},{type:'period',label:'Period 6'},{type:'break',label:'Tea Break'},{type:'period',label:'Period 7'}].map((h,i)=>(<th key={i} className={`table-header ${h.type==='break'?'bg-gray-50 text-gray-500 italic':''}`}>{h.label}</th>))}
                </tr>
                <tr>
                  {['09:00 – 09:50','09:50 – 10:40','','11:00 – 11:50','11:50 – 12:40','','01:20 – 02:10','02:10 – 03:00','','03:20 – 04:10'].map((t,i)=>(<th key={i} className="table-header text-xs font-normal">{t}</th>))}
                </tr>
              </thead>
              <tbody>
                {days.map((day,dIdx)=>(
                  <tr key={day}>
                    <td className="table-header">{day}</td>
                    {Array(10).fill(null).map((_,colIdx)=>{
                      if(colIdx===2 || colIdx===8) return <td key={colIdx} className="table-cell bg-gray-50 text-center italic text-sm">Tea Break</td>;
                      if(colIdx===5) return <td key={colIdx} className="table-cell bg-gray-50 text-center italic text-sm">Lunch</td>;
                      let periodIdx:number;
                      if(colIdx<2) periodIdx=colIdx;
                      else if(colIdx<5) periodIdx=colIdx-1;
                      else if(colIdx<8) periodIdx=colIdx-2;
                      else periodIdx=6;
                      const slot = timetable[dIdx]?.[periodIdx] || [];
                      return (
                        <td key={colIdx} className="table-cell cursor-pointer" onClick={()=>handleCellClick(dIdx,periodIdx)} onDragOver={handleDragOver} onDrop={(e)=>handleDrop(dIdx,periodIdx,e)}>
                          {slot.map((s,idx)=>(
                            <div key={idx} className="space-y-1">
                              <div className="font-medium text-gray-800 text-xs">{s.courseName}</div>
                              <div className="text-[10px] text-blue-600">{s.courseCode}</div>
                            </div>
                          ))}
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
                    <div className="text-xs text-gray-500">Hrs {subj.hoursPerWeek}</div>
                  </li>
                ))}
              </ul>
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