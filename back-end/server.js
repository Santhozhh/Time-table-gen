require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config');

const facultyRoutes = require('./routes/faculty');
const timetableRoutes = require('./routes/timetable');
const generatedTimetableRoutes = require('./routes/generatedTimetable');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const startServer = async () => {
  try {
    await connectDB();
    
    app.use('/faculty', facultyRoutes);
    app.use('/timetable', timetableRoutes);
    app.use('/generated-timetables', generatedTimetableRoutes);
    app.use('/settings', settingsRoutes);

    app.get('/', (req, res) => {
      res.send('Timetable Generator API is running');
    });

    app.use((err, req, res, next) => {
      console.error('\x1b[31m%s\x1b[0m', '❌ Error:', err.stack);
      res.status(500).json({ message: 'Something went wrong!' });
    });

    
    app.listen(PORT, () => {
      console.log( ` Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer(); 