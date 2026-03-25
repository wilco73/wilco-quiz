import React, { useState } from 'react';
import { Trash2, Trophy, Users, Calendar, Archive, Eye, EyeOff, RotateCcw, Play, Clock, StopCircle, Shuffle, BookOpen } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const LobbyManager = ({ lobbies = [], quizzes = [], onDelete, onStartQuiz, onStopQuiz }) => {
  const [showArchived, setShowArchived] = useState(false);
  const [activeSection, setActiveSection] = useState('active'); // 'active', 'finished', 'all'
  
  // Catégoriser les lobbies
  const waitingLobbies = lobbies.filter(l => l.status === 'waiting');
  const playingLobbies = lobbies.filter(l => l.status === 'playing');
  const finishedLobbies = lobbies.filter(l => l.status === 'finished');
  const archivedLobbies = finishedLobbies.filter(l => l.archived);
  const activeFinishedLobbies = finishedLobbies.filter(l => !l.archived);

  // Lobbies à afficher selon la section
  let displayedLobbies = [];
  if (activeSection === 'active') {
    displayedLobbies = [...waitingLobbies, ...playingLobbies];
  } else if (activeSection === 'finished') {
    displayedLobbies = showArchived ? finishedLobbies : activeFinishedLobbies;
  } else {
    displayedLobbies = showArchived ? lobbies : lobbies.filter(l => !l.archived);
  }

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = (lobbyId) => {
    if (window.confirm('Supprimer ce lobby ? Cette action est irréversible.')) {
      onDelete(lobbyId);
    }
  };

  const toggleArchive = async (lobbyId, currentlyArchived) => {
    try {
      await fetch(`${API_URL}/lobbies/${lobbyId}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: !currentlyArchived })
      });
    } catch (error) {
      console.error('Erreur archivage:', error);
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'waiting':
        return <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full flex items-center gap-1"><Clock className="w-3 h-3" /> En attente</span>;
      case 'playing':
        return <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full flex items-center gap-1 animate-pulse"><Play className="w-3 h-3" /> En cours</span>;
      case 'finished':
        return <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full flex items-center gap-1"><Trophy className="w-3 h-3" /> Terminé</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold dark:text-white">Gestion des Lobbies</h2>
          
          {/* Compteurs rapides */}
          <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
            <span className="px-2 sm:px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
              {waitingLobbies.length} en attente
            </span>
            <span className="px-2 sm:px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
              {playingLobbies.length} en cours
            </span>
            <span className="px-2 sm:px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
              {finishedLobbies.length} terminés
            </span>
          </div>
        </div>

        {/* Onglets de section */}
        <div className="flex flex-wrap gap-2 mb-4 border-b dark:border-gray-700 pb-3">
          <button
            onClick={() => setActiveSection('active')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition ${
              activeSection === 'active' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            🎮 Actifs ({waitingLobbies.length + playingLobbies.length})
          </button>
          <button
            onClick={() => setActiveSection('finished')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition ${
              activeSection === 'finished' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            ✅ Terminés ({finishedLobbies.length})
          </button>
          <button
            onClick={() => setActiveSection('all')}
            className={`px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-medium transition ${
              activeSection === 'all' 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
          >
            📋 Tous ({lobbies.length})
          </button>
          
          {/* Toggle archives (seulement pour finished et all) */}
          {(activeSection === 'finished' || activeSection === 'all') && (
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`ml-auto px-3 py-2 rounded-lg flex items-center gap-1 sm:gap-2 text-xs sm:text-sm transition ${
                showArchived 
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {showArchived ? <Eye className="w-3 h-3 sm:w-4 sm:h-4" /> : <EyeOff className="w-3 h-3 sm:w-4 sm:h-4" />}
              {showArchived ? 'Archives visibles' : `${archivedLobbies.length} archivés`}
            </button>
          )}
        </div>

        {/* Liste des lobbies */}
        {displayedLobbies.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <Trophy className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
              {activeSection === 'active' && 'Aucun lobby actif'}
              {activeSection === 'finished' && (showArchived ? 'Aucun lobby terminé' : 'Aucun lobby terminé (les archives sont cachées)')}
              {activeSection === 'all' && 'Aucun lobby'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 sm:space-y-4">
            {displayedLobbies.map(lobby => {
              const quiz = quizzes.find(q => q.id === lobby.quizId);
              const isWaiting = lobby.status === 'waiting';
              const isPlaying = lobby.status === 'playing';
              const isFinished = lobby.status === 'finished';
              
              return (
                <div key={lobby.id} className={`border-2 rounded-lg p-3 sm:p-4 ${
                  lobby.archived 
                    ? 'border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20' 
                    : isWaiting
                      ? 'border-yellow-200 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/20'
                      : isPlaying
                        ? 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                }`}>
                  <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Header du lobby */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h3 className="text-base sm:text-xl font-bold dark:text-white truncate">{quiz?.title || 'Quiz inconnu'}</h3>
                        {getStatusBadge(lobby.status)}
                        {lobby.archived && (
                          <span className="px-2 py-0.5 bg-orange-200 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 text-xs rounded-full">
                            Archivé
                          </span>
                        )}
                        {lobby.shuffled && (
                          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs rounded-full flex items-center gap-1">
                            <Shuffle className="w-3 h-3" /> Aléatoire
                          </span>
                        )}
                        {lobby.trainingMode && (
                          <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded-full">
                            Entraînement
                          </span>
                        )}
                      </div>
                      
                      {/* Infos */}
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3">
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>{lobby.participants?.length || 0} participants</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>{quiz?.questions?.length || 0} questions</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span>{formatDate(lobby.createdAt)}</span>
                        </div>
                        {isPlaying && lobby.session && (
                          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                            <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span>Q{(lobby.session.currentQuestionIndex || 0) + 1}/{quiz?.questions?.length || 0}</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Participants (collapsible sur mobile) */}
                      {lobby.participants?.length > 0 && (
                        <div className="bg-white dark:bg-gray-700 rounded p-2 sm:p-3">
                          <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1 sm:mb-2">Participants :</p>
                          <div className="flex flex-wrap gap-1 sm:gap-2">
                            {lobby.participants.slice(0, 10).map((p, idx) => (
                              <span key={idx} className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs rounded">
                                {p.pseudo}{p.teamName ? ` (${p.teamName})` : ''}
                              </span>
                            ))}
                            {lobby.participants.length > 10 && (
                              <span className="px-2 py-1 text-gray-500 text-xs">+{lobby.participants.length - 10} autres</span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Stats pour lobbies terminés */}
                      {isFinished && (
                        <div className="grid grid-cols-3 gap-2 text-xs sm:text-sm mt-2 sm:mt-3">
                          <div className="bg-white dark:bg-gray-700 rounded p-2 text-center border border-gray-200 dark:border-gray-600">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Questions</p>
                            <p className="font-bold dark:text-white">{quiz?.questions?.length || 0}</p>
                          </div>
                          <div className="bg-white dark:bg-gray-700 rounded p-2 text-center border border-green-200 dark:border-green-700">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Validées</p>
                            <p className="font-bold text-green-600 dark:text-green-400">
                              {lobby.participants?.reduce((acc, p) => 
                                acc + Object.values(p.validationsByQuestionId || {}).filter(v => v === true).length, 0
                              ) || 0}
                            </p>
                          </div>
                          <div className="bg-white dark:bg-gray-700 rounded p-2 text-center border border-red-200 dark:border-red-700">
                            <p className="text-xs text-gray-600 dark:text-gray-400">Refusées</p>
                            <p className="font-bold text-red-600 dark:text-red-400">
                              {lobby.participants?.reduce((acc, p) => 
                                acc + Object.values(p.validationsByQuestionId || {}).filter(v => v === false).length, 0
                              ) || 0}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Boutons d'action */}
                    <div className="flex flex-wrap lg:flex-col gap-2 lg:ml-4">
                      {/* Actions selon le status */}
                      {isWaiting && onStartQuiz && (
                        <button
                          onClick={() => onStartQuiz(lobby.id)}
                          className="flex-1 lg:flex-none px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-[0.98]"
                        >
                          <Play className="w-4 h-4" />
                          Démarrer
                        </button>
                      )}
                      
                      {isPlaying && onStopQuiz && (
                        <button
                          onClick={() => onStopQuiz(lobby.id)}
                          className="flex-1 lg:flex-none px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-[0.98]"
                        >
                          <StopCircle className="w-4 h-4" />
                          Arrêter
                        </button>
                      )}
                      
                      {isFinished && (
                        <button
                          onClick={() => toggleArchive(lobby.id, lobby.archived)}
                          className={`flex-1 lg:flex-none px-3 py-2 rounded-lg flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-[0.98] ${
                            lobby.archived 
                              ? 'bg-green-500 text-white hover:bg-green-600' 
                              : 'bg-orange-500 text-white hover:bg-orange-600'
                          }`}
                        >
                          {lobby.archived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                          {lobby.archived ? 'Restaurer' : 'Archiver'}
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDelete(lobby.id)}
                        className="flex-1 lg:flex-none px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center justify-center gap-2 text-xs sm:text-sm active:scale-[0.98]"
                      >
                        <Trash2 className="w-4 h-4" />
                        Supprimer
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LobbyManager;
