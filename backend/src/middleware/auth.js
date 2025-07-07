const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { ca } = require('../utils/certificate');
const logger = require('../utils/logger');

// JWT Authentication middleware
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Access token required'
            });
        }

        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here_2024');
        
        // Check if user still exists and is active
        const userQuery = 'SELECT id, username, email, is_active FROM users WHERE id = $1 AND is_active = true';
        const userResult = await db.query(userQuery, [decoded.userId]);
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found or inactive'
            });
        }

        // Check if session is still valid
        const sessionQuery = 'SELECT id FROM user_sessions WHERE user_id = $1 AND session_token = $2 AND expires_at > NOW() AND is_active = true';
        const sessionResult = await db.query(sessionQuery, [decoded.userId, decoded.sessionToken]);
        
        if (sessionResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Session expired or invalid'
            });
        }

        req.user = userResult.rows[0];
        req.sessionToken = decoded.sessionToken;
        next();

    } catch (error) {
        logger.error('Authentication error:', error);
        
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: 'Invalid access token'
            });
        }
        
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: 'Access token expired'
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Authentication failed'
        });
    }
};

// Certificate-based authentication middleware
const authenticateCertificate = async (req, res, next) => {
    try {
        const certificatePem = req.headers['x-client-certificate'];
        
        if (!certificatePem) {
            return res.status(401).json({
                success: false,
                message: 'Client certificate required'
            });
        }

        // Verify certificate with CA
        const verification = await ca.verifyCertificate(certificatePem);
        
        if (!verification.valid) {
            let message = 'Invalid certificate';
            if (verification.expired) message = 'Certificate expired';
            if (verification.revoked) message = 'Certificate revoked';
            
            return res.status(401).json({
                success: false,
                message
            });
        }

        // Extract user information from certificate
        const cert = verification.certificate;
        const commonName = cert.subject.getField('CN').value;
        const email = cert.subject.getField('emailAddress')?.value;

        // Find user by certificate serial number
        const userQuery = 'SELECT id, username, email, is_active FROM users WHERE certificate_serial = $1 AND is_active = true';
        const userResult = await db.query(userQuery, [cert.serialNumber]);
        
        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'User not found for certificate'
            });
        }

        req.user = userResult.rows[0];
        req.certificate = cert;
        next();

    } catch (error) {
        logger.error('Certificate authentication error:', error);
        return res.status(500).json({
            success: false,
            message: 'Certificate authentication failed'
        });
    }
};

// Optional authentication - continues even if no auth provided
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (token) {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here_2024');
            
            const userQuery = 'SELECT id, username, email, is_active FROM users WHERE id = $1 AND is_active = true';
            const userResult = await db.query(userQuery, [decoded.userId]);
            
            if (userResult.rows.length > 0) {
                req.user = userResult.rows[0];
            }
        }
        
        next();
    } catch (error) {
        // Continue without authentication
        next();
    }
};

// Check if user has access to specific resource
const checkResourceAccess = (resourceType) => {
    return async (req, res, next) => {
        try {
            const resourceId = req.params.id;
            const userId = req.user.id;

            let query;
            let params;

            switch (resourceType) {
                case 'file':
                    query = `
                        SELECT f.id FROM files f
                        LEFT JOIN file_shares fs ON f.id = fs.file_id
                        WHERE f.id = $1 AND (
                            f.owner_id = $2 OR 
                            (fs.shared_with_user_id = $2 AND fs.is_active = true AND (fs.expires_at IS NULL OR fs.expires_at > NOW()))
                        )
                    `;
                    params = [resourceId, userId];
                    break;
                
                case 'message':
                    query = 'SELECT id FROM messages WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2)';
                    params = [resourceId, userId];
                    break;
                
                default:
                    return res.status(400).json({
                        success: false,
                        message: 'Invalid resource type'
                    });
            }

            const result = await db.query(query, params);
            
            if (result.rows.length === 0) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied to this resource'
                });
            }

            next();

        } catch (error) {
            logger.error('Resource access check error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to check resource access'
            });
        }
    };
};

// Admin role middleware
const requireAdmin = async (req, res, next) => {
    try {
        if (req.user.username !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Admin access required'
            });
        }
        next();
    } catch (error) {
        logger.error('Admin check error:', error);
        return res.status(500).json({
            success: false,
            message: 'Admin check failed'
        });
    }
};

// Audit logging middleware
const auditLog = (action, resourceType) => {
    return async (req, res, next) => {
        const originalSend = res.json;
        
        res.json = function(data) {
            // Log the action after response
            setImmediate(async () => {
                try {
                    const query = `
                        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, ip_address, user_agent, success, details)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `;
                    
                    const values = [
                        req.user?.id || null,
                        action,
                        resourceType,
                        req.params.id || null,
                        req.ip,
                        req.get('User-Agent'),
                        data.success || false,
                        JSON.stringify({
                            method: req.method,
                            path: req.path,
                            params: req.params,
                            query: req.query
                        })
                    ];
                    
                    await db.query(query, values);
                } catch (error) {
                    logger.error('Audit logging error:', error);
                }
            });
            
            originalSend.call(this, data);
        };
        
        next();
    };
};

module.exports = {
    authenticateToken,
    authenticateCertificate,
    optionalAuth,
    checkResourceAccess,
    requireAdmin,
    auditLog
};