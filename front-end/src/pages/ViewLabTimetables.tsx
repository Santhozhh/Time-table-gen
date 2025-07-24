import React, { useEffect, useState } from 'react';
import { generatedTimetableApi, facultyApi } from '../services/api';
import { usePeriods } from '../context/PeriodsContext';
import { MdComputer } from 'react-icons/md';

interface TimetableCell {
  courseName: string;
  courseCode: string;
  shortForm?: string;
  facultyId: string;
  additionalFacultyId?: string;
  section: string;
  year?: number;
  labNumber?: number;
  type: string;
}

interface GeneratedTimetable {
  _id: string;
  timetable: (TimetableCell | null)[][];
}

const ViewLabTimetables: React.FC = () => {
  const { labNumbers, numPeriods: NUM_PERIODS } = usePeriods();
  const [labNumber, setLabNumber] = useState<number>(()=> labNumbers[0] || 1);
  // Access periods first so value is available when building matrix

  // Helper to make empty matrix sized for current NUM_PERIODS
  const buildEmptyMatrix = () => Array(6).fill(null).map(() => Array(NUM_PERIODS).fill(null));

  const [faculty, setFaculty] = useState<any[]>([]);

  // Initialise state
  const [matrix, setMatrix] = useState<(TimetableCell | null)[][]>(buildEmptyMatrix());

  // Re-create an empty matrix whenever the number of periods changes
  useEffect(() => {
    setMatrix(buildEmptyMatrix());
  }, [NUM_PERIODS]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ttRes, facRes] = await Promise.all([
          generatedTimetableApi.getAll(),
          facultyApi.getAll()
        ]);
        const data = ttRes.data;
        setFaculty(facRes.data);
        // Build combined matrix for selected lab
        const combined:(TimetableCell|null)[][] = Array(6).fill(null).map(()=>Array(NUM_PERIODS).fill(null));
        data.forEach((tt:GeneratedTimetable)=>{
          tt.timetable.forEach((dayRow, dIdx)=>{
            dayRow.forEach((slot, pIdx)=>{
              if(!slot || combined[dIdx][pIdx]) return;
              const entries = Array.isArray(slot)? slot:[slot];
              const match = entries.find(c=>c && c.labNumber===labNumber);
              if(match){
                combined[dIdx][pIdx] = match as TimetableCell;
              }
            });
          });
        });
        setMatrix(combined);
      }catch(err){console.error('Failed to load lab timetable',err);}    
    };
    fetchData();
  }, [labNumber, NUM_PERIODS]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-blue-400 flex items-center gap-2"><MdComputer/> LAB {labNumber} TIMETABLE</h2>
      <div className="flex gap-3 mb-4">
        {labNumbers.map(n=>(
          <button key={n} onClick={()=>setLabNumber(n)} className={`px-4 py-2 rounded-lg border ${labNumber===n?'bg-blue-600 text-white':'bg-white hover:bg-blue-50'}`}>Lab {n}</button>
        ))}
      </div>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="table-header align-middle">Day / Period</th>
            {Array(NUM_PERIODS).fill(null).map((_,i)=>(<th key={i} className="table-header">Period {i+1}</th>))}
          </tr>
        </thead>
        <tbody>
          {[1,2,3,4,5,6].map((day,dIdx)=> (
            <tr key={day}>
              <td className="table-header">{day}</td>
              {(()=>{
                const cells:JSX.Element[] = [];
                for(let p=0; p<NUM_PERIODS;){
                  const cell = (matrix[dIdx] || [])[p] || null;
                  if(cell){
                    const mergeableTypes = ['practical','theory_practical'];
                    const isMergeable = mergeableTypes.includes(cell.type);
                    let span = 1;
                    if(isMergeable){
                      while(p+span < NUM_PERIODS){
                        const next = (matrix[dIdx] || [])[p+span] || null;
                        if(next && mergeableTypes.includes(next.type) && next.courseCode===cell.courseCode && next.section===cell.section && next.year===cell.year && next.labNumber===cell.labNumber){
                          span++;
                        }else break;
                      }
                    }
                    // Faculty names
                    const names = [cell.facultyId, cell.additionalFacultyId].filter(Boolean).map(id=>faculty.find((f:any)=>f._id===id)?.name).filter(Boolean).join(', ');
                    cells.push(
                      <td key={p} colSpan={span} className="table-cell">
                        <div className="space-y-1">
                          <div className="font-medium text-gray-650 text-sm">{cell.shortForm || cell.courseName}</div>
                          <div className="text-[10px] text-blue-600">{cell.courseCode}</div>
                          <div className="text-[10px] text-gray-500">Year {cell.year} – Sec {cell.section}</div>
                          {names && <div className="text-[10px] text-gray-500">{names}</div>}
                        </div>
                      </td>
                    );
                    p += span;
                  }else{
                    cells.push(<td key={p} className="table-cell"/>);
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
  );
};

export default ViewLabTimetables; 