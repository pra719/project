const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const File = require('../models/File');
const User = require('../models/User');
const CryptoUtils = require('../utils/crypto');
const { authenticateToken } = require('../middleware/auth');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow all file types for demo purposes
    cb(null, true);
  }
});

// Upload and encrypt file
router.post('/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { sharedWith } = req.body; // JSON string of usernames to share with
    let sharedUsers = [];
    
    if (sharedWith) {
      try {
        sharedUsers = JSON.parse(sharedWith);
      } catch (e) {
        return res.status(400).json({ error: 'Invalid sharedWith format' });
      }
    }

    // Generate AES key for file encryption
    const aesKey = CryptoUtils.generateAESKey();
    
    // Encrypt file with AES
    const encryptedFile = CryptoUtils.encryptAES(req.file.buffer.toString('base64'), aesKey);
    
    // Encrypt AES key with owner's public key
    const encryptedKey = CryptoUtils.encryptRSA(aesKey.toString('hex'), req.user.publicKey);
    
    // Calculate file checksum
    const checksum = CryptoUtils.generateHash(req.file.buffer.toString('base64'));
    
    // Create digital signature
    const signature = CryptoUtils.createSignature(
      req.file.buffer.toString('base64'), 
      req.body.privateKey // Client must provide their private key for signing
    );

    // Prepare shared users data
    const sharedWithData = [];
    for (const username of sharedUsers) {
      const sharedUser = await User.findOne({ username });
      if (sharedUser) {
        const userEncryptedKey = CryptoUtils.encryptRSA(aesKey.toString('hex'), sharedUser.publicKey);
        sharedWithData.push({
          user: sharedUser._id,
          encryptedKey: userEncryptedKey,
          accessLevel: 'download'
        });
      }
    }

    // Create file record
    const file = new File({
      filename: `${Date.now()}_${req.file.originalname}`,
      originalName: req.file.originalname,
      encryptedData: encryptedFile.encryptedData,
      encryptedKey: encryptedKey,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      checksum: checksum,
      owner: req.user._id,
      sharedWith: sharedWithData,
      digitalSignature: signature
    });

    await file.save();

    res.json({
      success: true,
      message: 'File uploaded and encrypted successfully',
      data: {
        fileId: file._id,
        filename: file.originalName,
        size: file.fileSize,
        sharedWith: sharedUsers
      }
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ 
      error: 'File upload failed',
      details: error.message
    });
  }
});

// Share file with additional users
router.post('/share/:fileId', authenticateToken, async (req, res) => {
  try {
    const { usernames, privateKey } = req.body;
    
    if (!Array.isArray(usernames) || !privateKey) {
      return res.status(400).json({ error: 'Usernames array and private key required' });
    }

    const file = await File.findById(req.params.fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only file owner can share the file' });
    }

    // Decrypt AES key with owner's private key
    const aesKeyHex = CryptoUtils.decryptRSA(file.encryptedKey, privateKey);
    const aesKey = Buffer.from(aesKeyHex, 'hex');

    // Add new shared users
    for (const username of usernames) {
      const sharedUser = await User.findOne({ username });
      if (sharedUser) {
        // Check if already shared
        const alreadyShared = file.sharedWith.some(
          share => share.user.toString() === sharedUser._id.toString()
        );
        
        if (!alreadyShared) {
          const userEncryptedKey = CryptoUtils.encryptRSA(aesKeyHex, sharedUser.publicKey);
          file.sharedWith.push({
            user: sharedUser._id,
            encryptedKey: userEncryptedKey,
            accessLevel: 'download'
          });
        }
      }
    }

    await file.save();

    res.json({
      success: true,
      message: 'File shared successfully',
      data: {
        fileId: file._id,
        newShareCount: usernames.length
      }
    });

  } catch (error) {
    console.error('File sharing error:', error);
    res.status(500).json({ 
      error: 'File sharing failed',
      details: error.message
    });
  }
});

