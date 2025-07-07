const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  publicKey: { type: String, required: true },
  certificate: { type: String, required: true },
  certificateSerial: { type: String, required: true, unique: true },
  issuedAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true },
  isRevoked: { type: Boolean, default: false },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Index for efficient queries
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ certificateSerial: 1 });

module.exports = mongoose.model('User', userSchema);
