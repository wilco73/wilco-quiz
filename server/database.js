/**
 * Module de gestion de la base de données SQLite
 * Utilise sql.js (SQLite compilé en WebAssembly - pas de compilation native requise)
 */

const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'quiz.db');
const SALT_ROUNDS = 10;

let db = null;
let SQL = null;

/**
 * Initialise la connexion à la base de données
 */
async function initDatabase() {
  // Initialiser sql.js
  SQL = await initSqlJs();
  
  // Charger la base existante ou en créer une nouvelle
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
    console.log('[OK] Base de donnees SQLite chargee:', DB_PATH);
  } else {
    db = new SQL.Database();
    console.log('[OK] Nouvelle base de donnees SQLite creee');
  }
  
  createTables();
  seedDefaultAdmin();
  saveDatabase(); // Sauvegarder après initialisation
  
  return db;
}

/**
 * Sauvegarde la base de données sur le disque
 */
function saveDatabase() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Crée les tables si elles n'existent pas
 */
function createTables() {
  db.run(`
    -- Table des administrateurs
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);

  db.run(`
    -- Table des équipes
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      validated_score INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);

  db.run(`
    -- Table des participants
    CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      pseudo TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      team_id INTEGER,
      avatar TEXT DEFAULT 'default',
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
    )
  `);
  
  // Migration: ajouter la colonne avatar si elle n'existe pas
  try {
    db.run(`ALTER TABLE participants ADD COLUMN avatar TEXT DEFAULT 'default'`);
  } catch (e) {
    // Colonne existe deja
  }

  db.run(`
    -- Table des questions (banque de questions)
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      answer TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      category TEXT,
      points INTEGER DEFAULT 1,
      timer INTEGER DEFAULT 0,
      media TEXT,
      media_type TEXT,
      choices TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);

  db.run(`
    -- Table des quiz
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);

  db.run(`
    -- Table de liaison quiz-questions (ordre des questions dans un quiz)
    CREATE TABLE IF NOT EXISTS quiz_questions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quiz_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      UNIQUE(quiz_id, question_id)
    )
  `);

  db.run(`
    -- Table des lobbies (sessions de jeu)
    CREATE TABLE IF NOT EXISTS lobbies (
      id TEXT PRIMARY KEY,
      quiz_id TEXT NOT NULL,
      status TEXT DEFAULT 'waiting',
      current_question_index INTEGER DEFAULT 0,
      shuffled INTEGER DEFAULT 0,
      shuffled_questions TEXT,
      start_time INTEGER,
      archived INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
    )
  `);
  
  // Migration: ajouter la colonne archived si elle n'existe pas
  try {
    db.run(`ALTER TABLE lobbies ADD COLUMN archived INTEGER DEFAULT 0`);
  } catch (e) {
    // Colonne existe deja
  }

  db.run(`
    -- Table des participants dans un lobby
    CREATE TABLE IF NOT EXISTS lobby_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lobby_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      team_name TEXT,
      has_answered INTEGER DEFAULT 0,
      current_answer TEXT DEFAULT '',
      draft_answer TEXT DEFAULT '',
      FOREIGN KEY (lobby_id) REFERENCES lobbies(id) ON DELETE CASCADE,
      FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
      UNIQUE(lobby_id, participant_id)
    )
  `);

  db.run(`
    -- Table des réponses par question dans un lobby
    CREATE TABLE IF NOT EXISTS lobby_answers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lobby_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      question_id TEXT NOT NULL,
      answer TEXT,
      validation INTEGER,
      qcm_team_scored INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (lobby_id) REFERENCES lobbies(id) ON DELETE CASCADE,
      FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      UNIQUE(lobby_id, participant_id, question_id)
    )
  `);

  // Index pour améliorer les performances
  db.run(`CREATE INDEX IF NOT EXISTS idx_participants_team ON participants(team_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_lobby_participants_lobby ON lobby_participants(lobby_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_lobby_answers_lobby ON lobby_answers(lobby_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id)`);
}

/**
 * Crée l'admin par défaut s'il n'existe pas
 */
function seedDefaultAdmin() {
  const result = db.exec("SELECT id FROM admins WHERE username = 'admin'");
  
  if (result.length === 0 || result[0].values.length === 0) {
    const passwordHash = bcrypt.hashSync('admin123', SALT_ROUNDS);
    db.run("INSERT INTO admins (username, password_hash) VALUES (?, ?)", ['admin', passwordHash]);
    console.log('[OK] Admin par defaut cree: admin / admin123');
  }
}

