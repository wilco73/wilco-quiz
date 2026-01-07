/**
 * Serveur Wilco Quiz v3.0
 * Socket.IO pour communication temps reel
 * SQLite pour la persistance des donnees
 * Mots de passe hashes avec bcrypt
 */

const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const db = require('./database');

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Configuration Socket.IO avec CORS
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3001", "http://127.0.0.1:3000"],
    methods: ["GET", "POST"],
    credentials: true
  },
  pingTimeout: 60000,
  pingInterval: 25000
});

// Middleware Express
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ==================== STOCKAGE EN MEMOIRE ====================

// Timers actifs par lobby
const lobbyTimers = new Map();

// Participants connectes par socket
const connectedParticipants = new Map(); // socketId -> { odId, odId, odId }

// Sockets par participant
const participantSockets = new Map(); // odId -> Set<socketId>

// Parties de Pictionary en cours
const pictionaryGames = new Map(); // lobbyId -> gameState

// Timers Pictionary
const pictionaryTimers = new Map(); // lobbyId -> intervalId

// ==================== PICTIONARY FUNCTIONS ====================

function startPictionaryTimer(lobbyId) {
  // Arrêter tout timer existant
  if (pictionaryTimers.has(lobbyId)) {
    clearInterval(pictionaryTimers.get(lobbyId));
  }
  
  const intervalId = setInterval(() => {
    const gameState = pictionaryGames.get(lobbyId);
    if (!gameState || gameState.status !== 'playing') {
      clearInterval(intervalId);
      pictionaryTimers.delete(lobbyId);
      return;
    }
    
    // Décrémenter le temps
    gameState.timeRemaining--;
    
    // Gérer la rotation des dessinateurs
    if (gameState.config.timePerDrawer > 0) {
      gameState.drawerRotationTime--;
      
      if (gameState.drawerRotationTime <= 0) {
        // Passer au dessinateur suivant
        gameState.currentDrawerIndex++;
        gameState.drawerRotationTime = gameState.config.timePerDrawer;
        
        io.to(`drawing:${lobbyId}`).emit('pictionary:drawerRotation', {
          newDrawerIndex: gameState.currentDrawerIndex
        });
      }
    }
    
    // Broadcaster le temps restant
    io.to(`drawing:${lobbyId}`).emit('pictionary:timerTick', {
      timeRemaining: gameState.timeRemaining,
      drawerRotationTime: gameState.drawerRotationTime
    });
    
    // Temps écoulé pour ce tour
    if (gameState.timeRemaining <= 0) {
      console.log(`[PICTIONARY] Temps écoulé - Tour ${gameState.currentRound + 1}/${gameState.config.rounds}`);
      
      // Envoyer l'événement timeUp avec infos complètes (une seule fois)
      io.to(`drawing:${lobbyId}`).emit('pictionary:timeUp', {
        word: gameState.currentWord,
        teamsFound: gameState.teamsFound,
        scores: gameState.scores,
        drawingTeam: gameState.drawingTeam,
        currentRound: gameState.currentRound
      });
      
      // Attendre 5 secondes puis passer au tour suivant ou terminer
      setTimeout(() => {
        const currentGameState = pictionaryGames.get(lobbyId);
        if (!currentGameState || currentGameState.status !== 'playing') return;
        
        // Passer au tour suivant
        triggerNextRound(lobbyId);
      }, 5000);
      
      // Réinitialiser le timer à une grande valeur pour éviter les répétitions
      // pendant qu'on attend le passage au tour suivant
      gameState.timeRemaining = 9999;
    }
  }, 1000);
  
  pictionaryTimers.set(lobbyId, intervalId);
}

function endPictionaryGame(lobbyId) {
  const gameState = pictionaryGames.get(lobbyId);
  if (!gameState) return;
  
  gameState.status = 'finished';
  
  // Arrêter le timer
  if (pictionaryTimers.has(lobbyId)) {
    clearInterval(pictionaryTimers.get(lobbyId));
    pictionaryTimers.delete(lobbyId);
  }
  
  // Calculer le classement final
  const ranking = Object.entries(gameState.scores)
    .sort(([,a], [,b]) => b - a)
    .map(([team, score], index) => ({ team, score, rank: index + 1 }));
  
  console.log(`[PICTIONARY] Partie terminée - Lobby: ${lobbyId}`);
  console.log('[PICTIONARY] Classement:', ranking);
  
  // Mettre à jour en DB
  db.finishDrawingLobby(lobbyId);
  
  // Broadcaster la fin de partie
  io.to(`drawing:${lobbyId}`).emit('pictionary:ended', {
    scores: gameState.scores,
    ranking,
    totalRounds: gameState.config.rounds
  });
  
  // Nettoyer après un délai
  setTimeout(() => {
    pictionaryGames.delete(lobbyId);
  }, 60000);
}

// Fonction pour passer au tour suivant automatiquement
function triggerNextRound(lobbyId) {
  const gameState = pictionaryGames.get(lobbyId);
  if (!gameState || gameState.status !== 'playing') return;
  
  // Incrémenter le tour
  gameState.currentRound++;
  
  if (gameState.currentRound >= gameState.config.rounds) {
    // Fin de la partie
    endPictionaryGame(lobbyId);
    return;
  }
  
  // Équipe suivante qui dessine
  gameState.drawingTeamIndex = (gameState.drawingTeamIndex + 1) % gameState.teams.length;
  gameState.drawingTeam = gameState.teams[gameState.drawingTeamIndex];
  gameState.currentWord = gameState.words[gameState.currentRound]?.word || '';
  gameState.currentDrawerIndex = 0;
  gameState.teamsFound = [];
  gameState.guesses = [];
  gameState.timeRemaining = gameState.config.timePerRound;
  gameState.drawerRotationTime = gameState.config.timePerDrawer || 0;
  
  // Mettre à jour en DB
  db.updateDrawingLobbyState(lobbyId, {
    currentRound: gameState.currentRound,
    currentWord: gameState.currentWord,
    roundStartTime: Date.now()
  });
  
  // Broadcaster le nouveau tour
  io.to(`drawing:${lobbyId}`).emit('pictionary:newRound', {
    currentRound: gameState.currentRound,
    totalRounds: gameState.config.rounds,
    drawingTeam: gameState.drawingTeam,
    timeRemaining: gameState.config.timePerRound
  });
  
  // Envoyer le nouveau mot à l'équipe qui dessine
  io.to(`drawing:${lobbyId}`).emit('pictionary:wordReveal', {
    word: gameState.currentWord,
    forTeam: gameState.drawingTeam
  });
  
  // Effacer le canvas
  io.to(`drawing:${lobbyId}`).emit('drawing:clear', {
    lobbyId,
    fromServer: true
  });
  
  console.log(`[PICTIONARY] Passage automatique au tour ${gameState.currentRound + 1}/${gameState.config.rounds}`);
}

// ==================== HELPERS ====================

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getQuizQuestions(lobby, quiz) {
  if (lobby.shuffled && lobby.shuffledQuestions) {
    return lobby.shuffledQuestions;
  }
  return quiz?.questions || [];
}

// Obtenir le lobby avec les infos de timer
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

// Emettre l'etat du lobby a tous les participants
function broadcastLobbyState(lobbyId) {
  const lobby = db.getLobbyById(lobbyId);
  if (!lobby) return;
  
  const quiz = db.getQuizById(lobby.quizId);
  const lobbyWithTimer = getLobbyWithTimer(lobby);
  
  io.to(`lobby:${lobbyId}`).emit('lobby:state', {
    lobby: lobbyWithTimer,
    quiz
  });
}

// Emettre a tous les clients (pour les listes de lobbies)
function broadcastGlobalState() {
  const lobbies = db.getAllLobbies().map(l => getLobbyWithTimer(l));
  const teams = db.getAllTeams();
  const participants = db.getAllParticipants().map(p => ({ ...p, password: '********' }));
  const quizzes = db.getAllQuizzes();
  const questions = db.getAllQuestions();
  
  io.emit('global:state', { lobbies, teams, participants, quizzes, questions });
}

// ==================== GESTION DES TIMERS ====================

