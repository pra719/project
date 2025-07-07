const express = require('express');
const { query, validationResult } = require('express-validator');

const db = require('../config/database');
const { authenticateToken, requireAdmin, auditLog } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// @route   GET /api/users/search
// @desc    Search for users by username or email
// @access  Private
router.get('/search', authenticateToken, [
    query('q').isLength({ min: 2 }).withMessage('Search query must be at least 2 characters')
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

        const { q, limit = 10 } = req.query;
        const searchTerm = `%${q}%`;

        const query = `
            SELECT id, username, email, created_at
            FROM users 
            WHERE (username ILIKE $1 OR email ILIKE $1) 
            AND is_active = true 
            AND id != $2
            ORDER BY username
            LIMIT $3
        `;

        const result = await db.query(query, [searchTerm, req.user.id, limit]);

        res.json({
            success: true,
            data: {
                users: result.rows.map(user => ({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    createdAt: user.created_at
                }))
            }
        });

    } catch (error) {
        logger.error('User search error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search users'
        });
    }
});

// @route   GET /api/users/:username/public-key
// @desc    Get public key for a specific user
// @access  Private
router.get('/:username/public-key', authenticateToken, async (req, res) => {
    try {
        const { username } = req.params;

        const query = 'SELECT username, public_key, certificate FROM users WHERE username = $1 AND is_active = true';
        const result = await db.query(query, [username]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = result.rows[0];

        res.json({
            success: true,
            data: {
                username: user.username,
                publicKey: user.public_key,
                certificate: user.certificate
            }
        });

    } catch (error) {
        logger.error('Public key fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch public key'
        });
    }
});

// @route   GET /api/users/list
// @desc    Get list of all users (admin only)
// @access  Private (Admin)
router.get('/list', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, status = 'all' } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = 'WHERE username != $1'; // Exclude admin user
        const params = ['admin'];

        if (status === 'active') {
            whereClause += ' AND is_active = true';
        } else if (status === 'inactive') {
            whereClause += ' AND is_active = false';
        }

        const query = `
            SELECT id, username, email, is_active, created_at, last_login,
                   (SELECT COUNT(*) FROM files WHERE owner_id = u.id) as file_count,
                   (SELECT COUNT(*) FROM messages WHERE sender_id = u.id OR recipient_id = u.id) as message_count
            FROM users u
            ${whereClause}
            ORDER BY created_at DESC
            LIMIT $2 OFFSET $3
        `;

        params.push(limit, offset);
        const result = await db.query(query, params);

        // Get total count
        const countQuery = `SELECT COUNT(*) as total FROM users u ${whereClause}`;
        const countResult = await db.query(countQuery, ['admin']);
        const total = parseInt(countResult.rows[0].total);

        res.json({
            success: true,
            data: {
                users: result.rows.map(user => ({
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    isActive: user.is_active,
                    createdAt: user.created_at,
                    lastLogin: user.last_login,
                    fileCount: parseInt(user.file_count),
                    messageCount: parseInt(user.message_count)
                })),
                pagination: {
                    current: parseInt(page),
                    total: Math.ceil(total / limit),
                    count: result.rows.length,
                    totalUsers: total
                }
            }
        });

    } catch (error) {
        logger.error('User list fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user list'
        });
    }
});

