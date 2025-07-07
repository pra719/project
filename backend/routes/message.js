const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const CryptoUtils = require('../utils/crypto');
const { authenticateToken } = require('../middleware/auth');

// Send encrypted message
router.post('/send', authenticateToken, async (req, res) => {
  try {
    const { recipientUsername, content, privateKey } = req.body;

    if (!recipientUsername || !content || !privateKey) {
      return res.status(400).json({ 
        error: 'Recipient username, content, and private key are required' 
      });
    }

    // Find recipient
    const recipient = await User.findOne({ username: recipientUsername });
    if (!recipient) {
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Generate AES key for message encryption
    const aesKey = CryptoUtils.generateAESKey();
    
    // Encrypt message content with AES
    const encryptedMessage = CryptoUtils.encryptAES(content, aesKey);
    
    // Encrypt AES key with recipient's public key
    const encryptedKey = CryptoUtils.encryptRSA(aesKey.toString('hex'), recipient.publicKey);
    
    // Create digital signature with sender's private key
    const signature = CryptoUtils.createSignature(content, privateKey);
    
    // Generate message hash for integrity
    const messageHash = CryptoUtils.generateHash(content);

    // Create message record
    const message = new Message({
      sender: req.user._id,
      recipient: recipient._id,
      encryptedContent: encryptedMessage.encryptedData,
      encryptedKey: encryptedKey,
      digitalSignature: signature,
      messageHash: messageHash
    });

    await message.save();

    res.json({
      success: true,
      message: 'Message sent successfully',
      data: {
        messageId: message._id,
        recipient: recipient.username,
        timestamp: message.timestamp
      }
    });

  } catch (error) {
    console.error('Message sending error:', error);
    res.status(500).json({ 
      error: 'Message sending failed',
      details: error.message
    });
  }
});

// View/decrypt message
router.post('/view/:messageId', authenticateToken, async (req, res) => {
  try {
    const { privateKey } = req.body;
    
    if (!privateKey) {
      return res.status(400).json({ error: 'Private key required for decryption' });
    }

    const message = await Message.findById(req.params.messageId)
      .populate('sender', 'username publicKey')
      .populate('recipient', 'username');
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is the recipient
    if (message.recipient._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied - not message recipient' });
    }

    // Decrypt AES key with recipient's private key
    const aesKeyHex = CryptoUtils.decryptRSA(message.encryptedKey, privateKey);
    const aesKey = Buffer.from(aesKeyHex, 'hex');

    // Decrypt message content
    const decryptedContent = CryptoUtils.decryptAES(message.encryptedContent, aesKey);

    // Verify digital signature
    const isValidSignature = CryptoUtils.verifySignature(
      decryptedContent,
      message.digitalSignature,
      message.sender.publicKey
    );

    if (!isValidSignature) {
      return res.status(400).json({ 
        error: 'Message integrity check failed - invalid signature' 
      });
    }

    // Verify message hash
    const currentHash = CryptoUtils.generateHash(decryptedContent);
    if (currentHash !== message.messageHash) {
      return res.status(400).json({ 
        error: 'Message integrity check failed - hash mismatch' 
      });
    }

    // Mark message as read
    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      await message.save();
    }

    res.json({
      success: true,
      data: {
        messageId: message._id,
        content: decryptedContent,
        sender: message.sender.username,
        timestamp: message.timestamp,
        readAt: message.readAt
      }
    });

  } catch (error) {
    console.error('Message view error:', error);
    res.status(500).json({ 
      error: 'Message view failed',
      details: error.message
    });
  }
});

// Get conversation between two users
router.get('/conversation/:username', authenticateToken, async (req, res) => {
  try {
    const { username } = req.params;
    
    const otherUser = await User.findOne({ username });
    if (!otherUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get messages between current user and the other user
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: otherUser._id },
        { sender: otherUser._id, recipient: req.user._id }
      ]
    })
    .populate('sender', 'username')
    .populate('recipient', 'username')
    .select('-encryptedContent -encryptedKey -digitalSignature -messageHash')
    .sort({ timestamp: 1 });

    res.json({
      success: true,
      data: {
        conversation: messages.map(msg => ({
          messageId: msg._id,
          sender: msg.sender.username,
          recipient: msg.recipient.username,
          timestamp: msg.timestamp,
          isRead: msg.isRead,
          readAt: msg.readAt,
          isSentByMe: msg.sender._id.toString() === req.user._id.toString()
        })),
        otherUser: username
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// List all conversations for a user
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    // Get all messages where user is either sender or recipient
    const messages = await Message.find({
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id }
      ]
    })
    .populate('sender', 'username')
    .populate('recipient', 'username')
    .select('-encryptedContent -encryptedKey -digitalSignature -messageHash')
    .sort({ timestamp: -1 });

    // Group by conversation partner
    const conversations = {};
    
    messages.forEach(msg => {
      const partnerId = msg.sender._id.toString() === req.user._id.toString() 
        ? msg.recipient._id.toString() 
        : msg.sender._id.toString();
      
      const partnerName = msg.sender._id.toString() === req.user._id.toString() 
        ? msg.recipient.username 
        : msg.sender.username;

      if (!conversations[partnerId]) {
        conversations[partnerId] = {
          partnerId,
          partnerName,
          lastMessage: {
            timestamp: msg.timestamp,
            isSentByMe: msg.sender._id.toString() === req.user._id.toString(),
            isRead: msg.isRead
          },
          unreadCount: 0
        };
      }

      // Count unread messages received from this partner
      if (msg.recipient._id.toString() === req.user._id.toString() && !msg.isRead) {
        conversations[partnerId].unreadCount++;
      }
    });

    res.json({
      success: true,
      data: {
        conversations: Object.values(conversations)
      }
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Mark message as read
router.patch('/read/:messageId', authenticateToken, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if user is the recipient
    if (message.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!message.isRead) {
      message.isRead = true;
      message.readAt = new Date();
      await message.save();
    }

    res.json({
      success: true,
      message: 'Message marked as read'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to mark message as read' });
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
      return res.status(403).json({ error: 'Only message sender can delete the message' });
    }

    await Message.findByIdAndDelete(req.params.messageId);

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });

  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

module.exports = router;
