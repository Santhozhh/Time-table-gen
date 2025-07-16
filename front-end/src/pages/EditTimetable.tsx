import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MdAdd, MdSchedule, MdSchool, MdSave, MdDelete } from 'react-icons/md';
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
          setForms(data.courses || []);
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
    newForms[index] = { ...newForms[index], [name]: value } as TimetableForm;
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
        section: 'A',
        year: 3,
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

  if (loading) return <p>Loading...</p>;

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
                  <label className="form-label">Faculty</label>
                  <select name="facultyId" value={form.facultyId} onChange={(e) => handleInputChange(idx, e)} className="input-field">
                    <option value="">Select</option>
                    {faculty.map((f) => (
                      <option key={f._id} value={f._id}>
                        {f.name} ({f.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Year</label>
                  <select name="year" value={form.year} onChange={(e) => handleInputChange(idx, e)} className="input-field">
                    {[1, 2, 3, 4].map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Section</label>
                  <select name="section" value={form.section} onChange={(e) => handleInputChange(idx, e)} className="input-field">
                    {['A', 'B', 'C'].map((sec) => (
                      <option key={sec} value={sec}>
                        {sec}
                      </option>
                    ))}
                  </select>
                </div>
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
                  <th className="table-header">Day/Period</th>
                  {Array.from({length:7}).map((_,i)=>(<th key={i} className="table-header">{i+1}</th>))}
                </tr>
              </thead>
              <tbody>
                {days.map((day, dIdx)=>(
                  <tr key={day}>
                    <td className="table-header">{day}</td>
                    {Array.from({length:7}).map((_,pIdx)=>{
                      const slot = timetable[dIdx]?.[pIdx] || [];
                      return (
                        <td key={pIdx} className="table-cell cursor-pointer" onClick={()=>handleCellClick(dIdx,pIdx)}>
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