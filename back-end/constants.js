let NUM_PERIODS = 7;
let PERIOD_TIMES = Array.from({ length: NUM_PERIODS }, (_, i) => ``); 

let SECTIONS = ['A','B','C'];
let LAB_NUMBERS = [1,2,3];

const resizeTimes = (n) => {
  if (PERIOD_TIMES.length === n) return;
  if (PERIOD_TIMES.length < n) {
    PERIOD_TIMES = [...PERIOD_TIMES, ...Array(n - PERIOD_TIMES.length).fill('')];
  } else {
    PERIOD_TIMES = PERIOD_TIMES.slice(0, n);
  }
};

module.exports = {
  get NUM_PERIODS() {
    return NUM_PERIODS;
  },
  set NUM_PERIODS(value) {
    const n = parseInt(value, 10);
    if (!Number.isInteger(n) || n <= 0) {
      throw new Error('NUM_PERIODS must be a positive integer');
    }
    NUM_PERIODS = n;
    resizeTimes(n);
  },
  get PERIOD_TIMES() {
    return PERIOD_TIMES;
  },
  set PERIOD_TIMES(arr) {
    if (!Array.isArray(arr)) throw new Error('PERIOD_TIMES must be an array');
    if (arr.length !== NUM_PERIODS)
      throw new Error(`PERIOD_TIMES length must be exactly ${NUM_PERIODS}`);
    PERIOD_TIMES = arr.map(String);
  },
  // NEW: Sections settings
  get SECTIONS() {
    return SECTIONS;
  },
  set SECTIONS(arr) {
    if(!Array.isArray(arr)) throw new Error('SECTIONS must be an array of strings');
    const clean = arr.map(s=>String(s).trim().toUpperCase()).filter(Boolean);
    if(clean.some(s=>s.length===0)) throw new Error('Section codes cannot be empty');
    SECTIONS = Array.from(new Set(clean));
  },
  // NEW: Lab numbers settings
  get LAB_NUMBERS() {
    return LAB_NUMBERS;
  },
  set LAB_NUMBERS(arr) {
    if(!Array.isArray(arr)) throw new Error('LAB_NUMBERS must be an array of numbers');
    const nums = arr.map(n=>parseInt(n,10)).filter(n=>Number.isInteger(n) && n>0);
    if(nums.length!==arr.length) throw new Error('All LAB_NUMBERS must be positive integers');
    LAB_NUMBERS = Array.from(new Set(nums)).sort((a,b)=>a-b);
  }
}; 