/**
 * État partagé en mémoire
 * Stocke les données temporaires qui ne vont pas en base de données
 */

// Timers actifs par lobby (quiz)
const lobbyTimers = new Map();

// Participants connectés par socket
const connectedParticipants = new Map(); // socketId -> { odId, odId, odId }

// Sockets par participant
const participantSockets = new Map(); // odId -> Set<socketId>

// Parties de Pictionary/Relay en cours
const pictionaryGames = new Map(); // lobbyId -> gameState

// Timers Pictionary/Relay
const pictionaryTimers = new Map(); // lobbyId -> intervalId

module.exports = {
  lobbyTimers,
  connectedParticipants,
  participantSockets,
  pictionaryGames,
  pictionaryTimers
};
