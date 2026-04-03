/**
 * Hook useSocket - Gestion de la connexion Socket.IO
 * Fournit une connexion temps reel avec le serveur
 * Avec reconnexion automatique et restauration d'état
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

// Clés localStorage pour la persistance
const STORAGE_KEYS = {
  LOBBY_SESSION: 'wilcoquiz_lobby_session',
  USER_SESSION: 'wilcoquiz_user_session'
};

export function useSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [socketReady, setSocketReady] = useState(false);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  // Etat global synchronise
  const [globalState, setGlobalState] = useState({
    lobbies: [],
    teams: [],
    participants: [],
    quizzes: [],
    questions: []
  });
  
  // Etat du lobby actuel (quiz)
  const [currentLobbyState, setCurrentLobbyState] = useState(null);
  
  // Etat du mystery lobby pour la reconnexion
  const [currentMysteryLobbyState, setCurrentMysteryLobbyState] = useState(null);
  
  // Timer
  const [timerState, setTimerState] = useState({
    remaining: 0,
    total: 0,
    questionId: null
  });

  // Sauvegarder la session du lobby dans localStorage
  const saveLobbySession = useCallback((lobbyId, odId, pseudo, teamName, lobbyType = 'quiz') => {
    if (lobbyId && odId) {
      const session = { lobbyId, odId, pseudo, teamName, lobbyType, timestamp: Date.now() };
      localStorage.setItem(STORAGE_KEYS.LOBBY_SESSION, JSON.stringify(session));
      console.log('[SOCKET] Session lobby sauvegardée:', session);
    }
  }, []);

  // Récupérer la session du lobby
  const getLobbySession = useCallback(() => {
    try {
      const session = localStorage.getItem(STORAGE_KEYS.LOBBY_SESSION);
      if (session) {
        const parsed = JSON.parse(session);
        // Session valide pendant 4 heures
        if (Date.now() - parsed.timestamp < 4 * 60 * 60 * 1000) {
          return parsed;
        }
        localStorage.removeItem(STORAGE_KEYS.LOBBY_SESSION);
      }
    } catch (e) {
      console.error('[SOCKET] Erreur lecture session:', e);
    }
    return null;
  }, []);

  // Effacer la session du lobby
  const clearLobbySession = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.LOBBY_SESSION);
    console.log('[SOCKET] Session lobby effacée');
  }, []);

  // Tentative de reconnexion au lobby
  const attemptLobbyReconnect = useCallback(async (socket) => {
    const session = getLobbySession();
    if (!session) return;

    console.log('[SOCKET] Tentative de reconnexion au lobby:', session.lobbyId, 'type:', session.lobbyType);
    setIsReconnecting(true);

    try {
      if (session.lobbyType === 'mystery') {
        // Reconnexion lobby mystery
        socket.emit('mystery:joinLobby', {
          lobbyId: session.lobbyId,
          odId: session.odId,
          pseudo: session.pseudo,
          teamName: session.teamName
        }, (response) => {
          if (response.success && response.lobby) {
            console.log('[SOCKET] Reconnexion mystery réussie');
            // Définir l'état pour que App.js puisse afficher MysteryGameView
            setCurrentMysteryLobbyState(response.lobby);
          } else {
            console.log('[SOCKET] Reconnexion mystery échouée:', response.message);
            clearLobbySession();
            setCurrentMysteryLobbyState(null);
          }
          setIsReconnecting(false);
        });
      } else {
        // Reconnexion lobby quiz classique
        socket.emit('lobby:join', {
          lobbyId: session.lobbyId,
          odId: session.odId,
          pseudo: session.pseudo,
          teamName: session.teamName
        }, (response) => {
          if (response.success) {
            console.log('[SOCKET] Reconnexion quiz réussie');
            setCurrentLobbyState({ lobby: response.lobby, quiz: response.quiz });
          } else {
            console.log('[SOCKET] Reconnexion quiz échouée:', response.message);
            // Si le lobby n'existe plus, effacer la session
            if (response.message?.includes('introuvable') || response.message?.includes('terminé')) {
              clearLobbySession();
            }
          }
          setIsReconnecting(false);
        });
      }
    } catch (error) {
      console.error('[SOCKET] Erreur reconnexion:', error);
      setIsReconnecting(false);
    }
  }, [getLobbySession, clearLobbySession]);

  // Initialiser la connexion
  useEffect(() => {
    console.log('[SOCKET] Initialisation...');
    
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity, // Toujours essayer de se reconnecter
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
      timeout: 20000
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('[SOCKET] Connecté:', socket.id);
      setIsConnected(true);
      setConnectionError(null);
      setSocketReady(true);
      setReconnectAttempt(0);
      
      // Demander l'état global
      socket.emit('global:requestState');
      
      // Tenter de rejoindre le lobby précédent si reconnexion
      attemptLobbyReconnect(socket);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('[SOCKET] Déconnecté:', reason);
      setIsConnected(false);
      
      // Si déconnexion côté serveur, on garde la session pour reconnexion
      if (reason === 'io server disconnect') {
        console.log('[SOCKET] Déconnexion serveur - reconnexion manuelle nécessaire');
        socket.connect();
      }
    });
    
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`[SOCKET] Tentative de reconnexion #${attemptNumber}`);
      setReconnectAttempt(attemptNumber);
      setIsReconnecting(true);
    });
    
    socket.on('reconnect', (attemptNumber) => {
      console.log(`[SOCKET] Reconnecté après ${attemptNumber} tentative(s)`);
      setReconnectAttempt(0);
      setIsReconnecting(false);
    });
    
    socket.on('reconnect_failed', () => {
      console.error('[SOCKET] Échec de reconnexion après plusieurs tentatives');
      setConnectionError('Impossible de se reconnecter au serveur');
      setIsReconnecting(false);
    });
    
    socket.on('connect_error', (error) => {
      console.error('[SOCKET] Erreur de connexion:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });
    
    // État global complet (initialisation)
    socket.on('global:state', (data) => {
      console.log('[SOCKET] global:state reçu');
      setGlobalState(prev => ({ ...prev, ...data }));
    });
    
    // Mises à jour ciblées (optimisation bande passante)
    socket.on('global:lobbiesUpdate', (data) => {
      console.log('[SOCKET] global:lobbiesUpdate reçu -', data.lobbies?.length, 'lobbies');
      setGlobalState(prev => ({ ...prev, lobbies: data.lobbies }));
    });
    
    socket.on('global:teamsUpdate', (data) => {
      console.log('[SOCKET] global:teamsUpdate reçu');
      setGlobalState(prev => ({ ...prev, teams: data.teams }));
    });
    
    socket.on('global:participantsUpdate', (data) => {
      setGlobalState(prev => ({ ...prev, participants: data.participants }));
    });
    
    socket.on('global:quizzesUpdate', (data) => {
      setGlobalState(prev => ({ ...prev, quizzes: data.quizzes }));
    });
    
    socket.on('global:questionsUpdate', (data) => {
      setGlobalState(prev => ({ ...prev, questions: data.questions }));
    });
    
    socket.on('global:mysteryLobbiesUpdate', (data) => {
      console.log('[SOCKET] global:mysteryLobbiesUpdate reçu -', data.mysteryLobbies?.length, 'lobbies');
      setGlobalState(prev => ({ ...prev, mysteryLobbies: data.mysteryLobbies }));
    });
    
    socket.on('lobby:state', (data) => {
      console.log('[SOCKET] lobby:state reçu');
      setCurrentLobbyState(data);
    });
    
    socket.on('timer:tick', (data) => {
      setTimerState({
        remaining: data.remaining,
        total: data.total,
        questionId: data.questionId
      });
    });
    
    socket.on('timer:expired', () => {
      setTimerState(prev => ({ ...prev, remaining: 0 }));
    });
    
    return () => {
      console.log('[SOCKET] Cleanup');
      socket.disconnect();
    };
  }, [attemptLobbyReconnect]);
  
  // Auth - Login unifié (le serveur détermine le rôle)
  const login = useCallback((pseudo, password) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { 
        console.log('[SOCKET] login: socket non connecte');
        resolve({ success: false, message: 'Socket non connecté' }); 
        return; 
      }
      socketRef.current.emit('auth:login', { pseudo, password }, resolve);
    });
  }, []);
  
  // Récupérer les infos utilisateur (refresh)
  const getUser = useCallback((odId) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { 
        resolve({ success: false, message: 'Socket non connecté' }); 
        return; 
      }
      socketRef.current.emit('auth:getUser', { odId }, resolve);
    });
  }, []);
  
  // Mettre à jour le rôle d'un utilisateur (superadmin only)
  const updateUserRole = useCallback((requesterId, targetId, newRole) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { 
        resolve({ success: false, message: 'Socket non connecté' }); 
        return; 
      }
      socketRef.current.emit('auth:updateRole', { requesterId, targetId, newRole }, resolve);
    });
  }, []);
  
  const getAllUsers = useCallback((requesterId) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { 
        resolve({ success: false, message: 'Socket non connecté' }); 
        return; 
      }
      socketRef.current.emit('auth:getAllUsers', { requesterId }, resolve);
    });
  }, []);
  
  const confirmTeamChange = useCallback((odId, newTeamName) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('auth:confirmTeamChange', { odId, newTeamName }, resolve);
    });
  }, []);
  
  // Lobby
  const createLobby = useCallback((quizId, shuffle = false, trainingMode = false) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('lobby:create', { quizId, shuffle, trainingMode }, resolve);
    });
  }, []);
  
  const joinLobby = useCallback((lobbyId, odId, pseudo, teamName) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { 
        console.log('[SOCKET] joinLobby: socket non connecte');
        resolve({ success: false, message: 'Socket non connecte' }); 
        return; 
      }
      console.log('[SOCKET] joinLobby:', lobbyId, pseudo);
      socketRef.current.emit('lobby:join', { lobbyId, odId, pseudo, teamName }, (response) => {
        console.log('[SOCKET] joinLobby response:', response.success);
        if (response.success) {
          setCurrentLobbyState({ lobby: response.lobby, quiz: response.quiz });
          // Sauvegarder la session pour reconnexion automatique
          saveLobbySession(lobbyId, odId, pseudo, teamName, 'quiz');
        }
        resolve(response);
      });
    });
  }, [saveLobbySession]);
  
  const leaveLobby = useCallback((lobbyId, odId) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('lobby:leave', { lobbyId, odId }, () => {
        setCurrentLobbyState(null);
        setTimerState({ remaining: 0, total: 0, questionId: null });
        // Effacer la session
        clearLobbySession();
        resolve({ success: true });
      });
    });
  }, [clearLobbySession]);
  
  const deleteLobby = useCallback((lobbyId) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('lobby:delete', { lobbyId }, resolve);
    });
  }, []);
  
  const stopLobby = useCallback((lobbyId) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      console.log('[SOCKET] stopLobby:', lobbyId);
      socketRef.current.emit('lobby:stop', { lobbyId }, resolve);
    });
  }, []);
  
  // Quiz
  const startQuiz = useCallback((lobbyId) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      console.log('[SOCKET] startQuiz:', lobbyId);
      socketRef.current.emit('quiz:start', { lobbyId }, resolve);
    });
  }, []);
  
  const nextQuestion = useCallback((lobbyId) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('quiz:nextQuestion', { lobbyId }, resolve);
    });
  }, []);
  
  // Answers
  const saveDraft = useCallback((lobbyId, odId, answer) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('answer:draft', { lobbyId, odId, answer });
    }
  }, []);
  
  const reportPaste = useCallback((lobbyId, odId, questionId, pastedText) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('answer:paste', { lobbyId, odId, questionId, pastedText });
    }
  }, []);
  
  const submitAnswer = useCallback((lobbyId, odId, questionId, answer) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('answer:submit', { lobbyId, odId, questionId, answer }, resolve);
    });
  }, []);
  
  const validateAnswer = useCallback((lobbyId, odId, questionId, isCorrect, points) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('answer:validate', { lobbyId, odId, questionId, isCorrect, points }, resolve);
    });
  }, []);
  
  // Admin
  const joinMonitoring = useCallback((lobbyId) => {
    if (socketRef.current?.connected) {
      console.log('[SOCKET] joinMonitoring:', lobbyId);
      socketRef.current.emit('admin:joinMonitoring', { lobbyId });
    }
  }, []);
  
  const leaveMonitoring = useCallback((lobbyId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('admin:leaveMonitoring', { lobbyId });
    }
  }, []);
  
  const resetScores = useCallback(() => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('admin:resetScores', resolve);
    });
  }, []);
  
  // ==================== DRAWING LOBBY ====================
  
  const joinDrawingLobby = useCallback((lobbyId, odId, pseudo, teamName) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { 
        resolve({ success: false, message: 'Socket non connecté' }); 
        return; 
      }
      socketRef.current.emit('drawingLobby:join', { lobbyId, odId, pseudo, teamName }, resolve);
    });
  }, []);
  
  const leaveDrawingLobby = useCallback((lobbyId, odId) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('drawingLobby:leave', { lobbyId, odId }, resolve);
    });
  }, []);
  
  const addCustomWord = useCallback((lobbyId, word, addedBy) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('drawingLobby:addCustomWord', { lobbyId, word, addedBy }, resolve);
    });
  }, []);
  
  const removeCustomWord = useCallback((lobbyId, wordId) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('drawingLobby:removeCustomWord', { lobbyId, wordId }, resolve);
    });
  }, []);
  
  // ==================== PICTIONARY ====================
  
  const startPictionary = useCallback((lobbyId, config, words) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('pictionary:start', { lobbyId, config, words }, resolve);
    });
  }, []);
  
  const pictionaryGuess = useCallback((lobbyId, odId, teamName, guess) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('pictionary:guess', { lobbyId, odId, teamName, guess }, resolve);
    });
  }, []);
  
  const pictionaryNextRound = useCallback((lobbyId) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('pictionary:nextRound', { lobbyId }, resolve);
    });
  }, []);
  
  const pictionaryEnd = useCallback((lobbyId) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('pictionary:end', { lobbyId }, resolve);
    });
  }, []);
  
  const pictionarySaveDrawing = useCallback((lobbyId, round, teamName, word, imageData) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('pictionary:saveDrawing', { lobbyId, round, teamName, word, imageData }, resolve);
    });
  }, []);
  
  // ==================== PASSE MOI LE RELAIS (Relay) ====================
  
  const startRelay = useCallback((lobbyId, config, references) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('relay:start', { lobbyId, config, references }, resolve);
    });
  }, []);
  
  const relaySaveDrawing = useCallback((lobbyId, teamName, imageData) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('relay:saveDrawing', { lobbyId, teamName, imageData }, resolve);
    });
  }, []);
  
  const relayEnd = useCallback((lobbyId) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('relay:end', { lobbyId }, resolve);
    });
  }, []);
  
  const relayJoinMonitoring = useCallback((lobbyId) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('relay:joinMonitoring', { lobbyId }, resolve);
    });
  }, []);
  
  // ==================== MYSTERY GRID ====================
  
  const mysteryCreateLobby = useCallback((gridId, odId) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('mystery:createLobby', { gridId, odId }, resolve);
    });
  }, []);
  
  const mysteryJoinLobby = useCallback((lobbyId, odId, pseudo, teamName) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('mystery:joinLobby', { lobbyId, odId, pseudo, teamName }, (response) => {
        if (response.success) {
          // Sauvegarder la session pour la reconnexion
          saveLobbySession(lobbyId, odId, pseudo, teamName, 'mystery');
        }
        resolve(response);
      });
    });
  }, [saveLobbySession]);
  
  const mysteryLeaveLobby = useCallback((lobbyId, odId) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('mystery:leaveLobby', { lobbyId, odId }, (response) => {
        // Effacer la session
        clearLobbySession();
        resolve(response);
      });
    });
  }, [clearLobbySession]);
  
  const mysteryJoinMonitoring = useCallback((lobbyId) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('mystery:joinMonitoring', { lobbyId }, resolve);
    });
  }, []);
  
  const mysteryStartGame = useCallback((lobbyId, odId, role) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('mystery:startGame', { lobbyId, odId, role }, resolve);
    });
  }, []);
  
  const mysteryRevealCell = useCallback((lobbyId, cellIndex, odId, role) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('mystery:revealCell', { lobbyId, cellIndex, odId, role }, resolve);
    });
  }, []);
  
  const mysteryCloseReveal = useCallback((lobbyId, odId, role) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('mystery:closeReveal', { lobbyId, odId, role }, resolve);
    });
  }, []);
  
  const mysteryFinishGame = useCallback((lobbyId, odId, role) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('mystery:finishGame', { lobbyId, odId, role }, resolve);
    });
  }, []);
  
  const mysteryDeleteLobby = useCallback((lobbyId, odId, role) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('mystery:deleteLobby', { lobbyId, odId, role }, resolve);
    });
  }, []);
  
  const mysteryToggleMute = useCallback((lobbyId, odId, muted) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('mystery:toggleMute', { lobbyId, odId, muted }, resolve);
    });
  }, []);
  
  // Demander les questions (chargement à la demande pour les admins)
  const requestQuestions = useCallback(() => {
    if (socketRef.current?.connected) {
      console.log('[SOCKET] Demande des questions...');
      socketRef.current.emit('global:requestQuestions');
    }
  }, []);
  
  // Emit générique pour le dessin (avec support callback optionnel)
  const emit = useCallback((event, data, callback) => {
    if (socketRef.current?.connected) {
      if (callback) {
        socketRef.current.emit(event, data, callback);
      } else {
        socketRef.current.emit(event, data);
      }
    }
  }, []);
  
  // Event listeners - accede directement au socket
  const on = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  }, []);
  
  const off = useCallback((event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

  return {
    socket: socketRef.current,
    socketReady,
    isConnected,
    connectionError,
    globalState,
    currentLobbyState,
    timerState,
    setCurrentLobbyState,
    // Auth
    login,
    getUser,
    updateUserRole,
    getAllUsers,
    confirmTeamChange,
    // Lobby
    createLobby,
    joinLobby,
    leaveLobby,
    deleteLobby,
    stopLobby,
    // Quiz
    startQuiz,
    nextQuestion,
    // Answers
    saveDraft,
    reportPaste,
    submitAnswer,
    validateAnswer,
    // Admin
    joinMonitoring,
    leaveMonitoring,
    resetScores,
    // Drawing Lobby
    joinDrawingLobby,
    leaveDrawingLobby,
    addCustomWord,
    removeCustomWord,
    // Pictionary
    startPictionary,
    pictionaryGuess,
    pictionaryNextRound,
    pictionaryEnd,
    pictionarySaveDrawing,
    // Relay (Passe moi le relais)
    startRelay,
    relaySaveDrawing,
    relayEnd,
    relayJoinMonitoring,
    // Mystery Grid
    mysteryCreateLobby,
    mysteryJoinLobby,
    mysteryLeaveLobby,
    mysteryJoinMonitoring,
    mysteryStartGame,
    mysteryRevealCell,
    mysteryCloseReveal,
    mysteryFinishGame,
    mysteryDeleteLobby,
    mysteryToggleMute,
    // Questions (chargement à la demande)
    requestQuestions,
    // Generic
    emit,
    // Events
    on,
    off
  };
}

export default useSocket;
