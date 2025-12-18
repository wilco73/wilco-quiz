import React, { useState } from 'react';
import { LogOut, RotateCcw, Monitor, Check, BookOpen, Trash, Trophy, FileQuestion, Play, Edit, Trash2, Users, Shuffle } from 'lucide-react';
import { useToast } from './ToastProvider';
import * as api from '../services/api';
import QuestionBank from './QuestionBank';
import QuizEditor from './QuizEditor';
import LobbyManager from './LobbyManager';
import LiveMonitoring from './LiveMonitoring';
import ValidationView from './ValidationView';
import ParticipantManager from './ParticipantManager';
import DarkModeToggle from './DarkModeToggle';

const AdminDashboard = ({ 
  adminUsername,
  teams,
  participants,
  quizzes,
  questions,
  lobbies,
  socket,
  onUpdateParticipant,
  onDeleteTeam,
  onRefreshData,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [shuffleMode, setShuffleMode] = useState({});
  const [teamsPage, setTeamsPage] = useState(1);
  const teamsPerPage = 5;
  
  const toast = useToast();

  // Handlers utilisant l'API REST pour les operations CRUD
  const onSaveQuestions = async (questionsData) => {
    try {
      await api.saveQuestions(questionsData);
      toast.success('Questions sauvegardees');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const onSaveQuiz = async (quiz) => {
    try {
      if (quiz.id && quizzes.find(q => q.id === quiz.id)) {
        await api.updateQuiz(quiz.id, quiz);
      } else {
        await api.createQuiz(quiz);
      }
      toast.success('Quiz sauvegarde');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const onDeleteQuiz = async (quizId) => {
    try {
      await api.deleteQuiz(quizId);
      toast.success('Quiz supprime');
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // Handlers utilisant Socket.IO pour le temps reel
  const onCreateLobby = async (quizId, shuffle) => {
    const result = await socket.createLobby(quizId, shuffle);
    if (result.success) {
      toast.success(shuffle ? 'Salle creee avec questions melangees' : 'Salle creee');
    } else {
      toast.error(result.message || 'Erreur lors de la creation');
    }
  };

  const onStartQuiz = async (lobbyId) => {
    const result = await socket.startQuiz(lobbyId);
    if (result.success) {
      toast.success('Quiz demarre');
    } else {
      toast.error(result.message || 'Erreur lors du demarrage');
    }
  };

  const onNextQuestion = async (lobbyId) => {
    const result = await socket.nextQuestion(lobbyId);
    if (result.finished) {
      toast.success('Quiz termine');
    } else if (result.success) {
      toast.success(`Question ${result.questionIndex + 1}`);
    } else {
      toast.error(result.message || 'Erreur');
    }
  };

  const onValidateAnswer = async (lobbyId, odId, questionId, isCorrect, points) => {
    const result = await socket.validateAnswer(lobbyId, odId, questionId, isCorrect, points);
    if (!result.success) {
      toast.error('Erreur lors de la validation');
    }
  };

  const onDeleteLobby = async (lobbyId) => {
    const result = await socket.deleteLobby(lobbyId);
    if (result.success) {
      toast.success('Salle supprimee');
    }
  };

  const onResetScores = async () => {
    const result = await socket.resetScores();
    if (result.success) {
      toast.success('Scores reinitialises');
    }
  };

  const handleSaveQuiz = (quiz) => {
    onSaveQuiz(quiz);
    setEditingQuiz(null);
    setActiveTab('dashboard');
  };

  const handleCreateLobby = (quizId) => {
    const shuffle = shuffleMode[quizId] || false;
    onCreateLobby(quizId, shuffle);
    setShuffleMode(prev => ({ ...prev, [quizId]: false }));
  };

  const handleDeleteQuiz = (id) => {
    if (window.confirm('Supprimer ce quiz ?')) {
      onDeleteQuiz(id);
      toast.info('Quiz supprimé');
    }
  };

  const handleResetScores = () => {
    if (window.confirm('Réinitialiser tous les scores ?')) {
      onResetScores();
      toast.warning('Scores réinitialisés !');
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: Trophy },
    { id: 'participants', label: 'Participants', icon: Users },
    { id: 'questions', label: 'Banque de Questions', icon: FileQuestion },
    { id: 'lobbies', label: 'Gérer Lobbies', icon: Trash },
    { id: 'monitoring', label: 'Suivi Direct', icon: Monitor },
    { id: 'validation', label: 'Validation', icon: Check }
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold dark:text-white">Admin - {adminUsername}</h2>
            <div className="flex gap-2">
              <DarkModeToggle />
              <button
                onClick={handleResetScores}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 dark:bg-orange-700 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600"
              >
                <RotateCcw className="w-4 h-4" />
                Reset scores
              </button>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg mb-6">
          <div className="flex border-b dark:border-gray-700 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-semibold border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-purple-600 dark:border-purple-500 text-purple-600 dark:text-purple-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Contenu des onglets */}
        <div>
          {activeTab === 'dashboard' && (
            <>
              {editingQuiz !== null ? (
                <QuizEditor
                  quiz={editingQuiz}
                  questions={questions}
                  onSave={handleSaveQuiz}
                  onCancel={() => setEditingQuiz(null)}
                />
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Liste des Quiz */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold dark:text-white">Quiz</h3>
                      <button
                        onClick={() => setEditingQuiz({})}
                        className="px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600"
                      >
                        + Nouveau
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {quizzes.map(quiz => (
                        <div key={quiz.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-700">
                          <h4 className="font-bold dark:text-white">{quiz.title}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{quiz.questions?.length || 0} questions</p>
                          
                          {/* Checkbox pour mode shuffle */}
                          <label className="flex items-center gap-2 mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/30 transition">
                            <input
                              type="checkbox"
                              checked={shuffleMode[quiz.id] || false}
                              onChange={(e) => setShuffleMode(prev => ({ 
                                ...prev, 
                                [quiz.id]: e.target.checked 
                              }))}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <Shuffle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                              Ordre aléatoire des questions
                            </span>
                          </label>
                          
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleCreateLobby(quiz.id)}
                              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm flex items-center gap-1"
                            >
                              <Play className="w-3 h-3" />
                              Créer salle
                            </button>
                            <button
                              onClick={() => setEditingQuiz(quiz)}
                              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
                            >
                              <Edit className="w-3 h-3" />
                              Modifier
                            </button>
                            <button
                              onClick={() => handleDeleteQuiz(quiz.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-1"
                            >
                              <Trash2 className="w-3 h-3" />
                              Supprimer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Classement */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4 dark:text-white">Classement</h3>
                    <div className="space-y-3">
                      {(() => {
                        const sortedTeams = [...teams].sort((a, b) => (b.validatedScore || 0) - (a.validatedScore || 0));
                        const totalTeamsPages = Math.ceil(sortedTeams.length / teamsPerPage);
                        const startIndex = (teamsPage - 1) * teamsPerPage;
                        const endIndex = startIndex + teamsPerPage;
                        const paginatedTeams = sortedTeams.slice(startIndex, endIndex);
                        
                        return (
                          <>
                            {paginatedTeams.map((team, pageIndex) => {
                              const actualIndex = startIndex + pageIndex;
                              return (
                                <div key={team.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-lg text-purple-600 dark:text-purple-400">#{actualIndex + 1}</span>
                                    <span className="font-semibold dark:text-white">{team.name}</span>
                                  </div>
                                  <span className="font-bold text-purple-600 dark:text-purple-400">{team.validatedScore || 0} pts</span>
                                </div>
                              );
                            })}
                            
                            {teams.length === 0 && (
                              <p className="text-center text-gray-500 dark:text-gray-400 py-8">Aucune équipe</p>
                            )}
                            
                            {totalTeamsPages > 1 && (
                              <div className="flex justify-center items-center gap-2 mt-4 pt-4 border-t dark:border-gray-600">
                                <button
                                  onClick={() => setTeamsPage(prev => Math.max(1, prev - 1))}
                                  disabled={teamsPage === 1}
                                  className={`px-3 py-1 rounded text-sm ${
                                    teamsPage === 1
                                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                                      : 'bg-purple-600 text-white hover:bg-purple-700'
                                  }`}
                                >
                                  ←
                                </button>
                                
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                  {teamsPage} / {totalTeamsPages}
                                </span>
                                
                                <button
                                  onClick={() => setTeamsPage(prev => Math.min(totalTeamsPages, prev + 1))}
                                  disabled={teamsPage === totalTeamsPages}
                                  className={`px-3 py-1 rounded text-sm ${
                                    teamsPage === totalTeamsPages
                                      ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 cursor-not-allowed'
                                      : 'bg-purple-600 text-white hover:bg-purple-700'
                                  }`}
                                >
                                  →
                                </button>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Salles actives */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 md:col-span-2">
                    <h3 className="text-xl font-bold mb-4 dark:text-white">Salles actives</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {lobbies.filter(l => l.status !== 'finished').map(lobby => {
                        const quiz = quizzes.find(q => q.id === lobby.quizId);
                        const statusColors = {
                          waiting: 'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-500 dark:border-yellow-600',
                          playing: 'bg-blue-100 dark:bg-blue-900/20 border-blue-500 dark:border-blue-600'
                        };
                        const statusText = {
                          waiting: 'En attente',
                          playing: 'En cours'
                        };
                        
                        return (
                          <div key={lobby.id} className={`border-2 rounded-lg p-4 ${statusColors[lobby.status]}`}>
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-bold dark:text-white">{quiz?.title}</h4>
                                  {lobby.shuffled && (
                                    <span className="px-2 py-1 bg-blue-200 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded flex items-center gap-1">
                                      <Shuffle className="w-3 h-3" />
                                      Aléatoire
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {lobby.participants?.length || 0} participant(s) • {statusText[lobby.status]}
                                </p>
                              </div>
                              {lobby.status === 'waiting' && (
                                <button
                                  onClick={() => onStartQuiz(lobby.id)}
                                  className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-1"
                                >
                                  <Play className="w-3 h-3" />
                                  Démarrer
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {lobbies.filter(l => l.status !== 'finished').length === 0 && (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8 md:col-span-2">Aucune salle active</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'participants' && (
            <ParticipantManager
              teams={teams}
              participants={participants}
              onUpdateParticipant={onUpdateParticipant}
              onDeleteTeam={onDeleteTeam}
              onRefreshData={onRefreshData}
            />
          )}

          {activeTab === 'questions' && (
            <QuestionBank
              questions={questions}
              onSave={onSaveQuestions}
            />
          )}

          {activeTab === 'lobbies' && (
            <LobbyManager
              lobbies={lobbies}
              quizzes={quizzes}
              onDelete={onDeleteLobby}
            />
          )}

          {activeTab === 'monitoring' && (
            <LiveMonitoring
              lobbies={lobbies}
              quizzes={quizzes}
              onNextQuestion={onNextQuestion}
            />
          )}

          {activeTab === 'validation' && (
            <ValidationView
              lobbies={lobbies}
              quizzes={quizzes}
              onValidateAnswer={onValidateAnswer}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;