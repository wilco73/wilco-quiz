/**
 * Meme Game Socket Handlers
 * Gestion en temps réel des parties Make It Meme
 * 
 * Architecture simplifiée suivant le pattern Mystery :
 * - Socket pour tout (pas d'API REST pour les créations)
 * - Pas de hook dédié, utiliser socketContext directement
 * - Passage automatique entre phases
 */

module.exports = function(io, socket, db) {
  
  // ==================== LOBBY MANAGEMENT ====================
  
  // Créer un lobby meme
  socket.on('meme:createLobby', async (data, callback) => {
    try {
      const { odId, pseudo, settings } = data;
      
      const lobby = await db.createMemeLobby(odId, pseudo, settings);
      
      // Rejoindre la room socket
      socket.join(`meme:${lobby.id}`);
      socket.memeLobbyId = lobby.id;
      socket.memeOdId = odId;
      
      console.log(`[MEME] ${pseudo} created and joined room meme:${lobby.id}`);
      
      // Notifier tout le monde qu'un nouveau lobby existe
      io.emit('meme:lobbyCreated', lobby);
      
      if (callback) callback({ success: true, lobby });
    } catch (error) {
      console.error('[MEME] Erreur création lobby:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // Rejoindre un lobby
  socket.on('meme:joinLobby', async (data, callback) => {
    try {
      const { lobbyId, odId, pseudo } = data;
      
      console.log(`[MEME] joinLobby request: ${pseudo} (${odId}) -> ${lobbyId}`);
      
      // Récupérer le lobby d'abord pour vérifier son état
      let lobby = await db.getMemeLobbyById(lobbyId);
      if (!lobby) {
        return callback?.({ success: false, message: 'Lobby non trouvé' });
      }
      
      const participants = lobby.participants || [];
      const isAlreadyParticipant = participants.some(p => p.odId === odId);
      
      // Si pas encore participant et jeu en cours, refuser
      if (!isAlreadyParticipant && lobby.status !== 'waiting') {
        return callback?.({ success: false, message: 'La partie a déjà commencé' });
      }
      
      // Rejoindre le lobby dans la BDD (ajoute si nouveau, retourne tel quel si déjà dedans)
      if (!isAlreadyParticipant) {
        lobby = await db.joinMemeLobby(lobbyId, odId, pseudo);
      }
      
      // TOUJOURS rejoindre la room socket
      socket.join(`meme:${lobbyId}`);
      socket.memeLobbyId = lobbyId;
      socket.memeOdId = odId;
      
      console.log(`[MEME] ${pseudo} joined room meme:${lobbyId}, status: ${lobby.status}`);
      
      // Notifier les participants
      io.to(`meme:${lobbyId}`).emit('meme:lobbyUpdated', lobby);
      
      // Si le jeu est déjà en cours, envoyer l'état actuel au joueur qui rejoint
      if (lobby.status === 'playing' && lobby.phase) {
        console.log(`[MEME] Game in progress, sending state to ${pseudo}`);
        
        // Calculer le temps restant
        let timeRemaining = 0;
        if (lobby.phase_end_time) {
          const endTime = new Date(lobby.phase_end_time).getTime();
          timeRemaining = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
        } else {
          // Fallback sur les settings
          timeRemaining = lobby.phase === 'creation' 
            ? (lobby.settings?.creationTime || 120)
            : (lobby.settings?.voteTime || 30);
        }
        
        // Envoyer gameStarted pour mettre à jour la phase
        socket.emit('meme:gameStarted', {
          lobby,
          phase: lobby.phase === 'creation' ? 'creating' : lobby.phase,
          roundNumber: lobby.current_round,
          timeRemaining
        });
        
        // Envoyer son assignment s'il existe (phase création)
        if (lobby.phase === 'creation') {
          const assignment = await db.getMemeAssignment(lobbyId, lobby.current_round, odId);
          if (assignment) {
            socket.emit('meme:templateAssigned', { odId, assignment });
          }
        }
        
        // Envoyer les créations si phase vote
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
  
  // Rejoindre un lobby par code court
  socket.on('meme:joinLobbyByCode', async (data, callback) => {
    try {
      const { code, odId, pseudo } = data;
      
      console.log(`[MEME] joinLobbyByCode: ${code} by ${pseudo}`);
      
      const lobby = await db.getMemeLobbyByCode(code);
      if (!lobby) {
        return callback?.({ success: false, message: 'Lobby non trouvé' });
      }
      
      // Réutiliser la logique de joinLobby
      socket.emit('meme:joinLobby', { lobbyId: lobby.id, odId, pseudo }, callback);
      
    } catch (error) {
      console.error('[MEME] joinLobbyByCode error:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // Quitter un lobby
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
  
  // Mettre à jour les settings
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
  
  // Démarrer la partie
  socket.on('meme:startGame', async (data, callback) => {
    try {
      const { lobbyId } = data;
      
      console.log(`[MEME] Starting game for lobby ${lobbyId}`);
      
      // Vérifier le lobby
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
      
      // Démarrer le lobby
      lobby = await db.startMemeLobby(lobbyId);
      
      // Assigner un meme à chaque joueur
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
      
      // Notifier TOUT LE MONDE dans la room
      io.to(`meme:${lobbyId}`).emit('meme:gameStarted', {
        lobby,
        phase: 'creating',
        roundNumber: 1,
        timeRemaining: creationTime
      });
      
      // Envoyer à chaque joueur son meme
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
      
      // Signaler à meme-creations.js de démarrer le timer création
      try {
        const memeCreations = require('../routes/meme-creations');
        if (memeCreations.signalGameStarted) {
          memeCreations.signalGameStarted(lobbyId, creationTime);
        }
      } catch (e) {
        console.error('[MEME] Could not signal gameStarted:', e.message);
      }
      
      if (callback) callback({ success: true, lobby });
    } catch (error) {
      console.error('[MEME] Erreur start game:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // Rotation de template
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
      
      // Récupérer les IDs déjà utilisés
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
  
  // Undo de template
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
  
  // Soumettre une création (via socket, pas API REST)
  socket.on('meme:submitCreation', async (data, callback) => {
    try {
      const { lobbyId, roundNumber, odId, pseudo, templateId, textLayers, finalImageBase64 } = data;
      
      console.log(`[MEME] submitCreation from ${pseudo}`);
      
      // Vérifier le lobby
      const lobby = await db.getMemeLobbyById(lobbyId);
      if (!lobby) {
        return callback?.({ success: false, message: 'Lobby non trouvé' });
      }
      if (lobby.phase !== 'creation') {
        return callback?.({ success: false, message: 'La phase de création est terminée' });
      }
      
      // Créer la création
      const creation = await db.createMemeCreation(
        lobbyId,
        roundNumber || lobby.current_round,
        odId,
        pseudo,
        templateId,
        textLayers || [],
        finalImageBase64
      );
      
      console.log(`[MEME] Creation saved: ${creation.id}`);
      
      // Répondre au client IMMÉDIATEMENT
      if (callback) callback({ success: true, creation });
      
      // Notifier les autres joueurs
      io.to(`meme:${lobbyId}`).emit('meme:creationSubmitted', {
        odId,
        pseudo,
        creationId: creation.id
      });
      
      // Vérifier si tous ont soumis
      const allCreations = await db.getMemeCreationsByLobby(lobbyId, lobby.current_round);
      const participants = lobby.participants || [];
      
      console.log(`[MEME] Submissions: ${allCreations.length}/${participants.length}`);
      
      if (allCreations.length >= participants.length) {
        // Tous ont soumis, passer au vote !
        console.log(`[MEME] All submitted, starting voting phase`);
        
        const updatedLobby = await db.startVotingPhase(lobbyId);
        const voteTime = updatedLobby.settings?.voteTime || 30;
        
        io.to(`meme:${lobbyId}`).emit('meme:votingStarted', {
          lobby: updatedLobby,
          creations: allCreations,
          currentIndex: 0,
          timeRemaining: voteTime
        });
      }
      
    } catch (error) {
      console.error('[MEME] Erreur submit creation:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // Notification qu'une création a été soumise via API REST
  socket.on('meme:creationSubmittedNotify', async (data) => {
    try {
      const { lobbyId, odId, pseudo, creationId, allSubmitted } = data;
      
      console.log(`[MEME] creationSubmittedNotify from ${pseudo}, allSubmitted: ${allSubmitted}`);
      
      // Notifier les autres joueurs
      io.to(`meme:${lobbyId}`).emit('meme:creationSubmitted', {
        odId,
        pseudo,
        creationId
      });
      
      // Si tous ont soumis, passer au vote
      if (allSubmitted) {
        console.log(`[MEME] All submitted, starting voting phase`);
        
        const lobby = await db.getMemeLobbyById(lobbyId);
        if (lobby && lobby.phase === 'creation') {
          const updatedLobby = await db.startVotingPhase(lobbyId);
          const creations = await db.getMemeCreationsByLobby(lobbyId, updatedLobby.current_round);
          const voteTime = updatedLobby.settings?.voteTime || 30;
          
          io.to(`meme:${lobbyId}`).emit('meme:votingStarted', {
            lobby: updatedLobby,
            creations,
            currentIndex: 0,
            timeRemaining: voteTime
          });
        }
      }
      
    } catch (error) {
      console.error('[MEME] Erreur creationSubmittedNotify:', error);
    }
  });
  
  // ==================== VOTING ====================
  
  // Voter
  socket.on('meme:vote', async (data, callback) => {
    try {
      const { lobbyId, creationId, odId, pseudo, voteType, isSuper } = data;
      
      // Vérifier qu'on ne vote pas pour soi-même
      const creation = await db.getMemeCreationById(creationId);
      if (!creation) {
        return callback?.({ success: false, message: 'Création non trouvée' });
      }
      if (creation.player_id === odId) {
        return callback?.({ success: false, message: 'Impossible de voter pour soi-même' });
      }
      
      // Vérifier super vote
      const lobby = await db.getMemeLobbyById(lobbyId);
      if (isSuper) {
        const participant = (lobby?.participants || []).find(p => p.odId === odId);
        if (participant?.superVoteUsedThisRound) {
          return callback?.({ success: false, message: 'Super vote déjà utilisé' });
        }
        await db.markSuperVoteUsed(lobbyId, odId);
      }
      
      const result = await db.addVoteToCreation(creationId, odId, pseudo, voteType, isSuper);
      
      // Notifier tout le monde du vote
      io.to(`meme:${lobbyId}`).emit('meme:voteReceived', {
        creationId,
        odId,
        voteType,
        isSuper,
        totalScore: result.creation.total_score
      });
      
      if (callback) callback({ success: true, points: result.points });
      
      // Vérifier si tous ont voté pour cette création
      const updatedCreation = await db.getMemeCreationById(creationId);
      const votes = updatedCreation.votes || [];
      const participants = lobby?.participants || [];
      // Nombre de votants attendus = tous sauf l'auteur
      const expectedVoters = participants.length - 1;
      
      console.log(`[MEME] Votes for creation ${creationId}: ${votes.length}/${expectedVoters}`);
      
      if (votes.length >= expectedVoters) {
        console.log(`[MEME] All voted! Signaling to advance...`);
        // Signaler à meme-creations.js d'avancer
        try {
          const memeCreations = require('../routes/meme-creations');
          if (memeCreations.signalAllVoted) {
            memeCreations.signalAllVoted(lobbyId);
          }
        } catch (e) {
          console.error('[MEME] Could not signal allVoted:', e.message);
        }
      }
      
    } catch (error) {
      console.error('[MEME] Erreur vote:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // Passer au vote suivant
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
  
  // Passer à la manche suivante
  socket.on('meme:nextRound', async (data, callback) => {
    try {
      const { lobbyId } = data;
      
      const lobby = await db.advanceToNextRound(lobbyId);
      
      if (lobby.phase === 'final') {
        const allCreations = await db.getMemeCreationsByLobby(lobbyId);
        io.to(`meme:${lobbyId}`).emit('meme:gameFinished', { lobby, allCreations });
      } else {
        // Nouvelle manche - assigner les memes
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
  
  // Rejouer avec les mêmes joueurs
  socket.on('meme:playAgain', async (data, callback) => {
    try {
      const { lobbyId } = data;
      
      console.log(`[MEME] Play again requested for ${lobbyId}`);
      
      const lobby = await db.getMemeLobbyById(lobbyId);
      if (!lobby) {
        return callback?.({ success: false, message: 'Lobby non trouvé' });
      }
      
      // Réinitialiser les scores des participants
      const participants = (lobby.participants || []).map(p => ({
        ...p,
        score: 0,
        hasSubmitted: false,
        superVoteUsedThisRound: false
      }));
      
      // Reset le lobby
      const resetLobby = await db.resetMemeLobbyForReplay(lobbyId, participants);
      
      // Supprimer les anciennes créations et assignments
      await db.deleteMemeCreationsByLobby(lobbyId);
      await db.deleteMemeAssignmentsByLobby(lobbyId);
      
      console.log(`[MEME] Lobby reset, notifying players`);
      
      // Notifier tous les joueurs
      io.to(`meme:${lobbyId}`).emit('meme:lobbyReset', { lobby: resetLobby });
      
      if (callback) callback({ success: true, lobby: resetLobby });
    } catch (error) {
      console.error('[MEME] Erreur play again:', error);
      if (callback) callback({ success: false, message: error.message });
    }
  });
  
  // Déconnexion
  socket.on('disconnect', async () => {
    if (socket.memeLobbyId && socket.memeOdId) {
      try {
        const lobby = await db.getMemeLobbyById(socket.memeLobbyId);
        
        if (lobby && lobby.status === 'playing') {
          // Jeu en cours - garder le joueur, il peut revenir
          console.log(`[MEME] ${socket.memeOdId} disconnected during game, keeping in lobby`);
          io.to(`meme:${socket.memeLobbyId}`).emit('meme:playerDisconnected', {
            odId: socket.memeOdId,
            temporary: true
          });
        } else if (lobby && lobby.status === 'waiting') {
          // En attente - retirer le joueur
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
