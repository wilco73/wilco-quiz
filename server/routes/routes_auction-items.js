const express = require('express');
const router = express.Router();
const db = require('../database');

router.get('/', async (req, res) => { try { res.json({ success: true, items: await db.getAuctionItems() }); } catch (e) { console.error('[AUCTION-ITEMS] get:', e.message); res.status(500).json({ success: false }); } });
router.post('/', async (req, res) => { try { const { name, imageUrl, pv } = req.body; if (!name) return res.status(400).json({ success: false, message: 'Nom requis' }); const item = await db.createAuctionItem({ name, imageUrl, pv }); res.json({ success: true, item }); } catch (e) { console.error('[AUCTION-ITEMS] post:', e.message); res.status(500).json({ success: false }); } });
router.put('/:id', async (req, res) => { try { const item = await db.updateAuctionItem(req.params.id, req.body); res.json({ success: true, item }); } catch (e) { console.error('[AUCTION-ITEMS] put:', e.message); res.status(500).json({ success: false }); } });
router.delete('/:id', async (req, res) => { try { await db.deleteAuctionItem(req.params.id); res.json({ success: true }); } catch (e) { console.error('[AUCTION-ITEMS] del:', e.message); res.status(500).json({ success: false }); } });

module.exports = router;
