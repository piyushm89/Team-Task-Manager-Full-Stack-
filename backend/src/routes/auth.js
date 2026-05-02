const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// helper to create a JWT token
function createToken(user) {
  const payload = {
    id: user._id,
    role: user.role
  };
  const secret = process.env.JWT_SECRET;
  const options = {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  };
  return jwt.sign(payload, secret, options);
}

// SIGNUP
router.post('/signup', async function (req, res, next) {
  try {
    const name = req.body.name;
    const email = req.body.email;
    const password = req.body.password;

    // check all fields are present
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }

    // check password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'password must be at least 6 chars' });
    }

    // check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ error: 'email already in use' });
    }

    // make first user an admin so the app works out of the box
    const totalUsers = await User.estimatedDocumentCount();
    let role = 'member';
    if (totalUsers === 0) {
      role = 'admin';
    }

    // create the user
    const newUser = await User.create({
      name: name,
      email: email,
      password: password,
      role: role
    });

    const token = createToken(newUser);

    res.status(201).json({
      token: token,
      user: newUser
    });
  } catch (err) {
    next(err);
  }
});

// LOGIN
router.post('/login', async function (req, res, next) {
  try {
    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    // find the user (need password explicitly because select: false)
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'invalid credentials' });
    }

    const token = createToken(user);

    res.json({
      token: token,
      user: user
    });
  } catch (err) {
    next(err);
  }
});

// GET CURRENT USER
router.get('/me', requireAuth, function (req, res) {
  res.json({ user: req.user });
});

module.exports = router;
