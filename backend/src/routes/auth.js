const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username and password are required'
    });
  }
  
  // Check credentials against config
  if (username !== config.admin.username || password !== config.admin.password) {
    return res.status(401).json({
      success: false,
      message: 'Invalid credentials'
    });
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { sub: username, role: 'admin' },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
  
  res.json({
    success: true,
    token,
    expiresIn: config.jwt.expiresIn
  });
});

// GET /api/auth/verify
router.get('/verify', auth, (req, res) => {
  res.json({
    success: true,
    valid: true,
    user: req.user
  });
});

module.exports = router;
