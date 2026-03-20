/**
 * Gestion des timers pour les quiz
 */

const { lobbyTimers } = require('./state');
const db = require('../database');

let io = null;

/**
 * Initialise le module avec l'instance Socket.IO
 */
function init(socketIo) {
  io = socketIo;
}

/**
 * Démarre un timer pour une question
 */
function startTimer(lobbyId, duration, questionId) {
  // Arrêter l'ancien timer si existant
  stopTimer(lobbyId);
  
  const startTime = Date.now();
  
  const timerInfo = {
    questionId,
    duration,
    startTime,
    intervalId: null
  };
  
  // Broadcast toutes les secondes
  timerInfo.intervalId = setInterval(() => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const remaining = Math.max(0, duration - elapsed);
    
    io.to(`lobby:${lobbyId}`).emit('timer:tick', {
      lobbyId,
      questionId,
      remaining,
      total: duration
    });
    
    // Timer expiré
    if (remaining <= 0) {
      handleTimerExpired(lobbyId, questionId);
    }
  }, 1000);
  
  lobbyTimers.set(lobbyId, timerInfo);
  
  console.log(`[TIMER] Démarré: ${duration}s pour lobby ${lobbyId}, question ${questionId}`);
}

/**
 * Arrête un timer
 */
function stopTimer(lobbyId) {
  const timerInfo = lobbyTimers.get(lobbyId);
  if (timerInfo) {
    if (timerInfo.intervalId) {
      clearInterval(timerInfo.intervalId);
    }
    lobbyTimers.delete(lobbyId);
    console.log(`[TIMER] Arrêté pour lobby ${lobbyId}`);
  }
}

/**
 * Gère l'expiration d'un timer
 */
async function handleTimerExpired(lobbyId, questionId) {
  stopTimer(lobbyId);
  
  // Notifier immédiatement que le temps est écoulé
  io.to(`lobby:${lobbyId}`).emit('timer:expired', { lobbyId, questionId });
  
  // Période de grâce de 500ms pour recevoir les derniers drafts
  console.log(`[TIMER] Expiration pour lobby ${lobbyId}, période de grâce de 500ms...`);
  
  setTimeout(async () => {
    const lobby = await db.getLobbyById(lobbyId);
    if (!lobby) return;
    
    // Forcer toutes les réponses non soumises avec le dernier draft
    for (const participant of lobby.participants) {
      if (!participant.hasAnswered) {
        const finalAnswer = await db.markTimeExpired(lobbyId, participant.participantId, questionId);
        console.log(`[TIMER] Temps expiré pour ${participant.pseudo}: réponse="${finalAnswer || '(vide)'}"`);
      }
    }
    
    // Broadcast l'état mis à jour - seulement le lobby, pas tout l'état global
    const { broadcastLobbyState } = require('./broadcast');
    await broadcastLobbyState(io, lobbyId);
  }, 500);
}

/**
 * Nettoie tous les timers (pour l'arrêt du serveur)
 */
function clearAllTimers() {
  lobbyTimers.forEach((timer, lobbyId) => {
    if (timer.intervalId) clearInterval(timer.intervalId);
  });
  lobbyTimers.clear();
}

module.exports = {
  init,
  startTimer,
  stopTimer,
  handleTimerExpired,
  clearAllTimers
};
