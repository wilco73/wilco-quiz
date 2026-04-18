/**
 * Routes API pour Meme Creations
 * v9 - Workflow local-first avec attente des créations
 * 
 * Workflow:
 * 1. Joueur valide → stocke localement + émet playerReady
 * 2. Tous ready OU timer expire → serveur émet submitNow
 * 3. Clients envoient leurs créations via API
 * 4. Serveur compte les créations reçues et passe au vote quand tous ont envoyé
 */

const express = require('express');
const router = express.Router();
const db = require('../database');

let io = null;
const voteTimers = new Map();
const resultsTimers = new Map();
const creationTimers = new Map();

// Tracking des créations attendues après submitNow
const pendingSubmits = new Map(); // lobbyId -> { expected: number, received: number, timeout: NodeJS.Timeout }

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
  
  // Écouter quand tous les joueurs sont prêts (submitNow envoyé)
  memeEvents.on('allReady', async (lobbyId, expectedCount) => {
    console.log(`[MEME API] All ready signal received for ${lobbyId}, expecting ${expectedCount} creations`);
    
    // Annuler le timer création
    if (creationTimers.has(lobbyId)) {
      clearTimeout(creationTimers.get(lobbyId));
      creationTimers.delete(lobbyId);
    }
    
    // Configurer l'attente des créations
    setupPendingSubmits(lobbyId, expectedCount);
  });
  
  // Écouter quand le timer création expire
  memeEvents.on('creationTimeout', async (lobbyId, expectedCount) => {
    console.log(`[MEME API] Creation timeout for ${lobbyId}, expecting ${expectedCount} creations`);
    
    // Configurer l'attente des créations (max 5s après submitNow)
    setupPendingSubmits(lobbyId, expectedCount);
  });
}

function signalAllVoted(lobbyId) {
  memeEvents.emit('allVoted', lobbyId);
}

function signalGameStarted(lobbyId, creationTime) {
  memeEvents.emit('gameStarted', lobbyId, creationTime);
}

function signalAllReady(lobbyId, expectedCount) {
  memeEvents.emit('allReady', lobbyId, expectedCount);
}

// ==================== GESTION DES SOUMISSIONS PENDING ====================

function setupPendingSubmits(lobbyId, expectedCount) {
  // Nettoyer si déjà existant
  if (pendingSubmits.has(lobbyId)) {
    const existing = pendingSubmits.get(lobbyId);
    if (existing.timeout) clearTimeout(existing.timeout);
  }
  
  // Timeout de sécurité : 5s max pour recevoir les créations
  const timeout = setTimeout(async () => {
    console.log(`[MEME API] Pending timeout for ${lobbyId}, starting vote with what we have`);
    pendingSubmits.delete(lobbyId);
    await startVotingPhaseNow(lobbyId);
  }, 5000);
  
  pendingSubmits.set(lobbyId, {
    expected: expectedCount,
    received: 0,
    timeout
  });
  
  console.log(`[MEME API] Setup pending: expecting ${expectedCount} creations, 5s timeout`);
}

function onCreationReceived(lobbyId) {
  if (!pendingSubmits.has(lobbyId)) return;
  
  const pending = pendingSubmits.get(lobbyId);
  pending.received++;
  
  console.log(`[MEME API] Creation received: ${pending.received}/${pending.expected}`);
  
  if (pending.received >= pending.expected) {
    console.log(`[MEME API] All creations received, starting vote`);
    clearTimeout(pending.timeout);
    pendingSubmits.delete(lobbyId);
    
    // Petit délai pour s'assurer que la BDD a bien enregistré
    setTimeout(() => startVotingPhaseNow(lobbyId), 500);
  }
}

