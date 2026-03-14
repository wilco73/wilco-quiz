/**
 * Fonctions de broadcast Socket.IO
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
 * Émet l'état global à tous les clients connectés
 */
async function broadcastGlobalState(io) {
  const allLobbies = await db.getAllLobbies();
  const lobbies = allLobbies.map(l => getLobbyWithTimer(l));
  const teams = await db.getAllTeams();
  const allParticipants = await db.getAllParticipants();
  const participants = allParticipants.map(p => ({ ...p, password: '********' }));
  const quizzes = await db.getAllQuizzes();
  const questions = await db.getAllQuestions();
  
  io.emit('global:state', { lobbies, teams, participants, quizzes, questions });
}

/**
 * Émet l'état global initial à un socket spécifique
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

module.exports = {
  broadcastLobbyState,
  broadcastGlobalState,
  emitInitialState
};
