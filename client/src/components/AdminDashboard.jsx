import React, { useState, useEffect } from 'react';
import { LogOut, RotateCcw, Monitor, Check, BookOpen, Trash, Trophy, FileQuestion, Play, Edit, Trash2, Users, Shuffle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, X, FolderOpen, Clock, Palette } from 'lucide-react';
import { useToast } from './ToastProvider';
import * as api from '../services/api';
import QuestionBank from './QuestionBank';
import QuizEditor from './QuizEditor';
import LobbyManager from './LobbyManager';
import LiveMonitoring from './LiveMonitoring';
import ValidationView from './ValidationView';
import ParticipantManager from './ParticipantManager';
import DarkModeToggle from './DarkModeToggle';
import DrawingWordBank from './DrawingWordBank';
import DrawingReferenceBank from './DrawingReferenceBank';
import DrawingCanvas from './DrawingCanvas';
import DrawingLobbyManager from './DrawingLobbyManager';
import { PictionaryConfig } from './PictionaryGame';

// Composant de pagination réutilisable
const Pagination = ({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }) => {
  if (totalPages <= 1) return null;
  
  return (
    <div className="flex justify-between items-center mt-4 pt-4 border-t dark:border-gray-600">
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalItems)} sur {totalItems}
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-500 transition"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="px-3 py-1 text-sm dark:text-white">
          {currentPage} / {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-500 transition"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

// Composant Modal Salle d'attente
const WaitingRoomModal = ({ lobby, quiz, onStart, onClose, onDelete }) => {
  if (!lobby) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-white">{quiz?.title}</h2>
            <p className="text-purple-200 text-sm">Salle d'attente</p>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Contenu */}
        <div className="p-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
              <Users className="w-8 h-8 mx-auto text-purple-600 dark:text-purple-400 mb-2" />
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {lobby.participants?.length || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Participants</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
              <FileQuestion className="w-8 h-8 mx-auto text-blue-600 dark:text-blue-400 mb-2" />
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {quiz?.questions?.length || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Questions</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
              {lobby.shuffled ? (
                <Shuffle className="w-8 h-8 mx-auto text-green-600 dark:text-green-400 mb-2" />
              ) : (
                <BookOpen className="w-8 h-8 mx-auto text-green-600 dark:text-green-400 mb-2" />
              )}
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                {lobby.shuffled ? 'Aléatoire' : 'Ordre fixe'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Mode</p>
            </div>
          </div>
          
          {/* Liste des participants */}
          <div className="mb-6">
            <h3 className="font-semibold dark:text-white mb-3 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Participants connectés
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 max-h-60 overflow-y-auto">
              {lobby.participants?.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {lobby.participants.map((p, idx) => (
                    <div 
                      key={idx} 
                      className="flex items-center gap-2 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 shadow-sm"
                    >
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                        {p.pseudo?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium dark:text-white truncate">{p.pseudo}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{p.teamName}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>En attente de participants...</p>
                  <p className="text-sm">Les joueurs peuvent rejoindre la salle</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Boutons d'action */}
          <div className="flex gap-3">
            <button
              onClick={onStart}
              disabled={!lobby.participants?.length}
              className="flex-1 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-semibold transition"
            >
              <Play className="w-5 h-5" />
              Lancer le quiz
            </button>
            <button
              onClick={onDelete}
              className="px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center justify-center gap-2 transition"
              title="Supprimer la salle"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          
          {!lobby.participants?.length && (
            <p className="text-center text-sm text-orange-600 dark:text-orange-400 mt-3">
              ⚠️ Attendez qu'au moins un participant rejoigne la salle
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// Composant pour l'onglet Dessin
const DrawingTab = ({ socket, teams, participants }) => {
  const [subTab, setSubTab] = useState('pictionary'); // pictionary, canvas, words, references
  
  return (
    <div className="space-y-6">
      {/* Sous-navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSubTab('pictionary')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              subTab === 'pictionary'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            🎯 Jeux
          </button>
          <button
            onClick={() => setSubTab('words')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              subTab === 'words'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            📝 Mots
          </button>
          <button
            onClick={() => setSubTab('references')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              subTab === 'references'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            🖼️ Images
          </button>
          <button
            onClick={() => setSubTab('canvas')}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              subTab === 'canvas'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            🎨 Test Canvas
          </button>
        </div>
      </div>
      
      {/* Contenu */}
      {subTab === 'pictionary' && (
        <DrawingLobbyManager
          socket={socket}
          teams={teams}
          participants={participants}
        />
      )}
      
      {subTab === 'words' && <DrawingWordBank />}
      
      {subTab === 'references' && <DrawingReferenceBank />}
      
      {subTab === 'canvas' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold dark:text-white mb-4">🎨 Test du Canvas</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Testez les outils : crayon, gomme, pot de peinture, couleurs et transparence.
          </p>
          <div className="flex justify-center">
            <DrawingCanvas
              width={800}
              height={500}
              canDraw={true}
              showTools={true}
              collaborative={false}
            />
          </div>
        </div>
      )}
    </div>
  );
};

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
  const [selectedLobby, setSelectedLobby] = useState(null); // Lobby sélectionné pour la salle d'attente
  const [filterGroup, setFilterGroup] = useState(''); // Filtre par groupe de quiz
  const [expandedGroups, setExpandedGroups] = useState({}); // Groupes dépliés/repliés
  
  // Pagination states
  const [teamsPage, setTeamsPage] = useState(1);
  const [quizzesPage, setQuizzesPage] = useState(1);
  const teamsPerPage = 5;
  const quizzesPerPage = 4;
  
  const toast = useToast();
  
  // Extraire les groupes uniques des quiz
  const quizGroups = [...new Set(quizzes.map(q => q.groupName).filter(Boolean))].sort();
  
  // Grouper les quiz par groupe
  const groupedQuizzes = quizzes.reduce((acc, quiz) => {
    const group = quiz.groupName || 'Sans groupe';
    if (!acc[group]) acc[group] = [];
    acc[group].push(quiz);
    return acc;
  }, {});
  
  // Toggle un groupe déplié/replié
  const toggleGroup = (groupName) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupName]: !prev[groupName]
    }));
  };
  
  // Fermer la modal si le lobby sélectionné n'existe plus ou a été démarré
  useEffect(() => {
    if (selectedLobby) {
      const currentLobby = lobbies.find(l => l.id === selectedLobby.id);
      if (!currentLobby) {
        // Le lobby a été supprimé
        setSelectedLobby(null);
      } else if (currentLobby.status === 'playing') {
        // Le lobby a été démarré, fermer la modal et aller au monitoring
        setSelectedLobby(null);
        setActiveTab('monitoring');
        socket.joinMonitoring(currentLobby.id);
      }
    }
  }, [lobbies, selectedLobby, socket]);

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

  const onStopQuiz = async (lobbyId) => {
    const result = await socket.stopLobby(lobbyId);
    if (result.success) {
      toast.success('Quiz arrete - retour en salle d\'attente');
    } else {
      toast.error(result.message || 'Erreur lors de l\'arret');
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

  const handleCreateLobby = async (quizId) => {
    const shuffle = shuffleMode[quizId] || false;
    const result = await socket.createLobby(quizId, shuffle);
    if (result.success) {
      toast.success(shuffle ? 'Salle créée avec questions mélangées' : 'Salle créée');
      // Ouvrir automatiquement la salle d'attente
      setSelectedLobby(result.lobby);
      setShuffleMode(prev => ({ ...prev, [quizId]: false }));
    } else {
      toast.error(result.message || 'Erreur lors de la création');
    }
  };
  
  // Lancer le quiz depuis la salle d'attente et passer au suivi en direct
  const handleStartFromWaitingRoom = async (lobbyId) => {
    const result = await socket.startQuiz(lobbyId);
    if (result.success) {
      toast.success('Quiz démarré !');
      setSelectedLobby(null);
      setActiveTab('monitoring');
      // Rejoindre le monitoring de ce lobby
      socket.joinMonitoring(lobbyId);
    } else {
      toast.error(result.message || 'Erreur lors du démarrage');
    }
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
    { id: 'drawing', label: 'Jeux de Dessin', icon: Palette },
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
                  {/* Liste des Quiz groupés par thème */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xl font-bold dark:text-white">Quiz ({quizzes.length})</h3>
                      <button
                        onClick={() => setEditingQuiz({})}
                        className="px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600"
                      >
                        + Nouveau
                      </button>
                    </div>
                    
                    {/* Filtre par groupe */}
                    {quizGroups.length > 0 && (
                      <div className="mb-4">
                        <select
                          value={filterGroup}
                          onChange={(e) => setFilterGroup(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Tous les groupes</option>
                          {quizGroups.map(group => (
                            <option key={group} value={group}>{group}</option>
                          ))}
                          <option value="__none__">Sans groupe</option>
                        </select>
                      </div>
                    )}
                    
                    <div className="space-y-4 max-h-[500px] overflow-y-auto">
                      {Object.entries(groupedQuizzes)
                        .filter(([groupName]) => {
                          if (!filterGroup) return true;
                          if (filterGroup === '__none__') return groupName === 'Sans groupe';
                          return groupName === filterGroup;
                        })
                        .map(([groupName, groupQuizzes]) => (
                        <div key={groupName} className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                          {/* En-tête du groupe */}
                          <button
                            onClick={() => toggleGroup(groupName)}
                            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 flex items-center justify-between hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                          >
                            <div className="flex items-center gap-2">
                              <FolderOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                              <span className="font-semibold dark:text-white">{groupName}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">({groupQuizzes.length})</span>
                            </div>
                            {expandedGroups[groupName] !== false ? (
                              <ChevronUp className="w-4 h-4 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-500" />
                            )}
                          </button>
                          
                          {/* Quiz du groupe */}
                          {expandedGroups[groupName] !== false && (
                            <div className="p-3 space-y-2">
                              {groupQuizzes.map(quiz => (
                                <div key={quiz.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50">
                                  <div className="flex justify-between items-start mb-2">
                                    <div>
                                      <h4 className="font-bold dark:text-white">{quiz.title}</h4>
                                      <p className="text-xs text-gray-500 dark:text-gray-400">{quiz.questions?.length || 0} questions</p>
                                    </div>
                                    <div className="flex gap-1">
                                      <button
                                        onClick={() => setEditingQuiz(quiz)}
                                        className="p-1 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                                        title="Modifier"
                                      >
                                        <Edit className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteQuiz(quiz.id)}
                                        className="p-1 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                        title="Supprimer"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                  
                                  {/* Options et bouton créer salle */}
                                  <div className="flex items-center gap-2">
                                    <label className="flex items-center gap-1 text-xs cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={shuffleMode[quiz.id] || false}
                                        onChange={(e) => setShuffleMode(prev => ({ 
                                          ...prev, 
                                          [quiz.id]: e.target.checked 
                                        }))}
                                        className="w-3 h-3"
                                      />
                                      <Shuffle className="w-3 h-3 text-blue-600" />
                                      <span className="text-gray-600 dark:text-gray-400">Aléatoire</span>
                                    </label>
                                    <button
                                      onClick={() => handleCreateLobby(quiz.id)}
                                      className="ml-auto px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-xs flex items-center gap-1"
                                    >
                                      <Play className="w-3 h-3" />
                                      Créer salle
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                      {quizzes.length === 0 && (
                        <p className="text-center text-gray-500 dark:text-gray-400 py-8">Aucun quiz</p>
                      )}
                    </div>
                  </div>

                  {/* Classement */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4 dark:text-white">Classement ({teams.length} équipes)</h3>
                    {(() => {
                      const sortedTeams = [...teams].sort((a, b) => (b.validatedScore || 0) - (a.validatedScore || 0));
                      const totalTeamsPages = Math.ceil(sortedTeams.length / teamsPerPage);
                      const startIndex = (teamsPage - 1) * teamsPerPage;
                      const paginatedTeams = sortedTeams.slice(startIndex, startIndex + teamsPerPage);
                      
                      return (
                        <>
                          <div className="space-y-3">
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
                          </div>
                          <Pagination
                            currentPage={teamsPage}
                            totalPages={totalTeamsPages}
                            onPageChange={setTeamsPage}
                            itemsPerPage={teamsPerPage}
                            totalItems={teams.length}
                          />
                        </>
                      );
                    })()}
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
                          <div 
                            key={lobby.id} 
                            className={`border-2 rounded-lg p-4 ${statusColors[lobby.status]} cursor-pointer hover:shadow-lg transition`}
                            onClick={() => lobby.status === 'waiting' ? setSelectedLobby(lobby) : null}
                          >
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
                                {/* Aperçu des participants */}
                                {lobby.participants?.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {lobby.participants.slice(0, 5).map((p, idx) => (
                                      <span key={idx} className="px-2 py-0.5 bg-white/50 dark:bg-gray-800/50 text-xs rounded">
                                        {p.pseudo}
                                      </span>
                                    ))}
                                    {lobby.participants.length > 5 && (
                                      <span className="px-2 py-0.5 bg-white/50 dark:bg-gray-800/50 text-xs rounded">
                                        +{lobby.participants.length - 5}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col gap-2">
                                {lobby.status === 'waiting' && (
                                  <>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); setSelectedLobby(lobby); }}
                                      className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center gap-1 text-sm"
                                    >
                                      <Users className="w-3 h-3" />
                                      Gérer
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleStartFromWaitingRoom(lobby.id); }}
                                      className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 flex items-center gap-1 text-sm"
                                    >
                                      <Play className="w-3 h-3" />
                                      Lancer
                                    </button>
                                  </>
                                )}
                                {lobby.status === 'playing' && (
                                  <button
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      setActiveTab('monitoring');
                                      socket.joinMonitoring(lobby.id);
                                    }}
                                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1 text-sm"
                                  >
                                    <Monitor className="w-3 h-3" />
                                    Suivre
                                  </button>
                                )}
                              </div>
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
              
              {/* Modal Salle d'attente */}
              {selectedLobby && (
                <WaitingRoomModal
                  lobby={lobbies.find(l => l.id === selectedLobby.id) || selectedLobby}
                  quiz={quizzes.find(q => q.id === selectedLobby.quizId)}
                  onStart={() => handleStartFromWaitingRoom(selectedLobby.id)}
                  onClose={() => setSelectedLobby(null)}
                  onDelete={() => {
                    onDeleteLobby(selectedLobby.id);
                    setSelectedLobby(null);
                  }}
                />
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

          {activeTab === 'drawing' && (
            <DrawingTab socket={socket} teams={teams} participants={participants} />
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
              socket={socket}
              onNextQuestion={onNextQuestion}
              onStopQuiz={onStopQuiz}
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