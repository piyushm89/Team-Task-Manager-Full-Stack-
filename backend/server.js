// entry point - this is where the app starts
require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');

const PORT = process.env.PORT || 5000;

// connect to mongo first, then start the server
async function startServer() {
  try {
    await connectDB();
    app.listen(PORT, function () {
      console.log('Server is running on port', PORT);
    });
  } catch (error) {
    console.log('Could not start server:', error.message);
    process.exit(1);
  }
}

startServer();
