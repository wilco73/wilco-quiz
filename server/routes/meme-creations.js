/**
 * Routes API pour Meme Creations
 * Upload des créations via API REST
 * 
 * v5 - Utilise advanceToNextVote de la BDD
 */

const express = require('express');
const router = express.Router();
const db = require('../database');

let io = null;
const voteTimers = new Map();

function init(socketIO) {
  io = socketIO;
  console.log('[MEME API] io injecté dans meme-creations');
}

// Démarrer le timer de vote
function startVoteTimer(lobbyId, voteTime) {
  if (voteTimers.has(lobbyId)) {
    clearTimeout(voteTimers.get(lobbyId));
  }
  
  console.log(`[MEME TIMER] Starting vote timer: ${voteTime}s for lobby ${lobbyId}`);
  
  const timerId = setTimeout(async () => {
    console.log(`[MEME TIMER] Vote time up for lobby ${lobbyId}`);
    await advanceVote(lobbyId);
  }, voteTime * 1000);
  
  voteTimers.set(lobbyId, timerId);
}

// Avancer au vote suivant ou aux résultats
async function advanceVote(lobbyId) {
  try {
    const lobby = await db.getMemeLobbyById(lobbyId);
    if (!lobby || lobby.phase !== 'voting') {
      console.log(`[MEME TIMER] Lobby not in voting phase, skipping`);
      voteTimers.delete(lobbyId);
      return;
    }
    
    // Utiliser la fonction de la BDD
    const updatedLobby = await db.advanceToNextVote(lobbyId);
    
    if (updatedLobby.phase === 'results') {
      console.log(`[MEME TIMER] All memes voted, showing results`);
      
      const creations = await db.getMemeCreationsByLobby(lobbyId, updatedLobby.current_round);
      
      io.to(`meme:${lobbyId}`).emit('meme:roundResults', {
        lobby: updatedLobby,
        creations: creations
      });
      
      voteTimers.delete(lobbyId);
    } else {
      console.log(`[MEME TIMER] Advancing to meme index ${updatedLobby.current_vote_index}`);
      
      const voteTime = updatedLobby.settings?.voteTime || 30;
      
      io.to(`meme:${lobbyId}`).emit('meme:nextVoteStarted', {
        lobby: updatedLobby,
        currentIndex: updatedLobby.current_vote_index,
        timeRemaining: voteTime
      });
      
      // Relancer le timer
      startVoteTimer(lobbyId, voteTime);
    }
  } catch (error) {
    console.error(`[MEME TIMER] Error:`, error);
    voteTimers.delete(lobbyId);
  }
}

// POST - Soumettre une création
router.post('/', async (req, res) => {
  try {
    const { lobbyId, roundNumber, odId, pseudo, templateId, textLayers, finalImageBase64 } = req.body;
    
    console.log(`[MEME API] POST from ${pseudo}, image: ${Math.round((finalImageBase64?.length || 0) / 1024)} KB`);
    
    if (!lobbyId || !odId || !pseudo || !templateId) {
      return res.status(400).json({ success: false, message: 'Paramètres manquants' });
    }
    
    const lobby = await db.getMemeLobbyById(lobbyId);
    if (!lobby) {
      return res.status(404).json({ success: false, message: 'Lobby non trouvé' });
    }
    
    if (lobby.phase !== 'creation') {
      return res.status(400).json({ success: false, message: 'Phase de création terminée' });
    }
    
    const isParticipant = (lobby.participants || []).some(p => p.odId === odId);
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Non participant' });
    }
    
    const currentRound = roundNumber || lobby.current_round;
    const existingCreations = await db.getMemeCreationsByLobby(lobbyId, currentRound);
    if (existingCreations.some(c => c.player_id === odId)) {
      return res.status(400).json({ success: false, message: 'Déjà soumis' });
    }
    
    const creation = await db.createMemeCreation(
      lobbyId, currentRound, odId, pseudo, templateId, textLayers || [], finalImageBase64
    );
    
    console.log(`[MEME API] Creation saved: ${creation.id}`);
    
    if (io) {
      io.to(`meme:${lobbyId}`).emit('meme:creationSubmitted', { odId, pseudo, creationId: creation.id });
    }
    
    const allCreations = await db.getMemeCreationsByLobby(lobbyId, currentRound);
    const participants = lobby.participants || [];
    const allSubmitted = allCreations.length >= participants.length;
    
    console.log(`[MEME API] Submissions: ${allCreations.length}/${participants.length}`);
    
    if (allSubmitted && io) {
      console.log(`[MEME API] ===== ALL SUBMITTED - STARTING VOTE =====`);
      
      const updatedLobby = await db.startVotingPhase(lobbyId);
      const voteTime = updatedLobby.settings?.voteTime || 30;
      
      io.to(`meme:${lobbyId}`).emit('meme:votingStarted', {
        lobby: updatedLobby,
        creations: allCreations,
        currentIndex: 0,
        timeRemaining: voteTime
      });
      
      startVoteTimer(lobbyId, voteTime);
      console.log(`[MEME API] ===== VOTE STARTED + TIMER =====`);
    }
    
    res.json({ success: true, creation, allSubmitted, submissionCount: allCreations.length, totalParticipants: participants.length });
    
  } catch (error) {
    console.error('[MEME API] Error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/lobby/:lobbyId', async (req, res) => {
  try {
    const creations = await db.getMemeCreationsByLobby(req.params.lobbyId, req.query.round ? parseInt(req.query.round) : null);
    res.json({ success: true, creations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const creation = await db.getMemeCreationById(req.params.id);
    if (!creation) return res.status(404).json({ success: false, message: 'Non trouvé' });
    res.json({ success: true, creation });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.init = init;
module.exports = router;
