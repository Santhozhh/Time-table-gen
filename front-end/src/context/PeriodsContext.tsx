import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { getNumPeriods as getStored, setNumPeriods as storeNumPeriods } from '../utils/periods';

interface PeriodsContextValue {
  numPeriods: number;
  periodTimes: string[];
  setNumPeriods: (n: number) => void;
  setPeriodTimes: (arr: string[]) => void;
}

const PeriodsContext = createContext<PeriodsContextValue | undefined>(undefined);

export const PeriodsProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [numPeriods, setNumPeriodsState] = useState<number>(getStored());
  const [periodTimes, setPeriodTimesState] = useState<string[]>(Array.from({length: getStored()},()=>''));

  const update = (n: number) => {
    setNumPeriodsState(n);
    storeNumPeriods(n);
    setPeriodTimesState((prev)=>{
      if(prev.length===n) return prev;
      if(prev.length<n) return [...prev, ...Array(n-prev.length).fill('')];
      return prev.slice(0,n);
    });
  };
  const updateTimes = (arr:string[])=>{
    setPeriodTimesState(arr);
  };

  // Sync with backend on mount
  useEffect(() => {
    const fetchVal = async () => {
      try {
        const res = await api.get('/settings/periods');
        const { numPeriods: n, periodTimes: times } = res.data;
        if (typeof n === 'number' && n > 0 && n !== numPeriods) {
          update(n);
        }
        if (Array.isArray(times)) {
          setPeriodTimesState(times);
        }
      } catch (err) {
        // ignore - use stored value
      }
    };
    fetchVal();
  }, []);

  return (
    <PeriodsContext.Provider value={{ numPeriods, periodTimes, setNumPeriods: update, setPeriodTimes: updateTimes }}>
      {children}
    </PeriodsContext.Provider>
  );
};

export const usePeriods = () => {
  const ctx = useContext(PeriodsContext);
  if (!ctx) throw new Error('usePeriods must be used within PeriodsProvider');
  return ctx;
}; 