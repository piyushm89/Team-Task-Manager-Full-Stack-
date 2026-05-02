const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'project name required'],
    trim: true,
    maxlength: 120
  },
  description: {
    type: String,
    default: '',
    maxlength: 1000
  },
  // the admin who created the project
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // list of members in this project
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ]
}, {
  timestamps: true
});

// helps when finding projects a user is part of
projectSchema.index({ members: 1 });

module.exports = mongoose.model('Project', projectSchema);
