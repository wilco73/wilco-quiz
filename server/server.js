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

// Stockage en mémoire des timers de questions
const questionTimers = new Map();

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
      answersByQuestionId: {},
      validationsByQuestionId: {},
      draftAnswer: ''
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
      p.draftAnswer = '';
    });
    
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

app.post('/api/auto-save-answer', (req, res) => {
  const { lobbyId, participantId, answer } = req.body;
  const db = readDB();
  const lobby = db.lobbies.find(l => l.id === lobbyId);
  
  if (lobby && lobby.status === 'playing') {
    const participant = lobby.participants.find(p => p.participantId === participantId);
    
    if (participant) {
      participant.draftAnswer = answer;
      
      if (!participant.hasAnswered) {
        participant.currentAnswer = answer;
        
        const quiz = db.quizzes.find(q => q.id === lobby.quizId);
        const questions = lobby.shuffled && lobby.shuffledQuestions 
          ? lobby.shuffledQuestions 
          : quiz.questions;
        const currentQuestion = questions[lobby.session.currentQuestionIndex];
        
        if (!participant.answersByQuestionId) participant.answersByQuestionId = {};
        participant.answersByQuestionId[currentQuestion.id] = answer;
      }
      
      writeDB(db);
      console.log(`💾 Auto-save: ${participant.pseudo} → "${answer}"`);
      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'Participant introuvable' });
    }
  } else {
    res.json({ success: false, message: 'Lobby introuvable ou quiz non actif' });
  }
});

app.post('/api/submit-answer', (req, res) => {
  const { lobbyId, participantId, answer } = req.body;
  const db = readDB();
  const lobby = db.lobbies.find(l => l.id === lobbyId);
  
  if (lobby) {
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
      
      const quiz = db.quizzes.find(q => q.id === lobby.quizId);
      const questions = lobby.shuffled && lobby.shuffledQuestions 
        ? lobby.shuffledQuestions 
        : quiz.questions;
      const currentQuestion = questions[lobby.session.currentQuestionIndex];
      
      if (!participant.answersByQuestionId) participant.answersByQuestionId = {};
      participant.answersByQuestionId[currentQuestion.id] = answer;
      
      console.log(`✅ Submit: ${participant.pseudo} → "${answer}" (validé)`);
    }
    writeDB(db);
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.post('/api/mark-time-expired', (req, res) => {
  const { lobbyId, participantId } = req.body;
  const db = readDB();
  const lobby = db.lobbies.find(l => l.id === lobbyId);
  
  if (lobby) {
    const participant = lobby.participants.find(p => p.participantId === participantId);
    if (participant && !participant.hasAnswered) {
      participant.hasAnswered = true;
      const finalAnswer = participant.draftAnswer || '';
      participant.currentAnswer = finalAnswer;
      
      const quiz = db.quizzes.find(q => q.id === lobby.quizId);
      const questions = lobby.shuffled && lobby.shuffledQuestions 
        ? lobby.shuffledQuestions 
        : quiz.questions;
      const currentQuestion = questions[lobby.session.currentQuestionIndex];
      
      if (!participant.answersByQuestionId) participant.answersByQuestionId = {};
      participant.answersByQuestionId[currentQuestion.id] = finalAnswer;
      
      console.log(`⏰ Temps écoulé pour ${participant.pseudo} - Réponse auto-sauvegardée: "${finalAnswer}"`);
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
    const questions = lobby.shuffled && lobby.shuffledQuestions 
      ? lobby.shuffledQuestions 
      : quiz.questions;
      
    if (lobby.session.currentQuestionIndex < questions.length - 1) {
      lobby.session.currentQuestionIndex++;
      lobby.participants.forEach(p => {
        p.hasAnswered = false;
        p.currentAnswer = '';
        p.draftAnswer = '';
      });
      
      const currentQuestion = questions[lobby.session.currentQuestionIndex];
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
      questionTimers.delete(lobbyId);
    }
    writeDB(db);
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

// ✅ NOUVEAU: Validation avec règle stricte pour QCM
app.post('/api/validate-answer', (req, res) => {
  const { lobbyId, participantId, questionId, isCorrect } = req.body;
  const db = readDB();
  const lobby = db.lobbies.find(l => l.id === lobbyId);
  
  if (lobby) {
    const participant = lobby.participants.find(p => p.participantId === participantId);
    const quiz = db.quizzes.find(q => q.id === lobby.quizId);
    
    if (participant && quiz) {
      const question = quiz.questions.find(q => q.id === questionId);
      
      if (!participant.validationsByQuestionId) participant.validationsByQuestionId = {};
      participant.validationsByQuestionId[questionId] = isCorrect;
      
      // ✅ NOUVEAU: Règle spéciale pour QCM
      if (isCorrect && question) {
        const points = question.points || 1;
        const teamName = participant.teamName;
        const teamParticipants = lobby.participants.filter(p => p.teamName === teamName);
        
        // ✅ RÈGLE QCM: Vérifier si c'est un QCM
        if (question.type === 'qcm') {
          // Pour QCM, tous les membres de l'équipe doivent avoir juste
          const allTeamMembersValidated = teamParticipants.every(p => 
            p.validationsByQuestionId?.[questionId] === true
          );
          
          if (allTeamMembersValidated) {
            // Vérifier si les points n'ont pas déjà été attribués
            const alreadyScored = teamParticipants.some(p => 
              p.qcmTeamScored?.[questionId] === true
            );
            
            if (!alreadyScored) {
              const team = db.teams.find(t => t.name === teamName);
              if (team) {
                team.validatedScore = (team.validatedScore || 0) + points;
                
                // Marquer que cette question a été scorée pour cette équipe
                teamParticipants.forEach(p => {
                  if (!p.qcmTeamScored) p.qcmTeamScored = {};
                  p.qcmTeamScored[questionId] = true;
                });
                
                console.log(`✅ QCM: Équipe "${teamName}" gagne ${points} points (TOUS ont réussi la question ${questionId})`);
              }
            } else {
              console.log(`ℹ️  QCM: Équipe "${teamName}" a déjà reçu les points pour cette question`);
            }
          } else {
            const validatedCount = teamParticipants.filter(p => 
              p.validationsByQuestionId?.[questionId] === true
            ).length;
            const totalCount = teamParticipants.length;
            
            console.log(`⚠️  QCM: Équipe "${teamName}" - Seulement ${validatedCount}/${totalCount} ont réussi (pas de points)`);
          }
        } else {
          // ✅ RÈGLE NORMALE (non-QCM): Premier de l'équipe qui réussit
          const alreadyValidated = teamParticipants.some(p => 
            p.participantId !== participantId && 
            p.validationsByQuestionId?.[questionId] === true
          );
          
          if (!alreadyValidated) {
            const team = db.teams.find(t => t.name === teamName);
            if (team) {
              team.validatedScore = (team.validatedScore || 0) + points;
              console.log(`✅ Normal: Équipe "${teamName}" gagne ${points} points (Question ${questionId})`);
            }
          } else {
            console.log(`ℹ️  Normal: Équipe "${teamName}" a déjà validé cette question`);
          }
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
  console.log('   POST /api/auto-save-answer');
  console.log('');
  console.log('✅ Timer côté serveur activé (anti-triche)');
  console.log('✅ Points par équipe (1 validation = 1 point)');
  console.log('✅ Auto-sauvegarde des réponses en temps réel');
  console.log('✅ Mode QCM strict: TOUTE l\'équipe doit réussir');
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