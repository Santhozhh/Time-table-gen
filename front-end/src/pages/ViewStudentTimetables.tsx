import React, { useState, useEffect } from 'react';
import { generatedTimetableApi } from '../services/api';
import { facultyApi } from '../services/api';
import { MdDownload } from 'react-icons/md';

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
  courses: any[];
  createdAt: string;
}

const ViewStudentTimetables: React.FC = () => {
  const [list, setList] = useState<GeneratedTimetable[]>([]);
  const [selected, setSelected] = useState<GeneratedTimetable | null>(null);
  const [loading, setLoading] = useState(true);
  const [faculty, setFaculty] = useState<any[]>([]);

  // download excel
  const downloadExcel = async () => {
    if (!selected) return;
    try {
      const res = await fetch(`http://localhost:5000/api/generated-timetables/${selected._id}/excel`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timetable_${selected._id}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to download Excel');
    }
  };

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data } = await generatedTimetableApi.getAll();
        setList(data);
        if (data.length) setSelected(data[0]); // select newest
        const fRes = await facultyApi.getAll();
        setFaculty(fRes.data);
      } catch (err) {
        console.error('Failed to load timetables', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const getCell = (day: number, period: number) => {
    const cell = selected?.timetable[day][period];
    if (!cell) return null;
    const names = [cell.facultyId, cell.additionalFacultyId]
      .filter(Boolean)
      .map((id) => faculty.find((f) => f._id === id)?.name)
      .filter(Boolean)
      .join(', ');
    return (
      <div className="space-y-1">
        <div className="font-medium text-gray-800">{cell.courseName}</div>
        <div className="text-sm text-blue-600">{cell.courseCode}</div>
        {names && <div className="text-xs text-gray-500">{names}</div>}
      </div>
    );
  };

  return (
    <div className="view-student-timetables space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Student Timetables</h2>
      {loading && <p>Loading...</p>}
      {!loading && !list.length && <p className="text-gray-600">No timetables generated yet.</p>}

      {selected && (
        <div className="space-y-4">
          <p className="text-sm text-gray-500">Created: {new Date(selected.createdAt).toLocaleString()}</p>
          <button onClick={downloadExcel} className="btn-primary flex items-center gap-2">
            <MdDownload /> Download Excel
          </button>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="table-header">Day/Period</th>
                {Array(7).fill(null).map((_, i) => (
                  <th key={i} className="table-header">Period {i+1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day, dIdx) => (
                <tr key={day}>
                  <td className="table-header">{day}</td>
                  {Array(7).fill(null).map((_, pIdx)=>(
                    <td key={pIdx} className="table-cell">
                      {getCell(dIdx,pIdx)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ViewStudentTimetables; 