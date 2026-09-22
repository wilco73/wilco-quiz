const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/:key', async (req, res) => { try { const value = await db.getAppSetting(req.params.key); res.json({ success: true, value }); } catch (e) { res.status(500).json({ success: false }); } });
router.put('/:key', async (req, res) => { try { await db.setAppSetting(req.params.key, req.body?.value ?? ''); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false }); } });

module.exports = router;
