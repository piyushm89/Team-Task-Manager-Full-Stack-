const express = require('express');
const mongoose = require('mongoose');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// helper to check if id is valid
function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// GET all projects
// admins get every project, members only see ones they are part of
router.get('/', requireAuth, async function (req, res, next) {
  try {
    let query = {};

    // if not admin, filter by membership
    if (req.user.role !== 'admin') {
      query = {
        $or: [
          { owner: req.user._id },
          { members: req.user._id }
        ]
      };
    }

    const projects = await Project.find(query)
      .populate('owner', 'name email role')
      .populate('members', 'name email role')
      .sort({ createdAt: -1 });

    res.json({ projects: projects });
  } catch (err) {
    next(err);
  }
});

// CREATE a new project (admin only)
router.post('/', requireAuth, requireRole('admin'), async function (req, res, next) {
  try {
    const name = req.body.name;
    const description = req.body.description;
    const members = req.body.members || [];

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    // filter out invalid member ids
    const validMembers = [];
    for (let i = 0; i < members.length; i++) {
      if (isValidId(members[i])) {
        validMembers.push(members[i]);
      }
    }

    const newProject = await Project.create({
      name: name.trim(),
      description: description || '',
      owner: req.user._id,
      members: validMembers
    });

    // populate before sending
    await newProject.populate('owner', 'name email role');
    await newProject.populate('members', 'name email role');

    res.status(201).json({ project: newProject });
  } catch (err) {
    next(err);
  }
});

// GET single project by id
router.get('/:id', requireAuth, async function (req, res, next) {
  try {
    const id = req.params.id;

    if (!isValidId(id)) {
      return res.status(400).json({ error: 'bad id' });
    }

    const project = await Project.findById(id)
      .populate('owner', 'name email role')
      .populate('members', 'name email role');

    if (!project) {
      return res.status(404).json({ error: 'project not found' });
    }

    // if not admin, make sure user is allowed to see this project
    if (req.user.role !== 'admin') {
      const userId = String(req.user._id);
      const ownerId = String(project.owner._id);

      let isMember = false;
      for (let i = 0; i < project.members.length; i++) {
        if (String(project.members[i]._id) === userId) {
          isMember = true;
          break;
        }
      }

      if (ownerId !== userId && !isMember) {
        return res.status(403).json({ error: 'forbidden' });
      }
    }

    res.json({ project: project });
  } catch (err) {
    next(err);
  }
});

// UPDATE a project (admin only)
router.patch('/:id', requireAuth, requireRole('admin'), async function (req, res, next) {
  try {
    const id = req.params.id;

    if (!isValidId(id)) {
      return res.status(400).json({ error: 'bad id' });
    }

    // build the update object - only allow specific fields
    const updates = {};
    if ('name' in req.body) updates.name = req.body.name;
    if ('description' in req.body) updates.description = req.body.description;
    if ('members' in req.body) updates.members = req.body.members;

    const project = await Project.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    })
      .populate('owner', 'name email role')
      .populate('members', 'name email role');

    if (!project) {
      return res.status(404).json({ error: 'project not found' });
    }

    res.json({ project: project });
  } catch (err) {
    next(err);
  }
});

// DELETE a project (admin only) - also delete its tasks
router.delete('/:id', requireAuth, requireRole('admin'), async function (req, res, next) {
  try {
    const id = req.params.id;

    if (!isValidId(id)) {
      return res.status(400).json({ error: 'bad id' });
    }

    const project = await Project.findByIdAndDelete(id);

    if (!project) {
      return res.status(404).json({ error: 'project not found' });
    }

    // delete tasks of this project so they don't become orphaned
    await Task.deleteMany({ project: id });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ADD a member to a project (admin only)
router.post('/:id/members', requireAuth, requireRole('admin'), async function (req, res, next) {
  try {
    const projectId = req.params.id;
    const userId = req.body.userId;

    if (!isValidId(projectId) || !isValidId(userId)) {
      return res.status(400).json({ error: 'bad id' });
    }

    // make sure the user actually exists
    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(404).json({ error: 'user not found' });
    }

    // $addToSet avoids adding duplicate members
    const project = await Project.findByIdAndUpdate(
      projectId,
      { $addToSet: { members: userId } },
      { new: true }
    )
      .populate('owner', 'name email role')
      .populate('members', 'name email role');

    if (!project) {
      return res.status(404).json({ error: 'project not found' });
    }

    res.json({ project: project });
  } catch (err) {
    next(err);
  }
});

// REMOVE a member from a project (admin only)
router.delete('/:id/members/:userId', requireAuth, requireRole('admin'), async function (req, res, next) {
  try {
    const projectId = req.params.id;
    const userId = req.params.userId;

    if (!isValidId(projectId) || !isValidId(userId)) {
      return res.status(400).json({ error: 'bad id' });
    }

    const project = await Project.findByIdAndUpdate(
      projectId,
      { $pull: { members: userId } },
      { new: true }
    )
      .populate('owner', 'name email role')
      .populate('members', 'name email role');

    if (!project) {
      return res.status(404).json({ error: 'project not found' });
    }

    res.json({ project: project });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
