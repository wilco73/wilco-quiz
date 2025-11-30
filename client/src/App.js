import React, { useState, useEffect, useRef } from 'react';
import * as api from './services/api';
import { saveSession, getSession, clearSession } from './services/storage';
import { useQuizData } from './hooks/useQuizData';
import LoginView from './components/LoginView';
import LobbyViewList from './components/LobbyViewList';
import LobbyView from './components/LobbyView';
import QuizView from './components/QuizView';
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

  // ✅ CORRECTION: Activer le polling aussi pour l'admin
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

  // ✅ CORRECTION: Utiliser un ref pour éviter les boucles infinies
  const hasReconnected = useRef(false);

  // Restaurer la session au chargement
  useEffect(() => {
    // Ne s'exécuter qu'une seule fois au chargement
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
        
        // Vérifier si le participant était dans un lobby
        if (savedSession.currentLobbyId && !loading && lobbies.length > 0) {
          setIsReconnecting(true);
          hasReconnected.current = true;
          
          // Attendre un peu que tout soit chargé
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

  // ✅ Synchroniser le currentLobby avec les mises à jour des lobbies
  useEffect(() => {
    if (currentLobby && lobbies.length > 0) {
      const updated = lobbies.find(l => l.id === currentLobby.id);
      if (updated) {
        // Détecter changement de question
        const oldQuestionIndex = currentSession?.currentQuestionIndex || 0;
        const newQuestionIndex = updated.session?.currentQuestionIndex || 0;

        setCurrentLobby(updated);

        // Démarrage de la session
        if (updated.session && !currentSession) {
          setCurrentSession(updated.session);
          if (!isAdmin) setView('quiz');
        }

        // Mise à jour de la session
        if (updated.session) {
          setCurrentSession(updated.session);

          // Nouvelle question : réinitialiser la réponse (participants uniquement)
          if (newQuestionIndex > oldQuestionIndex && !isAdmin) {
            setMyAnswer('');
            setHasAnswered(false);
          }
        }

        // ✅ NOUVEAU: Si le lobby est terminé, rediriger le participant
        if (updated.status === 'finished' && !isAdmin) {
          // Optionnel: afficher un message ou rediriger après un délai
          console.log('Quiz terminé !');
        }
      } else if (!isAdmin) {
        // ✅ NOUVEAU: Le lobby a été supprimé
        console.log('Le lobby a été supprimé');
        setCurrentLobby(null);
        setCurrentSession(null);
        setView('lobby-list');
        saveSession({ currentUser });
      }
    }
  }, [lobbies, isAdmin]);

  // ✅ NOUVEAU: Fonction de reconnexion à un lobby
  const reconnectToLobby = (lobbyId, user) => {
    const lobby = lobbies.find(l => l.id === lobbyId);
    
    if (!lobby) {
      // Le lobby n'existe plus
      console.log('Lobby introuvable, redirection vers la liste');
      clearSession();
      saveSession({ currentUser: user });
      setView('lobby-list');
      return;
    }

    // Vérifier si le participant est toujours dans le lobby
    const isInLobby = lobby.participants?.some(p => p.participantId === user.id);
    
    if (isInLobby) {
      setCurrentLobby(lobby);
      
      if (lobby.session) {
        setCurrentSession(lobby.session);
        // Vérifier si le participant a déjà répondu à la question actuelle
        const participant = lobby.participants.find(p => p.participantId === user.id);
        if (participant && participant.hasAnswered) {
          setHasAnswered(true);
          setMyAnswer(participant.currentAnswer || '');
        } else {
          setHasAnswered(false);
          setMyAnswer('');
        }
        setView('quiz');
        
        // ✅ Afficher un message de reconnexion
        setTimeout(() => {
          // alert('✅ Reconnexion réussie ! Vous êtes de retour dans le quiz.');
        }, 500);
      } else {
        setView('lobby');
      }
    } else {
      // Le participant n'est plus dans le lobby, le rejoindre à nouveau si possible
      if (lobby.status === 'waiting') {
        handleJoinLobby(lobbyId);
      } else {
        // Quiz déjà commencé, impossible de rejoindre
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
        // ✅ NOUVEAU: Sauvegarder le lobby dans la session
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
    try {
      await api.leaveLobby(currentLobby.id, currentUser.id);
      setCurrentLobby(null);
      setCurrentSession(null);
      setMyAnswer('');
      setHasAnswered(false);
      setView('lobby-list');
      // ✅ NOUVEAU: Nettoyer le lobby de la session
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

  // ==================== HANDLERS ADMIN ====================
  const handleSaveQuestions = async (newQuestions) => {
    try {
      await api.saveQuestions(newQuestions);
      setQuestions(newQuestions);
      
      // ✅ NOUVEAU: Synchroniser les quiz avec les questions mises à jour
      const updatedQuizzes = syncQuizzesWithQuestions(quizzes, newQuestions);
      const quizzesChanged = JSON.stringify(updatedQuizzes) !== JSON.stringify(quizzes);
      
      if (quizzesChanged) {
        await api.saveQuizzes(updatedQuizzes);
        setQuizzes(updatedQuizzes);
        
        // Compter combien de quiz ont été mis à jour
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

  // ✅ NOUVEAU: Fonction de synchronisation des quiz avec les questions
  const syncQuizzesWithQuestions = (quizzes, questions) => {
    return quizzes.map(quiz => {
      if (!quiz.questions || quiz.questions.length === 0) return quiz;
      
      // Mettre à jour chaque question du quiz
      const updatedQuestions = quiz.questions.map(quizQuestion => {
        // Trouver la question correspondante dans la banque
        const updatedQuestion = questions.find(q => q.id === quizQuestion.id);
        
        // Si trouvée, utiliser la version mise à jour, sinon garder l'ancienne
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

  // ✅ CORRECTION 1: Ajout de la fonction manquante handleNextQuestion
  const handleNextQuestion = async (lobbyId) => {
    try {
      await api.nextQuestion(lobbyId);
      await loadLobbies();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // ✅ CORRECTION 2: Signature correcte avec questionIndex
  const handleValidateAnswer = async (lobbyId, participantId, questionIndex, isCorrect) => {
    try {
      await api.validateAnswer(lobbyId, participantId, questionIndex, isCorrect);
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

  // ✅ NOUVEAU: Afficher l'écran de reconnexion
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