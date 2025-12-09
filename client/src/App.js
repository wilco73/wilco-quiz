import React, { useState, useEffect, useRef } from 'react';
import * as api from './services/api';
import { saveSession, getSession, clearSession } from './services/storage';
import { useQuizData } from './hooks/useQuizData';
import LoginView from './components/LoginView';
import LobbyViewList from './components/LobbyViewList';
import LobbyView from './components/LobbyView';
import QuizView from './components/QuizView';
import QuizResultsView from './components/QuizResultsView';
import ScoreboardView from './components/ScoreboardView';
import AdminDashboard from './components/AdminDashboard';
import ReconnectingScreen from './components/ReconnectingScreen';
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
  const [isReconnecting, setIsReconnecting] = useState(false);

  const shouldPoll = view !== 'login';
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

  const hasReconnected = useRef(false);

  // Restaurer la session au chargement
  useEffect(() => {
    if (hasReconnected.current) return;
    
    const savedSession = getSession();
    if (savedSession) {
      if (savedSession.isAdmin) {
        setIsAdmin(true);
        setAdminUsername(savedSession.adminUsername || 'Admin');
        setView('admin');
        hasReconnected.current = true;
      } else if (savedSession.currentUser) {
        setCurrentUser(savedSession.currentUser);
        
        if (savedSession.currentLobbyId && !loading && lobbies.length > 0) {
          setIsReconnecting(true);
          hasReconnected.current = true;
          
          setTimeout(() => {
            reconnectToLobby(savedSession.currentLobbyId, savedSession.currentUser);
            setIsReconnecting(false);
          }, 500);
        } else if (!savedSession.currentLobbyId) {
          setView('lobby-list');
          hasReconnected.current = true;
        }
      }
    } else {
      hasReconnected.current = true;
    }
  }, [loading, lobbies]);

  // Synchroniser le currentLobby avec les mises à jour
  useEffect(() => {
    if (currentLobby && lobbies.length > 0) {
      const updated = lobbies.find(l => l.id === currentLobby.id);
      if (updated) {
        const oldQuestionIndex = currentSession?.currentQuestionIndex || 0;
        const newQuestionIndex = updated.session?.currentQuestionIndex || 0;

        setCurrentLobby(updated);

        if (updated.session && !currentSession) {
          setCurrentSession(updated.session);
          if (!isAdmin) setView('quiz');
        }

        if (updated.session) {
          setCurrentSession(updated.session);

          if (newQuestionIndex > oldQuestionIndex && !isAdmin) {
            setMyAnswer('');
            setHasAnswered(false);
          }
        }

        // ✅ CORRECTION: Ne rediriger vers résultats que si on n'est pas déjà sur le classement
        if (updated.status === 'finished' && !isAdmin && view !== 'results' && view !== 'scoreboard') {
          setView('results');
          saveSession({ 
            currentUser, 
            currentLobbyId: currentLobby.id 
          });
        }
      } else if (!isAdmin) {
        console.log('Le lobby a été supprimé');
        setCurrentLobby(null);
        setCurrentSession(null);
        setView('lobby-list');
        saveSession({ currentUser });
      }
    }
  }, [lobbies, isAdmin]);

  const reconnectToLobby = (lobbyId, user) => {
    const lobby = lobbies.find(l => l.id === lobbyId);
    
    if (!lobby) {
      console.log('Lobby introuvable, redirection vers la liste');
      clearSession();
      saveSession({ currentUser: user });
      setView('lobby-list');
      return;
    }

    const isInLobby = lobby.participants?.some(p => p.participantId === user.id);
    
    if (isInLobby) {
      setCurrentLobby(lobby);
      
      // ✅ NOUVEAU: Gérer le cas où le quiz est terminé
      if (lobby.status === 'finished') {
        setView('results');
      } else if (lobby.session) {
        setCurrentSession(lobby.session);
        const participant = lobby.participants.find(p => p.participantId === user.id);
        if (participant && participant.hasAnswered) {
          setHasAnswered(true);
          setMyAnswer(participant.currentAnswer || '');
        } else {
          setHasAnswered(false);
          setMyAnswer('');
        }
        setView('quiz');
      } else {
        setView('lobby');
      }
    } else {
      if (lobby.status === 'waiting') {
        handleJoinLobby(lobbyId);
      } else {
        console.log('Impossible de rejoindre, quiz déjà commencé');
        alert('⚠️ Le quiz a continué sans vous. Vous avez été déconnecté.');
        clearSession();
        saveSession({ currentUser: user });
        setView('lobby-list');
      }
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

    const existingParticipant = participants.find(p => p.pseudo === pseudo);

    if (existingParticipant) {
      // ✅ CORRECTION: Vérifier le mot de passe
      if (existingParticipant.password !== password) {
        alert('Ce pseudo existe avec un mot de passe différent');
        return;
      }
      
      // ✅ NOUVEAU: Permettre le changement d'équipe
      if (existingParticipant.teamName !== teamName) {
        const confirmChange = window.confirm(
          `Votre pseudo "${pseudo}" est actuellement dans l'équipe "${existingParticipant.teamName}".\n\n` +
          `Voulez-vous changer pour l'équipe "${teamName}" ?`
        );
        
        if (!confirmChange) {
          return;
        }
        
        // Mettre à jour l'équipe du participant
        existingParticipant.teamName = teamName;
        
        // Mettre à jour dans la base
        const updatedParticipants = participants.map(p => 
          p.id === existingParticipant.id ? existingParticipant : p
        );
        await api.saveParticipants(updatedParticipants);
        setParticipants(updatedParticipants);
        
        console.log(`✅ ${pseudo} a changé d'équipe: "${existingParticipant.teamName}" → "${teamName}"`);
      }
    }

    // Créer ou récupérer l'équipe
    let team = teams.find(t => t.name === teamName);
    if (!team) {
      team = { id: Date.now().toString(), name: teamName, validatedScore: 0 };
      const newTeams = [...teams, team];
      await api.saveTeams(newTeams);
      setTeams(newTeams);
    }

    // Créer le participant s'il n'existe pas
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
        saveSession({ 
          currentUser, 
          currentLobbyId: lobbyId 
        });
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleLeaveLobby = async () => {
    // ✅ NOUVEAU: Si on est sur les résultats, juste revenir à la liste
    if (view === 'results') {
      setCurrentLobby(null);
      setCurrentSession(null);
      setMyAnswer('');
      setHasAnswered(false);
      setView('lobby-list');
      saveSession({ currentUser });
      return;
    }

    try {
      await api.leaveLobby(currentLobby.id, currentUser.id);
      setCurrentLobby(null);
      setCurrentSession(null);
      setMyAnswer('');
      setHasAnswered(false);
      setView('lobby-list');
      saveSession({ currentUser });
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

  // ✅ NOUVEAU: Gérer la navigation vers le classement
  const handleViewScoreboard = () => {
    setView('scoreboard');
  };

  const handleBackToResults = () => {
    setView('results');
  };

  // ==================== HANDLERS ADMIN ====================
  const handleSaveQuestions = async (newQuestions) => {
    try {
      await api.saveQuestions(newQuestions);
      setQuestions(newQuestions);
      
      const updatedQuizzes = syncQuizzesWithQuestions(quizzes, newQuestions);
      const quizzesChanged = JSON.stringify(updatedQuizzes) !== JSON.stringify(quizzes);
      
      if (quizzesChanged) {
        await api.saveQuizzes(updatedQuizzes);
        setQuizzes(updatedQuizzes);
        
        const affectedQuizzes = updatedQuizzes.filter((quiz, index) => 
          JSON.stringify(quiz.questions) !== JSON.stringify(quizzes[index]?.questions)
        );
        
        alert(`✅ Questions sauvegardées !\n\n🔄 ${affectedQuizzes.length} quiz synchronisé(s) automatiquement.`);
      } else {
        alert('✅ Questions sauvegardées !');
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('❌ Erreur lors de la sauvegarde');
    }
  };

  const syncQuizzesWithQuestions = (quizzes, questions) => {
    return quizzes.map(quiz => {
      if (!quiz.questions || quiz.questions.length === 0) return quiz;
      
      const updatedQuestions = quiz.questions.map(quizQuestion => {
        const updatedQuestion = questions.find(q => q.id === quizQuestion.id);
        return updatedQuestion ? updatedQuestion : quizQuestion;
      });
      
      return {
        ...quiz,
        questions: updatedQuestions
      };
    });
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

  const handleCreateLobby = async (quizId, shuffle = false) => {
    try {
      const data = await api.createLobby(quizId, shuffle);
      if (data.success) {
        await loadLobbies();
        alert(shuffle ? 'Lobby créé avec questions mélangées !' : 'Lobby créé !');
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

  const handleValidateAnswer = async (lobbyId, participantId, questionIndex, isCorrect) => {
    try {
      await api.validateAnswer(lobbyId, participantId, questionIndex, isCorrect);
      await loadLobbies();
      
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
  

  // Handler pour mettre à jour un participant
const handleUpdateParticipant = async (participantId, updates) => {
  try {
    const data = await api.updateParticipant(participantId, updates);
    if (data.success) {
      // Recharger les données
      const [participantsData, teamsData] = await Promise.all([
        api.fetchParticipants(),
        api.fetchTeams()
      ]);
      setParticipants(participantsData);
      setTeams(teamsData);
    } else {
      alert(data.message || 'Erreur lors de la mise à jour');
    }
  } catch (error) {
    console.error('Erreur:', error);
    alert('Erreur lors de la mise à jour du participant');
  }
};

// Handler pour supprimer une équipe
const handleDeleteTeam = async (teamName) => {
  try {
    const data = await api.deleteTeam(teamName);
    if (data.success) {
      alert(`✅ Équipe "${teamName}" supprimée\n${data.affectedCount} participant(s) retiré(s) de l'équipe`);
      
      // Recharger les données
      const [participantsData, teamsData] = await Promise.all([
        api.fetchParticipants(),
        api.fetchTeams()
      ]);
      setParticipants(participantsData);
      setTeams(teamsData);
    } else {
      alert(data.message || 'Erreur lors de la suppression');
    }
  } catch (error) {
    console.error('Erreur:', error);
    alert('Erreur lors de la suppression de l\'équipe');
  }
};

// Handler pour recharger les données
const handleRefreshData = async () => {
  try {
    const [participantsData, teamsData] = await Promise.all([
      api.fetchParticipants(),
      api.fetchTeams()
    ]);
    setParticipants(participantsData);
    setTeams(teamsData);
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

  if (isReconnecting) {
    return <ReconnectingScreen message="Restauration de votre session..." />;
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
          teams={teams}
          participants={participants}  // ✅ NOUVEAU - Passer participants
          onJoinLobby={handleJoinLobby}
          onViewScoreboard={handleViewScoreboard}
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
          setHasAnswered={setHasAnswered}
          currentUser={currentUser}
          onSubmitAnswer={handleSubmitAnswer}
          onLeaveLobby={handleLeaveLobby}
        />
      )}

      {view === 'results' && (
        <QuizResultsView
          currentLobby={currentLobby}
          quiz={quizzes.find(q => q.id === currentLobby?.quizId)}
          currentUser={currentUser}
          onLeaveLobby={handleLeaveLobby}
          onViewScoreboard={handleViewScoreboard}
        />
      )}

      {view === 'scoreboard' && (
        <div>
          <ScoreboardView
            teams={teams}
            currentUser={currentUser}
          />
          <div className="max-w-4xl mx-auto p-4">
            <button
              onClick={() => currentLobby ? handleBackToResults() : setView('lobby-list')}
              className="w-full py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400"
            >
              ← Retour
            </button>
          </div>
        </div>
      )}

      {view === 'admin' && (
        <AdminDashboard
          adminUsername={adminUsername}
          teams={teams}
          participants={participants}  // ✅ Passer participants
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
          onUpdateParticipant={handleUpdateParticipant}  // ✅ NOUVEAU
          onDeleteTeam={handleDeleteTeam}                // ✅ NOUVEAU
          onRefreshData={handleRefreshData}              // ✅ NOUVEAU
          onLogout={handleLogout}
        />
      )}

    </div>
  );
};

export default App;