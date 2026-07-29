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

    // ===== Auto-validation (QCM + classement d'images) après promotion des brouillons =====
    try {
      const updated = await db.getLobbyById(lobbyId);
      const quiz = await db.getQuizById(updated.quizId);
      const questions = (updated.shuffled && updated.shuffledQuestions)
        ? updated.shuffledQuestions
        : (quiz?.questions || []);
      const question = questions.find(q => q.id === questionId);

      if (question && (question.type === 'qcm' || question.type === 'image_order') && !updated.trainingMode) {
        const norm = (s) => String(s || '').toLowerCase().trim();
        const quizCategory = quiz?.groupName || 'Sans catégorie';

        // Valider chaque participant
        for (const p of updated.participants) {
          const isCorrect = norm(p.answersByQuestionId?.[questionId]) === norm(question.answer);
          await db.validateAnswer(lobbyId, p.participantId, questionId, isCorrect);
        }

        // Points d'équipe : uniquement si TOUS les membres de l'équipe ont le bon ordre/la bonne réponse
        const teamNames = [...new Set(updated.participants.map(p => p.teamName).filter(Boolean))];
        for (const teamName of teamNames) {
          const members = updated.participants.filter(p => p.teamName === teamName);
          const allCorrect = members.every(p => norm(p.answersByQuestionId?.[questionId]) === norm(question.answer));
          if (allCorrect) {
            const alreadyScored = await db.hasTeamScoredForQuestion(lobbyId, teamName, questionId);
            if (!alreadyScored) {
              const team = await db.getTeamByName(teamName);
              if (team) {
                await db.addTeamScoreByCategory(team.id, quizCategory, question.points || 1);
                await db.markQcmTeamScored(lobbyId, members[0].participantId, questionId);
                console.log(`[TIMER] Équipe "${teamName}" tous corrects (${question.type}) -> +${question.points || 1}`);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('[TIMER] Erreur auto-validation à l\'expiration:', e.message);
    }

    // Broadcast l'état mis à jour
    const { broadcastLobbyState, broadcastLobbiesUpdate } = require('./broadcast');
    await broadcastLobbyState(io, lobbyId);  // Pour les joueurs dans le lobby
    await broadcastLobbiesUpdate(io);         // Pour l'admin en monitoring
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
