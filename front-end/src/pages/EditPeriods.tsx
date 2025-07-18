import React, { useEffect, useState } from 'react';
import { MdSchedule } from 'react-icons/md';
import api from '../services/api';
import { usePeriods } from '../context/PeriodsContext';
import { useToast } from '../components/ToastProvider';

const EditPeriods: React.FC = () => {
  const [numPeriods, setNumPeriods] = useState<number>(7);
  const [times, setTimes] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { showToast } = useToast();
  const { setNumPeriods: updateNumPeriods, setPeriodTimes: updateTimesCtx } = usePeriods();

  // Fetch current value
  useEffect(() => {
    const fetchVal = async () => {
      try {
        const res = await api.get('/settings/periods');
        const { numPeriods: n, periodTimes } = res.data;
        setNumPeriods(n);
        setTimes(Array.isArray(periodTimes)?periodTimes:Array.from({length:n},()=>''));
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
      const res = await api.put('/settings/periods', { numPeriods, periodTimes: times });
      updateNumPeriods(numPeriods);
      updateTimesCtx(times);
      showToast(res.data?.message || 'Updated!', 'success');
      setTimeout(()=>window.location.reload(),600);
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