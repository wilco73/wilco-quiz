import React from 'react';
import { Users, LogOut, Shuffle } from 'lucide-react';
import Avatar from './Avatar';

const LobbyView = ({ currentLobby, quizzes, participants, onLeaveLobby }) => {
  if (!currentLobby) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-2">
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-2 sm:p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
          {/* Header avec titre et bouton quitter */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 dark:text-white truncate">
                {quiz?.title}
              </h2>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                  {questions.length} question(s)
                </p>
                {currentLobby.shuffled && (
                  <span className="px-2 sm:px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full text-xs sm:text-sm flex items-center gap-1">
                    <Shuffle className="w-3 h-3 sm:w-4 sm:h-4" />
                    Ordre aléatoire
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onLeaveLobby}
              className="w-full sm:w-auto px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 active:scale-[0.98] flex items-center justify-center gap-2 text-sm sm:text-base font-medium"
            >
              <LogOut className="w-4 h-4" />
              Quitter
            </button>
          </div>

          {/* Liste des participants */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 sm:pt-6">
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 dark:text-purple-400" />
              <h3 className="text-lg sm:text-xl font-bold dark:text-white">
                Participants ({currentLobby.participants?.length || 0})
              </h3>
            </div>

            {currentLobby.participants && currentLobby.participants.length > 0 ? (
              <div className="space-y-2">
                {currentLobby.participants.map((participant, index) => (
                  <div 
                    key={index} 
                    className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gray-50 dark:bg-gray-700 rounded-lg"
                  >
                    <Avatar avatarId={getParticipantAvatar(participant.participantId)} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="text-left font-semibold dark:text-white text-sm sm:text-base truncate">
                        {participant.pseudo}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                        {participant.teamName || 'Sans équipe'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400 py-6 sm:py-8 text-sm sm:text-base">
                En attente de participants...
              </p>
            )}
          </div>

          {/* Message d'attente */}
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
            <p className="text-center text-blue-700 dark:text-blue-300 font-medium text-sm sm:text-base">
              ⏳ En attente du démarrage du quiz par l'administrateur...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LobbyView;