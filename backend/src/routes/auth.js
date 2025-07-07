const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');

const db = require('../config/database');
const { ca } = require('../utils/certificate');
const { authenticateToken, auditLog } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Input validation rules
const registerValidation = [
    body('username')
        .isLength({ min: 3, max: 50 })
        .isAlphanumeric()
        .withMessage('Username must be 3-50 characters and alphanumeric'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('password')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must be at least 8 characters with uppercase, lowercase, number and special character'),
    body('publicKey')
        .notEmpty()
        .withMessage('Public key is required')
];

const loginValidation = [
    body('username').notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
];

// @route   POST /api/auth/register
// @desc    Register new user with PKI certificate
// @access  Public
router.post('/register', registerValidation, auditLog('USER_REGISTER', 'user'), async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { username, email, password, publicKey } = req.body;

        // Check if user already exists
        const existingUserQuery = 'SELECT id FROM users WHERE username = $1 OR email = $2';
        const existingUser = await db.query(existingUserQuery, [username, email]);

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username or email already exists'
            });
        }

        // Generate salt and hash password
        const salt = await bcrypt.genSalt(12);
        const passwordHash = await bcrypt.hash(password, salt);

        // Generate certificate for user
        const userInfo = { username, email };
        const certificateData = await ca.generateUserCertificate(userInfo, publicKey);

        // Insert user into database
        const insertUserQuery = `
            INSERT INTO users (username, email, password_hash, salt, public_key, certificate, certificate_serial)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id, username, email, created_at
        `;

        const userValues = [
            username,
            email,
            passwordHash,
            salt,
            publicKey,
            certificateData.certificate,
            certificateData.serialNumber
        ];

        const result = await db.query(insertUserQuery, userValues);
        const newUser = result.rows[0];

        logger.info(`New user registered: ${username} (${email})`);

        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            data: {
                user: {
                    id: newUser.id,
                    username: newUser.username,
                    email: newUser.email,
                    createdAt: newUser.created_at
                },
                certificate: certificateData.certificate,
                serialNumber: certificateData.serialNumber
            }
        });

    } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Registration failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   POST /api/auth/login
// @desc    Authenticate user and return JWT
// @access  Public
router.post('/login', loginValidation, auditLog('USER_LOGIN', 'user'), async (req, res) => {
    try {
        // Check validation errors
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { username, password } = req.body;

        // Find user by username
        const userQuery = 'SELECT id, username, email, password_hash, public_key, certificate, is_active FROM users WHERE username = $1';
        const userResult = await db.query(userQuery, [username]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        const user = userResult.rows[0];

        // Check if user is active
        if (!user.is_active) {
            return res.status(401).json({
                success: false,
                message: 'Account is disabled'
            });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Create session token
        const sessionToken = uuidv4();
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Insert session into database
        const sessionQuery = `
            INSERT INTO user_sessions (user_id, session_token, expires_at, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await db.query(sessionQuery, [user.id, sessionToken, expiresAt, req.ip, req.get('User-Agent')]);

        // Generate JWT token
        const jwtPayload = {
            userId: user.id,
            username: user.username,
            sessionToken: sessionToken
        };

        const token = jwt.sign(jwtPayload, process.env.JWT_SECRET || 'your_jwt_secret_key_here_2024', {
            expiresIn: '24h'
        });

        // Update last login
        await db.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

        logger.info(`User logged in: ${username}`);

        res.json({
            success: true,
            message: 'Login successful',
            data: {
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                },
                publicKey: user.public_key,
                certificate: user.certificate
            }
        });

    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// @route   POST /api/auth/logout
// @desc    Logout user and invalidate session
// @access  Private
router.post('/logout', authenticateToken, auditLog('USER_LOGOUT', 'user'), async (req, res) => {
    try {
        // Invalidate current session
        const query = 'UPDATE user_sessions SET is_active = false WHERE session_token = $1';
        await db.query(query, [req.sessionToken]);

        logger.info(`User logged out: ${req.user.username}`);

        res.json({
            success: true,
            message: 'Logout successful'
        });

    } catch (error) {
        logger.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
});

// @route   GET /api/auth/profile
// @desc    Get current user profile
// @access  Private
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT id, username, email, public_key, certificate, certificate_serial, created_at, last_login
            FROM users WHERE id = $1
        `;
        const result = await db.query(query, [req.user.id]);
        const user = result.rows[0];

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    publicKey: user.public_key,
                    certificate: user.certificate,
                    certificateSerial: user.certificate_serial,
                    createdAt: user.created_at,
                    lastLogin: user.last_login
                }
            }
        });

    } catch (error) {
        logger.error('Profile fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch profile'
        });
    }
});

// @route   POST /api/auth/change-password
// @desc    Change user password
// @access  Private
router.post('/change-password', authenticateToken, [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 8 })
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('New password must be at least 8 characters with uppercase, lowercase, number and special character')
], auditLog('PASSWORD_CHANGE', 'user'), async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { currentPassword, newPassword } = req.body;

        // Get current password hash
        const userQuery = 'SELECT password_hash FROM users WHERE id = $1';
        const userResult = await db.query(userQuery, [req.user.id]);
        const user = userResult.rows[0];

        // Verify current password
        const isValidPassword = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(12);
        const newPasswordHash = await bcrypt.hash(newPassword, salt);

        // Update password
        const updateQuery = 'UPDATE users SET password_hash = $1, salt = $2, updated_at = NOW() WHERE id = $3';
        await db.query(updateQuery, [newPasswordHash, salt, req.user.id]);

        // Invalidate all existing sessions except current
        await db.query(
            'UPDATE user_sessions SET is_active = false WHERE user_id = $1 AND session_token != $2',
            [req.user.id, req.sessionToken]
        );

        logger.info(`Password changed for user: ${req.user.username}`);

        res.json({
            success: true,
            message: 'Password changed successfully'
        });

    } catch (error) {
        logger.error('Password change error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change password'
        });
    }
});

// @route   GET /api/auth/ca-certificate
// @desc    Get Certificate Authority certificate for verification
// @access  Public
router.get('/ca-certificate', async (req, res) => {
    try {
        const caCertificate = ca.getCACertificate();
        
        if (!caCertificate) {
            return res.status(500).json({
                success: false,
                message: 'CA certificate not available'
            });
        }

        res.json({
            success: true,
            data: {
                certificate: caCertificate
            }
        });

    } catch (error) {
        logger.error('CA certificate fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch CA certificate'
        });
    }
});

// @route   POST /api/auth/verify-certificate
// @desc    Verify a certificate against CA
// @access  Public
router.post('/verify-certificate', [
    body('certificate').notEmpty().withMessage('Certificate is required')
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

        const { certificate } = req.body;
        const verification = await ca.verifyCertificate(certificate);

        res.json({
            success: true,
            data: verification
        });

    } catch (error) {
        logger.error('Certificate verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Certificate verification failed'
        });
    }
});

module.exports = router;