const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const CryptoUtils = require('../utils/crypto');
const { authenticateToken } = require('../middleware/auth');

// Send encrypted message
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { recipient, encryptedContent, signature } = req.body;
    
    if (!recipient || !encryptedContent || !signature) {
      return res.status(400).json({ 
        error: 'Recipient, encrypted content, and signature are required' 
      });
    }

    // Find recipient user
    const recipientUser = await User.findOne({ username: recipient });
    if (!recipientUser) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Create message
    const message = new Message({
      sender: req.user._id,
      recipient: recipientUser._id,
      encryptedContent,
      digitalSignature: signature,
      timestamp: new Date()
    });

    await message.save();

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        messageId: message._id,
        recipient: recipientUser.username,
        timestamp: message.timestamp
      }
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ 
      error: 'Failed to send message',
      details: error.message
    });
  }
});

// List messages for user (sent and received)
router.get('/list', authenticateToken, async (req, res) => {
  try {
    // Get messages where user is sender or recipient
    const messages = await Message.find({
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id }
      ]
    })
    .populate('sender', 'username')
    .populate('recipient', 'username')
    .sort({ timestamp: -1 });

    res.json({
      success: true,
      data: messages.map(message => ({
        _id: message._id,
        sender: message.sender,
        recipient: message.recipient,
        encryptedContent: message.encryptedContent,
        digitalSignature: message.digitalSignature,
        timestamp: message.timestamp,
        createdAt: message.createdAt
      }))
    });

  } catch (error) {
    console.error('List messages error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch messages',
      details: error.message
    });
  }
});

// Delete message (sender only)
router.delete('/:messageId', authenticateToken, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender can delete the message
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only message sender can delete this message' });
    }

    await Message.findByIdAndDelete(req.params.messageId);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ 
      error: 'Failed to delete message',
      details: error.message
    });
  }
});

module.exports = router;
