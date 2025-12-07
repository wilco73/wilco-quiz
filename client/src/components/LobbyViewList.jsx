import React from 'react';
import { LogOut, UserPlus, Trophy } from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';

const LobbyViewList = ({ currentUser, lobbies, quizzes, teams, onJoinLobby, onViewScoreboard, onLogout }) => {
  const availableLobbies = lobbies.filter(l => l.status === 'waiting');
  const userTeam = teams.find(t => t.name === currentUser.teamName);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold dark:text-white">{currentUser.pseudo}</h2>
              <p className="text-gray-600 dark:text-gray-400">Équipe: {currentUser.teamName}</p>
              {userTeam && (
                <p className="text-purple-600 dark:text-purple-400 font-semibold mt-1">
                  Score actuel: {userTeam.validatedScore || 0} points
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <DarkModeToggle />
              <button
                onClick={onViewScoreboard}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600"
              >
                <Trophy className="w-4 h-4" />
                Classement
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

        <h3 className="text-xl font-bold mb-4 dark:text-white">Salles disponibles</h3>
        <div className="grid gap-4">
          {availableLobbies.map(lobby => {
            const quiz = quizzes.find(q => q.id === lobby.quizId);
            return (
              <div key={lobby.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition">
                <h4 className="text-xl font-bold mb-2 dark:text-white">{quiz?.title}</h4>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{quiz?.description}</p>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p>{lobby.participants?.length || 0} participants</p>
                    <p>{quiz?.questions?.length || 0} questions</p>
                  </div>
                  <button
                    onClick={() => onJoinLobby(lobby.id)}
                    className="px-6 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Rejoindre
                  </button>
                </div>
              </div>
            );
          })}
          {availableLobbies.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-12">Aucune salle disponible</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LobbyViewList;