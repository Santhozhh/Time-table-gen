const constants = require('../constants');

exports.getPeriods = (req, res) => {
  res.json({ numPeriods: constants.NUM_PERIODS, periodTimes: constants.PERIOD_TIMES, sections: constants.SECTIONS, labNumbers: constants.LAB_NUMBERS });
};

exports.updatePeriods = (req, res) => {
  const { numPeriods, periodTimes, sections, labNumbers } = req.body;
  try {
    if (numPeriods) constants.NUM_PERIODS = numPeriods;
    if (periodTimes) constants.PERIOD_TIMES = periodTimes;
    if (sections) constants.SECTIONS = sections;
    if (labNumbers) constants.LAB_NUMBERS = labNumbers;
    res.json({ 
      message: 'Settings updated', 
      numPeriods: constants.NUM_PERIODS,
      periodTimes: constants.PERIOD_TIMES,
      sections: constants.SECTIONS,
      labNumbers: constants.LAB_NUMBERS
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
}; 