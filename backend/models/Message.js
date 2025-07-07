const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  encryptedContent: { type: String, required: true },
  encryptedKey: { type: String, required: true }, // AES key encrypted with recipient's public key
  digitalSignature: { type: String, required: true }, // Digital signature of the message
  messageHash: { type: String, required: true }, // Hash for integrity verification
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for efficient queries
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ recipient: 1, isRead: 1 });
messageSchema.index({ timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);
