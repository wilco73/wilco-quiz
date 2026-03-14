/**
 * Handlers Socket.IO pour Pictionary
 * Inclut la logique de timer et les événements du jeu
 */

const db = require('../database');
const { pictionaryGames, pictionaryTimers } = require('../utils/state');
const { shuffleArray } = require('../utils/helpers');

let io = null;

/**
 * Initialise le module avec l'instance Socket.IO
 */
function init(socketIo) {
  io = socketIo;
}

// ==================== TIMER FUNCTIONS ====================

function startPictionaryTimer(lobbyId) {
  if (pictionaryTimers.has(lobbyId)) {
    clearInterval(pictionaryTimers.get(lobbyId));
  }
  
  const intervalId = setInterval(async () => {
    const gameState = pictionaryGames.get(lobbyId);
    if (!gameState || gameState.status !== 'playing') {
      clearInterval(intervalId);
      pictionaryTimers.delete(lobbyId);
      return;
    }
    
    gameState.timeRemaining--;
    
    // Gérer la rotation des dessinateurs
    if (gameState.config.timePerDrawer > 0) {
      gameState.drawerRotationTime--;
      
      if (gameState.drawerRotationTime <= 0) {
        gameState.currentDrawerIndex++;
        gameState.drawerRotationTime = gameState.config.timePerDrawer;
        
        io.to(`drawing:${lobbyId}`).emit('pictionary:drawerRotation', {
          newDrawerIndex: gameState.currentDrawerIndex
        });
      }
    }
    
    io.to(`drawing:${lobbyId}`).emit('pictionary:timerTick', {
      timeRemaining: gameState.timeRemaining,
      drawerRotationTime: gameState.drawerRotationTime
    });
    
    if (gameState.timeRemaining <= 0) {
      console.log(`[PICTIONARY] Temps écoulé - Tour ${gameState.currentRound + 1}/${gameState.config.rounds}`);
      
      io.to(`drawing:${lobbyId}`).emit('pictionary:timeUp', {
        word: gameState.currentWord,
        teamsFound: gameState.teamsFound,
        scores: gameState.scores,
        drawingTeam: gameState.drawingTeam,
        currentRound: gameState.currentRound
      });
      
      gameState.timeRemaining = 9999; // Éviter les répétitions
      
      setTimeout(() => {
        const currentGameState = pictionaryGames.get(lobbyId);
        if (currentGameState?.status === 'playing') {
          triggerNextRound(lobbyId);
        }
      }, 5000);
    }
  }, 1000);
  
  pictionaryTimers.set(lobbyId, intervalId);
}

async function triggerNextRound(lobbyId) {
  const gameState = pictionaryGames.get(lobbyId);
  if (!gameState || gameState.status !== 'playing') return;
  
  gameState.currentRound++;
  
  if (gameState.currentRound >= gameState.config.rounds) {
    await endPictionaryGame(lobbyId);
    return;
  }
  
  gameState.drawingTeamIndex = (gameState.drawingTeamIndex + 1) % gameState.teams.length;
  gameState.drawingTeam = gameState.teams[gameState.drawingTeamIndex];
  gameState.currentWord = gameState.words[gameState.currentRound]?.word || '';
  gameState.currentDrawerIndex = 0;
  gameState.teamsFound = [];
  gameState.guesses = [];
  gameState.timeRemaining = gameState.config.timePerRound;
  gameState.drawerRotationTime = gameState.config.timePerDrawer || 0;
  
  await db.updateDrawingLobbyState(lobbyId, {
    currentRound: gameState.currentRound,
    currentWord: gameState.currentWord,
    roundStartTime: Date.now()
  });
  
  io.to(`drawing:${lobbyId}`).emit('pictionary:newRound', {
    currentRound: gameState.currentRound,
    totalRounds: gameState.config.rounds,
    drawingTeam: gameState.drawingTeam,
    timeRemaining: gameState.config.timePerRound
  });
  
  io.to(`drawing:${lobbyId}`).emit('pictionary:wordReveal', {
    word: gameState.currentWord,
    forTeam: gameState.drawingTeam
  });
  
  io.to(`drawing:${lobbyId}`).emit('drawing:clear', {
    lobbyId,
    fromServer: true
  });
  
  console.log(`[PICTIONARY] Passage au tour ${gameState.currentRound + 1}/${gameState.config.rounds}`);
}

