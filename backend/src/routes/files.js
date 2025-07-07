const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const db = require('../config/database');
const { CryptoUtils } = require('../utils/certificate');
const { authenticateToken, checkResourceAccess, auditLog } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
        const encryptedName = uuidv4() + '.enc';
        cb(null, encryptedName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow all file types but scan for malicious content in production
        cb(null, true);
    }
});

// @route   POST /api/files/upload
// @desc    Upload and encrypt a file
// @access  Private
router.post('/upload', authenticateToken, upload.single('file'), auditLog('FILE_UPLOAD', 'file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file provided'
            });
        }

        const { originalname, filename, size, mimetype, path: filePath } = req.file;
        const { signFile = false } = req.body;

        // Read the uploaded file
        const fileData = await fs.readFile(filePath);

        // Generate AES key for file encryption
        const aesKey = CryptoUtils.generateAESKey();

        // Encrypt the file with AES
        const encryptedFile = CryptoUtils.encryptAES(fileData.toString('base64'), aesKey);

        // Save encrypted file
        await fs.writeFile(filePath, encryptedFile.encrypted);

        // Get user's public key for encrypting the AES key
        const userQuery = 'SELECT public_key FROM users WHERE id = $1';
        const userResult = await db.query(userQuery, [req.user.id]);
        const userPublicKey = userResult.rows[0].public_key;

        // Encrypt AES key with user's public key
        const encryptedKey = CryptoUtils.encryptWithPublicKey(aesKey, userPublicKey);

        // Calculate file hash for integrity
        const fileHash = CryptoUtils.hashData(fileData);

        // Generate digital signature if requested
        let signature = null;
        if (signFile) {
            // For signing, we need user's private key (should be sent from client)
            const { privateKey } = req.body;
            if (privateKey) {
                signature = CryptoUtils.signData(fileData.toString('base64'), privateKey);
            }
        }

        // Save file metadata to database
        const insertFileQuery = `
            INSERT INTO files (original_name, encrypted_name, file_size, file_type, encrypted_key, file_hash, owner_id, upload_path, is_signed, signature)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING id, original_name, file_size, file_type, is_signed, created_at
        `;

        const fileValues = [
            originalname,
            filename,
            size,
            mimetype,
            encryptedKey,
            fileHash,
            req.user.id,
            filePath,
            signFile,
            signature
        ];

        const result = await db.query(insertFileQuery, fileValues);
        const newFile = result.rows[0];

        logger.info(`File uploaded: ${originalname} by user ${req.user.username}`);

        res.status(201).json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                file: {
                    id: newFile.id,
                    originalName: newFile.original_name,
                    fileSize: newFile.file_size,
                    fileType: newFile.file_type,
                    isSigned: newFile.is_signed,
                    createdAt: newFile.created_at
                }
            }
        });

    } catch (error) {
        logger.error('File upload error:', error);
        
        // Clean up uploaded file on error
        if (req.file) {
            try {
                await fs.unlink(req.file.path);
            } catch (unlinkError) {
                logger.error('Failed to clean up uploaded file:', unlinkError);
            }
        }

        res.status(500).json({
            success: false,
            message: 'File upload failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   GET /api/files
// @desc    Get user's files
// @access  Private
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, type = 'all' } = req.query;
        const offset = (page - 1) * limit;

        let query = `
            SELECT f.id, f.original_name, f.file_size, f.file_type, f.is_signed, f.created_at,
                   u.username as owner_username,
                   CASE WHEN f.owner_id = $1 THEN 'owner' ELSE 'shared' END as access_type
            FROM files f
            JOIN users u ON f.owner_id = u.id
            LEFT JOIN file_shares fs ON f.id = fs.file_id
            WHERE (f.owner_id = $1 OR (fs.shared_with_user_id = $1 AND fs.is_active = true AND (fs.expires_at IS NULL OR fs.expires_at > NOW())))
        `;

        const params = [req.user.id];

        if (type !== 'all') {
            if (type === 'owned') {
                query += ' AND f.owner_id = $1';
            } else if (type === 'shared') {
                query += ' AND f.owner_id != $1';
            }
        }

        query += ' ORDER BY f.created_at DESC LIMIT $2 OFFSET $3';
        params.push(limit, offset);

        const result = await db.query(query, params);

        // Get total count
        const countQuery = `
            SELECT COUNT(DISTINCT f.id) as total
            FROM files f
            LEFT JOIN file_shares fs ON f.id = fs.file_id
            WHERE (f.owner_id = $1 OR (fs.shared_with_user_id = $1 AND fs.is_active = true AND (fs.expires_at IS NULL OR fs.expires_at > NOW())))
        `;
        const countResult = await db.query(countQuery, [req.user.id]);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            data: {
                files: result.rows.map(file => ({
                    id: file.id,
                    originalName: file.original_name,
                    fileSize: file.file_size,
                    fileType: file.file_type,
                    isSigned: file.is_signed,
                    ownerUsername: file.owner_username,
                    accessType: file.access_type,
                    createdAt: file.created_at
                })),
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(total / limit),
                    count: result.rows.length,
                    totalFiles: total
                }
            }
        });

    } catch (error) {
        logger.error('Files fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch files'
        });
    }
});

