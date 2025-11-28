import React from 'react';
import { Eye, Check, Clock, SkipForward } from 'lucide-react';

const LiveMonitoring = ({ lobbies, quizzes, onNextQuestion }) => {
  const activeLobby = lobbies.find(l => l.status === 'playing');

  if (!activeLobby) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-12 text-center">
        <Eye className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p className="text-xl text-gray-600">Aucun quiz en cours</p>
      </div>
    );
  }

  const quiz = quizzes.find(q => q.id === activeLobby.quizId);
  const currentQuestion = quiz?.questions[activeLobby.session?.currentQuestionIndex];
  const allAnswered = activeLobby.participants?.every(p => p.hasAnswered);
  const answeredCount = activeLobby.participants?.filter(p => p.hasAnswered).length || 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold">{quiz?.title}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Question {(activeLobby.session?.currentQuestionIndex || 0) + 1} / {quiz?.questions.length}
            </p>
            <p className="text-sm text-gray-600">
              {answeredCount} / {activeLobby.participants?.length} ont répondu
            </p>
          </div>
          <button
            onClick={() => onNextQuestion(activeLobby.id)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
          >
            <SkipForward className="w-4 h-4" />
            Question suivante
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h4 className="font-bold text-lg mb-4">Question actuelle : {currentQuestion?.text}</h4>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeLobby.participants?.map((p) => (
            <div 
              key={p.participantId} 
              className={`border-2 rounded-lg p-4 ${
                p.hasAnswered ? 'border-green-500 bg-green-50' : 'border-orange-300 bg-orange-50'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="font-bold">{p.pseudo}</p>
                  <p className="text-sm text-gray-600">{p.teamName}</p>
                </div>
                {p.hasAnswered ? (
                  <Check className="w-6 h-6 text-green-600" />
                ) : (
                  <Clock className="w-6 h-6 text-orange-600 animate-pulse" />
                )}
              </div>

              {p.hasAnswered && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="bg-white rounded p-2 border border-green-300">
                    <p className="text-xs text-gray-600">Réponse :</p>
                    <p className="font-bold text-green-700 break-words">{p.currentAnswer || '(vide)'}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {allAnswered && (
        <div className="bg-green-100 rounded-lg p-4 text-center animate-pulse">
          <p className="font-bold text-green-700 flex items-center justify-center gap-2">
            <Check className="w-5 h-5" />
            Tous ont répondu ! Cliquez sur "Question suivante"
          </p>
        </div>
      )}
    </div>
  );
};

export default LiveMonitoring;