// @route   GET /api/users/:id/details
// @desc    Get detailed user information (admin only)
// @access  Private (Admin)
router.get('/:id/details', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { id } = req.params;

        const userQuery = `
            SELECT id, username, email, is_active, created_at, updated_at, last_login, certificate_serial
            FROM users 
            WHERE id = $1
        `;

        const userResult = await db.query(userQuery, [id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = userResult.rows[0];

        // Get user statistics
        const statsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM files WHERE owner_id = $1) as files_owned,
                (SELECT COUNT(*) FROM file_shares WHERE shared_with_user_id = $1 AND is_active = true) as files_shared_with,
                (SELECT COUNT(*) FROM messages WHERE sender_id = $1) as messages_sent,
                (SELECT COUNT(*) FROM messages WHERE recipient_id = $1) as messages_received,
                (SELECT COUNT(*) FROM user_sessions WHERE user_id = $1 AND is_active = true) as active_sessions
        `;

        const statsResult = await db.query(statsQuery, [id]);
        const stats = statsResult.rows[0];

        // Get recent activity
        const activityQuery = `
            SELECT action, resource_type, created_at, success, ip_address
            FROM audit_logs 
            WHERE user_id = $1 
            ORDER BY created_at DESC 
            LIMIT 10
        `;

        const activityResult = await db.query(activityQuery, [id]);

        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    isActive: user.is_active,
                    createdAt: user.created_at,
                    updatedAt: user.updated_at,
                    lastLogin: user.last_login,
                    certificateSerial: user.certificate_serial
                },
                statistics: {
                    filesOwned: parseInt(stats.files_owned),
                    filesSharedWith: parseInt(stats.files_shared_with),
                    messagesSent: parseInt(stats.messages_sent),
                    messagesReceived: parseInt(stats.messages_received),
                    activeSessions: parseInt(stats.active_sessions)
                },
                recentActivity: activityResult.rows.map(activity => ({
                    action: activity.action,
                    resourceType: activity.resource_type,
                    timestamp: activity.created_at,
                    success: activity.success,
                    ipAddress: activity.ip_address
                }))
            }
        });

    } catch (error) {
        logger.error('User details fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user details'
        });
    }
});

// @route   PUT /api/users/:id/status
// @desc    Toggle user active status (admin only)
// @access  Private (Admin)
router.put('/:id/status', authenticateToken, requireAdmin, auditLog('USER_STATUS_CHANGE', 'user'), async (req, res) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'isActive must be a boolean value'
            });
        }

        // Check if user exists
        const userQuery = 'SELECT username FROM users WHERE id = $1';
        const userResult = await db.query(userQuery, [id]);

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const username = userResult.rows[0].username;

        // Update user status
        const updateQuery = 'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2';
        await db.query(updateQuery, [isActive, id]);

        // Deactivate all sessions if user is being disabled
        if (!isActive) {
            await db.query('UPDATE user_sessions SET is_active = false WHERE user_id = $1', [id]);
        }

        logger.info(`User ${username} status changed to ${isActive ? 'active' : 'inactive'} by admin ${req.user.username}`);

        res.json({
            success: true,
            message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
            data: {
                userId: id,
                username: username,
                isActive: isActive
            }
        });

    } catch (error) {
        logger.error('User status change error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to change user status'
        });
    }
});

// @route   GET /api/users/online
// @desc    Get list of currently online users
// @access  Private
router.get('/online', authenticateToken, async (req, res) => {
    try {
        const query = `
            SELECT DISTINCT u.username, u.id, s.created_at as last_seen
            FROM users u
            JOIN user_sessions s ON u.id = s.user_id
            WHERE s.is_active = true 
            AND s.expires_at > NOW()
            AND u.is_active = true
            AND u.id != $1
            ORDER BY s.created_at DESC
            LIMIT 50
        `;

        const result = await db.query(query, [req.user.id]);

        res.json({
            success: true,
            data: {
                onlineUsers: result.rows.map(user => ({
                    id: user.id,
                    username: user.username,
                    lastSeen: user.last_seen
                })),
                count: result.rows.length
            }
        });

    } catch (error) {
        logger.error('Online users fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch online users'
        });
    }
});

// @route   GET /api/users/stats
// @desc    Get user statistics (admin only)
// @access  Private (Admin)
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const statsQuery = `
            SELECT 
                COUNT(*) as total_users,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_users,
                COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_users,
                COUNT(CASE WHEN last_login >= NOW() - INTERVAL '24 hours' THEN 1 END) as users_24h,
                COUNT(CASE WHEN last_login >= NOW() - INTERVAL '7 days' THEN 1 END) as users_7d,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as new_users_30d
            FROM users
            WHERE username != 'admin'
        `;

        const result = await db.query(statsQuery);
        const stats = result.rows[0];

        // Get additional statistics
        const additionalStatsQuery = `
            SELECT 
                (SELECT COUNT(*) FROM files) as total_files,
                (SELECT COUNT(*) FROM messages) as total_messages,
                (SELECT COUNT(*) FROM user_sessions WHERE is_active = true AND expires_at > NOW()) as active_sessions,
                (SELECT COUNT(*) FROM audit_logs WHERE created_at >= NOW() - INTERVAL '24 hours') as actions_24h
        `;

        const additionalResult = await db.query(additionalStatsQuery);
        const additionalStats = additionalResult.rows[0];

        res.json({
            success: true,
            data: {
                userStatistics: {
                    totalUsers: parseInt(stats.total_users),
                    activeUsers: parseInt(stats.active_users),
                    inactiveUsers: parseInt(stats.inactive_users),
                    usersActive24h: parseInt(stats.users_24h),
                    usersActive7d: parseInt(stats.users_7d),
                    newUsers30d: parseInt(stats.new_users_30d)
                },
                systemStatistics: {
                    totalFiles: parseInt(additionalStats.total_files),
                    totalMessages: parseInt(additionalStats.total_messages),
                    activeSessions: parseInt(additionalStats.active_sessions),
                    actionsLast24h: parseInt(additionalStats.actions_24h)
                }
            }
        });

    } catch (error) {
        logger.error('User statistics error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user statistics'
        });
    }
});

// @route   GET /api/users/recent-activity
// @desc    Get recent user activity (admin only)
// @access  Private (Admin)
router.get('/recent-activity', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { limit = 50 } = req.query;

        const query = `
            SELECT a.action, a.resource_type, a.created_at, a.success, a.ip_address,
                   u.username
            FROM audit_logs a
            LEFT JOIN users u ON a.user_id = u.id
            ORDER BY a.created_at DESC
            LIMIT $1
        `;

        const result = await db.query(query, [limit]);

        res.json({
            success: true,
            data: {
                activities: result.rows.map(activity => ({
                    action: activity.action,
                    resourceType: activity.resource_type,
                    username: activity.username || 'Unknown',
                    timestamp: activity.created_at,
                    success: activity.success,
                    ipAddress: activity.ip_address
                }))
            }
        });

    } catch (error) {
        logger.error('Recent activity fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch recent activity'
        });
    }
});

module.exports = router;