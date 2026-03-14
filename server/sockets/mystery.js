/**
 * Mystery Grid Socket Handlers
 * Gestion en temps réel des parties de Case Mystère
 */

module.exports = function(io, socket, db) {
  
  // Créer un lobby mystère
  socket.on('mystery:createLobby', async (data, callback) => {
    try {
      const { gridId } = data;
      const lobby = await db.createMysteryLobby(gridId);
      
      // Notifier tout le monde
      io.emit('mystery:lobbyCreated', lobby);
      
      if (callback) callback({ success: true, lobby });
    } catch (error) {
      console.error('[MYSTERY] Erreur création lobby:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // Rejoindre un lobby mystère
  socket.on('mystery:joinLobby', async (data, callback) => {
    try {
      const { lobbyId, odId, pseudo, teamName } = data;
      const lobby = await db.joinMysteryLobby(lobbyId, odId, pseudo, teamName);
      
      // Rejoindre la room socket
      socket.join(`mystery:${lobbyId}`);
      socket.mysteryLobbyId = lobbyId;
      socket.mysteryOdId = odId; // Utiliser un nom différent pour éviter conflit
      
      // Notifier les participants
      io.to(`mystery:${lobbyId}`).emit('mystery:lobbyUpdated', lobby);
      
      if (callback) callback({ success: true, lobby });
    } catch (error) {
      console.error('[MYSTERY] Erreur join lobby:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // Quitter un lobby mystère
  socket.on('mystery:leaveLobby', async (data, callback) => {
    try {
      const { lobbyId, odId } = data;
      const lobby = await db.leaveMysteryLobby(lobbyId, odId);
      
      // Quitter la room socket
      socket.leave(`mystery:${lobbyId}`);
      delete socket.mysteryLobbyId;
      delete socket.mysteryOdId;
      
      if (lobby) {
        io.to(`mystery:${lobbyId}`).emit('mystery:lobbyUpdated', lobby);
      }
      
      if (callback) callback({ success: true });
    } catch (error) {
      console.error('[MYSTERY] Erreur leave lobby:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // Démarrer le jeu
  socket.on('mystery:startGame', async (data, callback) => {
    try {
      const { lobbyId } = data;
      const lobby = await db.startMysteryLobby(lobbyId);
      
      // Notifier tout le monde
      io.to(`mystery:${lobbyId}`).emit('mystery:gameStarted', lobby);
      io.emit('mystery:lobbyUpdated', lobby);
      
      if (callback) callback({ success: true, lobby });
    } catch (error) {
      console.error('[MYSTERY] Erreur start game:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // Révéler une case (admin uniquement)
  socket.on('mystery:revealCell', async (data, callback) => {
    try {
      const { lobbyId, cellIndex } = data;
      const result = await db.revealMysteryCell(lobbyId, cellIndex);
      
      // Notifier tous les participants avec animation
      io.to(`mystery:${lobbyId}`).emit('mystery:cellRevealed', {
        cellIndex,
        reveal: result.reveal,
        gameState: result.lobby.gameState,
        allRevealed: result.allRevealed
      });
      
      // Si toutes les cases sont révélées, terminer automatiquement
      if (result.allRevealed) {
        const finishedLobby = await db.finishMysteryLobby(lobbyId);
        io.to(`mystery:${lobbyId}`).emit('mystery:gameFinished', finishedLobby);
        io.emit('mystery:lobbyUpdated', finishedLobby);
      }
      
      if (callback) callback({ success: true, result });
    } catch (error) {
      console.error('[MYSTERY] Erreur reveal cell:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // Fermer la modale de révélation
  socket.on('mystery:closeReveal', async (data, callback) => {
    try {
      const { lobbyId } = data;
      const lobby = await db.closeMysteryReveal(lobbyId);
      
      io.to(`mystery:${lobbyId}`).emit('mystery:revealClosed', lobby);
      
      if (callback) callback({ success: true });
    } catch (error) {
      console.error('[MYSTERY] Erreur close reveal:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // Toggle mute pour un participant
  socket.on('mystery:toggleMute', async (data, callback) => {
    try {
      const { lobbyId, odId, muted } = data;
      await db.toggleMysteryMute(lobbyId, odId, muted);
      
      // Pas besoin de broadcast, c'est local
      if (callback) callback({ success: true });
    } catch (error) {
      console.error('[MYSTERY] Erreur toggle mute:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // Terminer le jeu manuellement
  socket.on('mystery:finishGame', async (data, callback) => {
    try {
      const { lobbyId } = data;
      const lobby = await db.finishMysteryLobby(lobbyId);
      
      io.to(`mystery:${lobbyId}`).emit('mystery:gameFinished', lobby);
      io.emit('mystery:lobbyUpdated', lobby);
      
      if (callback) callback({ success: true, lobby });
    } catch (error) {
      console.error('[MYSTERY] Erreur finish game:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // Supprimer un lobby
  socket.on('mystery:deleteLobby', async (data, callback) => {
    try {
      const { lobbyId } = data;
      await db.deleteMysteryLobby(lobbyId);
      
      io.to(`mystery:${lobbyId}`).emit('mystery:lobbyDeleted', { lobbyId });
      io.emit('mystery:lobbyDeleted', { lobbyId });
      
      if (callback) callback({ success: true });
    } catch (error) {
      console.error('[MYSTERY] Erreur delete lobby:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // Rejoindre en tant que spectateur/admin pour monitoring
  socket.on('mystery:joinMonitoring', async (data, callback) => {
    try {
      const { lobbyId } = data;
      socket.join(`mystery:${lobbyId}`);
      
      const lobby = await db.getMysteryLobbyById(lobbyId);
      if (callback) callback({ success: true, lobby });
    } catch (error) {
      console.error('[MYSTERY] Erreur join monitoring:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // NOTE: Le handler disconnect est géré dans sockets/index.js pour éviter les doublons
};
