require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config');

// Import routes
const facultyRoutes = require('./routes/faculty');
const timetableRoutes = require('./routes/timetable');
const generatedTimetableRoutes = require('./routes/generatedTimetable');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Connect to MongoDB
const startServer = async () => {
  try {
    await connectDB();
    
    // Routes
    app.use('/api/faculty', facultyRoutes);
    app.use('/api/timetable', timetableRoutes);
    app.use('/api/generated-timetables', generatedTimetableRoutes);

    // Basic route
    app.get('/', (req, res) => {
      res.send('Timetable Generator API is running');
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
      console.error('\x1b[31m%s\x1b[0m', '❌ Error:', err.stack);
      res.status(500).json({ message: 'Something went wrong!' });
    });

    // Start server
    app.listen(PORT, () => {
      console.log('\x1b[32m%s\x1b[0m', `🚀 Server running on port ${PORT}`);
      console.log('\x1b[36m%s\x1b[0m', `📡 API endpoint: http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer(); 