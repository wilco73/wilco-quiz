import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useMemeGame - Hook pour gérer le jeu Make It Meme via WebSocket
 * 
 * v4 - Fix timer: utilise timeRemaining du serveur (pas endTime)
 * 
 * @param {Object} socket - Instance socket.io
 * @param {Object} currentUser - { id, pseudo, role }
 * @returns {Object} État et actions du jeu
 */
export default function useMemeGame(socket, currentUser) {
  // États du jeu
  const [lobby, setLobby] = useState(null);
  const [phase, setPhase] = useState('lobby');
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
  
  // Ref pour le timer
  const timerRef = useRef(null);

  // ==================== TIMER LOCAL ====================
  // Le serveur envoie timeRemaining, on le décrémente localement
  
  useEffect(() => {
    // Nettoyer le timer précédent
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Si pas de temps ou phase lobby, pas de timer
    if (timeRemaining <= 0 || phase === 'lobby') {
      return;
    }
    
    // Décrémenter chaque seconde
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

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [phase]); // Redémarrer quand la phase change

  // ==================== SOCKET LISTENERS ====================
  
  useEffect(() => {
    if (!socket) return;

    // Lobby updates
    socket.on('meme:lobbyUpdated', (updatedLobby) => {
      console.log('[useMemeGame] lobbyUpdated:', updatedLobby?.id);
      setLobby(updatedLobby);
      updatePlayersFromLobby(updatedLobby);
    });

    socket.on('meme:lobbyDeleted', ({ lobbyId }) => {
      if (lobby?.id === lobbyId) {
        setLobby(null);
        setPhase('lobby');
      }
    });

    // Game started - utilise timeRemaining (pas endTime)
    socket.on('meme:gameStarted', ({ lobby: updatedLobby, phase: newPhase, roundNumber, timeRemaining: serverTime }) => {
      console.log('[useMemeGame] gameStarted:', { 
        lobbyId: updatedLobby?.id, 
        phase: newPhase, 
        roundNumber, 
        timeRemaining: serverTime
      });
      
      setLobby(updatedLobby);
      setPhase('creating');
      setCurrentRound(roundNumber);
      setTimeRemaining(serverTime || updatedLobby?.settings?.creationTime || 120);
      setHasSubmitted(false);
      setHasSuperVote(true);
      updatePlayersFromLobby(updatedLobby);
    });

    // Template assigned
    socket.on('meme:templateAssigned', ({ odId, assignment: newAssignment }) => {
      console.log('[useMemeGame] templateAssigned:', { 
        odId, 
        myId: currentUser?.id,
        templateId: newAssignment?.template?.id,
        templateUrl: newAssignment?.template?.image_url
      });
      
      if (odId === currentUser?.id) {
        setAssignment(newAssignment);
        setTemplate(newAssignment.template);
      }
    });

    // Creation submitted by someone
    socket.on('meme:creationSubmitted', ({ odId, pseudo, creationId }) => {
      setLobby(prev => {
        if (!prev) return prev;
        const updatedParticipants = (prev.participants || []).map(p => 
          p.odId === odId ? { ...p, hasSubmitted: true } : p
        );
        return { ...prev, participants: updatedParticipants };
      });
    });

    // Voting started
    socket.on('meme:votingStarted', ({ lobby: updatedLobby, creations, currentIndex, timeRemaining: serverTime }) => {
      console.log('[useMemeGame] votingStarted:', { timeRemaining: serverTime, creationsCount: creations?.length });
      setLobby(updatedLobby);
      setAllMemes(creations);
      setCurrentVoteIndex(currentIndex);
      setPhase('voting');
      setTimeRemaining(serverTime || updatedLobby?.settings?.voteTime || 30);
      setVotesReceived({});
      setHasVoted(false);
    });

    // Vote received
    socket.on('meme:voteReceived', ({ creationId, odId, voteType, isSuper, totalScore }) => {
      setVotesReceived(prev => ({
        ...prev,
        [creationId]: [...(prev[creationId] || []), { odId, voteType, isSuper }]
      }));
      
      // Mettre à jour le score du meme
      setAllMemes(prev => prev.map(m => 
        m.id === creationId ? { ...m, total_score: totalScore } : m
      ));
    });

    // Next vote
    socket.on('meme:nextVoteStarted', ({ lobby: updatedLobby, currentIndex, timeRemaining: serverTime }) => {
      setLobby(updatedLobby);
      setCurrentVoteIndex(currentIndex);
      setTimeRemaining(serverTime || updatedLobby?.settings?.voteTime || 30);
      setHasVoted(false);
    });

    // Round results
    socket.on('meme:roundResults', ({ lobby: updatedLobby, creations }) => {
      setLobby(updatedLobby);
      setAllMemes(creations);
      setPhase('round_results');
      updatePlayersFromLobby(updatedLobby);
    });

    // New round started
    socket.on('meme:newRoundStarted', ({ lobby: updatedLobby, roundNumber, timeRemaining: serverTime }) => {
      console.log('[useMemeGame] newRoundStarted:', { roundNumber, timeRemaining: serverTime });
      setLobby(updatedLobby);
      setCurrentRound(roundNumber);
      setPhase('creating');
      setTimeRemaining(serverTime || updatedLobby?.settings?.creationTime || 120);
      setHasSubmitted(false);
      setHasSuperVote(true);
      setTemplate(null);
      setAssignment(null);
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
  }, [socket, currentUser?.id]);

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
        if (response.success) {
          setLobby(response.lobby);
          setPhase('lobby');
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
    
    console.log('[useMemeGame] joinLobby:', lobbyId);
    
    return new Promise((resolve) => {
      socket.emit('meme:joinLobby', {
        lobbyId,
        odId: currentUser.id,
        pseudo: currentUser.pseudo,
      }, (response) => {
        setLoading(false);
        console.log('[useMemeGame] joinLobby response:', response);
        
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

  // Rejoindre un lobby par son code court
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
    if (!socket || !lobby) return false;
    
    return new Promise((resolve) => {
      socket.emit('meme:startGame', {
        lobbyId: lobby.id,
      }, (response) => {
        console.log('[useMemeGame] startGame response:', response);
        if (!response.success) {
          setError(response.message);
        }
        resolve(response.success);
      });
    });
  }, [socket, lobby]);

  // Rotation de template - NE PAS ÉJECTER SI ERREUR
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
          resolve(response.assignment);
        } else {
          // NE PAS setError pour ne pas éjecter - juste loguer
          console.log('[useMemeGame] rotateTemplate failed:', response.message);
          // On peut afficher un toast mais sans changer l'état
          resolve(null);
        }
      });
    });
  }, [socket, lobby, currentUser, currentRound]);

  // Undo de template
  const undoTemplate = useCallback(async () => {
    if (!socket || !lobby || !currentUser) return null;
    
    console.log('[useMemeGame] undoTemplate called', {
      lobbyId: lobby.id,
      roundNumber: currentRound,
      odId: currentUser.id,
      assignment: assignment
    });
    
    return new Promise((resolve) => {
      socket.emit('meme:undoTemplate', {
        lobbyId: lobby.id,
        roundNumber: currentRound,
        odId: currentUser.id,
      }, (response) => {
        console.log('[useMemeGame] undoTemplate response:', response);
        if (response.success) {
          setAssignment(response.assignment);
          setTemplate(response.assignment.template);
          resolve(response.assignment);
        } else {
          console.log('[useMemeGame] undoTemplate failed:', response.message);
          resolve(null);
        }
      });
    });
  }, [socket, lobby, currentUser, currentRound, assignment]);

  // Soumettre une création
  const submitCreation = useCallback(async (creationData) => {
    if (!socket || !lobby || !currentUser || !template) return false;
    
    setLoading(true);
    
    return new Promise((resolve) => {
      socket.emit('meme:submitCreation', {
        lobbyId: lobby.id,
        roundNumber: currentRound,
        odId: currentUser.id,
        pseudo: currentUser.pseudo,
        templateId: template.id,
        textLayers: creationData.textLayers,
        finalImageBase64: creationData.finalImage,
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
        }
        resolve(response.success);
      });
    });
  }, [socket, lobby, currentUser, allMemes, currentVoteIndex]);

  // Rejouer
  const playAgain = useCallback(async () => {
    // Réinitialiser l'état pour une nouvelle partie
    setPhase('lobby');
    setCurrentRound(1);
    setTemplate(null);
    setAssignment(null);
    setAllMemes([]);
    setHasSubmitted(false);
    setHasSuperVote(true);
    setHasVoted(false);
  }, []);

  // Retour à la liste
  const backToLobbyList = useCallback(() => {
    if (lobby) {
      leaveLobby();
    }
    setLobby(null);
    setPhase('lobby');
    setTemplate(null);
    setAssignment(null);
  }, [lobby, leaveLobby]);

  // ==================== COMPUTED VALUES ====================
  
  const currentMeme = allMemes[currentVoteIndex] || null;
  const isOwnMeme = currentMeme?.player_id === currentUser?.id;
  const isCreator = lobby?.creator_id === currentUser?.id;
  
  // Calcul des capacités d'undo/rotation
  const rotationsUsed = assignment?.rotations_used || 0;
  const undosUsed = assignment?.undos_used || 0;
  const maxRotations = lobby?.settings?.maxRotations ?? 3;
  const maxUndos = lobby?.settings?.maxUndos ?? 1;
  
  const canRotate = rotationsUsed < maxRotations;
  const canUndo = (assignment?.templates_history?.length > 1) && (undosUsed < maxUndos);

  const votesCount = Object.keys(votesReceived).reduce((acc, key) => 
    acc + (votesReceived[key]?.length || 0), 0
  );
  const totalVoters = (lobby?.participants?.length || 0) - 1;
  const allVoted = votesCount >= totalVoters;

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
    
    // Setters directs
    setError,
  };
}