function startTimer(lobbyId, duration, questionId) {
  // Arreter l'ancien timer si existant
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
    
    // Timer expire
    if (remaining <= 0) {
      handleTimerExpired(lobbyId, questionId);
    }
  }, 1000);
  
  lobbyTimers.set(lobbyId, timerInfo);
  
  console.log(`[TIMER] Demarre: ${duration}s pour lobby ${lobbyId}, question ${questionId}`);
}

function stopTimer(lobbyId) {
  const timerInfo = lobbyTimers.get(lobbyId);
  if (timerInfo) {
    if (timerInfo.intervalId) {
      clearInterval(timerInfo.intervalId);
    }
    lobbyTimers.delete(lobbyId);
    console.log(`[TIMER] Arrete pour lobby ${lobbyId}`);
  }
}

function handleTimerExpired(lobbyId, questionId) {
  stopTimer(lobbyId);
  
  // Notifier immédiatement que le temps est écoulé (pour bloquer l'UI)
  io.to(`lobby:${lobbyId}`).emit('timer:expired', { lobbyId, questionId });
  
  // Période de grâce de 500ms pour recevoir les derniers drafts
  // Cela permet aux réponses envoyées à la dernière seconde d'arriver
  console.log(`[TIMER] Expiration du timer pour lobby ${lobbyId}, période de grâce de 500ms...`);
  
  setTimeout(() => {
    const lobby = db.getLobbyById(lobbyId);
    if (!lobby) return;
    
    // Forcer toutes les réponses non soumises avec le dernier draft reçu
    lobby.participants.forEach(participant => {
      if (!participant.hasAnswered) {
        const finalAnswer = db.markTimeExpired(lobbyId, participant.participantId, questionId);
        console.log(`[TIMER] Temps expiré pour ${participant.pseudo}: réponse="${finalAnswer || '(vide)'}"`);
      }
    });
    
    // Broadcast l'état mis à jour après la période de grâce
    broadcastLobbyState(lobbyId);
    broadcastGlobalState(); // Pour que l'admin voie la mise à jour
  }, 500); // 500ms de délai de grâce
}

// ==================== SOCKET.IO EVENTS ====================

