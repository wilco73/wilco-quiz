const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_FILE = path.join(__dirname, 'db.json');

// Middleware
app.use(cors());
app.use(express.json());

// ✅ NOUVEAU: Stockage en mémoire des timers de questions
const questionTimers = new Map(); // lobbyId -> { startTime, timer }

// Fonction d'initialisation de la base de données
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      teams: [],
      participants: [],
      quizzes: [],
      questions: [],
      lobbies: [],
      admins: [{ id: '1', username: 'admin', password: 'admin123' }]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    console.log('📂 Base de données initialisée');
  }
}

function readDB() {
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  } catch (error) {
    console.error('❌ Erreur lecture DB:', error);
    return { teams: [], participants: [], quizzes: [], questions: [], lobbies: [], admins: [] };
  }
}

function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('❌ Erreur écriture DB:', error);
  }
}

initDB();

// ==================== CONFIG ====================
app.get('/api/config', (req, res) => {
  const protocol = req.protocol;
  const host = req.get('host');
  res.json({
    apiUrl: `${protocol}://${host}/api`,
    pollInterval: 1000,
    environment: process.env.NODE_ENV || 'development'
  });
});

// ==================== ADMIN ====================
app.post('/api/admin-login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const admin = db.admins.find(a => a.username === username && a.password === password);
  res.json(admin ? { success: true, username: admin.username } : { success: false, message: 'Identifiants incorrects' });
});

// ==================== TEAMS ====================
app.get('/api/teams', (req, res) => res.json(readDB().teams || []));

app.post('/api/teams', (req, res) => {
  const db = readDB();
  db.teams = req.body;
  writeDB(db);
  res.json({ success: true });
});

// ==================== PARTICIPANTS ====================
app.get('/api/participants', (req, res) => res.json(readDB().participants || []));

app.post('/api/participants', (req, res) => {
  const db = readDB();
  db.participants = req.body;
  writeDB(db);
  res.json({ success: true });
});

// ==================== QUIZZES ====================
app.get('/api/quizzes', (req, res) => res.json(readDB().quizzes || []));

app.post('/api/quizzes', (req, res) => {
  const db = readDB();
  db.quizzes = req.body;
  writeDB(db);
  res.json({ success: true });
});

// ==================== QUESTIONS ====================
app.get('/api/questions', (req, res) => {
  const db = readDB();
  res.json(db.questions || []);
});

app.post('/api/questions', (req, res) => {
  const db = readDB();
  db.questions = req.body;
  writeDB(db);
  res.json({ success: true });
});

// ==================== LOBBIES ====================
app.get('/api/lobbies', (req, res) => {
  const db = readDB();
  const lobbies = db.lobbies || [];
  
  // ✅ NOUVEAU: Ajouter le temps écoulé pour chaque lobby avec timer
  const lobbiesWithTimer = lobbies.map(lobby => {
    if (lobby.status === 'playing' && questionTimers.has(lobby.id)) {
      const timerData = questionTimers.get(lobby.id);
      const elapsed = Math.floor((Date.now() - timerData.startTime) / 1000);
      const remaining = Math.max(0, timerData.timer - elapsed);
      
      return {
        ...lobby,
        questionStartTime: timerData.startTime,
        timeRemaining: remaining
      };
    }
    return lobby;
  });
  
  res.json(lobbiesWithTimer);
});

app.post('/api/create-lobby', (req, res) => {
  const { quizId } = req.body;
  const db = readDB();
  const lobby = {
    id: Date.now().toString(),
    quizId,
    status: 'waiting',
    participants: [],
    session: null,
    createdAt: Date.now()
  };
  db.lobbies.push(lobby);
  writeDB(db);
  res.json({ success: true, lobby });
});

app.post('/api/join-lobby', (req, res) => {
  const { lobbyId, participantId, pseudo, teamName } = req.body;
  const db = readDB();
  const lobby = db.lobbies.find(l => l.id === lobbyId);
  
  if (!lobby || lobby.status !== 'waiting') {
    return res.json({ success: false, message: 'Salle non disponible' });
  }
  
  // ✅ CORRECTION: Créer l'équipe si elle n'existe pas
  let team = db.teams.find(t => t.name === teamName);
  if (!team) {
    team = { 
      id: Date.now().toString(), 
      name: teamName, 
      validatedScore: 0,
      createdAt: Date.now()
    };
    db.teams.push(team);
    console.log(`✅ Nouvelle équipe créée: "${teamName}"`);
  }
  
  if (!lobby.participants.find(p => p.participantId === participantId)) {
    lobby.participants.push({ 
      participantId, 
      pseudo, 
      teamName, 
      hasAnswered: false, 
      currentAnswer: '', 
      answers: {}, 
      validations: {} 
    });
  }
  writeDB(db);
  res.json({ success: true });
});

