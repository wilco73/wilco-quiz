/**
 * Handlers Socket.IO pour les quiz et lobbies
 * Version optimisée v2 - Meilleure gestion des erreurs et performance
 */

const db = require('../database');
const { getQuizQuestions, getLobbyWithTimer } = require('../utils/helpers');
const { 
  broadcastLobbyState, 
  broadcastLobbyStateImmediate,
  broadcastLobbiesUpdate, 
  broadcastLobbiesUpdateImmediate,
  broadcastTeamsUpdate 
} = require('../utils/broadcast');
const timers = require('../utils/timers');

// Ordre d'affichage mélangé (déterministe par question.id) pour le type "classement d'images".
// Garantit que TOUS les participants voient exactement le même ordre au départ.
function attachDisplayOrder(question) {
  if (!question || question.type !== 'image_order') return question;
  const n = (question.choices || []).length;
  if (n === 0) return question;
  const seed = String(question.id || '');
  let s = 0;
  for (let k = 0; k < seed.length; k++) s = (s * 31 + seed.charCodeAt(k)) >>> 0;
  const rand = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // Éviter que l'ordre affiché soit pile le bon ordre
  if (order.every((v, i) => v === i) && n > 1) order.push(order.shift());
  return { ...question, displayOrder: order };
}

function register(socket, io) {
  
  // ==================== LOBBY MANAGEMENT ====================
  
  socket.on('lobby:create', async (data, callback) => {
    try {
      const { quizId, shuffle, trainingMode } = data;
      
      const quiz = await db.getQuizById(quizId);
      if (!quiz) {
        callback({ success: false, message: 'Quiz introuvable' });
        return;
      }
      
      const lobby = await db.createLobby(quizId, shuffle, trainingMode);
      console.log(`[LOBBY] Créé: ${lobby.id} pour quiz "${quiz.title}"${trainingMode ? ' (MODE ENTRAÎNEMENT)' : ''}`);
      
      // Broadcast immédiat pour la création
      await broadcastLobbiesUpdateImmediate(io);
      callback({ success: true, lobby });
    } catch (error) {
      console.error('[LOBBY:CREATE] Erreur:', error.message);
      callback({ success: false, message: 'Erreur serveur: ' + error.message });
    }
  });
  
  socket.on('lobby:join', async (data, callback) => {
    try {
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
      
      // Broadcasts avec debounce (sauf le callback qui est immédiat)
      broadcastLobbyState(io, lobbyId);
      broadcastLobbiesUpdate(io);
      callback({ success: true, lobby: getLobbyWithTimer(updatedLobby), quiz });
    } catch (error) {
      console.error('[LOBBY:JOIN] Erreur:', error.message);
      callback({ success: false, message: 'Erreur serveur: ' + error.message });
    }
  });
  
  socket.on('lobby:leave', async (data, callback) => {
    try {
      const { lobbyId, odId } = data;
      
      await db.leaveLobby(lobbyId, odId);
      socket.leave(`lobby:${lobbyId}`);
      delete socket.lobbyId;
      delete socket.odId;
      
      console.log(`[LOBBY] Participant ${odId} a quitté ${lobbyId}`);
      
      io.to(`lobby:${lobbyId}`).emit('lobby:participantLeft', { odId });
      
      broadcastLobbyState(io, lobbyId);
      broadcastLobbiesUpdate(io);
      
      if (callback) callback({ success: true });
    } catch (error) {
      console.error('[LOBBY:LEAVE] Erreur:', error.message);
      if (callback) callback({ success: false, message: 'Erreur serveur' });
    }
  });
  
  socket.on('lobby:delete', async (data, callback) => {
    try {
      const { lobbyId } = data;
      
      timers.stopTimer(lobbyId);
      await db.deleteLobby(lobbyId);
      
      io.to(`lobby:${lobbyId}`).emit('lobby:deleted', { lobbyId });
      io.socketsLeave(`lobby:${lobbyId}`);
      
      console.log(`[LOBBY] Supprimé: ${lobbyId}`);
      
      await broadcastLobbiesUpdateImmediate(io);
      if (callback) callback({ success: true });
    } catch (error) {
      console.error('[LOBBY:DELETE] Erreur:', error.message);
      if (callback) callback({ success: false, message: 'Erreur serveur' });
    }
  });
  
  socket.on('lobby:stop', async (data, callback) => {
    try {
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
      
      await broadcastLobbyStateImmediate(io, lobbyId);
      await broadcastLobbiesUpdateImmediate(io);
      
      callback({ success: true });
    } catch (error) {
      console.error('[LOBBY:STOP] Erreur:', error.message);
      callback({ success: false, message: 'Erreur serveur' });
    }
  });
  
  // ==================== QUIZ FLOW ====================
  
  socket.on('quiz:start', async (data, callback) => {
    try {
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
      
      // Émission immédiate pour le démarrage (action critique)
      io.to(`lobby:${lobbyId}`).emit('quiz:started', {
        lobby: getLobbyWithTimer(updatedLobby),
        quiz,
        currentQuestion: attachDisplayOrder(firstQuestion),
        questionIndex: 0
      });
      
      await broadcastLobbiesUpdateImmediate(io);
      callback({ success: true });
    } catch (error) {
      console.error('[QUIZ:START] Erreur:', error.message);
      callback({ success: false, message: 'Erreur serveur' });
    }
  });
  
  socket.on('quiz:nextQuestion', async (data, callback) => {
    try {
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
        await broadcastLobbyStateImmediate(io, lobbyId);
        await broadcastLobbiesUpdateImmediate(io);
        
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
      
      // Émission immédiate pour le changement de question (action critique)
      io.to(`lobby:${lobbyId}`).emit('quiz:questionChanged', {
        lobby: getLobbyWithTimer(updatedLobby),
        currentQuestion: attachDisplayOrder(nextQuestion),
        questionIndex: nextIndex,
        totalQuestions: questions.length
      });
      
      // Broadcast pour l'admin (peut être débounced)
      broadcastLobbiesUpdate(io);
      callback({ success: true, questionIndex: nextIndex });
    } catch (error) {
      console.error('[QUIZ:NEXT] Erreur:', error.message);
      callback({ success: false, message: 'Erreur serveur' });
    }
  });
  
  // ==================== ANSWERS ====================
  
  socket.on('answer:draft', async (data) => {
    try {
      const { lobbyId, odId, answer } = data;
      
      await db.autoSaveAnswer(lobbyId, odId, answer);
      
      io.to(`lobby:${lobbyId}`).emit('answer:draftUpdated', {
        odId,
        answer,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('[ANSWER:DRAFT] Erreur:', error.message);
    }
  });
  
  socket.on('answer:paste', async (data) => {
    try {
      const { lobbyId, odId, questionId, pastedText } = data;
      
      console.log(`[PASTE] ${odId} a fait un copier-coller: "${pastedText?.substring(0, 50)}..."`);
      
      await db.markAnswerPasted(lobbyId, odId, questionId);
      
      io.to(`lobby:${lobbyId}`).emit('answer:pasteDetected', {
        odId,
        questionId,
        timestamp: Date.now()
      });
    } catch (error) {
      console.error('[ANSWER:PASTE] Erreur:', error.message);
    }
  });
  
  socket.on('answer:submit', async (data, callback) => {
    try {
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
      
      // Auto-validation QCM + classement d'images : l'équipe ne marque QUE si
      // TOUS les membres ont répondu ET ont tous la bonne réponse (anti-brute-force).
      let autoValidated = false;
      if (currentQuestion && (currentQuestion.type === 'qcm' || currentQuestion.type === 'image_order')) {
        const norm = (s) => String(s || '').toLowerCase().trim();
        const isCorrect = norm(answer) === norm(currentQuestion.answer);
        await db.validateAnswer(lobbyId, odId, questionId, isCorrect);
        autoValidated = true;

        if (!updatedLobby.trainingMode) {
          const me = updatedLobby.participants.find(p => p.participantId === odId);
          if (me && me.teamName) {
            const teammates = updatedLobby.participants.filter(p => p.teamName === me.teamName);
            const allAnswered = teammates.every(p => p.answersByQuestionId?.[questionId] !== undefined);
            const allCorrect = teammates.every(p => norm(p.answersByQuestionId?.[questionId]) === norm(currentQuestion.answer));

            if (allAnswered && allCorrect) {
              const alreadyScored = await db.hasTeamScoredForQuestion(lobbyId, me.teamName, questionId);
              if (!alreadyScored) {
                const team = await db.getTeamByName(me.teamName);
                if (team) {
                  await db.addTeamScoreByCategory(team.id, quizCategory, currentQuestion.points || 1);
                  await db.markQcmTeamScored(lobbyId, odId, questionId);
                  console.log(`[SCORE ÉQUIPE] "${me.teamName}" tous corrects (${currentQuestion.type}) -> +${currentQuestion.points || 1}`);
                }
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
      
      console.log(`[ANSWER] ${odId} a soumis: "${answer?.substring(0, 30)}" (auto-validated: ${autoValidated})`);
      
      io.to(`lobby:${lobbyId}`).emit('answer:submitted', {
        odId,
        hasAnswered: true,
        autoValidated
      });
      
      // Broadcasts avec debounce
      broadcastLobbyState(io, lobbyId);
      broadcastLobbiesUpdate(io);
      if (autoValidated) {
        broadcastTeamsUpdate(io);
      }
      callback({ success: true, autoValidated });
    } catch (error) {
      console.error('[ANSWER:SUBMIT] Erreur:', error.message);
      callback({ success: false, message: 'Erreur serveur' });
    }
  });
  
  socket.on('answer:validate', async (data, callback) => {
    try {
      const { lobbyId, odId, questionId, isCorrect, points } = data;
      
      const lobby = await db.getLobbyById(lobbyId);
      if (!lobby) {
        callback({ success: false, message: 'Lobby introuvable' });
        return;
      }
      
      // Récupérer la catégorie du quiz
      const quiz = await db.getQuizById(lobby.quizId);
      const quizCategory = quiz?.groupName || 'Sans catégorie';
      
      // Trouver le participant
      const participant = lobby.participants.find(p => p.participantId === odId);
      
      // Vérifier si l'équipe a DÉJÀ scoré pour cette question AVANT de valider
      let teamAlreadyScored = false;
      if (isCorrect && participant && participant.teamName) {
        teamAlreadyScored = await db.hasTeamScoredForQuestion(lobbyId, participant.teamName, questionId);
        if (teamAlreadyScored) {
          console.log(`[VALIDATE] Équipe "${participant.teamName}" a déjà scoré pour question ${questionId} - pas de double points`);
        }
      }
      
      // Valider la réponse
      await db.validateAnswer(lobbyId, odId, questionId, isCorrect);
      
      // Ajouter les points SEULEMENT si :
      // - La réponse est correcte
      // - Pas en mode entraînement
      // - L'équipe n'a PAS DÉJÀ scoré pour cette question
      if (isCorrect && !lobby.trainingMode && !teamAlreadyScored) {
        if (participant && participant.teamName) {
          const team = await db.getTeamByName(participant.teamName);
          if (team) {
            await db.addTeamScoreByCategory(team.id, quizCategory, points || 1);
            console.log(`[SCORE] +${points || 1} point(s) pour équipe "${participant.teamName}" dans catégorie "${quizCategory}"`);
          }
        }
      }
      
      console.log(`[VALIDATE] ${odId}: ${isCorrect ? 'CORRECT' : 'INCORRECT'}${lobby.trainingMode ? ' (mode entraînement - pas de points)' : ''}${teamAlreadyScored ? ' (équipe déjà scoré)' : ''}`);
      
      io.to(`lobby:${lobbyId}`).emit('answer:validated', {
        odId,
        questionId,
        isCorrect
      });
      
      broadcastLobbyState(io, lobbyId);
      broadcastLobbiesUpdate(io);
      // Broadcast équipes si le score a changé (pas en mode entraînement et pas déjà scoré)
      if (isCorrect && !lobby.trainingMode && !teamAlreadyScored) {
        broadcastTeamsUpdate(io);
      }
      
      callback({ success: true });
    } catch (error) {
      console.error('[ANSWER:VALIDATE] Erreur:', error.message);
      callback({ success: false, message: 'Erreur serveur' });
    }
  });
  
  // ==================== ADMIN OPERATIONS ====================
  
  socket.on('admin:joinMonitoring', async (data) => {
    try {
      const { lobbyId } = data;
      socket.join(`lobby:${lobbyId}`);
      console.log(`[ADMIN] Rejoint le monitoring de ${lobbyId}`);
    } catch (error) {
      console.error('[ADMIN:JOIN] Erreur:', error.message);
    }
  });
  
  socket.on('admin:leaveMonitoring', async (data) => {
    try {
      const { lobbyId } = data;
      socket.leave(`lobby:${lobbyId}`);
      console.log(`[ADMIN] Quitté le monitoring de ${lobbyId}`);
    } catch (error) {
      console.error('[ADMIN:LEAVE] Erreur:', error.message);
    }
  });
  
  socket.on('admin:resetScores', async (data, callback) => {
    try {
      await db.resetAllTeamScores();
      console.log(`[ADMIN] Reset des scores de toutes les équipes`);
      await broadcastTeamsUpdate(io);
      if (callback) callback({ success: true });
    } catch (error) {
      console.error('[ADMIN:RESET] Erreur:', error.message);
      if (callback) callback({ success: false, message: 'Erreur serveur' });
    }
  });
}

module.exports = { register };