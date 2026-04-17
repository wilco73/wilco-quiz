/**
 * Routes API pour Meme Lobbies
 * Gestion des parties Make It Meme
 */

const express = require('express');
const router = express.Router();

const db = require('../database');

// POST - Créer un nouveau lobby (comme drawing-lobbies)
router.post('/', async (req, res) => {
  try {
    const { creator_id, creator_pseudo, settings } = req.body;
    
    if (!creator_id || !creator_pseudo) {
      return res.status(400).json({ 
        success: false, 
        message: 'creator_id et creator_pseudo sont requis' 
      });
    }
    
    const lobby = await db.createMemeLobby(creator_id, creator_pseudo, settings || {});
    
    console.log('[MEME LOBBY API] Lobby créé:', lobby.id, 'code:', lobby.code);
    
    res.json({ success: true, lobby });
  } catch (error) {
    console.error('[MEME LOBBY API] Erreur createMemeLobby:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Rejoindre un lobby par code
router.post('/join-by-code', async (req, res) => {
  try {
    const { code, odId, pseudo } = req.body;
    
    if (!code || !odId || !pseudo) {
      return res.status(400).json({ 
        success: false, 
        message: 'code, odId et pseudo sont requis' 
      });
    }
    
    // Trouver le lobby par son code
    const lobby = await db.getMemeLobbyByCode(code);
    
    if (!lobby) {
      return res.status(404).json({ success: false, message: 'Lobby non trouvé' });
    }
    
    if (lobby.status !== 'waiting') {
      return res.status(400).json({ success: false, message: 'La partie a déjà commencé' });
    }
    
    // Ajouter le joueur
    const updatedLobby = await db.joinMemeLobby(lobby.id, odId, pseudo);
    
    res.json({ success: true, lobby: updatedLobby });
  } catch (error) {
    console.error('[MEME LOBBY API] Erreur joinByCode:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

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

module.exports = router;
