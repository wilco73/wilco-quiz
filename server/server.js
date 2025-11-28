const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DB_FILE = path.join(__dirname, 'db.json');

app.use(cors());
app.use(express.json());

function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      teams: [],
      participants: [],
      quizzes: [],
      lobbies: [],
      admins: [{ id: '1', username: 'admin', password: 'admin123' }]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
  }
}

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

initDB();

app.post('/api/admin-login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const admin = db.admins.find(a => a.username === username && a.password === password);
  res.json(admin ? { success: true, username: admin.username } : { success: false, message: 'Identifiants incorrects' });
});

app.get('/api/teams', (req, res) => res.json(readDB().teams));
app.post('/api/teams', (req, res) => {
  const db = readDB();
  db.teams = req.body;
  writeDB(db);
  res.json({ success: true });
});

app.get('/api/participants', (req, res) => res.json(readDB().participants));
app.post('/api/participants', (req, res) => {
  const db = readDB();
  db.participants = req.body;
  writeDB(db);
  res.json({ success: true });
});

app.get('/api/quizzes', (req, res) => res.json(readDB().quizzes));
app.post('/api/quizzes', (req, res) => {
  const db = readDB();
  db.quizzes = req.body;
  writeDB(db);
  res.json({ success: true });
});

app.get('/api/lobbies', (req, res) => res.json(readDB().lobbies));

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
  
  if (!lobby.participants.find(p => p.participantId === participantId)) {
    lobby.participants.push({ participantId, pseudo, teamName, hasAnswered: false, currentAnswer: '', answers: {}, validations: {} });
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
    } else {
      lobby.session.status = 'finished';
      lobby.status = 'finished';
    }
    writeDB(db);
    res.json({ success: true });
  } else {
    res.json({ success: false });
  }
});

app.post('/api/validate-answer', (req, res) => {
  const { lobbyId, participantId, isCorrect } = req.body;
  const db = readDB();
  const lobby = db.lobbies.find(l => l.id === lobbyId);
  
  if (lobby) {
    const participant = lobby.participants.find(p => p.participantId === participantId);
    const quiz = db.quizzes.find(q => q.id === lobby.quizId);
    
    if (participant && quiz) {
      const qIndex = lobby.session.currentQuestionIndex;
      if (!participant.validations) participant.validations = {};
      participant.validations[qIndex] = isCorrect;
      
      if (isCorrect) {
        const points = quiz.questions[qIndex].points || 1;
        const team = db.teams.find(t => t.name === participant.teamName);
        if (team) {
          team.validatedScore = (team.validatedScore || 0) + points;
        }
      }
      writeDB(db);
      res.json({ success: true });
    } else {
      res.json({ success: false });
    }
  } else {
    res.json({ success: false });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Serveur sur http://localhost:${PORT}`);
  console.log(`📁 DB: ${DB_FILE}`);
  console.log(`🔑 Admin: admin / admin123`);
});