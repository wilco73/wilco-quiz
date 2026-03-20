/**
 * Fonctions de broadcast Socket.IO - Version optimisée
 * 
 * Stratégie d'optimisation :
 * - Broadcasts ciblés par type de données
 * - Pas d'envoi systématique de toutes les questions
 * - Deltas quand possible
 */

const db = require('../database');
const { getLobbyWithTimer } = require('./helpers');

/**
 * Émet l'état d'un lobby à tous ses participants
 */
async function broadcastLobbyState(io, lobbyId) {
  const lobby = await db.getLobbyById(lobbyId);
  if (!lobby) return;
  
  const quiz = await db.getQuizById(lobby.quizId);
  const lobbyWithTimer = getLobbyWithTimer(lobby);
  
  io.to(`lobby:${lobbyId}`).emit('lobby:state', {
    lobby: lobbyWithTimer,
    quiz
  });
}

/**
 * Émet uniquement les lobbies mis à jour
 * Utilisé quand un lobby change (création, join, leave, status)
 */
async function broadcastLobbiesUpdate(io) {
  const allLobbies = await db.getAllLobbies();
  const lobbies = allLobbies.map(l => getLobbyWithTimer(l));
  
  console.log(`[BROADCAST] lobbiesUpdate - ${lobbies.length} lobbies, participants: ${lobbies.map(l => l.participants?.length || 0).join(',')}`);
  io.emit('global:lobbiesUpdate', { lobbies });
}

/**
 * Émet uniquement les équipes mises à jour
 * Utilisé quand une équipe change (score, création, suppression)
 */
async function broadcastTeamsUpdate(io) {
  const teams = await db.getAllTeams();
  
  io.emit('global:teamsUpdate', { teams });
}

/**
 * Émet uniquement les participants mis à jour
 * Utilisé quand un participant change (inscription, équipe, rôle)
 */
async function broadcastParticipantsUpdate(io) {
  const allParticipants = await db.getAllParticipants();
  const participants = allParticipants.map(p => ({ ...p, password: '********' }));
  
  io.emit('global:participantsUpdate', { participants });
}

/**
 * Émet uniquement les quizzes mis à jour
 * Utilisé quand un quiz change (création, modification, suppression)
 */
async function broadcastQuizzesUpdate(io) {
  const quizzes = await db.getAllQuizzes();
  
  io.emit('global:quizzesUpdate', { quizzes });
}

/**
 * Émet uniquement les questions mises à jour
 * Utilisé uniquement quand les questions changent (import, création, modification)
 * NE PAS utiliser pour les actions de jeu !
 */
async function broadcastQuestionsUpdate(io) {
  const questions = await db.getAllQuestions();
  
  io.emit('global:questionsUpdate', { questions });
}

/**
 * Émet l'état global complet - À UTILISER AVEC PARCIMONIE
 * Uniquement pour l'initialisation d'un nouveau client
 */
async function broadcastGlobalState(io) {
  // Version allégée : ne broadcast que lobbies, teams et participants
  // Les quizzes et questions sont chargés à la demande
  const allLobbies = await db.getAllLobbies();
  const lobbies = allLobbies.map(l => getLobbyWithTimer(l));
  const teams = await db.getAllTeams();
  const allParticipants = await db.getAllParticipants();
  const participants = allParticipants.map(p => ({ ...p, password: '********' }));
  
  // Note: On envoie encore quizzes pour compatibilité, mais pas questions
  const quizzes = await db.getAllQuizzes();
  
  io.emit('global:state', { lobbies, teams, participants, quizzes });
}

/**
 * Émet l'état global initial à un socket spécifique
 * Inclut les questions car c'est un chargement initial
 */
async function emitInitialState(socket) {
  const allLobbies = await db.getAllLobbies();
  const lobbies = allLobbies.map(l => getLobbyWithTimer(l));
  const teams = await db.getAllTeams();
  const allParticipants = await db.getAllParticipants();
  const participants = allParticipants.map(p => ({ ...p, password: '********' }));
  const quizzes = await db.getAllQuizzes();
  const questions = await db.getAllQuestions();
  
  socket.emit('global:state', { lobbies, teams, participants, quizzes, questions });
}

/**
 * Helper: détermine quel broadcast utiliser selon le contexte
 */
const BroadcastType = {
  LOBBY: 'lobby',
  TEAM: 'team', 
  PARTICIPANT: 'participant',
  QUIZ: 'quiz',
  QUESTION: 'question',
  ALL: 'all'
};

/**
 * Broadcast intelligent selon le type de changement
 */
async function smartBroadcast(io, types) {
  if (!Array.isArray(types)) types = [types];
  
  for (const type of types) {
    switch (type) {
      case BroadcastType.LOBBY:
        await broadcastLobbiesUpdate(io);
        break;
      case BroadcastType.TEAM:
        await broadcastTeamsUpdate(io);
        break;
      case BroadcastType.PARTICIPANT:
        await broadcastParticipantsUpdate(io);
        break;
      case BroadcastType.QUIZ:
        await broadcastQuizzesUpdate(io);
        break;
      case BroadcastType.QUESTION:
        await broadcastQuestionsUpdate(io);
        break;
      case BroadcastType.ALL:
        await broadcastGlobalState(io);
        break;
    }
  }
}

/**
 * Émet la liste des mystery lobbies mise à jour
 * Utilisé quand un lobby mystery change (création, join, leave, status)
 */
async function broadcastMysteryLobbiesUpdate(io) {
  const mysteryLobbies = await db.getAllMysteryLobbies();
  
  console.log(`[BROADCAST] mysteryLobbiesUpdate - ${mysteryLobbies.length} lobbies`);
  io.emit('global:mysteryLobbiesUpdate', { mysteryLobbies });
}

module.exports = {
  broadcastLobbyState,
  broadcastLobbiesUpdate,
  broadcastTeamsUpdate,
  broadcastParticipantsUpdate,
  broadcastQuizzesUpdate,
  broadcastQuestionsUpdate,
  broadcastGlobalState,
  broadcastMysteryLobbiesUpdate,
  emitInitialState,
  smartBroadcast,
  BroadcastType
};
