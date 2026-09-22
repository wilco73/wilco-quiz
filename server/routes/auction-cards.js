const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', async (req, res) => { try { res.json({ success: true, cards: await db.getAuctionCards() }); } catch (e) { res.status(500).json({ success: false }); } });
router.post('/', async (req, res) => { try { const c = await db.createAuctionCard(req.body); res.json({ success: true, card: c }); } catch (e) { res.status(500).json({ success: false, message: e.message }); } });
router.put('/:id', async (req, res) => { try { const c = await db.updateAuctionCard(req.params.id, req.body); res.json({ success: true, card: c }); } catch (e) { res.status(500).json({ success: false }); } });
router.delete('/:id', async (req, res) => { try { await db.deleteAuctionCard(req.params.id); res.json({ success: true }); } catch (e) { res.status(500).json({ success: false }); } });

module.exports = router;
