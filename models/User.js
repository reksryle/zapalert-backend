const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true,   // ✅ ensures all usernames are stored in lowercase
    trim: true          // ✅ removes leading/trailing spaces
  },
  password: { type: String, required: true },

  firstName: { type: String, required: true },
  lastName: { type: String, required: true },

  age: { type: Number, required: true, min: 7, max: 100 }, 
  contactNumber: {
    type: String,
    required: true,
    match: [/^09\d{9}$/, 'Contact number must start with 09 and be 11 digits long.']
  },
  barangay: { type: String, default: 'Zapatera' },         
  barrio: { type: String, required: true },                

  role: { type: String, enum: ['resident', 'responder', 'admin'], default: 'resident' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },

  idImagePath: String,
  submittedAt: { type: Date, default: Date.now },
  approvedAt: Date,
});


module.exports = mongoose.model('User', userSchema);
