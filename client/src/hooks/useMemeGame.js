import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useMemeGame - Hook pour gérer le jeu Make It Meme
 * 
 * v8 - API REST pour l'upload d'image + Socket pour notifications
 */

// URL de l'API
const API_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
  ? 'http://localhost:3001'
  : 'https://wilco-quiz.onrender.com';

export default function useMemeGame(socket, currentUser) {
  const [lobby, setLobby] = useState(null);
  const [phase, setPhase] = useState('lobby');
  const [currentRound, setCurrentRound] = useState(1);
  const [timeRemaining, setTimeRemaining] = useState(0);
  
  const [template, setTemplate] = useState(null);
  const [assignment, setAssignment] = useState(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  
  const [allMemes, setAllMemes] = useState([]);
  const [currentVoteIndex, setCurrentVoteIndex] = useState(0);
  const [hasSuperVote, setHasSuperVote] = useState(true);
  const [votesReceived, setVotesReceived] = useState({});
  const [hasVoted, setHasVoted] = useState(false);
  
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const timerRef = useRef(null);
  const lobbyIdRef = useRef(null);

  // ==================== TIMER ====================
  
  const startTimer = useCallback((seconds) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeRemaining(seconds);
    if (seconds <= 0) return;
    
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
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

  // ==================== RECONNEXION ====================
  
  useEffect(() => {
    if (!socket || !currentUser) return;
    
    const handleConnect = () => {
      console.log('[useMemeGame] Socket connected');
      const currentLobbyId = lobbyIdRef.current;
      
      if (currentLobbyId) {
        console.log('[useMemeGame] Rejoining lobby:', currentLobbyId);
        socket.emit('meme:joinLobby', {
          lobbyId: currentLobbyId,
          odId: currentUser.id,
          pseudo: currentUser.pseudo,
        }, (response) => {
          if (response?.success) {
            setLobby(response.lobby);
            updatePlayersFromLobby(response.lobby);
          }
        });
      }
    };
    
    socket.on('connect', handleConnect);
    return () => socket.off('connect', handleConnect);
  }, [socket, currentUser, updatePlayersFromLobby]);

  // ==================== SOCKET LISTENERS ====================
  
  useEffect(() => {
    if (!socket) return;

    const handleLobbyUpdated = (updatedLobby) => {
      if (lobbyIdRef.current && updatedLobby.id !== lobbyIdRef.current) return;
      setLobby(updatedLobby);
      updatePlayersFromLobby(updatedLobby);
    };

    const handleLobbyDeleted = ({ lobbyId }) => {
      if (lobbyIdRef.current === lobbyId) {
        setLobby(null);
        setPhase('lobby');
        lobbyIdRef.current = null;
      }
    };

    const handleGameStarted = ({ lobby: updatedLobby, roundNumber, timeRemaining: serverTime }) => {
      console.log('[useMemeGame] gameStarted');
      setLobby(updatedLobby);
      lobbyIdRef.current = updatedLobby?.id;
      setPhase('creating');
      setCurrentRound(roundNumber);
      setHasSubmitted(false);
      setHasSuperVote(true);
      updatePlayersFromLobby(updatedLobby);
      startTimer(serverTime || 120);
    };

    const handleTemplateAssigned = ({ odId, assignment: newAssignment }) => {
      if (odId === currentUser?.id) {
        setAssignment(newAssignment);
        setTemplate(newAssignment.template);
      }
    };

    const handleCreationSubmitted = ({ odId }) => {
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
      console.log('[useMemeGame] votingStarted');
      setLobby(updatedLobby);
      lobbyIdRef.current = updatedLobby?.id;
      setAllMemes(creations || []);
      setCurrentVoteIndex(currentIndex || 0);
      setPhase('voting');
      setVotesReceived({});
      setHasVoted(false);
      updatePlayersFromLobby(updatedLobby);
      startTimer(serverTime || 30);
    };

    const handleVoteReceived = ({ creationId, totalScore }) => {
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
      setLobby(updatedLobby);
      setAllMemes(creations || []);
      setPhase('round_results');
      updatePlayersFromLobby(updatedLobby);
    };

    const handleNewRoundStarted = ({ lobby: updatedLobby, roundNumber, timeRemaining: serverTime }) => {
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
      setLobby(updatedLobby);
      setAllMemes(allCreations || []);
      setPhase('final_results');
      updatePlayersFromLobby(updatedLobby);
    };

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
          if (response.lobby.status === 'waiting') setPhase('lobby');
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
          if (response.lobby.status === 'waiting') setPhase('lobby');
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
        if (response?.success) setLobby(response.lobby);
        resolve(response?.success || false);
      });
    });
  }, [socket, lobby]);

  const startGame = useCallback(() => {
    if (!socket || !lobby) return Promise.resolve(false);
    
    return new Promise((resolve) => {
      socket.emit('meme:startGame', { lobbyId: lobby.id }, (response) => {
        if (!response?.success) setError(response?.message || 'Erreur démarrage');
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
        }
        resolve(response?.success ? response.assignment : null);
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
        }
        resolve(response?.success ? response.assignment : null);
      });
    });
  }, [socket, lobby, currentUser, currentRound]);

  // ==================== SUBMIT VIA API REST ====================
  
  const submitCreation = useCallback(async (creationData) => {
    if (!socket || !lobby || !currentUser || !template) {
      console.log('[useMemeGame] submitCreation: missing deps');
      return false;
    }
    
    console.log('[useMemeGame] submitCreation via API REST...');
    setLoading(true);
    setError(null);
    
    try {
      // 1. Upload via API REST
      const response = await fetch(`${API_URL}/api/meme-creations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobbyId: lobby.id,
          roundNumber: currentRound,
          odId: currentUser.id,
          pseudo: currentUser.pseudo,
          templateId: template.id,
          textLayers: creationData.textLayers || [],
          finalImageBase64: creationData.finalImage || '',
        }),
      });
      
      const result = await response.json();
      console.log('[useMemeGame] API response:', result);
      
      if (!result.success) {
        setError(result.message || 'Erreur envoi');
        setLoading(false);
        return false;
      }
      
      // 2. Notifier via socket (léger, pas d'image)
      socket.emit('meme:creationSubmittedNotify', {
        lobbyId: lobby.id,
        odId: currentUser.id,
        pseudo: currentUser.pseudo,
        creationId: result.creation.id,
        allSubmitted: result.allSubmitted,
      });
      
      setHasSubmitted(true);
      setPhase('submitting');
      setLoading(false);
      
      return true;
      
    } catch (err) {
      console.error('[useMemeGame] submitCreation error:', err);
      setError('Erreur réseau');
      setLoading(false);
      return false;
    }
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

  // ==================== COMPUTED ====================
  
  const currentMeme = allMemes[currentVoteIndex] || null;
  const isOwnMeme = currentMeme?.player_id === currentUser?.id;
  const isCreator = lobby?.creator_id === currentUser?.id;
  
  const rotationsUsed = assignment?.rotations_used || 0;
  const undosUsed = assignment?.undos_used || 0;
  const maxRotations = lobby?.settings?.maxRotations ?? 3;
  const maxUndos = lobby?.settings?.maxUndos ?? 1;
  
  const canRotate = rotationsUsed < maxRotations;
  const canUndo = (assignment?.templates_history?.length > 1) && (undosUsed < maxUndos);
  const votesCount = Object.values(votesReceived).reduce((acc, v) => acc + v.length, 0);
  const totalVoters = Math.max(0, (lobby?.participants?.length || 0) - 1);

  return {
    lobby, phase, currentRound, timeRemaining, template, assignment, hasSubmitted,
    allMemes, currentMeme, currentVoteIndex, hasSuperVote, hasVoted, votesCount,
    totalVoters, players, loading, error, isOwnMeme, isCreator, canUndo, canRotate,
    rotationsUsed, undosUsed, maxRotations, maxUndos,
    createLobby, joinLobby, joinLobbyByCode, leaveLobby, updateSettings, startGame,
    rotateTemplate, undoTemplate, submitCreation, vote, playAgain, backToLobbyList, setError,
  };
}
