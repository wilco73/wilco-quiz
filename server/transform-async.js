/**
 * Script de transformation de server.js pour async/await
 * Ce script modifie le fichier pour être compatible avec database-supabase.js
 */

const fs = require('fs');
const path = require('path');

const inputFile = process.argv[2] || 'server-original.js';
const outputFile = process.argv[3] || 'server.js';

let content = fs.readFileSync(inputFile, 'utf8');

// ============================================================
// 1. Modifier les fonctions helper pour qu'elles soient async
// ============================================================

// getLobbyWithTimer
content = content.replace(
  /function getLobbyWithTimer\(lobby\) \{/g,
  'function getLobbyWithTimer(lobby) {'
);

// broadcastLobbyState
content = content.replace(
  /function broadcastLobbyState\(lobbyId\) \{\n  const lobby = db\.getLobbyById/g,
  'async function broadcastLobbyState(lobbyId) {\n  const lobby = await db.getLobbyById'
);

// broadcastGlobalState
content = content.replace(
  /function broadcastGlobalState\(\) \{\n  const lobbies = db\.getAllLobbies/g,
  'async function broadcastGlobalState() {\n  const lobbies = (await db.getAllLobbies())'
);

// ============================================================
// 2. Ajouter await devant les appels db.*
// ============================================================

// Patterns pour les appels de fonction db.*
const dbCalls = [
  'getLobbyById', 'getQuizById', 'getParticipantById', 'getParticipantByPseudo',
  'getTeamById', 'getTeamByName', 'getQuestionById',
  'getAllLobbies', 'getAllQuizzes', 'getAllQuestions', 'getAllTeams', 'getAllParticipants',
  'getAllDrawingWords', 'getAllDrawingReferences', 'getAllDrawingLobbies', 'getAllDrawingGames',
  'createLobby', 'createQuiz', 'createQuestion', 'createTeam', 'createParticipant',
  'createDrawingWord', 'createDrawingReference', 'createDrawingLobby', 'createDrawingGame',
  'updateQuiz', 'updateQuestion', 'updateParticipantTeam', 'updateParticipantPassword', 'updateParticipantAvatar',
  'updateDrawingWord', 'updateDrawingReference', 'updateDrawingLobbyState', 'updateDrawingLobbyCustomWords',
  'updateLobbyQuestionIndex', 'updateTeamScore',
  'deleteQuiz', 'deleteQuestion', 'deleteLobby', 'deleteTeam', 'deleteParticipant',
  'deleteDrawingWord', 'deleteDrawingReference', 'deleteDrawingLobby', 'deleteDrawingGame',
  'joinLobby', 'leaveLobby', 'startLobby', 'finishLobby', 'resetLobby', 'archiveLobby',
  'joinDrawingLobby', 'leaveDrawingLobby', 'startDrawingLobby', 'finishDrawingLobby',
  'submitAnswer', 'validateAnswer', 'autoSaveAnswer', 'markTimeExpired', 'markAnswerPasted', 'markQcmTeamScored',
  'addTeamScore', 'resetAllTeamScores',
  'saveAllQuestions', 'saveAllQuizzes', 'saveAllTeams', 'saveAllParticipants',
  'mergeQuestions', 'mergeDrawingWords', 'mergeDrawingReferences',
  'verifyAdmin', 'verifyParticipantPassword',
  'getParticipantValidation', 'getDrawingLobbyById', 'getDrawingWordById', 'getDrawingReferenceById',
  'getRandomDrawingWords', 'getRandomDrawingReferences', 'getDrawingLobbyResults',
  'saveDrawing', 'getDrawingsByLobby', 'getDrawingScoresByLobby', 'addDrawingScore'
];

// Ajouter await devant les appels db.xxx(
for (const fn of dbCalls) {
  // Pattern: db.functionName( sans await devant
  const regex = new RegExp(`(?<!await )db\\.${fn}\\(`, 'g');
  content = content.replace(regex, `await db.${fn}(`);
}

// ============================================================
// 3. Convertir les handlers Socket.IO en async
// ============================================================

// socket.on('event', (data) => { -> socket.on('event', async (data) => {
content = content.replace(
  /socket\.on\('([^']+)', \(([^)]*)\) => \{/g,
  "socket.on('$1', async ($2) => {"
);

// socket.on('event', () => { -> socket.on('event', async () => {
content = content.replace(
  /socket\.on\('([^']+)', \(\) => \{/g,
  "socket.on('$1', async () => {"
);

// ============================================================
// 4. Convertir les routes Express en async
// ============================================================

// app.get('/path', (req, res) => { -> app.get('/path', async (req, res) => {
content = content.replace(
  /app\.(get|post|put|delete)\('([^']+)', \(req, res\) => \{/g,
  "app.$1('$2', async (req, res) => {"
);

// ============================================================
// 5. Corriger broadcastGlobalState qui utilise .map avec await
// ============================================================

// Remplacer le pattern complexe de broadcastGlobalState
content = content.replace(
  /async function broadcastGlobalState\(\) \{\n  const lobbies = \(await db\.getAllLobbies\(\)\)\.map\(l => getLobbyWithTimer\(l\)\);\n  const teams = db\.getAllTeams\(\);\n  const participants = db\.getAllParticipants\(\)\.map/g,
  `async function broadcastGlobalState() {
  const allLobbies = await db.getAllLobbies();
  const lobbies = allLobbies.map(l => getLobbyWithTimer(l));
  const teams = await db.getAllTeams();
  const allParticipants = await db.getAllParticipants();
  const participants = allParticipants.map`
);

// ============================================================
// 6. Fix spécifique pour les appels avec .map() après await
// ============================================================

// Fix: (await db.getAllLobbies()).map -> let x = await db.getAllLobbies(); x.map
// Mais c'est déjà géré dans broadcastGlobalState

// Fix emit initial state
content = content.replace(
  /socket\.emit\('global:state', \{\n    lobbies: db\.getAllLobbies\(\)\.map/g,
  `socket.emit('global:state', await (async () => {
    const allLobbies = await db.getAllLobbies();
    const allTeams = await db.getAllTeams();
    const allParticipants = await db.getAllParticipants();
    const allQuizzes = await db.getAllQuizzes();
    const allQuestions = await db.getAllQuestions();
    return {
    lobbies: allLobbies.map`
);

// ============================================================
// 7. Mise à jour de l'en-tête
// ============================================================

content = content.replace(
  /\* Serveur Wilco Quiz v3\.0/g,
  '* Serveur Wilco Quiz v4.0'
);

content = content.replace(
  /\* SQLite pour la persistance des donnees/g,
  '* Supabase (PostgreSQL) pour la persistance des données'
);

// ============================================================
// Écrire le fichier de sortie
// ============================================================

fs.writeFileSync(outputFile, content);
console.log(`✅ Fichier transformé: ${outputFile}`);
console.log(`   Lignes: ${content.split('\n').length}`);
