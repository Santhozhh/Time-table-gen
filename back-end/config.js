// MongoDB configuration file

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://ksdsanthosh130:kudos@digital-time-table.l6gpsyf.mongodb.net/?retryWrites=true&w=majority&appName=digital-time-table';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI);

    console.log('MongoDB Connected Successfully!');
    
    // Log to indicate we're using a different database in the same cluster
    if (conn.connection.db.databaseName === 'timetable_db') {
      console.log('\x1b[33m%s\x1b[0m', '📝 Note: Using timetable_db in the LMS cluster');
    }
  } catch (err) {
    console.error('\x1b[31m%s\x1b[0m', '❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB; 