async function startVotingPhaseNow(lobbyId) {
  try {
    const lobby = await db.getMemeLobbyById(lobbyId);
    if (!lobby || lobby.phase !== 'creation') {
      console.log(`[MEME API] Lobby not in creation phase, skipping`);
      return;
    }
    
    const currentRound = lobby.current_round;
    const allCreations = await db.getMemeCreationsByLobby(lobbyId, currentRound);
    
    console.log(`[MEME API] Starting vote with ${allCreations.length} creations`);
    
    if (allCreations.length === 0) {
      console.log(`[MEME API] No creations, skipping to results`);
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
    console.error(`[MEME API] startVotingPhaseNow error:`, error);
  }
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
    
    const participants = lobby.participants || [];
    
    // Émettre submitNow pour que les clients envoient leurs créations
    console.log(`[MEME TIMER] Emitting submitNow to ${participants.length} players`);
    io.to(`meme:${lobbyId}`).emit('meme:submitNow');
    
    // Configurer l'attente (on attend tous les participants)
    memeEvents.emit('creationTimeout', lobbyId, participants.length);
    
  } catch (error) {
    console.error(`[MEME TIMER] handleCreationTimeout error:`, error);
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
    if (!lobby) {
      voteTimers.delete(lobbyId);
      return;
    }
    
    console.log(`[MEME TIMER] Advancing vote for ${lobbyId}`);
    
    const result = await db.advanceToNextVote(lobbyId);
    
    if (result.phase === 'results') {
      console.log(`[MEME TIMER] All votes done, showing results`);
      
      const creations = await db.getMemeCreationsByLobby(lobbyId, result.current_round);
      await updatePlayerScores(lobbyId, creations);
      
      const updatedLobby = await db.getMemeLobbyById(lobbyId);
      
      io.to(`meme:${lobbyId}`).emit('meme:roundResults', {
        lobby: updatedLobby,
        creations
      });
      
      startResultsTimer(lobbyId, 5);
    } else {
      const voteTime = lobby.settings?.voteTime || 30;
      io.to(`meme:${lobbyId}`).emit('meme:nextVoteStarted', {
        lobby: result,
        currentIndex: result.current_vote_index,
        timeRemaining: voteTime
      });
      
      startVoteTimer(lobbyId, voteTime);
    }
    
  } catch (error) {
    console.error(`[MEME TIMER] advanceVote error:`, error);
    voteTimers.delete(lobbyId);
  }
}

// ==================== TIMER RÉSULTATS ====================

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
      console.log(`[MEME TIMER] Game finished!`);
      
      const allCreations = await db.getMemeCreationsByLobby(lobbyId);
      console.log(`[MEME TIMER] All creations for lobby ${lobbyId}:`, allCreations?.length);
      
      const updatedLobby = await db.updateMemeLobbyPhase(lobbyId, 'final');
      
      io.to(`meme:${lobbyId}`).emit('meme:gameFinished', {
        lobby: updatedLobby,
        allCreations
      });
    } else {
      console.log(`[MEME TIMER] Starting round ${currentRound + 1}`);
      
      const updatedLobby = await db.advanceToNextRound(lobbyId);
      
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
    
    for (const creation of creations) {
      const playerIndex = participants.findIndex(p => p.odId === creation.player_id);
      if (playerIndex !== -1) {
        participants[playerIndex].score = (participants[playerIndex].score || 0) + (creation.total_score || 0);
      }
    }
    
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
    
    // Vérifier si déjà soumis
    const existingCreations = await db.getMemeCreationsByLobby(lobbyId, currentRound);
    if (existingCreations.some(c => c.player_id === odId)) {
      console.log(`[MEME API] ${pseudo} already submitted, ignoring`);
      return res.json({ success: true, message: 'Déjà soumis', alreadySubmitted: true });
    }
    
    const creation = await db.createMemeCreation(
      lobbyId, currentRound, odId, pseudo, templateId, textLayers || [], finalImageBase64
    );
    
    console.log(`[MEME API] Creation saved: ${creation.id}`);
    
    // Signaler qu'une création a été reçue (pour le tracking pending)
    onCreationReceived(lobbyId);
    
    res.json({ success: true, creation });
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