// Download and decrypt file
router.post('/download/:fileId', authenticateToken, async (req, res) => {
  try {
    const { privateKey } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({ error: 'Private key required for decryption' });
    }

    const file = await File.findById(req.params.fileId).populate('owner', 'username publicKey');
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if user has access
    const isOwner = file.owner._id.toString() === req.user._id.toString();
    const sharedAccess = file.sharedWith.find(
      share => share.user.toString() === req.user._id.toString()
    );

    if (!isOwner && !sharedAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get the appropriate encrypted key
    let encryptedKey;
    if (isOwner) {
      encryptedKey = file.encryptedKey;
    } else {
      encryptedKey = sharedAccess.encryptedKey;
    }

    // Decrypt AES key
    const aesKeyHex = CryptoUtils.decryptRSA(encryptedKey, privateKey);
    const aesKey = Buffer.from(aesKeyHex, 'hex');

    // Decrypt file content
    const decryptedContent = CryptoUtils.decryptAES(file.encryptedData, aesKey);
    const fileBuffer = Buffer.from(decryptedContent, 'base64');

    // Verify digital signature
    const isValidSignature = CryptoUtils.verifySignature(
      decryptedContent,
      file.digitalSignature,
      file.owner.publicKey
    );

    if (!isValidSignature) {
      return res.status(400).json({ error: 'File integrity check failed - invalid signature' });
    }

    // Update last accessed time
    file.lastAccessed = new Date();
    await file.save();

    // Send file
    res.set({
      'Content-Type': file.mimeType,
      'Content-Disposition': `attachment; filename="${file.originalName}"`,
      'Content-Length': fileBuffer.length
    });

    res.send(fileBuffer);

  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ 
      error: 'File download failed',
      details: error.message
    });
  }
});

// Get file info (without downloading)
router.get('/info/:fileId', authenticateToken, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId)
      .populate('owner', 'username')
      .populate('sharedWith.user', 'username');
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check if user has access
    const isOwner = file.owner._id.toString() === req.user._id.toString();
    const hasAccess = file.sharedWith.some(
      share => share.user._id.toString() === req.user._id.toString()
    );

    if (!isOwner && !hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      success: true,
      data: {
        fileId: file._id,
        filename: file.originalName,
        size: file.fileSize,
        mimeType: file.mimeType,
        owner: file.owner.username,
        createdAt: file.createdAt,
        lastAccessed: file.lastAccessed,
        sharedWith: file.sharedWith.map(share => ({
          username: share.user.username,
          sharedAt: share.sharedAt,
          accessLevel: share.accessLevel
        }))
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to get file info' });
  }
});

// List user's files (owned and shared)
router.get('/list', authenticateToken, async (req, res) => {
  try {
    // Files owned by user
    const ownedFiles = await File.find({ owner: req.user._id })
      .populate('sharedWith.user', 'username')
      .select('-encryptedData -encryptedKey -digitalSignature')
      .sort({ createdAt: -1 });

    // Files shared with user
    const sharedFiles = await File.find({ 'sharedWith.user': req.user._id })
      .populate('owner', 'username')
      .select('-encryptedData -encryptedKey -digitalSignature')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        ownedFiles: ownedFiles.map(file => ({
          fileId: file._id,
          filename: file.originalName,
          size: file.fileSize,
          mimeType: file.mimeType,
          createdAt: file.createdAt,
          lastAccessed: file.lastAccessed,
          sharedWithCount: file.sharedWith.length,
          type: 'owned'
        })),
        sharedFiles: sharedFiles.map(file => ({
          fileId: file._id,
          filename: file.originalName,
          size: file.fileSize,
          mimeType: file.mimeType,
          owner: file.owner.username,
          createdAt: file.createdAt,
          lastAccessed: file.lastAccessed,
          type: 'shared'
        }))
      }
    });

  } catch (error) {
    console.error('File list error:', error);
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

// Delete file (owner only)
router.delete('/:fileId', authenticateToken, async (req, res) => {
  try {
    const file = await File.findById(req.params.fileId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only file owner can delete the file' });
    }

    await File.findByIdAndDelete(req.params.fileId);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;
