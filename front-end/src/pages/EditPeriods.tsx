import React, { useEffect } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';
import { useState } from 'react';
import { MdSchedule, MdAdd, MdDelete } from 'react-icons/md';
import api from '../services/api';
import { usePeriods } from '../context/PeriodsContext';
import { useToast } from '../components/ToastProvider';

const EditPeriods: React.FC = () => {
  const [numPeriods, setNumPeriods] = usePersistedState<number>('editPeriods_num', 7);
  const [times, setTimes] = usePersistedState<string[]>('editPeriods_times', []);
  const [loading, setLoading] = useState<boolean>(true);
  const { showToast } = useToast();
  const { setNumPeriods: updateNumPeriods, setPeriodTimes: updateTimesCtx, setSections: setSectionsCtx, setLabNumbers: setLabNumbersCtx } = usePeriods();

  const [sections, setSections] = usePersistedState<string[]>('editPeriods_sections', ['A','B','C']);
  const [labs, setLabs] = usePersistedState<number[]>('editPeriods_labs', [1,2,3]);
  const [newSection, setNewSection] = useState('');
  const [newLab, setNewLab] = useState('');

  // Fetch current value
  useEffect(() => {
    const fetchVal = async () => {
      try {
        const res = await api.get('/settings/periods');
        const { numPeriods: n, periodTimes, sections: secArr, labNumbers } = res.data;
        setNumPeriods(n);
        setTimes(Array.isArray(periodTimes)?periodTimes:Array.from({length:n},()=>''));
        if(Array.isArray(secArr)) setSections(secArr);
        if(Array.isArray(labNumbers)) setLabs(labNumbers);
      } catch (err) {
        console.error(err);
        showToast('Failed to load periods setting', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchVal();
  }, []);

  useEffect(()=>{
    setTimes(prev=>{
      if(prev.length===numPeriods) return prev;
      if(prev.length<numPeriods) return [...prev, ...Array(numPeriods-prev.length).fill('')];
      return prev.slice(0,numPeriods);
    });
  },[numPeriods]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.put('/settings/periods', { numPeriods, periodTimes: times, sections, labNumbers: labs });
      updateNumPeriods(numPeriods);
      updateTimesCtx(times);
      setSectionsCtx(sections);
      setLabNumbersCtx(labs);
      showToast(res.data?.message || 'Updated!', 'success');
      setTimeout(()=>window.location.reload(),600);
      // Clear localStorage after successful save
      localStorage.removeItem('editPeriods_num');
      localStorage.removeItem('editPeriods_times');
      localStorage.removeItem('editPeriods_sections');
      localStorage.removeItem('editPeriods_labs');
    } catch (err: any) {
      console.error(err);
      showToast(err.response?.data?.message || 'Failed to update', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="card">
        <div className="card-gradient-header">
          <div className="flex items-center gap-4">
            <div className="icon-container">
              <MdSchedule className="text-3xl text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white">Edit Number of Periods</h2>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {loading ? (
            <p>Loading...</p>
          ) : (
            <>
              <div className="form-group">
                <label className="form-label">Periods per Day</label>
                <input
                  type="number"
                  min={1}
                  value={numPeriods}
                  onChange={(e) => setNumPeriods(parseInt(e.target.value, 10) || 1)}
                  className="input-field w-40"
                />
              </div>
              <div className="space-y-3">
                {times.map((t,idx)=>(
                  <div key={idx} className="flex items-center gap-3">
                    <label className="w-24 text-sm font-medium">Period {idx+1}</label>
                    <input type="text" value={t} onChange={(e)=>{
                      const arr=[...times]; arr[idx]=e.target.value; setTimes(arr);
                    }} placeholder="e.g. 09:00 – 09:50" className="input-field flex-1" />
                  </div>
                ))}
              </div>
              <div className="form-group">
                <label className="form-label">Sections</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {sections.map(sec=> (
                    <span key={sec} className="px-2 py-1 bg-blue-100 text-blue-800 rounded flex items-center gap-1">
                      {sec}
                      <button type="button" onClick={()=> setSections(sections.filter(s=>s!==sec))}><MdDelete/></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={newSection} onChange={e=>setNewSection(e.target.value)} placeholder="Add section" className="input-field flex-1" />
                  <button type="button" className="btn-secondary" onClick={()=>{
                    const val=newSection.trim().toUpperCase();
                    if(val && !sections.includes(val)) setSections([...sections,val]);
                    setNewSection('');
                  }}><MdAdd/></button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Lab Numbers</label>
                <div className="flex gap-2 flex-wrap mb-2">
                  {labs.map(lab=> (
                    <span key={lab} className="px-2 py-1 bg-green-100 text-green-800 rounded flex items-center gap-1">
                      Lab {lab}
                      <button type="button" onClick={()=> setLabs(labs.filter(l=>l!==lab))}><MdDelete/></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={newLab} onChange={e=>setNewLab(e.target.value)} placeholder="Add lab number" className="input-field flex-1" />
                  <button type="button" className="btn-secondary" onClick={()=>{
                    const num=parseInt(newLab,10);
                    if(num>0 && !labs.includes(num)) setLabs([...labs,num]);
                    setNewLab('');
                  }}><MdAdd/></button>
                </div>
              </div>

              <button type="submit" className="btn-primary">Save</button>
              <p className="text-sm text-gray-500">Changes apply immediately on server side. Refresh the page to see new columns in timetable pages.</p>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default EditPeriods; 