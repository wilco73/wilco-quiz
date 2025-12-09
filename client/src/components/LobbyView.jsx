import React, { useState } from 'react';
import { Play, Users, Trash2, UserPlus } from 'lucide-react';

const LobbyView = ({ lobbies, quizzes, onCreateLobby, onJoinLobby, onStartQuiz, onDeleteLobby }) => {
  const [selectedQuiz, setSelectedQuiz] = useState('');
  const [joinLobbyId, setJoinLobbyId] = useState('');
  const [joinPseudo, setJoinPseudo] = useState('');
  const [joinTeamName, setJoinTeamName] = useState('');
  const [shuffleMode, setShuffleMode] = useState(false);

  const handleCreateLobby = () => {
    if (!selectedQuiz) {
      alert('Veuillez sélectionner un quiz');
      return;
    }
    // ✅ Envoyer le paramètre shuffle au serveur
    onCreateLobby(selectedQuiz, shuffleMode);
    setSelectedQuiz('');
    setShuffleMode(false);
  };

  const handleJoin = () => {
    if (!joinLobbyId || !joinPseudo || !joinTeamName) {
      alert('Tous les champs sont requis');
      return;
    }
    onJoinLobby(joinLobbyId, joinPseudo, joinTeamName);
    setJoinLobbyId('');
    setJoinPseudo('');
    setJoinTeamName('');
  };

  const waitingLobbies = lobbies.filter(l => l.status === 'waiting');

  return (
    <div className="space-y-6">
      {/* Création de salle */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-2xl font-bold mb-4 dark:text-white">Créer une salle</h3>
        <div className="space-y-4">
          <select
            value={selectedQuiz}
            onChange={(e) => setSelectedQuiz(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-purple-500"
          >
            <option value="">Sélectionner un quiz</option>
            {quizzes.map(quiz => (
              <option key={quiz.id} value={quiz.id}>{quiz.title}</option>
            ))}
          </select>

          {/* ✅ Checkbox pour activer le mode aléatoire */}
          <label className="flex items-center gap-3 p-4 bg-purple-50 dark:bg-purple-900/20 border-2 border-purple-200 dark:border-purple-700 rounded-lg cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition">
            <input
              type="checkbox"
              checked={shuffleMode}
              onChange={(e) => setShuffleMode(e.target.checked)}
              className="w-5 h-5 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
            />
            <div className="flex-1">
              <span className="font-semibold text-purple-900 dark:text-purple-300">🔀 Ordre aléatoire des questions</span>
              <p className="text-sm text-purple-700 dark:text-purple-400 mt-1">
                Les questions seront mélangées pour tous les participants (l'ordre sera identique pour tout le monde)
              </p>
            </div>
          </label>

          <button
            onClick={handleCreateLobby}
            className="w-full py-3 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 font-semibold"
          >
            Créer la salle
          </button>
        </div>
      </div>

      {/* Salles en attente */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-2xl font-bold mb-4 dark:text-white">Salles en attente</h3>
        {waitingLobbies.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-center py-8">Aucune salle disponible</p>
        ) : (
          <div className="space-y-3">
            {waitingLobbies.map(lobby => {
              const quiz = quizzes.find(q => q.id === lobby.quizId);
              return (
                <div key={lobby.id} className="border-2 border-gray-200 dark:border-gray-600 rounded-lg p-4 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold dark:text-white">{quiz?.title}</h4>
                    <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mt-1">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {lobby.participants?.length || 0} participant(s)
                      </span>
                      {lobby.shuffled && (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded text-xs">
                          🔀 Aléatoire
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onStartQuiz(lobby.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                    >
                      <Play className="w-4 h-4" />
                      Démarrer
                    </button>
                    <button
                      onClick={() => onDeleteLobby(lobby.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rejoindre une salle (pour les participants) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h3 className="text-2xl font-bold mb-4 dark:text-white flex items-center gap-2">
          <UserPlus className="w-6 h-6" />
          Rejoindre une salle
        </h3>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="ID de la salle"
            value={joinLobbyId}
            onChange={(e) => setJoinLobbyId(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <input
            type="text"
            placeholder="Votre pseudo"
            value={joinPseudo}
            onChange={(e) => setJoinPseudo(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <input
            type="text"
            placeholder="Nom de l'équipe"
            value={joinTeamName}
            onChange={(e) => setJoinTeamName(e.target.value)}
            className="w-full px-4 py-2 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <button
            onClick={handleJoin}
            className="w-full py-3 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 font-semibold"
          >
            Rejoindre
          </button>
        </div>
      </div>
    </div>
  );
};

export default LobbyView;