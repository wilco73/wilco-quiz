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
      tags TEXT,
      points INTEGER DEFAULT 1,
      timer INTEGER DEFAULT 0,
      media TEXT,
      media_type TEXT,
      choices TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
  
  // Migration: ajouter la colonne tags si elle n'existe pas
  try {
    db.run(`ALTER TABLE questions ADD COLUMN tags TEXT`);
  } catch (e) {
    // Colonne existe déjà
  }

  db.run(`
    -- Table des quiz
    CREATE TABLE IF NOT EXISTS quizzes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      group_name TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
  
  // Migration: ajouter la colonne group_name si elle n'existe pas
  try {
    db.run(`ALTER TABLE quizzes ADD COLUMN group_name TEXT`);
  } catch (e) {
    // Colonne existe déjà
  }

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
      has_pasted INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (lobby_id) REFERENCES lobbies(id) ON DELETE CASCADE,
      FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
      UNIQUE(lobby_id, participant_id, question_id)
    )
  `);
  
  // Migration: ajouter la colonne has_pasted si elle n'existe pas
  try {
    db.run(`ALTER TABLE lobby_answers ADD COLUMN has_pasted INTEGER DEFAULT 0`);
  } catch (e) {
    // Colonne existe déjà
  }

  // ==================== TABLES JEUX DE DESSIN ====================
  
  // Banque de mots/thèmes pour Pictionary
  db.run(`
    CREATE TABLE IF NOT EXISTS drawing_words (
      id TEXT PRIMARY KEY,
      word TEXT NOT NULL,
      category TEXT,
      difficulty TEXT DEFAULT 'moyen',
      tags TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
  
  // Banque d'images de référence pour Téléphone Arabe
  db.run(`
    CREATE TABLE IF NOT EXISTS drawing_references (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      image_url TEXT NOT NULL,
      category TEXT,
      tags TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
  
  // Configuration des parties de dessin (type de jeu)
  db.run(`
    CREATE TABLE IF NOT EXISTS drawing_games (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      game_type TEXT NOT NULL,
      config TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
    )
  `);
  
  // Mots personnalisés pour une partie spécifique
  db.run(`
    CREATE TABLE IF NOT EXISTS drawing_game_words (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      game_id TEXT NOT NULL,
      word_id TEXT,
      custom_word TEXT,
      proposed_by TEXT,
      approved INTEGER DEFAULT 1,
      FOREIGN KEY (game_id) REFERENCES drawing_games(id) ON DELETE CASCADE
    )
  `);
  
  // Lobbies de dessin (étend le concept de lobby)
  db.run(`
    CREATE TABLE IF NOT EXISTS drawing_lobbies (
      id TEXT PRIMARY KEY,
      game_id TEXT,
      status TEXT DEFAULT 'waiting',
      current_round INTEGER DEFAULT 0,
      current_drawer_index INTEGER DEFAULT 0,
      current_word TEXT,
      round_start_time INTEGER,
      drawer_rotation_order TEXT,
      config TEXT,
      creator_id TEXT,
      creator_type TEXT DEFAULT 'admin',
      custom_words TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (game_id) REFERENCES drawing_games(id)
    )
  `);
  
  // Migration: ajouter les nouvelles colonnes si elles n'existent pas
  db.run(`ALTER TABLE drawing_lobbies ADD COLUMN creator_id TEXT`, [], () => {});
  db.run(`ALTER TABLE drawing_lobbies ADD COLUMN creator_type TEXT DEFAULT 'admin'`, [], () => {});
  db.run(`ALTER TABLE drawing_lobbies ADD COLUMN custom_words TEXT`, [], () => {});
  
  // Participants dans un lobby de dessin
  db.run(`
    CREATE TABLE IF NOT EXISTS drawing_lobby_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lobby_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      team_name TEXT,
      is_drawing INTEGER DEFAULT 0,
      FOREIGN KEY (lobby_id) REFERENCES drawing_lobbies(id) ON DELETE CASCADE,
      FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
      UNIQUE(lobby_id, participant_id)
    )
  `);
  
  // Dessins sauvegardés (canvas final de chaque round)
  db.run(`
    CREATE TABLE IF NOT EXISTS drawings (
      id TEXT PRIMARY KEY,
      lobby_id TEXT NOT NULL,
      round INTEGER NOT NULL,
      team_id TEXT,
      image_data TEXT,
      word_or_reference TEXT,
      source_drawing_id TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (lobby_id) REFERENCES drawing_lobbies(id) ON DELETE CASCADE
    )
  `);
  
  // Scores des jeux de dessin
  db.run(`
    CREATE TABLE IF NOT EXISTS drawing_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lobby_id TEXT NOT NULL,
      team_name TEXT NOT NULL,
      round INTEGER,
      points INTEGER DEFAULT 0,
      reason TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
      FOREIGN KEY (lobby_id) REFERENCES drawing_lobbies(id) ON DELETE CASCADE
    )
  `);

  // Index pour améliorer les performances
  db.run(`CREATE INDEX IF NOT EXISTS idx_participants_team ON participants(team_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_lobby_participants_lobby ON lobby_participants(lobby_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_lobby_answers_lobby ON lobby_answers(lobby_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_drawing_words_category ON drawing_words(category)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_drawing_references_category ON drawing_references(category)`);
  
  // Migration: Corriger la table drawing_lobbies si game_id est NOT NULL
  migrateDrawingLobbies();
}

/**
 * Migration pour rendre game_id nullable dans drawing_lobbies
 */
function migrateDrawingLobbies() {
  try {
    // Vérifier si la migration est nécessaire en essayant d'insérer un NULL
    // Si ça échoue, on fait la migration
    const testId = '_migration_test_' + Date.now();
    try {
      db.run(`INSERT INTO drawing_lobbies (id, game_id, status) VALUES (?, NULL, 'test')`, [testId]);
      // Ça a marché, supprimer la ligne de test
      db.run(`DELETE FROM drawing_lobbies WHERE id = ?`, [testId]);
      console.log('[OK] Table drawing_lobbies OK (game_id nullable)');
    } catch (e) {
      if (e.message && e.message.includes('NOT NULL constraint failed')) {
        console.log('[MIGRATION] Mise à jour de drawing_lobbies pour rendre game_id nullable...');
        
        // Sauvegarder les données existantes
        const existingData = [];
        try {
          const stmt = db.prepare('SELECT * FROM drawing_lobbies');
          while (stmt.step()) {
            existingData.push(stmt.getAsObject());
          }
          stmt.free();
        } catch (err) {
          // Table vide ou inexistante
        }
        
        // Sauvegarder les participants
        const existingParticipants = [];
        try {
          const stmt2 = db.prepare('SELECT * FROM drawing_lobby_participants');
          while (stmt2.step()) {
            existingParticipants.push(stmt2.getAsObject());
          }
          stmt2.free();
        } catch (err) {
          // Table vide ou inexistante
        }
        
        // Supprimer les tables liées (dans l'ordre des dépendances)
        db.run('DROP TABLE IF EXISTS drawing_scores');
        db.run('DROP TABLE IF EXISTS drawings');
        db.run('DROP TABLE IF EXISTS drawing_lobby_participants');
        db.run('DROP TABLE IF EXISTS drawing_lobbies');
        
        // Recréer la table avec game_id nullable
        db.run(`
          CREATE TABLE drawing_lobbies (
            id TEXT PRIMARY KEY,
            game_id TEXT,
            status TEXT DEFAULT 'waiting',
            current_round INTEGER DEFAULT 0,
            current_drawer_index INTEGER DEFAULT 0,
            current_word TEXT,
            round_start_time INTEGER,
            drawer_rotation_order TEXT,
            config TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
            FOREIGN KEY (game_id) REFERENCES drawing_games(id)
          )
        `);
        
        // Recréer drawing_lobby_participants
        db.run(`
          CREATE TABLE drawing_lobby_participants (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lobby_id TEXT NOT NULL,
            participant_id TEXT NOT NULL,
            team_name TEXT,
            is_drawing INTEGER DEFAULT 0,
            FOREIGN KEY (lobby_id) REFERENCES drawing_lobbies(id) ON DELETE CASCADE,
            FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
            UNIQUE(lobby_id, participant_id)
          )
        `);
        
        // Recréer drawings
        db.run(`
          CREATE TABLE drawings (
            id TEXT PRIMARY KEY,
            lobby_id TEXT NOT NULL,
            round INTEGER NOT NULL,
            team_id TEXT,
            image_data TEXT,
            word_or_reference TEXT,
            source_drawing_id TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
            FOREIGN KEY (lobby_id) REFERENCES drawing_lobbies(id) ON DELETE CASCADE
          )
        `);
        
        // Recréer drawing_scores
        db.run(`
          CREATE TABLE drawing_scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lobby_id TEXT NOT NULL,
            team_name TEXT NOT NULL,
            round INTEGER,
            points INTEGER DEFAULT 0,
            reason TEXT,
            created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
            FOREIGN KEY (lobby_id) REFERENCES drawing_lobbies(id) ON DELETE CASCADE
          )
        `);
        
        // Restaurer les données si il y en avait
        for (const lobby of existingData) {
          db.run(`
            INSERT INTO drawing_lobbies (id, game_id, status, current_round, current_drawer_index, current_word, round_start_time, drawer_rotation_order, config, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [lobby.id, lobby.game_id, lobby.status, lobby.current_round, lobby.current_drawer_index, lobby.current_word, lobby.round_start_time, lobby.drawer_rotation_order, lobby.config, lobby.created_at]);
        }
        
        for (const participant of existingParticipants) {
          db.run(`
            INSERT INTO drawing_lobby_participants (lobby_id, participant_id, team_name, is_drawing)
            VALUES (?, ?, ?, ?)
          `, [participant.lobby_id, participant.participant_id, participant.team_name, participant.is_drawing]);
        }
        
        saveDatabase();
        console.log('[OK] Migration drawing_lobbies terminee');
      }
    }
  } catch (e) {
    console.error('[ERREUR] Migration drawing_lobbies:', e.message);
  }
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
    SELECT id, text, answer, type, category, tags, points, timer, media, media_type as mediaType, choices, created_at as createdAt
    FROM questions
    ORDER BY created_at DESC
  `);
  
  return questions.map(q => ({
    ...q,
    choices: q.choices ? JSON.parse(q.choices) : null,
    tags: q.tags ? JSON.parse(q.tags) : []
  }));
}

function getQuestionById(id) {
  const q = queryOne(`
    SELECT id, text, answer, type, category, tags, points, timer, media, media_type as mediaType, choices, created_at as createdAt
    FROM questions WHERE id = ?
  `, [id]);
  
  if (q) {
    if (q.choices) q.choices = JSON.parse(q.choices);
    q.tags = q.tags ? JSON.parse(q.tags) : [];
  }
  return q;
}

function createQuestion(question) {
  const id = question.id || `q${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const choices = question.choices ? JSON.stringify(question.choices) : null;
  const tags = question.tags && question.tags.length > 0 ? JSON.stringify(question.tags) : null;
  
  run(`
    INSERT INTO questions (id, text, answer, type, category, tags, points, timer, media, media_type, choices)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    id,
    question.text,
    question.answer,
    question.type || 'text',
    question.category || null,
    tags,
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
  const tags = question.tags && question.tags.length > 0 ? JSON.stringify(question.tags) : null;
  
  run(`
    UPDATE questions 
    SET text = ?, answer = ?, type = ?, category = ?, tags = ?, points = ?, timer = ?, media = ?, media_type = ?, choices = ?
    WHERE id = ?
  `, [
    question.text,
    question.answer,
    question.type || 'text',
    question.category || null,
    tags,
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
    const tags = q.tags && q.tags.length > 0 ? JSON.stringify(q.tags) : null;
    run(`
      INSERT INTO questions (id, text, answer, type, category, tags, points, timer, media, media_type, choices)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      q.id,
      q.text,
      q.answer,
      q.type || 'text',
      q.category || null,
      tags,
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
    SELECT id, title, description, group_name as groupName, created_at as createdAt
    FROM quizzes
    ORDER BY group_name ASC, created_at DESC
  `);
  
  return quizzes.map(quiz => ({
    ...quiz,
    questions: getQuizQuestions(quiz.id)
  }));
}

function getQuizById(id) {
  const quiz = queryOne(`
    SELECT id, title, description, group_name as groupName, created_at as createdAt
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
  
  run('INSERT INTO quizzes (id, title, description, group_name) VALUES (?, ?, ?, ?)',
    [id, quiz.title, quiz.description || null, quiz.groupName || null]);
  
  if (quiz.questions && quiz.questions.length > 0) {
    setQuizQuestions(id, quiz.questions);
  }
  
  return getQuizById(id);
}

function updateQuiz(id, quiz) {
  run('UPDATE quizzes SET title = ?, description = ?, group_name = ? WHERE id = ?',
    [quiz.title, quiz.description || null, quiz.groupName || null, id]);
  
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
      SELECT question_id, answer, validation, qcm_team_scored, has_pasted
      FROM lobby_answers
      WHERE lobby_id = ? AND participant_id = ?
    `, [lobbyId, p.participantId]);
    
    const answersByQuestionId = {};
    const validationsByQuestionId = {};
    const qcmTeamScored = {};
    const pastedByQuestionId = {};
    
    answers.forEach(a => {
      if (a.answer !== null) answersByQuestionId[a.question_id] = a.answer;
      if (a.validation !== null) validationsByQuestionId[a.question_id] = a.validation === 1;
      if (a.qcm_team_scored) qcmTeamScored[a.question_id] = true;
      if (a.has_pasted) pastedByQuestionId[a.question_id] = true;
    });
    
    return {
      ...p,
      hasAnswered: p.hasAnswered === 1,
      answersByQuestionId,
      validationsByQuestionId,
      qcmTeamScored,
      pastedByQuestionId
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

function markAnswerPasted(lobbyId, participantId, questionId) {
  // Vérifier si une réponse existe déjà
  const existing = queryOne(`
    SELECT id FROM lobby_answers WHERE lobby_id = ? AND participant_id = ? AND question_id = ?
  `, [lobbyId, participantId, questionId]);
  
  if (existing) {
    run(`UPDATE lobby_answers SET has_pasted = 1 WHERE id = ?`, [existing.id]);
  } else {
    run(`
      INSERT INTO lobby_answers (lobby_id, participant_id, question_id, has_pasted)
      VALUES (?, ?, ?, 1)
    `, [lobbyId, participantId, questionId]);
  }
}

function getParticipantValidation(lobbyId, participantId, questionId) {
  return queryOne(`
    SELECT validation, qcm_team_scored, has_pasted as hasPasted FROM lobby_answers
    WHERE lobby_id = ? AND participant_id = ? AND question_id = ?
  `, [lobbyId, participantId, questionId]);
}

function updateLobbyParticipantTeam(lobbyId, participantId, teamName) {
  const normalizedTeamName = normalizeTeamName(teamName);
  run(`
    UPDATE lobby_participants SET team_name = ? WHERE lobby_id = ? AND participant_id = ?
  `, [normalizedTeamName, lobbyId, participantId]);
}

// ==================== DRAWING WORDS (Banque de mots Pictionary) ====================

function getAllDrawingWords() {
  return query(`
    SELECT id, word, category, difficulty, tags, created_at as createdAt
    FROM drawing_words
    ORDER BY category ASC, word ASC
  `).map(w => ({
    ...w,
    tags: w.tags ? JSON.parse(w.tags) : []
  }));
}

function getDrawingWordById(id) {
  const word = queryOne(`
    SELECT id, word, category, difficulty, tags, created_at as createdAt
    FROM drawing_words WHERE id = ?
  `, [id]);
  
  if (word) {
    word.tags = word.tags ? JSON.parse(word.tags) : [];
  }
  return word;
}

function createDrawingWord(wordData) {
  const id = wordData.id || Date.now().toString();
  run(`
    INSERT INTO drawing_words (id, word, category, difficulty, tags)
    VALUES (?, ?, ?, ?, ?)
  `, [
    id,
    wordData.word,
    wordData.category || null,
    wordData.difficulty || 'moyen',
    wordData.tags ? JSON.stringify(wordData.tags) : null
  ]);
  return getDrawingWordById(id);
}

function updateDrawingWord(id, wordData) {
  run(`
    UPDATE drawing_words 
    SET word = ?, category = ?, difficulty = ?, tags = ?
    WHERE id = ?
  `, [
    wordData.word,
    wordData.category || null,
    wordData.difficulty || 'moyen',
    wordData.tags ? JSON.stringify(wordData.tags) : null,
    id
  ]);
  return getDrawingWordById(id);
}

function deleteDrawingWord(id) {
  run(`DELETE FROM drawing_words WHERE id = ?`, [id]);
}

function getRandomDrawingWords(count, category = null, difficulty = null) {
  let sql = `SELECT id, word, category, difficulty, tags FROM drawing_words WHERE 1=1`;
  const params = [];
  
  if (category) {
    sql += ` AND category = ?`;
    params.push(category);
  }
  if (difficulty) {
    sql += ` AND difficulty = ?`;
    params.push(difficulty);
  }
  
  sql += ` ORDER BY RANDOM() LIMIT ?`;
  params.push(count);
  
  return query(sql, params).map(w => ({
    ...w,
    tags: w.tags ? JSON.parse(w.tags) : []
  }));
}

// ==================== DRAWING REFERENCES (Images de référence Téléphone Arabe) ====================

function getAllDrawingReferences() {
  return query(`
    SELECT id, name, image_url as imageUrl, category, tags, created_at as createdAt
    FROM drawing_references
    ORDER BY category ASC, name ASC
  `).map(r => ({
    ...r,
    tags: r.tags ? JSON.parse(r.tags) : []
  }));
}

function getDrawingReferenceById(id) {
  const ref = queryOne(`
    SELECT id, name, image_url as imageUrl, category, tags, created_at as createdAt
    FROM drawing_references WHERE id = ?
  `, [id]);
  
  if (ref) {
    ref.tags = ref.tags ? JSON.parse(ref.tags) : [];
  }
  return ref;
}

function createDrawingReference(refData) {
  const id = refData.id || Date.now().toString();
  run(`
    INSERT INTO drawing_references (id, name, image_url, category, tags)
    VALUES (?, ?, ?, ?, ?)
  `, [
    id,
    refData.name,
    refData.imageUrl,
    refData.category || null,
    refData.tags ? JSON.stringify(refData.tags) : null
  ]);
  return getDrawingReferenceById(id);
}

function updateDrawingReference(id, refData) {
  run(`
    UPDATE drawing_references 
    SET name = ?, image_url = ?, category = ?, tags = ?
    WHERE id = ?
  `, [
    refData.name,
    refData.imageUrl,
    refData.category || null,
    refData.tags ? JSON.stringify(refData.tags) : null,
    id
  ]);
  return getDrawingReferenceById(id);
}

function deleteDrawingReference(id) {
  run(`DELETE FROM drawing_references WHERE id = ?`, [id]);
}

function getRandomDrawingReferences(count, category = null) {
  let sql = `SELECT id, name, image_url as imageUrl, category, tags FROM drawing_references WHERE 1=1`;
  const params = [];
  
  if (category) {
    sql += ` AND category = ?`;
    params.push(category);
  }
  
  sql += ` ORDER BY RANDOM() LIMIT ?`;
  params.push(count);
  
  return query(sql, params).map(r => ({
    ...r,
    tags: r.tags ? JSON.parse(r.tags) : []
  }));
}

// ==================== DRAWING GAMES (Configuration des jeux) ====================

function getAllDrawingGames() {
  return query(`
    SELECT id, title, game_type as gameType, config, created_at as createdAt
    FROM drawing_games
    ORDER BY created_at DESC
  `).map(g => ({
    ...g,
    config: g.config ? JSON.parse(g.config) : {}
  }));
}

function getDrawingGameById(id) {
  const game = queryOne(`
    SELECT id, title, game_type as gameType, config, created_at as createdAt
    FROM drawing_games WHERE id = ?
  `, [id]);
  
  if (game) {
    game.config = game.config ? JSON.parse(game.config) : {};
  }
  return game;
}

function createDrawingGame(gameData) {
  const id = gameData.id || Date.now().toString();
  run(`
    INSERT INTO drawing_games (id, title, game_type, config)
    VALUES (?, ?, ?, ?)
  `, [
    id,
    gameData.title,
    gameData.gameType,
    JSON.stringify(gameData.config || {})
  ]);
  return getDrawingGameById(id);
}

function updateDrawingGame(id, gameData) {
  run(`
    UPDATE drawing_games 
    SET title = ?, game_type = ?, config = ?
    WHERE id = ?
  `, [
    gameData.title,
    gameData.gameType,
    JSON.stringify(gameData.config || {}),
    id
  ]);
  return getDrawingGameById(id);
}

function deleteDrawingGame(id) {
  run(`DELETE FROM drawing_games WHERE id = ?`, [id]);
}

// ==================== DRAWING LOBBIES ====================

function getAllDrawingLobbies() {
  const lobbies = query(`
    SELECT dl.*, dg.title as game_title, dg.game_type
    FROM drawing_lobbies dl
    LEFT JOIN drawing_games dg ON dl.game_id = dg.id
    ORDER BY dl.created_at DESC
  `);
  
  return lobbies.map(lobby => ({
    ...lobby,
    config: lobby.config ? JSON.parse(lobby.config) : null,
    drawer_rotation_order: lobby.drawer_rotation_order ? JSON.parse(lobby.drawer_rotation_order) : null,
    participants: getDrawingLobbyParticipants(lobby.id)
  }));
}

function getDrawingLobbyById(id) {
  const lobby = queryOne(`
    SELECT dl.*, dg.title as game_title, dg.game_type
    FROM drawing_lobbies dl
    LEFT JOIN drawing_games dg ON dl.game_id = dg.id
    WHERE dl.id = ?
  `, [id]);
  
  if (!lobby) return null;
  
  return {
    ...lobby,
    config: lobby.config ? JSON.parse(lobby.config) : null,
    drawer_rotation_order: lobby.drawer_rotation_order ? JSON.parse(lobby.drawer_rotation_order) : null,
    custom_words: lobby.custom_words ? JSON.parse(lobby.custom_words) : [],
    participants: getDrawingLobbyParticipants(lobby.id)
  };
}

function createDrawingLobby(data) {
  const id = data.id || `drawing-lobby-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  run(`
    INSERT INTO drawing_lobbies (id, game_id, status, config, creator_id, creator_type, custom_words)
    VALUES (?, ?, 'waiting', ?, ?, ?, ?)
  `, [
    id, 
    data.game_id || null, 
    JSON.stringify(data.config || {}),
    data.creator_id || null,
    data.creator_type || 'admin',
    JSON.stringify(data.custom_words || [])
  ]);
  
  saveDatabase();
  return getDrawingLobbyById(id);
}

function getDrawingLobbyParticipants(lobbyId) {
  return query(`
    SELECT dlp.*, p.pseudo, p.avatar
    FROM drawing_lobby_participants dlp
    JOIN participants p ON dlp.participant_id = p.id
    WHERE dlp.lobby_id = ?
  `, [lobbyId]);
}

function joinDrawingLobby(lobbyId, participantId, teamName) {
  // Vérifier si déjà présent
  const existing = queryOne(`
    SELECT * FROM drawing_lobby_participants 
    WHERE lobby_id = ? AND participant_id = ?
  `, [lobbyId, participantId]);
  
  if (existing) {
    // Mettre à jour l'équipe si changée
    run(`UPDATE drawing_lobby_participants SET team_name = ? WHERE lobby_id = ? AND participant_id = ?`,
      [teamName, lobbyId, participantId]);
  } else {
    run(`
      INSERT INTO drawing_lobby_participants (lobby_id, participant_id, team_name)
      VALUES (?, ?, ?)
    `, [lobbyId, participantId, teamName]);
  }
  
  saveDatabase();
  return getDrawingLobbyById(lobbyId);
}

function leaveDrawingLobby(lobbyId, participantId) {
  run(`DELETE FROM drawing_lobby_participants WHERE lobby_id = ? AND participant_id = ?`,
    [lobbyId, participantId]);
  saveDatabase();
  return getDrawingLobbyById(lobbyId);
}

function startDrawingLobby(lobbyId, gameState) {
  run(`
    UPDATE drawing_lobbies 
    SET status = 'playing',
        current_round = ?,
        current_word = ?,
        current_drawer_index = ?,
        drawer_rotation_order = ?,
        round_start_time = ?,
        config = ?
    WHERE id = ?
  `, [
    gameState.currentRound || 0,
    gameState.currentWord || '',
    gameState.currentDrawerIndex || 0,
    JSON.stringify(gameState.drawerRotationOrder || []),
    Date.now(),
    JSON.stringify(gameState.config || {}),
    lobbyId
  ]);
  
  saveDatabase();
  return getDrawingLobbyById(lobbyId);
}

function updateDrawingLobbyCustomWords(lobbyId, customWords) {
  run(`UPDATE drawing_lobbies SET custom_words = ? WHERE id = ?`, 
    [JSON.stringify(customWords), lobbyId]);
  saveDatabase();
  return getDrawingLobbyById(lobbyId);
}

function updateDrawingLobbyState(lobbyId, updates) {
  const setClauses = [];
  const values = [];
  
  if (updates.status !== undefined) {
    setClauses.push('status = ?');
    values.push(updates.status);
  }
  if (updates.currentRound !== undefined) {
    setClauses.push('current_round = ?');
    values.push(updates.currentRound);
  }
  if (updates.currentWord !== undefined) {
    setClauses.push('current_word = ?');
    values.push(updates.currentWord);
  }
  if (updates.currentDrawerIndex !== undefined) {
    setClauses.push('current_drawer_index = ?');
    values.push(updates.currentDrawerIndex);
  }
  if (updates.roundStartTime !== undefined) {
    setClauses.push('round_start_time = ?');
    values.push(updates.roundStartTime);
  }
  
  if (setClauses.length > 0) {
    values.push(lobbyId);
    run(`UPDATE drawing_lobbies SET ${setClauses.join(', ')} WHERE id = ?`, values);
    saveDatabase();
  }
  
  return getDrawingLobbyById(lobbyId);
}

function finishDrawingLobby(lobbyId) {
  run(`UPDATE drawing_lobbies SET status = 'finished' WHERE id = ?`, [lobbyId]);
  saveDatabase();
  return getDrawingLobbyById(lobbyId);
}

function deleteDrawingLobby(id) {
  run(`DELETE FROM drawing_lobby_participants WHERE lobby_id = ?`, [id]);
  run(`DELETE FROM drawing_scores WHERE lobby_id = ?`, [id]);
  run(`DELETE FROM drawings WHERE lobby_id = ?`, [id]);
  run(`DELETE FROM drawing_lobbies WHERE id = ?`, [id]);
  saveDatabase();
}

function addDrawingScore(lobbyId, teamName, points, reason, round) {
  run(`
    INSERT INTO drawing_scores (lobby_id, team_name, points, reason, round)
    VALUES (?, ?, ?, ?, ?)
  `, [lobbyId, teamName, points, reason, round]);
  saveDatabase();
}

// ==================== DRAWINGS (Sauvegarde des dessins) ====================

function saveDrawing(lobbyId, round, teamName, word, imageData) {
  const id = `drawing-${lobbyId}-${round}-${Date.now()}`;
  run(`
    INSERT INTO drawings (id, lobby_id, round, team_id, word_or_reference, image_data)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [id, lobbyId, round, teamName, word, imageData]);
  saveDatabase();
  return id;
}

function getDrawingsByLobby(lobbyId) {
  return query(`
    SELECT id, lobby_id, round, team_id as team_name, word_or_reference as word, image_data, created_at
    FROM drawings
    WHERE lobby_id = ?
    ORDER BY round ASC
  `, [lobbyId]);
}

function getDrawingById(id) {
  return queryOne(`
    SELECT id, lobby_id, round, team_id as team_name, word_or_reference as word, image_data, created_at
    FROM drawings
    WHERE id = ?
  `, [id]);
}

function getDrawingScoresByLobby(lobbyId) {
  return query(`
    SELECT team_name, SUM(points) as total_points, 
           GROUP_CONCAT(round || ':' || points || ':' || reason) as details
    FROM drawing_scores
    WHERE lobby_id = ?
    GROUP BY team_name
    ORDER BY total_points DESC
  `, [lobbyId]);
}

function archiveDrawingLobby(lobbyId) {
  run(`UPDATE drawing_lobbies SET status = 'archived' WHERE id = ?`, [lobbyId]);
  saveDatabase();
  return getDrawingLobbyById(lobbyId);
}

function getDrawingLobbyResults(lobbyId) {
  const lobby = getDrawingLobbyById(lobbyId);
  if (!lobby) return null;
  
  const drawings = getDrawingsByLobby(lobbyId);
  const scores = getDrawingScoresByLobby(lobbyId);
  
  // Calculer le classement
  const ranking = scores.map((s, idx) => ({
    rank: idx + 1,
    team: s.team_name,
    score: s.total_points || 0
  }));
  
  return {
    lobby,
    drawings,
    scores,
    ranking
  };
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
  markAnswerPasted,
  getParticipantValidation,
  updateLobbyParticipantTeam,
  
  // Drawing Words (Pictionary)
  getAllDrawingWords,
  getDrawingWordById,
  createDrawingWord,
  updateDrawingWord,
  deleteDrawingWord,
  getRandomDrawingWords,
  
  // Drawing References (Téléphone Arabe)
  getAllDrawingReferences,
  getDrawingReferenceById,
  createDrawingReference,
  updateDrawingReference,
  deleteDrawingReference,
  getRandomDrawingReferences,
  
  // Drawing Games
  getAllDrawingGames,
  getDrawingGameById,
  createDrawingGame,
  updateDrawingGame,
  deleteDrawingGame,
  
  // Drawing Lobbies (Pictionary/Téléphone)
  getAllDrawingLobbies,
  getDrawingLobbyById,
  createDrawingLobby,
  joinDrawingLobby,
  leaveDrawingLobby,
  startDrawingLobby,
  updateDrawingLobbyState,
  updateDrawingLobbyCustomWords,
  finishDrawingLobby,
  deleteDrawingLobby,
  getDrawingLobbyParticipants,
  addDrawingScore,
  archiveDrawingLobby,
  getDrawingLobbyResults,
  
  // Drawings (Dessins sauvegardés)
  saveDrawing,
  getDrawingsByLobby,
  getDrawingById,
  getDrawingScoresByLobby
};
