const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const CryptoUtils = require('../utils/crypto');
const CA = require('../utils/ca');
const rateLimit = require('express-rate-limit');
const rateLimit = require('express-rate-limit');

const isTesting = process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development';

const authLimiter = rateLimit({
  windowMs: isTesting ? 1 * 60 * 1000 : 15 * 60 * 1000, // 1 minute for testing, 15 minutes for production
  max: isTesting ? 50 : 5, // 50 requests for testing, 5 for production
  message: {
    error: 'Too many authentication attempts, please try again later.',
    success: false
  }
});

// Initialize CA on startup
CA.initializeCA().catch(console.error);

// User registration with PKI
router.post('/register', authLimiter, async (req, res) => {
  const { username, email } = req.body;
  
  try {
    // Validate input
    if (!username || !email) {
      return res.status(400).json({ 
        error: 'Username and email are required',
        success: false 
      });
    }

    // Sanitize input
    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Validate username format
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(cleanUsername)) {
      return res.status(400).json({ 
        error: 'Username must be 3-20 characters and contain only letters, numbers, and underscores',
        success: false 
      });
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({ 
        error: 'Please enter a valid email address',
        success: false 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ username: cleanUsername }, { email: cleanEmail }] 
    });
    
    if (existingUser) {
      return res.status(409).json({ 
        error: 'Username or email already exists',
        success: false 
      });
    }

    // Generate RSA key pair
    const { publicKey, privateKey } = CryptoUtils.generateKeyPair();
    
    // Create certificate subject
    const subject = {
      commonName: cleanUsername,
      organizationName: 'Secure File Sharing Users',
      emailAddress: cleanEmail
    };

    // Issue certificate from CA
    const certData = await CA.issueCertificate(publicKey, subject);
    
    // Create user in database
    const user = new User({
      username: cleanUsername,
      email: cleanEmail,
      publicKey,
      certificate: certData.certificate,
      certificateSerial: certData.serial,
      issuedAt: certData.issuedAt,
      expiresAt: certData.expiresAt
    });

    await user.save();

    // Return keys and certificate to client
    res.json({
      success: true,
      message: 'User registered successfully',
      data: {
        publicKey,
        privateKey, // Client must store this securely
        certificate: certData.certificate,
        userId: user._id
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Registration failed', 
      success: false,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// User login with digital signature verification
router.post('/login', authLimiter, async (req, res) => {
  const { username, challenge, signature } = req.body;
  
  try {
    // Validate input
    if (!username || !challenge || !signature) {
      return res.status(400).json({ 
        error: 'Username, challenge, and signature are required',
        success: false 
      });
    }

    const cleanUsername = username.trim();

    // Find user
    const user = await User.findOne({ username: cleanUsername });
    if (!user) {
      return res.status(401).json({ 
        error: 'Invalid credentials',
        success: false 
      });
    }

    // Check if certificate is still valid
    if (user.isRevoked) {
      return res.status(401).json({ 
        error: 'Certificate has been revoked',
        success: false 
      });
    }

    if (new Date() > user.expiresAt) {
      return res.status(401).json({ 
        error: 'Certificate has expired',
        success: false 
      });
    }

    // Verify certificate against CA
    const isValidCert = await CA.verifyCertificate(user.certificate);
    if (!isValidCert) {
      return res.status(401).json({ 
        error: 'Invalid certificate',
        success: false 
      });
    }

    // Verify digital signature
    const isValidSignature = CryptoUtils.verifySignature(
      challenge, 
      signature, 
      user.publicKey
    );

    if (!isValidSignature) {
      return res.status(401).json({ 
        error: 'Invalid signature',
        success: false 
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        username: user.username 
      }, 
      process.env.JWT_SECRET || 'fallback_secret', 
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          publicKey: user.publicKey
        }
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      success: false,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Generate challenge for login
router.post('/challenge', authLimiter, async (req, res) => {
  try {
    const challenge = CryptoUtils.generateHash(Date.now().toString() + Math.random().toString());
    
    res.json({
      success: true,
      challenge,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Challenge generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate challenge',
      success: false 
    });
  }
});

// Get user's public key by username (for encryption)
router.get('/publickey/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const cleanUsername = username.trim();
    
    const user = await User.findOne({ username: cleanUsername }).select('publicKey username');
    
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        success: false 
      });
    }

    res.json({
      success: true,
      data: {
        username: user.username,
        publicKey: user.publicKey
      }
    });
  } catch (error) {
    console.error('Public key fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch public key',
      success: false 
    });
  }
});

// Get CA certificate
router.get('/ca-certificate', async (req, res) => {
  try {
    const caCert = await CA.getCACertificate();
    res.json({
      success: true,
      data: {
        caCertificate: caCert
      }
    });
  } catch (error) {
    console.error('CA certificate fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to get CA certificate',
      success: false 
    });
  }
});

module.exports = router;
