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

// ==================== HELPERS NORMALISATION ====================

/**
 * Normalise un nom d'équipe
 */
function normalizeTeamName(teamName) {
  if (!teamName) return '';
  
  return teamName
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

/**
 * Compare deux noms d'équipes (insensible à la casse)
 */
function areTeamNamesEqual(name1, name2) {
  if (!name1 || !name2) return false;
  
  const normalized1 = normalizeTeamName(name1).toLowerCase();
  const normalized2 = normalizeTeamName(name2).toLowerCase();
  
  return normalized1 === normalized2;
}

/**
 * Trouve une équipe par nom (comparaison intelligente)
 */
function findTeamByName(teams, teamName) {
  if (!teamName) return null;
  
  return teams.find(team => areTeamNamesEqual(team.name, teamName)) || null;
}

initDB();

// ==================== SHUFFLE FUNCTION ====================
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ==================== TIMER FUNCTIONS ====================
function startQuestionTimer(lobbyId, questionId, duration) {
  if (questionTimers.has(lobbyId)) {
    const oldTimer = questionTimers.get(lobbyId);
    if (oldTimer.timeout) {
      clearTimeout(oldTimer.timeout);
    }
  }

  console.log(`⏱️  Timer démarré: ${duration}s pour lobby ${lobbyId}, question ${questionId}`);

  const timerData = {
    timer: duration,
    startTime: Date.now(),
    timeout: null
  };

  questionTimers.set(lobbyId, timerData);
}

function stopQuestionTimer(lobbyId) {
  if (questionTimers.has(lobbyId)) {
    const timerData = questionTimers.get(lobbyId);
    if (timerData.timeout) {
      clearTimeout(timerData.timeout);
    }
    questionTimers.delete(lobbyId);
    console.log(`⏱️  Timer arrêté pour lobby ${lobbyId}`);
  }
}

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

// ✅ NOUVEAU: Route pour import par batch (append)
app.post('/api/questions/batch', (req, res) => {
  try {
    const { questions, mode } = req.body; // mode: 'append' ou 'replace'
    const db = readDB();
    
    if (mode === 'replace') {
      // Premier batch: remplacer toutes les questions
      db.questions = questions;
    } else {
      // Batches suivants: ajouter
      db.questions = [...db.questions, ...questions];
    }
    
    writeDB(db);
    res.json({ 
      success: true, 
      total: db.questions.length 
    });
  } catch (error) {
    console.error('Erreur batch import:', error);
    res.status(500).json({ success: false, error: error.message });
  }
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
  const { quizId, shuffle } = req.body;
  const db = readDB();
  const quiz = db.quizzes.find(q => q.id === quizId);
  
  if (!quiz) {
    return res.json({ success: false, message: 'Quiz introuvable' });
  }
  
  const lobby = {
    id: Date.now().toString(),
    quizId,
    status: 'waiting',
    participants: [],
    session: null,
    createdAt: Date.now(),
    shuffled: shuffle || false,
    shuffledQuestions: shuffle ? shuffleArray(quiz.questions) : null
  };
  
  db.lobbies.push(lobby);
  writeDB(db);
  
  console.log(`✅ Lobby créé: ${quiz.title} ${shuffle ? '(questions mélangées)' : '(ordre normal)'}`);
  res.json({ success: true, lobby });
});

app.post('/api/join-lobby', (req, res) => {
  const { lobbyId, participantId, pseudo, teamName } = req.body;
  const db = readDB();
  const lobby = db.lobbies.find(l => l.id === lobbyId);
  
  if (!lobby || lobby.status !== 'waiting') {
    return res.json({ success: false, message: 'Salle non disponible' });
  }
  
  // ✅ AMÉLIORATION: Normaliser et trouver équipe existante
  const normalizedTeamName = normalizeTeamName(teamName);
  let team = findTeamByName(db.teams, normalizedTeamName);
  
  if (!team) {
    team = { 
      id: Date.now().toString(), 
      name: normalizedTeamName,
      validatedScore: 0,
      createdAt: Date.now()
    };
    db.teams.push(team);
    console.log(`✅ Nouvelle équipe créée (join-lobby): "${normalizedTeamName}"`);
  } else {
    console.log(`✅ Équipe existante trouvée (join-lobby): "${team.name}"`);
  }
  
  if (!lobby.participants.find(p => p.participantId === participantId)) {
    lobby.participants.push({ 
      participantId, 
      pseudo, 
      teamName: team.name,  // Utiliser le nom exact
      hasAnswered: false, 
      currentAnswer: '', 
      answers: {}, 
      validations: {} 
    });
    console.log(`✅ Participant "${pseudo}" a rejoint le lobby avec équipe "${team.name}"`);
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
  
  if (lobby) {
    const quiz = db.quizzes.find(q => q.id === lobby.quizId);
    
    // ✅ Utiliser shuffledQuestions si disponible
    const questions = lobby.shuffled && lobby.shuffledQuestions 
      ? lobby.shuffledQuestions 
      : quiz.questions;
    
    lobby.status = 'playing';
    lobby.session = {
      currentQuestionIndex: 0,
      startTime: Date.now()
    };
    
    // Lancer le timer pour la première question
    if (questions[0].timer > 0) {
      startQuestionTimer(lobbyId, questions[0].id, questions[0].timer);
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
        // Sauvegarder la réponse même si le temps est écoulé
        const participant = lobby.participants.find(p => p.participantId === participantId);
        if (participant && answer && answer.trim()) {
          participant.currentAnswer = answer;
          
          const quiz = db.quizzes.find(q => q.id === lobby.quizId);
          const questions = lobby.shuffled && lobby.shuffledQuestions 
            ? lobby.shuffledQuestions 
            : quiz.questions;
          const currentQuestion = questions[lobby.session.currentQuestionIndex];
          
          if (!participant.answersByQuestionId) participant.answersByQuestionId = {};
          participant.answersByQuestionId[currentQuestion.id] = answer;
          
          writeDB(db);
          console.log(`⏱️  Réponse sauvegardée malgré timer expiré: ${participantId}`);
        }
        
        return res.json({ 
          success: false, 
          message: 'Temps écoulé, mais votre réponse a été enregistrée',
          timeExpired: true,
          answerSaved: true
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

// ==================== GESTION PARTICIPANTS ET ÉQUIPES ====================

// Mettre à jour un participant (changement d'équipe)
app.post('/api/update-participant', (req, res) => {
  const { participantId, updates } = req.body;
  const db = readDB();
  
  const participant = db.participants.find(p => p.id === participantId);
  
  if (!participant) {
    return res.json({ success: false, message: 'Participant introuvable' });
  }

  const oldTeam = participant.teamName;
  
  // ✅ AMÉLIORATION: Normaliser le nouveau nom d'équipe
  if (updates.teamName !== undefined) {
    const normalizedTeamName = normalizeTeamName(updates.teamName);
    
    if (normalizedTeamName) {
      // Chercher équipe existante avec normalisation
      let team = findTeamByName(db.teams, normalizedTeamName);
      
      if (!team) {
        // Créer nouvelle équipe
        team = {
          id: Date.now().toString(),
          name: normalizedTeamName,
          validatedScore: 0,
          createdAt: Date.now()
        };
        db.teams.push(team);
        console.log(`✅ Nouvelle équipe créée (update-participant): "${normalizedTeamName}"`);
      } else {
        console.log(`✅ Équipe existante trouvée (update-participant): "${team.name}"`);
      }
      
      // Utiliser le nom exact de l'équipe
      participant.teamName = team.name;
    } else {
      // Nom vide = retirer de l'équipe
      participant.teamName = '';
    }
  }
  
  // Appliquer les autres modifications
  Object.keys(updates).forEach(key => {
    if (key !== 'teamName') {
      participant[key] = updates[key];
    }
  });
  
  writeDB(db);
  
  console.log(`✅ Participant "${participant.pseudo}" changé: "${oldTeam || 'Aucune'}" → "${participant.teamName || 'Aucune'}"`);
  
  res.json({ success: true, participant });
});

// Supprimer une équipe (participants restent sans équipe)
app.post('/api/delete-team', (req, res) => {
  const { teamName } = req.body;
  const db = readDB();
  
  // ✅ AMÉLIORATION: Trouver équipe avec normalisation
  const team = findTeamByName(db.teams, teamName);
  
  if (!team) {
    return res.json({ success: false, message: 'Équipe introuvable' });
  }

  // Utiliser le nom exact de l'équipe trouvée
  const exactTeamName = team.name;
  
  // Retirer tous les participants de cette équipe (comparaison exacte)
  const affectedParticipants = db.participants.filter(p => p.teamName === exactTeamName);
  affectedParticipants.forEach(p => {
    p.teamName = '';
    console.log(`  ℹ️  Participant "${p.pseudo}" retiré de l'équipe`);
  });

  // Supprimer l'équipe
  db.teams = db.teams.filter(t => t.name !== exactTeamName);
  
  // Nettoyer les lobbies
  db.lobbies.forEach(lobby => {
    if (lobby.participants) {
      lobby.participants.forEach(p => {
        if (p.teamName === exactTeamName) {
          p.teamName = '';
        }
      });
    }
  });

  writeDB(db);
  
  console.log(`🗑️  Équipe "${exactTeamName}" supprimée (${affectedParticipants.length} participants retirés)`);
  
  res.json({ 
    success: true, 
    affectedCount: affectedParticipants.length 
  });
});

app.post('/api/login', (req, res) => {
  const { teamName, pseudo, password } = req.body;
  const db = readDB();
  
  // Normaliser le nom d'équipe
  const normalizedTeamName = normalizeTeamName(teamName);
  
  // Vérifier participant existant
  const existingParticipant = db.participants.find(p => p.pseudo === pseudo);

  if (existingParticipant) {
    if (existingParticipant.password !== password) {
      return res.json({ success: false, message: 'Ce pseudo existe avec un mot de passe différent' });
    }
    
    // Vérifier si changement d'équipe
    if (!areTeamNamesEqual(existingParticipant.teamName, normalizedTeamName)) {
      // Proposer changement
      return res.json({ 
        success: false, 
        needsConfirmation: true,
        message: `Ce pseudo est déjà dans l'équipe "${existingParticipant.teamName}"`,
        currentTeam: existingParticipant.teamName,
        newTeam: normalizedTeamName
      });
    }
  }

  // ✅ AMÉLIORATION: Chercher équipe avec normalisation
  let team = findTeamByName(db.teams, normalizedTeamName);
  
  if (!team) {
    // Créer nouvelle équipe avec nom normalisé
    team = { 
      id: Date.now().toString(), 
      name: normalizedTeamName,  // Utiliser le nom normalisé
      validatedScore: 0,
      createdAt: Date.now()
    };
    db.teams.push(team);
    console.log(`✅ Nouvelle équipe créée: "${normalizedTeamName}"`);
  } else {
    console.log(`✅ Équipe existante trouvée: "${team.name}" (recherché: "${normalizedTeamName}")`);
  }

  // Créer ou mettre à jour participant
  let participant = existingParticipant;
  if (!participant) {
    participant = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      pseudo,
      password,
      teamName: team.name,  // Utiliser le nom exact de l'équipe trouvée
      teamId: team.id,
      createdAt: Date.now()
    };
    db.participants.push(participant);
    console.log(`✅ Nouveau participant créé: "${pseudo}" dans "${team.name}"`);
  } else {
    // Mettre à jour avec le nom exact de l'équipe
    participant.teamName = team.name;
    console.log(`✅ Participant mis à jour: "${pseudo}" → "${team.name}"`);
  }

  writeDB(db);
  res.json({ success: true, participant });
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