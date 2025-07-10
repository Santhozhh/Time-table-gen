import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MdAdd, MdSchedule, MdSchool, MdCode, MdAccessTime, MdPerson, MdPlayArrow, MdSave, MdDelete } from 'react-icons/md';
import { generatedTimetableApi } from '../services/api';

interface TimetableForm {
  courseName: string;
  courseCode: string;
  type: 'theory' | 'practical' | 'theory_practical' | 'one_credit' | 'honors' | 'other';
  hoursPerWeek: number;
  facultyId: string;
  additionalFacultyId?: string;
  section: string;
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
}

const MakeTimetable: React.FC = () => {
  const [forms, setForms] = useState<TimetableForm[]>([{
    courseName: '',
    courseCode: '',
    type: 'theory',
    hoursPerWeek: 0,
    facultyId: '',
    additionalFacultyId: '',
    section: 'A'
  }]);

  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [timetable, setTimetable] = useState<(TimetableCell | null)[][]>(
    Array(6).fill(null).map(() => Array(7).fill(null))
  );
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
            if(cell && (cell.facultyId===facultyId || cell.additionalFacultyId===facultyId)){
              matrix[dIdx][pIdx]=cell as TimetableCell;
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
    newForms[index] = {
      ...newForms[index],
      [name]: value
    };
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
    setForms([...forms, {
      courseName: '',
      courseCode: '',
      type: 'theory',
      hoursPerWeek: 0,
      facultyId: '',
      additionalFacultyId: '',
      section: 'A'
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
    const currentHours = timetable.flat().filter(cell => 
      cell?.courseName === currentForm.courseName && 
      cell?.courseCode === currentForm.courseCode
    ).length;

    if (unavailable[dayIndex][periodIndex] && !timetable[dayIndex][periodIndex]) {
      alert('Faculty already allocated in another class at this time');
      return;
    }

    if (currentHours >= currentForm.hoursPerWeek && !timetable[dayIndex][periodIndex]) {
      alert('All hours for this course have been allocated!');
      return;
    }

    const newTimetable = timetable.map((day, dIdx) =>
      day.map((cell, pIdx) => {
        if (dIdx === dayIndex && pIdx === periodIndex) {
          return cell ? null : {
            courseName: currentForm.courseName,
            courseCode: currentForm.courseCode,
            facultyId: currentForm.facultyId,
            additionalFacultyId: currentForm.additionalFacultyId,
            type: currentForm.type,
            section: currentForm.section
          };
        }
        return cell;
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
                    <label className="form-label">Faculty</label>
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
                          {f.name} ({f.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {(form.type==='practical' || form.type==='theory_practical') && (
                    <div className="form-group">
                      <label className="form-label">Additional Faculty (Practical)</label>
                      <select name="additionalFacultyId" value={form.additionalFacultyId} onChange={(e)=>handleInputChange(index,e)} required className="input-field">
                        <option value="">Select Faculty</option>
                        {faculty.map(f=>(<option key={f._id} value={f._id}>{f.name} ({f.code})</option>))}
                      </select>
                    </div>
                  )}

                  <div className="form-group">
                    <label className="form-label">Section</label>
                    <select name="section" value={form.section} onChange={(e)=>handleInputChange(index,e)} className="input-field">
                      {['A','B','C'].map(sec=>(<option key={sec} value={sec}>{sec}</option>))}
                    </select>
                  </div>
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
                Generate & Save
              </button>
            </div>
          </div>

          <div className="p-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="table-header">Day/Period</th>
                  {Array(7).fill(null).map((_, i) => (
                    <th key={i} className="table-header">
                      Period {i + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, dayIndex) => (
                  <tr key={day}>
                    <td className="table-header">{day}</td>
                    {Array(7).fill(null).map((_, periodIndex) => {
                      const cell = timetable[dayIndex][periodIndex];
                      return (
                        <td
                          key={periodIndex}
                          onClick={() => handleCellClick(dayIndex, periodIndex)}
                          onDragOver={handleDragOver}
                          onDrop={(e)=>handleDrop(dayIndex, periodIndex, e)}
                          className={`table-cell-interactive ${cell ? 'bg-blue-50/50' : unavailable[dayIndex][periodIndex] ? 'bg-red-50/60 cursor-not-allowed' : 'bg-white'}`}
                        >
                          {cell ? (
                            <div className="space-y-1">
                              <div className="font-medium text-gray-800">{cell.courseName}</div>
                              <div className="text-sm text-[#4169E1]">{cell.courseCode}</div>
                              <div className="text-xs text-gray-500">
                                {[cell.facultyId, cell.additionalFacultyId].filter(Boolean).map(id=>faculty.find(f=>f._id===id)?.name).filter(Boolean).join(', ')} - Section {cell.section}
                              </div>
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
                    <div className="text-xs text-gray-500">Section: {subj.section}</div>
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