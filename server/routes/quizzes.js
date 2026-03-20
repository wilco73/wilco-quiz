/**
 * Routes pour les quiz et questions
 */

const express = require('express');
const router = express.Router();
const db = require('../database');
const { getLobbyWithTimer } = require('../utils/helpers');

// Stockage des fonctions de broadcast
let broadcastFunctions = null;

// Initialise avec les fonctions de broadcast
function init(broadcasts) {
  broadcastFunctions = broadcasts;
}

// ==================== QUIZZES ====================

// Liste des quiz
router.get('/quizzes', async (req, res) => {
  res.json(await db.getAllQuizzes());
});

// Créer un quiz
router.post('/quizzes', async (req, res) => {
  const quiz = req.body;
  const created = await db.createQuiz(quiz);
  if (broadcastFunctions?.quizzes) await broadcastFunctions.quizzes();
  res.json({ success: true, quiz: created });
});

// Modifier un quiz
router.put('/quizzes/:id', async (req, res) => {
  const { id } = req.params;
  const quiz = req.body;
  const updated = await db.updateQuiz(id, quiz);
  if (broadcastFunctions?.quizzes) await broadcastFunctions.quizzes();
  res.json({ success: true, quiz: updated });
});

// Supprimer un quiz
router.delete('/quizzes/:id', async (req, res) => {
  const { id } = req.params;
  await db.deleteQuiz(id);
  if (broadcastFunctions?.quizzes) await broadcastFunctions.quizzes();
  res.json({ success: true });
});

// ==================== QUESTIONS ====================

// Liste des questions
router.get('/questions', async (req, res) => {
  res.json(await db.getAllQuestions());
});

// Sauvegarder toutes les questions
router.post('/questions', async (req, res) => {
  const questions = req.body;
  await db.saveAllQuestions(questions);
  if (broadcastFunctions?.questions) await broadcastFunctions.questions();
  res.json({ success: true });
});

// Ajouter une question
router.post('/questions/add', async (req, res) => {
  const question = req.body;
  const created = await db.createQuestion(question);
  if (broadcastFunctions?.questions) await broadcastFunctions.questions();
  res.json({ success: true, question: created });
});

// Fusionner des questions (import)
router.post('/questions/merge', async (req, res) => {
  const { questions, mode } = req.body;
  
  if (!questions || !Array.isArray(questions)) {
    return res.status(400).json({ success: false, error: 'Questions array required' });
  }
  
  const stats = await db.mergeQuestions(questions, mode || 'update');
  if (broadcastFunctions?.questions) await broadcastFunctions.questions();
  res.json({ success: true, stats });
});

// Modifier une question
router.put('/questions/:id', async (req, res) => {
  const { id } = req.params;
  const question = req.body;
  const updated = await db.updateQuestion(id, question);
  if (broadcastFunctions?.questions) await broadcastFunctions.questions();
  res.json({ success: true, question: updated });
});

// Supprimer une question
router.delete('/questions/:id', async (req, res) => {
  const { id } = req.params;
  await db.deleteQuestion(id);
  if (broadcastFunctions?.questions) await broadcastFunctions.questions();
  res.json({ success: true });
});

// ==================== LOBBIES (lecture seule) ====================

// Liste des lobbies
router.get('/lobbies', async (req, res) => {
  const lobbies = await db.getAllLobbies();
  res.json(lobbies.map(l => getLobbyWithTimer(l)));
});

// Archiver/Désarchiver un lobby
router.put('/lobbies/:id/archive', async (req, res) => {
  const { id } = req.params;
  const { archived } = req.body;
  
  const lobby = await db.getLobbyById(id);
  if (!lobby) {
    return res.json({ success: false, message: 'Lobby introuvable' });
  }
  
  const updatedLobby = await db.archiveLobby(id, archived);
  if (broadcastFunctions?.lobbies) await broadcastFunctions.lobbies();
  res.json({ success: true, lobby: getLobbyWithTimer(updatedLobby) });
});

module.exports = router;
module.exports.init = init;
