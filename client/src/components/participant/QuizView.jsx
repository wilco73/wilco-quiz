import React, { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';

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
  const quiz = currentLobby ? quizzes.find(q => q.id === currentLobby.quizId) : null;
  const question = quiz?.questions[currentSession?.currentQuestionIndex];
  const isFinished = currentSession?.status === 'finished';

  useEffect(() => {
    if (inputRef.current && !hasAnswered && !isFinished) {
      inputRef.current.focus();
    }
  }, [currentSession?.currentQuestionIndex, hasAnswered, isFinished]);

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

          <div className="mb-6">
            <h4 className="text-2xl font-bold mb-4">{question?.text}</h4>

            {question?.type === 'image' && question?.media && (
              <img src={question.media} alt="Question" className="max-w-full h-auto rounded-lg mb-4" />
            )}
            
            {question?.type === 'video' && question?.media && (
              <video controls className="w-full rounded-lg mb-4">
                <source src={question.media} />
              </video>
            )}
            
            {question?.type === 'audio' && question?.media && (
              <audio controls className="w-full mb-4">
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
              <p className="text-sm text-gray-600">⏳ Attente des autres...</p>
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
                onKeyPress={(e) => e.key === 'Enter' && onSubmitAnswer()}
              />

              <button
                onClick={onSubmitAnswer}
                className="w-full py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
              >
                Valider ma réponse
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizView;