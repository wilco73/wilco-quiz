/**
 * Routes API pour Meme Creations
 * Upload des créations via API REST (plus fiable que socket pour les gros fichiers)
 * 
 * v3 - Avec injection de io via init()
 */

const express = require('express');
const router = express.Router();
const db = require('../database');

// Référence à io (sera injectée via init)
let io = null;

// Fonction d'initialisation pour injecter io
function init(socketIO) {
  io = socketIO;
  console.log('[MEME API] io injecté dans meme-creations');
}

// POST - Soumettre une création (upload de l'image)
router.post('/', async (req, res) => {
  try {
    const { 
      lobbyId, 
      roundNumber, 
      odId, 
      pseudo, 
      templateId, 
      textLayers, 
      finalImageBase64 
    } = req.body;
    
    console.log(`[MEME API] POST /meme-creations from ${pseudo}`);
    console.log(`[MEME API] Image size: ${Math.round((finalImageBase64?.length || 0) / 1024)} KB`);
    
    // Validations
    if (!lobbyId || !odId || !pseudo || !templateId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Paramètres manquants' 
      });
    }
    
    // Vérifier que le lobby existe
    const lobby = await db.getMemeLobbyById(lobbyId);
    if (!lobby) {
      return res.status(404).json({ success: false, message: 'Lobby non trouvé' });
    }
    
    if (lobby.phase !== 'creation') {
      return res.status(400).json({ 
        success: false, 
        message: 'La phase de création est terminée' 
      });
    }
    
    // Vérifier que le joueur est participant
    const isParticipant = (lobby.participants || []).some(p => p.odId === odId);
    if (!isParticipant) {
      return res.status(403).json({ 
        success: false, 
        message: 'Vous n\'êtes pas participant de ce lobby' 
      });
    }
    
    // Vérifier qu'il n'a pas déjà soumis
    const currentRound = roundNumber || lobby.current_round;
    const existingCreations = await db.getMemeCreationsByLobby(lobbyId, currentRound);
    const alreadySubmitted = existingCreations.some(c => c.player_id === odId);
    if (alreadySubmitted) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vous avez déjà soumis votre création' 
      });
    }
    
    // Créer la création
    const creation = await db.createMemeCreation(
      lobbyId,
      currentRound,
      odId,
      pseudo,
      templateId,
      textLayers || [],
      finalImageBase64
    );
    
    console.log(`[MEME API] Creation saved: ${creation.id}`);
    
    // Notifier les autres joueurs via socket
    if (io) {
      io.to(`meme:${lobbyId}`).emit('meme:creationSubmitted', {
        odId,
        pseudo,
        creationId: creation.id
      });
    }
    
    // Vérifier si tous ont soumis
    const allCreations = await db.getMemeCreationsByLobby(lobbyId, currentRound);
    const participants = lobby.participants || [];
    const allSubmitted = allCreations.length >= participants.length;
    
    console.log(`[MEME API] Submissions: ${allCreations.length}/${participants.length}, allSubmitted: ${allSubmitted}`);
    
    // SI TOUS ONT SOUMIS -> PASSER AU VOTE DIRECTEMENT
    if (allSubmitted && io) {
      console.log(`[MEME API] ========== ALL SUBMITTED - STARTING VOTE ==========`);
      
      try {
        const updatedLobby = await db.startVotingPhase(lobbyId);
        const voteTime = updatedLobby.settings?.voteTime || 30;
        
        console.log(`[MEME API] Emitting votingStarted to room meme:${lobbyId}`);
        console.log(`[MEME API] Creations count: ${allCreations.length}, voteTime: ${voteTime}`);
        
        io.to(`meme:${lobbyId}`).emit('meme:votingStarted', {
          lobby: updatedLobby,
          creations: allCreations,
          currentIndex: 0,
          timeRemaining: voteTime
        });
        
        console.log(`[MEME API] ========== votingStarted EMITTED ==========`);
      } catch (voteError) {
        console.error(`[MEME API] Error starting voting phase:`, voteError);
      }
    }
    
    res.json({ 
      success: true, 
      creation,
      allSubmitted,
      submissionCount: allCreations.length,
      totalParticipants: participants.length
    });
    
  } catch (error) {
    console.error('[MEME API] Erreur création:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Récupérer les créations d'un lobby
router.get('/lobby/:lobbyId', async (req, res) => {
  try {
    const { lobbyId } = req.params;
    const { round } = req.query;
    
    const creations = await db.getMemeCreationsByLobby(
      lobbyId, 
      round ? parseInt(round) : null
    );
    
    res.json({ success: true, creations });
  } catch (error) {
    console.error('[MEME API] Erreur get creations:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Récupérer une création par ID
router.get('/:id', async (req, res) => {
  try {
    const creation = await db.getMemeCreationById(req.params.id);
    if (!creation) {
      return res.status(404).json({ success: false, message: 'Création non trouvée' });
    }
    res.json({ success: true, creation });
  } catch (error) {
    console.error('[MEME API] Erreur get creation:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Exporter le router ET la fonction init
router.init = init;
module.exports = router;
