/**
 * Fonctions de broadcast Socket.IO - Version optimisée v2
 * 
 * Optimisations :
 * - Debounce pour éviter les rafales de broadcasts
 * - Requêtes batch optimisées
 * - Logs réduits
 */

const db = require('../database');
const { getLobbyWithTimer } = require('./helpers');
const debounce = require('./debounce');

// Compteur de broadcasts pour monitoring
let broadcastCount = 0;
setInterval(() => {
  if (broadcastCount > 0) {
    console.log(`[BROADCAST] ${broadcastCount} broadcasts dans la dernière minute`);
    broadcastCount = 0;
  }
}, 60000);

/**
 * Émet l'état d'un lobby à tous ses participants (avec debounce)
 */
async function broadcastLobbyState(io, lobbyId) {
  debounce.schedule('lobby', async () => {
    const lobby = await db.getLobbyById(lobbyId);
    if (!lobby) return;
    
    const quiz = await db.getQuizById(lobby.quizId);
    const lobbyWithTimer = getLobbyWithTimer(lobby);
    
    io.to(`lobby:${lobbyId}`).emit('lobby:state', {
      lobby: lobbyWithTimer,
      quiz
    });
    broadcastCount++;
  }, lobbyId);
}

/**
 * Émet l'état d'un lobby immédiatement (sans debounce)
 * À utiliser pour les actions critiques (démarrage quiz, changement question)
 */
async function broadcastLobbyStateImmediate(io, lobbyId) {
  const lobby = await db.getLobbyById(lobbyId);
  if (!lobby) return;
  
  const quiz = await db.getQuizById(lobby.quizId);
  const lobbyWithTimer = getLobbyWithTimer(lobby);
  
  io.to(`lobby:${lobbyId}`).emit('lobby:state', {
    lobby: lobbyWithTimer,
    quiz
  });
  broadcastCount++;
}

/**
 * Émet la liste des lobbies (avec debounce)
 */
async function broadcastLobbiesUpdate(io) {
  debounce.schedule('lobbies', async () => {
    try {
      const allLobbies = await db.getAllLobbies();
      const lobbies = allLobbies.map(l => getLobbyWithTimer(l));
      
      io.emit('global:lobbiesUpdate', { lobbies });
      broadcastCount++;
    } catch (error) {
      console.error('[BROADCAST] Erreur lobbies:', error.message);
    }
  });
}

/**
 * Émet la liste des lobbies immédiatement
 */
async function broadcastLobbiesUpdateImmediate(io) {
  try {
    const allLobbies = await db.getAllLobbies();
    const lobbies = allLobbies.map(l => getLobbyWithTimer(l));
    
    io.emit('global:lobbiesUpdate', { lobbies });
    broadcastCount++;
  } catch (error) {
    console.error('[BROADCAST] Erreur lobbies immediate:', error.message);
  }
}

/**
 * Émet uniquement les équipes mises à jour (avec debounce)
 */
async function broadcastTeamsUpdate(io) {
  debounce.schedule('teams', async () => {
    try {
      const teams = await db.getAllTeams();
      io.emit('global:teamsUpdate', { teams });
      broadcastCount++;
    } catch (error) {
      console.error('[BROADCAST] Erreur teams:', error.message);
    }
  });
}

/**
 * Émet uniquement les participants mis à jour (avec debounce)
 */
async function broadcastParticipantsUpdate(io) {
  debounce.schedule('participants', async () => {
    try {
      const allParticipants = await db.getAllParticipants();
      const participants = allParticipants.map(p => ({ ...p, password: '********' }));
      io.emit('global:participantsUpdate', { participants });
      broadcastCount++;
    } catch (error) {
      console.error('[BROADCAST] Erreur participants:', error.message);
    }
  });
}

/**
 * Émet uniquement les quizzes mis à jour (avec debounce)
 */
async function broadcastQuizzesUpdate(io) {
  debounce.schedule('quizzes', async () => {
    const quizzes = await db.getAllQuizzes();
    io.emit('global:quizzesUpdate', { quizzes });
    broadcastCount++;
  });
}

/**
 * Émet uniquement les questions mises à jour (avec debounce)
 */
async function broadcastQuestionsUpdate(io) {
  debounce.schedule('questions', async () => {
    const questions = await db.getAllQuestions();
    io.emit('global:questionsUpdate', { questions });
    broadcastCount++;
  });
}

/**
 * Émet l'état global complet - À UTILISER AVEC PARCIMONIE
 */
async function broadcastGlobalState(io) {
  try {
    const allLobbies = await db.getAllLobbies();
    const lobbies = allLobbies.map(l => getLobbyWithTimer(l));
    const teams = await db.getAllTeams();
    const allParticipants = await db.getAllParticipants();
    const participants = allParticipants.map(p => ({ ...p, password: '********' }));
    const quizzes = await db.getAllQuizzes();
    
    io.emit('global:state', { lobbies, teams, participants, quizzes });
    broadcastCount++;
  } catch (error) {
    console.error('[BROADCAST] Erreur globalState:', error.message);
  }
}

/**
 * Émet l'état global initial à un socket spécifique
 */
async function emitInitialState(socket) {
  try {
    const allLobbies = await db.getAllLobbies();
    const lobbies = allLobbies.map(l => getLobbyWithTimer(l));
    const teams = await db.getAllTeams();
    const allParticipants = await db.getAllParticipants();
    const participants = allParticipants.map(p => ({ ...p, password: '********' }));
    const quizzes = await db.getAllQuizzes();
    const questions = await db.getAllQuestions();
    
    socket.emit('global:state', { lobbies, teams, participants, quizzes, questions });
    broadcastCount++;
  } catch (error) {
    console.error('[BROADCAST] Erreur emitInitialState:', error.message);
    // Envoyer un état vide plutôt que de crasher
    socket.emit('global:state', { lobbies: [], teams: [], participants: [], quizzes: [], questions: [] });
  }
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
 * Émet la liste des mystery lobbies mise à jour (avec debounce)
 */
async function broadcastMysteryLobbiesUpdate(io) {
  debounce.schedule('mystery', async () => {
    const mysteryLobbies = await db.getAllMysteryLobbies();
    io.emit('global:mysteryLobbiesUpdate', { mysteryLobbies });
    broadcastCount++;
  });
}

module.exports = {
  broadcastLobbyState,
  broadcastLobbyStateImmediate,
  broadcastLobbiesUpdate,
  broadcastLobbiesUpdateImmediate,
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
