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
  year?: number; // Added year field
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
  const [allocatedCount,setAllocatedCount]=useState(0);

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
    if(selectedFaculty){
      const combined:Array<Array<TimetableCell|null>> = Array(6).fill(null).map(()=>Array(7).fill(null));
      allTimetables.forEach(tt=>{
        tt.timetable.forEach((dayRow,dIdx)=>{
          dayRow.forEach((slot,pIdx)=>{
            if(combined[dIdx][pIdx]) return; // already filled
            if(!slot) return;
            const entries=Array.isArray(slot)?slot:[slot];
            const match=entries.find(cell=>cell && (cell.facultyId===selectedFaculty._id || cell.additionalFacultyId===selectedFaculty._id));
            if(match) combined[dIdx][pIdx]=match as TimetableCell;
          });
        });
      });
      setMatrix(combined);
      setAllocatedCount(combined.flat().filter(Boolean).length);
          setLoading(false);
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
        <div className="text-xs text-gray-500">Year {cell.year ?? '-'} • Sec {cell.section}</div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-blue-400">FACULTY TIMETABLES</h2>

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
                <span className="text-sm font-medium text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">Allocated: {allocatedCount}</span>
                {selectedFaculty.maxHoursPerWeek && <span className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full">Free: {Math.max(selectedFaculty.maxHoursPerWeek-allocatedCount,0)}</span>}
                
              </h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th rowSpan={2} className="table-header align-middle">Day / Period</th>
                    {[{type:'period',label:'Period 1'},{type:'period',label:'Period 2'},{type:'break',label:'Tea Break'},{type:'period',label:'Period 3'},{type:'period',label:'Period 4'},{type:'break',label:'Lunch'},{type:'period',label:'Period 5'},{type:'period',label:'Period 6'},{type:'break',label:'Tea Break'},{type:'period',label:'Period 7'}].map((h,i)=>(
                      <th key={i} className={`table-header ${h.type==='break'?'bg-gray-50 text-gray-500 italic':''}`}>{h.label}</th>
                    ))}
                  </tr>
                  <tr>
                    {['09:00 – 09:50','09:50 – 10:40','','11:00 – 11:50','11:50 – 12:40','','01:20 – 02:10','02:10 – 03:00','','03:20 – 04:10'].map((t,i)=>(
                      <th key={i} className="table-header text-xs font-normal">{t}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day,dIdx)=>(
                    <tr key={day}>
                      <td className="table-header">{day}</td>
                      {Array(10).fill(null).map((_,colIdx)=>{
                        if(colIdx===2 || colIdx===8) return <td key={colIdx} className="table-cell bg-gray-50 text-center italic text-sm">Tea Break</td>;
                        if(colIdx===5) return <td key={colIdx} className="table-cell bg-gray-50 text-center italic text-sm">Lunch</td>;
                        let periodIdx:number;
                        if(colIdx<2) periodIdx=colIdx; // 0,1
                        else if(colIdx<5) periodIdx=colIdx-1; //3,4 => 2,3
                        else if(colIdx<8) periodIdx=colIdx-2; //6,7 =>4,5
                        else periodIdx=6; // col 9 => Period 7
                        const slot = matrix[dIdx]?.[periodIdx] || [];
                        return (
                          <td key={colIdx} className="table-cell">
                            {slot && getTimetableCell(dIdx,periodIdx)}
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