import React, { useState, useEffect, useRef } from 'react';
import * as api from './services/api';
import { saveSession, getSession, clearSession } from './services/storage';
import { useQuizData } from './hooks/useQuizData';
import LoginView from './components/LoginView';
import LobbyViewList from './components/LobbyViewList';
import LobbyView from './components/LobbyView';
import QuizView from './components/QuizView';
import AdminDashboard from './components/AdminDashboard';
import './App.css';

const App = () => {
  // États globaux
  const [view, setView] = useState('login');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [adminUsername, setAdminUsername] = useState('');
  const [currentLobby, setCurrentLobby] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [myAnswer, setMyAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);

  // Hook personnalisé pour les données
  const shouldPoll = view !== 'login' && !isAdmin;
  const {
    teams,
    setTeams,
    participants,
    setParticipants,
    quizzes,
    setQuizzes,
    questions,
    setQuestions,
    lobbies,
    setLobbies,
    loading,
    loadLobbies
  } = useQuizData(shouldPoll);

  const pollingIntervalRef = useRef(null);

  // Restaurer la session au chargement
  useEffect(() => {
    const savedSession = getSession();
    if (savedSession) {
      if (savedSession.isAdmin) {
        setIsAdmin(true);
        setAdminUsername(savedSession.adminUsername || 'Admin');
        setView('admin');
      } else if (savedSession.currentUser) {
        setCurrentUser(savedSession.currentUser);
        setView('lobby-list');
      }
    }
  }, []);

  // Polling pour les lobbies en mode participant
  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    if (view !== 'login' && !isAdmin && currentLobby) {
      pollingIntervalRef.current = setInterval(async () => {
        await updateCurrentLobby();
      }, 1000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [view, isAdmin, currentLobby]);

  // Mettre à jour le lobby actuel
  const updateCurrentLobby = async () => {
    try {
      const lobbiesData = await api.fetchLobbies();
      setLobbies(lobbiesData);

      if (currentLobby) {
        const updated = lobbiesData.find(l => l.id === currentLobby.id);
        if (updated) {
          setCurrentLobby(updated);

          // Démarrage de la session
          if (updated.session && !currentSession) {
            setCurrentSession(updated.session);
            setView('quiz');
          }

          // Mise à jour de la session
          if (updated.session && currentSession) {
            const oldQuestionIndex = currentSession.currentQuestionIndex || 0;
            const newQuestionIndex = updated.session.currentQuestionIndex || 0;

            setCurrentSession(updated.session);

            // Nouvelle question : réinitialiser la réponse
            if (newQuestionIndex > oldQuestionIndex) {
              setMyAnswer('');
              setHasAnswered(false);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erreur mise à jour lobby:', error);
    }
  };

  // ==================== HANDLERS LOGIN ====================
  const handleLogin = async (teamName, pseudo, password, isAdminLogin = false) => {
    if (isAdminLogin) {
      try {
        const data = await api.adminLogin(pseudo, password);
        if (data.success) {
          setIsAdmin(true);
          setAdminUsername(data.username);
          setView('admin');
          saveSession({ isAdmin: true, adminUsername: data.username });
        } else {
          alert(data.message || 'Identifiants incorrects');
        }
      } catch (error) {
        alert('Erreur de connexion');
      }
      return;
    }

    // Connexion participant
    const existingParticipant = participants.find(p => p.pseudo === pseudo);

    if (existingParticipant) {
      if (existingParticipant.password !== password) {
        alert('Ce pseudo existe avec un mot de passe différent');
        return;
      }
      if (existingParticipant.teamName !== teamName) {
        alert(`Ce pseudo est dans l'équipe "${existingParticipant.teamName}"`);
        return;
      }
    }

    let team = teams.find(t => t.name === teamName);
    if (!team) {
      team = { id: Date.now().toString(), name: teamName, validatedScore: 0 };
      const newTeams = [...teams, team];
      await api.saveTeams(newTeams);
      setTeams(newTeams);
    }

    let participant = existingParticipant;
    if (!participant) {
      participant = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        pseudo,
        password,
        teamName,
        teamId: team.id,
        createdAt: Date.now()
      };
      const newParticipants = [...participants, participant];
      await api.saveParticipants(newParticipants);
      setParticipants(newParticipants);
    }

    setCurrentUser(participant);
    setView('lobby-list');
    saveSession({ currentUser: participant });
  };

  const handleLogout = () => {
    setView('login');
    setCurrentUser(null);
    setIsAdmin(false);
    setCurrentLobby(null);
    setCurrentSession(null);
    clearSession();
  };

  // ==================== HANDLERS LOBBY ====================
  const handleJoinLobby = async (lobbyId) => {
    try {
      const data = await api.joinLobby(lobbyId, currentUser.id, currentUser.pseudo, currentUser.teamName);
      if (data.success) {
        const lobby = lobbies.find(l => l.id === lobbyId);
        setCurrentLobby(lobby);
        setView('lobby');
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleLeaveLobby = async () => {
    try {
      await api.leaveLobby(currentLobby.id, currentUser.id);
      setCurrentLobby(null);
      setCurrentSession(null);
      setMyAnswer('');
      setHasAnswered(false);
      setView('lobby-list');
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // ==================== HANDLERS QUIZ ====================
  const handleSubmitAnswer = async () => {
    if (hasAnswered) return;

    try {
      await api.submitAnswer(currentLobby.id, currentUser.id, myAnswer);
      setHasAnswered(true);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // ==================== HANDLERS ADMIN ====================
  const handleSaveQuestions = async (newQuestions) => {
    try {
      await api.saveQuestions(newQuestions);
      setQuestions(newQuestions);
      alert('Questions sauvegardées !');
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleSaveQuiz = async (quiz) => {
    try {
      let updatedQuizzes;
      if (quiz.id) {
        updatedQuizzes = quizzes.map(q => q.id === quiz.id ? quiz : q);
      } else {
        const newQuiz = { ...quiz, id: Date.now().toString() };
        updatedQuizzes = [...quizzes, newQuiz];
      }
      await api.saveQuizzes(updatedQuizzes);
      setQuizzes(updatedQuizzes);
      alert('Quiz sauvegardé !');
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleDeleteQuiz = async (id) => {
    if (window.confirm('Supprimer ce quiz ?')) {
      try {
        const updatedQuizzes = quizzes.filter(q => q.id !== id);
        await api.saveQuizzes(updatedQuizzes);
        setQuizzes(updatedQuizzes);
      } catch (error) {
        console.error('Erreur:', error);
      }
    }
  };

  const handleCreateLobby = async (quizId) => {
    try {
      const data = await api.createLobby(quizId);
      if (data.success) {
        await loadLobbies();
        alert('Lobby créé !');
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleStartQuiz = async (lobbyId) => {
    try {
      await api.startQuiz(lobbyId);
      await loadLobbies();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleNextQuestion = async (lobbyId) => {
    try {
      await api.nextQuestion(lobbyId);
      await loadLobbies();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleValidateAnswer = async (lobbyId, participantId, isCorrect) => {
    try {
      await api.validateAnswer(lobbyId, participantId, isCorrect);
      await loadLobbies();
      
      // Recharger les équipes pour mettre à jour les scores
      const teamsData = await api.fetchTeams();
      setTeams(teamsData);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleDeleteLobby = async (lobbyId) => {
    try {
      await api.deleteLobby(lobbyId);
      await loadLobbies();
      alert('Lobby supprimé !');
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleResetScores = async () => {
    if (!window.confirm('Réinitialiser tous les scores ?')) return;
    try {
      const resetTeams = teams.map(t => ({ ...t, validatedScore: 0 }));
      await api.saveTeams(resetTeams);
      setTeams(resetTeams);
      alert('Scores réinitialisés !');
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // ==================== RENDU ====================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {view === 'login' && (
        <LoginView onLogin={handleLogin} />
      )}

      {view === 'lobby-list' && (
        <LobbyViewList
          currentUser={currentUser}
          lobbies={lobbies}
          quizzes={quizzes}
          onJoinLobby={handleJoinLobby}
          onLogout={handleLogout}
        />
      )}

      {view === 'lobby' && (
        <LobbyView
          currentLobby={currentLobby}
          quizzes={quizzes}
          onLeaveLobby={handleLeaveLobby}
        />
      )}

      {view === 'quiz' && (
        <QuizView
          currentLobby={currentLobby}
          currentSession={currentSession}
          quizzes={quizzes}
          myAnswer={myAnswer}
          setMyAnswer={setMyAnswer}
          hasAnswered={hasAnswered}
          onSubmitAnswer={handleSubmitAnswer}
          onLeaveLobby={handleLeaveLobby}
        />
      )}

      {view === 'admin' && (
        <AdminDashboard
          adminUsername={adminUsername}
          teams={teams}
          quizzes={quizzes}
          questions={questions}
          lobbies={lobbies}
          onSaveQuestions={handleSaveQuestions}
          onSaveQuiz={handleSaveQuiz}
          onDeleteQuiz={handleDeleteQuiz}
          onCreateLobby={handleCreateLobby}
          onStartQuiz={handleStartQuiz}
          onNextQuestion={handleNextQuestion}
          onValidateAnswer={handleValidateAnswer}
          onDeleteLobby={handleDeleteLobby}
          onResetScores={handleResetScores}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
};

export default App;