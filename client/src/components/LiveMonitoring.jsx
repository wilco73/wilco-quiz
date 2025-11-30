import React, { useEffect, useRef } from 'react';
import { Eye, Check, Clock, SkipForward, Users, Trophy } from 'lucide-react';

const LiveMonitoring = ({ lobbies, quizzes, onNextQuestion }) => {
  const activeLobby = lobbies.find(l => l.status === 'playing');
  const audioRef = useRef(null);

  // ✅ Effet sonore quand tous ont répondu
  useEffect(() => {
    if (activeLobby) {
      const allAnswered = activeLobby.participants?.every(p => p.hasAnswered);
      if (allAnswered && activeLobby.participants?.length > 0) {
        // Jouer un son si disponible
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
      }
    }
  }, [activeLobby?.participants]);

  if (!activeLobby) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-2xl font-bold">Suivi en direct</h3>
        </div>
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <Eye className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-xl text-gray-600">Aucun quiz en cours</p>
          <p className="text-sm text-gray-500 mt-2">Démarrez un quiz depuis le tableau de bord</p>
        </div>
      </div>
    );
  }

  const quiz = quizzes.find(q => q.id === activeLobby.quizId);
  const currentQuestionIndex = activeLobby.session?.currentQuestionIndex || 0;
  const currentQuestion = quiz?.questions[currentQuestionIndex];
  const allAnswered = activeLobby.participants?.every(p => p.hasAnswered);
  const answeredCount = activeLobby.participants?.filter(p => p.hasAnswered).length || 0;
  const totalParticipants = activeLobby.participants?.length || 0;
  const progressPercent = totalParticipants > 0 ? (answeredCount / totalParticipants) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Audio pour notification (optionnel) */}
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZRA0PVq3n77BdGAg+ltrzxnMpBSl+zPLaizsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSJ1xe/glEILEly26+ujVRUJQZzd8sFuJAUuhM/z1YU2Bhxqvu7mnEgODVKq5O+2Yh0FO5LY88p1KwUme8rx3I4+CRZiturqpVITC0mi4PK8aB8FM4nU8tGAMQYfb8Tv45ZFDBFYr+fxsV8aBTqU2vPJdC0FKoHO8t2NOwgZabvt56FQEQtMpeLysGQcBTeQ1/POgTEGI3bG8OCWQQoSXbPq7KpYFAlBoN3zv2wiBTOJz/PWhTYGHWy+7+OaSQ4PVqzm8K9gHAU7kdj0yHUsBSh+zPDckD4IGmq97uit0xQLTqXk87BqIAU1kNf0zX4tBSN0yO/hlUMLElyw6+ypVhQJQZzd88FtIgU0iM/z1YU2BRxsu+7imUkNCVOq5O+wXx4FO5HX9MlzKgUqgcvz3I4+CRlpu+7knFIRC06k4fO0aB4FM4nU89GAMQYgccTv45VFCxJctuvqpVIVCUGc3vO+biMFMojO89aGNQYfbsLu4ppICglSrOPvr18dBTuR2fPJcSsFLIHL8t2OOgcZa7zq46hSEQxNpuLxt2smBTWP1vPQgCwGI3TH7+CVRQoSX7Xp66lUFglBoN3yvmwhBTOJzfPWhTUHHm3A7uKZSAgPU6vj769hHAU6j9jzx3QtBSiByvHejz0HGWm86+WhUhALTKPi8bZnIAU0jdXy0H4qBSF0xPDekkMJEl2y6uqnUxUJQJzd8sFsIQYzhc3z1YU1Bh1sw+7jm0kNDVKr5O+vYRwFOY/Y88lzKwcogMvx3I4+CRhr" />

      {/* En-tête avec statistiques */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-2">{quiz?.title}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                <span>Question {currentQuestionIndex + 1} / {quiz?.questions.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{answeredCount} / {totalParticipants} réponses</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onNextQuestion(activeLobby.id)}
            className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 font-semibold transition-all hover:scale-105"
          >
            <SkipForward className="w-5 h-5" />
            Question suivante
          </button>
        </div>

        {/* Barre de progression */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Progression des réponses</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                allAnswered ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question actuelle */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="bg-purple-50 border-l-4 border-purple-500 p-4 mb-6 rounded">
          <h4 className="font-bold text-lg mb-2">📝 Question actuelle</h4>
          <p className="text-gray-700">{currentQuestion?.text}</p>
          <div className="flex gap-4 mt-3 text-sm">
            <span className="px-3 py-1 bg-purple-200 text-purple-800 rounded-full">
              {currentQuestion?.points || 1} points
            </span>
            {currentQuestion?.timer > 0 && (
              <span className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full">
                ⏱️ {currentQuestion.timer}s
              </span>
            )}
            {currentQuestion?.category && (
              <span className="px-3 py-1 bg-gray-200 text-gray-800 rounded-full">
                {currentQuestion.category}
              </span>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-purple-200">
            <p className="text-xs text-gray-600">Réponse attendue :</p>
            <p className="font-bold text-green-700">{currentQuestion?.answer}</p>
          </div>
        </div>

        {/* Grille des participants */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeLobby.participants?.map((p) => (
            <div 
              key={p.participantId} 
              className={`border-2 rounded-lg p-4 transition-all duration-300 ${
                p.hasAnswered 
                  ? 'border-green-500 bg-green-50 scale-100' 
                  : 'border-orange-300 bg-orange-50 scale-95 animate-pulse'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="font-bold">{p.pseudo}</p>
                  <p className="text-sm text-gray-600">{p.teamName}</p>
                </div>
                {p.hasAnswered ? (
                  <div className="flex items-center gap-1">
                    <Check className="w-6 h-6 text-green-600" />
                    <span className="text-xs text-green-600 font-semibold">✓</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Clock className="w-6 h-6 text-orange-600 animate-spin" />
                    <span className="text-xs text-orange-600 font-semibold">...</span>
                  </div>
                )}
              </div>

              {p.hasAnswered && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-white rounded p-2 border border-green-300">
                    <p className="text-xs text-gray-600 mb-1">Réponse :</p>
                    <p className="font-bold text-green-700 break-words text-sm">
                      {p.currentAnswer || '(vide)'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Alerte tous ont répondu */}
      {allAnswered && totalParticipants > 0 && (
        <div className="bg-gradient-to-r from-green-400 to-green-600 rounded-lg p-6 text-center animate-bounce shadow-xl">
          <div className="flex items-center justify-center gap-3 text-white">
            <Check className="w-8 h-8" />
            <p className="font-bold text-xl">
              Tous les participants ont répondu !
            </p>
            <Check className="w-8 h-8" />
          </div>
          <p className="text-white text-sm mt-2 opacity-90">
            Cliquez sur "Question suivante" pour continuer
          </p>
        </div>
      )}

      {/* Statistiques en temps réel */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h4 className="font-bold text-lg mb-4">📊 Statistiques en direct</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-600">{totalParticipants}</p>
            <p className="text-sm text-gray-600 mt-1">Participants</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{answeredCount}</p>
            <p className="text-sm text-gray-600 mt-1">Ont répondu</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-orange-600">{totalParticipants - answeredCount}</p>
            <p className="text-sm text-gray-600 mt-1">En attente</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitoring;