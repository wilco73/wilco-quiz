/**
 * Mystery Grid Socket Handlers
 * Gestion en temps réel des parties de Case Mystère
 */

const { broadcastMysteryLobbiesUpdate } = require('../utils/broadcast');

module.exports = function(io, socket, db) {
  
  /**
   * Vérifie si l'utilisateur a les droits d'action sur le lobby
   * @param {object} lobby - Le lobby
   * @param {string} odId - L'ID de l'utilisateur
   * @param {string} role - Le rôle de l'utilisateur (user, admin, superadmin)
   * @returns {boolean}
   */
  const canControlLobby = (lobby, odId, role) => {
    // Superadmin peut tout faire
    if (role === 'superadmin') return true;
    
    // Le créateur du lobby peut contrôler
    if (lobby.createdBy === odId) return true;
    
    // Les autres (y compris admin non-créateur) ne peuvent pas
    return false;
  };
  
  // Créer un lobby mystère
  socket.on('mystery:createLobby', async (data, callback) => {
    try {
      const { gridId, odId } = data;
      const lobby = await db.createMysteryLobby(gridId, odId);
      
      // Notifier tout le monde
      io.emit('mystery:lobbyCreated', lobby);
      await broadcastMysteryLobbiesUpdate(io);
      
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
      console.log('[MYSTERY] joinLobby - lobbyId:', lobbyId, 'odId:', odId, 'pseudo:', pseudo);
      
      const lobby = await db.joinMysteryLobby(lobbyId, odId, pseudo, teamName);
      console.log('[MYSTERY] joinLobby - après join, participants:', lobby?.participants?.length);
      
      // Rejoindre la room socket
      socket.join(`mystery:${lobbyId}`);
      socket.mysteryLobbyId = lobbyId;
      socket.mysteryOdId = odId; // Utiliser un nom différent pour éviter conflit
      
      // Notifier les participants du lobby
      io.to(`mystery:${lobbyId}`).emit('mystery:lobbyUpdated', lobby);
      // Notifier tous les admins qui regardent la liste
      await broadcastMysteryLobbiesUpdate(io);
      
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
      // Notifier tous les admins
      await broadcastMysteryLobbiesUpdate(io);
      
      if (callback) callback({ success: true });
    } catch (error) {
      console.error('[MYSTERY] Erreur leave lobby:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // Démarrer le jeu (vérification des permissions)
  socket.on('mystery:startGame', async (data, callback) => {
    try {
      const { lobbyId, odId, role } = data;
      
      // Vérifier les permissions
      const lobby = await db.getMysteryLobbyById(lobbyId);
      if (!lobby) {
        if (callback) callback({ success: false, message: 'Lobby non trouvé' });
        return;
      }
      
      if (!canControlLobby(lobby, odId, role)) {
        if (callback) callback({ success: false, message: 'Vous n\'êtes pas autorisé à démarrer cette partie' });
        return;
      }
      
      const updatedLobby = await db.startMysteryLobby(lobbyId);
      
      // Notifier les joueurs du lobby
      io.to(`mystery:${lobbyId}`).emit('mystery:gameStarted', updatedLobby);
      // Notifier tous les admins
      await broadcastMysteryLobbiesUpdate(io);
      
      if (callback) callback({ success: true, lobby: updatedLobby });
    } catch (error) {
      console.error('[MYSTERY] Erreur start game:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // Révéler une case (vérification des permissions)
  socket.on('mystery:revealCell', async (data, callback) => {
    try {
      const { lobbyId, cellIndex, odId, role } = data;
      
      // Vérifier les permissions
      const lobby = await db.getMysteryLobbyById(lobbyId);
      if (!lobby) {
        if (callback) callback({ success: false, message: 'Lobby non trouvé' });
        return;
      }
      
      if (!canControlLobby(lobby, odId, role)) {
        if (callback) callback({ success: false, message: 'Vous n\'êtes pas autorisé à révéler les cases' });
        return;
      }
      
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
  
  // Fermer la modale de révélation (vérification des permissions)
  socket.on('mystery:closeReveal', async (data, callback) => {
    try {
      const { lobbyId, odId, role } = data;
      
      // Vérifier les permissions
      const lobby = await db.getMysteryLobbyById(lobbyId);
      if (!lobby) {
        if (callback) callback({ success: false, message: 'Lobby non trouvé' });
        return;
      }
      
      if (!canControlLobby(lobby, odId, role)) {
        if (callback) callback({ success: false, message: 'Vous n\'êtes pas autorisé à fermer cette révélation' });
        return;
      }
      
      const updatedLobby = await db.closeMysteryReveal(lobbyId);
      
      io.to(`mystery:${lobbyId}`).emit('mystery:revealClosed', updatedLobby);
      
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
  
  // Terminer le jeu manuellement (vérification des permissions)
  socket.on('mystery:finishGame', async (data, callback) => {
    try {
      const { lobbyId, odId, role } = data;
      
      // Vérifier les permissions
      const lobby = await db.getMysteryLobbyById(lobbyId);
      if (!lobby) {
        if (callback) callback({ success: false, message: 'Lobby non trouvé' });
        return;
      }
      
      if (!canControlLobby(lobby, odId, role)) {
        if (callback) callback({ success: false, message: 'Vous n\'êtes pas autorisé à terminer cette partie' });
        return;
      }
      
      const finishedLobby = await db.finishMysteryLobby(lobbyId);
      
      io.to(`mystery:${lobbyId}`).emit('mystery:gameFinished', finishedLobby);
      await broadcastMysteryLobbiesUpdate(io);
      
      if (callback) callback({ success: true, lobby: finishedLobby });
    } catch (error) {
      console.error('[MYSTERY] Erreur finish game:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // Supprimer un lobby (vérification des permissions)
  socket.on('mystery:deleteLobby', async (data, callback) => {
    try {
      const { lobbyId, odId, role } = data;
      
      // Vérifier les permissions
      const lobby = await db.getMysteryLobbyById(lobbyId);
      if (!lobby) {
        if (callback) callback({ success: false, message: 'Lobby non trouvé' });
        return;
      }
      
      if (!canControlLobby(lobby, odId, role)) {
        if (callback) callback({ success: false, message: 'Vous n\'êtes pas autorisé à supprimer ce lobby' });
        return;
      }
      
      await db.deleteMysteryLobby(lobbyId);
      
      // Notifier les participants du lobby ET tous les admins
      io.to(`mystery:${lobbyId}`).emit('mystery:lobbyDeleted', { lobbyId });
      io.emit('mystery:lobbyDeleted', { lobbyId }); // Global pour les admins
      await broadcastMysteryLobbiesUpdate(io);
      
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
      console.log('[MYSTERY] joinMonitoring - lobbyId:', lobbyId);
      console.log('[MYSTERY] joinMonitoring - participants:', lobby?.participants?.length || 0, lobby?.participants);
      
      if (callback) callback({ success: true, lobby });
    } catch (error) {
      console.error('[MYSTERY] Erreur join monitoring:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // NOTE: Le handler disconnect est géré dans sockets/index.js pour éviter les doublons
};