// @route   GET /api/files/:id
// @desc    Get file details
// @access  Private
router.get('/:id', authenticateToken, checkResourceAccess('file'), async (req, res) => {
    try {
        const fileId = req.params.id;

        const query = `
            SELECT f.*, u.username as owner_username,
                   CASE WHEN f.owner_id = $2 THEN 'owner' ELSE 'shared' END as access_type
            FROM files f
            JOIN users u ON f.owner_id = u.id
            WHERE f.id = $1
        `;

        const result = await db.query(query, [fileId, req.user.id]);
        const file = result.rows[0];

        res.json({
            success: true,
            data: {
                file: {
                    id: file.id,
                    originalName: file.original_name,
                    fileSize: file.file_size,
                    fileType: file.file_type,
                    fileHash: file.file_hash,
                    isSigned: file.is_signed,
                    ownerUsername: file.owner_username,
                    accessType: file.access_type,
                    createdAt: file.created_at,
                    updatedAt: file.updated_at
                }
            }
        });

    } catch (error) {
        logger.error('File details fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch file details'
        });
    }
});

// @route   GET /api/files/:id/download
// @desc    Download and decrypt file
// @access  Private
router.get('/:id/download', authenticateToken, checkResourceAccess('file'), auditLog('FILE_DOWNLOAD', 'file'), async (req, res) => {
    try {
        const fileId = req.params.id;
        const { privateKey } = req.query; // Private key for decryption

        if (!privateKey) {
            return res.status(400).json({
                success: false,
                message: 'Private key required for file decryption'
            });
        }

        // Get file information
        const fileQuery = `
            SELECT f.*, 
                   CASE WHEN f.owner_id = $2 THEN f.encrypted_key 
                        ELSE fs.encrypted_file_key 
                   END as user_encrypted_key
            FROM files f
            LEFT JOIN file_shares fs ON f.id = fs.file_id AND fs.shared_with_user_id = $2
            WHERE f.id = $1
        `;

        const fileResult = await db.query(fileQuery, [fileId, req.user.id]);
        const file = fileResult.rows[0];

        // Decrypt the AES key with user's private key
        const aesKey = CryptoUtils.decryptWithPrivateKey(file.user_encrypted_key, privateKey);

        // Read and decrypt the file
        const encryptedFileData = await fs.readFile(file.upload_path, 'utf8');
        const decryptedData = CryptoUtils.decryptAES(encryptedFileData, aesKey, file.iv);

        // Convert back to buffer
        const fileBuffer = Buffer.from(decryptedData, 'base64');

        // Verify file integrity
        const currentHash = CryptoUtils.hashData(fileBuffer);
        if (currentHash !== file.file_hash) {
            logger.warn(`File integrity check failed for file ${fileId}`);
            return res.status(400).json({
                success: false,
                message: 'File integrity verification failed'
            });
        }

        // Set appropriate headers
        res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
        res.setHeader('Content-Type', file.file_type);
        res.setHeader('Content-Length', fileBuffer.length);

        res.send(fileBuffer);

    } catch (error) {
        logger.error('File download error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to download file'
        });
    }
});

