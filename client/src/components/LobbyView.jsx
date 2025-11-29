import React from 'react';
import { Users, Clock } from 'lucide-react';

const LobbyView = ({ currentLobby, quizzes, onLeaveLobby }) => {
  const quiz = quizzes.find(q => q.id === currentLobby?.quizId);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">{quiz?.title}</h2>
            <p className="text-gray-600">{quiz?.description}</p>
            <p className="text-sm text-gray-500 mt-2">{quiz?.questions?.length} questions</p>
          </div>

          <div className="bg-purple-50 rounded-lg p-6 mb-6">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Users className="w-6 h-6" />
              Participants ({currentLobby?.participants?.length || 0})
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {currentLobby?.participants?.map((p, index) => (
                <div key={index} className="bg-white rounded-lg p-3 border-2 border-purple-200">
                  <p className="font-bold text-sm">{p.pseudo}</p>
                  <p className="text-xs text-gray-600">{p.teamName}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 rounded-lg p-6 text-center">
            <Clock className="w-12 h-12 mx-auto text-blue-600 mb-3 animate-pulse" />
            <p className="text-lg font-bold text-blue-900">En attente du démarrage...</p>
            <p className="text-sm text-blue-700 mt-2">L'administrateur va lancer le quiz</p>
          </div>

          <button
            onClick={onLeaveLobby}
            className="w-full mt-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400"
          >
            Quitter la salle
          </button>
        </div>
      </div>
    </div>
  );
};

export default LobbyView;