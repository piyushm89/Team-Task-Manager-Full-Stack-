const jwt = require('jsonwebtoken');
const User = require('../models/User');

// check if the user is logged in
async function requireAuth(req, res, next) {
  // get the token from the header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'no token' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // find the user by id from the token
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ error: 'user no longer exists' });
    }

    // attach user to request so we can use it later
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'invalid or expired token' });
  }
}

// check if user has the right role (admin/member)
function requireRole(...roles) {
  return function (req, res, next) {
    if (!req.user) {
      return res.status(401).json({ error: 'unauthenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    next();
  };
}

module.exports = {
  requireAuth: requireAuth,
  requireRole: requireRole
};
