import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSocketContext } from './contexts/SocketContext';
import { saveSession, getSession, clearSession } from './services/storage';
import * as api from './services/api';
import LoginView from './components/LoginView';
import LobbyViewList from './components/LobbyViewList';
import LobbyView from './components/LobbyView';
import QuizView from './components/QuizView';
import QuizResultsView from './components/QuizResultsView';
import ScoreboardView from './components/ScoreboardView';
import AdminDashboard from './components/AdminDashboard';
import ReconnectingScreen from './components/ReconnectingScreen';
import { useToast } from './components/ToastProvider';
import './App.css';

const App = () => {
  const socket = useSocketContext();
  const toast = useToast();
  
  // Etats principaux
  const [view, setView] = useState('login');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [adminUsername, setAdminUsername] = useState('');
  const [currentLobby, setCurrentLobby] = useState(null);
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [myAnswer, setMyAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  const hasReconnected = useRef(false);
  const draftTimeoutRef = useRef(null);
  
  // Raccourcis vers l'etat global Socket
  const { lobbies, teams, participants, quizzes, questions } = socket.globalState;
  const { timerState, isConnected, currentLobbyState } = socket;

  // Synchroniser le lobby actuel avec les mises a jour Socket
  useEffect(() => {
    if (currentLobbyState && currentLobby) {
      const updatedLobby = currentLobbyState.lobby;
      const updatedQuiz = currentLobbyState.quiz;
      
      if (updatedLobby) {
        const oldIndex = currentLobby.session?.currentQuestionIndex || 0;
        const newIndex = updatedLobby.session?.currentQuestionIndex || 0;
        
        setCurrentLobby(updatedLobby);
        if (updatedQuiz) setCurrentQuiz(updatedQuiz);
        
        // Changement de question
        if (newIndex > oldIndex && !isAdmin) {
          setMyAnswer('');
          setHasAnswered(false);
        }
        
        // Quiz demarre
        if (updatedLobby.session && view === 'lobby' && !isAdmin) {
          setView('quiz');
        }
        
        // Quiz termine
        if (updatedLobby.status === 'finished' && view !== 'results' && view !== 'scoreboard' && !isAdmin) {
          setView('results');
        }
        
        // Synchroniser hasAnswered
        if (currentUser && !isAdmin) {
          const myParticipant = updatedLobby.participants?.find(p => p.participantId === currentUser.id);
          if (myParticipant) {
            setHasAnswered(myParticipant.hasAnswered);
            if (myParticipant.hasAnswered && myParticipant.currentAnswer) {
              setMyAnswer(myParticipant.currentAnswer);
            }
          }
        }
      }
    }
  }, [currentLobbyState, currentLobby, view, isAdmin, currentUser]);

  // Ecouter les evenements Socket
  useEffect(() => {
    if (!socket.socket) return;
    
    const handleQuizStarted = (data) => {
      console.log('[EVENT] Quiz demarre', data);
      setCurrentLobby(data.lobby);
      setCurrentQuiz(data.quiz);
      if (!isAdmin) {
        setView('quiz');
        setMyAnswer('');
        setHasAnswered(false);
      }
    };
    
    const handleQuestionChanged = (data) => {
      console.log('[EVENT] Question changee', data.questionIndex);
      setCurrentLobby(data.lobby);
      if (!isAdmin) {
        setMyAnswer('');
        setHasAnswered(false);
      }
    };
    
    const handleQuizFinished = (data) => {
      console.log('[EVENT] Quiz termine');
      if (!isAdmin) {
        setView('results');
      }
    };
    
    const handleTimerExpired = (data) => {
      console.log('[EVENT] Timer expire');
      if (!isAdmin && !hasAnswered) {
        // Le serveur a deja soumis la reponse
        setHasAnswered(true);
      }
    };
    
    const handleLobbyDeleted = (data) => {
      console.log('[EVENT] Lobby supprime');
      if (currentLobby?.id === data.lobbyId) {
        setCurrentLobby(null);
        setCurrentQuiz(null);
        if (!isAdmin) {
          setView('lobby-list');
          toast.info('La salle a ete supprimee');
        }
      }
    };
    
    socket.on('quiz:started', handleQuizStarted);
    socket.on('quiz:questionChanged', handleQuestionChanged);
    socket.on('quiz:finished', handleQuizFinished);
    socket.on('timer:expired', handleTimerExpired);
    socket.on('lobby:deleted', handleLobbyDeleted);
    
    return () => {
      socket.off('quiz:started', handleQuizStarted);
      socket.off('quiz:questionChanged', handleQuestionChanged);
      socket.off('quiz:finished', handleQuizFinished);
      socket.off('timer:expired', handleTimerExpired);
      socket.off('lobby:deleted', handleLobbyDeleted);
    };
  }, [socket, isAdmin, currentLobby, hasAnswered, toast]);

  // Restaurer la session
  useEffect(() => {
    if (hasReconnected.current || !isConnected) return;
    
    const savedSession = getSession();
    if (savedSession) {
      if (savedSession.isAdmin) {
        setIsAdmin(true);
        setAdminUsername(savedSession.adminUsername || 'Admin');
        setView('admin');
        hasReconnected.current = true;
      } else if (savedSession.currentUser) {
        setCurrentUser(savedSession.currentUser);
        
        if (savedSession.currentLobbyId && lobbies.length > 0) {
          setIsReconnecting(true);
          reconnectToLobby(savedSession.currentLobbyId, savedSession.currentUser);
        } else {
          setView('lobby-list');
        }
        hasReconnected.current = true;
      }
    } else {
      hasReconnected.current = true;
    }
  }, [isConnected, lobbies]);

  // Reconnexion a un lobby
  const reconnectToLobby = async (lobbyId, user) => {
    const lobby = lobbies.find(l => l.id === lobbyId);
    
    if (!lobby) {
      setView('lobby-list');
      setIsReconnecting(false);
      return;
    }
    
    const isInLobby = lobby.participants?.some(p => p.participantId === user.id);
    
    if (isInLobby) {
      setCurrentLobby(lobby);
      const quiz = quizzes.find(q => q.id === lobby.quizId);
      setCurrentQuiz(quiz);
      
      // Rejoindre la room Socket
      await socket.joinLobby(lobbyId, user.id, user.pseudo, user.teamName);
      
      if (lobby.status === 'finished') {
        setView('results');
      } else if (lobby.session) {
        const participant = lobby.participants.find(p => p.participantId === user.id);
        if (participant?.hasAnswered) {
          setHasAnswered(true);
          setMyAnswer(participant.currentAnswer || '');
        }
        setView('quiz');
      } else {
        setView('lobby');
      }
    } else if (lobby.status === 'waiting') {
      await handleJoinLobby(lobbyId);
    } else {
      setView('lobby-list');
      toast.info('Le quiz a continue sans vous');
    }
    
    setIsReconnecting(false);
  };

  // === HANDLERS ===
  
  const handleLogin = async (teamName, pseudo, password, adminMode) => {
    if (adminMode) {
      try {
        const result = await api.adminLogin(pseudo, password);
        if (result.success) {
          setIsAdmin(true);
          setAdminUsername(pseudo);
          setView('admin');
          saveSession({ isAdmin: true, adminUsername: pseudo });
          toast.success('Connexion admin reussie');
        } else {
          toast.error(result.message || 'Echec connexion admin');
        }
      } catch (error) {
        toast.error('Erreur de connexion');
      }
      return;
    }
    
    // Login participant via Socket
    const result = await socket.login(teamName, pseudo, password, false);
    
    if (result.success) {
      setCurrentUser(result.user);
      setView('lobby-list');
      saveSession({ currentUser: result.user });
      toast.success(`Bienvenue ${result.user.pseudo} !`);
    } else if (result.needsConfirmation) {
      const confirmed = window.confirm(
        `${result.message}\n\nVoulez-vous changer d'equipe vers "${teamName}" ?`
      );
      
      if (confirmed) {
        const changeResult = await socket.confirmTeamChange(result.participant.id, teamName, password);
        if (changeResult.success) {
          setCurrentUser(changeResult.user);
          setView('lobby-list');
          saveSession({ currentUser: changeResult.user });
          toast.success('Equipe changee avec succes');
        }
      } else {
        setCurrentUser(result.participant);
        setView('lobby-list');
        saveSession({ currentUser: result.participant });
      }
    } else {
      toast.error(result.message || 'Echec connexion');
    }
  };

  const handleJoinLobby = async (lobbyId) => {
    if (!currentUser) return;
    
    const result = await socket.joinLobby(lobbyId, currentUser.id, currentUser.pseudo, currentUser.teamName);
    
    if (result.success) {
      setCurrentLobby(result.lobby);
      setCurrentQuiz(result.quiz);
      setView('lobby');
      saveSession({ currentUser, currentLobbyId: lobbyId });
    } else {
      toast.error(result.message || 'Impossible de rejoindre');
    }
  };

  const handleLeaveLobby = async () => {
    if (!currentLobby || !currentUser) return;
    
    await socket.leaveLobby(currentLobby.id, currentUser.id);
    
    setCurrentLobby(null);
    setCurrentQuiz(null);
    setMyAnswer('');
    setHasAnswered(false);
    setView('lobby-list');
    saveSession({ currentUser });
  };

  const handleAnswerChange = (answer) => {
    setMyAnswer(answer);
    
    // Debounce pour sauvegarder le brouillon
    if (draftTimeoutRef.current) {
      clearTimeout(draftTimeoutRef.current);
    }
    
    draftTimeoutRef.current = setTimeout(() => {
      if (currentLobby && currentUser) {
        socket.saveDraft(currentLobby.id, currentUser.id, answer);
      }
    }, 300);
  };

  const handleSubmitAnswer = async () => {
    if (!currentLobby || !currentUser || !currentQuiz) return;
    
    const questions = currentLobby.shuffled && currentLobby.shuffledQuestions
      ? currentLobby.shuffledQuestions
      : currentQuiz.questions;
    const currentIndex = currentLobby.session?.currentQuestionIndex || 0;
    const currentQuestion = questions[currentIndex];
    
    if (!currentQuestion) return;
    
    const result = await socket.submitAnswer(
      currentLobby.id,
      currentUser.id,
      currentQuestion.id,
      myAnswer
    );
    
    if (result.success) {
      setHasAnswered(true);
    } else {
      toast.error(result.message || 'Erreur lors de la soumission');
    }
  };

  const handleLogout = () => {
    if (currentLobby && currentUser) {
      socket.leaveLobby(currentLobby.id, currentUser.id);
    }
    
    clearSession();
    setCurrentUser(null);
    setCurrentLobby(null);
    setCurrentQuiz(null);
    setIsAdmin(false);
    setAdminUsername('');
    setMyAnswer('');
    setHasAnswered(false);
    setView('login');
    hasReconnected.current = false;
  };

  const handleRefreshData = useCallback(async () => {
    // Plus besoin avec Socket.IO, les donnees sont automatiquement synchronisees
    // Cette fonction est gardee pour compatibilite
  }, []);

  const handleUpdateParticipant = async (participantId, updates) => {
    try {
      const data = await api.updateParticipant(participantId, updates);
      if (data.success) {
        toast.success('Participant mis a jour');
      }
    } catch (error) {
      toast.error('Erreur lors de la mise a jour');
    }
  };

  const handleDeleteTeam = async (teamName) => {
    try {
      const data = await api.deleteTeam(teamName);
      if (data.success) {
        toast.success(`Equipe "${teamName}" supprimee`);
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // === RENDER ===
  
  if (!isConnected && view !== 'login') {
    return <ReconnectingScreen />;
  }
  
  if (isReconnecting) {
    return <ReconnectingScreen />;
  }

  return (
    <div className="App">
      {view === 'login' && (
        <LoginView onLogin={handleLogin} />
      )}
      
      {view === 'lobby-list' && currentUser && (
        <LobbyViewList
          currentUser={currentUser}
          lobbies={lobbies}
          quizzes={quizzes}
          teams={teams}
          participants={participants}
          onJoinLobby={handleJoinLobby}
          onViewScoreboard={() => setView('scoreboard')}
          onLogout={handleLogout}
        />
      )}
      
      {view === 'lobby' && currentLobby && (
        <LobbyView
          currentLobby={currentLobby}
          quizzes={quizzes}
          onLeaveLobby={handleLeaveLobby}
        />
      )}
      
      {view === 'quiz' && currentLobby && currentQuiz && (
        <QuizView
          lobby={currentLobby}
          quiz={currentQuiz}
          currentUser={currentUser}
          myAnswer={myAnswer}
          hasAnswered={hasAnswered}
          timerRemaining={timerState.remaining}
          onAnswerChange={handleAnswerChange}
          onSubmitAnswer={handleSubmitAnswer}
          onLeaveLobby={handleLeaveLobby}
        />
      )}
      
      {view === 'results' && currentLobby && (
        <QuizResultsView
          lobby={currentLobby}
          quiz={currentQuiz || quizzes.find(q => q.id === currentLobby.quizId)}
          currentUser={currentUser}
          teams={teams}
          onViewScoreboard={() => setView('scoreboard')}
          onBackToLobbies={() => {
            setCurrentLobby(null);
            setCurrentQuiz(null);
            setView('lobby-list');
            saveSession({ currentUser });
          }}
        />
      )}
      
      {view === 'scoreboard' && (
        <ScoreboardView
          teams={teams}
          currentUser={currentUser}
          onBack={() => setView(currentLobby ? 'results' : 'lobby-list')}
        />
      )}
      
      {view === 'admin' && (
        <AdminDashboard
          adminUsername={adminUsername}
          lobbies={lobbies}
          teams={teams}
          participants={participants}
          quizzes={quizzes}
          questions={questions}
          socket={socket}
          onLogout={handleLogout}
          onRefreshData={handleRefreshData}
          onUpdateParticipant={handleUpdateParticipant}
          onDeleteTeam={handleDeleteTeam}
        />
      )}
    </div>
  );
};

export default App;
