/**
 * Meme Game Socket Handlers
 * Gestion en temps réel des parties Make It Meme
 */

module.exports = function(io, socket, db) {
  
  // ==================== LOBBY MANAGEMENT ====================
  
  // Créer un lobby meme
  socket.on('meme:createLobby', async (data, callback) => {
    try {
      const { odId, pseudo, settings } = data;
      
      // Vérifier les permissions
      const canCreate = await db.canCreateGameLobby('meme', data.userRole || 'user');
      if (!canCreate.allowed) {
        return callback({ success: false, message: canCreate.reason });
      }
      
      const lobby = await db.createMemeLobby(odId, pseudo, settings);
      
      // Rejoindre la room socket
      socket.join(`meme:${lobby.id}`);
      socket.memeLobbyId = lobby.id;
      socket.odId = odId;
      
      // Notifier tout le monde qu'un nouveau lobby existe
      io.emit('meme:lobbyCreated', lobby);
      
      callback({ success: true, lobby });
    } catch (error) {
      console.error('[MEME] Erreur création lobby:', error);
      callback({ success: false, message: error.message });
    }
  });
  
  // Rejoindre un lobby
  socket.on('meme:joinLobby', async (data, callback) => {
    try {
      const { lobbyId, odId, pseudo } = data;
      
      const lobby = await db.joinMemeLobby(lobbyId, odId, pseudo);
      
      // Rejoindre la room socket
      socket.join(`meme:${lobbyId}`);
      socket.memeLobbyId = lobbyId;
      socket.odId = odId;
      
      // Notifier les participants
      io.to(`meme:${lobbyId}`).emit('meme:lobbyUpdated', lobby);
      
      callback({ success: true, lobby });
    } catch (error) {
      console.error('[MEME] Erreur join lobby:', error);
      callback({ success: false, message: error.message });
    }
  });
  
  // Rejoindre un lobby par code court (6 caractères)
  socket.on('meme:joinLobbyByCode', async (data, callback) => {
    try {
      const { code, odId, pseudo } = data;
      
      // Chercher le lobby par son code
      const lobby = await db.getMemeLobbyByCode(code);
      
      if (!lobby) {
        return callback({ success: false, message: 'Code invalide ou lobby introuvable' });
      }
      
      if (lobby.status !== 'waiting') {
        return callback({ success: false, message: 'Cette partie a déjà commencé' });
      }
      
      // Rejoindre le lobby
      const updatedLobby = await db.joinMemeLobby(lobby.id, odId, pseudo);
      
      // Rejoindre la room socket
      socket.join(`meme:${lobby.id}`);
      socket.memeLobbyId = lobby.id;
      socket.odId = odId;
      
      // Notifier les participants
      io.to(`meme:${lobby.id}`).emit('meme:lobbyUpdated', updatedLobby);
      
      callback({ success: true, lobby: updatedLobby });
    } catch (error) {
      console.error('[MEME] Erreur join lobby by code:', error);
      callback({ success: false, message: error.message });
    }
  });
  
  // Quitter un lobby
  socket.on('meme:leaveLobby', async (data, callback) => {
    try {
      const { lobbyId, odId } = data;
      
      const lobby = await db.leaveMemeLobby(lobbyId, odId);
      
      // Quitter la room socket
      socket.leave(`meme:${lobbyId}`);
      delete socket.memeLobbyId;
      
      if (lobby) {
        io.to(`meme:${lobbyId}`).emit('meme:lobbyUpdated', lobby);
      } else {
        // Lobby supprimé car vide
        io.emit('meme:lobbyDeleted', { lobbyId });
      }
      
      callback({ success: true });
    } catch (error) {
      console.error('[MEME] Erreur leave lobby:', error);
      callback({ success: false, message: error.message });
    }
  });
  
  // Mettre à jour les settings du lobby
  socket.on('meme:updateSettings', async (data, callback) => {
    try {
      const { lobbyId, settings } = data;
      
      const lobby = await db.updateMemeLobbySettings(lobbyId, settings);
      
      io.to(`meme:${lobbyId}`).emit('meme:lobbyUpdated', lobby);
      
      callback({ success: true, lobby });
    } catch (error) {
      console.error('[MEME] Erreur update settings:', error);
      callback({ success: false, message: error.message });
    }
  });
  
  // ==================== GAME FLOW ====================
  
  // Démarrer la partie
  socket.on('meme:startGame', async (data, callback) => {
    try {
      const { lobbyId } = data;
      
      // Démarrer le lobby
      const lobby = await db.startMemeLobby(lobbyId);
      
      // Assigner un meme à chaque joueur
      const tags = lobby.settings.tags || [];
      const participants = lobby.participants || [];
      const assignedTemplateIds = [];
      
      for (const participant of participants) {
        const template = await db.getRandomMemeTemplate(assignedTemplateIds, tags);
        if (template) {
          await db.createMemeAssignment(lobbyId, 1, participant.odId, template.id);
          assignedTemplateIds.push(template.id);
        }
      }
      
      // Notifier tout le monde
      io.to(`meme:${lobbyId}`).emit('meme:gameStarted', {
        lobby,
        phase: 'creation',
        roundNumber: 1,
        endTime: lobby.phase_end_time
      });
      
      // Envoyer à chaque joueur son meme
      for (const participant of participants) {
        const assignment = await db.getMemeAssignment(lobbyId, 1, participant.odId);
        if (assignment) {
          io.to(`meme:${lobbyId}`).emit('meme:templateAssigned', {
            odId: participant.odId,
            assignment
          });
        }
      }
      
      callback({ success: true, lobby });
    } catch (error) {
      console.error('[MEME] Erreur start game:', error);
      callback({ success: false, message: error.message });
    }
  });
  
  // Demander une rotation (nouveau meme)
  socket.on('meme:rotateTemplate', async (data, callback) => {
    try {
      const { lobbyId, roundNumber, odId } = data;
      
      const lobby = await db.getMemeLobbyById(lobbyId);
      if (!lobby) throw new Error('Lobby non trouvé');
      
      const currentAssignment = await db.getMemeAssignment(lobbyId, roundNumber, odId);
      if (!currentAssignment) throw new Error('Assignation non trouvée');
      
      // Vérifier limite rotations
      if (currentAssignment.rotations_used >= lobby.settings.maxRotations) {
        return callback({ success: false, message: 'Nombre maximum de rotations atteint' });
      }
      
      // Obtenir un nouveau template
      const excludeIds = currentAssignment.templates_history || [];
      const tags = lobby.settings.tags || [];
      const newTemplate = await db.getRandomMemeTemplate(excludeIds, tags);
      
      if (!newTemplate) {
        return callback({ success: false, message: 'Plus de memes disponibles' });
      }
      
      const assignment = await db.rotateMemeAssignment(lobbyId, roundNumber, odId, newTemplate.id);
      
      callback({ success: true, assignment });
    } catch (error) {
      console.error('[MEME] Erreur rotation:', error);
      callback({ success: false, message: error.message });
    }
  });
  
  // Utiliser un undo (revenir au meme précédent)
  socket.on('meme:undoRotation', async (data, callback) => {
    try {
      const { lobbyId, roundNumber, odId } = data;
      
      const lobby = await db.getMemeLobbyById(lobbyId);
      if (!lobby) throw new Error('Lobby non trouvé');
      
      const currentAssignment = await db.getMemeAssignment(lobbyId, roundNumber, odId);
      if (!currentAssignment) throw new Error('Assignation non trouvée');
      
      // Vérifier limite undos
      if (currentAssignment.undos_used >= lobby.settings.maxUndos) {
        return callback({ success: false, message: 'Nombre maximum de retours atteint' });
      }
      
      const assignment = await db.undoMemeAssignment(lobbyId, roundNumber, odId);
      
      callback({ success: true, assignment });
    } catch (error) {
      console.error('[MEME] Erreur undo:', error);
      callback({ success: false, message: error.message });
    }
  });
  
  // Soumettre une création
  socket.on('meme:submitCreation', async (data, callback) => {
    try {
      const { lobbyId, roundNumber, odId, pseudo, templateId, textLayers, finalImageBase64 } = data;
      
      const creation = await db.createMemeCreation(
        lobbyId,
        roundNumber,
        odId,
        pseudo,
        templateId,
        textLayers,
        finalImageBase64
      );
      
      // Notifier les autres (sans l'image pour l'instant)
      io.to(`meme:${lobbyId}`).emit('meme:creationSubmitted', {
        odId,
        pseudo,
        creationId: creation.id
      });
      
      callback({ success: true, creation });
    } catch (error) {
      console.error('[MEME] Erreur submit creation:', error);
      callback({ success: false, message: error.message });
    }
  });
  
  // ==================== VOTING ====================
  
  // Passer en phase de vote
  socket.on('meme:startVoting', async (data, callback) => {
    try {
      const { lobbyId } = data;
      
      const lobby = await db.startVotingPhase(lobbyId);
      const creations = await db.getMemeCreationsByLobby(lobbyId, lobby.current_round);
      
      io.to(`meme:${lobbyId}`).emit('meme:votingStarted', {
        lobby,
        creations,
        currentIndex: 0,
        endTime: lobby.phase_end_time
      });
      
      callback({ success: true, lobby });
    } catch (error) {
      console.error('[MEME] Erreur start voting:', error);
      callback({ success: false, message: error.message });
    }
  });
  
  // Voter sur une création
  socket.on('meme:vote', async (data, callback) => {
    try {
      const { lobbyId, creationId, odId, pseudo, voteType, isSuper } = data;
      
      // Vérifier qu'on ne vote pas pour soi-même
      const creation = await db.getMemeCreationById(creationId);
      if (creation.player_id === odId) {
        return callback({ success: false, message: 'Impossible de voter pour soi-même' });
      }
      
      // Vérifier super vote
      if (isSuper) {
        const lobby = await db.getMemeLobbyById(lobbyId);
        const participant = (lobby.participants || []).find(p => p.odId === odId);
        if (participant?.superVoteUsedThisRound) {
          return callback({ success: false, message: 'Super vote déjà utilisé cette manche' });
        }
        await db.markSuperVoteUsed(lobbyId, odId);
      }
      
      const result = await db.addVoteToCreation(creationId, odId, pseudo, voteType, isSuper);
      
      // Mettre à jour le score du créateur
      await db.updateParticipantScore(lobbyId, creation.player_id, result.points);
      
      // Notifier tout le monde
      io.to(`meme:${lobbyId}`).emit('meme:voteReceived', {
        creationId,
        odId,
        voteType,
        isSuper,
        totalScore: result.creation.total_score
      });
      
      callback({ success: true, points: result.points });
    } catch (error) {
      console.error('[MEME] Erreur vote:', error);
      callback({ success: false, message: error.message });
    }
  });
  
  // Passer au vote suivant
  socket.on('meme:nextVote', async (data, callback) => {
    try {
      const { lobbyId } = data;
      
      const lobby = await db.advanceToNextVote(lobbyId);
      
      if (lobby.phase === 'results') {
        // Fin des votes, afficher résultats
        const creations = await db.getMemeCreationsByLobby(lobbyId, lobby.current_round);
        io.to(`meme:${lobbyId}`).emit('meme:roundResults', {
          lobby,
          creations
        });
      } else {
        // Vote suivant
        io.to(`meme:${lobbyId}`).emit('meme:nextVoteStarted', {
          lobby,
          currentIndex: lobby.current_vote_index,
          endTime: lobby.phase_end_time
        });
      }
      
      callback({ success: true, lobby });
    } catch (error) {
      console.error('[MEME] Erreur next vote:', error);
      callback({ success: false, message: error.message });
    }
  });
  
  // Passer à la manche suivante
  socket.on('meme:nextRound', async (data, callback) => {
    try {
      const { lobbyId } = data;
      
      const lobby = await db.advanceToNextRound(lobbyId);
      
      if (lobby.phase === 'final') {
        // Fin de partie
        const allCreations = await db.getMemeCreationsByLobby(lobbyId);
        io.to(`meme:${lobbyId}`).emit('meme:gameFinished', {
          lobby,
          allCreations
        });
      } else {
        // Nouvelle manche - assigner les memes
        const tags = lobby.settings.tags || [];
        const participants = lobby.participants || [];
        const assignedTemplateIds = [];
        
        for (const participant of participants) {
          const template = await db.getRandomMemeTemplate(assignedTemplateIds, tags);
          if (template) {
            await db.createMemeAssignment(lobbyId, lobby.current_round, participant.odId, template.id);
            assignedTemplateIds.push(template.id);
          }
        }
        
        io.to(`meme:${lobbyId}`).emit('meme:newRoundStarted', {
          lobby,
          roundNumber: lobby.current_round,
          endTime: lobby.phase_end_time
        });
        
        // Envoyer à chaque joueur son meme
        for (const participant of participants) {
          const assignment = await db.getMemeAssignment(lobbyId, lobby.current_round, participant.odId);
          if (assignment) {
            io.to(`meme:${lobbyId}`).emit('meme:templateAssigned', {
              odId: participant.odId,
              assignment
            });
          }
        }
      }
      
      callback({ success: true, lobby });
    } catch (error) {
      console.error('[MEME] Erreur next round:', error);
      callback({ success: false, message: error.message });
    }
  });
  
  // ==================== UTILITIES ====================
  
  // Récupérer l'état actuel du lobby
  socket.on('meme:getLobbyState', async (data, callback) => {
    try {
      const { lobbyId } = data;
      
      const lobby = await db.getMemeLobbyById(lobbyId);
      if (!lobby) {
        return callback({ success: false, message: 'Lobby non trouvé' });
      }
      
      let creations = [];
      let assignment = null;
      
      if (lobby.current_round > 0) {
        creations = await db.getMemeCreationsByLobby(lobbyId, lobby.current_round);
        
        if (data.odId) {
          assignment = await db.getMemeAssignment(lobbyId, lobby.current_round, data.odId);
        }
      }
      
      callback({ success: true, lobby, creations, assignment });
    } catch (error) {
      console.error('[MEME] Erreur get lobby state:', error);
      callback({ success: false, message: error.message });
    }
  });
  
  // Rejoindre en mode monitoring (admin)
  socket.on('meme:joinMonitoring', async (data, callback) => {
    try {
      const { lobbyId } = data;
      socket.join(`meme:${lobbyId}`);
      
      const lobby = await db.getMemeLobbyById(lobbyId);
      callback({ success: true, lobby });
    } catch (error) {
      console.error('[MEME] Erreur join monitoring:', error);
      callback({ success: false, message: error.message });
    }
  });
  
  // Supprimer un lobby (admin/créateur)
  socket.on('meme:deleteLobby', async (data, callback) => {
    try {
      const { lobbyId } = data;
      
      await db.deleteMemeLobby(lobbyId);
      
      io.to(`meme:${lobbyId}`).emit('meme:lobbyDeleted', { lobbyId });
      io.emit('meme:lobbyDeleted', { lobbyId });
      
      callback({ success: true });
    } catch (error) {
      console.error('[MEME] Erreur delete lobby:', error);
      callback({ success: false, message: error.message });
    }
  });
  
  // Gérer la déconnexion
  socket.on('disconnect', async () => {
    if (socket.memeLobbyId && socket.odId) {
      try {
        const lobby = await db.leaveMemeLobby(socket.memeLobbyId, socket.odId);
        if (lobby) {
          io.to(`meme:${socket.memeLobbyId}`).emit('meme:lobbyUpdated', lobby);
        } else {
          io.emit('meme:lobbyDeleted', { lobbyId: socket.memeLobbyId });
        }
      } catch (error) {
        console.error('[MEME] Erreur leave on disconnect:', error);
      }
    }
  });
};