/**
 * Helper pour exécuter une requête SELECT et retourner les résultats
 */
function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * Helper pour exécuter une requête SELECT et retourner un seul résultat
 */
function queryOne(sql, params = []) {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Helper pour exécuter une requête INSERT/UPDATE/DELETE
 */
function run(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
}

/**
 * Retourne l'instance de la base de données
 */
function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Ferme proprement la connexion
 */
function closeDatabase() {
  if (db) {
    saveDatabase();
    db.close();
    db = null;
    console.log('[OK] Base de donnees fermee');
  }
}

// ==================== HELPERS POUR LE HASHAGE ====================

function hashPasswordSync(password) {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

function verifyPasswordSync(password, hash) {
  if (!hash) return false;
  
  // Si le hash commence par $2 c'est un hash bcrypt
  if (hash.startsWith('$2')) {
    return bcrypt.compareSync(password, hash);
  }
  
  // Sinon c'est peut-etre un ancien mot de passe en clair (migration)
  // On compare directement et on loggue un warning
  if (password === hash) {
    console.log('[WARNING] Mot de passe non-hashe detecte. Veuillez faire migrer les donnees.');
    return true;
  }
  
  return false;
}

// ==================== HELPERS NORMALISATION ====================

function normalizeTeamName(teamName) {
  if (!teamName) return '';
  return teamName
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

function areTeamNamesEqual(name1, name2) {
  if (!name1 || !name2) return false;
  return normalizeTeamName(name1).toLowerCase() === normalizeTeamName(name2).toLowerCase();
}

// ==================== OPÉRATIONS CRUD ====================

// ----- ADMINS -----

function verifyAdmin(username, password) {
  const admin = queryOne('SELECT * FROM admins WHERE username = ?', [username]);
  if (!admin) return null;
  
  if (verifyPasswordSync(password, admin.password_hash)) {
    return { id: admin.id, username: admin.username };
  }
  return null;
}

// ----- TEAMS -----

function getAllTeams() {
  return query(`
    SELECT id, name, validated_score as validatedScore, created_at as createdAt 
    FROM teams 
    ORDER BY name
  `);
}

function getTeamByName(name) {
  const normalizedName = normalizeTeamName(name);
  return queryOne(`
    SELECT id, name, validated_score as validatedScore, created_at as createdAt 
    FROM teams 
    WHERE LOWER(name) = LOWER(?)
  `, [normalizedName]);
}

function getTeamById(id) {
  return queryOne(`
    SELECT id, name, validated_score as validatedScore, created_at as createdAt 
    FROM teams 
    WHERE id = ?
  `, [id]);
}

function createTeam(name) {
  const normalizedName = normalizeTeamName(name);
  const existing = getTeamByName(normalizedName);
  if (existing) return existing;
  
  run('INSERT INTO teams (name) VALUES (?)', [normalizedName]);
  return getTeamByName(normalizedName);
}

function updateTeamScore(teamId, score) {
  run('UPDATE teams SET validated_score = ? WHERE id = ?', [score, teamId]);
}

function addTeamScore(teamId, points) {
  run('UPDATE teams SET validated_score = validated_score + ? WHERE id = ?', [points, teamId]);
}

function resetAllTeamScores() {
  run('UPDATE teams SET validated_score = 0');
}

function deleteTeam(teamId) {
  run('DELETE FROM teams WHERE id = ?', [teamId]);
}

function saveAllTeams(teams) {
  for (const team of teams) {
    const existing = getTeamById(team.id);
    if (existing) {
      run('UPDATE teams SET name = ?, validated_score = ? WHERE id = ?',
        [team.name, team.validatedScore || 0, team.id]);
    } else {
      run('INSERT INTO teams (name, validated_score) VALUES (?, ?)',
        [team.name, team.validatedScore || 0]);
    }
  }
}

// ----- PARTICIPANTS -----

function getAllParticipants() {
  return query(`
    SELECT p.id, p.pseudo, p.password_hash as password, t.name as teamName, p.team_id as teamId, 
           p.avatar, p.created_at as createdAt
    FROM participants p
    LEFT JOIN teams t ON p.team_id = t.id
    ORDER BY p.pseudo
  `);
}

function getParticipantByPseudo(pseudo) {
  return queryOne(`
    SELECT p.id, p.pseudo, p.password_hash as password, t.name as teamName, p.team_id as teamId,
           p.avatar, p.created_at as createdAt
    FROM participants p
    LEFT JOIN teams t ON p.team_id = t.id
    WHERE p.pseudo = ?
  `, [pseudo]);
}

function getParticipantById(id) {
  return queryOne(`
    SELECT p.id, p.pseudo, p.password_hash as password, t.name as teamName, p.team_id as teamId,
           p.avatar, p.created_at as createdAt
    FROM participants p
    LEFT JOIN teams t ON p.team_id = t.id
    WHERE p.id = ?
  `, [id]);
}

function createParticipant(id, pseudo, password, teamId, avatar = 'default') {
  const passwordHash = hashPasswordSync(password);
  run('INSERT INTO participants (id, pseudo, password_hash, team_id, avatar) VALUES (?, ?, ?, ?, ?)',
    [id, pseudo, passwordHash, teamId, avatar]);
  return getParticipantById(id);
}

function updateParticipantTeam(participantId, teamId) {
  run('UPDATE participants SET team_id = ? WHERE id = ?', [teamId, participantId]);
}

function updateParticipantAvatar(participantId, avatar) {
  run('UPDATE participants SET avatar = ? WHERE id = ?', [avatar, participantId]);
  return getParticipantById(participantId);
}

function verifyParticipantPassword(pseudo, password) {
  const participant = queryOne('SELECT password_hash FROM participants WHERE pseudo = ?', [pseudo]);
  if (!participant) {
    console.log(`[AUTH] Participant "${pseudo}" non trouve`);
    return false;
  }
  if (!participant.password_hash) {
    console.log(`[AUTH] Participant "${pseudo}" n'a pas de hash de mot de passe`);
    return false;
  }
  const result = verifyPasswordSync(password, participant.password_hash);
  console.log(`[AUTH] Verification mot de passe pour "${pseudo}": ${result ? 'OK' : 'ECHEC'}`);
  return result;
}

function saveAllParticipants(participants) {
  for (const p of participants) {
    const existing = getParticipantById(p.id);
    if (existing) {
      let teamId = null;
      if (p.teamName) {
        const team = getTeamByName(p.teamName) || createTeam(p.teamName);
        teamId = team.id;
      }
      run('UPDATE participants SET pseudo = ?, team_id = ? WHERE id = ?',
        [p.pseudo, teamId, p.id]);
    }
  }
}

function updateParticipantPassword(participantId, newPassword) {
  const passwordHash = hashPasswordSync(newPassword);
  run('UPDATE participants SET password_hash = ? WHERE id = ?', [passwordHash, participantId]);
}

function deleteParticipant(participantId) {
  // Supprimer d'abord des lobbies
  run('DELETE FROM lobby_participants WHERE participant_id = ?', [participantId]);
  run('DELETE FROM lobby_answers WHERE participant_id = ?', [participantId]);
  // Puis supprimer le participant
  run('DELETE FROM participants WHERE id = ?', [participantId]);
}

// ----- QUESTIONS -----

function getAllQuestions() {
  const questions = query(`
    SELECT id, text, answer, type, category, points, timer, media, media_type as mediaType, choices, created_at as createdAt
    FROM questions
    ORDER BY created_at DESC
  `);
  
  return questions.map(q => ({
    ...q,
    choices: q.choices ? JSON.parse(q.choices) : null
  }));
}

function getQuestionById(id) {
  const q = queryOne(`
    SELECT id, text, answer, type, category, points, timer, media, media_type as mediaType, choices, created_at as createdAt
    FROM questions WHERE id = ?
  `, [id]);
  
  if (q && q.choices) {
    q.choices = JSON.parse(q.choices);
  }
  return q;
}

function createQuestion(question) {
  const id = question.id || `q${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const choices = question.choices ? JSON.stringify(question.choices) : null;
  
  run(`
    INSERT INTO questions (id, text, answer, type, category, points, timer, media, media_type, choices)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    question.text,
    question.answer,
    question.type || 'text',
    question.category || null,
    question.points || 1,
    question.timer || 0,
    question.media || null,
    question.mediaType || null,
    choices
  ]);
  
  return getQuestionById(id);
}

function updateQuestion(id, question) {
  const choices = question.choices ? JSON.stringify(question.choices) : null;
  
  run(`
    UPDATE questions 
    SET text = ?, answer = ?, type = ?, category = ?, points = ?, timer = ?, media = ?, media_type = ?, choices = ?
    WHERE id = ?
  `, [
    question.text,
    question.answer,
    question.type || 'text',
    question.category || null,
    question.points || 1,
    question.timer || 0,
    question.media || null,
    question.mediaType || null,
    choices,
    id
  ]);
  
  return getQuestionById(id);
}

function deleteQuestion(id) {
  run('DELETE FROM questions WHERE id = ?', [id]);
}

function saveAllQuestions(questions) {
  // Supprimer toutes les questions existantes
  run('DELETE FROM questions');
  
  // Insérer les nouvelles
  for (const q of questions) {
    const choices = q.choices ? JSON.stringify(q.choices) : null;
    run(`
      INSERT INTO questions (id, text, answer, type, category, points, timer, media, media_type, choices)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      q.id,
      q.text,
      q.answer,
      q.type || 'text',
      q.category || null,
      q.points || 1,
      q.timer || 0,
      q.media || null,
      q.mediaType || null,
      choices
    ]);
  }
}

/**
 * Fusionne des questions importées avec les existantes
 * @param {Array} questions - Questions à importer
 * @param {string} mode - 'update' (fusionner), 'add' (ajouter sans écraser), 'replace' (tout remplacer)
 * @returns {Object} { added, updated }
 */
function mergeQuestions(questions, mode = 'update') {
  let added = 0;
  let updated = 0;
  
  if (mode === 'replace') {
    // Mode REPLACE : supprimer tout et réimporter
    run('DELETE FROM questions');
    for (const q of questions) {
      createQuestion(q);
      added++;
    }
  } else {
    // Mode UPDATE ou ADD - optimisé pour les gros imports
    // 1. Récupérer tous les IDs existants en une seule requête
    const existingIds = new Set(
      query('SELECT id FROM questions').map(row => row.id)
    );
    
    // 2. Traiter chaque question
    for (const q of questions) {
      const exists = q.id && existingIds.has(q.id);
      
      if (exists) {
        if (mode === 'update') {
          // Mode UPDATE : mettre à jour la question existante
          updateQuestion(q.id, q);
          updated++;
        }
        // Mode ADD : on ignore les doublons (on ne fait rien)
      } else {
        // Question n'existe pas : on l'ajoute
        createQuestion(q);
        added++;
        // Ajouter l'ID au set pour éviter les doublons dans le même batch
        if (q.id) existingIds.add(q.id);
      }
    }
  }
  
  saveDatabase();
  return { added, updated };
}

// ----- QUIZZES -----

function getAllQuizzes() {
  const quizzes = query(`
    SELECT id, title, description, created_at as createdAt
    FROM quizzes
    ORDER BY created_at DESC
  `);
  
  return quizzes.map(quiz => ({
    ...quiz,
    questions: getQuizQuestions(quiz.id)
  }));
}

function getQuizById(id) {
  const quiz = queryOne(`
    SELECT id, title, description, created_at as createdAt
    FROM quizzes WHERE id = ?
  `, [id]);
  
  if (quiz) {
    quiz.questions = getQuizQuestions(id);
  }
  return quiz;
}

function getQuizQuestions(quizId) {
  const rows = query(`
    SELECT q.id, q.text, q.answer, q.type, q.category, q.points, q.timer, q.media, q.media_type as mediaType, q.choices
    FROM quiz_questions qq
    JOIN questions q ON qq.question_id = q.id
    WHERE qq.quiz_id = ?
    ORDER BY qq.position
  `, [quizId]);
  
  return rows.map(q => ({
    ...q,
    choices: q.choices ? JSON.parse(q.choices) : null
  }));
}

function createQuiz(quiz) {
  const id = quiz.id || Date.now().toString();
  
  run('INSERT INTO quizzes (id, title, description) VALUES (?, ?, ?)',
    [id, quiz.title, quiz.description || null]);
  
  if (quiz.questions && quiz.questions.length > 0) {
    setQuizQuestions(id, quiz.questions);
  }
  
  return getQuizById(id);
}

function updateQuiz(id, quiz) {
  run('UPDATE quizzes SET title = ?, description = ? WHERE id = ?',
    [quiz.title, quiz.description || null, id]);
  
  if (quiz.questions) {
    setQuizQuestions(id, quiz.questions);
  }
  
  return getQuizById(id);
}

function setQuizQuestions(quizId, questions) {
  run('DELETE FROM quiz_questions WHERE quiz_id = ?', [quizId]);
  
  questions.forEach((q, index) => {
    run('INSERT INTO quiz_questions (quiz_id, question_id, position) VALUES (?, ?, ?)',
      [quizId, q.id, index]);
  });
}

function deleteQuiz(id) {
  run('DELETE FROM quizzes WHERE id = ?', [id]);
}

function saveAllQuizzes(quizzes) {
  for (const quiz of quizzes) {
    const existing = getQuizById(quiz.id);
    if (existing) {
      updateQuiz(quiz.id, quiz);
    } else {
      createQuiz(quiz);
    }
  }
}

// ----- LOBBIES -----

function getAllLobbies() {
  const lobbies = query(`
    SELECT id, quiz_id as quizId, status, current_question_index as currentQuestionIndex,
           shuffled, shuffled_questions as shuffledQuestions, start_time as startTime, 
           archived, created_at as createdAt
    FROM lobbies
    ORDER BY created_at DESC
  `);
  
  return lobbies.map(lobby => {
    const participants = getLobbyParticipants(lobby.id);
    const session = lobby.status !== 'waiting' ? {
      currentQuestionIndex: lobby.currentQuestionIndex,
      startTime: lobby.startTime,
      status: lobby.status === 'finished' ? 'finished' : undefined
    } : null;
    
    return {
      ...lobby,
      archived: lobby.archived === 1,
      shuffledQuestions: lobby.shuffledQuestions ? JSON.parse(lobby.shuffledQuestions) : null,
      participants,
      session
    };
  });
}

function getLobbyById(id) {
  const lobby = queryOne(`
    SELECT id, quiz_id as quizId, status, current_question_index as currentQuestionIndex,
           shuffled, shuffled_questions as shuffledQuestions, start_time as startTime, 
           archived, created_at as createdAt
    FROM lobbies WHERE id = ?
  `, [id]);
  
  if (lobby) {
    lobby.participants = getLobbyParticipants(id);
    lobby.shuffledQuestions = lobby.shuffledQuestions ? JSON.parse(lobby.shuffledQuestions) : null;
    lobby.archived = lobby.archived === 1;
    lobby.session = lobby.status !== 'waiting' ? {
      currentQuestionIndex: lobby.currentQuestionIndex,
      startTime: lobby.startTime,
      status: lobby.status === 'finished' ? 'finished' : undefined
    } : null;
  }
  return lobby;
}

function getLobbyParticipants(lobbyId) {
  const participants = query(`
    SELECT lp.participant_id as participantId, p.pseudo, lp.team_name as teamName,
           lp.has_answered as hasAnswered, lp.current_answer as currentAnswer, lp.draft_answer as draftAnswer
    FROM lobby_participants lp
    JOIN participants p ON lp.participant_id = p.id
    WHERE lp.lobby_id = ?
  `, [lobbyId]);
  
  return participants.map(p => {
    const answers = query(`
      SELECT question_id, answer, validation, qcm_team_scored
      FROM lobby_answers
      WHERE lobby_id = ? AND participant_id = ?
    `, [lobbyId, p.participantId]);
    
    const answersByQuestionId = {};
    const validationsByQuestionId = {};
    const qcmTeamScored = {};
    
    answers.forEach(a => {
      if (a.answer !== null) answersByQuestionId[a.question_id] = a.answer;
      if (a.validation !== null) validationsByQuestionId[a.question_id] = a.validation === 1;
      if (a.qcm_team_scored) qcmTeamScored[a.question_id] = true;
    });
    
    return {
      ...p,
      hasAnswered: p.hasAnswered === 1,
      answersByQuestionId,
      validationsByQuestionId,
      qcmTeamScored
    };
  });
}

function createLobby(quizId, shuffle = false) {
  const id = Date.now().toString();
  const quiz = getQuizById(quizId);
  
  let shuffledQuestions = null;
  if (shuffle && quiz && quiz.questions) {
    const shuffled = [...quiz.questions].sort(() => Math.random() - 0.5);
    shuffledQuestions = JSON.stringify(shuffled);
  }
  
  run(`
    INSERT INTO lobbies (id, quiz_id, shuffled, shuffled_questions)
    VALUES (?, ?, ?, ?)
  `, [id, quizId, shuffle ? 1 : 0, shuffledQuestions]);
  
  return getLobbyById(id);
}

function joinLobby(lobbyId, participantId, pseudo, teamName) {
  const normalizedTeamName = normalizeTeamName(teamName);
  
  const existing = queryOne(`
    SELECT id FROM lobby_participants WHERE lobby_id = ? AND participant_id = ?
  `, [lobbyId, participantId]);
  
  if (!existing) {
    run(`
      INSERT INTO lobby_participants (lobby_id, participant_id, team_name)
      VALUES (?, ?, ?)
    `, [lobbyId, participantId, normalizedTeamName]);
  }
  
  return getLobbyById(lobbyId);
}

function leaveLobby(lobbyId, participantId) {
  run('DELETE FROM lobby_participants WHERE lobby_id = ? AND participant_id = ?',
    [lobbyId, participantId]);
  
  const lobby = getLobbyById(lobbyId);
  if (lobby && lobby.status === 'waiting' && lobby.participants.length === 0) {
    deleteLobby(lobbyId);
  }
}

function startLobby(lobbyId) {
  run(`
    UPDATE lobbies 
    SET status = 'playing', current_question_index = 0, start_time = ?
    WHERE id = ?
  `, [Date.now(), lobbyId]);
  
  return getLobbyById(lobbyId);
}

function updateLobbyQuestionIndex(lobbyId, index) {
  run('UPDATE lobbies SET current_question_index = ? WHERE id = ?', [index, lobbyId]);
  
  run(`
    UPDATE lobby_participants 
    SET has_answered = 0, current_answer = '', draft_answer = ''
    WHERE lobby_id = ?
  `, [lobbyId]);
}

function finishLobby(lobbyId) {
  run("UPDATE lobbies SET status = 'finished' WHERE id = ?", [lobbyId]);
}

function resetLobby(lobbyId) {
  // Remettre le lobby en attente
  run(`
    UPDATE lobbies 
    SET status = 'waiting', current_question_index = 0, start_time = NULL
    WHERE id = ?
  `, [lobbyId]);
  
  // Reinitialiser les reponses des participants
  run(`
    UPDATE lobby_participants 
    SET has_answered = 0, current_answer = '', draft_answer = ''
    WHERE lobby_id = ?
  `, [lobbyId]);
  
  // Supprimer les reponses enregistrees
  run('DELETE FROM lobby_answers WHERE lobby_id = ?', [lobbyId]);
}

function archiveLobby(lobbyId, archived = true) {
  run(`UPDATE lobbies SET archived = ? WHERE id = ?`, [archived ? 1 : 0, lobbyId]);
  return getLobbyById(lobbyId);
}

function deleteLobby(lobbyId) {
  run('DELETE FROM lobbies WHERE id = ?', [lobbyId]);
}

// ----- LOBBY ANSWERS -----

function autoSaveAnswer(lobbyId, participantId, answer) {
  run(`
    UPDATE lobby_participants 
    SET draft_answer = ?, current_answer = CASE WHEN has_answered = 0 THEN ? ELSE current_answer END
    WHERE lobby_id = ? AND participant_id = ?
  `, [answer, answer, lobbyId, participantId]);
}

function submitAnswer(lobbyId, participantId, questionId, answer) {
  run(`
    UPDATE lobby_participants 
    SET has_answered = 1, current_answer = ?
    WHERE lobby_id = ? AND participant_id = ?
  `, [answer, lobbyId, participantId]);
  
  // Vérifier si une réponse existe déjà
  const existing = queryOne(`
    SELECT id FROM lobby_answers WHERE lobby_id = ? AND participant_id = ? AND question_id = ?
  `, [lobbyId, participantId, questionId]);
  
  if (existing) {
    run(`UPDATE lobby_answers SET answer = ? WHERE id = ?`, [answer, existing.id]);
  } else {
    run(`
      INSERT INTO lobby_answers (lobby_id, participant_id, question_id, answer)
      VALUES (?, ?, ?, ?)
    `, [lobbyId, participantId, questionId, answer]);
  }
}

function markTimeExpired(lobbyId, participantId, questionId) {
  const lp = queryOne(`
    SELECT draft_answer FROM lobby_participants 
    WHERE lobby_id = ? AND participant_id = ?
  `, [lobbyId, participantId]);
  
  const finalAnswer = lp?.draft_answer || '';
  
  run(`
    UPDATE lobby_participants 
    SET has_answered = 1, current_answer = ?
    WHERE lobby_id = ? AND participant_id = ?
  `, [finalAnswer, lobbyId, participantId]);
  
  // Vérifier si une réponse existe déjà
  const existing = queryOne(`
    SELECT id FROM lobby_answers WHERE lobby_id = ? AND participant_id = ? AND question_id = ?
  `, [lobbyId, participantId, questionId]);
  
  if (existing) {
    run(`UPDATE lobby_answers SET answer = ? WHERE id = ?`, [finalAnswer, existing.id]);
  } else {
    run(`
      INSERT INTO lobby_answers (lobby_id, participant_id, question_id, answer)
      VALUES (?, ?, ?, ?)
    `, [lobbyId, participantId, questionId, finalAnswer]);
  }
  
  return finalAnswer;
}

function validateAnswer(lobbyId, participantId, questionId, isCorrect) {
  const existing = queryOne(`
    SELECT id FROM lobby_answers WHERE lobby_id = ? AND participant_id = ? AND question_id = ?
  `, [lobbyId, participantId, questionId]);
  
  if (existing) {
    run(`UPDATE lobby_answers SET validation = ? WHERE id = ?`, [isCorrect ? 1 : 0, existing.id]);
  } else {
    run(`
      INSERT INTO lobby_answers (lobby_id, participant_id, question_id, validation)
      VALUES (?, ?, ?, ?)
    `, [lobbyId, participantId, questionId, isCorrect ? 1 : 0]);
  }
}

function markQcmTeamScored(lobbyId, participantId, questionId) {
  run(`
    UPDATE lobby_answers 
    SET qcm_team_scored = 1
    WHERE lobby_id = ? AND participant_id = ? AND question_id = ?
  `, [lobbyId, participantId, questionId]);
}

function getParticipantValidation(lobbyId, participantId, questionId) {
  return queryOne(`
    SELECT validation, qcm_team_scored FROM lobby_answers
    WHERE lobby_id = ? AND participant_id = ? AND question_id = ?
  `, [lobbyId, participantId, questionId]);
}

function updateLobbyParticipantTeam(lobbyId, participantId, teamName) {
  const normalizedTeamName = normalizeTeamName(teamName);
  run(`
    UPDATE lobby_participants SET team_name = ? WHERE lobby_id = ? AND participant_id = ?
  `, [normalizedTeamName, lobbyId, participantId]);
}

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  saveDatabase,
  hashPasswordSync,
  verifyPasswordSync,
  normalizeTeamName,
  areTeamNamesEqual,
  
  // Admins
  verifyAdmin,
  
  // Teams
  getAllTeams,
  getTeamByName,
  getTeamById,
  createTeam,
  updateTeamScore,
  addTeamScore,
  resetAllTeamScores,
  deleteTeam,
  saveAllTeams,
  
  // Participants
  getAllParticipants,
  getParticipantByPseudo,
  getParticipantById,
  createParticipant,
  updateParticipantTeam,
  updateParticipantAvatar,
  updateParticipantPassword,
  deleteParticipant,
  verifyParticipantPassword,
  saveAllParticipants,
  
  // Questions
  getAllQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  saveAllQuestions,
  mergeQuestions,
  
  // Quizzes
  getAllQuizzes,
  getQuizById,
  getQuizQuestions,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  saveAllQuizzes,
  
  // Lobbies
  getAllLobbies,
  getLobbyById,
  getLobbyParticipants,
  createLobby,
  joinLobby,
  leaveLobby,
  startLobby,
  updateLobbyQuestionIndex,
  finishLobby,
  resetLobby,
  archiveLobby,
  deleteLobby,
  
  // Lobby Answers
  autoSaveAnswer,
  submitAnswer,
  markTimeExpired,
  validateAnswer,
  markQcmTeamScored,
  getParticipantValidation,
  updateLobbyParticipantTeam
};
