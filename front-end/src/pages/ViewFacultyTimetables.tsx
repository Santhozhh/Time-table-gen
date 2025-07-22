import React, { useState, useEffect } from 'react';
// Animation handled via CSS class .animate-slide-up
import { facultyApi, generatedTimetableApi } from '../services/api';
import { usePeriods } from '../context/PeriodsContext';

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
  shortForm?: string;
  section: string;
  facultyId: string;
  type: string;
  additionalFacultyId?: string;
  year?: number; // Added year field
  labNumber?: number;
}

interface GeneratedTimetable {
  _id: string;
  timetable: (TimetableCell | null)[][];
  createdAt: string;
}

const ViewFacultyTimetables: React.FC = () => {
  const [faculty, setFaculty] = useState<Faculty[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState<Faculty | null>(null);
  const { numPeriods: NUM_PERIODS } = usePeriods();
  const [matrix, setMatrix] = useState<(TimetableCell | null)[][]>(Array(6).fill(null).map(() => Array(NUM_PERIODS).fill(null)));
  const [allTimetables, setAllTimetables] = useState<GeneratedTimetable[]>([]);
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
      const combined:Array<Array<TimetableCell|null>> = Array(6).fill(null).map(()=>Array(NUM_PERIODS).fill(null));
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



  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-blue-400">FACULTY TIMETABLES</h2>

      <div className={`grid grid-cols-1 ${listCollapsed ? '' : 'md:grid-cols-3'} gap-6`}>
        {/* Faculty list */}
        {!listCollapsed && (
        <div className="space-y-3 ">
          {/* Collapse button */}
          <button className=" size-5 -right-4 top-0 p-1 rounded-full bg-gray-100 hover:bg-gray-200" onClick={()=>setListCollapsed(true)} title="Hide list">
            <MdChevronLeft /> 
          </button>

          {['Professor/HoD','Professor','Associate Professor','Assistant Professor I','Assistant Professor II','Assistant Professor III'].map(gr=>{
            const list = faculty.filter(fc=>fc.grade===gr);
            if(!list.length) return null;
            return (
              <div key={gr} className="space-y-2">
                <h4 className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">{gr}</h4>
                {list.map(f=>{
                  const allocated = getAllocatedCount(f._id);
                  const limit = typeof f.maxHoursPerWeek==='number'
                    ? (f.maxHoursPerWeek === 42 ? 6*NUM_PERIODS : f.maxHoursPerWeek)
                    : (6*NUM_PERIODS);
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
                        <p className="text-xs text-gray-500">{f.specialization}</p>
                        
                      </div>
                      <div className="flex flex-col items-end text-xs font-medium gap-1">
                        <span className="text-indigo-700">Allocated Period: {allocated}</span>
                        <span className="text-green-700">Free Period: {free}</span>
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
            <div className="space-y-4 hover:shadow-lg transition-shadow duration-200 p-6 bg-white rounded-lg border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-4">
                
                Timetable for {selectedFaculty.name}<br/>
                Grade : {selectedFaculty.grade}<br/>
                
                 Department {  selectedFaculty.specialization}

                <span className="text-sm font-medium text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full">Allocated: {allocatedCount}</span>
                {(() => {
                  let lim = typeof selectedFaculty.maxHoursPerWeek === 'number'
                    ? (selectedFaculty.maxHoursPerWeek === 42 ? 6*NUM_PERIODS : selectedFaculty.maxHoursPerWeek)
                    : 6*NUM_PERIODS;
                  return (
                    <span className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1 rounded-full">Free: {Math.max(lim-allocatedCount,0)}</span>
                  );
                })()}
                
              </h3>
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="table-header align-middle">Day / Period</th>
                    {Array(NUM_PERIODS).fill(null).map((_,i)=>(<th key={i} className="table-header">Period {i+1}</th>))}
                  </tr>
                </thead>
                <tbody>
                  {['1','2','3','4','5','6'].map((day,dIdx)=>(
                    <tr key={day} className="animate-slide-up" style={{animationDelay: `${dIdx*50}ms`}}>
                      <td className="table-header">{day}</td>
                      {/* Render cells with horizontal merge */}
                      {(()=>{
                        const cells:JSX.Element[] = [];
                        for(let p=0; p<NUM_PERIODS;){
                          const slot = matrix[dIdx]?.[p] || null;
                          if(slot){
                            const practicalTypes=['practical','theory_practical'];
                            const isMergeable = practicalTypes.includes(slot.type);
                            let span = 1;
                            if(isMergeable){
                              while(p+span < NUM_PERIODS){
                                const next = matrix[dIdx]?.[p+span] || null;
                                if(next && practicalTypes.includes(next.type) && next.courseCode===slot.courseCode && next.section===slot.section && next.year===slot.year){
                                  span++;
                                }else break;
                              }
                            }
                            cells.push(
                              <td key={p} colSpan={span} className="table-cell animate-pop" style={{animationDelay:`${p*40}ms`}}>
                              <div className="space-y-1">
                                <div className="font-medium text-gray-800 text-xs">{slot.shortForm || slot.courseName}</div>
                                  <div className="text-[10px] text-blue-600">Year :{slot.year}</div>
                                  <div className="text-[10px] text-blue-600">Sec : {slot.section}</div>
                              </div>
                          </td>
                        );
                            p += span;
                          }else{
                            cells.push(<td key={p} className="table-cell animate-pop" style={{animationDelay:`${p*40}ms`}}/>);
                            p++;
                          }
                        }
                        return cells;
                      })()}
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