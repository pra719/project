const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const crypto = require('crypto');
const auth = require('../middleware/auth');

router.post('/send', auth, async (req, res) => {
  const { recipientUsername, content, privateKey } = req.body;
  try {
    const sender = await User.findById(req.user.userId);
    const recipient = await User.findOne({ username: recipientUsername });
    if (!recipient) return res.status(404).json({ error: 'Recipient not found' });

    const cipher = crypto.publicEncrypt(recipient.publicKey, Buffer.from(content));
    const signature = crypto.createSign('SHA256').update(content).sign(privateKey, 'hex');

    const message = new Message({
      senderId: sender._id,
      recipientId: recipient._id,
      content: cipher.toString('base64'),
      signature
    });
    await message.save();
    res.json({ message: 'Message sent successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Message sending failed' });
  }
});

router.post('/view/:messageId', auth, async (req, res) => {
  const { privateKey } = req.body;
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ error: 'Message not found' });
    if (message.recipientId.toString() !== req.user.userId) return res.status(403).json({ error: 'Unauthorized' });

    const sender = await User.findById(message.senderId);
    const contentBuffer = Buffer.from(message.content, 'base64');
    const verify = crypto.createVerify('SHA256');
    verify.update(contentBuffer);
    verify.end();
    const isValid = verify.verify(sender.publicKey, message.signature, 'hex');
    if (!isValid) return res.status(400).json({ error: 'Invalid signature' });

    const decipher = crypto.privateDecrypt(privateKey, contentBuffer);
    res.json({ content: decipher.toString() });
  } catch (err) {
    res.status(500).json({ error: 'Message view failed' });
  }
});

router.get('/list', auth, async (req, res) => {
  try {
    const messages = await Message.find({ recipientId: req.user.userId }).populate('senderId', 'username');
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;
