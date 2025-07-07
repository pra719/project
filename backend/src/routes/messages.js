const express = require('express');
const { body, validationResult } = require('express-validator');

const db = require('../config/database');
const { CryptoUtils } = require('../utils/certificate');
const { authenticateToken, checkResourceAccess, auditLog } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @route   POST /api/messages/send
// @desc    Send encrypted message to another user
// @access  Private
router.post('/send', authenticateToken, [
    body('recipientUsername').notEmpty().withMessage('Recipient username is required'),
    body('content').notEmpty().withMessage('Message content is required'),
    body('privateKey').notEmpty().withMessage('Private key required for signing')
], auditLog('MESSAGE_SEND', 'message'), async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { recipientUsername, content, privateKey } = req.body;

        // Get recipient user and their public key
        const recipientQuery = 'SELECT id, username, public_key FROM users WHERE username = $1 AND is_active = true';
        const recipientResult = await db.query(recipientQuery, [recipientUsername]);

        if (recipientResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Recipient user not found'
            });
        }

        const recipient = recipientResult.rows[0];

        // Prevent sending message to self
        if (recipient.id === req.user.id) {
            return res.status(400).json({
                success: false,
                message: 'Cannot send message to yourself'
            });
        }

        // Encrypt message content with recipient's public key
        const encryptedContent = CryptoUtils.encryptWithPublicKey(content, recipient.public_key);

        // Create digital signature of the message
        const signature = CryptoUtils.signData(content, privateKey);

        // Calculate message hash for integrity
        const messageHash = CryptoUtils.hashData(content);

        // Save message to database
        const insertMessageQuery = `
            INSERT INTO messages (sender_id, recipient_id, encrypted_content, signature, message_hash)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, created_at
        `;

        const messageValues = [
            req.user.id,
            recipient.id,
            encryptedContent,
            signature,
            messageHash
        ];

        const result = await db.query(insertMessageQuery, messageValues);
        const newMessage = result.rows[0];

        logger.info(`Message sent from ${req.user.username} to ${recipientUsername}`);

        res.status(201).json({
            success: true,
            message: 'Message sent successfully',
            data: {
                messageId: newMessage.id,
                recipientUsername: recipient.username,
                sentAt: newMessage.created_at
            }
        });

    } catch (error) {
        logger.error('Message send error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send message',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/messages
// @desc    Get user's messages (inbox and outbox)
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, type = 'all' } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = '';
        let params = [req.user.id];

        switch (type) {
            case 'inbox':
                whereClause = 'WHERE m.recipient_id = $1';
                break;
            case 'outbox':
                whereClause = 'WHERE m.sender_id = $1';
                break;
            case 'all':
            default:
                whereClause = 'WHERE (m.sender_id = $1 OR m.recipient_id = $1)';
                break;
        }

        const query = `
            SELECT m.id, m.encrypted_content, m.signature, m.is_read, m.created_at, m.read_at,
                   s.username as sender_username, s.id as sender_id,
                   r.username as recipient_username, r.id as recipient_id,
                   CASE 
                       WHEN m.sender_id = $1 THEN 'sent'
                       WHEN m.recipient_id = $1 THEN 'received'
                   END as message_type
            FROM messages m
            JOIN users s ON m.sender_id = s.id
            JOIN users r ON m.recipient_id = r.id
            ${whereClause}
            ORDER BY m.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        params.push(limit, offset);
        const result = await db.query(query, params);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM messages m
            ${whereClause}
        `;
        const countResult = await db.query(countQuery, [req.user.id]);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            data: {
                messages: result.rows.map(message => ({
                    id: message.id,
                    senderUsername: message.sender_username,
                    recipientUsername: message.recipient_username,
                    messageType: message.message_type,
                    isRead: message.is_read,
                    createdAt: message.created_at,
                    readAt: message.read_at,
                    hasSignature: !!message.signature
                })),
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(total / limit),
                    count: result.rows.length,
                    totalMessages: total
                }
            }
        });

    } catch (error) {
        logger.error('Messages fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch messages'
        });
    }
});

