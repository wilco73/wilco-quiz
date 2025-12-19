import React from 'react';
import { Users, LogOut, Shuffle } from 'lucide-react';
import Avatar from './Avatar';

const LobbyView = ({ currentLobby, quizzes, participants, onLeaveLobby }) => {
  if (!currentLobby) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-600 dark:text-gray-400">Chargement...</p>
      </div>
    );
  }

  const quiz = quizzes.find(q => q.id === currentLobby.quizId);
  
  // Récupérer les avatars des participants
  const getParticipantAvatar = (participantId) => {
    const p = participants?.find(p => p.id === participantId);
    return p?.avatar || 'default';
  };
  
  // ✅ FIX: Protection contre shuffledQuestions undefined
  const questions = currentLobby.shuffled && currentLobby.shuffledQuestions 
    ? currentLobby.shuffledQuestions 
    : quiz?.questions || [];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h2 className="text-3xl font-bold mb-2 dark:text-white">{quiz?.title}</h2>
              <div className="flex items-center gap-3">
                <p className="text-gray-600 dark:text-gray-400">
                  {questions.length} question(s)
                </p>
                {currentLobby.shuffled && (
                  <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full text-sm flex items-center gap-1">
                    <Shuffle className="w-4 h-4" />
                    Ordre aléatoire
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onLeaveLobby}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Quitter
            </button>
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              <h3 className="text-xl font-bold dark:text-white">
                Participants ({currentLobby.participants?.length || 0})
              </h3>
            </div>

            {currentLobby.participants && currentLobby.participants.length > 0 ? (
              <div className="space-y-2">
                {currentLobby.participants.map((participant, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <Avatar avatarId={getParticipantAvatar(participant.participantId)} size="md" />
                    <div>
                      <p className="font-semibold dark:text-white">{participant.pseudo}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {participant.teamName || 'Sans équipe'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                En attente de participants...
              </p>
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <p className="text-center text-blue-700 dark:text-blue-300 font-medium">
              ⏳ En attente du démarrage du quiz par l'administrateur...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyView;