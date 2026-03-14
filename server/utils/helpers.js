/**
 * Fonctions utilitaires
 */

const { lobbyTimers } = require('./state');

/**
 * Mélange un tableau (Fisher-Yates shuffle)
 */
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Récupère les questions d'un quiz (mélangées ou non)
 */
function getQuizQuestions(lobby, quiz) {
  if (lobby.shuffled && lobby.shuffledQuestions) {
    return lobby.shuffledQuestions;
  }
  return quiz?.questions || [];
}

/**
 * Ajoute les informations de timer à un lobby
 */
function getLobbyWithTimer(lobby) {
  if (!lobby) return null;
  
  const timerInfo = lobbyTimers.get(lobby.id);
  if (lobby.status === 'playing' && timerInfo) {
    const elapsed = Math.floor((Date.now() - timerInfo.startTime) / 1000);
    const remaining = Math.max(0, timerInfo.duration - elapsed);
    
    return {
      ...lobby,
      questionStartTime: timerInfo.startTime,
      timeRemaining: remaining,
      timerDuration: timerInfo.duration
    };
  }
  return lobby;
}

module.exports = {
  shuffleArray,
  getQuizQuestions,
  getLobbyWithTimer
};
