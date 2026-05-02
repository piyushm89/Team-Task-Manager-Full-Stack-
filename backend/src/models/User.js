const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// regex to check email format
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'name is required'],
    trim: true,
    maxlength: 80
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [emailRegex, 'invalid email']
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false  // don't include in normal queries
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member'
  }
}, {
  timestamps: true
});

// hash password before saving
userSchema.pre('save', async function (next) {
  // only hash if password was changed
  if (!this.isModified('password')) {
    return next();
  }
  const hashed = await bcrypt.hash(this.password, 10);
  this.password = hashed;
  next();
});

// check if a plain password matches the hashed one
userSchema.methods.comparePassword = function (plainPassword) {
  return bcrypt.compare(plainPassword, this.password);
};

// remove password and __v when sending user data to client
userSchema.methods.toJSON = function () {
  const userObj = this.toObject();
  delete userObj.password;
  delete userObj.__v;
  return userObj;
};

module.exports = mongoose.model('User', userSchema);
