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
import ProfileView from './components/ProfileView';
import HistoryView from './components/HistoryView';
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
  const { timerState, isConnected, currentLobbyState, socketReady } = socket;

  // Synchroniser le lobby actuel avec les mises a jour Socket
  useEffect(() => {
    // Mise a jour depuis currentLobbyState (events socket)
    if (currentLobbyState) {
      const updatedLobby = currentLobbyState.lobby;
      const updatedQuiz = currentLobbyState.quiz;
      
      if (updatedLobby) {
        const oldIndex = currentLobby?.session?.currentQuestionIndex || 0;
        const newIndex = updatedLobby.session?.currentQuestionIndex || 0;
        
        console.log('[APP] lobby:state - status:', updatedLobby.status, 'questionIndex:', newIndex);
        
        setCurrentLobby(updatedLobby);
        if (updatedQuiz) setCurrentQuiz(updatedQuiz);
        
        // Changement de question
        if (newIndex > oldIndex && !isAdmin) {
          setMyAnswer('');
          setHasAnswered(false);
        }
        
        // Quiz demarre - passer en vue quiz
        if (updatedLobby.status === 'playing' && view === 'lobby' && !isAdmin) {
          console.log('[APP] Quiz demarre, passage en vue quiz');
          setView('quiz');
        }
        
        // Quiz termine - ne pas forcer si l'utilisateur est deja sur une autre vue
        // (lobby-list, history, profile, etc.)
        if (updatedLobby.status === 'finished' && view === 'quiz' && !isAdmin) {
          setView('results');
        }
        
        // Synchroniser hasAnswered
        if (currentUser && !isAdmin) {
          const myParticipant = updatedLobby.participants?.find(p => p.participantId === currentUser.id);
          if (myParticipant) {
            setHasAnswered(myParticipant.hasAnswered || false);
            if (myParticipant.hasAnswered && myParticipant.currentAnswer) {
              setMyAnswer(myParticipant.currentAnswer);
            }
          }
        }
      }
    }
  }, [currentLobbyState, view, isAdmin, currentUser]);

  // Ecouter les evenements Socket - attendre que socketReady soit true
  useEffect(() => {
    if (!socketReady) {
      console.log('[APP] Socket pas encore pret pour les events');
      return;
    }
    
    console.log('[APP] Enregistrement des event listeners');
    
    const handleQuizStarted = (data) => {
      console.log('[EVENT] quiz:started recu', data);
      setCurrentLobby(data.lobby);
      setCurrentQuiz(data.quiz);
      // Mettre a jour aussi currentLobbyState pour eviter l'ecrasement
      socket.setCurrentLobbyState({ lobby: data.lobby, quiz: data.quiz });
      if (!isAdmin) {
        setView('quiz');
        setMyAnswer('');
        setHasAnswered(false);
      }
    };
    
    const handleQuestionChanged = (data) => {
      console.log('[EVENT] quiz:questionChanged recu', data.questionIndex);
      setCurrentLobby(data.lobby);
      if (data.quiz) setCurrentQuiz(data.quiz);
      // Mettre a jour aussi currentLobbyState
      socket.setCurrentLobbyState({ lobby: data.lobby, quiz: data.quiz || currentQuiz });
      if (!isAdmin) {
        setMyAnswer('');
        setHasAnswered(false);
      }
    };
    
    const handleQuizFinished = (data) => {
      console.log('[EVENT] quiz:finished recu', data);
      // Mettre à jour avec le lobby complet si disponible
      if (data.lobby) {
        setCurrentLobby(data.lobby);
        socket.setCurrentLobbyState({ lobby: data.lobby, quiz: data.quiz || currentQuiz });
      } else {
        // Fallback: juste mettre à jour le status
        setCurrentLobby(prev => prev ? { ...prev, status: 'finished' } : null);
      }
      if (data.quiz) {
        setCurrentQuiz(data.quiz);
      }
      if (!isAdmin) {
        setView('results');
      }
    };
    
    const handleTimerExpired = (data) => {
      console.log('[EVENT] timer:expired recu');
      if (!isAdmin && !hasAnswered) {
        setHasAnswered(true);
      }
    };
    
    const handleLobbyDeleted = (data) => {
      console.log('[EVENT] lobby:deleted recu');
      if (currentLobby?.id === data.lobbyId) {
        setCurrentLobby(null);
        setCurrentQuiz(null);
        socket.setCurrentLobbyState(null);
        if (!isAdmin) {
          setView('lobby-list');
          toast.info('La salle a ete supprimee');
        }
      }
    };
    
    const handleLobbyStopped = (data) => {
      console.log('[EVENT] lobby:stopped recu');
      if (currentLobby?.id === data.lobbyId) {
        setCurrentLobby(data.lobby);
        socket.setCurrentLobbyState({ lobby: data.lobby, quiz: currentQuiz });
        setMyAnswer('');
        setHasAnswered(false);
        if (!isAdmin) {
          setView('lobby');
          toast.info('Le quiz a ete arrete par l\'administrateur');
        }
      }
    };
    
    socket.on('quiz:started', handleQuizStarted);
    socket.on('quiz:questionChanged', handleQuestionChanged);
    socket.on('quiz:finished', handleQuizFinished);
    socket.on('timer:expired', handleTimerExpired);
    socket.on('lobby:deleted', handleLobbyDeleted);
    socket.on('lobby:stopped', handleLobbyStopped);
    
    return () => {
      console.log('[APP] Nettoyage des event listeners');
      socket.off('quiz:started', handleQuizStarted);
      socket.off('quiz:questionChanged', handleQuestionChanged);
      socket.off('quiz:finished', handleQuizFinished);
      socket.off('timer:expired', handleTimerExpired);
      socket.off('lobby:deleted', handleLobbyDeleted);
      socket.off('lobby:stopped', handleLobbyStopped);
    };
  }, [socketReady, isAdmin, hasAnswered, toast, currentLobby?.id, currentQuiz, socket]);

  // Restaurer la session
  useEffect(() => {
    if (hasReconnected.current) return;
    if (!isConnected) return;
    
    const savedSession = getSession();
    if (!savedSession) {
      hasReconnected.current = true;
      return;
    }
    
    if (savedSession.isAdmin) {
      setIsAdmin(true);
      setAdminUsername(savedSession.adminUsername || 'Admin');
      setView('admin');
      hasReconnected.current = true;
      return;
    }
    
    if (savedSession.currentUser) {
      setCurrentUser(savedSession.currentUser);
      
      // Attendre que les lobbies soient charges
      if (savedSession.currentLobbyId) {
        if (lobbies.length > 0) {
          setIsReconnecting(true);
          reconnectToLobby(savedSession.currentLobbyId, savedSession.currentUser);
          hasReconnected.current = true;
        }
        // Si lobbies pas encore charges, on attend le prochain render
      } else {
        setView('lobby-list');
        hasReconnected.current = true;
      }
    } else {
      hasReconnected.current = true;
    }
  }, [isConnected, lobbies.length]); // Utiliser lobbies.length au lieu de lobbies

  // Reconnexion a un lobby
  const reconnectToLobby = async (lobbyId, user) => {
    console.log('[APP] Tentative de reconnexion au lobby:', lobbyId);
    
    const lobby = lobbies.find(l => l.id === lobbyId);
    
    if (!lobby) {
      console.log('[APP] Lobby introuvable, redirection vers liste');
      setView('lobby-list');
      setIsReconnecting(false);
      saveSession({ currentUser: user });
      return;
    }
    
    const isInLobby = lobby.participants?.some(p => p.participantId === user.id);
    console.log('[APP] Est dans le lobby:', isInLobby, 'Status:', lobby.status);
    
    if (isInLobby) {
      setCurrentLobby(lobby);
      const quiz = quizzes.find(q => q.id === lobby.quizId);
      if (quiz) {
        setCurrentQuiz(quiz);
      }
      
      // Rejoindre la room Socket pour recevoir les events
      try {
        await socket.joinLobby(lobbyId, user.id, user.pseudo, user.teamName);
      } catch (err) {
        console.error('[APP] Erreur joinLobby:', err);
      }
      
      if (lobby.status === 'finished') {
        setView('results');
      } else if (lobby.status === 'playing' || lobby.session) {
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
      // Pas dans le lobby mais il est en attente, on peut rejoindre
      await handleJoinLobby(lobbyId);
    } else {
      console.log('[APP] Quiz deja en cours sans nous');
      setView('lobby-list');
      toast.info('Le quiz a continue sans vous');
      saveSession({ currentUser: user });
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
          onViewProfile={() => setView('profile')}
          onViewHistory={() => setView('history')}
          onLogout={handleLogout}
        />
      )}
      
      {view === 'history' && currentUser && (
        <HistoryView
          currentUser={currentUser}
          lobbies={lobbies}
          quizzes={quizzes}
          onViewResults={(lobby) => {
            setCurrentLobby(lobby);
            setCurrentQuiz(quizzes.find(q => q.id === lobby.quizId));
            setView('results');
          }}
          onBack={() => setView('lobby-list')}
        />
      )}
      
      {view === 'profile' && currentUser && (
        <ProfileView
          currentUser={currentUser}
          teams={teams}
          onUpdateProfile={(updatedUser) => {
            setCurrentUser(updatedUser);
            saveSession({ currentUser: updatedUser });
          }}
          onClose={() => setView('lobby-list')}
        />
      )}
      
      {view === 'lobby' && currentLobby && (
        <LobbyView
          currentLobby={currentLobby}
          quizzes={quizzes}
          participants={participants}
          onLeaveLobby={handleLeaveLobby}
        />
      )}
      
      {view === 'quiz' && (
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
      
      {view === 'results' && (
        <QuizResultsView
          currentLobby={currentLobby}
          quiz={currentQuiz || quizzes.find(q => q.id === currentLobby?.quizId)}
          currentUser={currentUser}
          participants={participants}
          teams={teams}
          onViewScoreboard={() => setView('scoreboard')}
          onBackToLobbies={() => {
            console.log('[APP] Quitter le quiz - retour a la liste des lobbies');
            // Reset du currentLobbyState pour eviter que le useEffect ne force la vue
            socket.setCurrentLobbyState(null);
            // Reset des etats locaux
            setCurrentLobby(null);
            setCurrentQuiz(null);
            setMyAnswer('');
            setHasAnswered(false);
            // Changer la vue
            setView('lobby-list');
            // Sauvegarder SANS currentLobbyId pour eviter la reconnexion
            saveSession({ currentUser, currentLobbyId: null });
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
