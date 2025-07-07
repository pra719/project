const express = require('express');
const router = express.Router();
const File = require('../models/File');
const User = require('../models/User');
const crypto = require('crypto');
const auth = require('../middleware/auth');

router.post('/upload', auth, async (req, res) => {
  const { recipientUsername, fileContent, privateKey } = req.body;
  try {
    const sender = await User.findById(req.user.userId);
    const recipient = await User.findOne({ username: recipientUsername });
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' });

    const cipher = crypto.publicEncrypt(recipient.publicKey, Buffer.from(fileContent));
    const signature = crypto.createSign('SHA256').update(fileContent).sign(privateKey, 'hex');

    const file = new File({
      senderId: sender._id,
      recipientId: recipient._id,
      content: cipher.toString('base64'),
      signature
    });
    await file.save();
    res.json({ message: 'File uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: 'File upload failed' });
  }
});

router.post('/download/:fileId', auth, async (req, res) => {
  const { privateKey } = req.body;
  try {
    const file = await File.findById(req.params.fileId);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.recipientId.toString() !== req.user.userId) return res.status(403).json({ error: 'Unauthorized' });

    const sender = await User.findById(file.senderId);
    const contentBuffer = Buffer.from(file.content, 'base64');
    const verify = crypto.createVerify('SHA256');
    verify.update(contentBuffer);
    verify.end();
    const isValid = verify.verify(sender.publicKey, file.signature, 'hex');
    if (!isValid) return res.status(400).json({ error: 'Invalid signature' });

    const decipher = crypto.privateDecrypt(privateKey, contentBuffer);
    res.json({ content: decipher.toString() });
  } catch (err) {
    res.status(500).json({ error: 'File download failed' });
  }
});

router.get('/list', auth, async (req, res) => {
  try {
    const files = await File.find({ recipientId: req.user.userId }).populate('senderId', 'username');
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch files' });
  }
});

module.exports = router;
