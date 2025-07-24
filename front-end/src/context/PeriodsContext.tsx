import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { getNumPeriods as getStored, setNumPeriods as storeNumPeriods, getSections, setSections as storeSections, getLabNumbers, setLabNumbers as storeLabNumbers } from '../utils/periods';

interface PeriodsContextValue {
  numPeriods: number;
  periodTimes: string[];
  sections: string[];
  labNumbers: number[];
  setNumPeriods: (n: number) => void;
  setPeriodTimes: (arr: string[]) => void;
  setSections: (arr: string[]) => void;
  setLabNumbers: (arr: number[]) => void;
}

const PeriodsContext = createContext<PeriodsContextValue | undefined>(undefined);

export const PeriodsProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [numPeriods, setNumPeriodsState] = useState<number>(getStored());
  const [periodTimes, setPeriodTimesState] = useState<string[]>(Array.from({length: getStored()},()=>''));
  const [sections, setSectionsState] = useState<string[]>(getSections());
  const [labNumbers, setLabNumbersState] = useState<number[]>(getLabNumbers());

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
  const updateSections = (arr:string[])=>{
    setSectionsState(arr);
    storeSections(arr);
  };
  const updateLabNumbers = (arr:number[])=>{
    setLabNumbersState(arr);
    storeLabNumbers(arr);
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
        if (Array.isArray(res.data.sections)) setSectionsState(res.data.sections);
        if (Array.isArray(res.data.labNumbers)) setLabNumbersState(res.data.labNumbers);
      } catch (err) {
        // ignore - use stored value
      }
    };
    fetchVal();
  }, []);

  return (
    <PeriodsContext.Provider value={{ numPeriods, periodTimes, sections, labNumbers, setNumPeriods: update, setPeriodTimes: updateTimes, setSections: updateSections, setLabNumbers: updateLabNumbers }}>
      {children}
    </PeriodsContext.Provider>
  );
};

export const usePeriods = () => {
  const ctx = useContext(PeriodsContext);
  if (!ctx) throw new Error('usePeriods must be used within PeriodsProvider');
  return ctx;
}; 