// Global application constants (mutable so they can be updated at runtime)
// NOTE: Changing NUM_PERIODS via the settings route will immediately affect
// any logic that reads this property afterwards (e.g. validations, controllers).
// Default to 7 periods per day but can be updated through API.
let NUM_PERIODS = 7;
let PERIOD_TIMES = Array.from({ length: NUM_PERIODS }, (_, i) => ``); // Empty times by default

const resizeTimes = (n) => {
  if (PERIOD_TIMES.length === n) return;
  if (PERIOD_TIMES.length < n) {
    // extend with empty strings
    PERIOD_TIMES = [...PERIOD_TIMES, ...Array(n - PERIOD_TIMES.length).fill('')];
  } else {
    // shrink
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
}; 