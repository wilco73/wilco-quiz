import React, { useState, useEffect, useRef } from 'react';
import { Play, Users, Trophy, Edit, Trash2, Plus, LogOut, Save, X, Monitor, Eye, Clock, Check, XCircle, SkipForward, RotateCcw, UserPlus } from 'lucide-react';

const QuizApp = () => {
  const [view, setView] = useState('login');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [teams, setTeams] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [lobbies, setLobbies] = useState([]);
  const [currentLobby, setCurrentLobby] = useState(null);
  const [currentSession, setCurrentSession] = useState(null);
  const [myAnswer, setMyAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [liveMonitoring, setLiveMonitoring] = useState(false);
  const [validationMode, setValidationMode] = useState(false);
  const [adminUsername, setAdminUsername] = useState('');

  const API_URL = 'http://wilco.freeboxos.fr:32769/api';
  const pollingIntervalRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    loadData();
    const savedSession = localStorage.getItem('quiz-session');
    if (savedSession) {
      const session = JSON.parse(savedSession);
      if (session.isAdmin) {
        setIsAdmin(true);
        setAdminUsername(session.adminUsername || 'Admin');
        setView('admin');
      } else if (session.currentUser) {
        setCurrentUser(session.currentUser);
        setView('lobby-list');
      }
    }
  }, []);

  useEffect(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    if (view !== 'login' && !isAdmin) {
      pollingIntervalRef.current = setInterval(() => {
        loadLobbiesAndSessions();
      }, 1000);
    }

    if (isAdmin && (liveMonitoring || validationMode)) {
      pollingIntervalRef.current = setInterval(() => {
        loadLobbiesAndSessions();
      }, 1000);
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [view, isAdmin, liveMonitoring, validationMode]);

  const loadData = async () => {
    try {
      const [teamsRes, participantsRes, quizzesRes] = await Promise.all([
        fetch(`${API_URL}/teams`),
        fetch(`${API_URL}/participants`),
        fetch(`${API_URL}/quizzes`)
      ]);

      if (teamsRes.ok) setTeams(await teamsRes.json());
      if (participantsRes.ok) setParticipants(await participantsRes.json());
      if (quizzesRes.ok) setQuizzes(await quizzesRes.json());

      await loadLobbiesAndSessions();
    } catch (error) {
      console.error('Erreur de chargement:', error);
    }
  };

  const loadLobbiesAndSessions = async () => {
    try {
      const lobbiesRes = await fetch(`${API_URL}/lobbies`);
      if (lobbiesRes.ok) {
        const lobbiesData = await lobbiesRes.json();
        setLobbies(lobbiesData);

        if (currentLobby) {
          const updated = lobbiesData.find(l => l.id === currentLobby.id);
          if (updated) {
            setCurrentLobby(updated);

            if (updated.session && !currentSession) {
              setCurrentSession(updated.session);
              setView('quiz');
            }

            if (updated.session && currentSession) {
              setCurrentSession(updated.session);

              if (updated.session.currentQuestionIndex > (currentSession.currentQuestionIndex || 0)) {
                setMyAnswer('');
                setHasAnswered(false);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Erreur chargement lobbies:', error);
    }
  };

  const saveTeams = async (newTeams) => {
    try {
      await fetch(`${API_URL}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTeams)
      });
      setTeams(newTeams);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const saveParticipants = async (newParticipants) => {
    try {
      await fetch(`${API_URL}/participants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newParticipants)
      });
      setParticipants(newParticipants);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const saveQuizzes = async (newQuizzes) => {
    try {
      await fetch(`${API_URL}/quizzes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newQuizzes)
      });
      setQuizzes(newQuizzes);
      alert('Quiz sauvegardé !');
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleLogin = async (teamName, pseudo, password, isAdminLogin = false) => {
    if (isAdminLogin) {
      try {
        const res = await fetch(`${API_URL}/admin-login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: pseudo, password })
        });
        const data = await res.json();
        if (data.success) {
          setIsAdmin(true);
          setAdminUsername(data.username);
          setView('admin');
          localStorage.setItem('quiz-session', JSON.stringify({ isAdmin: true, adminUsername: data.username }));
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
      await saveTeams([...teams, team]);
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
      await saveParticipants([...participants, participant]);
    }

    setCurrentUser(participant);
    setView('lobby-list');
    localStorage.setItem('quiz-session', JSON.stringify({ currentUser: participant }));
  };

  const createLobby = async (quizId) => {
    try {
      const res = await fetch(`${API_URL}/create-lobby`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId })
      });
      const data = await res.json();
      if (data.success) {
        await loadLobbiesAndSessions();
        alert('Lobby créé !');
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const joinLobby = async (lobbyId) => {
    try {
      const res = await fetch(`${API_URL}/join-lobby`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyId, participantId: currentUser.id, pseudo: currentUser.pseudo, teamName: currentUser.teamName })
      });
      const data = await res.json();
      if (data.success) {
        const lobby = lobbies.find(l => l.id === lobbyId);
        setCurrentLobby(lobby);
        setView('lobby');
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const leaveLobby = async () => {
    try {
      await fetch(`${API_URL}/leave-lobby`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyId: currentLobby.id, participantId: currentUser.id })
      });
      setCurrentLobby(null);
      setCurrentSession(null);
      setView('lobby-list');
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const startQuiz = async (lobbyId) => {
    try {
      const res = await fetch(`${API_URL}/start-quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyId })
      });
      if (res.ok) {
        await loadLobbiesAndSessions();
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const submitAnswer = async () => {
    if (hasAnswered) return;

    try {
      await fetch(`${API_URL}/submit-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobbyId: currentLobby.id,
          participantId: currentUser.id,
          answer: myAnswer
        })
      });
      setHasAnswered(true);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const forceNextQuestion = async (lobbyId) => {
    try {
      await fetch(`${API_URL}/next-question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lobbyId })
      });
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const validateAnswer = async (participantId, isCorrect) => {
    try {
      await fetch(`${API_URL}/validate-answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lobbyId: currentLobby.id,
          participantId,
          isCorrect
        })
      });
      await loadLobbiesAndSessions();
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const resetTeamScores = async () => {
    if (!window.confirm('Réinitialiser tous les scores ?')) return;
    const resetTeams = teams.map(t => ({ ...t, validatedScore: 0 }));
    await saveTeams(resetTeams);
    alert('Scores réinitialisés !');
  };

  const saveQuiz = (quiz) => {
    let updatedQuizzes;
    if (editingQuiz && editingQuiz.id) {
      updatedQuizzes = quizzes.map(q => q.id === quiz.id ? quiz : q);
    } else {
      const newQuiz = { ...quiz, id: Date.now().toString() };
      updatedQuizzes = [...quizzes, newQuiz];
    }
    saveQuizzes(updatedQuizzes);
    setEditingQuiz(null);
  };

  const deleteQuiz = (id) => {
    if (window.confirm('Supprimer ce quiz ?')) {
      saveQuizzes(quizzes.filter(q => q.id !== id));
    }
  };
  const LoginView = () => {
    const [teamName, setTeamName] = useState('');
    const [pseudo, setPseudo] = useState('');
    const [password, setPassword] = useState('');
    const [isAdminMode, setIsAdminMode] = useState(false);

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <Trophy className="w-16 h-16 mx-auto text-purple-600 mb-4" />
            <h1 className="text-3xl font-bold text-gray-800">Quiz & Blindtest</h1>
            <p className="text-gray-600 mt-2">
              {isAdminMode ? 'Connexion Admin' : 'Connexion Participant'}
            </p>
          </div>

          <div className="space-y-4">
            {!isAdminMode && (
              <input
                type="text"
                placeholder="Nom d'équipe"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
              />
            )}
            <input
              type="text"
              placeholder={isAdminMode ? "Nom admin" : "Votre pseudo"}
              value={pseudo}
              onChange={(e) => setPseudo(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
            />
            <input
              type="password"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLogin(teamName, pseudo, password, isAdminMode)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
            />
            <button
              onClick={() => handleLogin(teamName, pseudo, password, isAdminMode)}
              className="w-full bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700"
            >
              Se connecter
            </button>
            <button
              onClick={() => setIsAdminMode(!isAdminMode)}
              className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg text-sm hover:bg-gray-300"
            >
              {isAdminMode ? '← Mode Participant' : 'Mode Admin'}
            </button>
          </div>

          <p className="text-xs text-gray-500 text-center mt-6">
            {isAdminMode ? 'admin / admin123' : 'Première connexion = création'}
          </p>
        </div>
      </div>
    );
  };

  const LobbyListView = () => (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">{currentUser.pseudo}</h2>
              <p className="text-gray-600">Équipe: {currentUser.teamName}</p>
            </div>
            <button
              onClick={() => {
                setView('login');
                setCurrentUser(null);
                localStorage.removeItem('quiz-session');
              }}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
            >
              <LogOut className="w-4 h-4" />
              Déconnexion
            </button>
          </div>
        </div>

        <h3 className="text-xl font-bold mb-4">Salles disponibles</h3>
        <div className="grid gap-4">
          {lobbies.filter(l => l.status === 'waiting').map(lobby => {
            const quiz = quizzes.find(q => q.id === lobby.quizId);
            return (
              <div key={lobby.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
                <h4 className="text-xl font-bold mb-2">{quiz ?.title}</h4>
                <p className="text-gray-600 mb-4">{quiz ?.description}</p>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    <p>{lobby.participants ?.length || 0} participants</p>
                    <p>{quiz ?.questions ?.length || 0} questions</p>
                  </div>
                  <button
                    onClick={() => joinLobby(lobby.id)}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Rejoindre
                  </button>
                </div>
              </div>
            );
          })}
          {lobbies.filter(l => l.status === 'waiting').length === 0 && (
            <p className="text-center text-gray-500 py-12">Aucune salle disponible</p>
          )}
        </div>
      </div>
    </div>
  );

  const LobbyView = () => {
    const quiz = quizzes.find(q => q.id === currentLobby ?.quizId);

    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">{quiz ?.title}</h2>
              <p className="text-gray-600">{quiz ?.description}</p>
              <p className="text-sm text-gray-500 mt-2">{quiz ?.questions ?.length} questions</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-6 mb-6">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Users className="w-6 h-6" />
                Participants ({currentLobby ?.participants ?.length || 0})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {currentLobby ?.participants ?.map((p, index) => (
                  <div key={index} className="bg-white rounded-lg p-3 border-2 border-purple-200">
                    <p className="font-bold text-sm">{p.pseudo}</p>
                    <p className="text-xs text-gray-600">{p.teamName}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-6 text-center">
              <Clock className="w-12 h-12 mx-auto text-blue-600 mb-3 animate-pulse" />
              <p className="text-lg font-bold text-blue-900">En attente du démarrage...</p>
              <p className="text-sm text-blue-700 mt-2">L'administrateur va lancer le quiz</p>
            </div>

            <button
              onClick={leaveLobby}
              className="w-full mt-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400"
            >
              Quitter la salle
            </button>
          </div>
        </div>
      </div>
    );
  };

  const QuizView = () => {
    const quiz = currentLobby ? quizzes.find(q => q.id === currentLobby.quizId) : null;
    const question = quiz ?.questions[currentSession ?.currentQuestionIndex];
    const isFinished = currentSession ?.status === 'finished';

    useEffect(() => {
      if (inputRef.current && !hasAnswered && !isFinished) {
        inputRef.current.focus();
      }
    }, [currentSession ?.currentQuestionIndex, hasAnswered, isFinished]);

    if (!currentSession || !currentLobby) return null;

    if (isFinished) {
      return (
        <div className="min-h-screen bg-gray-100 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h2 className="text-3xl font-bold text-center mb-6">Quiz terminé !</h2>
              <p className="text-center text-lg mb-6">
                En attente de la validation par l'admin...
              </p>
              <div className="text-center">
                <button
                  onClick={leaveLobby}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Quitter
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">{quiz ?.title}</h3>
                <span className="text-gray-600">
                  Question {currentSession.currentQuestionIndex + 1}/{quiz ?.questions.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all"
                  style={{ width: `${((currentSession.currentQuestionIndex + 1) / quiz ?.questions.length) * 100}%` }}
                />
              </div>
            </div>

            <div className="mb-6">
              <h4 className="text-2xl font-bold mb-4">{question ?.text}</h4>

              {question ?.type === 'image' && question ?.media && (
                <img src={question.media} alt="Question" className="max-w-full h-auto rounded-lg mb-4" />
              )}
              
              {question ?.type === 'video' && question ?.media && (
                <video controls className="w-full rounded-lg mb-4">
                  <source src={question.media} />
                </video>
              )}
              
              {question ?.type === 'audio' && question ?.media && (
                <audio controls className="w-full mb-4">
                  <source src={question.media} />
                </audio>
              )}
            </div>

            {hasAnswered ? (
              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 text-center">
                <Check className="w-12 h-12 mx-auto text-green-600 mb-2" />
                <p className="font-bold text-green-700 mb-2">Réponse enregistrée !</p>
                <div className="bg-white rounded p-3 border border-green-300 mb-3">
                  <p className="text-xs text-gray-600">Votre réponse :</p>
                  <p className="font-bold text-green-700">{myAnswer || '(vide)'}</p>
                </div>
                <p className="text-sm text-gray-600">⏳ Attente des autres...</p>
              </div>
            ) : (
              <>
                <input
                  ref={inputRef}
                  type="text"
                  value={myAnswer}
                  onChange={(e) => setMyAnswer(e.target.value)}
                  placeholder="Votre réponse..."
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none mb-4"
                  onKeyPress={(e) => e.key === 'Enter' && submitAnswer()}
                />

                <button
                  onClick={submitAnswer}
                  className="w-full py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
                >
                  Valider ma réponse
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };
  const AdminView = () => {
    const QuizEditor = ({ quiz, onSave, onCancel }) => {
      const [title, setTitle] = useState(quiz ?.title || '');
      const [description, setDescription] = useState(quiz ?.description || '');
      const [questions, setQuestions] = useState(quiz ?.questions || []);

      const addQuestion = () => {
        setQuestions([...questions, { text: '', answer: '', type: 'text', media: '', points: 1, timer: 0 }]);
      };

      const updateQuestion = (index, field, value) => {
        const updated = [...questions];
        updated[index][field] = value;
        setQuestions(updated);
      };

      const removeQuestion = (index) => {
        setQuestions(questions.filter((q, i) => i !== index));
      };

      return (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-2xl font-bold mb-4">{quiz ?.id ? 'Modifier' : 'Nouveau'} Quiz</h3>

          <div className="space-y-4 mb-6">
            <input
              type="text"
              placeholder="Titre"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
            />
            <textarea
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none"
              rows="2"
            />
          </div>

          <h4 className="text-xl font-bold mb-4">Questions</h4>
          {questions.map((q, index) => (
            <div key={index} className="border-2 border-gray-200 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <span className="font-semibold">Question {index + 1}</span>
                <button onClick={() => removeQuestion(index)} className="text-red-600 hover:text-red-800">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <select
                  value={q.type}
                  onChange={(e) => updateQuestion(index, 'type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="text">Texte</option>
                  <option value="image">Image</option>
                  <option value="video">Vidéo</option>
                  <option value="audio">Audio</option>
                </select>

                <input
                  type="text"
                  placeholder="Question"
                  value={q.text}
                  onChange={(e) => updateQuestion(index, 'text', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />

                {q.type !== 'text' && (
                  <input
                    type="text"
                    placeholder="URL du média"
                    value={q.media}
                    onChange={(e) => updateQuestion(index, 'media', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  />
                )}

                <input
                  type="text"
                  placeholder="Réponse correcte"
                  value={q.answer}
                  onChange={(e) => updateQuestion(index, 'answer', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />

                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    placeholder="Points"
                    value={q.points}
                    onChange={(e) => updateQuestion(index, 'points', parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="1"
                  />
                  <input
                    type="number"
                    placeholder="Timer (secondes, 0 = attendre tous)"
                    value={q.timer || 0}
                    onChange={(e) => updateQuestion(index, 'timer', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="0"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={addQuestion}
            className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-purple-500 hover:text-purple-600 flex items-center justify-center gap-2 mb-6"
          >
            <Plus className="w-4 h-4" />
            Ajouter une question
          </button>

          <div className="flex gap-4">
            <button
              onClick={() => onSave({ id: quiz ?.id, title, description, questions })}
              className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              Enregistrer
            </button>
            <button
              onClick={onCancel}
              className="flex-1 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Annuler
            </button>
          </div>
        </div>
      );
    };

    const LiveMonitoringView = () => {
      const activeLobby = lobbies.find(l => l.status === 'playing');
      if (!activeLobby) {
        return (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-bold">Suivi en direct</h3>
                <button onClick={() => setLiveMonitoring(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                  ← Retour
                </button>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <Eye className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-xl text-gray-600">Aucun quiz en cours</p>
            </div>
          </div>
        );
      }

      const quiz = quizzes.find(q => q.id === activeLobby.quizId);
      const currentQuestion = quiz ?.questions[activeLobby.session ?.currentQuestionIndex];
      const allAnswered = activeLobby.participants ?.every(p => p.hasAnswered);
      const answeredCount = activeLobby.participants ?.filter(p => p.hasAnswered).length || 0;

      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold">{quiz ?.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Question {(activeLobby.session ?.currentQuestionIndex || 0) + 1} / {quiz ?.questions.length}
                </p>
                <p className="text-sm text-gray-600">
                  {answeredCount} / {activeLobby.participants ?.length} ont répondu
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => forceNextQuestion(activeLobby.id)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
                >
                  <SkipForward className="w-4 h-4" />
                  Question suivante
                </button>
                <button onClick={() => setLiveMonitoring(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                  ← Retour
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h4 className="font-bold text-lg mb-4">Question actuelle : {currentQuestion ?.text}</h4>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeLobby.participants ?.map((p) => (
                <div key={p.participantId} className={`border-2 rounded-lg p-4 ${p.hasAnswered ? 'border-green-500 bg-green-50' : 'border-orange-300 bg-orange-50'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <p className="font-bold">{p.pseudo}</p>
                      <p className="text-sm text-gray-600">{p.teamName}</p>
                    </div>
                    {p.hasAnswered ? (
                      <Check className="w-6 h-6 text-green-600" />
                    ) : (
                        <Clock className="w-6 h-6 text-orange-600 animate-pulse" />
                      )}
                  </div>

                  {p.hasAnswered && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="bg-white rounded p-2 border border-green-300">
                        <p className="text-xs text-gray-600">Réponse :</p>
                        <p className="font-bold text-green-700 break-words">{p.currentAnswer || '(vide)'}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {allAnswered && (
            <div className="bg-green-100 rounded-lg p-4 text-center animate-pulse">
              <p className="font-bold text-green-700 flex items-center justify-center gap-2">
                <Check className="w-5 h-5" />
                Tous ont répondu ! Cliquez sur "Question suivante"
              </p>
            </div>
          )}
        </div>
      );
    };

    const ValidationView = () => {
      const finishedLobbies = lobbies.filter(l => l.status === 'finished');

      return (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center">
              <h3 className="text-2xl font-bold">Validation des réponses</h3>
              <button onClick={() => setValidationMode(false)} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                ← Retour
              </button>
            </div>
          </div>

          {finishedLobbies.length === 0 ? (
            <div className="bg-white rounded-lg shadow-lg p-12 text-center">
              <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-xl text-gray-600">Aucun quiz terminé</p>
            </div>
          ) : (
              finishedLobbies.map(lobby => {
                const quiz = quizzes.find(q => q.id === lobby.quizId);
                return (
                  <div key={lobby.id} className="bg-white rounded-lg shadow-lg p-6">
                    <h4 className="text-xl font-bold mb-4">{quiz ?.title}</h4>
                    {lobby.participants ?.map(participant => (
                      <div key={participant.participantId} className="mb-6 border-b pb-4">
                        <h5 className="font-bold mb-3">{participant.pseudo} ({participant.teamName})</h5>
                        {quiz ?.questions.map((question, qIndex) => {
                          const answer = participant.answers ?.[qIndex];
                          const isValidated = participant.validations ?.[qIndex];
                        
                          return (
                            <div key={qIndex} className={`mb-3 p-3 rounded-lg border-2 ${
                              isValidated === true ? 'border-green-500 bg-green-50' :
                                isValidated === false ? 'border-red-500 bg-red-50' :
                                  'border-gray-200'
                              }`}>
                              <p className="font-semibold text-sm mb-1">Q{qIndex + 1}: {question.text}</p>
                              <p className="text-xs mb-1">Attendu: <span className="font-bold">{question.answer}</span></p>
                              <p className="text-xs mb-2">Répondu: <span className="font-bold">{answer || '(vide)'}</span></p>

                              {isValidated === undefined && (
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => validateAnswer(participant.participantId, true)}
                                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-1"
                                  >
                                    <Check className="w-3 h-3" />
                                    Valider ({question.points || 1} pts)
                                </button>
                                  <button
                                    onClick={() => validateAnswer(participant.participantId, false)}
                                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm flex items-center gap-1"
                                  >
                                    <XCircle className="w-3 h-3" />
                                    Refuser
                                </button>
                                </div>
                              )}

                              {isValidated !== undefined && (
                                <p className={`font-bold text-sm ${isValidated ? 'text-green-600' : 'text-red-600'}`}>
                                  {isValidated ? '✓ Validé' : '✗ Refusé'}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })
            )}
        </div>
      );
    };

    if (validationMode) {
      return (
        <div className="min-h-screen bg-gray-100 p-4">
          <div className="max-w-7xl mx-auto">
            <ValidationView />
          </div>
        </div>
      );
    }

    if (liveMonitoring) {
      return (
        <div className="min-h-screen bg-gray-100 p-4">
          <div className="max-w-7xl mx-auto">
            <LiveMonitoringView />
          </div>
        </div>
      );
    }

    if (editingQuiz !== null) {
      return (
        <div className="min-h-screen bg-gray-100 p-4">
          <div className="max-w-4xl mx-auto">
            <QuizEditor quiz={editingQuiz} onSave={saveQuiz} onCancel={() => setEditingQuiz(null)} />
          </div>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Admin - {adminUsername}</h2>
              <div className="flex gap-2">
                <button onClick={resetTeamScores} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
                  <RotateCcw className="w-4 h-4" />
                  Reset scores
                </button>
                <button
                  onClick={() => { setValidationMode(true); setLiveMonitoring(false); }}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <Check className="w-4 h-4" />
                  Valider
                </button>
                <button
                  onClick={() => { setLiveMonitoring(true); setValidationMode(false); }}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <Monitor className="w-4 h-4" />
                  Suivi
                </button>
                <button
                  onClick={() => { setView('login'); setIsAdmin(false); localStorage.removeItem('quiz-session'); }}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </button>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Quiz</h3>
                <button onClick={() => setEditingQuiz({})} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Nouveau
                </button>
              </div>

              <div className="space-y-3">
                {quizzes.map(quiz => (
                  <div key={quiz.id} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-bold">{quiz.title}</h4>
                    <p className="text-sm text-gray-600">{quiz.questions ?.length || 0} questions</p>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => createLobby(quiz.id)} className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm">
                        Créer salle
                      </button>
                      <button onClick={() => setEditingQuiz(quiz)} className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1">
                        <Edit className="w-3 h-3" />
                        Modifier
                      </button>
                      <button onClick={() => deleteQuiz(quiz.id)} className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-1">
                        <Trash2 className="w-3 h-3" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-xl font-bold mb-4">Classement</h3>
              <div className="space-y-3">
                {[...teams].sort((a, b) => (b.validatedScore || 0) - (a.validatedScore || 0)).map((team, index) => (
                  <div key={team.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg text-purple-600">#{index + 1}</span>
                      <span className="font-semibold">{team.name}</span>
                    </div>
                    <span className="font-bold text-purple-600">{team.validatedScore || 0} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold mb-4">Salles actives</h3>
            <div className="space-y-3">
              {lobbies.map(lobby => {
                const quiz = quizzes.find(q => q.id === lobby.quizId);
                const statusColors = {
                  waiting: 'bg-yellow-100 border-yellow-500',
                  playing: 'bg-blue-100 border-blue-500',
                  finished: 'bg-green-100 border-green-500'
                };
                const statusText = {
                  waiting: 'En attente',
                  playing: 'En cours',
                  finished: 'Terminé'
                };

                return (
                  <div key={lobby.id} className={`border-2 rounded-lg p-4 ${statusColors[lobby.status]}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-bold">{quiz ?.title}</h4>
                        <p className="text-sm text-gray-600">
                          {lobby.participants ?.length || 0} participants - {statusText[lobby.status]}
                        </p>
                      </div>
                      {lobby.status === 'waiting' && (
                        <button
                          onClick={() => startQuiz(lobby.id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Démarrer
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {view === 'login' && <LoginView />}
      {view === 'lobby-list' && <LobbyListView />}
      {view === 'lobby' && <LobbyView />}
      {view === 'quiz' && <QuizView />}
      {view === 'admin' && <AdminView />}
    </div>
  );
};

export default QuizApp;