// @route   GET /api/messages/:id
// @desc    Get specific message with decryption
// @access  Private
router.get('/:id', authenticateToken, checkResourceAccess('message'), [
    body('privateKey').optional().isString().withMessage('Private key must be a string')
], async (req, res) => {
    try {
        const messageId = req.params.id;
        const { privateKey } = req.query;

        const query = `
            SELECT m.*, 
                   s.username as sender_username, s.public_key as sender_public_key,
                   r.username as recipient_username
            FROM messages m
            JOIN users s ON m.sender_id = s.id
            JOIN users r ON m.recipient_id = r.id
            WHERE m.id = $1
        `;

        const result = await db.query(query, [messageId]);
        const message = result.rows[0];

        let decryptedContent = null;
        let signatureValid = null;

        // Decrypt content if private key is provided and user is recipient
        if (privateKey && message.recipient_id === req.user.id) {
            try {
                decryptedContent = CryptoUtils.decryptWithPrivateKey(message.encrypted_content, privateKey);
                
                // Verify message signature if available
                if (message.signature) {
                    signatureValid = CryptoUtils.verifySignature(decryptedContent, message.signature, message.sender_public_key);
                    
                    // Verify message integrity
                    const currentHash = CryptoUtils.hashData(decryptedContent);
                    if (currentHash !== message.message_hash) {
                        logger.warn(`Message integrity check failed for message ${messageId}`);
                        return res.status(400).json({
                            success: false,
                            message: 'Message integrity verification failed'
                        });
                    }
                }

                // Mark message as read if user is recipient and it's unread
                if (message.recipient_id === req.user.id && !message.is_read) {
                    await db.query(
                        'UPDATE messages SET is_read = true, read_at = NOW() WHERE id = $1',
                        [messageId]
                    );
                }

            } catch (decryptError) {
                logger.error('Message decryption error:', decryptError);
                return res.status(400).json({
                    success: false,
                    message: 'Failed to decrypt message - invalid private key'
                });
            }
        }

        res.json({
            success: true,
            data: {
                message: {
                    id: message.id,
                    senderUsername: message.sender_username,
                    recipientUsername: message.recipient_username,
                    content: decryptedContent, // null if not decrypted
                    hasSignature: !!message.signature,
                    signatureValid: signatureValid,
                    isRead: message.is_read,
                    createdAt: message.created_at,
                    readAt: message.read_at
                }
            }
        });

    } catch (error) {
        logger.error('Message fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch message'
        });
    }
});

// @route   POST /api/messages/:id/verify-signature
// @desc    Verify digital signature of a message
// @access  Private
router.post('/:id/verify-signature', authenticateToken, checkResourceAccess('message'), [
    body('privateKey').notEmpty().withMessage('Private key required for message decryption')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const messageId = req.params.id;
        const { privateKey } = req.body;

        // Get message with sender's public key
        const query = `
            SELECT m.*, s.public_key as sender_public_key, s.username as sender_username
            FROM messages m
            JOIN users s ON m.sender_id = s.id
            WHERE m.id = $1 AND m.signature IS NOT NULL
        `;

        const result = await db.query(query, [messageId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Signed message not found'
            });
        }

        const message = result.rows[0];

        // Only recipient can verify signature (needs to decrypt first)
        if (message.recipient_id !== req.user.id) {
            return res.status(403).json({
                success: false,
                message: 'Only message recipient can verify signature'
            });
        }

        // Decrypt message content
        const decryptedContent = CryptoUtils.decryptWithPrivateKey(message.encrypted_content, privateKey);

        // Verify signature
        const isValid = CryptoUtils.verifySignature(decryptedContent, message.signature, message.sender_public_key);

        // Verify message integrity
        const currentHash = CryptoUtils.hashData(decryptedContent);
        const integrityValid = currentHash === message.message_hash;

        res.json({
            success: true,
            data: {
                signatureValid: isValid,
                integrityValid: integrityValid,
                signer: message.sender_username,
                signedAt: message.created_at
            }
        });

    } catch (error) {
        logger.error('Message signature verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify message signature'
        });
    }
});

