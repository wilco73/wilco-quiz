import React, { useState } from 'react';
import { LogOut, RotateCcw, Monitor, Check, BookOpen, Trash, Trophy, FileQuestion } from 'lucide-react';
import QuestionBank from './QuestionBank';
import QuizEditor from './QuizEditor';
import LobbyManager from './LobbyManager';
import LiveMonitoring from './LiveMonitoring';
import ValidationView from './ValidationView';

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

  const handleSaveQuiz = (quiz) => {
    onSaveQuiz(quiz);
    setEditingQuiz(null);
    setActiveTab('dashboard');
  };

  const tabs = [
    { id: 'dashboard', label: 'Tableau de bord', icon: Trophy },
    { id: 'questions', label: 'Banque de Questions', icon: FileQuestion },
    { id: 'lobbies', label: 'Gérer Lobbies', icon: Trash },
    { id: 'monitoring', label: 'Suivi Direct', icon: Monitor },
    { id: 'validation', label: 'Validation', icon: Check }
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Admin - {adminUsername}</h2>
            <div className="flex gap-2">
              <button
                onClick={onResetScores}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                <RotateCcw className="w-4 h-4" />
                Reset scores
              </button>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div className="bg-white rounded-lg shadow-lg mb-6">
          <div className="flex border-b overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-6 py-4 font-semibold border-b-2 transition whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'border-purple-600 text-purple-600'
                      : 'border-transparent text-gray-600 hover:text-gray-800'
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
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold">Quiz</h3>
                      <button
                        onClick={() => setEditingQuiz({})}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                      >
                        + Nouveau
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {quizzes.map(quiz => (
                        <div key={quiz.id} className="border border-gray-200 rounded-lg p-4">
                          <h4 className="font-bold">{quiz.title}</h4>
                          <p className="text-sm text-gray-600">{quiz.questions?.length || 0} questions</p>
                          <div className="flex gap-2 mt-2">
                            <button
                              onClick={() => onCreateLobby(quiz.id)}
                              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                            >
                              Créer salle
                            </button>
                            <button
                              onClick={() => setEditingQuiz(quiz)}
                              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                            >
                              Modifier
                            </button>
                            <button
                              onClick={() => onDeleteQuiz(quiz.id)}
                              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                            >
                              Supprimer
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Classement */}
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

                  {/* Salles actives */}
                  <div className="bg-white rounded-lg shadow-lg p-6 md:col-span-2">
                    <h3 className="text-xl font-bold mb-4">Salles actives</h3>
                    <div className="grid md:grid-cols-2 gap-3">
                      {lobbies.filter(l => l.status !== 'finished').map(lobby => {
                        const quiz = quizzes.find(q => q.id === lobby.quizId);
                        const statusColors = {
                          waiting: 'bg-yellow-100 border-yellow-500',
                          playing: 'bg-blue-100 border-blue-500'
                        };
                        const statusText = {
                          waiting: 'En attente',
                          playing: 'En cours'
                        };
                        
                        return (
                          <div key={lobby.id} className={`border-2 rounded-lg p-4 ${statusColors[lobby.status]}`}>
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="font-bold">{quiz?.title}</h4>
                                <p className="text-sm text-gray-600">
                                  {lobby.participants?.length || 0} participants - {statusText[lobby.status]}
                                </p>
                              </div>
                              {lobby.status === 'waiting' && (
                                <button
                                  onClick={() => onStartQuiz(lobby.id)}
                                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                                >
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
              )}
            </>
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