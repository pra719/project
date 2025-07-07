const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

router.post('/register', async (req, res) => {
  const { username, email } = req.body;
  try {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });
    const certificate = `CERTIFICATE: ${username} | ${publicKey}`;
    const user = new User({ username, email, publicKey, certificate });
    await user.save();
    res.json({ publicKey, privateKey, certificate });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  const { username, privateKey } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(401).json({ error: 'User not found' });

    const sign = crypto.createSign('SHA256');
    sign.update(username);
    sign.end();
    const signature = sign.sign(privateKey, 'hex');

    const verify = crypto.createVerify('SHA256');
    verify.update(username);
    verify.end();
    const isValid = verify.verify(user.publicKey, signature, 'hex');
    if (!isValid) return res.status(401).json({ error: 'Invalid signature' });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;
