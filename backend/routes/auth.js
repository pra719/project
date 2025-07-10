const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const CryptoUtils = require('../utils/crypto');
const CA = require('../utils/ca');
const rateLimit = require('express-rate-limit');

// Rate limiting - Relaxed for testing
const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many authentication attempts, please try again later.'
});

// Initialize CA on startup
CA.initializeCA().catch(console.error);

// User registration with PKI
router.post('/register', authLimiter, async (req, res) => {
  const { username, email } = req.body;
  
  try {
    // Validate input
    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ username }, { email }] 
    });
    
    if (existingUser) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }

    // Generate RSA key pair
    const { publicKey, privateKey } = CryptoUtils.generateKeyPair();
    
    // Create certificate subject
    const subject = {
      commonName: username,
      organizationName: 'Secure File Sharing Users',
      emailAddress: email
    };

    // Issue certificate from CA
    const certData = await CA.issueCertificate(publicKey, subject);
    
    // Create user in database
    const user = new User({
      username,
      email,
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
      details: error.message 
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
        error: 'Username, challenge, and signature are required' 
      });
    }

    // Find user
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if certificate is still valid
    if (user.isRevoked) {
      return res.status(401).json({ error: 'Certificate has been revoked' });
    }

    if (new Date() > user.expiresAt) {
      return res.status(401).json({ error: 'Certificate has expired' });
    }

    // Verify certificate against CA
    const isValidCert = await CA.verifyCertificate(user.certificate);
    if (!isValidCert) {
      return res.status(401).json({ error: 'Invalid certificate' });
    }

    // Verify digital signature
    const isValidSignature = CryptoUtils.verifySignature(
      challenge, 
      signature, 
      user.publicKey
    );

    if (!isValidSignature) {
      return res.status(401).json({ error: 'Invalid signature' });
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
      details: error.message 
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
    res.status(500).json({ error: 'Failed to generate challenge' });
  }
});

// Get user's public key by username (for encryption)
router.get('/publickey/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ username }).select('publicKey username');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      success: true,
      data: {
        username: user.username,
        publicKey: user.publicKey
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch public key' });
  }
});

// Get CA certificate
router.get('/ca-certificate', async (req, res) => {
  try {
    const caCert = await CA.getCACertificate();
    res.json({
      success: true,
      caCertificate: caCert
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get CA certificate' });
  }
});

module.exports = router;
