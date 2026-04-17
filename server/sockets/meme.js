/**
 * Meme Game Socket Handlers - VERSION DEBUG
 * Avec logging détaillé pour identifier le problème
 */

module.exports = function(io, socket, db) {
  
  // ==================== LOBBY MANAGEMENT ====================
  
  socket.on('meme:createLobby', async (data, callback) => {
    try {
      const { odId, pseudo, settings } = data;
      const lobby = await db.createMemeLobby(odId, pseudo, settings);
      
      socket.join(`meme:${lobby.id}`);
      socket.memeLobbyId = lobby.id;
      socket.memeOdId = odId;
      
      console.log(`[MEME] ${pseudo} created and joined room meme:${lobby.id}`);
      io.emit('meme:lobbyCreated', lobby);
      
      if (callback) callback({ success: true, lobby });
    } catch (error) {
      console.error('[MEME] Erreur création lobby:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  socket.on('meme:joinLobby', async (data, callback) => {
    try {
      const { lobbyId, odId, pseudo } = data;
      
      console.log(`[MEME] joinLobby request: ${pseudo} (${odId}) -> ${lobbyId}`);
      
      let lobby = await db.getMemeLobbyById(lobbyId);
      if (!lobby) {
        return callback?.({ success: false, message: 'Lobby non trouvé' });
      }
      
      const participants = lobby.participants || [];
      const isAlreadyParticipant = participants.some(p => p.odId === odId);
      
      if (!isAlreadyParticipant && lobby.status !== 'waiting') {
        return callback?.({ success: false, message: 'La partie a déjà commencé' });
      }
      
      if (!isAlreadyParticipant) {
        lobby = await db.joinMemeLobby(lobbyId, odId, pseudo);
      }
      
      socket.join(`meme:${lobbyId}`);
      socket.memeLobbyId = lobbyId;
      socket.memeOdId = odId;
      
      console.log(`[MEME] ${pseudo} joined room meme:${lobbyId}, status: ${lobby.status}`);
      
      io.to(`meme:${lobbyId}`).emit('meme:lobbyUpdated', lobby);
      
      if (lobby.status === 'playing' && lobby.phase) {
        console.log(`[MEME] Game in progress, sending state to ${pseudo}`);
        
        let timeRemaining = 0;
        if (lobby.phase_end_time) {
          const endTime = new Date(lobby.phase_end_time).getTime();
          timeRemaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        } else {
          timeRemaining = lobby.phase === 'creation' 
            ? (lobby.settings?.creationTime || 120)
            : (lobby.settings?.voteTime || 30);
        }
        
        socket.emit('meme:gameStarted', {
          lobby,
          phase: lobby.phase === 'creation' ? 'creating' : lobby.phase,
          roundNumber: lobby.current_round,
          timeRemaining
        });
        
        if (lobby.phase === 'creation') {
          const assignment = await db.getMemeAssignment(lobbyId, lobby.current_round, odId);
          if (assignment) {
            socket.emit('meme:templateAssigned', { odId, assignment });
          }
        }
        
        if (lobby.phase === 'voting') {
          const creations = await db.getMemeCreationsByLobby(lobbyId, lobby.current_round);
          socket.emit('meme:votingStarted', {
            lobby,
            creations,
            currentIndex: lobby.current_vote_index || 0,
            timeRemaining
          });
        }
      }
      
      if (callback) callback({ success: true, lobby });
    } catch (error) {
      console.error('[MEME] Erreur join lobby:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  socket.on('meme:joinLobbyByCode', async (data, callback) => {
    try {
      const { code, odId, pseudo } = data;
      
      const lobby = await db.getMemeLobbyByCode(code);
      if (!lobby) {
        return callback?.({ success: false, message: 'Lobby non trouvé' });
      }
      
      socket.emit('meme:joinLobby', { lobbyId: lobby.id, odId, pseudo }, callback);
      
    } catch (error) {
      console.error('[MEME] joinLobbyByCode error:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  socket.on('meme:leaveLobby', async (data, callback) => {
    try {
      const { lobbyId, odId } = data;
      
      const lobby = await db.leaveMemeLobby(lobbyId, odId);
      
      socket.leave(`meme:${lobbyId}`);
      delete socket.memeLobbyId;
      delete socket.memeOdId;
      
      if (lobby) {
        io.to(`meme:${lobbyId}`).emit('meme:lobbyUpdated', lobby);
      } else {
        io.emit('meme:lobbyDeleted', { lobbyId });
      }
      
      if (callback) callback({ success: true });
    } catch (error) {
      console.error('[MEME] Erreur leave lobby:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  socket.on('meme:updateSettings', async (data, callback) => {
    try {
      const { lobbyId, settings } = data;
      const lobby = await db.updateMemeLobbySettings(lobbyId, settings);
      
      io.to(`meme:${lobbyId}`).emit('meme:lobbyUpdated', lobby);
      
      if (callback) callback({ success: true, lobby });
    } catch (error) {
      console.error('[MEME] Erreur update settings:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // ==================== GAME FLOW ====================
  
  socket.on('meme:startGame', async (data, callback) => {
    try {
      const { lobbyId } = data;
      
      console.log(`[MEME] Starting game for lobby ${lobbyId}`);
      
      let lobby = await db.getMemeLobbyById(lobbyId);
      if (!lobby) {
        return callback?.({ success: false, message: 'Lobby non trouvé' });
      }
      if (lobby.status !== 'waiting') {
        return callback?.({ success: false, message: 'La partie a déjà commencé' });
      }
      if ((lobby.participants || []).length < 2) {
        return callback?.({ success: false, message: 'Il faut au moins 2 joueurs' });
      }
      
      lobby = await db.startMemeLobby(lobbyId);
      
      const tags = lobby.settings?.tags || [];
      const participants = lobby.participants || [];
      const assignedTemplateIds = [];
      
      for (const participant of participants) {
        const template = await db.getRandomMemeTemplate(assignedTemplateIds, tags);
        if (template) {
          await db.createMemeAssignment(lobbyId, 1, participant.odId, template.id);
          assignedTemplateIds.push(template.id);
        }
      }
      
      const creationTime = lobby.settings?.creationTime || 120;
      
      console.log(`[MEME] Game started, notifying ${participants.length} players`);
      
      io.to(`meme:${lobbyId}`).emit('meme:gameStarted', {
        lobby,
        phase: 'creating',
        roundNumber: 1,
        timeRemaining: creationTime
      });
      
      for (const participant of participants) {
        const assignment = await db.getMemeAssignment(lobbyId, 1, participant.odId);
        if (assignment) {
          console.log(`[MEME] Sending template to ${participant.pseudo}`);
          io.to(`meme:${lobbyId}`).emit('meme:templateAssigned', {
            odId: participant.odId,
            assignment
          });
        }
      }
      
      if (callback) callback({ success: true, lobby });
    } catch (error) {
      console.error('[MEME] Erreur start game:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  socket.on('meme:rotateTemplate', async (data, callback) => {
    try {
      const { lobbyId, roundNumber, odId } = data;
      
      const lobby = await db.getMemeLobbyById(lobbyId);
      const currentAssignment = await db.getMemeAssignment(lobbyId, roundNumber, odId);
      
      if (!currentAssignment) {
        return callback?.({ success: false, message: 'Assignment non trouvé' });
      }
      
      const maxRotations = lobby.settings?.maxRotations || 3;
      if (currentAssignment.rotations_used >= maxRotations) {
        return callback?.({ success: false, message: 'Plus de rotations disponibles' });
      }
      
      const usedIds = currentAssignment.templates_history || [currentAssignment.template_id];
      const tags = lobby.settings?.tags || [];
      
      const newTemplate = await db.getRandomMemeTemplate(usedIds, tags);
      if (!newTemplate) {
        return callback?.({ success: false, message: 'Plus de templates disponibles' });
      }
      
      const assignment = await db.rotateMemeAssignment(lobbyId, roundNumber, odId, newTemplate.id);
      
      if (callback) callback({ success: true, assignment });
    } catch (error) {
      console.error('[MEME] Erreur rotate:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  socket.on('meme:undoTemplate', async (data, callback) => {
    try {
      const { lobbyId, roundNumber, odId } = data;
      
      const currentAssignment = await db.getMemeAssignment(lobbyId, roundNumber, odId);
      if (!currentAssignment) {
        return callback?.({ success: false, message: 'Assignment non trouvé' });
      }
      
      if (!currentAssignment.templates_history || currentAssignment.templates_history.length <= 1) {
        return callback?.({ success: false, message: 'Pas de template précédent' });
      }
      
      const assignment = await db.undoMemeAssignment(lobbyId, roundNumber, odId);
      
      if (callback) callback({ success: true, assignment });
    } catch (error) {
      console.error('[MEME] Erreur undo:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // ==================== SUBMIT CREATION - VERSION DEBUG ====================
  
  socket.on('meme:submitCreation', async (data, callback) => {
    const startTime = Date.now();
    
    try {
      const { lobbyId, roundNumber, odId, pseudo, templateId, textLayers, finalImageBase64 } = data;
      
      // Log la taille de l'image
      const imageSize = finalImageBase64 ? finalImageBase64.length : 0;
      console.log(`[MEME] ========== SUBMIT CREATION ==========`);
      console.log(`[MEME] From: ${pseudo} (${odId})`);
      console.log(`[MEME] Lobby: ${lobbyId}`);
      console.log(`[MEME] Round: ${roundNumber}`);
      console.log(`[MEME] Template: ${templateId}`);
      console.log(`[MEME] Image size: ${(imageSize / 1024).toFixed(2)} KB`);
      console.log(`[MEME] Text layers: ${textLayers?.length || 0}`);
      
      // Vérifier le lobby
      console.log(`[MEME] Step 1: Getting lobby...`);
      const lobby = await db.getMemeLobbyById(lobbyId);
      console.log(`[MEME] Step 1 done in ${Date.now() - startTime}ms`);
      
      if (!lobby) {
        console.log(`[MEME] ERROR: Lobby not found`);
        return callback?.({ success: false, message: 'Lobby non trouvé' });
      }
      
      console.log(`[MEME] Lobby phase: ${lobby.phase}`);
      
      if (lobby.phase !== 'creation') {
        console.log(`[MEME] ERROR: Wrong phase`);
        return callback?.({ success: false, message: 'La phase de création est terminée' });
      }
      
      // Créer la création
      console.log(`[MEME] Step 2: Creating meme creation...`);
      const creation = await db.createMemeCreation(
        lobbyId,
        roundNumber || lobby.current_round,
        odId,
        pseudo,
        templateId,
        textLayers || [],
        finalImageBase64
      );
      console.log(`[MEME] Step 2 done in ${Date.now() - startTime}ms`);
      console.log(`[MEME] Creation saved: ${creation.id}`);
      
      // Répondre au client IMMÉDIATEMENT
      console.log(`[MEME] Step 3: Sending callback...`);
      if (callback) {
        callback({ success: true, creation });
        console.log(`[MEME] Callback sent in ${Date.now() - startTime}ms`);
      }
      
      // Notifier les autres joueurs
      console.log(`[MEME] Step 4: Notifying room...`);
      io.to(`meme:${lobbyId}`).emit('meme:creationSubmitted', {
        odId,
        pseudo,
        creationId: creation.id
      });
      console.log(`[MEME] Notification sent in ${Date.now() - startTime}ms`);
      
      // Vérifier si tous ont soumis
      console.log(`[MEME] Step 5: Checking all submissions...`);
      const allCreations = await db.getMemeCreationsByLobby(lobbyId, lobby.current_round);
      const participants = lobby.participants || [];
      
      console.log(`[MEME] Submissions: ${allCreations.length}/${participants.length}`);
      
      if (allCreations.length >= participants.length) {
        console.log(`[MEME] Step 6: All submitted, starting voting phase...`);
        
        const updatedLobby = await db.startVotingPhase(lobbyId);
        console.log(`[MEME] Voting phase started in ${Date.now() - startTime}ms`);
        
        const voteTime = updatedLobby.settings?.voteTime || 30;
        
        console.log(`[MEME] Step 7: Emitting votingStarted to room meme:${lobbyId}...`);
        io.to(`meme:${lobbyId}`).emit('meme:votingStarted', {
          lobby: updatedLobby,
          creations: allCreations,
          currentIndex: 0,
          timeRemaining: voteTime
        });
        console.log(`[MEME] votingStarted emitted in ${Date.now() - startTime}ms`);
      }
      
      console.log(`[MEME] ========== SUBMIT COMPLETE in ${Date.now() - startTime}ms ==========`);
      
    } catch (error) {
      console.error(`[MEME] ========== SUBMIT ERROR after ${Date.now() - startTime}ms ==========`);
      console.error('[MEME] Error:', error);
      console.error('[MEME] Stack:', error.stack);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // ==================== VOTING ====================
  
  socket.on('meme:vote', async (data, callback) => {
    try {
      const { lobbyId, creationId, odId, pseudo, voteType, isSuper } = data;
      
      const creation = await db.getMemeCreationById(creationId);
      if (!creation) {
        return callback?.({ success: false, message: 'Création non trouvée' });
      }
      if (creation.player_id === odId) {
        return callback?.({ success: false, message: 'Impossible de voter pour soi-même' });
      }
      
      if (isSuper) {
        const lobby = await db.getMemeLobbyById(lobbyId);
        const participant = (lobby?.participants || []).find(p => p.odId === odId);
        if (participant?.superVoteUsedThisRound) {
          return callback?.({ success: false, message: 'Super vote déjà utilisé' });
        }
        await db.markSuperVoteUsed(lobbyId, odId);
      }
      
      const result = await db.addVoteToCreation(creationId, odId, pseudo, voteType, isSuper);
      
      io.to(`meme:${lobbyId}`).emit('meme:voteReceived', {
        creationId,
        odId,
        voteType,
        isSuper,
        totalScore: result.creation.total_score
      });
      
      if (callback) callback({ success: true, points: result.points });
    } catch (error) {
      console.error('[MEME] Erreur vote:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  socket.on('meme:nextVote', async (data, callback) => {
    try {
      const { lobbyId } = data;
      
      const lobby = await db.advanceToNextVote(lobbyId);
      
      if (lobby.phase === 'results') {
        const creations = await db.getMemeCreationsByLobby(lobbyId, lobby.current_round);
        io.to(`meme:${lobbyId}`).emit('meme:roundResults', { lobby, creations });
      } else {
        const voteTime = lobby.settings?.voteTime || 30;
        io.to(`meme:${lobbyId}`).emit('meme:nextVoteStarted', {
          lobby,
          currentIndex: lobby.current_vote_index,
          timeRemaining: voteTime
        });
      }
      
      if (callback) callback({ success: true, lobby });
    } catch (error) {
      console.error('[MEME] Erreur next vote:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  socket.on('meme:nextRound', async (data, callback) => {
    try {
      const { lobbyId } = data;
      
      const lobby = await db.advanceToNextRound(lobbyId);
      
      if (lobby.phase === 'final') {
        const allCreations = await db.getMemeCreationsByLobby(lobbyId);
        io.to(`meme:${lobbyId}`).emit('meme:gameFinished', { lobby, allCreations });
      } else {
        const tags = lobby.settings?.tags || [];
        const participants = lobby.participants || [];
        const assignedTemplateIds = [];
        
        for (const participant of participants) {
          const template = await db.getRandomMemeTemplate(assignedTemplateIds, tags);
          if (template) {
            await db.createMemeAssignment(lobbyId, lobby.current_round, participant.odId, template.id);
            assignedTemplateIds.push(template.id);
          }
        }
        
        const creationTime = lobby.settings?.creationTime || 120;
        
        io.to(`meme:${lobbyId}`).emit('meme:newRoundStarted', {
          lobby,
          roundNumber: lobby.current_round,
          timeRemaining: creationTime
        });
        
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
      
      if (callback) callback({ success: true, lobby });
    } catch (error) {
      console.error('[MEME] Erreur next round:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // ==================== UTILITIES ====================
  
  socket.on('meme:getLobbyState', async (data, callback) => {
    try {
      const { lobbyId, odId } = data;
      
      const lobby = await db.getMemeLobbyById(lobbyId);
      if (!lobby) {
        return callback?.({ success: false, message: 'Lobby non trouvé' });
      }
      
      let creations = [];
      let assignment = null;
      
      if (lobby.current_round > 0) {
        creations = await db.getMemeCreationsByLobby(lobbyId, lobby.current_round);
        if (odId) {
          assignment = await db.getMemeAssignment(lobbyId, lobby.current_round, odId);
        }
      }
      
      if (callback) callback({ success: true, lobby, creations, assignment });
    } catch (error) {
      console.error('[MEME] Erreur get lobby state:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  socket.on('meme:deleteLobby', async (data, callback) => {
    try {
      const { lobbyId } = data;
      
      await db.deleteMemeLobby(lobbyId);
      
      io.to(`meme:${lobbyId}`).emit('meme:lobbyDeleted', { lobbyId });
      io.emit('meme:lobbyDeleted', { lobbyId });
      
      if (callback) callback({ success: true });
    } catch (error) {
      console.error('[MEME] Erreur delete lobby:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // Déconnexion
  socket.on('disconnect', async () => {
    if (socket.memeLobbyId && socket.memeOdId) {
      try {
        const lobby = await db.getMemeLobbyById(socket.memeLobbyId);
        
        if (lobby && lobby.status === 'playing') {
          console.log(`[MEME] ${socket.memeOdId} disconnected during game, keeping in lobby`);
          io.to(`meme:${socket.memeLobbyId}`).emit('meme:playerDisconnected', {
            odId: socket.memeOdId,
            temporary: true
          });
        } else if (lobby && lobby.status === 'waiting') {
          console.log(`[MEME] ${socket.memeOdId} disconnected from waiting lobby`);
          const updatedLobby = await db.leaveMemeLobby(socket.memeLobbyId, socket.memeOdId);
          if (updatedLobby) {
            io.to(`meme:${socket.memeLobbyId}`).emit('meme:lobbyUpdated', updatedLobby);
          } else {
            io.emit('meme:lobbyDeleted', { lobbyId: socket.memeLobbyId });
          }
        }
      } catch (error) {
        console.error('[MEME] Erreur on disconnect:', error);
      }
    }
  });
};
