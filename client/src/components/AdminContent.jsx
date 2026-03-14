import React, { useState, useEffect } from 'react';
import { RotateCcw, Play, Shuffle, ChevronDown, ChevronUp, FolderOpen, Clock, Users, X } from 'lucide-react';
import { useToast } from './ToastProvider';
import * as api from '../services/api';
import QuestionBank from './QuestionBank';
import QuizEditor from './QuizEditor';
import LobbyManager from './LobbyManager';
import LiveMonitoring from './LiveMonitoring';
import ValidationView from './ValidationView';
import ParticipantManager from './ParticipantManager';
import DrawingWordBank from './DrawingWordBank';
import DrawingReferenceBank from './DrawingReferenceBank';
import DrawingLobbyManager from './DrawingLobbyManager';
import { PictionaryConfig } from './PictionaryGame';
import UserManagement from './UserManagement';

/**
 * AdminContent - Contenu de l'interface admin (sans le layout)
 * Rendu en fonction de activeTab passé en prop
 */
const AdminContent = ({ 
  activeTab,
  teams,
  participants,
  quizzes,
  questions,
  lobbies,
  socket,
  currentUser,
  onRefreshData,
  onUpdateParticipant,
  onDeleteTeam
}) => {
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [shuffleMode, setShuffleMode] = useState({});
  const [selectedLobby, setSelectedLobby] = useState(null);
  const [filterGroup, setFilterGroup] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  
  const toast = useToast();

  // Grouper les quiz par groupe
  const quizGroups = quizzes.reduce((acc, quiz) => {
    const group = quiz.group || 'Sans groupe';
    if (!acc[group]) acc[group] = [];
    acc[group].push(quiz);
    return acc;
  }, {});

  const uniqueGroups = Object.keys(quizGroups).sort();

  // Fonctions pour les quiz
  const handleCreateLobby = async (quizId, shuffle = false) => {
    const result = await socket.createLobby(quizId, shuffle);
    if (result.success) {
      toast.success('Lobby créé !');
      onRefreshData?.();
    } else {
      toast.error(result.message || 'Erreur création lobby');
    }
  };

  const handleStartQuiz = async (lobbyId) => {
    const result = await socket.startQuiz(lobbyId);
    if (result.success) {
      toast.success('Quiz démarré !');
      setSelectedLobby(null);
    } else {
      toast.error(result.message || 'Erreur démarrage');
    }
  };

  const handleDeleteLobby = async (lobbyId) => {
    if (!window.confirm('Supprimer ce lobby ?')) return;
    const result = await socket.deleteLobby(lobbyId);
    if (result.success) {
      toast.success('Lobby supprimé');
      setSelectedLobby(null);
    } else {
      toast.error(result.message || 'Erreur suppression');
    }
  };

  // Fonctions pour le monitoring
  const onNextQuestion = async (lobbyId) => {
    const result = await socket.nextQuestion(lobbyId);
    if (!result.success) {
      toast.error(result.message || 'Erreur');
    }
  };

  const onStopQuiz = async (lobbyId) => {
    const result = await socket.stopLobby(lobbyId);
    if (result.success) {
      toast.success('Quiz arrêté');
    } else {
      toast.error(result.message || 'Erreur');
    }
  };

  const onValidateAnswer = async (lobbyId, odId, questionId, isValid) => {
    const result = await socket.validateAnswer(lobbyId, odId, questionId, isValid);
    if (!result.success) {
      toast.error(result.message || 'Erreur validation');
    }
  };

  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  // Modal salle d'attente
  const WaitingRoomModal = () => {
    if (!selectedLobby) return null;
    const quiz = quizzes.find(q => q.id === selectedLobby.quizId);
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white">{quiz?.title}</h2>
              <p className="text-purple-200 text-sm">Salle d'attente</p>
            </div>
            <button
              onClick={() => setSelectedLobby(null)}
              className="text-white/80 hover:text-white transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                <Users className="w-8 h-8 mx-auto text-purple-600 dark:text-purple-400 mb-2" />
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {selectedLobby.participants?.length || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Participants</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {quiz?.questions?.length || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Questions</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {selectedLobby.shuffle ? 'Oui' : 'Non'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Mélangé</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => handleStartQuiz(selectedLobby.id)}
                disabled={!selectedLobby.participants?.length}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" />
                Démarrer
              </button>
              <button
                onClick={() => handleDeleteLobby(selectedLobby.id)}
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Rendu selon l'onglet actif
  switch (activeTab) {
    case 'admin-dashboard':
      return (
        <div className="space-y-6">
          <WaitingRoomModal />
          
          <h1 className="text-2xl font-bold dark:text-white">Tableau de bord</h1>
          
          {/* Stats rapides */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-3xl font-bold text-purple-600">{teams.length}</p>
              <p className="text-gray-600 dark:text-gray-400">Équipes</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-3xl font-bold text-blue-600">{participants.length}</p>
              <p className="text-gray-600 dark:text-gray-400">Participants</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-3xl font-bold text-green-600">{quizzes.length}</p>
              <p className="text-gray-600 dark:text-gray-400">Quiz</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <p className="text-3xl font-bold text-orange-600">{questions.length}</p>
              <p className="text-gray-600 dark:text-gray-400">Questions</p>
            </div>
          </div>
          
          {/* Classement équipes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4 dark:text-white">Classement des équipes</h2>
            <div className="space-y-2">
              {[...teams]
                .sort((a, b) => (b.validatedScore || 0) - (a.validatedScore || 0))
                .slice(0, 5)
                .map((team, index) => (
                  <div key={team.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        index === 0 ? 'bg-yellow-400 text-yellow-900' :
                        index === 1 ? 'bg-gray-300 text-gray-700' :
                        index === 2 ? 'bg-orange-400 text-orange-900' :
                        'bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="font-semibold dark:text-white">{team.name}</span>
                    </div>
                    <span className="font-bold text-purple-600 dark:text-purple-400">
                      {team.validatedScore || 0} pts
                    </span>
                  </div>
                ))}
            </div>
          </div>
          
          {/* Quiz disponibles */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold dark:text-white">Lancer un Quiz</h2>
              {uniqueGroups.length > 1 && (
                <select
                  value={filterGroup}
                  onChange={(e) => setFilterGroup(e.target.value)}
                  className="px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  <option value="">Tous les groupes</option>
                  {uniqueGroups.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              )}
            </div>
            
            <div className="space-y-4">
              {uniqueGroups
                .filter(g => !filterGroup || g === filterGroup)
                .map(group => (
                  <div key={group} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleGroup(group)}
                      className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                      <div className="flex items-center gap-2">
                        <FolderOpen className="w-5 h-5 text-purple-600" />
                        <span className="font-semibold dark:text-white">{group}</span>
                        <span className="text-sm text-gray-500">({quizGroups[group].length})</span>
                      </div>
                      {expandedGroups[group] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                    
                    {expandedGroups[group] && (
                      <div className="p-3 space-y-2">
                        {quizGroups[group].map(quiz => {
                          const existingLobby = lobbies.find(l => l.quizId === quiz.id && l.status === 'waiting');
                          return (
                            <div key={quiz.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg">
                              <div>
                                <p className="font-semibold dark:text-white">{quiz.title}</p>
                                <p className="text-sm text-gray-500">{quiz.questions?.length || 0} questions</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <label className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                                  <input
                                    type="checkbox"
                                    checked={shuffleMode[quiz.id] || false}
                                    onChange={(e) => setShuffleMode({...shuffleMode, [quiz.id]: e.target.checked})}
                                    className="rounded"
                                  />
                                  <Shuffle className="w-4 h-4" />
                                </label>
                                {existingLobby ? (
                                  <button
                                    onClick={() => setSelectedLobby(existingLobby)}
                                    className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center gap-2"
                                  >
                                    <Clock className="w-4 h-4" />
                                    En attente ({existingLobby.participants?.length || 0})
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleCreateLobby(quiz.id, shuffleMode[quiz.id])}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                                  >
                                    <Play className="w-4 h-4" />
                                    Créer Lobby
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      );

    case 'admin-participants':
      return (
        <ParticipantManager
          teams={teams}
          participants={participants}
          onUpdateParticipant={onUpdateParticipant}
          onDeleteTeam={onDeleteTeam}
        />
      );

    case 'admin-questions':
      return <QuestionBank questions={questions} />;

    case 'admin-drawing':
      return (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold dark:text-white">Jeux de Dessin</h1>
          <div className="grid gap-6">
            <DrawingWordBank />
            <DrawingReferenceBank />
            <DrawingLobbyManager socket={socket} />
          </div>
        </div>
      );

    case 'admin-lobbies':
      return <LobbyManager lobbies={lobbies} socket={socket} />;

    case 'admin-monitoring':
      return (
        <LiveMonitoring
          lobbies={lobbies}
          quizzes={quizzes}
          socket={socket}
          onNextQuestion={onNextQuestion}
          onStopQuiz={onStopQuiz}
        />
      );

    case 'admin-validation':
      return (
        <ValidationView
          lobbies={lobbies}
          quizzes={quizzes}
          onValidateAnswer={onValidateAnswer}
        />
      );

    case 'admin-users':
      return (
        <UserManagement
          socket={socket}
          currentUser={currentUser}
        />
      );

    default:
      return (
        <div className="text-center py-12">
          <p className="text-gray-500 dark:text-gray-400">Section non trouvée</p>
        </div>
      );
  }
};

export default AdminContent;
