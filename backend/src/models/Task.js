const mongoose = require('mongoose');

// allowed values for status and priority
const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'title is required'],
    trim: true,
    maxlength: 160
  },
  description: {
    type: String,
    default: '',
    maxlength: 2000
  },
  // which project this task belongs to
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  // who is this task assigned to
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  // who created the task (admin)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: STATUSES,
    default: 'todo'
  },
  priority: {
    type: String,
    enum: PRIORITIES,
    default: 'medium'
  },
  dueDate: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// virtual field to check if task is overdue
taskSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate) return false;
  if (this.status === 'done') return false;
  return new Date(this.dueDate) < new Date();
});

// include virtuals when converting to JSON
taskSchema.set('toJSON', { virtuals: true });

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;
module.exports.STATUSES = STATUSES;
module.exports.PRIORITIES = PRIORITIES;
