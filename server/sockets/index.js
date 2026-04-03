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
const mysteryHandlers = require('./mystery');
const db = require('../database');

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
    
    try {
      // Envoyer l'état initial
      await emitInitialState(socket);
    } catch (error) {
      console.error('[SOCKET] Erreur emitInitialState:', error.message);
    }
    
    // Handler pour demander l'état global (reconnexion)
    socket.on('global:requestState', async () => {
      try {
        console.log(`[SOCKET] Demande d'état global de ${socket.id}`);
        await emitInitialState(socket);
      } catch (error) {
        console.error('[SOCKET] Erreur requestState:', error.message);
      }
    });
    
    // Enregistrer tous les handlers
    authHandlers.register(socket, io);
    quizHandlers.register(socket, io);
    drawingHandlers.register(socket, io);
    pictionaryHandlers.register(socket, io);
    relayHandlers.register(socket, io);
    mysteryHandlers(io, socket, db);
    
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
      
      // Si dans un lobby de quiz, notifier
      if (socket.lobbyId && socket.odId) {
        io.to(`lobby:${socket.lobbyId}`).emit('participant:disconnected', {
          odId: socket.odId
        });
      }
      
      // Si dans un lobby de dessin, quitter proprement
      if (socket.drawingLobbyId && socket.odId) {
        try {
          const lobby = await db.leaveDrawingLobby(socket.drawingLobbyId, socket.odId);
          
          if (lobby) {
            // Le lobby existe encore, notifier les autres
            io.to(`drawing:${socket.drawingLobbyId}`).emit('drawingLobby:participantLeft', { 
              odId: socket.odId 
            });
            io.to(`drawing:${socket.drawingLobbyId}`).emit('drawingLobby:updated', { lobby });
          } else {
            // Le lobby a été supprimé (était vide)
            io.to(`drawing:${socket.drawingLobbyId}`).emit('drawingLobby:deleted', { 
              lobbyId: socket.drawingLobbyId 
            });
          }
          
          console.log(`[DRAWING] ${socket.pseudo || socket.odId} déconnecté du lobby ${socket.drawingLobbyId}`);
        } catch (error) {
          console.error('[DRAWING] Erreur leave on disconnect:', error);
        }
      }
      
      // Si dans un lobby mystery, quitter proprement
      if (socket.mysteryLobbyId && socket.mysteryOdId) {
        try {
          const lobby = await db.leaveMysteryLobby(socket.mysteryLobbyId, socket.mysteryOdId);
          if (lobby) {
            io.to(`mystery:${socket.mysteryLobbyId}`).emit('mystery:lobbyUpdated', lobby);
          }
          console.log(`[MYSTERY] ${socket.mysteryOdId} déconnecté du lobby ${socket.mysteryLobbyId}`);
        } catch (error) {
          console.error('[MYSTERY] Erreur leave on disconnect:', error);
        }
      }
      
      console.log(`[SOCKET] Déconnexion: ${socket.id}`);
    });
  });
}

module.exports = { setup };