// @route   DELETE /api/messages/:id
// @desc    Delete a message
// @access  Private
router.delete('/:id', authenticateToken, checkResourceAccess('message'), auditLog('MESSAGE_DELETE', 'message'), async (req, res) => {
    try {
        const messageId = req.params.id;

        // Users can only delete messages they sent or received
        const deleteQuery = 'DELETE FROM messages WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2)';
        const result = await db.query(deleteQuery, [messageId, req.user.id]);

        if (result.rowCount === 0) {
            return res.status(404).json({
                success: false,
                message: 'Message not found or access denied'
            });
        }

        logger.info(`Message ${messageId} deleted by user ${req.user.username}`);

        res.json({
            success: true,
            message: 'Message deleted successfully'
        });

    } catch (error) {
        logger.error('Message deletion error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete message'
        });
    }
});

// @route   GET /api/messages/conversations/:username
// @desc    Get conversation between current user and another user
// @access  Private
router.get('/conversations/:username', authenticateToken, async (req, res) => {
    try {
        const { username } = req.params;
        const { page = 1, limit = 50 } = req.query;
        const offset = (page - 1) * limit;

        // Get the other user
        const userQuery = 'SELECT id FROM users WHERE username = $1 AND is_active = true';
        const userResult = await db.query(userQuery, [username]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const otherUserId = userResult.rows[0].id;

        // Get conversation messages
        const query = `
            SELECT m.id, m.encrypted_content, m.signature, m.is_read, m.created_at,
                   s.username as sender_username,
                   r.username as recipient_username,
                   CASE 
                       WHEN m.sender_id = $1 THEN 'sent'
                       WHEN m.recipient_id = $1 THEN 'received'
                   END as message_type
            FROM messages m
            JOIN users s ON m.sender_id = s.id
            JOIN users r ON m.recipient_id = r.id
            WHERE (m.sender_id = $1 AND m.recipient_id = $2) OR (m.sender_id = $2 AND m.recipient_id = $1)
            ORDER BY m.created_at DESC
            LIMIT $3 OFFSET $4
        `;

        const result = await db.query(query, [req.user.id, otherUserId, limit, offset]);

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM messages m
            WHERE (m.sender_id = $1 AND m.recipient_id = $2) OR (m.sender_id = $2 AND m.recipient_id = $1)
        `;
        const countResult = await db.query(countQuery, [req.user.id, otherUserId]);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            data: {
                conversation: {
                    withUser: username,
                    messages: result.rows.map(message => ({
                        id: message.id,
                        senderUsername: message.sender_username,
                        recipientUsername: message.recipient_username,
                        messageType: message.message_type,
                        isRead: message.is_read,
                        createdAt: message.created_at,
                        hasSignature: !!message.signature
                    }))
                },
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(total / limit),
                    count: result.rows.length,
                    totalMessages: total
                }
            }
        });

    } catch (error) {
        logger.error('Conversation fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch conversation'
        });
    }
});

// @route   GET /api/messages/stats
// @desc    Get message statistics for current user
// @access  Private
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(CASE WHEN recipient_id = $1 THEN 1 END) as received_count,
                COUNT(CASE WHEN sender_id = $1 THEN 1 END) as sent_count,
                COUNT(CASE WHEN recipient_id = $1 AND is_read = false THEN 1 END) as unread_count,
                COUNT(CASE WHEN signature IS NOT NULL THEN 1 END) as signed_count
            FROM messages
            WHERE sender_id = $1 OR recipient_id = $1
        `;

        const result = await db.query(statsQuery, [req.user.id]);
        const stats = result.rows[0];

        res.json({
            success: true,
            data: {
                statistics: {
                    totalReceived: parseInt(stats.received_count),
                    totalSent: parseInt(stats.sent_count),
                    unreadMessages: parseInt(stats.unread_count),
                    signedMessages: parseInt(stats.signed_count)
                }
            }
        });

    } catch (error) {
        logger.error('Message stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch message statistics'
        });
    }
});

module.exports = router;