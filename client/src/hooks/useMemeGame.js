import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useMemeGame - Hook pour gérer le jeu Make It Meme via WebSocket
 * 
 * v5 - Simplifié:
 * - Socket pour tout (pas d'API REST)
 * - Timer local décrémenté après réception du temps serveur
 * - Gestion propre des listeners
 */
export default function useMemeGame(socket, currentUser) {
  // États du jeu
  const [lobby, setLobby] = useState(null);
  const [phase, setPhase] = useState('lobby'); // lobby, creating, submitting, voting, round_results, final_results
  const [currentRound, setCurrentRound] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
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
  
  // Refs
  const timerRef = useRef(null);
  const lobbyIdRef = useRef(null);

  // ==================== TIMER ====================
  
  // Fonction pour démarrer le timer avec une valeur
  const startTimer = useCallback((seconds) => {
    // Nettoyer le timer précédent
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    setTimeRemaining(seconds);
    
    if (seconds <= 0) return;
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // ==================== HELPERS ====================
  
  const updatePlayersFromLobby = useCallback((lobbyData) => {
    if (!lobbyData?.participants) return;
    setPlayers(lobbyData.participants.map(p => ({
      odId: p.odId,
      pseudo: p.pseudo,
      totalScore: p.score || 0,
    })));
  }, []);

  // ==================== SOCKET LISTENERS ====================
  
  useEffect(() => {
    if (!socket) return;

    const handleLobbyUpdated = (updatedLobby) => {
      // Vérifier que c'est bien notre lobby
      if (lobbyIdRef.current && updatedLobby.id !== lobbyIdRef.current) return;
      
      console.log('[useMemeGame] lobbyUpdated');
      setLobby(updatedLobby);
      updatePlayersFromLobby(updatedLobby);
    };

    const handleLobbyDeleted = ({ lobbyId }) => {
      if (lobbyIdRef.current === lobbyId) {
        console.log('[useMemeGame] lobbyDeleted');
        setLobby(null);
        setPhase('lobby');
        lobbyIdRef.current = null;
      }
    };

    const handleGameStarted = ({ lobby: updatedLobby, phase: newPhase, roundNumber, timeRemaining: serverTime }) => {
      console.log('[useMemeGame] gameStarted:', { phase: newPhase, roundNumber, timeRemaining: serverTime });
      
      setLobby(updatedLobby);
      setPhase('creating');
      setCurrentRound(roundNumber);
      setHasSubmitted(false);
      setHasSuperVote(true);
      updatePlayersFromLobby(updatedLobby);
      
      // Démarrer le timer
      startTimer(serverTime || 120);
    };

    const handleTemplateAssigned = ({ odId, assignment: newAssignment }) => {
      console.log('[useMemeGame] templateAssigned:', { odId, myId: currentUser?.id });
      
      if (odId === currentUser?.id) {
        setAssignment(newAssignment);
        setTemplate(newAssignment.template);
      }
    };

    const handleCreationSubmitted = ({ odId, pseudo }) => {
      // Marquer le joueur comme ayant soumis
      setLobby(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          participants: (prev.participants || []).map(p =>
            p.odId === odId ? { ...p, hasSubmitted: true } : p
          )
        };
      });
    };

    const handleVotingStarted = ({ lobby: updatedLobby, creations, currentIndex, timeRemaining: serverTime }) => {
      console.log('[useMemeGame] votingStarted:', { creationsCount: creations?.length });
      
      setLobby(updatedLobby);
      setAllMemes(creations || []);
      setCurrentVoteIndex(currentIndex || 0);
      setPhase('voting');
      setVotesReceived({});
      setHasVoted(false);
      updatePlayersFromLobby(updatedLobby);
      
      startTimer(serverTime || 30);
    };

    const handleVoteReceived = ({ creationId, odId, voteType, isSuper, totalScore }) => {
      setVotesReceived(prev => ({
        ...prev,
        [creationId]: [...(prev[creationId] || []), { odId, voteType, isSuper }]
      }));
      
      setAllMemes(prev => prev.map(m =>
        m.id === creationId ? { ...m, total_score: totalScore } : m
      ));
    };

    const handleNextVoteStarted = ({ lobby: updatedLobby, currentIndex, timeRemaining: serverTime }) => {
      setLobby(updatedLobby);
      setCurrentVoteIndex(currentIndex);
      setHasVoted(false);
      startTimer(serverTime || 30);
    };

    const handleRoundResults = ({ lobby: updatedLobby, creations }) => {
      console.log('[useMemeGame] roundResults');
      setLobby(updatedLobby);
      setAllMemes(creations || []);
      setPhase('round_results');
      updatePlayersFromLobby(updatedLobby);
    };

    const handleNewRoundStarted = ({ lobby: updatedLobby, roundNumber, timeRemaining: serverTime }) => {
      console.log('[useMemeGame] newRoundStarted:', { roundNumber });
      
      setLobby(updatedLobby);
      setCurrentRound(roundNumber);
      setPhase('creating');
      setHasSubmitted(false);
      setHasSuperVote(true);
      setTemplate(null);
      setAssignment(null);
      updatePlayersFromLobby(updatedLobby);
      
      startTimer(serverTime || 120);
    };

    const handleGameFinished = ({ lobby: updatedLobby, allCreations }) => {
      console.log('[useMemeGame] gameFinished');
      setLobby(updatedLobby);
      setAllMemes(allCreations || []);
      setPhase('final_results');
      updatePlayersFromLobby(updatedLobby);
    };

    // Enregistrer les listeners
    socket.on('meme:lobbyUpdated', handleLobbyUpdated);
    socket.on('meme:lobbyDeleted', handleLobbyDeleted);
    socket.on('meme:gameStarted', handleGameStarted);
    socket.on('meme:templateAssigned', handleTemplateAssigned);
    socket.on('meme:creationSubmitted', handleCreationSubmitted);
    socket.on('meme:votingStarted', handleVotingStarted);
    socket.on('meme:voteReceived', handleVoteReceived);
    socket.on('meme:nextVoteStarted', handleNextVoteStarted);
    socket.on('meme:roundResults', handleRoundResults);
    socket.on('meme:newRoundStarted', handleNewRoundStarted);
    socket.on('meme:gameFinished', handleGameFinished);

    return () => {
      socket.off('meme:lobbyUpdated', handleLobbyUpdated);
      socket.off('meme:lobbyDeleted', handleLobbyDeleted);
      socket.off('meme:gameStarted', handleGameStarted);
      socket.off('meme:templateAssigned', handleTemplateAssigned);
      socket.off('meme:creationSubmitted', handleCreationSubmitted);
      socket.off('meme:votingStarted', handleVotingStarted);
      socket.off('meme:voteReceived', handleVoteReceived);
      socket.off('meme:nextVoteStarted', handleNextVoteStarted);
      socket.off('meme:roundResults', handleRoundResults);
      socket.off('meme:newRoundStarted', handleNewRoundStarted);
      socket.off('meme:gameFinished', handleGameFinished);
    };
  }, [socket, currentUser?.id, updatePlayersFromLobby, startTimer]);

  // ==================== ACTIONS ====================

  const createLobby = useCallback((settings = {}) => {
    if (!socket || !currentUser) return Promise.resolve(null);
    
    setLoading(true);
    setError(null);
    
    return new Promise((resolve) => {
      socket.emit('meme:createLobby', {
        odId: currentUser.id,
        pseudo: currentUser.pseudo,
        settings: {
          rounds: settings.rounds || 3,
          creationTime: settings.creationTime || 120,
          voteTime: settings.voteTime || 30,
          maxRotations: settings.maxRotations || 3,
          maxUndos: settings.maxUndos || 1,
          tags: settings.tags || [],
        }
      }, (response) => {
        setLoading(false);
        if (response?.success) {
          setLobby(response.lobby);
          setPhase('lobby');
          lobbyIdRef.current = response.lobby.id;
          updatePlayersFromLobby(response.lobby);
          resolve(response.lobby);
        } else {
          setError(response?.message || 'Erreur création');
          resolve(null);
        }
      });
    });
  }, [socket, currentUser, updatePlayersFromLobby]);

  const joinLobby = useCallback((lobbyId) => {
    if (!socket || !currentUser) return Promise.resolve(null);
    
    setLoading(true);
    setError(null);
    
    return new Promise((resolve) => {
      socket.emit('meme:joinLobby', {
        lobbyId,
        odId: currentUser.id,
        pseudo: currentUser.pseudo,
      }, (response) => {
        setLoading(false);
        if (response?.success) {
          setLobby(response.lobby);
          lobbyIdRef.current = response.lobby.id;
          updatePlayersFromLobby(response.lobby);
          
          // Si jeu en cours, la phase sera mise à jour par gameStarted
          if (response.lobby.status === 'waiting') {
            setPhase('lobby');
          }
          
          resolve(response.lobby);
        } else {
          setError(response?.message || 'Erreur connexion');
          resolve(null);
        }
      });
    });
  }, [socket, currentUser, updatePlayersFromLobby]);

  const joinLobbyByCode = useCallback((code) => {
    if (!socket || !currentUser) return Promise.resolve(null);
    
    setLoading(true);
    setError(null);
    
    return new Promise((resolve) => {
      socket.emit('meme:joinLobbyByCode', {
        code: code.toUpperCase(),
        odId: currentUser.id,
        pseudo: currentUser.pseudo,
      }, (response) => {
        setLoading(false);
        if (response?.success) {
          setLobby(response.lobby);
          lobbyIdRef.current = response.lobby.id;
          updatePlayersFromLobby(response.lobby);
          
          if (response.lobby.status === 'waiting') {
            setPhase('lobby');
          }
          
          resolve(response.lobby);
        } else {
          setError(response?.message || 'Lobby non trouvé');
          resolve(null);
        }
      });
    });
  }, [socket, currentUser, updatePlayersFromLobby]);

  const leaveLobby = useCallback(() => {
    if (!socket || !lobby || !currentUser) return Promise.resolve(false);
    
    return new Promise((resolve) => {
      socket.emit('meme:leaveLobby', {
        lobbyId: lobby.id,
        odId: currentUser.id,
      }, (response) => {
        if (response?.success) {
          setLobby(null);
          setPhase('lobby');
          setTemplate(null);
          setAssignment(null);
          lobbyIdRef.current = null;
        }
        resolve(response?.success || false);
      });
    });
  }, [socket, lobby, currentUser]);

  const updateSettings = useCallback((settings) => {
    if (!socket || !lobby) return Promise.resolve(false);
    
    return new Promise((resolve) => {
      socket.emit('meme:updateSettings', {
        lobbyId: lobby.id,
        settings,
      }, (response) => {
        if (response?.success) {
          setLobby(response.lobby);
        }
        resolve(response?.success || false);
      });
    });
  }, [socket, lobby]);

  const startGame = useCallback(() => {
    if (!socket || !lobby) return Promise.resolve(false);
    
    return new Promise((resolve) => {
      socket.emit('meme:startGame', {
        lobbyId: lobby.id,
      }, (response) => {
        if (!response?.success) {
          setError(response?.message || 'Erreur démarrage');
        }
        resolve(response?.success || false);
      });
    });
  }, [socket, lobby]);

  const rotateTemplate = useCallback(() => {
    if (!socket || !lobby || !currentUser) return Promise.resolve(null);
    
    return new Promise((resolve) => {
      socket.emit('meme:rotateTemplate', {
        lobbyId: lobby.id,
        roundNumber: currentRound,
        odId: currentUser.id,
      }, (response) => {
        if (response?.success) {
          setAssignment(response.assignment);
          setTemplate(response.assignment.template);
          resolve(response.assignment);
        } else {
          console.log('[useMemeGame] rotateTemplate failed:', response?.message);
          resolve(null);
        }
      });
    });
  }, [socket, lobby, currentUser, currentRound]);

  const undoTemplate = useCallback(() => {
    if (!socket || !lobby || !currentUser) return Promise.resolve(null);
    
    return new Promise((resolve) => {
      socket.emit('meme:undoTemplate', {
        lobbyId: lobby.id,
        roundNumber: currentRound,
        odId: currentUser.id,
      }, (response) => {
        if (response?.success) {
          setAssignment(response.assignment);
          setTemplate(response.assignment.template);
          resolve(response.assignment);
        } else {
          console.log('[useMemeGame] undoTemplate failed:', response?.message);
          resolve(null);
        }
      });
    });
  }, [socket, lobby, currentUser, currentRound]);

  const submitCreation = useCallback((creationData) => {
    if (!socket || !lobby || !currentUser || !template) return Promise.resolve(false);
    
    setLoading(true);
    
    return new Promise((resolve) => {
      socket.emit('meme:submitCreation', {
        lobbyId: lobby.id,
        roundNumber: currentRound,
        odId: currentUser.id,
        pseudo: currentUser.pseudo,
        templateId: template.id,
        textLayers: creationData.textLayers || [],
        finalImageBase64: creationData.finalImage || '',
      }, (response) => {
        setLoading(false);
        if (response?.success) {
          setHasSubmitted(true);
          setPhase('submitting');
          resolve(true);
        } else {
          setError(response?.message || 'Erreur envoi');
          resolve(false);
        }
      });
    });
  }, [socket, lobby, currentUser, template, currentRound]);

  const vote = useCallback((voteType, isSuper = false) => {
    if (!socket || !lobby || !currentUser) return Promise.resolve(false);
    
    const currentMeme = allMemes[currentVoteIndex];
    if (!currentMeme) return Promise.resolve(false);
    
    return new Promise((resolve) => {
      socket.emit('meme:vote', {
        lobbyId: lobby.id,
        creationId: currentMeme.id,
        odId: currentUser.id,
        pseudo: currentUser.pseudo,
        voteType,
        isSuper,
      }, (response) => {
        if (response?.success) {
          setHasVoted(true);
          if (isSuper) setHasSuperVote(false);
        }
        resolve(response?.success || false);
      });
    });
  }, [socket, lobby, currentUser, allMemes, currentVoteIndex]);

  const playAgain = useCallback(() => {
    setPhase('lobby');
    setCurrentRound(1);
    setTemplate(null);
    setAssignment(null);
    setAllMemes([]);
    setHasSubmitted(false);
    setHasSuperVote(true);
    setHasVoted(false);
  }, []);

  const backToLobbyList = useCallback(() => {
    if (lobby) leaveLobby();
    setLobby(null);
    setPhase('lobby');
    setTemplate(null);
    setAssignment(null);
    lobbyIdRef.current = null;
  }, [lobby, leaveLobby]);

  // ==================== COMPUTED VALUES ====================
  
  const currentMeme = allMemes[currentVoteIndex] || null;
  const isOwnMeme = currentMeme?.player_id === currentUser?.id;
  const isCreator = lobby?.creator_id === currentUser?.id;
  
  const rotationsUsed = assignment?.rotations_used || 0;
  const undosUsed = assignment?.undos_used || 0;
  const maxRotations = lobby?.settings?.maxRotations ?? 3;
  const maxUndos = lobby?.settings?.maxUndos ?? 1;
  
  const canRotate = rotationsUsed < maxRotations;
  const canUndo = (assignment?.templates_history?.length > 1) && (undosUsed < maxUndos);

  const votesCount = Object.values(votesReceived).reduce((acc, votes) => acc + votes.length, 0);
  const totalVoters = Math.max(0, (lobby?.participants?.length || 0) - 1);

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
    players,
    loading,
    error,
    
    // Computed
    isOwnMeme,
    isCreator,
    canUndo,
    canRotate,
    rotationsUsed,
    undosUsed,
    maxRotations,
    maxUndos,
    
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
    
    // Setters
    setError,
  };
}
