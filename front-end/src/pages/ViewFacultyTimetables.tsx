import React, { useState, useEffect } from 'react';
import { facultyApi, generatedTimetableApi } from '../services/api';

import { MdPerson } from 'react-icons/md';

interface Faculty {
  _id: string;
  name: string;
  code: string;
  specialization: string;
}

interface TimetableCell {
  courseName: string;
  courseCode: string;
  section: string;
  facultyId: string;
  type: string;
  additionalFacultyId?: string;
}

interface GeneratedTimetable {
  _id: string;
  timetable: (TimetableCell | null)[][];
  createdAt: string;
}

const ViewFacultyTimetables: React.FC = () => {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const [matrix, setMatrix] = useState<(TimetableCell | null)[][]>(Array(6).fill(null).map(() => Array(7).fill(null)));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        const { data } = await facultyApi.getAll();
        setFaculty(data);
        if (data.length) setSelectedFaculty(data[0]);
      } catch (err) {
        console.error('Failed to load faculty');
      }
    };
    fetchFaculty();
  }, []);

  useEffect(() => {
    if (selectedFaculty) {
      const fetchTimetables = async () => {
        try {
          const { data } = await generatedTimetableApi.getAll();
          const timetables: GeneratedTimetable[] = data;
          // find latest timetable that includes faculty
          for (const tt of timetables) {
            const found = tt.timetable.some(day => day.some(cell => cell && (cell.facultyId === selectedFaculty._id || cell.additionalFacultyId === selectedFaculty._id)));
            if (found) {
              const filtered = tt.timetable.map((dayRow)=> dayRow.map((cell)=>{
                if(!cell) return null;
                return (cell.facultyId===selectedFaculty._id || cell.additionalFacultyId===selectedFaculty._id) ? cell : null;
              }));
              setMatrix(filtered);
              setLoading(false);
              return;
            }
          }
          // if none found
          setMatrix(Array(6).fill(null).map(() => Array(7).fill(null)));
          setLoading(false);
        } catch (err) {
          console.error('Failed to fetch timetables', err);
          setLoading(false);
        }
      };
      fetchTimetables();
    }
  }, [selectedFaculty]);

  const getTimetableCell = (day: number, period: number) => {
    const cell = matrix[day][period];
    if (!cell) return null;

    return (
      <div className="space-y-1">
        <div className="font-medium text-gray-800">{cell.courseName}</div>
        <div className="text-sm text-blue-600">{cell.courseCode}</div>
        <div className="text-xs text-gray-500">Sec {cell.section}</div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Faculty Timetables</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Faculty list */}
        <div className="space-y-3">
          {faculty.map((f) => (
            <button
              key={f._id}
              onClick={() => setSelectedFaculty(f)}
              className={`w-full flex items-center gap-3 p-4 border rounded-lg text-left hover:bg-gray-50 ${selectedFaculty?._id===f._id?'border-blue-600 bg-blue-50':''}`}
            >
              <MdPerson className="text-2xl text-blue-600" />
              <div>
                <p className="font-medium text-gray-800">{f.name}</p>
                <p className="text-xs text-gray-500">{f.code} • {f.specialization}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Timetable */}
        <div className="md:col-span-2">
          {loading && <p>Loading...</p>}
          {!loading && selectedFaculty && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800">Timetable for {selectedFaculty.name}</h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="table-header">Day/Period</th>
                    {Array(7).fill(null).map((_,i)=>(<th key={i} className="table-header">Period {i+1}</th>))}
                  </tr>
                </thead>
                <tbody>
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day,dIdx)=>(
                    <tr key={day}>
                      <td className="table-header">{day}</td>
                      {Array(7).fill(null).map((_,pIdx)=>(
                        <td key={pIdx} className="table-cell">
                          {getTimetableCell(dIdx,pIdx)}
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
    </div>
  );
};

export default ViewFacultyTimetables; 