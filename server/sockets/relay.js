/**
 * Handlers Socket.IO pour le jeu "Passe-moi le Relais"
 * Jeu de téléphone arabe avec dessins
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

function startRelayTimer(lobbyId) {
  if (pictionaryTimers.has(lobbyId)) {
    clearInterval(pictionaryTimers.get(lobbyId));
  }
  
  const intervalId = setInterval(async () => {
    const gameState = pictionaryGames.get(lobbyId);
    if (!gameState || gameState.status !== 'playing' || gameState.gameType !== 'relay') {
      clearInterval(intervalId);
      pictionaryTimers.delete(lobbyId);
      return;
    }
    
    gameState.phaseTimeRemaining--;
    
    io.to(`drawing:${lobbyId}`).emit('relay:timerTick', {
      phase: gameState.phase,
      phaseTimeRemaining: gameState.phaseTimeRemaining,
      currentRound: gameState.currentRound,
      totalRounds: gameState.totalRounds
    });
    
    if (gameState.phaseTimeRemaining <= 0) {
      if (gameState.phase === 'observation') {
        gameState.phase = 'drawing';
        gameState.phaseTimeRemaining = gameState.config.drawingTime || 120;
        
        console.log(`[RELAY] Phase dessin - Round ${gameState.currentRound + 1}/${gameState.totalRounds}`);
        
        io.to(`drawing:${lobbyId}`).emit('relay:phaseChange', {
          phase: 'drawing',
          phaseTimeRemaining: gameState.phaseTimeRemaining,
          currentRound: gameState.currentRound,
          message: 'À vos crayons ! Reproduisez ce que vous avez vu !'
        });
        
      } else if (gameState.phase === 'drawing') {
        gameState.phase = 'transition';
        gameState.phaseTimeRemaining = 9999;
        
        console.log(`[RELAY] Fin du dessin - Round ${gameState.currentRound + 1}/${gameState.totalRounds}`);
        
        io.to(`drawing:${lobbyId}`).emit('relay:drawingTimeUp', {
          currentRound: gameState.currentRound,
          totalRounds: gameState.totalRounds
        });
        
        setTimeout(() => {
          triggerNextRelayRound(lobbyId);
        }, 5000);
      }
    }
  }, 1000);
  
  pictionaryTimers.set(lobbyId, intervalId);
}

function triggerNextRelayRound(lobbyId) {
  const gameState = pictionaryGames.get(lobbyId);
  if (!gameState || gameState.status !== 'playing') return;
  
  gameState.currentRound++;
  
  console.log(`[RELAY] Passage au round ${gameState.currentRound + 1}/${gameState.totalRounds}`);
  
  if (gameState.currentRound >= gameState.totalRounds) {
    console.log(`[RELAY] Tous les rounds terminés, fin de partie`);
    endRelayGame(lobbyId);
    return;
  }
  
  const numTeams = gameState.teams.length;
  
  gameState.currentAssignments = gameState.teams.map((team, idx) => {
    const sourceTeamIdx = (idx - 1 + numTeams) % numTeams;
    const sourceTeam = gameState.teams[sourceTeamIdx];
    
    const sourceDrawing = gameState.drawings.find(d => 
      d.team === sourceTeam && d.round === gameState.currentRound - 1
    );
    
    console.log(`[RELAY] ${team} reçoit le dessin de ${sourceTeam}: ${sourceDrawing ? 'trouvé' : 'NON TROUVÉ'}`);
    
    const chainIdx = (idx - gameState.currentRound + numTeams * 100) % numTeams;
    
    return {
      team,
      chainIndex: chainIdx,
      referenceName: gameState.references[chainIdx]?.name || 'Image',
      referenceUrl: null,
      sourceDrawingData: sourceDrawing?.imageData || null,
      sourceTeam: sourceTeam
    };
  });
  
  gameState.phase = 'observation';
  gameState.phaseTimeRemaining = gameState.config.observationTime || 30;
  
  io.to(`drawing:${lobbyId}`).emit('relay:newRound', {
    currentRound: gameState.currentRound,
    totalRounds: gameState.totalRounds,
    phase: 'observation',
    phaseTimeRemaining: gameState.phaseTimeRemaining,
    assignments: gameState.currentAssignments
  });
}

async function endRelayGame(lobbyId) {
  const gameState = pictionaryGames.get(lobbyId);
  if (!gameState) return;
  
  gameState.status = 'finished';
  gameState.phase = 'finished';
  
  if (pictionaryTimers.has(lobbyId)) {
    clearInterval(pictionaryTimers.get(lobbyId));
    pictionaryTimers.delete(lobbyId);
  }
  
  console.log(`[RELAY] Fin de partie - ${gameState.drawings.length} dessins sauvegardés`);
  
  // Organiser les dessins par chaîne
  const numTeams = gameState.teams.length;
  const chains = gameState.references.map((ref, refIdx) => {
    const chainDrawings = [];
    
    for (let round = 0; round < gameState.totalRounds; round++) {
      const teamIdx = (refIdx + round) % numTeams;
      const team = gameState.teams[teamIdx];
      
      const drawing = gameState.drawings.find(d => 
        d.round === round && d.team === team
      );
      
      chainDrawings.push({
        round,
        team,
        imageData: drawing?.imageData || null,
        drawingId: drawing?.id || null
      });
    }
    
    return {
      referenceId: ref.id,
      referenceName: ref.name,
      referenceUrl: ref.imageUrl,
      drawings: chainDrawings
    };
  });
  
  await db.finishDrawingLobby(lobbyId);
  
  io.to(`drawing:${lobbyId}`).emit('relay:ended', {
    chains,
    totalPassages: gameState.totalPassages,
    teams: gameState.teams
  });
  
  setTimeout(() => {
    pictionaryGames.delete(lobbyId);
  }, 60000);
}

// ==================== SOCKET HANDLERS ====================

function register(socket, io) {
  
  socket.on('relay:start', async (data, callback) => {
    const { lobbyId, config, references } = data;
    
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
    
    if (!references || references.length < teams.length) {
      callback({ success: false, message: `Il faut au moins ${teams.length} images de référence` });
      return;
    }
    
    const shuffledTeams = shuffleArray(teams);
    const shuffledRefs = shuffleArray(references).slice(0, teams.length);
    const totalRounds = (config.passages || 1) + 1;
    
    const gameState = {
      lobbyId,
      config,
      gameType: 'relay',
      teams: shuffledTeams,
      references: shuffledRefs,
      currentRound: 0,
      totalRounds: totalRounds,
      phase: 'observation',
      phaseTimeRemaining: config.observationTime || 30,
      status: 'playing',
      currentAssignments: shuffledTeams.map((team, idx) => ({
        team,
        chainIndex: idx,
        referenceId: shuffledRefs[idx].id,
        referenceName: shuffledRefs[idx].name,
        referenceUrl: shuffledRefs[idx].imageUrl,
        sourceDrawingData: null
      })),
      drawings: []
    };
    
    pictionaryGames.set(lobbyId, gameState);
    
    await db.updateDrawingLobbyState(lobbyId, {
      status: 'playing',
      config: { ...config, gameType: 'relay' }
    });
    
    // Joindre chaque participant à sa room d'équipe
    const socketsInLobby = io.sockets.adapter.rooms.get(`drawing:${lobbyId}`);
    if (socketsInLobby) {
      socketsInLobby.forEach(socketId => {
        const participantSocket = io.sockets.sockets.get(socketId);
        if (participantSocket?.teamName) {
          participantSocket.join(`relay:${lobbyId}:${participantSocket.teamName}`);
        } else if (participantSocket?.odId === 'admin') {
          participantSocket.join(`relay:${lobbyId}:admin`);
        }
      });
    }
    
    console.log(`[RELAY] Partie démarrée - ${teams.length} équipes, ${config.passages} passage(s)`);
    
    io.to(`drawing:${lobbyId}`).emit('relay:started', {
      lobbyId,
      config,
      teams: shuffledTeams,
      currentRound: 0,
      totalRounds: totalRounds,
      phase: 'observation',
      phaseTimeRemaining: config.observationTime,
      assignments: gameState.currentAssignments
    });
    
    startRelayTimer(lobbyId);
    
    callback({ success: true, lobbyId });
  });
  
  socket.on('relay:saveDrawing', async (data, callback) => {
    const { lobbyId, teamName, imageData } = data;
    
    const gameState = pictionaryGames.get(lobbyId);
    if (!gameState || gameState.gameType !== 'relay') {
      callback && callback({ success: false, message: 'Partie non trouvée' });
      return;
    }
    
    try {
      const alreadySaved = gameState.drawings.some(d => 
        d.round === gameState.currentRound && d.team === teamName
      );
      
      if (alreadySaved) {
        callback && callback({ success: true, message: 'Déjà sauvegardé', skipped: true });
        return;
      }
      
      const drawingId = await db.saveDrawing(
        lobbyId, 
        gameState.currentRound, 
        teamName, 
        gameState.currentAssignments.find(a => a.team === teamName)?.referenceName || 'inconnu',
        imageData
      );
      
      gameState.drawings.push({
        id: drawingId,
        round: gameState.currentRound,
        team: teamName,
        imageData
      });
      
      console.log(`[RELAY] Dessin sauvegardé: ${drawingId}`);
      callback && callback({ success: true, drawingId });
    } catch (error) {
      console.error('[RELAY] Erreur sauvegarde:', error);
      callback && callback({ success: false, message: error.message });
    }
  });
  
  socket.on('relay:end', async (data, callback) => {
    const { lobbyId } = data;
    await endRelayGame(lobbyId);
    callback({ success: true });
  });
  
  socket.on('relay:joinMonitoring', async (data, callback) => {
    const { lobbyId } = data;
    socket.join(`relay:${lobbyId}:admin`);
    console.log(`[RELAY] Admin rejoint le monitoring`);
    
    const gameState = pictionaryGames.get(lobbyId);
    callback && callback({ 
      success: true, 
      gameState: gameState ? {
        teams: gameState.teams,
        currentPassage: gameState.currentPassage,
        totalPassages: gameState.totalPassages,
        phase: gameState.phase,
        assignments: gameState.currentAssignments,
        drawings: gameState.drawings
      } : null
    });
  });
}

module.exports = { init, register, startRelayTimer, endRelayGame, triggerNextRelayRound };
