import React, { useState, useEffect } from 'react';
import { facultyApi, generatedTimetableApi } from '../services/api';

import { MdPerson, MdChevronLeft, MdChevronRight } from 'react-icons/md';

interface Faculty {
  _id: string;
  name: string;
  code: string;
  specialization: string;
  maxHoursPerWeek?: number;
  grade?: string; // Added grade field
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
  const [allTimetables, setAllTimetables] = useState<GeneratedTimetable[]>([]);
  // removed allocatedCount state; compute on render
  const [loading, setLoading] = useState(true);
  const [listCollapsed, setListCollapsed] = useState(false);

  useEffect(() => {
    const fetchFaculty = async () => {
      try {
        const { data } = await facultyApi.getAll();
        setFaculty(data);
        if (data.length) setSelectedFaculty(data[0]);

        // fetch timetables once
        const ttRes = await generatedTimetableApi.getAll();
        setAllTimetables(ttRes.data);
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
          const timetables: GeneratedTimetable[] = allTimetables;
          // find latest timetable that includes faculty
          for (const tt of timetables) {
            const found = tt.timetable.some(day => day.some(slot => {
              if(!slot) return false;
              const entries = Array.isArray(slot) ? slot : [slot];
              return entries.some(cell => cell && (cell.facultyId === selectedFaculty._id || cell.additionalFacultyId === selectedFaculty._id));
            }));
            if (found) {
              const filtered = tt.timetable.map((dayRow)=> dayRow.map((slot)=>{
                if(!slot) return null;
                const entries = Array.isArray(slot) ? slot : [slot];
                const match = entries.find(cell=> cell && (cell.facultyId===selectedFaculty._id || cell.additionalFacultyId===selectedFaculty._id));
                return match || null;
              }));
              setMatrix(filtered);
              // no need to set state here
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
  }, [selectedFaculty, allTimetables]);

  // helper to count allocated slots for a faculty across all timetables
  const getAllocatedCount = (facId:string) => {
    let count = 0;
    allTimetables.forEach(tt=>{
      tt.timetable.forEach(day=>{
        day.forEach(slot=>{
          if(!slot) return;
          const entries = Array.isArray(slot) ? slot : [slot];
          entries.forEach(cell=>{
            if(cell && (cell.facultyId===facId || cell.additionalFacultyId===facId)) count++;
          });
        });
      });
    });
    return count;
  };

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
      <h2 className="text-2xl font-bold text-blue-400">Faculty Timetables</h2>

      <div className={`grid grid-cols-1 ${listCollapsed ? '' : 'md:grid-cols-3'} gap-6`}>
        {/* Faculty list */}
        {!listCollapsed && (
        <div className="space-y-3 relative">
          {/* Collapse button */}
          <button className="absolute -right-4 top-0 p-1 rounded-full bg-gray-100 hover:bg-gray-200" onClick={()=>setListCollapsed(true)} title="Hide list">
            <MdChevronLeft />
          </button>

          {['Professor','Associate Professor','Assistant Professor I','Assistant Professor II','Assistant Professor III'].map(gr=>{
            const list = faculty.filter(fc=>fc.grade===gr);
            if(!list.length) return null;
            return (
              <div key={gr} className="space-y-2">
                <h4 className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">{gr}</h4>
                {list.map(f=>{
                  const allocated = getAllocatedCount(f._id);
                  const limit = typeof f.maxHoursPerWeek==='number' ? f.maxHoursPerWeek : 42;
                  const free = Math.max(limit - allocated,0);
                  return (
            <button
              key={f._id}
              onClick={() => setSelectedFaculty(f)}
              className={`w-full flex items-center gap-3 p-4 border rounded-lg text-left hover:bg-gray-50 ${selectedFaculty?._id===f._id?'border-blue-600 bg-blue-50':''}`}
            >
              <MdPerson className="text-2xl text-blue-600" />
                      <div className="flex-1">
                <p className="font-medium text-gray-800">{f.name}</p>
                        <p className="text-xs text-gray-500">{f.grade}</p>
                      </div>
                      <div className="flex flex-col items-end text-xs font-medium gap-1">
                        <span className="text-indigo-700">A: {allocated}</span>
                        <span className="text-green-700">F: {free}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
        )}
        {listCollapsed && (
          <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 self-start" onClick={()=>setListCollapsed(false)} title="Show list">
            <MdChevronRight />
          </button>
        )}

        {/* Timetable */}
        <div className="md:col-span-2">
          {loading && <p>Loading...</p>}
          {!loading && selectedFaculty && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-4">
                Timetable for {selectedFaculty.name}
                {(()=>{const alloc=getAllocatedCount(selectedFaculty._id);return (
                  <>
                    <span className="text-sm font-medium text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">Allocated: {alloc}</span>
                    {selectedFaculty.maxHoursPerWeek && <span className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full">Free: {Math.max(selectedFaculty.maxHoursPerWeek-alloc,0)}</span>}
                  </>
                );})()}
              </h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th rowSpan={2} className="table-header align-middle">Day / Period</th>
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
                      <th key={i} className={`table-header ${h.type==='break'?'bg-gray-50 text-gray-500 italic':''}`}>{h.label}</th>
                    ))}
                  </tr>
                  <tr>
                    {['09:00 – 09:50','09:50 – 10:40','','11:00 – 11:50','11:50 – 12:40','','01:20 – 02:10','02:10 – 03:00','03:20 – 04:10'].map((t,i)=>(
                      <th key={i} className="table-header text-xs font-normal">{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day,dIdx)=>(
                    <tr key={day}>
                      <td className="table-header">{day}</td>
                      {Array(9).fill(null).map((_,colIdx)=>{
                        if(colIdx===2) return <td key={colIdx} className="table-cell bg-gray-50 text-center italic text-sm">Tea Break</td>;
                        if(colIdx===5) return <td key={colIdx} className="table-cell bg-gray-50 text-center italic text-sm">Lunch</td>;
                        const periodIdx = colIdx>5 ? colIdx-2 : colIdx>2 ? colIdx-1 : colIdx;
                        return (
                          <td key={colIdx} className="table-cell">
                            {getTimetableCell(dIdx,periodIdx)}
                        </td>
                        );
                      })}
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