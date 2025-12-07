import React, { useState } from 'react';
import { LogOut, RotateCcw, Monitor, Check, BookOpen, Trash, Trophy, FileQuestion, Play, Edit, Trash2, Shuffle } from 'lucide-react';
import QuestionBank from './QuestionBank';
import QuizEditor from './QuizEditor';
import LobbyManager from './LobbyManager';
import LiveMonitoring from './LiveMonitoring';
import ValidationView from './ValidationView';
import DarkModeToggle from './DarkModeToggle';

const AdminDashboard = ({ 
  adminUsername,
  teams,
  quizzes,
  questions,
  lobbies,
  onSaveQuestions,
  onSaveQuiz,
  onDeleteQuiz,
  onCreateLobby,
  onStartQuiz,
  onNextQuestion,
  onValidateAnswer,
  onDeleteLobby,
  onResetScores,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [editingQuiz, setEditingQuiz] = useState(null);
  
  // ✅ NOUVEAU: État pour la modal de création de lobby
  const [showLobbyModal, setShowLobbyModal] = useState(false);
  const [selectedQuizForLobby, setSelectedQuizForLobby] = useState(null);
  const [shuffleQuestions, setShuffleQuestions] = useState(false);

  const handleSaveQuiz = (quiz) => {
    onSaveQuiz(quiz);
    setEditingQuiz(null);
    setActiveTab('dashboard');
  };

  // ✅ NOUVEAU: Ouvrir la modal de création de lobby
  const handleOpenLobbyModal = (quizId) => {
    setSelectedQuizForLobby(quizId);
    setShuffleQuestions(false);
    setShowLobbyModal(true);
  };

  // ✅ NOUVEAU: Confirmer la création du lobby avec options
  const handleConfirmCreateLobby = () => {
    onCreateLobby(selectedQuizForLobby, shuffleQuestions);
    setShowLobbyModal(false);
    setSelectedQuizForLobby(null);
    setShuffleQuestions(false);
  };

  const tabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: Trophy },
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
                onClick={onResetScores}
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

        {/* ✅ NOUVEAU: Modal de création de lobby */}
        {showLobbyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 max-w-md w-full">
              <h3 className="text-2xl font-bold mb-4 dark:text-white">Créer une salle</h3>
              
              <div className="mb-6">
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Quiz sélectionné : <span className="font-bold dark:text-white">
                    {quizzes.find(q => q.id === selectedQuizForLobby)?.title}
                  </span>
                </p>
                
                {/* ✅ NOUVEAU: Option de mélange */}
                <div className="bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-lg p-4">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={shuffleQuestions}
                      onChange={(e) => setShuffleQuestions(e.target.checked)}
                      className="mt-1 w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Shuffle className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                        <span className="font-bold text-purple-900 dark:text-purple-300">
                          Mélanger les questions
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Les questions seront jouées dans un ordre aléatoire pour chaque partie.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleConfirmCreateLobby}
                  className="flex-1 py-3 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 font-semibold flex items-center justify-center gap-2"
                >
                  <Play className="w-5 h-5" />
                  Créer la salle
                </button>
                <button
                  onClick={() => {
                    setShowLobbyModal(false);
                    setSelectedQuizForLobby(null);
                    setShuffleQuestions(false);
                  }}
                  className="px-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-600 font-semibold"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}

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
                          <p className="text-sm text-gray-600 dark:text-gray-400">{quiz.questions?.length || 0} questions</p>
                          <div className="flex gap-2 mt-2">
                            {/* ✅ MODIFIÉ: Ouvrir la modal au lieu d'appeler directement */}
                            <button
                              onClick={() => handleOpenLobbyModal(quiz.id)}
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
                              onClick={() => onDeleteQuiz(quiz.id)}
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
                      {[...teams].sort((a, b) => (b.validatedScore || 0) - (a.validatedScore || 0)).map((team, index) => (
                        <div key={team.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-lg text-purple-600 dark:text-purple-400">#{index + 1}</span>
                            <span className="font-semibold dark:text-white">{team.name}</span>
                          </div>
                          <span className="font-bold text-purple-600 dark:text-purple-400">{team.validatedScore || 0} pts</span>
                        </div>
                      ))}
                      {teams.length === 0 && (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">Aucune équipe</p>
                      )}
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
                            <div className="flex justify-between items-center">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-bold dark:text-white">{quiz?.title}</h4>
                                  {/* ✅ NOUVEAU: Badge si questions mélangées */}
                                  {lobby.shuffled && (
                                    <span className="px-2 py-1 bg-purple-200 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 text-xs rounded flex items-center gap-1">
                                      <Shuffle className="w-3 h-3" />
                                      Aléatoire
                                    </span>
                                  )}
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-400">
                                  {lobby.participants?.length || 0} participants - {statusText[lobby.status]}
                                </p>
                              </div>
                              {lobby.status === 'waiting' && (
                                <button
                                  onClick={() => onStartQuiz(lobby.id)}
                                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-1"
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
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8 col-span-2">Aucune salle active</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'questions' && (
            <QuestionBank
              questions={questions}
              quizzes={quizzes}
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