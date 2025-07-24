export const getNumPeriods = (): number => {
  const stored = localStorage.getItem('numPeriods');
  if (stored) {
    const n = parseInt(stored, 10);
    if (!Number.isNaN(n) && n > 0) return n;
  }
  return 7; // default
};

export const setNumPeriods = (n: number): void => {
  if (Number.isInteger(n) && n > 0) {
    localStorage.setItem('numPeriods', String(n));
  }
};

export const getSections = ():string[]=>{
  try { const v=localStorage.getItem('sections'); if(v) return JSON.parse(v); }catch{}; return ['A','B','C'];
}
export const setSections = (arr:string[])=>{
  try{localStorage.setItem('sections',JSON.stringify(arr));}catch{}
};
export const getLabNumbers = ():number[]=>{
  try{const v=localStorage.getItem('labNumbers'); if(v) return JSON.parse(v);}catch{}; return [1,2,3];
};
export const setLabNumbers = (nums:number[])=>{
  try{localStorage.setItem('labNumbers',JSON.stringify(nums));}catch{}
}; 