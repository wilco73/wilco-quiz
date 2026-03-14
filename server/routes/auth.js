/**
 * Routes d'authentification
 */

const express = require('express');
const router = express.Router();
const db = require('../database');

// Configuration serveur
router.get('/config', async (req, res) => {
  res.json({
    serverTime: Date.now(),
    version: '4.0.0',
    features: ['socket.io', 'supabase', 'realtime']
  });
});

// Login admin
router.post('/admin-login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await db.verifyAdmin(username, password);
  if (admin) {
    res.json({ success: true, admin });
  } else {
    res.json({ success: false, message: 'Identifiants incorrects' });
  }
});

module.exports = router;
