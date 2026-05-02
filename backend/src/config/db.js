const mongoose = require('mongoose');

// connect to mongodb
async function connectDB() {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error('MONGO_URI is missing');
  }

  mongoose.set('strictQuery', true);

  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB');
  } catch (err) {
    console.log('MongoDB connection failed:', err.message);
    throw err;
  }
}

module.exports = connectDB;
