

const mongoose = require('mongoose');

const MONGODB_URI = 'mongodb+srv://ksdsanthosh130:kudos@digital-time-table.l6gpsyf.mongodb.net/?retryWrites=true&w=majority&appName=digital-time-table';

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI);

    console.log('MongoDB Connected Successfully!');
    
   
  } catch (err) {
    console.error(' MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

module.exports = connectDB; 