// @route   POST /api/files/:id/share
// @desc    Share file with another user
// @access  Private
router.post('/:id/share', authenticateToken, checkResourceAccess('file'), [
    body('recipientUsername').notEmpty().withMessage('Recipient username is required'),
    body('accessLevel').isIn(['read', 'download']).withMessage('Invalid access level'),
    body('expiresAt').optional().isISO8601().withMessage('Invalid expiration date')
], auditLog('FILE_SHARE', 'file'), async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const fileId = req.params.id;
        const { recipientUsername, accessLevel, expiresAt, privateKey } = req.body;

        if (!privateKey) {
            return res.status(400).json({
                success: false,
                message: 'Private key required for file sharing'
            });
        }

        // Get recipient user
        const recipientQuery = 'SELECT id, public_key FROM users WHERE username = $1 AND is_active = true';
        const recipientResult = await db.query(recipientQuery, [recipientUsername]);

        if (recipientResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Recipient user not found'
            });
        }

        const recipient = recipientResult.rows[0];

        // Get file and decrypt AES key
        const fileQuery = 'SELECT encrypted_key FROM files WHERE id = $1 AND owner_id = $2';
        const fileResult = await db.query(fileQuery, [fileId, req.user.id]);
        const file = fileResult.rows[0];

        // Decrypt AES key with owner's private key
        const aesKey = CryptoUtils.decryptWithPrivateKey(file.encrypted_key, privateKey);

        // Encrypt AES key with recipient's public key
        const recipientEncryptedKey = CryptoUtils.encryptWithPublicKey(aesKey, recipient.public_key);

        // Check if share already exists
        const existingShareQuery = 'SELECT id FROM file_shares WHERE file_id = $1 AND shared_with_user_id = $2';
        const existingShare = await db.query(existingShareQuery, [fileId, recipient.id]);

        if (existingShare.rows.length > 0) {
            // Update existing share
            const updateQuery = `
                UPDATE file_shares 
                SET encrypted_file_key = $1, access_level = $2, expires_at = $3, is_active = true, created_at = NOW()
                WHERE file_id = $4 AND shared_with_user_id = $5
            `;
            await db.query(updateQuery, [recipientEncryptedKey, accessLevel, expiresAt || null, fileId, recipient.id]);
        } else {
            // Create new share
            const insertQuery = `
                INSERT INTO file_shares (file_id, shared_with_user_id, shared_by_user_id, encrypted_file_key, access_level, expires_at)
                VALUES ($1, $2, $3, $4, $5, $6)
            `;
            await db.query(insertQuery, [fileId, recipient.id, req.user.id, recipientEncryptedKey, accessLevel, expiresAt || null]);
        }

        logger.info(`File ${fileId} shared with user ${recipientUsername} by ${req.user.username}`);

        res.json({
            success: true,
            message: 'File shared successfully',
            data: {
                recipientUsername,
                accessLevel,
                expiresAt: expiresAt || null
            }
        });

    } catch (error) {
        logger.error('File sharing error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to share file'
        });
    }
});

// @route   POST /api/files/:id/verify-signature
// @desc    Verify digital signature of a file
// @access  Private
router.post('/:id/verify-signature', authenticateToken, checkResourceAccess('file'), [
    body('privateKey').notEmpty().withMessage('Private key required for file decryption')
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

        const fileId = req.params.id;
        const { privateKey } = req.body;

        // Get file information including signature and owner's public key
        const query = `
            SELECT f.*, u.public_key as owner_public_key,
                   CASE WHEN f.owner_id = $2 THEN f.encrypted_key 
                        ELSE fs.encrypted_file_key 
                   END as user_encrypted_key
            FROM files f
            JOIN users u ON f.owner_id = u.id
            LEFT JOIN file_shares fs ON f.id = fs.file_id AND fs.shared_with_user_id = $2
            WHERE f.id = $1 AND f.is_signed = true
        `;

        const result = await db.query(query, [fileId, req.user.id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Signed file not found'
            });
        }

        const file = result.rows[0];

        if (!file.signature) {
            return res.status(400).json({
                success: false,
                message: 'File does not have a digital signature'
            });
        }

        // Decrypt and get original file data
        const aesKey = CryptoUtils.decryptWithPrivateKey(file.user_encrypted_key, privateKey);
        const encryptedFileData = await fs.readFile(file.upload_path, 'utf8');
        const decryptedData = CryptoUtils.decryptAES(encryptedFileData, aesKey, file.iv);

        // Verify signature
        const isValid = CryptoUtils.verifySignature(decryptedData, file.signature, file.owner_public_key);

        res.json({
            success: true,
            data: {
                signatureValid: isValid,
                signer: file.owner_public_key ? 'File owner' : 'Unknown',
                signedAt: file.created_at
            }
        });

    } catch (error) {
        logger.error('Signature verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify signature'
        });
    }
});

// @route   DELETE /api/files/:id
// @desc    Delete a file
// @access  Private
router.delete('/:id', authenticateToken, auditLog('FILE_DELETE', 'file'), async (req, res) => {
    try {
        const fileId = req.params.id;

        // Only file owner can delete
        const fileQuery = 'SELECT upload_path FROM files WHERE id = $1 AND owner_id = $2';
        const fileResult = await db.query(fileQuery, [fileId, req.user.id]);

        if (fileResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'File not found or access denied'
            });
        }

        const file = fileResult.rows[0];

        // Delete file shares first (CASCADE should handle this)
        await db.query('DELETE FROM file_shares WHERE file_id = $1', [fileId]);

        // Delete file record
        await db.query('DELETE FROM files WHERE id = $1', [fileId]);

        // Delete physical file
        try {
            await fs.unlink(file.upload_path);
        } catch (unlinkError) {
            logger.warn('Failed to delete physical file:', unlinkError);
        }

        logger.info(`File ${fileId} deleted by user ${req.user.username}`);

        res.json({
            success: true,
            message: 'File deleted successfully'
        });

    } catch (error) {
        logger.error('File deletion error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete file'
        });
    }
});

module.exports = router;