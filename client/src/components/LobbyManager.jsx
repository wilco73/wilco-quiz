import React from 'react';
import { Trash2, Trophy, Users, Calendar } from 'lucide-react';

const LobbyManager = ({ lobbies, quizzes, onDelete }) => {
  const finishedLobbies = lobbies.filter(l => l.status === 'finished');

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
    if (window.confirm('Supprimer ce lobby terminé ? Cette action est irréversible.')) {
      onDelete(lobbyId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Gestion des Lobbies Terminés</h2>
          <span className="px-3 py-1 bg-gray-200 rounded-full text-sm">
            {finishedLobbies.length} lobby(s)
          </span>
        </div>

        {finishedLobbies.length === 0 ? (
          <div className="text-center py-12">
            <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Aucun lobby terminé</p>
          </div>
        ) : (
          <div className="space-y-4">
            {finishedLobbies.map(lobby => {
              const quiz = quizzes.find(q => q.id === lobby.quizId);
              
              return (
                <div key={lobby.id} className="border-2 border-green-200 bg-green-50 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{quiz?.title}</h3>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          <span>{lobby.participants?.length || 0} participants</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          <span>{formatDate(lobby.createdAt)}</span>
                        </div>
                      </div>

                      {/* Liste des participants */}
                      <div className="bg-white rounded p-3 mb-3">
                        <p className="text-xs font-semibold text-gray-600 mb-2">Participants :</p>
                        <div className="flex flex-wrap gap-2">
                          {lobby.participants?.map((p, idx) => (
                            <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                              {p.pseudo} ({p.teamName})
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Statistiques */}
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div className="bg-white rounded p-2 text-center">
                          <p className="text-xs text-gray-600">Questions</p>
                          <p className="font-bold">{quiz?.questions?.length || 0}</p>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <p className="text-xs text-gray-600">Réponses validées</p>
                          <p className="font-bold text-green-600">
                            {lobby.participants?.reduce((acc, p) => 
                              acc + Object.values(p.validations || {}).filter(v => v === true).length, 0
                            ) || 0}
                          </p>
                        </div>
                        <div className="bg-white rounded p-2 text-center">
                          <p className="text-xs text-gray-600">Réponses refusées</p>
                          <p className="font-bold text-red-600">
                            {lobby.participants?.reduce((acc, p) => 
                              acc + Object.values(p.validations || {}).filter(v => v === false).length, 0
                            ) || 0}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Bouton supprimer */}
                    <button
                      onClick={() => handleDelete(lobby.id)}
                      className="ml-4 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Supprimer
                    </button>
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