/**
 * Routes pour les jeux de dessin (Pictionary, Passe-moi le relais)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { pictionaryGames, pictionaryTimers } = require('../utils/state');

let broadcastFunctions = null;
let io = null;

// Initialise avec la fonction de broadcast et Socket.IO
function init(broadcastFn, socketIo) {
  broadcastFunctions = broadcasts;
  io = socketIo;
}

// ==================== DRAWING WORDS ====================

router.get('/words', async (req, res) => {
  res.json(await db.getAllDrawingWords());
});

router.post('/words', async (req, res) => {
  const word = await db.createDrawingWord(req.body);
  if (broadcastFunctions?.global) await broadcastFunctions.global();
  res.json({ success: true, word });
});

router.put('/words/:id', async (req, res) => {
  const word = await db.updateDrawingWord(req.params.id, req.body);
  if (broadcastFunctions?.global) await broadcastFunctions.global();
  res.json({ success: true, word });
});

router.delete('/words/:id', async (req, res) => {
  await db.deleteDrawingWord(req.params.id);
  if (broadcastFunctions?.global) await broadcastFunctions.global();
  res.json({ success: true });
});

// Import mots de dessin
router.post('/words/import', async (req, res) => {
  const { words, mode = 'add' } = req.body;
  
  if (!Array.isArray(words)) {
    return res.json({ success: false, message: 'Format invalide' });
  }
  
  const results = await db.mergeDrawingWords(words, mode);
  const allWords = await db.getAllDrawingWords();
  
  if (broadcastFunctions?.global) await broadcastFunctions.global();
  res.json({ 
    success: true, 
    added: results.added, 
    updated: results.updated,
    skipped: results.skipped,
    errors: results.errors,
    total: allWords.length 
  });
});

// ==================== DRAWING REFERENCES ====================

router.get('/references', async (req, res) => {
  res.json(await db.getAllDrawingReferences());
});

router.post('/references', async (req, res) => {
  const ref = await db.createDrawingReference(req.body);
  if (broadcastFunctions?.global) await broadcastFunctions.global();
  res.json({ success: true, reference: ref });
});

router.put('/references/:id', async (req, res) => {
  const ref = await db.updateDrawingReference(req.params.id, req.body);
  if (broadcastFunctions?.global) await broadcastFunctions.global();
  res.json({ success: true, reference: ref });
});

router.delete('/references/:id', async (req, res) => {
  await db.deleteDrawingReference(req.params.id);
  if (broadcastFunctions?.global) await broadcastFunctions.global();
  res.json({ success: true });
});

// Import images de référence
router.post('/references/import', async (req, res) => {
  const { references, mode = 'add' } = req.body;
  
  if (!Array.isArray(references)) {
    return res.json({ success: false, message: 'Format invalide' });
  }
  
  const results = await db.mergeDrawingReferences(references, mode);
  const allRefs = await db.getAllDrawingReferences();
  
  if (broadcastFunctions?.global) await broadcastFunctions.global();
  res.json({ 
    success: true, 
    added: results.added, 
    updated: results.updated,
    skipped: results.skipped,
    errors: results.errors,
    total: allRefs.length 
  });
});

// ==================== DRAWING GAMES ====================

router.get('/games', async (req, res) => {
  res.json(await db.getAllDrawingGames());
});

router.post('/games', async (req, res) => {
  const game = await db.createDrawingGame(req.body);
  if (broadcastFunctions?.global) await broadcastFunctions.global();
  res.json({ success: true, game });
});

router.put('/games/:id', async (req, res) => {
  const game = await db.updateDrawingGame(req.params.id, req.body);
  if (broadcastFunctions?.global) await broadcastFunctions.global();
  res.json({ success: true, game });
});

router.delete('/games/:id', async (req, res) => {
  await db.deleteDrawingGame(req.params.id);
  if (broadcastFunctions?.global) await broadcastFunctions.global();
  res.json({ success: true });
});

// ==================== DRAWING LOBBIES ====================

router.get('/lobbies', async (req, res) => {
  res.json(await db.getAllDrawingLobbies());
});

router.get('/lobbies/:id', async (req, res) => {
  const lobby = await db.getDrawingLobbyById(req.params.id);
  if (lobby) {
    res.json(lobby);
  } else {
    res.status(404).json({ success: false, message: 'Lobby non trouvé' });
  }
});

router.post('/lobbies', async (req, res) => {
  const lobby = await db.createDrawingLobby(req.body);
  if (broadcastFunctions?.global) await broadcastFunctions.global();
  res.json({ success: true, lobby });
});

router.delete('/lobbies/:id', async (req, res) => {
  const lobbyId = req.params.id;
  
  // Arrêter le timer si en cours
  if (pictionaryTimers.has(lobbyId)) {
    clearInterval(pictionaryTimers.get(lobbyId));
    pictionaryTimers.delete(lobbyId);
  }
  pictionaryGames.delete(lobbyId);
  
  await db.deleteDrawingLobby(lobbyId);
  if (broadcastFunctions?.global) await broadcastFunctions.global();
  
  // Notifier tous les participants
  if (io) {
    io.to(`drawing:${lobbyId}`).emit('drawingLobby:deleted', { lobbyId });
  }
  
  res.json({ success: true });
});

// Archiver un lobby terminé
router.post('/lobbies/:id/archive', async (req, res) => {
  const lobby = await db.archiveDrawingLobby(req.params.id);
  if (lobby) {
    if (broadcastFunctions?.global) await broadcastFunctions.global();
    res.json({ success: true, lobby });
  } else {
    res.status(404).json({ success: false, message: 'Lobby non trouvé' });
  }
});

// Mettre à jour les mots customs d'un lobby
router.post('/lobbies/:id/custom-words', async (req, res) => {
  const { customWords } = req.body;
  const lobby = await db.updateDrawingLobbyCustomWords(req.params.id, customWords || []);
  if (lobby) {
    // Notifier tous les participants
    if (io) {
      io.to(`drawing:${req.params.id}`).emit('drawingLobby:updated', { lobby });
    }
    res.json({ success: true, lobby });
  } else {
    res.status(404).json({ success: false, message: 'Lobby non trouvé' });
  }
});

// Récupérer les résultats d'un lobby
router.get('/lobbies/:id/results', async (req, res) => {
  const results = await db.getDrawingLobbyResults(req.params.id);
  if (results) {
    res.json(results);
  } else {
    res.status(404).json({ success: false, message: 'Lobby non trouvé' });
  }
});

// Récupérer les dessins d'un lobby
router.get('/lobbies/:id/drawings', async (req, res) => {
  const drawings = await db.getDrawingsByLobby(req.params.id);
  res.json(drawings);
});

// ==================== DRAWINGS ====================

// Récupérer les dessins d'un lobby spécifique
router.get('/drawings/lobby/:lobbyId', async (req, res) => {
  const drawings = await db.getDrawingsByLobby(req.params.lobbyId);
  res.json(drawings || []);
});

// Récupérer un dessin spécifique
router.get('/drawings/:id', async (req, res) => {
  const drawing = await db.getDrawingById(req.params.id);
  if (drawing) {
    res.json(drawing);
  } else {
    res.status(404).json({ success: false, message: 'Dessin non trouvé' });
  }
});

module.exports = router;
module.exports.init = init;
