/**
 * Agrégateur des routes Express
 */

const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const teamsRoutes = require('./teams');
const participantsRoutes = require('./participants');
const quizzesRoutes = require('./quizzes');
const drawingRoutes = require('./drawing');
const mysteryRoutes = require('./mystery');
const mediaRoutes = require('./media');

const gameSettingsRoutes = require('./game-settings');
const memeTemplatesRoutes = require('./meme-templates');
const memeLobbiesRoutes = require('./meme-lobbies');
const memeCreationsRoutes = require('./meme-creations');

/**
 * Configure toutes les routes avec les dépendances nécessaires
 */
function setup(app, dependencies) {
  const { broadcastGlobalState, broadcasts, io } = dependencies;
  
  // Initialiser les routes qui ont besoin du broadcast
  // Utiliser les broadcasts ciblés si disponibles, sinon fallback sur broadcastGlobalState
  teamsRoutes.init(broadcasts || { teams: broadcastGlobalState, participants: broadcastGlobalState });
  participantsRoutes.init(broadcasts || { participants: broadcastGlobalState, teams: broadcastGlobalState });
  quizzesRoutes.init(broadcasts || { quizzes: broadcastGlobalState, questions: broadcastGlobalState, lobbies: broadcastGlobalState });
  drawingRoutes.init(broadcasts || { global: broadcastGlobalState }, io);
  mediaRoutes.init(broadcasts || { global: broadcastGlobalState }, io);
  
  // Monter les routes
  app.use('/api', authRoutes);
  app.use('/api/teams', teamsRoutes);
  app.use('/api/delete-team', async (req, res) => {
    // Route legacy - redirige vers teams/delete
    const teamsRouter = require('./teams');
    req.url = '/delete';
    teamsRouter(req, res);
  });
  app.use('/api/participants', participantsRoutes);
  app.use('/api/update-participant', async (req, res) => {
    // Route legacy
    const participantsRouter = require('./participants');
    req.url = '/update';
    participantsRouter(req, res);
  });
  app.use('/api/change-password', async (req, res) => {
    // Route legacy
    const participantsRouter = require('./participants');
    req.url = '/change-password';
    participantsRouter(req, res);
  });
  app.use('/api', quizzesRoutes);
  
  // Routes drawing avec préfixes différents pour compatibilité
  app.use('/api/drawing-words', (req, res, next) => {
    req.url = '/words' + req.url;
    drawingRoutes(req, res, next);
  });
  app.use('/api/drawing-references', (req, res, next) => {
    req.url = '/references' + req.url;
    drawingRoutes(req, res, next);
  });
  app.use('/api/drawing-games', (req, res, next) => {
    req.url = '/games' + req.url;
    drawingRoutes(req, res, next);
  });
  app.use('/api/drawing-lobbies', (req, res, next) => {
    req.url = '/lobbies' + req.url;
    drawingRoutes(req, res, next);
  });
  app.use('/api/drawings', (req, res, next) => {
    req.url = '/drawings' + req.url;
    drawingRoutes(req, res, next);
  });
  
  // Routes Mystery Grid (Case Mystère)
  app.use('/api/mystery', mysteryRoutes);
  
  // Routes Médiathèque et Broadcast
  app.use('/api/media', mediaRoutes);

  app.use('/api/game-settings', gameSettingsRoutes);
  app.use('/api/meme-templates', memeTemplatesRoutes);
  app.use('/api/meme-lobbies', memeLobbiesRoutes);
  app.use('/api/meme-creations', memeCreationsRoutes);
}

module.exports = { setup };