async function endPictionaryGame(lobbyId) {
  const gameState = pictionaryGames.get(lobbyId);
  if (!gameState) return;
  
  gameState.status = 'finished';
  
  if (pictionaryTimers.has(lobbyId)) {
    clearInterval(pictionaryTimers.get(lobbyId));
    pictionaryTimers.delete(lobbyId);
  }
  
  const ranking = Object.entries(gameState.scores)
    .sort(([,a], [,b]) => b - a)
    .map(([team, score], index) => ({ team, score, rank: index + 1 }));
  
  console.log(`[PICTIONARY] Partie terminée - Lobby: ${lobbyId}`);
  
  await db.finishDrawingLobby(lobbyId);
  
  io.to(`drawing:${lobbyId}`).emit('pictionary:ended', {
    scores: gameState.scores,
    ranking,
    totalRounds: gameState.config.rounds
  });
  
  setTimeout(() => {
    pictionaryGames.delete(lobbyId);
  }, 60000);
}

// ==================== SOCKET HANDLERS ====================

function register(socket, io) {
  
  socket.on('pictionary:start', async (data, callback) => {
    const { lobbyId, config, words } = data;
    
    const lobby = await db.getDrawingLobbyById(lobbyId);
    if (!lobby) {
      callback({ success: false, message: 'Lobby non trouvé' });
      return;
    }
    
    const teams = [...new Set(lobby.participants.map(p => p.team_name).filter(Boolean))];
    
    if (teams.length < 2) {
      callback({ success: false, message: 'Il faut au moins 2 équipes' });
      return;
    }
    
    const shuffledTeams = shuffleArray(teams);
    
    // Préparer les mots
    let availableWords = [];
    const customWords = (lobby.custom_words || []).map(cw => ({
      id: cw.id,
      word: cw.word,
      category: 'Custom',
      difficulty: 'medium',
      isCustom: true,
      addedBy: cw.addedBy
    }));
    
    if (config.useCustomWordsOnly) {
      availableWords = customWords;
    } else {
      availableWords = [...words, ...customWords];
    }
    
    const selectedWords = shuffleArray(availableWords).slice(0, config.rounds);
    
    if (selectedWords.length < config.rounds) {
      callback({ success: false, message: `Pas assez de mots (${selectedWords.length}/${config.rounds})` });
      return;
    }
    
    const gameState = {
      lobbyId,
      config,
      teams: shuffledTeams,
      words: selectedWords,
      currentRound: 0,
      currentWord: selectedWords[0]?.word || '',
      drawingTeam: shuffledTeams[0],
      drawingTeamIndex: 0,
      currentDrawerIndex: 0,
      scores: {},
      teamsFound: [],
      guesses: [],
      timeRemaining: config.timePerRound,
      drawerRotationTime: config.timePerDrawer || 0,
      status: 'playing',
      startedAt: Date.now()
    };
    
    shuffledTeams.forEach(team => {
      gameState.scores[team] = 0;
    });
    
    pictionaryGames.set(lobbyId, gameState);
    await db.startDrawingLobby(lobbyId, gameState);
    startPictionaryTimer(lobbyId);
    
    console.log(`[PICTIONARY] Partie démarrée - ${config.rounds} tours, Équipes: ${shuffledTeams.join(', ')}`);
    
    io.to(`drawing:${lobbyId}`).emit('pictionary:started', {
      lobbyId, config, teams: shuffledTeams,
      currentRound: 0, totalRounds: config.rounds,
      drawingTeam: shuffledTeams[0],
      timeRemaining: config.timePerRound,
      scores: gameState.scores, teamsFound: []
    });
    
    io.to(`drawing:${lobbyId}`).emit('pictionary:wordReveal', {
      word: selectedWords[0]?.word,
      forTeam: shuffledTeams[0]
    });
    
    callback({ success: true, lobbyId });
  });
  
  socket.on('pictionary:guess', async (data, callback) => {
    const { lobbyId, odId, teamName, guess } = data;
    
    const gameState = pictionaryGames.get(lobbyId);
    if (!gameState) {
      callback({ success: false, message: 'Partie non trouvée' });
      return;
    }
    
    if (teamName === gameState.drawingTeam) {
      callback({ success: false, message: 'Votre équipe dessine !' });
      return;
    }
    
    if (gameState.teamsFound.includes(teamName)) {
      callback({ success: false, message: 'Vous avez déjà trouvé !' });
      return;
    }
    
    const normalizedGuess = guess.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const normalizedWord = gameState.currentWord.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    const isCorrect = normalizedGuess === normalizedWord;
    
    gameState.guesses.push({ odId, teamName, guess, correct: isCorrect, timestamp: Date.now() });
    
    io.to(`drawing:${lobbyId}`).emit('pictionary:guessResult', { odId, teamName, guess, correct: isCorrect });
    
    if (isCorrect) {
      const isFirst = gameState.teamsFound.length === 0;
      const points = isFirst ? gameState.config.pointsFirstGuess : gameState.config.pointsOtherGuess;
      
      gameState.scores[teamName] = (gameState.scores[teamName] || 0) + points;
      gameState.teamsFound.push(teamName);
      
      if (isFirst && gameState.config.pointsDrawingTeam > 0) {
        gameState.scores[gameState.drawingTeam] = (gameState.scores[gameState.drawingTeam] || 0) + gameState.config.pointsDrawingTeam;
      }
      
      console.log(`[PICTIONARY] ${teamName} a trouvé "${gameState.currentWord}" ! (+${points} pts)`);
      
      await db.addDrawingScore(lobbyId, teamName, points, 'guess', gameState.currentRound);
      if (isFirst && gameState.config.pointsDrawingTeam > 0) {
        await db.addDrawingScore(lobbyId, gameState.drawingTeam, gameState.config.pointsDrawingTeam, 'drawing', gameState.currentRound);
      }
      
      io.to(`drawing:${lobbyId}`).emit('pictionary:scoreUpdate', {
        scores: gameState.scores,
        teamsFound: gameState.teamsFound
      });
      
      const guessingTeams = gameState.teams.filter(t => t !== gameState.drawingTeam);
      const allFound = guessingTeams.every(t => gameState.teamsFound.includes(t));
      
      if (allFound) {
        console.log(`[PICTIONARY] Toutes les équipes ont trouvé !`);
        
        io.to(`drawing:${lobbyId}`).emit('pictionary:allTeamsFound', {
          word: gameState.currentWord,
          teamsFound: gameState.teamsFound,
          scores: gameState.scores,
          drawingTeam: gameState.drawingTeam,
          currentRound: gameState.currentRound
        });
        
        setTimeout(() => {
          triggerNextRound(lobbyId);
        }, 5000);
      }
    }
    
    callback({ success: true, correct: isCorrect });
  });
  
  socket.on('pictionary:nextRound', async (data, callback) => {
    const { lobbyId } = data;
    
    const gameState = pictionaryGames.get(lobbyId);
    if (!gameState) {
      callback({ success: false, message: 'Partie non trouvée' });
      return;
    }
    
    gameState.currentRound++;
    
    if (gameState.currentRound >= gameState.config.rounds) {
      await endPictionaryGame(lobbyId);
      callback({ success: true, ended: true });
      return;
    }
    
    gameState.drawingTeamIndex = (gameState.drawingTeamIndex + 1) % gameState.teams.length;
    gameState.drawingTeam = gameState.teams[gameState.drawingTeamIndex];
    gameState.currentWord = gameState.words[gameState.currentRound]?.word || '';
    gameState.currentDrawerIndex = 0;
    gameState.teamsFound = [];
    gameState.guesses = [];
    gameState.timeRemaining = gameState.config.timePerRound;
    gameState.drawerRotationTime = gameState.config.timePerDrawer || 0;
    
    await db.updateDrawingLobbyState(lobbyId, {
      currentRound: gameState.currentRound,
      currentWord: gameState.currentWord,
      roundStartTime: Date.now()
    });
    
    io.to(`drawing:${lobbyId}`).emit('pictionary:newRound', {
      currentRound: gameState.currentRound,
      totalRounds: gameState.config.rounds,
      drawingTeam: gameState.drawingTeam,
      timeRemaining: gameState.config.timePerRound
    });
    
    io.to(`drawing:${lobbyId}`).emit('pictionary:wordReveal', {
      word: gameState.currentWord,
      forTeam: gameState.drawingTeam
    });
    
    io.to(`drawing:${lobbyId}`).emit('drawing:clear', { lobbyId, fromServer: true });
    
    callback({ success: true, ended: false });
  });
  
  socket.on('pictionary:end', async (data, callback) => {
    const { lobbyId } = data;
    await endPictionaryGame(lobbyId);
    callback({ success: true });
  });
  
  socket.on('pictionary:saveDrawing', async (data, callback) => {
    const { lobbyId, round, teamName, word, imageData } = data;
    
    if (!imageData || !lobbyId) {
      callback && callback({ success: false, message: 'Données manquantes' });
      return;
    }
    
    try {
      const existingDrawings = await db.getDrawingsByLobby(lobbyId);
      const alreadySaved = existingDrawings.some(d => d.round === round && d.team_name === teamName);
      
      if (alreadySaved) {
        callback && callback({ success: true, message: 'Déjà sauvegardé', skipped: true });
        return;
      }
      
      const drawingId = await db.saveDrawing(lobbyId, round, teamName, word, imageData);
      console.log(`[PICTIONARY] Dessin sauvegardé: ${drawingId}`);
      callback && callback({ success: true, drawingId });
    } catch (error) {
      console.error('[PICTIONARY] Erreur sauvegarde:', error);
      callback && callback({ success: false, message: error.message });
    }
  });
}

module.exports = { init, register, startPictionaryTimer, endPictionaryGame, triggerNextRound };
