import React, { useState, useEffect, useMemo } from 'react';
import { generatedTimetableApi, facultyApi } from '../services/api';
import { MdClass, MdDownload, MdEdit, MdChevronLeft, MdChevronRight } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

interface TimetableCell {
  courseName: string;
  courseCode: string;
  section: string;
  facultyId: string;
  type: string;
  additionalFacultyId?: string;
  year?: number;
}

interface GeneratedTimetable {
  _id: string;
  timetable: (TimetableCell | null)[][];
  courses: any[];
  createdAt: string;
}

interface YearSection {
  year: number;
  section: string;
}

const predefinedYearSections: YearSection[] = (() => {
  const arr: YearSection[] = [];
  for (let y = 1; y <= 4; y++) {
    ['A', 'B', 'C'].forEach((sec) => arr.push({ year: y, section: sec }));
  }
  return arr;
})();

const ViewStudentTimetables: React.FC = () => {
  const [timetables, setTimetables] = useState<GeneratedTimetable[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [selectedYS, setSelectedYS] = useState<YearSection | null>(predefinedYearSections[0]);
  const [matrix, setMatrix] = useState<(TimetableCell | null)[][]>(Array(6).fill(null).map(() => Array(7).fill(null)));
  const [loading, setLoading] = useState(true);
  const [selectedTimetable, setSelectedTimetable] = useState<GeneratedTimetable | null>(null);
  const [listCollapsed, setListCollapsed] = useState(false);
  const [matchedTimetables,setMatchedTimetables]=useState<GeneratedTimetable[]>([]);
  const [ttIndex,setTtIndex]=useState(0);
  const navigate = useNavigate();

  /* ---------------- Timetable availability map ---------------- */
  const availabilitySet = useMemo(() => {
    const set = new Set<string>();
    timetables.forEach((tt) => {
      tt.timetable.forEach((dayRow) => {
        dayRow.forEach((slot) => {
          if (!slot) return;
          const entries = Array.isArray(slot) ? slot : [slot];
          entries.forEach((c) => {
            if (c && c.year && c.section) {
              set.add(`${c.year}${c.section}`);
            }
          });
        });
      });
    });
    return set;
  }, [timetables]);

  // Fetch timetables & faculty
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const { data } = await generatedTimetableApi.getAll();
        setTimetables(data);
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

  // Compute matrix when selection/timetables change
  useEffect(() => {
    if (!selectedYS) return;

    // build matches list
    const matches:GeneratedTimetable[]=[];
    timetables.forEach(tt=>{
      const has = tt.timetable.some(dayRow=>dayRow.some(slot=>{
        if(!slot) return false;
        const entries = Array.isArray(slot)? slot:[slot];
        return entries.some(c=>Number(c.year)===selectedYS.year && c.section===selectedYS.section);
      }));
      if(has) matches.push(tt);
    });
    setMatchedTimetables(matches);
    setTtIndex(0);
    if(matches.length){
       const tt=matches[0];
       const filtered=tt.timetable.map(dayRow=>dayRow.map(slot=>{
          if(!slot) return null;
          const entries=Array.isArray(slot)?slot:[slot];
          const match=entries.find(c=>Number(c.year)===selectedYS.year && c.section===selectedYS.section);
          return match||null;
       }));
        setMatrix(filtered);
        setSelectedTimetable(tt);
        return;
    }
    // Not found
    setMatrix(Array(6).fill(null).map(() => Array(7).fill(null)));
    setSelectedTimetable(null);
  }, [selectedYS, timetables]);

  // effect when ttIndex changes
  useEffect(()=>{
     if(matchedTimetables.length){
        const idx=Math.min(ttIndex,matchedTimetables.length-1);
        const tt=matchedTimetables[idx];
        const filtered=tt.timetable.map(dayRow=>dayRow.map(slot=>{
          if(!slot) return null;
          const entries=Array.isArray(slot)?slot:[slot];
          const match=entries.find(c=>Number(c.year)===selectedYS.year && c.section===selectedYS.section);
          return match||null;
        }));
        setMatrix(filtered);
        setSelectedTimetable(tt);
     }
  },[ttIndex,matchedTimetables]);

  const downloadExcel = async () => {
    if (!selectedTimetable) return;
    try {
      const res = await fetch(`http://localhost:5000/api/generated-timetables/${selectedTimetable._id}/excel`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timetable_${selectedTimetable._id}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
      alert('Failed to download Excel');
    }
  };

  const getCellContent = (day: number, period: number) => {
    const cell = matrix[day][period];
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
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-blue-400">Student Timetables</h2>

      {loading && <p>Loading...</p>}
      {!loading && (
        <div className={`grid grid-cols-1 ${listCollapsed?'':'md:grid-cols-3'} gap-6`}>
          {/* Year-Section list */}
          {!listCollapsed && (
          <div className="space-y-3 relative">
            <button className="absolute -right-4 top-0 p-1 rounded-full bg-gray-100 hover:bg-gray-200" onClick={()=>setListCollapsed(true)} title="Hide list"><MdChevronLeft/></button>
            {predefinedYearSections.map((ys) => {
              const key = `${ys.year}${ys.section}`;
              const isActive = selectedYS?.year === ys.year && selectedYS?.section === ys.section;
              const hasTT = availabilitySet.has(key);
              return (
                <button
                  key={key}
                  onClick={() => setSelectedYS(ys)}
                  className={`w-full flex items-center gap-3 p-4 border rounded-lg text-left transition-colors
                    ${hasTT ? 'bg-indigo-50 border-indigo-600 text-indigo-700' : 'bg-red-50 border-red-500 text-red-600'}
                    ${isActive ? 'ring-2 ring-indigo-700' : 'hover:bg-gray-50'}`}
                >
                  <MdClass className="text-2xl text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-800">Year {ys.year} – Sec {ys.section}</p>
                  </div>
                </button>
              );
            })}
          </div>
          )}
          {listCollapsed && <button className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 self-start" onClick={()=>setListCollapsed(false)} title="Show list"><MdChevronRight/></button>}

          {/* Timetable */}
          <div className="md:col-span-2">
            {selectedTimetable ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button disabled={ttIndex<=0} onClick={()=>setTtIndex(ttIndex-1)} className={`p-1 rounded hover:bg-gray-100 ${ttIndex<=0?'opacity-30 cursor-not-allowed':''}`}><MdChevronLeft/></button>
                    <p className="text-sm text-gray-500">Created: {new Date(selectedTimetable.createdAt).toLocaleString()}</p>
                    <button disabled={ttIndex>=matchedTimetables.length-1} onClick={()=>setTtIndex(ttIndex+1)} className={`p-1 rounded hover:bg-gray-100 ${ttIndex>=matchedTimetables.length-1?'opacity-30 cursor-not-allowed':''}`}><MdChevronRight/></button>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={downloadExcel} className="btn-primary flex items-center gap-2">
                      <MdDownload /> Download Excel
                    </button>
                    {selectedTimetable && (
                      <button
                        onClick={() => navigate(`/edit-timetable/${selectedTimetable._id}`)}
                        className="btn-primary flex items-center gap-2"
                      >
                        <MdEdit /> Edit
                      </button>
                    )}
                  </div>
                </div>

                {/** ----- Timetable table with time row ----- */}
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
                    {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day, dIdx) => (
                      <tr key={day}>
                        <td className="table-header">{day}</td>
                        {Array(10).fill(null).map((_, colIdx)=>{
                          if(colIdx===2 || colIdx===8) return <td key={colIdx} className="table-cell bg-gray-50 text-center italic text-sm">Tea Break</td>;
                          if(colIdx===5) return <td key={colIdx} className="table-cell bg-gray-50 text-center italic text-sm">Lunch</td>;
                          let periodIndex:number;
                          if(colIdx<2) periodIndex=colIdx;
                          else if(colIdx<5) periodIndex=colIdx-1;
                          else if(colIdx<8) periodIndex=colIdx-2;
                          else periodIndex=6;
                          return (
                            <td key={colIdx} className="table-cell">
                              {getCellContent(dIdx, periodIndex)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-start gap-4">
                <p className="text-gray-600">No timetable exists for Year {selectedYS?.year} Section {selectedYS?.section}.</p>
                <button onClick={()=>navigate(`/make-timetable?year=${selectedYS?.year}&section=${selectedYS?.section}`)} className="btn-primary">Create Timetable</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewStudentTimetables; 