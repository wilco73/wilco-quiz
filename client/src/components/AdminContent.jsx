import React, { useState } from 'react';
import { 
  Play, Shuffle, ChevronDown, ChevronUp, FolderOpen, Clock, Users, X, 
  Plus, Edit, Trash2, BookOpen, Palette, Image, FileText
} from 'lucide-react';
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
import UserManagement from './UserManagement';
import MysteryGridManager from './MysteryGridManager';
import MediaLibrary from './MediaLibrary';

/**
 * AdminContent - Contenu de l'interface admin (sans le layout)
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
  // États pour les quiz
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [creatingQuiz, setCreatingQuiz] = useState(false);
  const [shuffleMode, setShuffleMode] = useState({});
  const [selectedLobby, setSelectedLobby] = useState(null);
  const [filterGroup, setFilterGroup] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});
  
  // États pour les jeux de dessin
  const [drawingTab, setDrawingTab] = useState('words');
  
  const toast = useToast();

  // Grouper les quiz par groupe
  const quizGroups = quizzes.reduce((acc, quiz) => {
    const group = quiz.groupName || 'Sans groupe';
    if (!acc[group]) acc[group] = [];
    acc[group].push(quiz);
    return acc;
  }, {});

  const uniqueGroups = Object.keys(quizGroups).sort();

  // === HANDLERS QUIZ ===
  
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

  const handleSaveQuiz = async (quizData) => {
    try {
      if (editingQuiz) {
        await api.updateQuiz(editingQuiz.id, quizData);
        toast.success('Quiz mis à jour !');
      } else {
        await api.createQuiz(quizData);
        toast.success('Quiz créé !');
      }
      setEditingQuiz(null);
      setCreatingQuiz(false);
      onRefreshData?.();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Supprimer ce quiz ?')) return;
    try {
      await api.deleteQuiz(quizId);
      toast.success('Quiz supprimé');
      onRefreshData?.();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  // === HANDLERS MONITORING ===
  
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

  // === MODAL SALLE D'ATTENTE ===
  
  // Rendu de la modale WaitingRoom
  const renderWaitingRoomModal = () => {
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
            <button onClick={() => setSelectedLobby(null)} className="text-white/80 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
                <Users className="w-6 h-6 mx-auto text-purple-600 dark:text-purple-400 mb-1" />
                <p className="text-xl font-bold text-purple-600">{selectedLobby.participants?.length || 0}</p>
                <p className="text-xs text-gray-500">Participants</p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
                <p className="text-xl font-bold text-blue-600">{quiz?.questions?.length || 0}</p>
                <p className="text-xs text-gray-500">Questions</p>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
                <p className="text-xl font-bold text-green-600">{selectedLobby.shuffle ? 'Oui' : 'Non'}</p>
                <p className="text-xs text-gray-500">Mélangé</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => handleStartQuiz(selectedLobby.id)}
                disabled={!selectedLobby.participants?.length}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" /> Démarrer
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

  // === RENDU SELON L'ONGLET ===
  
  // Rendu de la modale QuizEditor (en dehors du switch pour éviter le remontage)
  const renderQuizEditorModal = () => {
    if (!editingQuiz && !creatingQuiz) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-green-600 to-teal-600 px-6 py-4 flex justify-between items-center">
            <h2 className="text-xl font-bold text-white">
              {editingQuiz ? `Modifier : ${editingQuiz.title}` : 'Nouveau Quiz'}
            </h2>
            <button onClick={() => { setEditingQuiz(null); setCreatingQuiz(false); }} className="text-white/80 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="flex-1 overflow-auto">
            <QuizEditor
              quiz={editingQuiz}
              questions={questions}
              onSave={handleSaveQuiz}
              onCancel={() => { setEditingQuiz(null); setCreatingQuiz(false); }}
            />
          </div>
        </div>
      </div>
    );
  };
  
  switch (activeTab) {
    case 'admin-dashboard':
      return (
        <div className="space-y-6">
          {renderWaitingRoomModal()}
          {renderQuizEditorModal()}
          
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold dark:text-white">Tableau de bord</h1>
            <button
              onClick={() => setCreatingQuiz(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
            >
              <Plus className="w-5 h-5" /> Nouveau Quiz
            </button>
          </div>
          
          {/* Layout en 2 colonnes */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne principale - Quiz */}
            <div className="lg:col-span-2 space-y-6">
              {/* Stats rapides */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
                  <p className="text-2xl font-bold text-purple-600">{teams.length}</p>
                  <p className="text-xs text-gray-500">Équipes</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
                  <p className="text-2xl font-bold text-blue-600">{participants.length}</p>
                  <p className="text-xs text-gray-500">Participants</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
                  <p className="text-2xl font-bold text-green-600">{quizzes.length}</p>
                  <p className="text-xs text-gray-500">Quiz</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 text-center">
                  <p className="text-2xl font-bold text-orange-600">{questions.length}</p>
                  <p className="text-xs text-gray-500">Questions</p>
                </div>
              </div>
              
              {/* Liste des Quiz */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold dark:text-white">Quiz disponibles</h2>
                  {uniqueGroups.length > 1 && (
                    <select
                      value={filterGroup}
                      onChange={(e) => setFilterGroup(e.target.value)}
                      className="px-2 py-1 text-sm border rounded dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="">Tous</option>
                      {uniqueGroups.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  )}
                </div>
                
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {uniqueGroups
                    .filter(g => !filterGroup || g === filterGroup)
                    .map(group => (
                      <div key={group} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                        <button
                          onClick={() => toggleGroup(group)}
                          className="w-full flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <FolderOpen className="w-4 h-4 text-purple-600" />
                            <span className="font-medium dark:text-white">{group}</span>
                            <span className="text-xs text-gray-500">({quizGroups[group].length})</span>
                          </div>
                          {expandedGroups[group] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        
                        {expandedGroups[group] && (
                          <div className="p-2 space-y-1">
                            {quizGroups[group].map(quiz => {
                              const existingLobby = lobbies.find(l => l.quizId === quiz.id && l.status === 'waiting');
                              return (
                                <div key={quiz.id} className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded text-sm">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium dark:text-white truncate">{quiz.title}</p>
                                    <p className="text-xs text-gray-500">{quiz.questions?.length || 0} questions</p>
                                  </div>
                                  <div className="flex items-center gap-1 ml-2">
                                    <button
                                      onClick={() => setEditingQuiz(quiz)}
                                      className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                                      title="Modifier"
                                    >
                                      <Edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteQuiz(quiz.id)}
                                      className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                                      title="Supprimer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                    <label className="flex items-center gap-1 px-1" title="Mélanger">
                                      <input
                                        type="checkbox"
                                        checked={shuffleMode[quiz.id] || false}
                                        onChange={(e) => setShuffleMode({...shuffleMode, [quiz.id]: e.target.checked})}
                                        className="rounded w-3 h-3"
                                      />
                                      <Shuffle className="w-3 h-3 text-gray-500" />
                                    </label>
                                    {existingLobby ? (
                                      <button
                                        onClick={() => setSelectedLobby(existingLobby)}
                                        className="px-2 py-1 bg-yellow-500 text-white rounded text-xs flex items-center gap-1"
                                      >
                                        <Clock className="w-3 h-3" />
                                        {existingLobby.participants?.length || 0}
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => handleCreateLobby(quiz.id, shuffleMode[quiz.id])}
                                        className="px-2 py-1 bg-purple-600 text-white rounded text-xs flex items-center gap-1"
                                      >
                                        <Play className="w-3 h-3" /> Lancer
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
            
            {/* Colonne latérale - Classement */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h3 className="text-sm font-bold mb-3 dark:text-white flex items-center gap-2">
                  🏆 Top 5 Équipes
                </h3>
                <div className="space-y-2">
                  {[...teams]
                    .sort((a, b) => (b.validatedScore || 0) - (a.validatedScore || 0))
                    .slice(0, 5)
                    .map((team, index) => (
                      <div key={team.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-yellow-400 text-yellow-900' :
                            index === 1 ? 'bg-gray-300 text-gray-700' :
                            index === 2 ? 'bg-orange-400 text-orange-900' :
                            'bg-gray-200 dark:bg-gray-600 text-gray-500'
                          }`}>
                            {index + 1}
                          </span>
                          <span className="font-medium dark:text-white truncate max-w-[120px]">{team.name}</span>
                        </div>
                        <span className="font-bold text-purple-600 text-sm">{team.validatedScore || 0}</span>
                      </div>
                    ))}
                  {teams.length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-2">Aucune équipe</p>
                  )}
                </div>
              </div>
              
              {/* Lobbies en attente */}
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h3 className="text-sm font-bold mb-3 dark:text-white flex items-center gap-2">
                  ⏳ En attente
                </h3>
                <div className="space-y-2">
                  {lobbies.filter(l => l.status === 'waiting').map(lobby => {
                    const quiz = quizzes.find(q => q.id === lobby.quizId);
                    return (
                      <button
                        key={lobby.id}
                        onClick={() => setSelectedLobby(lobby)}
                        className="w-full flex items-center justify-between p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm hover:bg-yellow-100 dark:hover:bg-yellow-900/30"
                      >
                        <span className="font-medium text-yellow-800 dark:text-yellow-300 truncate">
                          {quiz?.title || 'Quiz'}
                        </span>
                        <span className="flex items-center gap-1 text-yellow-600">
                          <Users className="w-3 h-3" />
                          {lobby.participants?.length || 0}
                        </span>
                      </button>
                    );
                  })}
                  {lobbies.filter(l => l.status === 'waiting').length === 0 && (
                    <p className="text-gray-500 text-sm text-center py-2">Aucun lobby</p>
                  )}
                </div>
              </div>
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
          onRefreshData={onRefreshData}
          compact={true}
          currentUser={currentUser}
        />
      );

    case 'admin-questions':
      return <QuestionBank questions={questions} />;

    case 'admin-drawing':
      return (
        <div className="space-y-4">
          <h1 className="text-2xl font-bold dark:text-white">Jeux de Dessin</h1>
          
          {/* Onglets */}
          <div className="flex border-b dark:border-gray-700">
            <button
              onClick={() => setDrawingTab('words')}
              className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
                drawingTab === 'words'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <FileText className="w-4 h-4" />
              Banque de mots
            </button>
            <button
              onClick={() => setDrawingTab('references')}
              className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
                drawingTab === 'references'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Image className="w-4 h-4" />
              Images de référence
            </button>
            <button
              onClick={() => setDrawingTab('lobbies')}
              className={`flex items-center gap-2 px-4 py-3 font-medium border-b-2 transition ${
                drawingTab === 'lobbies'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Palette className="w-4 h-4" />
              Lobbies
            </button>
          </div>
          
          {/* Contenu selon l'onglet */}
          {drawingTab === 'words' && <DrawingWordBank />}
          {drawingTab === 'references' && <DrawingReferenceBank />}
          {drawingTab === 'lobbies' && <DrawingLobbyManager socket={socket} />}
        </div>
      );

    case 'admin-lobbies':
      return (
        <LobbyManager 
          lobbies={lobbies} 
          quizzes={quizzes}
          onDelete={async (lobbyId) => {
            const result = await socket.deleteLobby(lobbyId);
            if (result.success) {
              toast.success('Lobby supprimé');
            } else {
              toast.error(result.message || 'Erreur');
            }
          }}
        />
      );

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

    case 'admin-mystery':
      return (
        <MysteryGridManager
          socket={socket}
          onJoinLobby={(lobby) => {
            // Naviguer vers la vue mystery
            window.dispatchEvent(new CustomEvent('mystery:joinLobby', { detail: lobby }));
          }}
        />
      );

    case 'admin-media':
      return (
        <MediaLibrary />
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
