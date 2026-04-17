import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useMemeGame - Hook pour gérer le jeu Make It Meme via WebSocket
 * 
 * @param {Object} socket - Instance socket.io
 * @param {Object} currentUser - { id, pseudo, role }
 * @returns {Object} État et actions du jeu
 */
export default function useMemeGame(socket, currentUser) {
  // États du jeu
  const [lobby, setLobby] = useState(null);
  const [phase, setPhase] = useState('lobby'); // lobby, creating, submitting, voting, round_results, final_results
  const [currentRound, setCurrentRound] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [phaseEndTime, setPhaseEndTime] = useState(null);
  
  // Template et création
  const [template, setTemplate] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  // Vote
  const [allMemes, setAllMemes] = useState([]);
  const [currentVoteIndex, setCurrentVoteIndex] = useState(0);
  const [hasSuperVote, setHasSuperVote] = useState(true);
  const [votesReceived, setVotesReceived] = useState({});
  const [hasVoted, setHasVoted] = useState(false);
  
  // Résultats
  const [players, setPlayers] = useState([]);
  
  // Loading et erreurs
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Ref pour le timer
  const timerRef = useRef(null);

  // ==================== TIMER ====================
  
  // Calculer le temps restant basé sur phaseEndTime
  useEffect(() => {
    if (!phaseEndTime) {
      setTimeRemaining(0);
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const endTime = new Date(phaseEndTime).getTime();
      const remaining = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        clearInterval(timerRef.current);
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [phaseEndTime]);

  // ==================== SOCKET LISTENERS ====================
  
  useEffect(() => {
    if (!socket) return;

    // Lobby updates
    socket.on('meme:lobbyUpdated', (updatedLobby) => {
      setLobby(updatedLobby);
      updatePlayersFromLobby(updatedLobby);
    });

    socket.on('meme:lobbyDeleted', ({ lobbyId }) => {
      if (lobby?.id === lobbyId) {
        setLobby(null);
        setPhase('lobby');
      }
    });

    // Game started
    socket.on('meme:gameStarted', ({ lobby: updatedLobby, phase: newPhase, roundNumber, endTime }) => {
      setLobby(updatedLobby);
      setPhase('creating');
      setCurrentRound(roundNumber);
      setPhaseEndTime(endTime);
      setHasSubmitted(false);
      setHasSuperVote(true);
      updatePlayersFromLobby(updatedLobby);
    });

    // Template assigned
    socket.on('meme:templateAssigned', ({ odId, assignment: newAssignment }) => {
      if (odId === currentUser?.id) {
        setAssignment(newAssignment);
        setTemplate(newAssignment.template);
      }
    });

    // Creation submitted by someone
    socket.on('meme:creationSubmitted', ({ odId, pseudo, creationId }) => {
      // Mettre à jour le lobby pour afficher qui a soumis
      setLobby(prev => {
        if (!prev) return prev;
        const updatedParticipants = (prev.participants || []).map(p => 
          p.odId === odId ? { ...p, hasSubmitted: true } : p
        );
        return { ...prev, participants: updatedParticipants };
      });
    });

    // Voting started
    socket.on('meme:votingStarted', ({ lobby: updatedLobby, creations, currentIndex, endTime }) => {
      setLobby(updatedLobby);
      setAllMemes(creations);
      setCurrentVoteIndex(currentIndex);
      setPhase('voting');
      setPhaseEndTime(endTime);
      setVotesReceived({});
      setHasVoted(false);
    });

    // Vote received
    socket.on('meme:voteReceived', ({ creationId, odId, voteType, isSuper, totalScore }) => {
      // Mettre à jour le compteur de votes
      setVotesReceived(prev => ({ ...prev, [odId]: true }));
      
      // Mettre à jour le score du meme
      setAllMemes(prev => prev.map(meme => 
        meme.id === creationId ? { ...meme, total_score: totalScore } : meme
      ));
    });

    // Next vote
    socket.on('meme:nextVoteStarted', ({ lobby: updatedLobby, currentIndex, endTime }) => {
      setLobby(updatedLobby);
      setCurrentVoteIndex(currentIndex);
      setPhaseEndTime(endTime);
      setVotesReceived({});
      setHasVoted(false);
    });

    // Round results
    socket.on('meme:roundResults', ({ lobby: updatedLobby, creations }) => {
      setLobby(updatedLobby);
      setAllMemes(creations);
      setPhase('round_results');
      updatePlayersFromLobby(updatedLobby);
    });

    // New round
    socket.on('meme:newRoundStarted', ({ lobby: updatedLobby, roundNumber, endTime }) => {
      setLobby(updatedLobby);
      setPhase('creating');
      setCurrentRound(roundNumber);
      setPhaseEndTime(endTime);
      setHasSubmitted(false);
      setHasSuperVote(true);
      setVotesReceived({});
      setHasVoted(false);
      updatePlayersFromLobby(updatedLobby);
    });

    // Game finished
    socket.on('meme:gameFinished', ({ lobby: updatedLobby, allCreations }) => {
      setLobby(updatedLobby);
      setAllMemes(allCreations);
      setPhase('final_results');
      updatePlayersFromLobby(updatedLobby);
    });

    return () => {
      socket.off('meme:lobbyUpdated');
      socket.off('meme:lobbyDeleted');
      socket.off('meme:gameStarted');
      socket.off('meme:templateAssigned');
      socket.off('meme:creationSubmitted');
      socket.off('meme:votingStarted');
      socket.off('meme:voteReceived');
      socket.off('meme:nextVoteStarted');
      socket.off('meme:roundResults');
      socket.off('meme:newRoundStarted');
      socket.off('meme:gameFinished');
    };
  }, [socket, currentUser?.id, lobby?.id]);

  // Helper pour mettre à jour les joueurs depuis le lobby
  const updatePlayersFromLobby = (lobbyData) => {
    if (!lobbyData?.participants) return;
    
    setPlayers(lobbyData.participants.map(p => ({
      odId: p.odId,
      pseudo: p.pseudo,
      totalScore: p.score || 0,
      memes: p.memes || [],
    })));
  };

  // ==================== ACTIONS ====================

  // Créer un lobby
  const createLobby = useCallback(async (settings = {}) => {
    if (!socket || !currentUser) return null;
    
    setLoading(true);
    setError(null);
    
    return new Promise((resolve) => {
      socket.emit('meme:createLobby', {
        odId: currentUser.id,
        pseudo: currentUser.pseudo,
        userRole: currentUser.role,
        settings,
      }, (response) => {
        setLoading(false);
        if (response.success) {
          setLobby(response.lobby);
          updatePlayersFromLobby(response.lobby);
          resolve(response.lobby);
        } else {
          setError(response.message);
          resolve(null);
        }
      });
    });
  }, [socket, currentUser]);

  // Rejoindre un lobby
  const joinLobby = useCallback(async (lobbyId) => {
    if (!socket || !currentUser) return null;
    
    setLoading(true);
    setError(null);
    
    return new Promise((resolve) => {
      socket.emit('meme:joinLobby', {
        lobbyId,
        odId: currentUser.id,
        pseudo: currentUser.pseudo,
      }, (response) => {
        setLoading(false);
        if (response.success) {
          setLobby(response.lobby);
          updatePlayersFromLobby(response.lobby);
          resolve(response.lobby);
        } else {
          setError(response.message);
          resolve(null);
        }
      });
    });
  }, [socket, currentUser]);

  // Rejoindre un lobby par son code court (6 caractères)
  const joinLobbyByCode = useCallback(async (code) => {
    if (!socket || !currentUser) return null;
    
    setLoading(true);
    setError(null);
    
    return new Promise((resolve) => {
      socket.emit('meme:joinLobbyByCode', {
        code: code.toUpperCase(),
        odId: currentUser.id,
        pseudo: currentUser.pseudo,
      }, (response) => {
        setLoading(false);
        if (response.success) {
          setLobby(response.lobby);
          updatePlayersFromLobby(response.lobby);
          resolve(response.lobby);
        } else {
          setError(response.message || 'Lobby non trouvé');
          resolve(null);
        }
      });
    });
  }, [socket, currentUser]);

  // Quitter le lobby
  const leaveLobby = useCallback(async () => {
    if (!socket || !lobby || !currentUser) return;
    
    return new Promise((resolve) => {
      socket.emit('meme:leaveLobby', {
        lobbyId: lobby.id,
        odId: currentUser.id,
      }, (response) => {
        if (response.success) {
          setLobby(null);
          setPhase('lobby');
          setTemplate(null);
          setAssignment(null);
        }
        resolve(response.success);
      });
    });
  }, [socket, lobby, currentUser]);

  // Mettre à jour les settings
  const updateSettings = useCallback(async (settings) => {
    if (!socket || !lobby) return;
    
    return new Promise((resolve) => {
      socket.emit('meme:updateSettings', {
        lobbyId: lobby.id,
        settings,
      }, (response) => {
        if (response.success) {
          setLobby(response.lobby);
        }
        resolve(response.success);
      });
    });
  }, [socket, lobby]);

  // Démarrer la partie
  const startGame = useCallback(async () => {
    if (!socket || !lobby) return;
    
    setLoading(true);
    
    return new Promise((resolve) => {
      socket.emit('meme:startGame', {
        lobbyId: lobby.id,
      }, (response) => {
        setLoading(false);
        resolve(response.success);
      });
    });
  }, [socket, lobby]);

  // Rotation de template
  const rotateTemplate = useCallback(async () => {
    if (!socket || !lobby || !currentUser) return null;
    
    return new Promise((resolve) => {
      socket.emit('meme:rotateTemplate', {
        lobbyId: lobby.id,
        roundNumber: currentRound,
        odId: currentUser.id,
      }, (response) => {
        if (response.success) {
          setAssignment(response.assignment);
          setTemplate(response.assignment.template);
        } else {
          setError(response.message);
        }
        resolve(response.success ? response.assignment : null);
      });
    });
  }, [socket, lobby, currentUser, currentRound]);

  // Undo de template
  const undoTemplate = useCallback(async () => {
    if (!socket || !lobby || !currentUser) return null;
    
    return new Promise((resolve) => {
      socket.emit('meme:undoRotation', {
        lobbyId: lobby.id,
        roundNumber: currentRound,
        odId: currentUser.id,
      }, (response) => {
        if (response.success) {
          setAssignment(response.assignment);
          setTemplate(response.assignment.template);
        } else {
          setError(response.message);
        }
        resolve(response.success ? response.assignment : null);
      });
    });
  }, [socket, lobby, currentUser, currentRound]);

  // Soumettre une création
  const submitCreation = useCallback(async (textLayers, finalImageBase64) => {
    if (!socket || !lobby || !currentUser || !template) return false;
    
    setLoading(true);
    
    return new Promise((resolve) => {
      socket.emit('meme:submitCreation', {
        lobbyId: lobby.id,
        roundNumber: currentRound,
        odId: currentUser.id,
        pseudo: currentUser.pseudo,
        templateId: template.id,
        textLayers,
        finalImageBase64,
      }, (response) => {
        setLoading(false);
        if (response.success) {
          setHasSubmitted(true);
          setPhase('submitting');
        } else {
          setError(response.message);
        }
        resolve(response.success);
      });
    });
  }, [socket, lobby, currentUser, template, currentRound]);

  // Voter
  const vote = useCallback(async (voteType, isSuper = false) => {
    if (!socket || !lobby || !currentUser) return false;
    
    const currentMeme = allMemes[currentVoteIndex];
    if (!currentMeme) return false;
    
    return new Promise((resolve) => {
      socket.emit('meme:vote', {
        lobbyId: lobby.id,
        creationId: currentMeme.id,
        odId: currentUser.id,
        pseudo: currentUser.pseudo,
        voteType,
        isSuper,
      }, (response) => {
        if (response.success) {
          setHasVoted(true);
          if (isSuper) {
            setHasSuperVote(false);
          }
        } else {
          setError(response.message);
        }
        resolve(response.success);
      });
    });
  }, [socket, lobby, currentUser, allMemes, currentVoteIndex]);

  // Rejouer
  const playAgain = useCallback(async () => {
    // Reset l'état et retourner au lobby
    setPhase('lobby');
    setCurrentRound(1);
    setTemplate(null);
    setAssignment(null);
    setHasSubmitted(false);
    setAllMemes([]);
    setCurrentVoteIndex(0);
    setHasSuperVote(true);
    setVotesReceived({});
    setHasVoted(false);
    
    // Le lobby reste le même, juste reset pour une nouvelle partie
    if (lobby) {
      updatePlayersFromLobby({ ...lobby, participants: lobby.participants.map(p => ({ ...p, score: 0, memes: [] })) });
    }
  }, [lobby]);

  // Retour au menu
  const backToLobbyList = useCallback(async () => {
    await leaveLobby();
  }, [leaveLobby]);

  // ==================== COMPUTED VALUES ====================
  
  const currentMeme = allMemes[currentVoteIndex] || null;
  const isOwnMeme = currentMeme?.player_id === currentUser?.id;
  const isCreator = lobby?.creator_id === currentUser?.id;
  
  // Calcul des votants (tous sauf le créateur du meme actuel)
  const totalVoters = currentMeme 
    ? (lobby?.participants || []).filter(p => p.odId !== currentMeme.player_id).length 
    : 0;
  const votesCount = Object.keys(votesReceived).length;
  const allVoted = totalVoters > 0 && votesCount >= totalVoters;
  
  const canUndo = assignment?.templates_history?.length > 1 && 
    (assignment?.undos_used || 0) < (lobby?.settings?.maxUndos || 1);
  
  const rotationsUsed = assignment?.rotations_used || 0;
  const undosUsed = assignment?.undos_used || 0;

  return {
    // État
    lobby,
    phase,
    currentRound,
    timeRemaining,
    template,
    assignment,
    hasSubmitted,
    allMemes,
    currentMeme,
    currentVoteIndex,
    hasSuperVote,
    hasVoted,
    votesCount,
    totalVoters,
    allVoted,
    players,
    loading,
    error,
    
    // Computed
    isOwnMeme,
    isCreator,
    canUndo,
    rotationsUsed,
    undosUsed,
    
    // Actions
    createLobby,
    joinLobby,
    joinLobbyByCode,
    leaveLobby,
    updateSettings,
    startGame,
    rotateTemplate,
    undoTemplate,
    submitCreation,
    vote,
    playAgain,
    backToLobbyList,
    
    // Setters directs (pour les cas spéciaux)
    setError,
  };
}
