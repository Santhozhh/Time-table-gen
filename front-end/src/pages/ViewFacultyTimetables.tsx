import React, { useState, useEffect } from 'react';
import './ViewFacultyTimetables.css';

interface Faculty {
  _id: string;
  name: string;
  code: string;
  specialization: string;
}

interface FacultyTimetable {
  _id: string;
  class: string;
  courseName: string;
  courseCode: string;
  type: string;
  day: number;
  period: number;
}

const ViewFacultyTimetables: React.FC = () => {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [timetables, setTimetables] = useState<FacultyTimetable[]>([]);

  useEffect(() => {
    // Fetch faculty list from API
    // TODO: Implement API call
  }, []);

  useEffect(() => {
    if (selectedFaculty) {
      // Fetch faculty's timetables
      // TODO: Implement API call
    }
  }, [selectedFaculty]);

  const getTimetableCell = (day: number, period: number) => {
    const schedule = timetables.find(t => t.day === day && t.period === period);
    if (!schedule) return null;

    return (
      <div className="period-details">
        <div className="course-name">{schedule.courseName}</div>
        <div className="class-name">{schedule.class}</div>
        <div className="type">{schedule.type}</div>
      </div>
    );
  };

  return (
    <div className="view-faculty-timetables">
      <h2>Faculty Timetables</h2>
      
      <div className="faculty-timetable-container">
        <div className="faculty-list">
          {faculty.map(f => (
            <div
              key={f._id}
              className={`faculty-item ${selectedFaculty?._id === f._id ? 'selected' : ''}`}
              onClick={() => setSelectedFaculty(f)}
            >
              <h3>{f.name}</h3>
              <p>Code: {f.code}</p>
              <p>Specialization: {f.specialization}</p>
            </div>
          ))}
        </div>

        {selectedFaculty && (
          <div className="faculty-timetable">
            <h3>Timetable for {selectedFaculty.name}</h3>
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Monday</th>
                  <th>Tuesday</th>
                  <th>Wednesday</th>
                  <th>Thursday</th>
                  <th>Friday</th>
                  <th>Saturday</th>
                </tr>
              </thead>
              <tbody>
                {Array(7).fill(null).map((_, periodIndex) => (
                  <tr key={periodIndex}>
                    <td>Period {periodIndex + 1}</td>
                    {Array(6).fill(null).map((_, dayIndex) => (
                      <td key={dayIndex}>
                        {getTimetableCell(dayIndex, periodIndex)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewFacultyTimetables; 