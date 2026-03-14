/**
 * Configuration et handlers Socket.IO
 * Point d'entrée pour tous les événements temps réel
 */

const { connectedParticipants, participantSockets } = require('../utils/state');
const { emitInitialState } = require('../utils/broadcast');
const timers = require('../utils/timers');
const authHandlers = require('./auth');
const quizHandlers = require('./quiz');
const drawingHandlers = require('./drawing');
const pictionaryHandlers = require('./pictionary');
const relayHandlers = require('./relay');

/**
 * Configure Socket.IO et enregistre tous les handlers
 */
function setup(io) {
  // Initialiser les modules qui ont besoin de l'instance io
  timers.init(io);
  pictionaryHandlers.init(io);
  relayHandlers.init(io);
  
  io.on('connection', async (socket) => {
    console.log(`[SOCKET] Connexion: ${socket.id}`);
    
    // Envoyer l'état initial
    await emitInitialState(socket);
    
    // Handler pour demander l'état global (reconnexion)
    socket.on('global:requestState', async () => {
      console.log(`[SOCKET] Demande d'état global de ${socket.id}`);
      await emitInitialState(socket);
    });
    
    // Enregistrer tous les handlers
    authHandlers.register(socket, io);
    quizHandlers.register(socket, io);
    drawingHandlers.register(socket, io);
    pictionaryHandlers.register(socket, io);
    relayHandlers.register(socket, io);
    
    // Handler de déconnexion
    socket.on('disconnect', async () => {
      const participantInfo = connectedParticipants.get(socket.id);
      
      if (participantInfo) {
        const sockets = participantSockets.get(participantInfo.odId);
        if (sockets) {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            participantSockets.delete(participantInfo.odId);
          }
        }
        connectedParticipants.delete(socket.id);
      }
      
      // Si dans un lobby, notifier
      if (socket.lobbyId && socket.odId) {
        io.to(`lobby:${socket.lobbyId}`).emit('participant:disconnected', {
          odId: socket.odId
        });
      }
      
      console.log(`[SOCKET] Déconnexion: ${socket.id}`);
    });
  });
}

module.exports = { setup };
