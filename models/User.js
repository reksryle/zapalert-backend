const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  firstName: String,
  lastName: String,
  age: { type: Number, required: true },
  role: { type: String, enum: ['resident', 'responder', 'admin'], default: 'resident' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  idImagePath: String,
  submittedAt: Date,
  approvedAt: Date,
});

module.exports = mongoose.model('User', userSchema);
