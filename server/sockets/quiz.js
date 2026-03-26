/**
 * Handlers Socket.IO pour les quiz et lobbies
 */

const db = require('../database');
const { getQuizQuestions, getLobbyWithTimer } = require('../utils/helpers');
const { broadcastLobbyState, broadcastLobbiesUpdate, broadcastTeamsUpdate } = require('../utils/broadcast');
const timers = require('../utils/timers');

function register(socket, io) {
  
  // ==================== LOBBY MANAGEMENT ====================
  
  socket.on('lobby:create', async (data, callback) => {
    const { quizId, shuffle, trainingMode } = data;
    
    const quiz = await db.getQuizById(quizId);
    if (!quiz) {
      callback({ success: false, message: 'Quiz introuvable' });
      return;
    }
    
    const lobby = await db.createLobby(quizId, shuffle, trainingMode);
    console.log(`[LOBBY] Créé: ${lobby.id} pour quiz "${quiz.title}"${trainingMode ? ' (MODE ENTRAÎNEMENT)' : ''}`);
    
    await broadcastLobbiesUpdate(io);
    callback({ success: true, lobby });
  });
  
  socket.on('lobby:join', async (data, callback) => {
    const { lobbyId, odId, pseudo, teamName } = data;
    
    const lobby = await db.getLobbyById(lobbyId);
    if (!lobby) {
      callback({ success: false, message: 'Lobby introuvable' });
      return;
    }
    
    // Vérifier si déjà dans le lobby
    const alreadyInLobby = lobby.participants?.some(p => p.participantId === odId);
    
    // Refuser si le quiz est terminé
    if (!alreadyInLobby && lobby.status === 'finished') {
      callback({ success: false, message: 'Le quiz est terminé' });
      return;
    }
    
    // Si pas encore dans le lobby, l'ajouter
    if (!alreadyInLobby) {
      await db.joinLobby(lobbyId, odId, pseudo, teamName);
      
      // Si le quiz est en cours, marquer les questions passées comme "manquées"
      if (lobby.status === 'playing' && lobby.session) {
        const quiz = await db.getQuizById(lobby.quizId);
        const questions = lobby.shuffled && lobby.shuffledQuestions 
          ? lobby.shuffledQuestions 
          : quiz?.questions || [];
        
        // Marquer toutes les questions déjà passées comme répondues (vide)
        for (let i = 0; i < lobby.session.currentQuestionIndex; i++) {
          const question = questions[i];
          if (question) {
            await db.submitAnswer(lobbyId, odId, question.id, '');
            await db.validateAnswer(lobbyId, odId, question.id, false);
          }
        }
        console.log(`[LOBBY] ${pseudo} rejoint en cours - ${lobby.session.currentQuestionIndex} questions manquées`);
      }
    }
    
    // TOUJOURS rejoindre la room Socket.IO
    socket.join(`lobby:${lobbyId}`);
    socket.lobbyId = lobbyId;
    socket.odId = odId;
    
    const updatedLobby = await db.getLobbyById(lobbyId);
    const quiz = await db.getQuizById(updatedLobby.quizId);
    
    console.log(`[LOBBY] ${pseudo} a rejoint ${lobbyId}`);
    
    // Notifier tous les participants du lobby
    if (!alreadyInLobby) {
      io.to(`lobby:${lobbyId}`).emit('lobby:participantJoined', {
        participant: { odId, pseudo, teamName },
        lobby: updatedLobby
      });
    }
    
    await broadcastLobbyState(io, lobbyId);
    await broadcastLobbiesUpdate(io);
    callback({ success: true, lobby: getLobbyWithTimer(updatedLobby), quiz });
  });
  
  socket.on('lobby:leave', async (data, callback) => {
    const { lobbyId, odId } = data;
    
    await db.leaveLobby(lobbyId, odId);
    socket.leave(`lobby:${lobbyId}`);
    delete socket.lobbyId;
    delete socket.odId;
    
    console.log(`[LOBBY] Participant ${odId} a quitté ${lobbyId}`);
    
    io.to(`lobby:${lobbyId}`).emit('lobby:participantLeft', { odId });
    
    await broadcastLobbyState(io, lobbyId);
    await broadcastLobbiesUpdate(io);
    
    if (callback) callback({ success: true });
  });
  
  socket.on('lobby:delete', async (data, callback) => {
    const { lobbyId } = data;
    
    timers.stopTimer(lobbyId);
    await db.deleteLobby(lobbyId);
    
    io.to(`lobby:${lobbyId}`).emit('lobby:deleted', { lobbyId });
    io.socketsLeave(`lobby:${lobbyId}`);
    
    console.log(`[LOBBY] Supprimé: ${lobbyId}`);
    
    await broadcastLobbiesUpdate(io);
    if (callback) callback({ success: true });
  });
  
  socket.on('lobby:stop', async (data, callback) => {
    const { lobbyId } = data;
    
    const lobby = await db.getLobbyById(lobbyId);
    if (!lobby) {
      callback({ success: false, message: 'Lobby introuvable' });
      return;
    }
    
    if (lobby.status !== 'playing') {
      callback({ success: false, message: 'Le quiz n\'est pas en cours' });
      return;
    }
    
    timers.stopTimer(lobbyId);
    await db.resetLobby(lobbyId);
    
    const updatedLobby = await db.getLobbyById(lobbyId);
    
    io.to(`lobby:${lobbyId}`).emit('lobby:stopped', { 
      lobbyId,
      lobby: updatedLobby,
      message: 'Le quiz a été arrêté par l\'administrateur'
    });
    
    console.log(`[LOBBY] Quiz arrêté: ${lobbyId}`);
    
    await broadcastLobbyState(io, lobbyId);
    await broadcastLobbiesUpdate(io);
    
    callback({ success: true });
  });
  
  // ==================== QUIZ FLOW ====================
  
  socket.on('quiz:start', async (data, callback) => {
    const { lobbyId } = data;
    
    const lobby = await db.getLobbyById(lobbyId);
    if (!lobby) {
      callback({ success: false, message: 'Lobby introuvable' });
      return;
    }
    
    await db.startLobby(lobbyId);
    const updatedLobby = await db.getLobbyById(lobbyId);
    const quiz = await db.getQuizById(updatedLobby.quizId);
    const questions = getQuizQuestions(updatedLobby, quiz);
    
    // Démarrer le timer si la première question en a un
    const firstQuestion = questions[0];
    if (firstQuestion && firstQuestion.timer > 0) {
      timers.startTimer(lobbyId, firstQuestion.timer, firstQuestion.id);
    }
    
    console.log(`[QUIZ] Démarré: lobby ${lobbyId}`);
    
    io.to(`lobby:${lobbyId}`).emit('quiz:started', {
      lobby: getLobbyWithTimer(updatedLobby),
      quiz,
      currentQuestion: firstQuestion,
      questionIndex: 0
    });
    
    await broadcastLobbiesUpdate(io);
    callback({ success: true });
  });
  
  socket.on('quiz:nextQuestion', async (data, callback) => {
    const { lobbyId } = data;
    
    const lobby = await db.getLobbyById(lobbyId);
    if (!lobby) {
      callback({ success: false, message: 'Lobby introuvable' });
      return;
    }
    
    const quiz = await db.getQuizById(lobby.quizId);
    const questions = getQuizQuestions(lobby, quiz);
    const nextIndex = (lobby.session?.currentQuestionIndex || 0) + 1;
    
    if (nextIndex >= questions.length) {
      // Quiz terminé
      timers.stopTimer(lobbyId);
      await db.finishLobby(lobbyId);
      
      const finishedLobby = await db.getLobbyById(lobbyId);
      
      io.to(`lobby:${lobbyId}`).emit('quiz:finished', { 
        lobbyId,
        lobby: getLobbyWithTimer(finishedLobby),
        quiz
      });
      await broadcastLobbyState(io, lobbyId);
      await broadcastLobbiesUpdate(io);
      
      callback({ success: true, finished: true });
      return;
    }
    
    // Arrêter l'ancien timer
    timers.stopTimer(lobbyId);
    
    // Passer à la question suivante
    await db.updateLobbyQuestionIndex(lobbyId, nextIndex);
    
    const nextQuestion = questions[nextIndex];
    
    // Démarrer le nouveau timer si nécessaire
    if (nextQuestion && nextQuestion.timer > 0) {
      timers.startTimer(lobbyId, nextQuestion.timer, nextQuestion.id);
    }
    
    const updatedLobby = await db.getLobbyById(lobbyId);
    
    console.log(`[QUIZ] Question ${nextIndex + 1}/${questions.length} pour lobby ${lobbyId}`);
    
    io.to(`lobby:${lobbyId}`).emit('quiz:questionChanged', {
      lobby: getLobbyWithTimer(updatedLobby),
      currentQuestion: nextQuestion,
      questionIndex: nextIndex,
      totalQuestions: questions.length
    });
    
    // Broadcast pour que l'admin voie la progression
    await broadcastLobbiesUpdate(io);
    callback({ success: true, questionIndex: nextIndex });
  });
  
  // ==================== ANSWERS ====================
  
  socket.on('answer:draft', async (data) => {
    const { lobbyId, odId, answer } = data;
    
    await db.autoSaveAnswer(lobbyId, odId, answer);
    
    io.to(`lobby:${lobbyId}`).emit('answer:draftUpdated', {
      odId,
      answer,
      timestamp: Date.now()
    });
  });
  
  socket.on('answer:paste', async (data) => {
    const { lobbyId, odId, questionId, pastedText } = data;
    
    console.log(`[PASTE] ${odId} a fait un copier-coller: "${pastedText?.substring(0, 50)}..."`);
    
    await db.markAnswerPasted(lobbyId, odId, questionId);
    
    io.to(`lobby:${lobbyId}`).emit('answer:pasteDetected', {
      odId,
      questionId,
      timestamp: Date.now()
    });
  });
  
  socket.on('answer:submit', async (data, callback) => {
    const { lobbyId, odId, questionId, answer } = data;
    
    const lobby = await db.getLobbyById(lobbyId);
    if (!lobby) {
      callback({ success: false, message: 'Lobby introuvable' });
      return;
    }
    
    // Vérifier si déjà répondu
    const participant = lobby.participants.find(p => p.participantId === odId);
    if (participant && participant.hasAnswered) {
      callback({ success: false, message: 'Réponse déjà soumise' });
      return;
    }
    
    await db.submitAnswer(lobbyId, odId, questionId, answer);
    
    const updatedLobby = await db.getLobbyById(lobbyId);
    const quiz = await db.getQuizById(lobby.quizId);
    const questions = getQuizQuestions(lobby, quiz);
    const currentQuestion = questions[updatedLobby.session?.currentQuestionIndex || 0];
    
    // Catégorie du quiz (groupName) pour attribution des points
    const quizCategory = quiz?.groupName || 'Sans catégorie';
    
    // Auto-validation pour QCM
    let autoValidated = false;
    if (currentQuestion && currentQuestion.type === 'qcm') {
      const isCorrect = answer.toLowerCase().trim() === currentQuestion.answer.toLowerCase().trim();
      await db.validateAnswer(lobbyId, odId, questionId, isCorrect);
      autoValidated = true;
      
      // Attribution automatique des points pour QCM (sauf mode entraînement)
      if (isCorrect && !updatedLobby.trainingMode) {
        const updatedParticipant = updatedLobby.participants.find(p => p.participantId === odId);
        if (updatedParticipant && updatedParticipant.teamName) {
          const validation = await db.getParticipantValidation(lobbyId, odId, questionId);
          if (!validation?.qcm_team_scored) {
            const team = await db.getTeamByName(updatedParticipant.teamName);
            if (team) {
              await db.addTeamScoreByCategory(team.id, quizCategory, currentQuestion.points || 1);
              await db.markQcmTeamScored(lobbyId, odId, questionId);
            }
          }
        }
      }
    }
    
    // Auto-rejet pour réponses vides
    if (!answer || answer.trim() === '') {
      await db.validateAnswer(lobbyId, odId, questionId, false);
      autoValidated = true;
    }
    
    console.log(`[ANSWER] ${odId} a soumis: "${answer}" (auto-validated: ${autoValidated})`);
    
    io.to(`lobby:${lobbyId}`).emit('answer:submitted', {
      odId,
      hasAnswered: true,
      autoValidated
    });
    
    // Broadcast ciblé : lobby pour les joueurs + lobbies pour l'admin
    await broadcastLobbyState(io, lobbyId);
    await broadcastLobbiesUpdate(io);
    if (autoValidated) {
      await broadcastTeamsUpdate(io);
    }
    callback({ success: true, autoValidated });
  });
  
  socket.on('answer:validate', async (data, callback) => {
    const { lobbyId, odId, questionId, isCorrect, points } = data;
    
    await db.validateAnswer(lobbyId, odId, questionId, isCorrect);
    
    const lobby = await db.getLobbyById(lobbyId);
    
    // Récupérer la catégorie du quiz
    const quiz = await db.getQuizById(lobby?.quizId);
    const quizCategory = quiz?.groupName || 'Sans catégorie';
    
    // Ajouter les points seulement si correct ET pas en mode entraînement
    if (isCorrect && !lobby?.trainingMode) {
      const participant = lobby?.participants.find(p => p.participantId === odId);
      
      if (participant && participant.teamName) {
        const team = await db.getTeamByName(participant.teamName);
        if (team) {
          await db.addTeamScoreByCategory(team.id, quizCategory, points || 1);
          console.log(`[SCORE] +${points || 1} point(s) pour équipe "${participant.teamName}" dans catégorie "${quizCategory}"`);
        }
      }
    }
    
    console.log(`[VALIDATE] ${odId}: ${isCorrect ? 'CORRECT' : 'INCORRECT'}${lobby?.trainingMode ? ' (mode entraînement - pas de points)' : ''}`);
    
    io.to(`lobby:${lobbyId}`).emit('answer:validated', {
      odId,
      questionId,
      isCorrect
    });
    
    await broadcastLobbyState(io, lobbyId);
    await broadcastLobbiesUpdate(io);
    // Broadcast équipes si le score a changé (pas en mode entraînement)
    if (isCorrect && !lobby?.trainingMode) {
      await broadcastTeamsUpdate(io);
    }
    
    callback({ success: true });
  });
  
  // ==================== ADMIN OPERATIONS ====================
  
  socket.on('admin:joinMonitoring', async (data) => {
    const { lobbyId } = data;
    socket.join(`lobby:${lobbyId}`);
    console.log(`[ADMIN] Rejoint le monitoring de ${lobbyId}`);
  });
  
  socket.on('admin:leaveMonitoring', async (data) => {
    const { lobbyId } = data;
    socket.leave(`lobby:${lobbyId}`);
    console.log(`[ADMIN] Quitté le monitoring de ${lobbyId}`);
  });
  
  socket.on('admin:resetScores', async (data, callback) => {
    await db.resetAllTeamScores();
    console.log(`[ADMIN] Reset des scores de toutes les équipes`);
    await broadcastTeamsUpdate(io);
    if (callback) callback({ success: true });
  });
}

module.exports = { register };