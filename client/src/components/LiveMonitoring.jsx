import React, { useState, useEffect, useRef } from 'react';
import { Eye, Check, Clock, SkipForward } from 'lucide-react';

const LiveMonitoring = ({ lobbies, quizzes, onNextQuestion }) => {
  const [timeRemaining, setTimeRemaining] = useState(null);
  const hasAutoPassedRef = useRef(false);
  const activeLobby = lobbies.find(l => l.status === 'playing');

  const quiz = activeLobby ? quizzes.find(q => q.id === activeLobby.quizId) : null;
  const currentQuestion = quiz?.questions[activeLobby?.session?.currentQuestionIndex];
  const allAnswered = activeLobby?.participants?.every(p => p.hasAnswered) || false;
  const answeredCount = activeLobby?.participants?.filter(p => p.hasAnswered).length || 0;

  // Reset du flag quand la question change
  useEffect(() => {
    hasAutoPassedRef.current = false;
  }, [activeLobby?.session?.currentQuestionIndex]);

  // Gestion du timer
  useEffect(() => {
    if (!activeLobby || !currentQuestion) {
      setTimeRemaining(null);
      return;
    }

    const timer = currentQuestion.timer || 0;
    
    if (timer <= 0) {
      setTimeRemaining(null);
      return;
    }

    // Calculer le temps restant
    const questionStartTime = activeLobby.session?.questionStartTime || Date.now();
    const updateTimer = () => {
      const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
      const remaining = Math.max(0, timer - elapsed);
      setTimeRemaining(remaining);
      
      // Passer automatiquement si le temps est écoulé
      if (remaining === 0 && !hasAutoPassedRef.current) {
        hasAutoPassedRef.current = true;
        console.log('Timer écoulé - passage automatique');
        setTimeout(() => {
          if (onNextQuestion) {
            onNextQuestion(activeLobby.id);
          }
        }, 1000);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [activeLobby?.id, activeLobby?.session?.currentQuestionIndex, activeLobby?.session?.questionStartTime, currentQuestion?.timer, onNextQuestion]);

  // Passage automatique si tous ont répondu (sans timer ou avec timer)
  useEffect(() => {
    if (!allAnswered || !activeLobby || !onNextQuestion || hasAutoPassedRef.current) {
      return;
    }

    // Si pas de timer, passer immédiatement après 2 secondes
    if (!currentQuestion?.timer || currentQuestion.timer === 0) {
      hasAutoPassedRef.current = true;
      console.log('Tous ont répondu (sans timer) - passage dans 2s');
      const timeout = setTimeout(() => {
        onNextQuestion(activeLobby.id);
      }, 2000);

      return () => clearTimeout(timeout);
    }
  }, [allAnswered, activeLobby?.id, currentQuestion?.timer, onNextQuestion]);

  if (!activeLobby) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-12 text-center">
        <Eye className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p className="text-xl text-gray-600">Aucun quiz en cours</p>
      </div>
    );
  }

  const handleNextQuestion = () => {
    console.log('Bouton Question suivante cliqué');
    if (onNextQuestion) {
      console.log('Appel de onNextQuestion avec lobbyId:', activeLobby.id);
      onNextQuestion(activeLobby.id);
    } else {
      console.error('onNextQuestion is not defined!');
    }
  };

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
            
            {/* Affichage du timer */}
            {timeRemaining !== null && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <Clock className={`w-5 h-5 ${timeRemaining <= 5 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`} />
                  <span className={`font-bold text-lg ${timeRemaining <= 5 ? 'text-red-600' : 'text-blue-600'}`}>
                    {timeRemaining}s restantes
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className={`h-2 rounded-full transition-all ${timeRemaining <= 5 ? 'bg-red-600' : 'bg-blue-600'}`}
                    style={{ width: `${(timeRemaining / (currentQuestion.timer || 1)) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleNextQuestion}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
          >
            <SkipForward className="w-4 h-4" />
            Question suivante
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6">
        <h4 className="font-bold text-lg mb-4">
          Question actuelle : {currentQuestion?.text}
          {currentQuestion?.points && (
            <span className="ml-2 text-purple-600">({currentQuestion.points} pts)</span>
          )}
        </h4>
        
        {/* Afficher le média si présent */}
        {currentQuestion?.type === 'image' && currentQuestion?.media && (
          <div className="mb-4">
            <img src={currentQuestion.media} alt="Question" className="max-w-md rounded-lg" />
          </div>
        )}
        {currentQuestion?.type === 'audio' && currentQuestion?.media && (
          <div className="mb-4">
            <audio controls src={currentQuestion.media} className="w-full max-w-md" />
          </div>
        )}
        {currentQuestion?.type === 'video' && currentQuestion?.media && (
          <div className="mb-4">
            <video controls src={currentQuestion.media} className="w-full max-w-md rounded-lg" />
          </div>
        )}

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

      {allAnswered && timeRemaining > 0 && (
        <div className="bg-green-100 rounded-lg p-4 text-center animate-pulse">
          <p className="font-bold text-green-700 flex items-center justify-center gap-2">
            <Check className="w-5 h-5" />
            Tous ont répondu ! Passage à la question suivante...
          </p>
        </div>
      )}

      {allAnswered && (!currentQuestion?.timer || currentQuestion.timer === 0) && (
        <div className="bg-green-100 rounded-lg p-4 text-center animate-pulse">
          <p className="font-bold text-green-700 flex items-center justify-center gap-2">
            <Check className="w-5 h-5" />
            Tous ont répondu ! Passage automatique dans 2 secondes...
          </p>
        </div>
      )}

      {timeRemaining === 0 && (
        <div className="bg-red-100 rounded-lg p-4 text-center">
          <p className="font-bold text-red-700">
            ⏰ Temps écoulé ! Passage automatique...
          </p>
        </div>
      )}
    </div>
  );
};

export default LiveMonitoring;