/**
 * Hook useSocket - Gestion de la connexion Socket.IO
 * Fournit une connexion temps reel avec le serveur
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState(null);
  const [socketReady, setSocketReady] = useState(false);
  
  // Etat global synchronise
  const [globalState, setGlobalState] = useState({
    lobbies: [],
    teams: [],
    participants: [],
    quizzes: [],
    questions: []
  });
  
  // Etat du lobby actuel
  const [currentLobbyState, setCurrentLobbyState] = useState(null);
  
  // Timer
  const [timerState, setTimerState] = useState({
    remaining: 0,
    total: 0,
    questionId: null
  });

  // Initialiser la connexion
  useEffect(() => {
    console.log('[SOCKET] Initialisation...');
    
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });
    
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('[SOCKET] Connecte:', socket.id);
      setIsConnected(true);
      setConnectionError(null);
      setSocketReady(true);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('[SOCKET] Deconnecte:', reason);
      setIsConnected(false);
    });
    
    socket.on('connect_error', (error) => {
      console.error('[SOCKET] Erreur de connexion:', error.message);
      setConnectionError(error.message);
      setIsConnected(false);
    });
    
    socket.on('global:state', (data) => {
      console.log('[SOCKET] global:state recu');
      setGlobalState(prev => ({ ...prev, ...data }));
    });
    
    socket.on('lobby:state', (data) => {
      console.log('[SOCKET] lobby:state recu');
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
  }, []);
  
  // Auth
  const login = useCallback((teamName, pseudo, password, isAdmin = false) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { 
        console.log('[SOCKET] login: socket non connecte');
        resolve({ success: false, message: 'Socket non connecte' }); 
        return; 
      }
      socketRef.current.emit('auth:login', { teamName, pseudo, password, isAdmin }, resolve);
    });
  }, []);
  
  const confirmTeamChange = useCallback((odId, newTeamName, password) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('auth:confirmTeamChange', { odId, newTeamName, password }, resolve);
    });
  }, []);
  
  // Lobby
  const createLobby = useCallback((quizId, shuffle = false) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('lobby:create', { quizId, shuffle }, resolve);
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
        }
        resolve(response);
      });
    });
  }, []);
  
  const leaveLobby = useCallback((lobbyId, odId) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('lobby:leave', { lobbyId, odId }, () => {
        setCurrentLobbyState(null);
        setTimerState({ remaining: 0, total: 0, questionId: null });
        resolve({ success: true });
      });
    });
  }, []);
  
  const deleteLobby = useCallback((lobbyId) => {
    return new Promise((resolve) => {
      if (!socketRef.current?.connected) { resolve({ success: false }); return; }
      socketRef.current.emit('lobby:delete', { lobbyId }, resolve);
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
    confirmTeamChange,
    // Lobby
    createLobby,
    joinLobby,
    leaveLobby,
    deleteLobby,
    // Quiz
    startQuiz,
    nextQuestion,
    // Answers
    saveDraft,
    submitAnswer,
    validateAnswer,
    // Admin
    joinMonitoring,
    leaveMonitoring,
    resetScores,
    // Events
    on,
    off
  };
}

export default useSocket;
