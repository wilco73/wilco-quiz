import React, { useEffect, useRef, useState } from 'react';
import { Check, Clock } from 'lucide-react';

const QuizView = ({ 
  currentLobby, 
  currentSession, 
  quizzes, 
  myAnswer, 
  setMyAnswer, 
  hasAnswered, 
  onSubmitAnswer, 
  onLeaveLobby 
}) => {
  const inputRef = useRef(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  
  const quiz = currentLobby ? quizzes.find(q => q.id === currentLobby.quizId) : null;
  const question = quiz?.questions[currentSession?.currentQuestionIndex];
  const isFinished = currentSession?.status === 'finished';

  // Focus automatique sur l'input
  useEffect(() => {
    if (inputRef.current && !hasAnswered && !isFinished) {
      inputRef.current.focus();
    }
  }, [currentSession?.currentQuestionIndex, hasAnswered, isFinished]);

  // Gestion du timer
  useEffect(() => {
    if (!question || hasAnswered || isFinished) {
      setTimeRemaining(null);
      return;
    }

    const timer = question.timer || 0;
    
    if (timer <= 0) {
      setTimeRemaining(null);
      return;
    }

    // Calculer le temps restant basé sur le début de la question
    const questionStartTime = currentSession?.questionStartTime || Date.now();
    const elapsed = Math.floor((Date.now() - questionStartTime) / 1000);
    const remaining = Math.max(0, timer - elapsed);
    
    setTimeRemaining(remaining);

    // Mettre à jour chaque seconde
    const interval = setInterval(() => {
      const newElapsed = Math.floor((Date.now() - questionStartTime) / 1000);
      const newRemaining = Math.max(0, timer - newElapsed);
      setTimeRemaining(newRemaining);

      // Soumettre automatiquement la réponse si le temps est écoulé
      if (newRemaining === 0 && !hasAnswered) {
        clearInterval(interval);
        onSubmitAnswer();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [question?.id, currentSession?.currentQuestionIndex, hasAnswered, isFinished]);

  if (!currentSession || !currentLobby) return null;

  if (isFinished) {
    return (
      <div className="min-h-screen bg-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold text-center mb-6">Quiz terminé !</h2>
            <p className="text-center text-lg mb-6">
              En attente de la validation par l'admin...
            </p>
            <div className="text-center">
              <button
                onClick={onLeaveLobby}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Quitter
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{quiz?.title}</h3>
              <span className="text-gray-600">
                Question {currentSession.currentQuestionIndex + 1}/{quiz?.questions.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-600 h-2 rounded-full transition-all"
                style={{ width: `${((currentSession.currentQuestionIndex + 1) / quiz?.questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Timer pour le participant */}
          {timeRemaining !== null && !hasAnswered && (
            <div className="mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className={`w-6 h-6 ${timeRemaining <= 5 ? 'text-red-600 animate-pulse' : 'text-blue-600'}`} />
                <span className={`font-bold text-2xl ${timeRemaining <= 5 ? 'text-red-600' : 'text-blue-600'}`}>
                  {timeRemaining}s
                </span>
              </div>
              {/* Barre de progression */}
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${timeRemaining <= 5 ? 'bg-red-600' : 'bg-blue-600'}`}
                  style={{ width: `${(timeRemaining / (question.timer || 1)) * 100}%` }}
                />
              </div>
              {timeRemaining <= 5 && (
                <p className="text-center text-red-600 font-bold mt-2 animate-pulse">
                  ⏰ Dépêchez-vous !
                </p>
              )}
            </div>
          )}

          <div className="mb-6">
            <h4 className="text-2xl font-bold mb-4">
              {question?.text}
              {question?.points && (
                <span className="ml-2 text-purple-600 text-lg">({question.points} pts)</span>
              )}
            </h4>

            {question?.type === 'image' && question?.media && (
              <div className="flex content-center item-center text-center mb-8">
                <div className="text-center m-auto">
                  <img src={question.media} alt="Question" className="max-w-md h-auto rounded-lg mb-4" />
                </div>
              </div>
            )}
            
            {question?.type === 'video' && question?.media && (
              <video controls autoplay className="w-full rounded-lg mb-4">
                <source src={question.media} />
              </video>
            )}
            
            {question?.type === 'audio' && question?.media && (
              <audio controls autoplay className="w-full mb-4">
                <source src={question.media} />
              </audio>
            )}
          </div>

          {hasAnswered ? (
            <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 text-center">
              <Check className="w-12 h-12 mx-auto text-green-600 mb-2" />
              <p className="font-bold text-green-700 mb-2">Réponse enregistrée !</p>
              <div className="bg-white rounded p-3 border border-green-300 mb-3">
                <p className="text-xs text-gray-600">Votre réponse :</p>
                <p className="font-bold text-green-700">{myAnswer || '(vide)'}</p>
              </div>
              <p className="text-sm text-gray-600">⏳ Attente des autres participants...</p>
            </div>
          ) : (
            <>
              <input
                ref={inputRef}
                type="text"
                value={myAnswer}
                onChange={(e) => setMyAnswer(e.target.value)}
                placeholder="Votre réponse..."
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none mb-4"
                onKeyPress={(e) => e.key === 'Enter' && !hasAnswered && onSubmitAnswer()}
                disabled={timeRemaining === 0}
              />

              <button
                onClick={onSubmitAnswer}
                disabled={timeRemaining === 0}
                className={`w-full py-3 rounded-lg font-semibold ${
                  timeRemaining === 0 
                    ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                {timeRemaining === 0 ? '⏰ Temps écoulé' : 'Valider ma réponse'}
              </button>

              {timeRemaining === 0 && (
                <p className="text-center text-red-600 mt-2 font-bold">
                  Temps écoulé ! En attente de la question suivante...
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizView;