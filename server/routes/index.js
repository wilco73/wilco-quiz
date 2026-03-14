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

/**
 * Configure toutes les routes avec les dépendances nécessaires
 */
function setup(app, dependencies) {
  const { broadcastGlobalState, io } = dependencies;
  
  // Initialiser les routes qui ont besoin du broadcast
  teamsRoutes.init(broadcastGlobalState);
  participantsRoutes.init(broadcastGlobalState);
  quizzesRoutes.init(broadcastGlobalState);
  drawingRoutes.init(broadcastGlobalState, io);
  
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
}

module.exports = { setup };