app.post('/api/leave-lobby', (req, res) => {
  const { lobbyId, participantId } = req.body;
  const db = readDB();
  const lobby = db.lobbies.find(l => l.id === lobbyId);
  
  if (lobby) {
    lobby.participants = lobby.participants.filter(p => p.participantId !== participantId);
    if (lobby.participants.length === 0 && lobby.status === 'waiting') {
      db.lobbies = db.lobbies.filter(l => l.id !== lobbyId);
      // ✅ NOUVEAU: Nettoyer le timer
      questionTimers.delete(lobbyId);
    }
  }
  writeDB(db);
  res.json({ success: true });
});

app.post('/api/start-quiz', (req, res) => {
  const { lobbyId } = req.body;
  const db = readDB();
  const lobby = db.lobbies.find(l => l.id === lobbyId);
  
  if (lobby && lobby.status === 'waiting') {
    lobby.status = 'playing';
    lobby.session = {
      currentQuestionIndex: 0,
      status: 'active',
      startedAt: Date.now()
    };
    lobby.participants.forEach(p => {
      p.hasAnswered = false;
      p.currentAnswer = '';
    });
    
    // ✅ NOUVEAU: Démarrer le timer pour la première question
    const quiz = db.quizzes.find(q => q.id === lobby.quizId);
    const currentQuestion = quiz.questions[0];
    if (currentQuestion.timer > 0) {
      questionTimers.set(lobbyId, {
        startTime: Date.now(),
        timer: currentQuestion.timer
      });
    }
    
    writeDB(db);
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.post('/api/submit-answer', (req, res) => {
  const { lobbyId, participantId, answer } = req.body;
  const db = readDB();
  const lobby = db.lobbies.find(l => l.id === lobbyId);
  
  if (lobby) {
    // ✅ CORRECTION: Vérifier si le temps est écoulé
    if (questionTimers.has(lobbyId)) {
      const timerData = questionTimers.get(lobbyId);
      const elapsed = Math.floor((Date.now() - timerData.startTime) / 1000);
      
      if (elapsed >= timerData.timer) {
        return res.json({ 
          success: false, 
          message: 'Temps écoulé',
          timeExpired: true 
        });
      }
    }
    
    const participant = lobby.participants.find(p => p.participantId === participantId);
    if (participant) {
      participant.hasAnswered = true;
      participant.currentAnswer = answer;
      const qIndex = lobby.session.currentQuestionIndex;
      if (!participant.answers) participant.answers = {};
      participant.answers[qIndex] = answer;
    }
    writeDB(db);
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

// ✅ NOUVEAU: Route pour marquer explicitement qu'un participant a terminé (temps écoulé)
app.post('/api/mark-time-expired', (req, res) => {
  const { lobbyId, participantId } = req.body;
  const db = readDB();
  const lobby = db.lobbies.find(l => l.id === lobbyId);
  
  if (lobby) {
    const participant = lobby.participants.find(p => p.participantId === participantId);
    if (participant && !participant.hasAnswered) {
      participant.hasAnswered = true;
      participant.currentAnswer = ''; // Réponse vide car temps écoulé
      const qIndex = lobby.session.currentQuestionIndex;
      if (!participant.answers) participant.answers = {};
      participant.answers[qIndex] = ''; // Enregistrer réponse vide
      
      console.log(`⏰ Temps écoulé pour ${participant.pseudo} - Question ${qIndex + 1}`);
    }
    writeDB(db);
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.post('/api/next-question', (req, res) => {
  const { lobbyId } = req.body;
  const db = readDB();
  const lobby = db.lobbies.find(l => l.id === lobbyId);
  
  if (lobby && lobby.session) {
    const quiz = db.quizzes.find(q => q.id === lobby.quizId);
    if (lobby.session.currentQuestionIndex < quiz.questions.length - 1) {
      lobby.session.currentQuestionIndex++;
      lobby.participants.forEach(p => {
        p.hasAnswered = false;
        p.currentAnswer = '';
      });
      
      // ✅ NOUVEAU: Démarrer le timer pour la nouvelle question
      const currentQuestion = quiz.questions[lobby.session.currentQuestionIndex];
      if (currentQuestion.timer > 0) {
        questionTimers.set(lobbyId, {
          startTime: Date.now(),
          timer: currentQuestion.timer
        });
      } else {
        questionTimers.delete(lobbyId);
      }
    } else {
      lobby.session.status = 'finished';
      lobby.status = 'finished';
      // ✅ NOUVEAU: Nettoyer le timer à la fin
      questionTimers.delete(lobbyId);
    }
    writeDB(db);
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

// ✅ CORRECTION: Points comptés une seule fois par équipe
app.post('/api/validate-answer', (req, res) => {
  const { lobbyId, participantId, questionIndex, isCorrect } = req.body;
  const db = readDB();
  const lobby = db.lobbies.find(l => l.id === lobbyId);
  
  if (lobby) {
    const participant = lobby.participants.find(p => p.participantId === participantId);
    const quiz = db.quizzes.find(q => q.id === lobby.quizId);
    
    if (participant && quiz) {
      const qIndex = questionIndex !== undefined ? questionIndex : lobby.session.currentQuestionIndex;
      
      if (!participant.validations) participant.validations = {};
      participant.validations[qIndex] = isCorrect;
      
      if (isCorrect) {
        const points = quiz.questions[qIndex].points || 1;
        const teamName = participant.teamName;
        
        // ✅ NOUVEAU: Vérifier si c'est la première validation correcte de l'équipe pour cette question
        const teamParticipants = lobby.participants.filter(p => p.teamName === teamName);
        const alreadyValidated = teamParticipants.some(p => 
          p.participantId !== participantId && 
          p.validations && 
          p.validations[qIndex] === true
        );
        
        // ✅ NOUVEAU: N'ajouter les points que si personne de l'équipe n'a déjà validé cette question
        if (!alreadyValidated) {
          const team = db.teams.find(t => t.name === teamName);
          if (team) {
            team.validatedScore = (team.validatedScore || 0) + points;
            console.log(`✅ Équipe "${teamName}" gagne ${points} points (Question ${qIndex + 1})`);
          }
        } else {
          console.log(`ℹ️  Équipe "${teamName}" a déjà validé la question ${qIndex + 1} (pas de points supplémentaires)`);
        }
      }
      writeDB(db);
      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'Participant ou quiz introuvable' });
    }
  } else {
    res.json({ success: false, message: 'Lobby introuvable' });
  }
});

app.post('/api/delete-lobby', (req, res) => {
  const { lobbyId } = req.body;
  const db = readDB();
  db.lobbies = db.lobbies.filter(l => l.id !== lobbyId);
  // ✅ NOUVEAU: Nettoyer le timer
  questionTimers.delete(lobbyId);
  writeDB(db);
  res.json({ success: true });
});

// ==================== PRODUCTION: SERVIR LE CLIENT REACT ====================
if (process.env.NODE_ENV === 'production') {
  const clientBuildPath = path.join(__dirname, '../client/build');
  
  if (fs.existsSync(clientBuildPath)) {
    app.use(express.static(clientBuildPath));
    
    app.get('*', (req, res) => {
      res.sendFile(path.join(clientBuildPath, 'index.html'));
    });
    
    console.log('📦 Client React servi depuis', clientBuildPath);
  } else {
    console.warn('⚠️  Dossier build du client introuvable. Exécutez "npm run build" dans le dossier client.');
  }
}

// ==================== DÉMARRAGE DU SERVEUR ====================
app.listen(PORT, () => {
  console.log('');
  console.log('╔══════════════════════════════════════════╗');
  console.log('║   🎮 WILCO QUIZ SERVER                  ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log('');
  console.log(`✅ Serveur démarré sur http://localhost:${PORT}`);
  console.log(`📂 Base de données: ${DB_FILE}`);
  console.log(`🔑 Admin par défaut: admin / admin123`);
  console.log(`🌍 Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log('');
  console.log('📡 Endpoints API disponibles:');
  console.log('   GET  /api/config');
  console.log('   POST /api/admin-login');
  console.log('   GET  /api/teams, /api/participants, /api/quizzes, /api/questions, /api/lobbies');
  console.log('   POST /api/create-lobby, /api/join-lobby, /api/start-quiz, etc.');
  console.log('');
  console.log('✅ Timer côté serveur activé (anti-triche)');
  console.log('✅ Points par équipe (1 validation = 1 point)');
  console.log('');
  
  if (process.env.NODE_ENV === 'production') {
    console.log('🚀 Mode PRODUCTION - Client React intégré');
  } else {
    console.log('🔧 Mode DEVELOPMENT - Client React sur port séparé (ex: 3000)');
  }
  
  console.log('');
  console.log('Appuyez sur Ctrl+C pour arrêter le serveur');
  console.log('');
});