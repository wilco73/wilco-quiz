/**
 * Routes API pour Meme Lobbies
 * Gestion des parties Make It Meme
 */

const express = require('express');
const router = express.Router();

let db;

function init(database) {
  db = database;
}

// GET - Tous les lobbies (admin)
router.get('/', async (req, res) => {
  try {
    const lobbies = await db.getAllMemeLobbies();
    res.json({ success: true, lobbies });
  } catch (error) {
    console.error('[MEME LOBBY API] Erreur getAllMemeLobbies:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Lobbies actifs (pour rejoindre)
router.get('/active', async (req, res) => {
  try {
    const lobbies = await db.getActiveMemeLobbies();
    res.json({ success: true, lobbies });
  } catch (error) {
    console.error('[MEME LOBBY API] Erreur getActiveMemeLobbies:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Un lobby par ID
router.get('/:id', async (req, res) => {
  try {
    const lobby = await db.getMemeLobbyById(req.params.id);
    if (!lobby) {
      return res.status(404).json({ success: false, message: 'Lobby non trouvé' });
    }
    res.json({ success: true, lobby });
  } catch (error) {
    console.error('[MEME LOBBY API] Erreur getMemeLobbyById:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Créations d'un lobby
router.get('/:id/creations', async (req, res) => {
  try {
    const roundNumber = req.query.round ? parseInt(req.query.round) : null;
    const creations = await db.getMemeCreationsByLobby(req.params.id, roundNumber);
    res.json({ success: true, creations });
  } catch (error) {
    console.error('[MEME LOBBY API] Erreur getMemeCreationsByLobby:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE - Supprimer un lobby
router.delete('/:id', async (req, res) => {
  try {
    await db.deleteMemeLobby(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('[MEME LOBBY API] Erreur deleteMemeLobby:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Nettoyage des vieux lobbies
router.post('/cleanup', async (req, res) => {
  try {
    const hoursOld = req.body.hoursOld || 24;
    const deletedCount = await db.cleanupOldMemeLobbies(hoursOld);
    res.json({ success: true, deletedCount });
  } catch (error) {
    console.error('[MEME LOBBY API] Erreur cleanupOldMemeLobbies:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.init = init;
module.exports = router;
