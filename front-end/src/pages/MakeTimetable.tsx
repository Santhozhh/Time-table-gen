import React, { useState, useEffect } from 'react';
import { MdAdd, MdSchedule, MdSchool, MdCode, MdAccessTime, MdPerson, MdPlayArrow, MdSave, MdDelete } from 'react-icons/md';

interface TimetableForm {
  courseName: string;
  courseCode: string;
  type: 'theory' | 'practical';
  hoursPerWeek: number;
  facultyId: string;
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
  type: 'theory' | 'practical';
}

const MakeTimetable: React.FC = () => {
  const [forms, setForms] = useState<TimetableForm[]>([{
    courseName: '',
    courseCode: '',
    type: 'theory',
    hoursPerWeek: 0,
    facultyId: ''
  }]);

  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [timetable, setTimetable] = useState<(TimetableCell | null)[][]>(
    Array(6).fill(null).map(() => Array(7).fill(null))
  );
  const [showTimetable, setShowTimetable] = useState(false);
  const [currentFormIndex, setCurrentFormIndex] = useState(0);

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
  };

  const addNewSubject = () => {
    setForms([...forms, {
      courseName: '',
      courseCode: '',
      type: 'theory',
      hoursPerWeek: 0,
      facultyId: ''
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
            type: currentForm.type
          };
        }
        return cell;
      })
    );

    setTimetable(newTimetable);
  };

  const handleGenerate = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/timetable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          timetable,
          courses: forms
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save timetable');
      }

      alert('Timetable generated and saved successfully!');
    } catch (error) {
      console.error('Error generating timetable:', error);
      alert('Failed to generate timetable. Please try again.');
    }
  };

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
          
          <form onSubmit={handleSubmit} className="p-6">
            {forms.map((form, index) => (
              <div key={index} className="form-section">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                    <MdSchool className="text-[#4169E1]" />
                    Subject {index + 1}
                  </h3>
                  {index > 0 && (
                    <button
                      type="button"
                      onClick={() => removeSubject(index)}
                      className="btn-danger"
                    >
                      <MdDelete />
                      Remove
                    </button>
                  )}
                </div>
                
                <div className="form-container">
                  <div className="space-y-2">
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

                  <div className="space-y-2">
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

                  <div className="space-y-2">
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
                    </select>
                  </div>

                  <div className="space-y-2">
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

                  <div className="space-y-2">
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
                </div>
              </div>
            ))}

            <div className="flex justify-between items-center mt-8">
              <button
                type="button"
                onClick={addNewSubject}
                className="btn-secondary"
              >
                <MdAdd className="text-xl" />
                Add Subject
              </button>

              <button
                type="submit"
                className="btn-primary"
              >
                <MdPlayArrow className="text-xl" />
                Continue to Timetable
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
                          className={`table-cell-interactive ${
                            cell ? 'bg-blue-50/50' : 'bg-white'
                          }`}
                        >
                          {cell && (
                            <div className="space-y-1">
                              <div className="font-medium text-gray-800">{cell.courseName}</div>
                              <div className="text-sm text-[#4169E1]">{cell.courseCode}</div>
                              <div className="text-xs text-gray-500">
                                {faculty.find(f => f._id === cell.facultyId)?.name}
                              </div>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MakeTimetable; 