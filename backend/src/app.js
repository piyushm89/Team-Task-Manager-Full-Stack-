const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

// import all the route files
const authRoutes = require('./routes/auth');
const projectRoutes = require('./routes/projects');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');

const app = express();

// allow frontend to talk to backend
const clientUrl = process.env.CLIENT_URL || true;
app.use(cors({
  origin: clientUrl,
  credentials: true
}));

// parse JSON request bodies
app.use(express.json({ limit: '1mb' }));

// log requests in dev
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// just a basic health check route
app.get('/', function (req, res) {
  res.json({ ok: true, name: 'team-task-manager-api' });
});

// mount the routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);

// handle 404
app.use(function (req, res) {
  res.status(404).json({ error: 'not found', path: req.path });
});

// generic error handler
app.use(function (err, req, res, next) {
  console.log('Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'something went wrong'
  });
});

module.exports = app;
