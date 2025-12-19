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
  
  const lobby = db.getLobbyById(lobbyId);
  if (!lobby) return;
  
  // Forcer toutes les reponses non soumises
  lobby.participants.forEach(participant => {
    if (!participant.hasAnswered) {
      const finalAnswer = db.markTimeExpired(lobbyId, participant.participantId, questionId);
      console.log(`[TIMER] Temps expire pour ${participant.pseudo}: reponse="${finalAnswer || '(vide)'}"`);
    }
  });
  
  // Notifier tout le monde
  io.to(`lobby:${lobbyId}`).emit('timer:expired', { lobbyId, questionId });
  
  // Broadcast l'etat mis a jour
  broadcastLobbyState(lobbyId);
  broadcastGlobalState(); // Pour que l'admin voie la mise a jour
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