io.on('connection', (socket) => {
  console.log(`[SOCKET] Connexion: ${socket.id}`);
  
  // Envoyer l'etat initial
  socket.emit('global:state', {
    lobbies: db.getAllLobbies().map(l => getLobbyWithTimer(l)),
    teams: db.getAllTeams(),
    participants: db.getAllParticipants().map(p => ({ ...p, password: '********' })),
    quizzes: db.getAllQuizzes(),
    questions: db.getAllQuestions()
  });
  
  // Handler pour demander l'etat global (reconnexion)
  socket.on('global:requestState', () => {
    console.log(`[SOCKET] Demande d'etat global de ${socket.id}`);
    socket.emit('global:state', {
      lobbies: db.getAllLobbies().map(l => getLobbyWithTimer(l)),
      teams: db.getAllTeams(),
      participants: db.getAllParticipants().map(p => ({ ...p, password: '********' })),
      quizzes: db.getAllQuizzes(),
      questions: db.getAllQuestions()
    });
  });
  
  // ==================== AUTHENTIFICATION ====================
  
  socket.on('auth:login', async (data, callback) => {
    const { teamName, pseudo, password, isAdmin } = data;
    
    if (isAdmin) {
      const admin = db.verifyAdmin(pseudo, password);
      if (admin) {
        callback({ success: true, user: { ...admin, isAdmin: true } });
      } else {
        callback({ success: false, message: 'Identifiants admin incorrects' });
      }
      return;
    }
    
    // Login participant
    const existingParticipant = db.getParticipantByPseudo(pseudo);
    
    if (existingParticipant) {
      if (!db.verifyParticipantPassword(pseudo, password)) {
        callback({ success: false, message: 'Ce pseudo existe avec un mot de passe different' });
        return;
      }
      
      // Connexion reussie - on garde l'equipe existante du participant
      connectedParticipants.set(socket.id, { odId: existingParticipant.id, pseudo });
      
      if (!participantSockets.has(existingParticipant.id)) {
        participantSockets.set(existingParticipant.id, new Set());
      }
      participantSockets.get(existingParticipant.id).add(socket.id);
      
      callback({ success: true, user: existingParticipant });
      return;
    }
    
    // Creer nouveau participant SANS equipe
    const odId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newParticipant = db.createParticipant(odId, pseudo, password, null);
    
    connectedParticipants.set(socket.id, { odId, pseudo });
    if (!participantSockets.has(odId)) {
      participantSockets.set(odId, new Set());
    }
    participantSockets.get(odId).add(socket.id);
    
    console.log(`[AUTH] Nouveau participant: "${pseudo}" (sans equipe)`);
    
    // Notifier tout le monde du nouveau participant
    broadcastGlobalState();
    
    callback({ success: true, user: newParticipant, isNew: true });
  });
  
  socket.on('auth:confirmTeamChange', async (data, callback) => {
    const { odId, newTeamName, password } = data;
    
    const participant = db.getParticipantById(odId);
    if (!participant) {
      callback({ success: false, message: 'Participant introuvable' });
      return;
    }
    
    const normalizedTeamName = db.normalizeTeamName(newTeamName);
    let team = db.getTeamByName(normalizedTeamName);
    if (!team) {
      team = db.createTeam(normalizedTeamName);
    }
    
    db.updateParticipantTeam(odId, team.id);
    const updatedParticipant = db.getParticipantById(odId);
    
    console.log(`[AUTH] Changement d'equipe: "${participant.pseudo}" -> "${normalizedTeamName}"`);
    
    broadcastGlobalState();
    callback({ success: true, user: updatedParticipant });
  });
  
  // ==================== LOBBY MANAGEMENT ====================
  
  socket.on('lobby:create', (data, callback) => {
    const { quizId, shuffle } = data;
    
    const quiz = db.getQuizById(quizId);
    if (!quiz) {
      callback({ success: false, message: 'Quiz introuvable' });
      return;
    }
    
    const lobby = db.createLobby(quizId, shuffle);
    console.log(`[LOBBY] Cree: ${lobby.id} pour quiz "${quiz.title}"`);
    
    broadcastGlobalState();
    callback({ success: true, lobby });
  });
  
  socket.on('lobby:join', (data, callback) => {
    const { lobbyId, odId, pseudo, teamName } = data;
    
    const lobby = db.getLobbyById(lobbyId);
    if (!lobby) {
      callback({ success: false, message: 'Lobby introuvable' });
      return;
    }
    
    // Verifier si deja dans le lobby
    const alreadyInLobby = lobby.participants?.some(p => p.participantId === odId);
    
    // Refuser si le quiz est termine
    if (!alreadyInLobby && lobby.status === 'finished') {
      callback({ success: false, message: 'Le quiz est termine' });
      return;
    }
    
    // Si pas encore dans le lobby, l'ajouter
    if (!alreadyInLobby) {
      db.joinLobby(lobbyId, odId, pseudo, teamName);
      
      // Si le quiz est en cours, marquer les questions passees comme "manquees"
      if (lobby.status === 'playing' && lobby.session) {
        const quiz = db.getQuizById(lobby.quizId);
        const questions = lobby.shuffled && lobby.shuffledQuestions 
          ? lobby.shuffledQuestions 
          : quiz?.questions || [];
        
        // Marquer toutes les questions deja passees comme repondues (vide)
        for (let i = 0; i < lobby.session.currentQuestionIndex; i++) {
          const question = questions[i];
          if (question) {
            db.submitAnswer(lobbyId, odId, question.id, '');
            db.validateAnswer(lobbyId, odId, question.id, false);
          }
        }
        console.log(`[LOBBY] ${pseudo} rejoint en cours - ${lobby.session.currentQuestionIndex} questions manquees`);
      }
    }
    
    // TOUJOURS rejoindre la room Socket.IO (meme si deja dans le lobby DB)
    socket.join(`lobby:${lobbyId}`);
    
    // Stocker l'association socket <-> lobby
    socket.lobbyId = lobbyId;
    socket.odId = odId;
    
    const updatedLobby = db.getLobbyById(lobbyId);
    const quiz = db.getQuizById(updatedLobby.quizId);
    
    console.log(`[LOBBY] ${pseudo} a rejoint ${lobbyId} (room socket + ${alreadyInLobby ? 'deja dans DB' : 'ajout DB'})`);
    
    // Notifier tous les participants du lobby
    if (!alreadyInLobby) {
      io.to(`lobby:${lobbyId}`).emit('lobby:participantJoined', {
        participant: { odId, pseudo, teamName },
        lobby: updatedLobby
      });
    }
    
    // Broadcast l'etat du lobby a tous les participants
    broadcastLobbyState(lobbyId);
    broadcastGlobalState();
    callback({ success: true, lobby: getLobbyWithTimer(updatedLobby), quiz });
  });
  
  socket.on('lobby:leave', (data, callback) => {
    const { lobbyId, odId } = data;
    
    db.leaveLobby(lobbyId, odId);
    socket.leave(`lobby:${lobbyId}`);
    delete socket.lobbyId;
    delete socket.odId;
    
    console.log(`[LOBBY] Participant ${odId} a quitte ${lobbyId}`);
    
    io.to(`lobby:${lobbyId}`).emit('lobby:participantLeft', { odId });
    
    // Broadcast l'etat du lobby a tous les participants restants
    broadcastLobbyState(lobbyId);
    broadcastGlobalState();
    
    if (callback) callback({ success: true });
  });
  
  socket.on('lobby:delete', (data, callback) => {
    const { lobbyId } = data;
    
    stopTimer(lobbyId);
    db.deleteLobby(lobbyId);
    
    io.to(`lobby:${lobbyId}`).emit('lobby:deleted', { lobbyId });
    io.socketsLeave(`lobby:${lobbyId}`);
    
    console.log(`[LOBBY] Supprime: ${lobbyId}`);
    
    broadcastGlobalState();
    if (callback) callback({ success: true });
  });
  
  // Arreter un quiz en cours et le remettre en attente
  socket.on('lobby:stop', (data, callback) => {
    const { lobbyId } = data;
    
    const lobby = db.getLobbyById(lobbyId);
    if (!lobby) {
      callback({ success: false, message: 'Lobby introuvable' });
      return;
    }
    
    if (lobby.status !== 'playing') {
      callback({ success: false, message: 'Le quiz n\'est pas en cours' });
      return;
    }
    
    // Arreter le timer
    stopTimer(lobbyId);
    
    // Remettre le lobby en attente
    db.resetLobby(lobbyId);
    
    const updatedLobby = db.getLobbyById(lobbyId);
    
    // Notifier tous les participants
    io.to(`lobby:${lobbyId}`).emit('lobby:stopped', { 
      lobbyId,
      lobby: updatedLobby,
      message: 'Le quiz a ete arrete par l\'administrateur'
    });
    
    console.log(`[LOBBY] Quiz arrete: ${lobbyId}`);
    
    broadcastLobbyState(lobbyId);
    broadcastGlobalState();
    
    callback({ success: true });
  });
  
  // ==================== QUIZ FLOW ====================
  
  socket.on('quiz:start', (data, callback) => {
    const { lobbyId } = data;
    
    const lobby = db.getLobbyById(lobbyId);
    if (!lobby) {
      callback({ success: false, message: 'Lobby introuvable' });
      return;
    }
    
    db.startLobby(lobbyId);
    const updatedLobby = db.getLobbyById(lobbyId);
    const quiz = db.getQuizById(updatedLobby.quizId);
    const questions = getQuizQuestions(updatedLobby, quiz);
    
    // Demarrer le timer si la premiere question en a un
    const firstQuestion = questions[0];
    if (firstQuestion && firstQuestion.timer > 0) {
      startTimer(lobbyId, firstQuestion.timer, firstQuestion.id);
    }
    
    console.log(`[QUIZ] Demarre: lobby ${lobbyId}`);
    
    io.to(`lobby:${lobbyId}`).emit('quiz:started', {
      lobby: getLobbyWithTimer(updatedLobby),
      quiz,
      currentQuestion: firstQuestion,
      questionIndex: 0
    });
    
    broadcastGlobalState();
    callback({ success: true });
  });
  
  socket.on('quiz:nextQuestion', (data, callback) => {
    const { lobbyId } = data;
    
    const lobby = db.getLobbyById(lobbyId);
    if (!lobby) {
      callback({ success: false, message: 'Lobby introuvable' });
      return;
    }
    
    const quiz = db.getQuizById(lobby.quizId);
    const questions = getQuizQuestions(lobby, quiz);
    const nextIndex = (lobby.session?.currentQuestionIndex || 0) + 1;
    
    if (nextIndex >= questions.length) {
      // Quiz termine
      stopTimer(lobbyId);
      db.finishLobby(lobbyId);
      
      const finishedLobby = db.getLobbyById(lobbyId);
      
      io.to(`lobby:${lobbyId}`).emit('quiz:finished', { 
        lobbyId,
        lobby: getLobbyWithTimer(finishedLobby),
        quiz
      });
      broadcastLobbyState(lobbyId);
      broadcastGlobalState();
      
      callback({ success: true, finished: true });
      return;
    }
    
    // Arreter l'ancien timer
    stopTimer(lobbyId);
    
    // Passer a la question suivante
    db.updateLobbyQuestionIndex(lobbyId, nextIndex);
    
    const nextQuestion = questions[nextIndex];
    
    // Demarrer le nouveau timer si necessaire
    if (nextQuestion && nextQuestion.timer > 0) {
      startTimer(lobbyId, nextQuestion.timer, nextQuestion.id);
    }
    
    const updatedLobby = db.getLobbyById(lobbyId);
    
    console.log(`[QUIZ] Question ${nextIndex + 1}/${questions.length} pour lobby ${lobbyId}`);
    
    io.to(`lobby:${lobbyId}`).emit('quiz:questionChanged', {
      lobby: getLobbyWithTimer(updatedLobby),
      currentQuestion: nextQuestion,
      questionIndex: nextIndex,
      totalQuestions: questions.length
    });
    
    broadcastGlobalState();
    callback({ success: true, questionIndex: nextIndex });
  });
  
  // ==================== ANSWERS ====================
  
  socket.on('answer:draft', (data) => {
    const { lobbyId, odId, answer } = data;
    
    // Sauvegarder le brouillon
    db.autoSaveAnswer(lobbyId, odId, answer);
    
    // Notifier l'admin pour le monitoring
    io.to(`lobby:${lobbyId}`).emit('answer:draftUpdated', {
      odId,
      answer,
      timestamp: Date.now()
    });
  });
  
  socket.on('answer:paste', (data) => {
    const { lobbyId, odId, questionId, pastedText } = data;
    
    console.log(`[PASTE] ${odId} a fait un copier-coller: "${pastedText?.substring(0, 50)}..."`);
    
    // Marquer que la réponse contient un copier-coller
    db.markAnswerPasted(lobbyId, odId, questionId);
    
    // Notifier l'admin discrètement
    io.to(`lobby:${lobbyId}`).emit('answer:pasteDetected', {
      odId,
      questionId,
      timestamp: Date.now()
    });
  });
  
  socket.on('answer:submit', (data, callback) => {
    const { lobbyId, odId, questionId, answer } = data;
    
    const lobby = db.getLobbyById(lobbyId);
    if (!lobby) {
      callback({ success: false, message: 'Lobby introuvable' });
      return;
    }
    
    // Verifier si deja repondu
    const participant = lobby.participants.find(p => p.participantId === odId);
    if (participant && participant.hasAnswered) {
      callback({ success: false, message: 'Reponse deja soumise' });
      return;
    }
    
    // Soumettre la reponse
    db.submitAnswer(lobbyId, odId, questionId, answer);
    
    const updatedLobby = db.getLobbyById(lobbyId);
    const quiz = db.getQuizById(lobby.quizId);
    const questions = getQuizQuestions(lobby, quiz);
    const currentQuestion = questions[updatedLobby.session?.currentQuestionIndex || 0];
    
    // Auto-validation pour QCM
    let autoValidated = false;
    if (currentQuestion && currentQuestion.type === 'qcm') {
      const isCorrect = answer.toLowerCase().trim() === currentQuestion.answer.toLowerCase().trim();
      db.validateAnswer(lobbyId, odId, questionId, isCorrect);
      autoValidated = true;
      
      // Attribution automatique des points pour QCM
      if (isCorrect) {
        const updatedParticipant = updatedLobby.participants.find(p => p.participantId === odId);
        if (updatedParticipant && updatedParticipant.teamName) {
          const validation = db.getParticipantValidation(lobbyId, odId, questionId);
          if (!validation?.qcm_team_scored) {
            const team = db.getTeamByName(updatedParticipant.teamName);
            if (team) {
              db.addTeamScore(team.id, currentQuestion.points || 1);
              db.markQcmTeamScored(lobbyId, odId, questionId);
            }
          }
        }
      }
    }
    
    // Auto-rejet pour reponses vides
    if (!answer || answer.trim() === '') {
      db.validateAnswer(lobbyId, odId, questionId, false);
      autoValidated = true;
    }
    
    console.log(`[ANSWER] ${odId} a soumis: "${answer}" (auto-validated: ${autoValidated})`);
    
    // Notifier tout le lobby
    io.to(`lobby:${lobbyId}`).emit('answer:submitted', {
      odId,
      hasAnswered: true,
      autoValidated
    });
    
    broadcastLobbyState(lobbyId);
    broadcastGlobalState(); // Pour que l'admin voie la mise a jour dans LiveMonitoring
    callback({ success: true, autoValidated });
  });
  
  socket.on('answer:validate', (data, callback) => {
    const { lobbyId, odId, questionId, isCorrect, points } = data;
    
    db.validateAnswer(lobbyId, odId, questionId, isCorrect);
    
    // Ajouter les points a l'equipe si correct
    if (isCorrect) {
      const lobby = db.getLobbyById(lobbyId);
      const participant = lobby?.participants.find(p => p.participantId === odId);
      
      if (participant && participant.teamName) {
        const team = db.getTeamByName(participant.teamName);
        if (team) {
          db.addTeamScore(team.id, points || 1);
          console.log(`[SCORE] +${points || 1} point(s) pour equipe "${participant.teamName}"`);
        }
      }
    }
    
    console.log(`[VALIDATE] ${odId}: ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);
    
    io.to(`lobby:${lobbyId}`).emit('answer:validated', {
      odId,
      questionId,
      isCorrect
    });
    
    broadcastLobbyState(lobbyId);
    broadcastGlobalState();
    
    callback({ success: true });
  });
  
  // ==================== ADMIN OPERATIONS ====================
  
  socket.on('admin:joinMonitoring', (data) => {
    const { lobbyId } = data;
    socket.join(`lobby:${lobbyId}`);
    console.log(`[ADMIN] Rejoint le monitoring de ${lobbyId}`);
    
    // Envoyer l'etat actuel
    broadcastLobbyState(lobbyId);
  });
  
  socket.on('admin:leaveMonitoring', (data) => {
    const { lobbyId } = data;
    socket.leave(`lobby:${lobbyId}`);
  });
  
  socket.on('admin:resetScores', (callback) => {
    db.resetAllTeamScores();
    console.log('[ADMIN] Scores reinitialises');
    broadcastGlobalState();
    callback({ success: true });
  });
  
  // ==================== DESSIN COLLABORATIF ====================
  
  // Recevoir et broadcaster un trait de dessin
  socket.on('drawing:stroke', (data) => {
    const { lobbyId, teamId, odId, points, color, width, opacity, complete } = data;
    
    // Broadcaster à tous les autres dans le lobby (drawing: ou lobby:)
    socket.to(`drawing:${lobbyId}`).emit('drawing:stroke', {
      lobbyId,
      teamId,
      odId,
      points,
      color,
      width,
      opacity,
      complete,
      timestamp: Date.now()
    });
  });
  
  // Recevoir et broadcaster un remplissage
  socket.on('drawing:fill', (data) => {
    const { lobbyId, teamId, odId, x, y, color, opacity } = data;
    
    socket.to(`drawing:${lobbyId}`).emit('drawing:fill', {
      lobbyId,
      teamId,
      odId,
      x,
      y,
      color,
      opacity,
      timestamp: Date.now()
    });
  });
  
  // Recevoir et broadcaster un effacement du canvas
  socket.on('drawing:clear', (data) => {
    const { lobbyId, teamId, odId } = data;
    
    socket.to(`drawing:${lobbyId}`).emit('drawing:clear', {
      lobbyId,
      teamId,
      odId,
      timestamp: Date.now()
    });
  });
  
  // ==================== DRAWING LOBBY SYSTEM ====================
  
  // Rejoindre un lobby de dessin
  socket.on('drawingLobby:join', (data, callback) => {
    const { lobbyId, odId, pseudo, teamName } = data;
    
    // Rejoindre la room Socket
    socket.join(`drawing:${lobbyId}`);
    socket.drawingLobbyId = lobbyId;
    socket.odId = odId;
    
    // Enregistrer dans la DB
    const lobby = db.joinDrawingLobby(lobbyId, odId, teamName);
    
    if (!lobby) {
      callback({ success: false, message: 'Lobby non trouvé' });
      return;
    }
    
    console.log(`[DRAWING] ${pseudo} (${teamName}) a rejoint le lobby ${lobbyId}`);
    
    // Notifier les autres
    socket.to(`drawing:${lobbyId}`).emit('drawingLobby:participantJoined', {
      odId,
      pseudo,
      teamName
    });
    
    // Récupérer l'état du jeu en cours si existe
    const gameState = pictionaryGames.get(lobbyId);
    
    callback({ 
      success: true, 
      lobby,
      gameState: gameState ? {
        status: gameState.status,
        currentRound: gameState.currentRound,
        totalRounds: gameState.config?.rounds,
        drawingTeam: gameState.drawingTeam,
        timeRemaining: gameState.timeRemaining,
        scores: gameState.scores,
        teamsFound: gameState.teamsFound,
        currentWord: teamName === gameState.drawingTeam ? gameState.currentWord : null
      } : null
    });
    
    // Broadcaster l'état du lobby
    io.to(`drawing:${lobbyId}`).emit('drawingLobby:updated', { lobby });
  });
  
  // Quitter un lobby de dessin
  socket.on('drawingLobby:leave', (data, callback) => {
    const { lobbyId, odId } = data;
    
    socket.leave(`drawing:${lobbyId}`);
    const lobby = db.leaveDrawingLobby(lobbyId, odId);
    
    socket.to(`drawing:${lobbyId}`).emit('drawingLobby:participantLeft', { odId });
    io.to(`drawing:${lobbyId}`).emit('drawingLobby:updated', { lobby });
    
    callback({ success: true });
  });
  
  // Ajouter un mot custom au lobby
  socket.on('drawingLobby:addCustomWord', (data, callback) => {
    const { lobbyId, word, addedBy } = data;
    
    if (!word || !word.trim()) {
      callback && callback({ success: false, message: 'Mot vide' });
      return;
    }
    
    const lobby = db.getDrawingLobbyById(lobbyId);
    if (!lobby) {
      callback && callback({ success: false, message: 'Lobby non trouvé' });
      return;
    }
    
    // Ajouter le mot à la liste
    const customWords = lobby.custom_words || [];
    const newWord = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      word: word.trim(),
      addedBy: addedBy || 'Anonyme',
      addedAt: Date.now()
    };
    customWords.push(newWord);
    
    // Sauvegarder
    const updatedLobby = db.updateDrawingLobbyCustomWords(lobbyId, customWords);
    
    // Notifier tous les participants
    io.to(`drawing:${lobbyId}`).emit('drawingLobby:customWordAdded', { 
      word: newWord, 
      totalCustomWords: customWords.length 
    });
    io.to(`drawing:${lobbyId}`).emit('drawingLobby:updated', { lobby: updatedLobby });
    
    callback && callback({ success: true, word: newWord });
  });
  
  // Supprimer un mot custom du lobby
  socket.on('drawingLobby:removeCustomWord', (data, callback) => {
    const { lobbyId, wordId } = data;
    
    const lobby = db.getDrawingLobbyById(lobbyId);
    if (!lobby) {
      callback && callback({ success: false, message: 'Lobby non trouvé' });
      return;
    }
    
    // Retirer le mot
    const customWords = (lobby.custom_words || []).filter(w => w.id !== wordId);
    
    // Sauvegarder
    const updatedLobby = db.updateDrawingLobbyCustomWords(lobbyId, customWords);
    
    // Notifier tous les participants
    io.to(`drawing:${lobbyId}`).emit('drawingLobby:customWordRemoved', { 
      wordId, 
      totalCustomWords: customWords.length 
    });
    io.to(`drawing:${lobbyId}`).emit('drawingLobby:updated', { lobby: updatedLobby });
    
    callback && callback({ success: true });
  });
  
  // ==================== PICTIONARY GAME ====================
  
  // Démarrer une partie de Pictionary (admin ou room master)
  socket.on('pictionary:start', (data, callback) => {
    const { lobbyId, config, words } = data;
    
    // Récupérer le lobby et ses participants
    const lobby = db.getDrawingLobbyById(lobbyId);
    if (!lobby) {
      callback({ success: false, message: 'Lobby non trouvé' });
      return;
    }
    
    // Obtenir les équipes uniques
    const teams = [...new Set(lobby.participants.map(p => p.team_name).filter(Boolean))];
    
    if (teams.length < 2) {
      callback({ success: false, message: 'Il faut au moins 2 équipes' });
      return;
    }
    
    // Mélanger les équipes pour l'ordre de passage
    const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    
    // Préparer les mots disponibles
    let availableWords = [];
    const customWords = (lobby.custom_words || []).map(cw => ({
      id: cw.id,
      word: cw.word,
      category: 'Custom',
      difficulty: 'medium',
      isCustom: true,
      addedBy: cw.addedBy
    }));
    
    console.log(`[PICTIONARY] Mots customs: ${customWords.length}, Mots DB: ${words.length}`);
    console.log(`[PICTIONARY] Config useCustomWordsOnly: ${config.useCustomWordsOnly}`);
    
    if (config.useCustomWordsOnly) {
      // N'utiliser que les mots customs
      availableWords = customWords;
    } else {
      // Combiner mots de la DB et mots customs
      availableWords = [...words, ...customWords];
    }
    
    // Mélanger et sélectionner
    const selectedWords = [...availableWords].sort(() => Math.random() - 0.5).slice(0, config.rounds);
    
    if (selectedWords.length < config.rounds) {
      const source = config.useCustomWordsOnly ? 'mots customs' : 'mots disponibles';
      callback({ success: false, message: `Pas assez de ${source} (${selectedWords.length}/${config.rounds})` });
      return;
    }
    
    // Créer l'état du jeu
    const gameState = {
      lobbyId,
      config,
      teams: shuffledTeams,
      words: selectedWords,
      currentRound: 0,
      currentWord: selectedWords[0]?.word || '',
      drawingTeam: shuffledTeams[0],
      drawingTeamIndex: 0,
      currentDrawerIndex: 0,
      scores: {},
      teamsFound: [],
      guesses: [],
      timeRemaining: config.timePerRound,
      drawerRotationTime: config.timePerDrawer || 0,
      status: 'playing',
      startedAt: Date.now()
    };
    
    // Initialiser les scores
    shuffledTeams.forEach(team => {
      gameState.scores[team] = 0;
    });
    
    // Stocker l'état
    pictionaryGames.set(lobbyId, gameState);
    
    // Mettre à jour le lobby en DB
    db.startDrawingLobby(lobbyId, gameState);
    
    // Démarrer le timer
    startPictionaryTimer(lobbyId);
    
    console.log(`[PICTIONARY] Partie démarrée - Lobby: ${lobbyId}, ${config.rounds} tours, Équipes: ${shuffledTeams.join(', ')}`);
    
    // Broadcaster le démarrage à tous dans le lobby
    io.to(`drawing:${lobbyId}`).emit('pictionary:started', {
      lobbyId,
      config,
      teams: shuffledTeams,
      currentRound: 0,
      totalRounds: config.rounds,
      drawingTeam: shuffledTeams[0],
      timeRemaining: config.timePerRound,
      scores: gameState.scores,
      teamsFound: []
    });
    
    // Envoyer le mot à l'équipe qui dessine
    io.to(`drawing:${lobbyId}`).emit('pictionary:wordReveal', {
      word: selectedWords[0]?.word,
      forTeam: shuffledTeams[0]
    });
    
    callback({ success: true, lobbyId });
  });
  
  // Proposition de réponse Pictionary
  socket.on('pictionary:guess', (data, callback) => {
    const { lobbyId, odId, teamName, guess } = data;
    
    // Récupérer l'état du jeu depuis la mémoire
    const gameState = pictionaryGames.get(lobbyId);
    if (!gameState) {
      callback({ success: false, message: 'Partie non trouvée' });
      return;
    }
    
    // Vérifier si l'équipe qui devine n'est pas celle qui dessine
    if (teamName === gameState.drawingTeam) {
      callback({ success: false, message: 'Votre équipe dessine !' });
      return;
    }
    
    // Vérifier si l'équipe a déjà trouvé
    if (gameState.teamsFound.includes(teamName)) {
      callback({ success: false, message: 'Vous avez déjà trouvé !' });
      return;
    }
    
    // Normaliser et comparer
    const normalizedGuess = guess.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normalizedWord = gameState.currentWord.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    const isCorrect = normalizedGuess === normalizedWord;
    
    // Enregistrer la proposition
    gameState.guesses.push({
      odId,
      teamName,
      guess,
      correct: isCorrect,
      timestamp: Date.now()
    });
    
    // Broadcaster la proposition à tous
    io.to(`drawing:${lobbyId}`).emit('pictionary:guessResult', {
      odId,
      teamName,
      guess,
      correct: isCorrect
    });
    
    if (isCorrect) {
      // Calculer les points
      const isFirst = gameState.teamsFound.length === 0;
      const points = isFirst ? gameState.config.pointsFirstGuess : gameState.config.pointsOtherGuess;
      
      // Ajouter les points à l'équipe
      gameState.scores[teamName] = (gameState.scores[teamName] || 0) + points;
      gameState.teamsFound.push(teamName);
      
      // Si c'est la première équipe à trouver, l'équipe qui dessine gagne aussi des points
      if (isFirst && gameState.config.pointsDrawingTeam > 0) {
        gameState.scores[gameState.drawingTeam] = (gameState.scores[gameState.drawingTeam] || 0) + gameState.config.pointsDrawingTeam;
      }
      
      console.log(`[PICTIONARY] ${teamName} a trouvé "${gameState.currentWord}" ! (+${points} pts)`);
      
      // Sauvegarder en DB
      db.addDrawingScore(lobbyId, teamName, points, 'guess', gameState.currentRound);
      if (isFirst && gameState.config.pointsDrawingTeam > 0) {
        db.addDrawingScore(lobbyId, gameState.drawingTeam, gameState.config.pointsDrawingTeam, 'drawing', gameState.currentRound);
      }
      
      // Broadcaster la mise à jour des scores
      io.to(`drawing:${lobbyId}`).emit('pictionary:scoreUpdate', {
        scores: gameState.scores,
        teamsFound: gameState.teamsFound
      });
      
      // Vérifier si toutes les équipes (sauf celle qui dessine) ont trouvé
      const guessingTeams = gameState.teams.filter(t => t !== gameState.drawingTeam);
      const allFound = guessingTeams.every(t => gameState.teamsFound.includes(t));
      
      if (allFound) {
        console.log(`[PICTIONARY] Toutes les équipes ont trouvé ! Passage automatique au tour suivant.`);
        
        // Broadcaster l'événement "toutes les équipes ont trouvé"
        io.to(`drawing:${lobbyId}`).emit('pictionary:allTeamsFound', {
          word: gameState.currentWord,
          teamsFound: gameState.teamsFound,
          scores: gameState.scores,
          drawingTeam: gameState.drawingTeam,
          currentRound: gameState.currentRound
        });
        
        // Attendre 5 secondes puis passer au tour suivant automatiquement
        setTimeout(() => {
          triggerNextRound(lobbyId);
        }, 5000);
      }
    }
    
    callback({ success: true, correct: isCorrect });
  });
  
  // Passer au tour suivant (admin)
  socket.on('pictionary:nextRound', (data, callback) => {
    const { lobbyId } = data;
    
    const gameState = pictionaryGames.get(lobbyId);
    if (!gameState) {
      callback({ success: false, message: 'Partie non trouvée' });
      return;
    }
    
    // Passer au tour suivant
    gameState.currentRound++;
    
    if (gameState.currentRound >= gameState.config.rounds) {
      // Fin de la partie
      endPictionaryGame(lobbyId);
      callback({ success: true, ended: true });
      return;
    }
    
    // Équipe suivante qui dessine
    gameState.drawingTeamIndex = (gameState.drawingTeamIndex + 1) % gameState.teams.length;
    gameState.drawingTeam = gameState.teams[gameState.drawingTeamIndex];
    gameState.currentWord = gameState.words[gameState.currentRound]?.word || '';
    gameState.currentDrawerIndex = 0;
    gameState.teamsFound = [];
    gameState.guesses = [];
    gameState.timeRemaining = gameState.config.timePerRound;
    gameState.drawerRotationTime = gameState.config.timePerDrawer || 0;
    
    // Mettre à jour en DB
    db.updateDrawingLobbyState(lobbyId, {
      currentRound: gameState.currentRound,
      currentWord: gameState.currentWord,
      roundStartTime: Date.now()
    });
    
    // Broadcaster le nouveau tour
    io.to(`drawing:${lobbyId}`).emit('pictionary:newRound', {
      currentRound: gameState.currentRound,
      totalRounds: gameState.config.rounds,
      drawingTeam: gameState.drawingTeam,
      timeRemaining: gameState.config.timePerRound
    });
    
    // Envoyer le nouveau mot à l'équipe qui dessine
    io.to(`drawing:${lobbyId}`).emit('pictionary:wordReveal', {
      word: gameState.currentWord,
      forTeam: gameState.drawingTeam
    });
    
    // Effacer le canvas
    io.to(`drawing:${lobbyId}`).emit('drawing:clear', {
      lobbyId,
      fromServer: true
    });
    
    callback({ success: true, ended: false });
  });
  
  // Terminer la partie (admin)
  socket.on('pictionary:end', (data, callback) => {
    const { lobbyId } = data;
    endPictionaryGame(lobbyId);
    callback({ success: true });
  });
  
  // Sauvegarder un dessin (envoyé par le client avant de passer au tour suivant)
  socket.on('pictionary:saveDrawing', (data, callback) => {
    const { lobbyId, round, teamName, word, imageData } = data;
    
    if (!imageData || !lobbyId) {
      callback && callback({ success: false, message: 'Données manquantes' });
      return;
    }
    
    try {
      const drawingId = db.saveDrawing(lobbyId, round, teamName, word, imageData);
      console.log(`[PICTIONARY] Dessin sauvegardé: ${drawingId} (${teamName}, round ${round})`);
      callback && callback({ success: true, drawingId });
    } catch (error) {
      console.error('[PICTIONARY] Erreur sauvegarde dessin:', error);
      callback && callback({ success: false, message: error.message });
    }
  });
  
  // ==================== DECONNEXION ====================
  
  socket.on('disconnect', () => {
    const participantInfo = connectedParticipants.get(socket.id);
    
    if (participantInfo) {
      // Retirer ce socket de la liste des sockets du participant
      const sockets = participantSockets.get(participantInfo.odId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          participantSockets.delete(participantInfo.odId);
        }
      }
      connectedParticipants.delete(socket.id);
    }
    
    // Si dans un lobby, notifier
    if (socket.lobbyId && socket.odId) {
      io.to(`lobby:${socket.lobbyId}`).emit('participant:disconnected', {
        odId: socket.odId
      });
    }
    
    console.log(`[SOCKET] Deconnexion: ${socket.id}`);
  });
});

// ==================== API REST (pour compatibilite et operations simples) ====================

app.get('/api/config', (req, res) => {
  res.json({
    serverTime: Date.now(),
    version: '3.0.0',
    features: ['socket.io', 'sqlite', 'realtime']
  });
});

app.post('/api/admin-login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.verifyAdmin(username, password);
  if (admin) {
    res.json({ success: true, admin });
  } else {
    res.json({ success: false, message: 'Identifiants incorrects' });
  }
});

// Teams
app.get('/api/teams', (req, res) => {
  res.json(db.getAllTeams());
});

app.post('/api/teams/create', (req, res) => {
  const { name, score } = req.body;
  
  if (!name || !name.trim()) {
    return res.json({ success: false, message: 'Le nom de l equipe est requis' });
  }
  
  const normalizedName = db.normalizeTeamName(name);
  const existing = db.getTeamByName(normalizedName);
  if (existing) {
    return res.json({ success: false, message: 'Une equipe avec ce nom existe deja' });
  }
  
  const team = db.createTeam(normalizedName);
  if (score !== undefined && score > 0) {
    db.updateTeamScore(team.id, score);
  }
  
  broadcastGlobalState();
  res.json({ success: true, team: db.getTeamById(team.id) });
});

app.put('/api/teams/:id', (req, res) => {
  const { id } = req.params;
  const { score } = req.body;
  
  const team = db.getTeamById(parseInt(id));
  if (!team) {
    return res.json({ success: false, message: 'Equipe introuvable' });
  }
  
  if (score !== undefined) {
    db.updateTeamScore(team.id, parseInt(score));
  }
  
  broadcastGlobalState();
  res.json({ success: true, team: db.getTeamById(team.id) });
});

app.post('/api/delete-team', (req, res) => {
  const { teamName } = req.body;
  
  const team = db.getTeamByName(teamName);
  if (!team) {
    return res.json({ success: false, message: 'Equipe introuvable' });
  }
  
  const participants = db.getAllParticipants();
  const affectedCount = participants.filter(p => p.teamId === team.id).length;
  
  db.deleteTeam(team.id);
  
  broadcastGlobalState();
  res.json({ success: true, affectedCount });
});

// Participants
app.get('/api/participants', (req, res) => {
  const participants = db.getAllParticipants().map(p => ({
    ...p,
    password: '********'
  }));
  res.json(participants);
});

app.post('/api/participants/create', (req, res) => {
  const { pseudo, password, teamName } = req.body;
  
  if (!pseudo || !pseudo.trim()) {
    return res.json({ success: false, message: 'Le pseudo est requis' });
  }
  
  if (!password || password.length < 4) {
    return res.json({ success: false, message: 'Le mot de passe doit contenir au moins 4 caracteres' });
  }
  
  const existing = db.getParticipantByPseudo(pseudo.trim());
  if (existing) {
    return res.json({ success: false, message: 'Ce pseudo existe deja' });
  }
  
  let teamId = null;
  if (teamName && teamName.trim()) {
    const normalizedTeamName = db.normalizeTeamName(teamName);
    let team = db.getTeamByName(normalizedTeamName);
    if (!team) {
      team = db.createTeam(normalizedTeamName);
    }
    teamId = team.id;
  }
  
  const odId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const participant = db.createParticipant(odId, pseudo.trim(), password, teamId);
  
  broadcastGlobalState();
  res.json({ success: true, participant });
});

app.put('/api/participants/:id', (req, res) => {
  const { id } = req.params;
  const { teamName, password } = req.body;
  
  const participant = db.getParticipantById(id);
  if (!participant) {
    return res.json({ success: false, message: 'Participant introuvable' });
  }
  
  if (teamName !== undefined) {
    const normalizedTeamName = db.normalizeTeamName(teamName);
    if (normalizedTeamName) {
      let team = db.getTeamByName(normalizedTeamName);
      if (!team) {
        team = db.createTeam(normalizedTeamName);
      }
      db.updateParticipantTeam(id, team.id);
    } else {
      db.updateParticipantTeam(id, null);
    }
  }
  
  if (password && password.length >= 4) {
    db.updateParticipantPassword(id, password);
  }
  
  broadcastGlobalState();
  res.json({ success: true, participant: db.getParticipantById(id) });
});

app.delete('/api/participants/:id', (req, res) => {
  const { id } = req.params;
  
  const participant = db.getParticipantById(id);
  if (!participant) {
    return res.json({ success: false, message: 'Participant introuvable' });
  }
  
  db.deleteParticipant(id);
  
  broadcastGlobalState();
  res.json({ success: true });
});

// Route pour que le participant change son equipe
app.put('/api/participants/:id/team', (req, res) => {
  const { id } = req.params;
  const { teamName } = req.body;
  
  const participant = db.getParticipantById(id);
  if (!participant) {
    return res.json({ success: false, message: 'Participant introuvable' });
  }
  
  if (teamName === null || teamName === '') {
    // Quitter l'equipe
    db.updateParticipantTeam(id, null);
  } else {
    const normalizedTeamName = db.normalizeTeamName(teamName);
    let team = db.getTeamByName(normalizedTeamName);
    if (!team) {
      team = db.createTeam(normalizedTeamName);
    }
    db.updateParticipantTeam(id, team.id);
  }
  
  broadcastGlobalState();
  res.json({ success: true, participant: db.getParticipantById(id) });
});

// Route pour que le participant change son mot de passe
app.put('/api/participants/:id/password', (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;
  
  const participant = db.getParticipantById(id);
  if (!participant) {
    return res.json({ success: false, message: 'Participant introuvable' });
  }
  
  if (!db.verifyPasswordSync(currentPassword, participant.password)) {
    return res.json({ success: false, message: 'Mot de passe actuel incorrect' });
  }
  
  if (!newPassword || newPassword.length < 4) {
    return res.json({ success: false, message: 'Le nouveau mot de passe doit contenir au moins 4 caracteres' });
  }
  
  db.updateParticipantPassword(id, newPassword);
  
  res.json({ success: true, message: 'Mot de passe modifie avec succes' });
});

// Route pour que le participant change son avatar
app.put('/api/participants/:id/avatar', (req, res) => {
  const { id } = req.params;
  const { avatar } = req.body;
  
  const participant = db.getParticipantById(id);
  if (!participant) {
    return res.json({ success: false, message: 'Participant introuvable' });
  }
  
  // Liste des avatars autorisés
  const allowedAvatars = [
    'default', 'cat', 'dog', 'fox', 'owl', 'panda', 'rabbit', 'bear', 'koala', 'lion',
    'tiger', 'wolf', 'penguin', 'monkey', 'elephant', 'giraffe', 'zebra', 'deer', 'squirrel', 'hedgehog',
    'robot', 'alien', 'ghost', 'ninja', 'pirate', 'wizard', 'knight', 'astronaut', 'chef', 'detective'
  ];
  
  if (!allowedAvatars.includes(avatar)) {
    return res.json({ success: false, message: 'Avatar non autorise' });
  }
  
  const updatedParticipant = db.updateParticipantAvatar(id, avatar);
  broadcastGlobalState();
  
  res.json({ 
    success: true, 
    message: 'Avatar mis a jour', 
    participant: { ...updatedParticipant, password: '********' }
  });
});

app.post('/api/update-participant', (req, res) => {
  const { participantId, updates } = req.body;
  
  const participant = db.getParticipantById(participantId);
  if (!participant) {
    return res.json({ success: false, message: 'Participant introuvable' });
  }
  
  if (updates.teamName !== undefined) {
    const normalizedTeamName = db.normalizeTeamName(updates.teamName);
    if (normalizedTeamName) {
      let team = db.getTeamByName(normalizedTeamName);
      if (!team) {
        team = db.createTeam(normalizedTeamName);
      }
      db.updateParticipantTeam(participantId, team.id);
    } else {
      db.updateParticipantTeam(participantId, null);
    }
  }
  
  broadcastGlobalState();
  res.json({ success: true, participant: db.getParticipantById(participantId) });
});

app.post('/api/change-password', (req, res) => {
  const { participantId, currentPassword, newPassword } = req.body;
  
  const participant = db.getParticipantById(participantId);
  if (!participant) {
    return res.json({ success: false, message: 'Participant introuvable' });
  }
  
  if (!db.verifyPasswordSync(currentPassword, participant.password)) {
    return res.json({ success: false, message: 'Mot de passe actuel incorrect' });
  }
  
  if (!newPassword || newPassword.length < 4) {
    return res.json({ success: false, message: 'Le nouveau mot de passe doit contenir au moins 4 caracteres' });
  }
  
  db.updateParticipantPassword(participantId, newPassword);
  
  res.json({ success: true, message: 'Mot de passe modifie avec succes' });
});

// Quizzes
app.get('/api/quizzes', (req, res) => {
  res.json(db.getAllQuizzes());
});

app.post('/api/quizzes', (req, res) => {
  const quiz = req.body;
  const created = db.createQuiz(quiz);
  broadcastGlobalState();
  res.json({ success: true, quiz: created });
});

app.put('/api/quizzes/:id', (req, res) => {
  const { id } = req.params;
  const quiz = req.body;
  const updated = db.updateQuiz(id, quiz);
  broadcastGlobalState();
  res.json({ success: true, quiz: updated });
});

app.delete('/api/quizzes/:id', (req, res) => {
  const { id } = req.params;
  db.deleteQuiz(id);
  broadcastGlobalState();
  res.json({ success: true });
});

// Questions
app.get('/api/questions', (req, res) => {
  res.json(db.getAllQuestions());
});

app.post('/api/questions', (req, res) => {
  const questions = req.body;
  db.saveAllQuestions(questions);
  broadcastGlobalState();
  res.json({ success: true });
});

app.post('/api/questions/add', (req, res) => {
  const question = req.body;
  const created = db.createQuestion(question);
  broadcastGlobalState();
  res.json({ success: true, question: created });
});

app.post('/api/questions/merge', (req, res) => {
  const { questions, mode } = req.body;
  
  if (!questions || !Array.isArray(questions)) {
    return res.status(400).json({ success: false, error: 'Questions array required' });
  }
  
  const stats = db.mergeQuestions(questions, mode || 'update');
  broadcastGlobalState();
  res.json({ success: true, stats });
});

app.put('/api/questions/:id', (req, res) => {
  const { id } = req.params;
  const question = req.body;
  const updated = db.updateQuestion(id, question);
  broadcastGlobalState();
  res.json({ success: true, question: updated });
});

app.delete('/api/questions/:id', (req, res) => {
  const { id } = req.params;
  db.deleteQuestion(id);
  broadcastGlobalState();
  res.json({ success: true });
});

// Lobbies (lecture seule, la gestion se fait via Socket.IO)
app.get('/api/lobbies', (req, res) => {
  res.json(db.getAllLobbies().map(l => getLobbyWithTimer(l)));
});

// Archiver/Desarchiver un lobby
app.put('/api/lobbies/:id/archive', (req, res) => {
  const { id } = req.params;
  const { archived } = req.body;
  
  const lobby = db.getLobbyById(id);
  if (!lobby) {
    return res.json({ success: false, message: 'Lobby introuvable' });
  }
  
  const updatedLobby = db.archiveLobby(id, archived);
  broadcastGlobalState();
  res.json({ success: true, lobby: getLobbyWithTimer(updatedLobby) });
});

// ==================== DRAWING WORDS API ====================

app.get('/api/drawing-words', (req, res) => {
  res.json(db.getAllDrawingWords());
});

app.post('/api/drawing-words', (req, res) => {
  const word = db.createDrawingWord(req.body);
  broadcastGlobalState();
  res.json({ success: true, word });
});

app.put('/api/drawing-words/:id', (req, res) => {
  const word = db.updateDrawingWord(req.params.id, req.body);
  broadcastGlobalState();
  res.json({ success: true, word });
});

app.delete('/api/drawing-words/:id', (req, res) => {
  db.deleteDrawingWord(req.params.id);
  broadcastGlobalState();
  res.json({ success: true });
});

// Import/Export mots de dessin
app.post('/api/drawing-words/import', (req, res) => {
  const { words, mode = 'add' } = req.body;
  
  if (!Array.isArray(words)) {
    return res.json({ success: false, message: 'Format invalide' });
  }
  
  let added = 0, updated = 0;
  
  if (mode === 'replace') {
    // Supprimer tous les mots existants
    const existing = db.getAllDrawingWords();
    existing.forEach(w => db.deleteDrawingWord(w.id));
  }
  
  words.forEach(word => {
    if (word.id && mode === 'update') {
      const existing = db.getDrawingWordById(word.id);
      if (existing) {
        db.updateDrawingWord(word.id, word);
        updated++;
      } else {
        db.createDrawingWord(word);
        added++;
      }
    } else {
      db.createDrawingWord({ ...word, id: word.id || Date.now().toString() + Math.random().toString(36).substr(2, 9) });
      added++;
    }
  });
  
  broadcastGlobalState();
  res.json({ success: true, added, updated, total: db.getAllDrawingWords().length });
});

// ==================== DRAWING REFERENCES API ====================

app.get('/api/drawing-references', (req, res) => {
  res.json(db.getAllDrawingReferences());
});

app.post('/api/drawing-references', (req, res) => {
  const ref = db.createDrawingReference(req.body);
  broadcastGlobalState();
  res.json({ success: true, reference: ref });
});

app.put('/api/drawing-references/:id', (req, res) => {
  const ref = db.updateDrawingReference(req.params.id, req.body);
  broadcastGlobalState();
  res.json({ success: true, reference: ref });
});

app.delete('/api/drawing-references/:id', (req, res) => {
  db.deleteDrawingReference(req.params.id);
  broadcastGlobalState();
  res.json({ success: true });
});

// Import/Export images de référence
app.post('/api/drawing-references/import', (req, res) => {
  const { references, mode = 'add' } = req.body;
  
  if (!Array.isArray(references)) {
    return res.json({ success: false, message: 'Format invalide' });
  }
  
  let added = 0, updated = 0;
  
  if (mode === 'replace') {
    const existing = db.getAllDrawingReferences();
    existing.forEach(r => db.deleteDrawingReference(r.id));
  }
  
  references.forEach(ref => {
    if (ref.id && mode === 'update') {
      const existing = db.getDrawingReferenceById(ref.id);
      if (existing) {
        db.updateDrawingReference(ref.id, ref);
        updated++;
      } else {
        db.createDrawingReference(ref);
        added++;
      }
    } else {
      db.createDrawingReference({ ...ref, id: ref.id || Date.now().toString() + Math.random().toString(36).substr(2, 9) });
      added++;
    }
  });
  
  broadcastGlobalState();
  res.json({ success: true, added, updated, total: db.getAllDrawingReferences().length });
});

// ==================== DRAWING GAMES API ====================

app.get('/api/drawing-games', (req, res) => {
  res.json(db.getAllDrawingGames());
});

app.post('/api/drawing-games', (req, res) => {
  const game = db.createDrawingGame(req.body);
  broadcastGlobalState();
  res.json({ success: true, game });
});

app.put('/api/drawing-games/:id', (req, res) => {
  const game = db.updateDrawingGame(req.params.id, req.body);
  broadcastGlobalState();
  res.json({ success: true, game });
});

app.delete('/api/drawing-games/:id', (req, res) => {
  db.deleteDrawingGame(req.params.id);
  broadcastGlobalState();
  res.json({ success: true });
});

// ==================== DRAWING LOBBIES API ====================

app.get('/api/drawing-lobbies', (req, res) => {
  res.json(db.getAllDrawingLobbies());
});

app.get('/api/drawing-lobbies/:id', (req, res) => {
  const lobby = db.getDrawingLobbyById(req.params.id);
  if (lobby) {
    res.json(lobby);
  } else {
    res.status(404).json({ success: false, message: 'Lobby non trouvé' });
  }
});

app.post('/api/drawing-lobbies', (req, res) => {
  const lobby = db.createDrawingLobby(req.body);
  broadcastGlobalState();
  res.json({ success: true, lobby });
});

app.delete('/api/drawing-lobbies/:id', (req, res) => {
  // Arrêter le timer si en cours
  if (pictionaryTimers.has(req.params.id)) {
    clearInterval(pictionaryTimers.get(req.params.id));
    pictionaryTimers.delete(req.params.id);
  }
  pictionaryGames.delete(req.params.id);
  
  db.deleteDrawingLobby(req.params.id);
  broadcastGlobalState();
  
  // Notifier tous les participants
  io.to(`drawing:${req.params.id}`).emit('drawingLobby:deleted', { lobbyId: req.params.id });
  
  res.json({ success: true });
});

// Archiver un lobby terminé
app.post('/api/drawing-lobbies/:id/archive', (req, res) => {
  const lobby = db.archiveDrawingLobby(req.params.id);
  if (lobby) {
    broadcastGlobalState();
    res.json({ success: true, lobby });
  } else {
    res.status(404).json({ success: false, message: 'Lobby non trouvé' });
  }
});

// Mettre à jour les mots customs d'un lobby
app.post('/api/drawing-lobbies/:id/custom-words', (req, res) => {
  const { customWords } = req.body;
  const lobby = db.updateDrawingLobbyCustomWords(req.params.id, customWords || []);
  if (lobby) {
    // Notifier tous les participants
    io.to(`drawing:${req.params.id}`).emit('drawingLobby:updated', { lobby });
    res.json({ success: true, lobby });
  } else {
    res.status(404).json({ success: false, message: 'Lobby non trouvé' });
  }
});

// Récupérer les résultats d'un lobby (dessins, scores, classement)
app.get('/api/drawing-lobbies/:id/results', (req, res) => {
  const results = db.getDrawingLobbyResults(req.params.id);
  if (results) {
    res.json(results);
  } else {
    res.status(404).json({ success: false, message: 'Lobby non trouvé' });
  }
});

// Récupérer les dessins d'un lobby
app.get('/api/drawing-lobbies/:id/drawings', (req, res) => {
  const drawings = db.getDrawingsByLobby(req.params.id);
  res.json(drawings);
});

// Récupérer un dessin spécifique
app.get('/api/drawings/:id', (req, res) => {
  const drawing = db.getDrawingById(req.params.id);
  if (drawing) {
    res.json(drawing);
  } else {
    res.status(404).json({ success: false, message: 'Dessin non trouvé' });
  }
});

// Production: servir le client React
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/build');
  if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
  }
}

// ==================== DEMARRAGE ====================

function showStartupMessage() {
  console.log('');
  console.log('================================================================');
  console.log('   WILCO QUIZ SERVER v3.0 - Socket.IO Edition');
  console.log('================================================================');
  console.log('');
  console.log(`[OK] Serveur demarre sur http://localhost:${PORT}`);
  console.log(`[OK] Socket.IO actif sur le meme port`);
  console.log(`[OK] Base de donnees: ${path.join(__dirname, 'quiz.db')}`);
  console.log(`[OK] Admin par defaut: admin / admin123`);
  console.log('');
  console.log('Fonctionnalites:');
  console.log('   - Communication temps reel (Socket.IO)');
  console.log('   - Timer synchronise serveur');
  console.log('   - Auto-validation QCM');
  console.log('   - Reconnexion automatique');
  console.log('   - SQLite pour la persistance');
  console.log('');
  
  if (process.env.NODE_ENV === 'production') {
    console.log('[MODE] PRODUCTION - Client React integre');
  } else {
    console.log('[MODE] DEVELOPMENT - Client React sur port separe (ex: 3000)');
  }
  
  console.log('');
  console.log('Appuyez sur Ctrl+C pour arreter le serveur');
  console.log('');
}

async function startServer() {
  try {
    await db.initDatabase();
    
    httpServer.listen(PORT, () => showStartupMessage());
    
    process.on('SIGINT', () => {
      console.log('\n[STOP] Arret du serveur...');
      
      // Arreter tous les timers
      lobbyTimers.forEach((timer, lobbyId) => {
        if (timer.intervalId) clearInterval(timer.intervalId);
      });
      lobbyTimers.clear();
      
      db.closeDatabase();
      httpServer.close(() => {
        console.log('[OK] Serveur arrete proprement');
        process.exit(0);
      });
    });
    
    process.on('SIGTERM', () => {
      console.log('\n[STOP] Arret du serveur...');
      db.closeDatabase();
      httpServer.close(() => {
        console.log('[OK] Serveur arrete proprement');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('[ERREUR] Impossible de demarrer le serveur:', error);
    process.exit(1);
  }
}

startServer();
