/**
 * Routes API pour Meme Creations
 * v7 - Timer serveur complet (création + vote + résultats)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');

let io = null;
const voteTimers = new Map();
const resultsTimers = new Map();
const creationTimers = new Map();

const EventEmitter = require('events');
const memeEvents = new EventEmitter();

function init(socketIO) {
  io = socketIO;
  console.log('[MEME API] io initialized');
  
  // Écouter l'événement interne "tous ont voté"
  memeEvents.on('allVoted', async (lobbyId) => {
    console.log(`[MEME API] All voted signal received for ${lobbyId}`);
    if (voteTimers.has(lobbyId)) {
      clearTimeout(voteTimers.get(lobbyId));
      voteTimers.delete(lobbyId);
    }
    setTimeout(() => advanceVote(lobbyId), 1500);
  });
  
  // Écouter quand une partie démarre pour lancer le timer création
  memeEvents.on('gameStarted', async (lobbyId, creationTime) => {
    console.log(`[MEME API] Game started signal for ${lobbyId}, creation time: ${creationTime}s`);
    startCreationTimer(lobbyId, creationTime);
  });
  
  // Écouter quand tous les joueurs sont prêts
  memeEvents.on('allReady', async (lobbyId) => {
    console.log(`[MEME API] All ready signal received for ${lobbyId}`);
    
    // Annuler le timer création
    if (creationTimers.has(lobbyId)) {
      clearTimeout(creationTimers.get(lobbyId));
      creationTimers.delete(lobbyId);
    }
    
    // Attendre 3s que les créations arrivent, puis passer au vote
    setTimeout(() => startVotingAfterSubmit(lobbyId), 3000);
  });
}

function signalAllVoted(lobbyId) {
  memeEvents.emit('allVoted', lobbyId);
}

function signalGameStarted(lobbyId, creationTime) {
  memeEvents.emit('gameStarted', lobbyId, creationTime);
}

function signalAllReady(lobbyId) {
  memeEvents.emit('allReady', lobbyId);
}

// ==================== TIMER CRÉATION ====================

function startCreationTimer(lobbyId, creationTime) {
  if (creationTimers.has(lobbyId)) clearTimeout(creationTimers.get(lobbyId));
  
  console.log(`[MEME TIMER] Creation timer: ${creationTime}s for ${lobbyId}`);
  
  const timerId = setTimeout(async () => {
    await handleCreationTimeout(lobbyId);
  }, creationTime * 1000);
  
  creationTimers.set(lobbyId, timerId);
}

async function handleCreationTimeout(lobbyId) {
  try {
    console.log(`[MEME TIMER] Creation timeout for ${lobbyId}`);
    creationTimers.delete(lobbyId);
    
    const lobby = await db.getMemeLobbyById(lobbyId);
    if (!lobby || lobby.phase !== 'creation') {
      console.log(`[MEME TIMER] Lobby not in creation phase, skipping`);
      return;
    }
    
    // Demander à tous les clients d'envoyer leurs créations
    console.log(`[MEME TIMER] Emitting submitNow to all players`);
    io.to(`meme:${lobbyId}`).emit('meme:submitNow');
    
    // Attendre 3s que les créations arrivent, puis passer au vote
    setTimeout(() => startVotingAfterSubmit(lobbyId), 3000);
    
  } catch (error) {
    console.error(`[MEME TIMER] handleCreationTimeout error:`, error);
  }
}

// Démarrer le vote après réception des créations
async function startVotingAfterSubmit(lobbyId) {
  try {
    const lobby = await db.getMemeLobbyById(lobbyId);
    if (!lobby || lobby.phase !== 'creation') {
      console.log(`[MEME TIMER] Lobby not in creation phase for voting, skipping`);
      return;
    }
    
    const currentRound = lobby.current_round;
    const allCreations = await db.getMemeCreationsByLobby(lobbyId, currentRound);
    
    console.log(`[MEME TIMER] Starting vote with ${allCreations.length} creations`);
    
    if (allCreations.length === 0) {
      console.log(`[MEME TIMER] No creations at all, skipping to results`);
      const updatedLobby = await db.updateMemeLobbyPhase(lobbyId, 'results');
      io.to(`meme:${lobbyId}`).emit('meme:roundResults', {
        lobby: updatedLobby,
        creations: []
      });
      startResultsTimer(lobbyId, 5);
      return;
    }
    
    const updatedLobby = await db.startVotingPhase(lobbyId);
    const voteTime = updatedLobby.settings?.voteTime || 30;
    
    io.to(`meme:${lobbyId}`).emit('meme:votingStarted', {
      lobby: updatedLobby,
      creations: allCreations,
      currentIndex: 0,
      timeRemaining: voteTime
    });
    
    startVoteTimer(lobbyId, voteTime);
    
  } catch (error) {
    console.error(`[MEME TIMER] startVotingAfterSubmit error:`, error);
  }
}

// ==================== TIMER VOTE ====================

function startVoteTimer(lobbyId, voteTime) {
  if (voteTimers.has(lobbyId)) clearTimeout(voteTimers.get(lobbyId));
  
  console.log(`[MEME TIMER] Vote timer: ${voteTime}s for ${lobbyId}`);
  
  const timerId = setTimeout(async () => {
    await advanceVote(lobbyId);
  }, voteTime * 1000);
  
  voteTimers.set(lobbyId, timerId);
}

async function advanceVote(lobbyId) {
  try {
    const lobby = await db.getMemeLobbyById(lobbyId);
    if (!lobby || lobby.phase !== 'voting') {
      voteTimers.delete(lobbyId);
      return;
    }
    
    const updatedLobby = await db.advanceToNextVote(lobbyId);
    
    if (updatedLobby.phase === 'results') {
      console.log(`[MEME TIMER] All voted, showing results`);
      
      const creations = await db.getMemeCreationsByLobby(lobbyId, updatedLobby.current_round);
      
      // Mettre à jour les scores des joueurs
      await updatePlayerScores(lobbyId, creations);
      
      const lobbyWithScores = await db.getMemeLobbyById(lobbyId);
      
      io.to(`meme:${lobbyId}`).emit('meme:roundResults', {
        lobby: lobbyWithScores,
        creations
      });
      
      voteTimers.delete(lobbyId);
      
      // Démarrer timer pour passer à la suite (5 secondes)
      startResultsTimer(lobbyId, 5);
    } else {
      console.log(`[MEME TIMER] Next meme: index ${updatedLobby.current_vote_index}`);
      
      const voteTime = updatedLobby.settings?.voteTime || 30;
      
      io.to(`meme:${lobbyId}`).emit('meme:nextVoteStarted', {
        lobby: updatedLobby,
        currentIndex: updatedLobby.current_vote_index,
        timeRemaining: voteTime
      });
      
      startVoteTimer(lobbyId, voteTime);
    }
  } catch (error) {
    console.error(`[MEME TIMER] advanceVote error:`, error);
    voteTimers.delete(lobbyId);
  }
}

// ==================== TIMER RESULTATS ====================

function startResultsTimer(lobbyId, delaySeconds) {
  if (resultsTimers.has(lobbyId)) clearTimeout(resultsTimers.get(lobbyId));
  
  console.log(`[MEME TIMER] Results timer: ${delaySeconds}s for ${lobbyId}`);
  
  const timerId = setTimeout(async () => {
    await advanceToNextRoundOrFinish(lobbyId);
  }, delaySeconds * 1000);
  
  resultsTimers.set(lobbyId, timerId);
}

async function advanceToNextRoundOrFinish(lobbyId) {
  try {
    const lobby = await db.getMemeLobbyById(lobbyId);
    if (!lobby) {
      resultsTimers.delete(lobbyId);
      return;
    }
    
    const totalRounds = lobby.settings?.rounds || 3;
    const currentRound = lobby.current_round || 1;
    
    console.log(`[MEME TIMER] Round ${currentRound}/${totalRounds}`);
    
    if (currentRound >= totalRounds) {
      // Fin du jeu
      console.log(`[MEME TIMER] Game finished!`);
      
      const allCreations = await db.getMemeCreationsByLobby(lobbyId);
      console.log(`[MEME TIMER] All creations for lobby ${lobbyId}:`, allCreations?.length);
      
      const updatedLobby = await db.updateMemeLobbyPhase(lobbyId, 'final');
      
      console.log(`[MEME TIMER] Emitting gameFinished with ${allCreations?.length} creations`);
      
      io.to(`meme:${lobbyId}`).emit('meme:gameFinished', {
        lobby: updatedLobby,
        allCreations
      });
    } else {
      // Manche suivante
      console.log(`[MEME TIMER] Starting round ${currentRound + 1}`);
      
      const updatedLobby = await db.advanceToNextRound(lobbyId);
      
      // Assigner les templates
      const tags = updatedLobby.settings?.tags || [];
      const participants = updatedLobby.participants || [];
      const assignedTemplateIds = [];
      
      for (const participant of participants) {
        const template = await db.getRandomMemeTemplate(assignedTemplateIds, tags);
        if (template) {
          await db.createMemeAssignment(lobbyId, updatedLobby.current_round, participant.odId, template.id);
          assignedTemplateIds.push(template.id);
        }
      }
      
      const creationTime = updatedLobby.settings?.creationTime || 120;
      
      io.to(`meme:${lobbyId}`).emit('meme:newRoundStarted', {
        lobby: updatedLobby,
        roundNumber: updatedLobby.current_round,
        timeRemaining: creationTime
      });
      
      // Envoyer les templates
      for (const participant of participants) {
        const assignment = await db.getMemeAssignment(lobbyId, updatedLobby.current_round, participant.odId);
        if (assignment) {
          io.to(`meme:${lobbyId}`).emit('meme:templateAssigned', {
            odId: participant.odId,
            assignment
          });
        }
      }
      
      // Démarrer le timer création pour la nouvelle manche
      startCreationTimer(lobbyId, creationTime);
    }
    
    resultsTimers.delete(lobbyId);
  } catch (error) {
    console.error(`[MEME TIMER] advanceToNextRoundOrFinish error:`, error);
    resultsTimers.delete(lobbyId);
  }
}

// ==================== MISE A JOUR SCORES ====================

async function updatePlayerScores(lobbyId, creations) {
  try {
    const lobby = await db.getMemeLobbyById(lobbyId);
    if (!lobby) return;
    
    const participants = [...(lobby.participants || [])];
    
    // Pour chaque création, ajouter le score au joueur
    for (const creation of creations) {
      const playerIndex = participants.findIndex(p => p.odId === creation.player_id);
      if (playerIndex !== -1) {
        participants[playerIndex].score = (participants[playerIndex].score || 0) + (creation.total_score || 0);
      }
    }
    
    // Mettre à jour en BDD
    await db.updateMemeLobbyParticipants(lobbyId, participants);
    
    console.log(`[MEME API] Scores updated for ${participants.length} players`);
  } catch (error) {
    console.error(`[MEME API] updatePlayerScores error:`, error);
  }
}

// ==================== ROUTES ====================

router.post('/', async (req, res) => {
  try {
    const { lobbyId, roundNumber, odId, pseudo, templateId, textLayers, finalImageBase64 } = req.body;
    
    console.log(`[MEME API] POST from ${pseudo}`);
    
    if (!lobbyId || !odId || !pseudo || !templateId) {
      return res.status(400).json({ success: false, message: 'Paramètres manquants' });
    }
    
    const lobby = await db.getMemeLobbyById(lobbyId);
    if (!lobby) return res.status(404).json({ success: false, message: 'Lobby non trouvé' });
    if (lobby.phase !== 'creation') return res.status(400).json({ success: false, message: 'Phase terminée' });
    
    const isParticipant = (lobby.participants || []).some(p => p.odId === odId);
    if (!isParticipant) return res.status(403).json({ success: false, message: 'Non participant' });
    
    const currentRound = roundNumber || lobby.current_round;
    const existingCreations = await db.getMemeCreationsByLobby(lobbyId, currentRound);
    if (existingCreations.some(c => c.player_id === odId)) {
      return res.status(400).json({ success: false, message: 'Déjà soumis' });
    }
    
    const creation = await db.createMemeCreation(
      lobbyId, currentRound, odId, pseudo, templateId, textLayers || [], finalImageBase64
    );
    
    if (io) {
      io.to(`meme:${lobbyId}`).emit('meme:creationSubmitted', { odId, pseudo, creationId: creation.id });
    }
    
    const allCreations = await db.getMemeCreationsByLobby(lobbyId, currentRound);
    const participants = lobby.participants || [];
    const allSubmitted = allCreations.length >= participants.length;
    
    if (allSubmitted && io) {
      console.log(`[MEME API] ===== ALL SUBMITTED - STARTING VOTE =====`);
      
      // Annuler le timer de création
      if (creationTimers.has(lobbyId)) {
        clearTimeout(creationTimers.get(lobbyId));
        creationTimers.delete(lobbyId);
      }
      
      const updatedLobby = await db.startVotingPhase(lobbyId);
      const voteTime = updatedLobby.settings?.voteTime || 30;
      
      io.to(`meme:${lobbyId}`).emit('meme:votingStarted', {
        lobby: updatedLobby,
        creations: allCreations,
        currentIndex: 0,
        timeRemaining: voteTime
      });
      
      startVoteTimer(lobbyId, voteTime);
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
router.signalAllVoted = signalAllVoted;
router.signalGameStarted = signalGameStarted;
router.signalAllReady = signalAllReady;
module.exports = router;
