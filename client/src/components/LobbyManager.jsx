import React, { useState } from 'react';
import { Trash2, Trophy, Users, Calendar, Archive, Eye, EyeOff, RotateCcw } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const LobbyManager = ({ lobbies, quizzes, onDelete }) => {
  const [showArchived, setShowArchived] = useState(false);
  
  const finishedLobbies = lobbies.filter(l => l.status === 'finished');
  const archivedLobbies = finishedLobbies.filter(l => l.archived);
  const activeLobbies = finishedLobbies.filter(l => !l.archived);
  
  const displayedLobbies = showArchived ? finishedLobbies : activeLobbies;

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
    if (window.confirm('Supprimer ce lobby termine ? Cette action est irreversible.')) {
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

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold dark:text-white">Gestion des Lobbies Termines</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition ${
                showArchived 
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' 
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {showArchived ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {showArchived ? 'Tout afficher' : `Caches: ${archivedLobbies.length}`}
            </button>
            <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full text-sm dark:text-gray-300">
              {displayedLobbies.length} lobby(s)
            </span>
          </div>
        </div>

        {displayedLobbies.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {showArchived ? 'Aucun lobby termine' : 'Aucun lobby actif (les archives sont cachees)'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {displayedLobbies.map(lobby => {
              const quiz = quizzes.find(q => q.id === lobby.quizId);
              
              return (
                <div key={lobby.id} className={`border-2 rounded-lg p-4 ${
                  lobby.archived 
                    ? 'border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20' 
                    : 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/20'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold dark:text-white">{quiz?.title}</h3>
                        {lobby.archived && (
                          <span className="px-2 py-0.5 bg-orange-200 dark:bg-orange-900/50 text-orange-700 dark:text-orange-400 text-xs rounded-full">
                            Archive
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{lobby.participants?.length || 0} participants</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(lobby.createdAt)}</span>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-700 rounded p-3 mb-3">
                        <p className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">Participants :</p>
                        <div className="flex flex-wrap gap-2">
                          {lobby.participants?.map((p, idx) => (
                            <span key={idx} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs rounded">
                              {p.pseudo} ({p.teamName})
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Statistiques */}
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-white dark:bg-gray-700 rounded p-2 text-center border border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-600 dark:text-gray-400">Questions</p>
                          <p className="font-bold dark:text-white">{quiz?.questions?.length || 0}</p>
                        </div>
                        <div className="bg-white dark:bg-gray-700 rounded p-2 text-center border border-green-200 dark:border-green-700">
                          <p className="text-xs text-gray-600 dark:text-gray-400">Réponses validées</p>
                          <p className="font-bold text-green-600 dark:text-green-400">
                            {lobby.participants?.reduce((acc, p) => 
                              acc + Object.values(p.validations || {}).filter(v => v === true).length, 0
                            ) || 0}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-gray-700 rounded p-2 text-center border border-red-200 dark:border-red-700">
                          <p className="text-xs text-gray-600 dark:text-gray-400">Réponses refusées</p>
                          <p className="font-bold text-red-600 dark:text-red-400">
                            {lobby.participants?.reduce((acc, p) => 
                              acc + Object.values(p.validations || {}).filter(v => v === false).length, 0
                            ) || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Boutons d'action */}
                    <div className="ml-4 flex flex-col gap-2">
                      <button
                        onClick={() => toggleArchive(lobby.id, lobby.archived)}
                        className={`p-2 rounded-lg flex items-center gap-2 ${
                          lobby.archived 
                            ? 'bg-green-500 text-white hover:bg-green-600' 
                            : 'bg-orange-500 text-white hover:bg-orange-600'
                        }`}
                        title={lobby.archived ? 'Desarchiver' : 'Archiver'}
                      >
                        {lobby.archived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                        {lobby.archived ? 'Restaurer' : 'Archiver'}
                      </button>
                      <button
                        onClick={() => handleDelete(lobby.id)}
                        className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
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