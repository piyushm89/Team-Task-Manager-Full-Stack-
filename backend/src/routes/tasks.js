const express = require('express');
const mongoose = require('mongoose');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// constants for valid statuses and priorities
const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

function isValidId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// helper - check if a user can access a project
async function canAccessProject(user, projectId) {
  if (user.role === 'admin') {
    return true;
  }

  const project = await Project.findById(projectId).select('owner members');
  if (!project) {
    return false;
  }

  const userId = String(user._id);

  if (String(project.owner) === userId) {
    return true;
  }

  for (let i = 0; i < project.members.length; i++) {
    if (String(project.members[i]) === userId) {
      return true;
    }
  }

  return false;
}

// GET tasks (with optional filters)
// supports: ?project=&assignee=&status=&overdue=true&mine=true
router.get('/', requireAuth, async function (req, res, next) {
  try {
    const project = req.query.project;
    const assignee = req.query.assignee;
    const status = req.query.status;
    const overdue = req.query.overdue;
    const mine = req.query.mine;

    const filter = {};

    if (project) {
      if (!isValidId(project)) {
        return res.status(400).json({ error: 'bad project id' });
      }
      filter.project = project;
    }

    if (assignee && isValidId(assignee)) {
      filter.assignedTo = assignee;
    }

    if (status && STATUSES.includes(status)) {
      filter.status = status;
    }

    if (mine === 'true') {
      filter.assignedTo = req.user._id;
    }

    if (overdue === 'true') {
      filter.dueDate = { $lt: new Date() };
      // don't include done tasks in overdue
      if (!filter.status) {
        filter.status = { $ne: 'done' };
      }
    }

    // members can only see tasks from projects they belong to
    if (req.user.role !== 'admin') {
      const visibleProjects = await Project.find({
        $or: [
          { owner: req.user._id },
          { members: req.user._id }
        ]
      }).select('_id');

      const visibleIds = visibleProjects.map(function (p) {
        return String(p._id);
      });

      if (project) {
        // if a specific project is requested, make sure user has access
        if (!visibleIds.includes(String(project))) {
          return res.status(403).json({ error: 'forbidden' });
        }
      } else {
        // otherwise restrict to visible projects only
        filter.project = { $in: visibleIds };
      }
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('project', 'name')
      .sort({ createdAt: -1 });

    res.json({ tasks: tasks });
  } catch (err) {
    next(err);
  }
});

// CREATE a task (admin only)
router.post('/', requireAuth, requireRole('admin'), async function (req, res, next) {
  try {
    const title = req.body.title;
    const description = req.body.description;
    const project = req.body.project;
    const assignedTo = req.body.assignedTo;
    const status = req.body.status;
    const priority = req.body.priority;
    const dueDate = req.body.dueDate;

    // validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'title is required' });
    }
    if (!project || !isValidId(project)) {
      return res.status(400).json({ error: 'valid project id required' });
    }

    // make sure project exists
    const projectExists = await Project.findById(project);
    if (!projectExists) {
      return res.status(404).json({ error: 'project not found' });
    }

    // build the task data
    const taskData = {
      title: title.trim(),
      description: description || '',
      project: project,
      createdBy: req.user._id
    };

    if (assignedTo && isValidId(assignedTo)) {
      taskData.assignedTo = assignedTo;
    } else {
      taskData.assignedTo = null;
    }

    if (status && STATUSES.includes(status)) {
      taskData.status = status;
    } else {
      taskData.status = 'todo';
    }

    if (priority && PRIORITIES.includes(priority)) {
      taskData.priority = priority;
    } else {
      taskData.priority = 'medium';
    }

    if (dueDate) {
      taskData.dueDate = new Date(dueDate);
    } else {
      taskData.dueDate = null;
    }

    const task = await Task.create(taskData);

    await task.populate('assignedTo', 'name email role');
    await task.populate('createdBy', 'name email');
    await task.populate('project', 'name');

    res.status(201).json({ task: task });
  } catch (err) {
    next(err);
  }
});

// GET a single task
router.get('/:id', requireAuth, async function (req, res, next) {
  try {
    const id = req.params.id;

    if (!isValidId(id)) {
      return res.status(400).json({ error: 'bad id' });
    }

    const task = await Task.findById(id)
      .populate('assignedTo', 'name email role')
      .populate('createdBy', 'name email')
      .populate('project', 'name owner members');

    if (!task) {
      return res.status(404).json({ error: 'task not found' });
    }

    // check project access for non-admin
    if (req.user.role !== 'admin') {
      const allowed = await canAccessProject(req.user, task.project._id);
      if (!allowed) {
        return res.status(403).json({ error: 'forbidden' });
      }
    }

    res.json({ task: task });
  } catch (err) {
    next(err);
  }
});

// UPDATE a task
// admins can update anything
// members can only change the status of their own task
router.patch('/:id', requireAuth, async function (req, res, next) {
  try {
    const id = req.params.id;

    if (!isValidId(id)) {
      return res.status(400).json({ error: 'bad id' });
    }

    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).json({ error: 'task not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isAssignee = task.assignedTo && String(task.assignedTo) === String(req.user._id);

    if (!isAdmin && !isAssignee) {
      return res.status(403).json({ error: 'forbidden' });
    }

    if (isAdmin) {
      // admin can update any field
      if ('title' in req.body) {
        task.title = req.body.title;
      }
      if ('description' in req.body) {
        task.description = req.body.description;
      }
      if ('assignedTo' in req.body) {
        const a = req.body.assignedTo;
        if (a && isValidId(a)) {
          task.assignedTo = a;
        } else if (!a) {
          task.assignedTo = null;
        }
      }
      if ('status' in req.body && STATUSES.includes(req.body.status)) {
        task.status = req.body.status;
      }
      if ('priority' in req.body && PRIORITIES.includes(req.body.priority)) {
        task.priority = req.body.priority;
      }
      if ('dueDate' in req.body) {
        task.dueDate = req.body.dueDate ? new Date(req.body.dueDate) : null;
      }
      if ('project' in req.body && isValidId(req.body.project)) {
        task.project = req.body.project;
      }
    } else {
      // member can only change status
      if (!('status' in req.body)) {
        return res.status(403).json({ error: 'members can only update status' });
      }
      if (!STATUSES.includes(req.body.status)) {
        return res.status(400).json({ error: 'invalid status' });
      }
      task.status = req.body.status;
    }

    await task.save();

    await task.populate('assignedTo', 'name email role');
    await task.populate('createdBy', 'name email');
    await task.populate('project', 'name');

    res.json({ task: task });
  } catch (err) {
    next(err);
  }
});

// DELETE a task (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async function (req, res, next) {
  try {
    const id = req.params.id;

    if (!isValidId(id)) {
      return res.status(400).json({ error: 'bad id' });
    }

    const task = await Task.findByIdAndDelete(id);
    if (!task) {
      return res.status(404).json({ error: 'task not found' });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
