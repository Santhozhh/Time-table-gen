const constants = require('../constants');

exports.getPeriods = (req, res) => {
  res.json({ numPeriods: constants.NUM_PERIODS, periodTimes: constants.PERIOD_TIMES });
};

exports.updatePeriods = (req, res) => {
  const { numPeriods, periodTimes } = req.body;
  try {
    if (numPeriods) constants.NUM_PERIODS = numPeriods;
    if (periodTimes) constants.PERIOD_TIMES = periodTimes;
    res.json({ 
      message: 'Settings updated', 
      numPeriods: constants.NUM_PERIODS,
      periodTimes: constants.PERIOD_TIMES
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}; 