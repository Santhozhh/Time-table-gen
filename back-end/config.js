// MongoDB configuration file

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://ksdsanthosh130:kudos@lms.ze750zk.mongodb.net/timetable_db?retryWrites=true&w=majority&appName=TimeTable';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI);

    console.log('\x1b[32m%s\x1b[0m', '🎯 MongoDB Connected Successfully!');
    console.log('\x1b[36m%s\x1b[0m', `👉 Connected to Database: ${conn.connection.db.databaseName}`);
    console.log('\x1b[36m%s\x1b[0m', `👉 Host: ${conn.connection.host}`);
    console.log('\x1b[36m%s\x1b[0m', `👉 Port: ${conn.connection.port}`);
    
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