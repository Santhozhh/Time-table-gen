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