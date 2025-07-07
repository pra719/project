const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  publicKey: { type: String, required: true },
  certificate: { type: String, required: true }
});

module.exports = mongoose.model('User', userSchema);
