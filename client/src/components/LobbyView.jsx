import React from 'react';
import { Users, Clock } from 'lucide-react';

const LobbyView = ({ currentLobby, quizzes, onLeaveLobby }) => {
  const quiz = quizzes.find(q => q.id === currentLobby?.quizId);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2 dark:text-white">{quiz?.title}</h2>
            <p className="text-gray-600 dark:text-gray-400">{quiz?.description}</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">{quiz?.questions?.length} questions</p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-6 mb-6 border-2 border-purple-200 dark:border-purple-700">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-white">
              <Users className="w-6 h-6" />
              Participants ({currentLobby?.participants?.length || 0})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {currentLobby?.participants?.map((p, index) => (
                <div key={index} className="bg-white dark:bg-gray-700 rounded-lg p-3 border-2 border-purple-200 dark:border-purple-600">
                  <p className="font-bold text-sm dark:text-white">{p.pseudo}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{p.teamName}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-6 text-center border-2 border-blue-200 dark:border-blue-700">
            <Clock className="w-12 h-12 mx-auto text-blue-600 dark:text-blue-400 mb-3 animate-pulse" />
            <p className="text-lg font-bold text-blue-900 dark:text-blue-300">En attente du démarrage...</p>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-2">L'administrateur va lancer le quiz</p>
          </div>

          <button
            onClick={onLeaveLobby}
            className="w-full mt-6 py-3 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-400 dark:hover:bg-gray-600"
          >
            Quitter la salle
          </button>
        </div>
      </div>
    </div>
  );
};

export default LobbyView;