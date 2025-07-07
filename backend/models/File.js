const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  encryptedData: { type: String, required: true },
  encryptedKey: { type: String, required: true }, // AES key encrypted with owner's public key
  fileSize: { type: Number, required: true },
  mimeType: { type: String, required: true },
  checksum: { type: String, required: true }, // For integrity verification
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sharedWith: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    encryptedKey: { type: String, required: true }, // AES key encrypted with recipient's public key
    sharedAt: { type: Date, default: Date.now },
    accessLevel: { type: String, enum: ['read', 'download'], default: 'read' }
  }],
  digitalSignature: { type: String, required: true }, // Digital signature of the file
  createdAt: { type: Date, default: Date.now },
  lastAccessed: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Indexes for efficient queries
fileSchema.index({ owner: 1 });
fileSchema.index({ 'sharedWith.user': 1 });
fileSchema.index({ filename: 1, owner: 1 });

module.exports = mongoose.model('File', fileSchema);
