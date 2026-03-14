/**
 * Handlers Socket.IO pour le dessin collaboratif et les lobbies de dessin
 */

const db = require('../database');
const { pictionaryGames, pictionaryTimers } = require('../utils/state');
const { broadcastGlobalState } = require('../utils/broadcast');

function register(socket, io) {
  
  // ==================== DESSIN COLLABORATIF ====================
  
  // Recevoir et broadcaster un trait de dessin
  socket.on('drawing:stroke', async (data) => {
    const { lobbyId, teamId, odId, points, color, width, opacity, complete } = data;
    
    const gameState = pictionaryGames.get(lobbyId);
    const isRelay = gameState?.gameType === 'relay';
    
    const strokeData = {
      lobbyId, teamId, odId, points, color, width, opacity, complete, timestamp: Date.now()
    };
    
    if (isRelay && teamId) {
      socket.to(`relay:${lobbyId}:${teamId}`).emit('drawing:stroke', strokeData);
      socket.to(`relay:${lobbyId}:admin`).emit('drawing:stroke', strokeData);
    } else {
      socket.to(`drawing:${lobbyId}`).emit('drawing:stroke', strokeData);
    }
  });
  
  // Recevoir et broadcaster une forme
  socket.on('drawing:shape', async (data) => {
    const { lobbyId, teamId, odId, shapeType, startX, startY, endX, endY, color, width, opacity, fill } = data;
    
    const gameState = pictionaryGames.get(lobbyId);
    const isRelay = gameState?.gameType === 'relay';
    
    const shapeData = {
      lobbyId, teamId, odId, shapeType, startX, startY, endX, endY, 
      color, width, opacity, fill, timestamp: Date.now()
    };
    
    if (isRelay && teamId) {
      socket.to(`relay:${lobbyId}:${teamId}`).emit('drawing:shape', shapeData);
      socket.to(`relay:${lobbyId}:admin`).emit('drawing:shape', shapeData);
    } else {
      socket.to(`drawing:${lobbyId}`).emit('drawing:shape', shapeData);
    }
  });
  
  // Recevoir et broadcaster un remplissage
  socket.on('drawing:fill', async (data) => {
    const { lobbyId, teamId, odId, x, y, color, opacity } = data;
    
    const gameState = pictionaryGames.get(lobbyId);
    const isRelay = gameState?.gameType === 'relay';
    
    const fillData = { lobbyId, teamId, odId, x, y, color, opacity, timestamp: Date.now() };
    
    if (isRelay && teamId) {
      socket.to(`relay:${lobbyId}:${teamId}`).emit('drawing:fill', fillData);
      socket.to(`relay:${lobbyId}:admin`).emit('drawing:fill', fillData);
    } else {
      socket.to(`drawing:${lobbyId}`).emit('drawing:fill', fillData);
    }
  });
  
  // Recevoir et broadcaster un effacement du canvas
  socket.on('drawing:clear', async (data) => {
    const { lobbyId, teamId, odId } = data;
    
    const gameState = pictionaryGames.get(lobbyId);
    const isRelay = gameState?.gameType === 'relay';
    
    const clearData = { lobbyId, teamId, odId, timestamp: Date.now() };
    
    if (isRelay && teamId) {
      socket.to(`relay:${lobbyId}:${teamId}`).emit('drawing:clear', clearData);
      socket.to(`relay:${lobbyId}:admin`).emit('drawing:clear', clearData);
    } else {
      socket.to(`drawing:${lobbyId}`).emit('drawing:clear', clearData);
    }
  });
  
  // ==================== DRAWING LOBBY SYSTEM ====================
  
  socket.on('drawingLobby:join', async (data, callback) => {
    const { lobbyId, odId, pseudo, teamName } = data;
    
    socket.join(`drawing:${lobbyId}`);
    socket.drawingLobbyId = lobbyId;
    socket.odId = odId;
    socket.teamName = teamName;
    socket.pseudo = pseudo;
    
    const lobby = await db.joinDrawingLobby(lobbyId, odId, teamName);
    
    if (!lobby) {
      callback({ success: false, message: 'Lobby non trouvé' });
      return;
    }
    
    // Si la partie Relay est en cours, joindre la room d'équipe
    const gameState = pictionaryGames.get(lobbyId);
    if (gameState?.gameType === 'relay' && gameState.status === 'playing') {
      if (teamName) {
        socket.join(`relay:${lobbyId}:${teamName}`);
        console.log(`[RELAY] ${pseudo} rejoint relay:${lobbyId}:${teamName}`);
      }
      if (odId === 'admin') {
        socket.join(`relay:${lobbyId}:admin`);
      }
    }
    
    console.log(`[DRAWING] ${pseudo} (${teamName}) a rejoint le lobby ${lobbyId}`);
    
    socket.to(`drawing:${lobbyId}`).emit('drawingLobby:participantJoined', {
      odId, pseudo, teamName
    });
    
    callback({ 
      success: true, 
      lobby,
      gameState: gameState ? {
        status: gameState.status,
        gameType: gameState.gameType,
        currentRound: gameState.currentRound,
        totalRounds: gameState.config?.rounds,
        drawingTeam: gameState.drawingTeam,
        timeRemaining: gameState.timeRemaining,
        scores: gameState.scores,
        teamsFound: gameState.teamsFound,
        currentWord: teamName === gameState.drawingTeam ? gameState.currentWord : null,
        currentPassage: gameState.currentPassage,
        totalPassages: gameState.totalPassages,
        phase: gameState.phase,
        phaseTimeRemaining: gameState.phaseTimeRemaining,
        assignments: gameState.currentAssignments
      } : null
    });
    
    io.to(`drawing:${lobbyId}`).emit('drawingLobby:updated', { lobby });
  });
  
  socket.on('drawingLobby:leave', async (data, callback) => {
    const { lobbyId, odId } = data;
    
    socket.leave(`drawing:${lobbyId}`);
    delete socket.drawingLobbyId; // Nettoyer pour éviter double traitement à la déconnexion
    
    const lobby = await db.leaveDrawingLobby(lobbyId, odId);
    
    if (lobby) {
      // Le lobby existe encore
      socket.to(`drawing:${lobbyId}`).emit('drawingLobby:participantLeft', { odId });
      io.to(`drawing:${lobbyId}`).emit('drawingLobby:updated', { lobby });
      callback({ success: true, lobbyDeleted: false });
    } else {
      // Le lobby a été supprimé (était vide)
      io.to(`drawing:${lobbyId}`).emit('drawingLobby:deleted', { lobbyId });
      callback({ success: true, lobbyDeleted: true });
    }
  });
  
  socket.on('drawingLobby:addCustomWord', async (data, callback) => {
    const { lobbyId, word, addedBy } = data;
    
    if (!word || !word.trim()) {
      callback && callback({ success: false, message: 'Mot vide' });
      return;
    }
    
    const lobby = await db.getDrawingLobbyById(lobbyId);
    if (!lobby) {
      callback && callback({ success: false, message: 'Lobby non trouvé' });
      return;
    }
    
    const customWords = lobby.custom_words || [];
    const newWord = {
      id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      word: word.trim(),
      addedBy: addedBy || 'Anonyme',
      addedAt: Date.now()
    };
    customWords.push(newWord);
    
    const updatedLobby = await db.updateDrawingLobbyCustomWords(lobbyId, customWords);
    
    io.to(`drawing:${lobbyId}`).emit('drawingLobby:customWordAdded', { 
      word: newWord, 
      totalCustomWords: customWords.length 
    });
    io.to(`drawing:${lobbyId}`).emit('drawingLobby:updated', { lobby: updatedLobby });
    
    callback && callback({ success: true, word: newWord });
  });
  
  socket.on('drawingLobby:removeCustomWord', async (data, callback) => {
    const { lobbyId, wordId } = data;
    
    const lobby = await db.getDrawingLobbyById(lobbyId);
    if (!lobby) {
      callback && callback({ success: false, message: 'Lobby non trouvé' });
      return;
    }
    
    const customWords = (lobby.custom_words || []).filter(w => w.id !== wordId);
    const updatedLobby = await db.updateDrawingLobbyCustomWords(lobbyId, customWords);
    
    io.to(`drawing:${lobbyId}`).emit('drawingLobby:customWordRemoved', { 
      wordId, 
      totalCustomWords: customWords.length 
    });
    io.to(`drawing:${lobbyId}`).emit('drawingLobby:updated', { lobby: updatedLobby });
    
    callback && callback({ success: true });
  });
}

module.exports = { register };
