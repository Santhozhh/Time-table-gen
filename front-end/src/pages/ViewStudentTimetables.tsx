import React, { useState, useEffect } from 'react';
import './ViewStudentTimetables.css';

interface Timetable {
  _id: string;
  class: string;
  semester: string;
  academicYear: string;
  status: string;
}

const ViewStudentTimetables: React.FC = () => {
  const [timetables, setTimetables] = useState<Timetable[]>([]);
  const [selectedTimetable, setSelectedTimetable] = useState<Timetable | null>(null);

  useEffect(() => {
    // Fetch timetables from API
    // TODO: Implement API call
  }, []);

  return (
    <div className="view-student-timetables">
      <h2>Student Timetables</h2>
      
      <div className="timetables-container">
        <div className="timetables-list">
          {timetables.map(timetable => (
            <div
              key={timetable._id}
              className={`timetable-item ${selectedTimetable?._id === timetable._id ? 'selected' : ''}`}
              onClick={() => setSelectedTimetable(timetable)}
            >
              <h3>{timetable.class}</h3>
              <p>Semester: {timetable.semester}</p>
              <p>Academic Year: {timetable.academicYear}</p>
              <span className={`status ${timetable.status}`}>
                {timetable.status}
              </span>
            </div>
          ))}
        </div>

        {selectedTimetable && (
          <div className="timetable-view">
            <h3>Timetable for {selectedTimetable.class}</h3>
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
                        {/* TODO: Display period details */}
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

export default ViewStudentTimetables; 