const express = require('express');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// GET all users
// admins get full info, members get just basic info (for assignee dropdowns)
router.get('/', requireAuth, async function (req, res, next) {
  try {
    let users;

    if (req.user.role === 'admin') {
      users = await User.find().sort({ createdAt: -1 });
    } else {
      // only return basic fields for members
      users = await User.find({}, 'name email role');
    }

    res.json({ users: users });
  } catch (err) {
    next(err);
  }
});

// UPDATE a user's role (admin only)
router.patch('/:id/role', requireAuth, requireRole('admin'), async function (req, res, next) {
  try {
    const id = req.params.id;
    const role = req.body.role;

    // make sure role is valid
    if (role !== 'admin' && role !== 'member') {
      return res.status(400).json({ error: 'role must be admin or member' });
    }

    const user = await User.findByIdAndUpdate(id, { role: role }, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'user not found' });
    }

    res.json({ user: user });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
