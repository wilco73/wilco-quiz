/**
 * Script de migration JSON vers SQLite
 * Convertit les donnees existantes de db.json vers la base SQLite
 * 
 * Usage: node migrate-to-sqlite.js
 */

const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');
const bcrypt = require('bcryptjs');

const JSON_FILE = path.join(__dirname, 'db.json');
const DB_FILE = path.join(__dirname, 'quiz.db');
const BACKUP_FILE = path.join(__dirname, `db.json.backup-${Date.now()}`);
const SALT_ROUNDS = 10;

async function migrate() {
  console.log('');
  console.log('================================================================');
  console.log('   MIGRATION JSON vers SQLite');
  console.log('================================================================');
  console.log('');

  // Verifier si le fichier JSON existe
  if (!fs.existsSync(JSON_FILE)) {
    console.log('[INFO] Pas de fichier db.json trouve. Rien a migrer.');
    console.log('   La base SQLite sera creee au premier demarrage du serveur.');
    process.exit(0);
  }

  // Lire les donnees JSON
  console.log('[1/7] Lecture de db.json...');
  let jsonData;
  try {
    jsonData = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    console.log('   [OK] Fichier JSON lu avec succes');
  } catch (error) {
    console.error('   [ERREUR] Erreur de lecture:', error.message);
    process.exit(1);
  }

  // Sauvegarder le fichier JSON original
  console.log(`[2/7] Sauvegarde du fichier JSON...`);
  fs.copyFileSync(JSON_FILE, BACKUP_FILE);
  console.log(`   [OK] Sauvegarde creee: ${path.basename(BACKUP_FILE)}`);

  // Supprimer l'ancienne base SQLite si elle existe
  if (fs.existsSync(DB_FILE)) {
    console.log('[3/7] Suppression de l\'ancienne base SQLite...');
    fs.unlinkSync(DB_FILE);
    console.log('   [OK] Ancienne base supprimee');
  } else {
    console.log('[3/7] Pas d\'ancienne base a supprimer');
  }

  // Initialiser sql.js
  console.log('[4/7] Initialisation de SQLite...');
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // Creer les tables
  console.log('[5/7] Creation des tables...');
  
  db.run(`CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    validated_score INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    pseudo TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    team_id INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS questions (
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
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS quizzes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS quiz_questions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quiz_id TEXT NOT NULL,
    question_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE(quiz_id, question_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS lobbies (
    id TEXT PRIMARY KEY,
    quiz_id TEXT NOT NULL,
    status TEXT DEFAULT 'waiting',
    current_question_index INTEGER DEFAULT 0,
    shuffled INTEGER DEFAULT 0,
    shuffled_questions TEXT,
    start_time INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS lobby_participants (
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
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS lobby_answers (
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
  )`);

  // Index
  db.run(`CREATE INDEX IF NOT EXISTS idx_participants_team ON participants(team_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_lobby_participants_lobby ON lobby_participants(lobby_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_lobby_answers_lobby ON lobby_answers(lobby_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id)`);
  
  console.log('   [OK] Tables creees');

  // Statistiques de migration
  const stats = { admins: 0, teams: 0, participants: 0, questions: 0, quizzes: 0, lobbies: 0 };
  const teamIdMap = new Map();

  // Migration des donnees
  console.log('[6/7] Migration des donnees...');

  // Admins
  if (jsonData.admins && jsonData.admins.length > 0) {
    for (const admin of jsonData.admins) {
      const passwordHash = bcrypt.hashSync(admin.password, SALT_ROUNDS);
      try {
        db.run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [admin.username, passwordHash]);
        stats.admins++;
      } catch (e) { }
    }
    console.log(`   [OK] ${stats.admins} admin(s) migre(s)`);
  } else {
    const passwordHash = bcrypt.hashSync('admin123', SALT_ROUNDS);
    db.run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', ['admin', passwordHash]);
    stats.admins = 1;
    console.log('   [OK] Admin par defaut cree: admin / admin123');
  }

  // Equipes
  if (jsonData.teams && jsonData.teams.length > 0) {
    for (const team of jsonData.teams) {
      db.run('INSERT INTO teams (name, validated_score, created_at) VALUES (?, ?, ?)',
        [team.name, team.validatedScore || 0, team.createdAt || Date.now()]);
      
      // Recuperer l'ID genere
      const result = db.exec("SELECT last_insert_rowid() as id");
      const newId = result[0].values[0][0];
      teamIdMap.set(team.id, newId);
      teamIdMap.set(team.name.toLowerCase(), newId);
      stats.teams++;
    }
    console.log(`   [OK] ${stats.teams} equipe(s) migree(s)`);
  }

  // Questions
  if (jsonData.questions && jsonData.questions.length > 0) {
    for (const q of jsonData.questions) {
      const choices = q.choices ? JSON.stringify(q.choices) : null;
      db.run(`INSERT INTO questions (id, text, answer, type, category, points, timer, media, media_type, choices, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [q.id, q.text, q.answer, q.type || 'text', q.category || null, q.points || 1,
         q.timer || 0, q.media || null, q.mediaType || null, choices, q.createdAt || Date.now()]);
      stats.questions++;
    }
    console.log(`   [OK] ${stats.questions} question(s) migree(s)`);
  }

  // Participants
  if (jsonData.participants && jsonData.participants.length > 0) {
    for (const p of jsonData.participants) {
      const passwordHash = bcrypt.hashSync(p.password, SALT_ROUNDS);
      let teamId = null;
      if (p.teamName) {
        teamId = teamIdMap.get(p.teamName.toLowerCase()) || null;
      } else if (p.teamId) {
        teamId = teamIdMap.get(p.teamId) || null;
      }
      
      try {
        db.run('INSERT INTO participants (id, pseudo, password_hash, team_id, created_at) VALUES (?, ?, ?, ?, ?)',
          [p.id, p.pseudo, passwordHash, teamId, p.createdAt || Date.now()]);
        stats.participants++;
      } catch (e) { }
    }
    console.log(`   [OK] ${stats.participants} participant(s) migre(s)`);
  }

  // Quiz
  if (jsonData.quizzes && jsonData.quizzes.length > 0) {
    for (const quiz of jsonData.quizzes) {
      db.run('INSERT INTO quizzes (id, title, description, created_at) VALUES (?, ?, ?, ?)',
        [quiz.id, quiz.title, quiz.description || null, quiz.createdAt || Date.now()]);
      
      if (quiz.questions && quiz.questions.length > 0) {
        quiz.questions.forEach((q, index) => {
          try {
            db.run('INSERT INTO quiz_questions (quiz_id, question_id, position) VALUES (?, ?, ?)',
              [quiz.id, q.id, index]);
          } catch (e) { }
        });
      }
      stats.quizzes++;
    }
    console.log(`   [OK] ${stats.quizzes} quiz migre(s)`);
  }

  // Lobbies (seulement ceux en cours)
  if (jsonData.lobbies && jsonData.lobbies.length > 0) {
    for (const lobby of jsonData.lobbies) {
      const shuffledQuestions = lobby.shuffledQuestions ? JSON.stringify(lobby.shuffledQuestions) : null;
      const currentQuestionIndex = lobby.session?.currentQuestionIndex || 0;
      const startTime = lobby.session?.startTime || null;
      
      try {
        db.run(`INSERT INTO lobbies (id, quiz_id, status, current_question_index, shuffled, shuffled_questions, start_time, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [lobby.id, lobby.quizId, lobby.status || 'waiting', currentQuestionIndex,
           lobby.shuffled ? 1 : 0, shuffledQuestions, startTime, lobby.createdAt || Date.now()]);
        
        // Participants du lobby
        if (lobby.participants) {
          for (const lp of lobby.participants) {
            try {
              db.run(`INSERT INTO lobby_participants (lobby_id, participant_id, team_name, has_answered, current_answer, draft_answer)
                      VALUES (?, ?, ?, ?, ?, ?)`,
                [lobby.id, lp.participantId, lp.teamName || '', lp.hasAnswered ? 1 : 0,
                 lp.currentAnswer || '', lp.draftAnswer || '']);
              
              // Reponses
              if (lp.answersByQuestionId) {
                for (const [questionId, answer] of Object.entries(lp.answersByQuestionId)) {
                  const validation = lp.validationsByQuestionId?.[questionId];
                  const qcmScored = lp.qcmTeamScored?.[questionId] ? 1 : 0;
                  
                  db.run(`INSERT INTO lobby_answers (lobby_id, participant_id, question_id, answer, validation, qcm_team_scored)
                          VALUES (?, ?, ?, ?, ?, ?)`,
                    [lobby.id, lp.participantId, questionId, answer,
                     validation === true ? 1 : validation === false ? 0 : null, qcmScored]);
                }
              }
            } catch (e) { }
          }
        }
        stats.lobbies++;
      } catch (e) { }
    }
    console.log(`   [OK] ${stats.lobbies} lobby(s) migre(s)`);
  }

  // Sauvegarder la base
  console.log('[7/7] Sauvegarde de la base SQLite...');
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
  db.close();
  console.log('   [OK] Base SQLite sauvegardee');

  // Resume
  console.log('');
  console.log('================================================================');
  console.log('   MIGRATION TERMINEE !');
  console.log('================================================================');
  console.log('');
  console.log('Resume de la migration:');
  console.log(`   - Admins:       ${stats.admins}`);
  console.log(`   - Equipes:      ${stats.teams}`);
  console.log(`   - Participants: ${stats.participants}`);
  console.log(`   - Questions:    ${stats.questions}`);
  console.log(`   - Quiz:         ${stats.quizzes}`);
  console.log(`   - Lobbies:      ${stats.lobbies}`);
  console.log('');
  console.log('Fichiers:');
  console.log(`   - Base SQLite:    ${DB_FILE}`);
  console.log(`   - Backup JSON:    ${BACKUP_FILE}`);
  console.log('');
  console.log('IMPORTANT: Tous les mots de passe ont ete hashes avec bcrypt.');
  console.log('   Les utilisateurs peuvent continuer a utiliser leurs mots de passe actuels.');
  console.log('');
  console.log('Vous pouvez maintenant demarrer le serveur avec: npm start');
  console.log('');
}

migrate().catch(err => {
  console.error('[ERREUR] Migration echouee:', err);
  process.exit(1);
});
