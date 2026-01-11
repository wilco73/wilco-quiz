import React, { useEffect, useRef, useState } from 'react';
import { Check, Clock } from 'lucide-react';

const QuizView = ({
  lobby,
  quiz,
  myAnswer,
  hasAnswered,
  timerRemaining,
  currentUser,
  onAnswerChange,
  onSubmitAnswer,
  onLeaveLobby,
  onPaste
}) => {
  const inputRef = useRef(null);
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  // Utiliser les props renommees avec protection null
  const currentLobby = lobby;
  const currentSession = lobby?.session || null;
  const questions = currentLobby?.shuffled && currentLobby?.shuffledQuestions 
    ? currentLobby.shuffledQuestions 
    : quiz?.questions || [];
  const questionIndex = currentSession?.currentQuestionIndex ?? 0;
  const question = questions[questionIndex];
  const isFinished = currentSession?.status === 'finished' || currentLobby?.status === 'finished';
  
  // Timer depuis le serveur
  const timeRemaining = timerRemaining;

  // Handler pour changement de reponse texte
  const handleAnswerChange = (e) => {
    onAnswerChange(e.target.value);
  };

  // Handler pour QCM
  const handleQCMChoice = (choice) => {
    onAnswerChange(choice);
  };
  
  // Handler pour détecter le copier-coller
  const handlePaste = (e) => {
    const pastedText = e.clipboardData?.getData('text') || '';
    if (pastedText && onPaste && question) {
      console.log('[PASTE DETECTED]', pastedText.substring(0, 50));
      onPaste(question.id, pastedText);
    }
  };

  // Volume à 30%
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = 0.3;
    }
    if (audioRef.current) {
      audioRef.current.volume = 0.3;
    }
  }, [question?.id, questionIndex]);

  // Focus automatique sur l'input
  useEffect(() => {
    if (inputRef.current && !hasAnswered && !isFinished && question?.type !== 'qcm') {
      inputRef.current.focus();
    }
  }, [questionIndex, hasAnswered, isFinished, question?.type]);

  // Afficher un loader si pas encore de donnees
  if (!currentLobby || !quiz) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement du quiz...</p>
        </div>
      </div>
    );
  }

  // Si pas de question, afficher un message
  if (!question) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">En attente de la question...</p>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold text-center mb-6 dark:text-white">Quiz terminé !</h2>
            <p className="text-center text-lg mb-6 dark:text-gray-300">
              Consultez vos réponses et le classement en attendant la validation...
            </p>
            <div className="text-center">
              <button
                onClick={onLeaveLobby}
                className="px-6 py-3 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600"
              >
                Voir les Résultats
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isTimeExpired = timeRemaining === 0 && question?.timer > 0;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold dark:text-white">{quiz?.title}</h3>
              <span className="text-gray-600 dark:text-gray-400">
                Question {questionIndex + 1}/{questions.length}
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-purple-600 dark:bg-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${((questionIndex + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Timer */}
          {timeRemaining !== null && !hasAnswered && (
            <div className="mb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className={`w-6 h-6 ${timeRemaining <= 5 ? 'text-red-600 animate-pulse' : 'text-blue-600 dark:text-blue-400'}`} />
                <span className={`font-bold text-2xl ${timeRemaining <= 5 ? 'text-red-600' : 'text-blue-600 dark:text-blue-400'}`}>
                  {timeRemaining}s
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${timeRemaining <= 5 ? 'bg-red-600' : 'bg-blue-600 dark:bg-blue-500'}`}
                  style={{ width: `${(timeRemaining / (question.timer || 1)) * 100}%` }}
                />
              </div>
              {timeRemaining <= 5 && timeRemaining > 0 && (
                <p className="text-center text-red-600 font-bold mt-2 animate-pulse">
                  ⏰ Dépêchez-vous !
                </p>
              )}
            </div>
          )}

          {/* ✅ TEXTE DE LA QUESTION */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-4">
              {question?.text}
            </h2>
            {question?.category && (
              <div className="text-center">
                <span className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full text-sm">
                  {question.category}
                </span>
              </div>
            )}
          </div>

          {/* ✅ MODIFIÉ: Afficher média pour QCM aussi */}
          {question?.media && (
            <>
            {(question?.type === 'image' || (question?.type === 'qcm' && question?.mediaType === 'image')) && (
              <div className="flex content-center item-center text-center mb-8">
                <div className="text-center m-auto">
                  <img src={question.media} alt="Question" className="max-w-md h-auto rounded-lg mb-4" />
                </div>
              </div>
            )}
              
          {(question?.type === 'video' || (question?.type === 'qcm' && question?.mediaType === 'video')) && (
            <video
              ref={videoRef}
              key={`video-${currentSession?.currentQuestionIndex}-${question.id}`}
              controls
              autoPlay
              className="w-full rounded-lg mb-4"
            >
              <source src={question.media} />
            </video>
          )}

          {(question?.type === 'audio' || (question?.type === 'qcm' && question?.mediaType === 'audio')) && (
            <audio
              ref={audioRef}
              key={`audio-${currentSession?.currentQuestionIndex}-${question.id}`}
              controls
              autoPlay
              className="w-full mb-4"
            >
              <source src={question.media} />
            </audio>
          )}
            </>
        )}

          {hasAnswered ? (
          isTimeExpired ? (
            // Timer expiré - Affichage orange/rouge
            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600 rounded-lg p-6 text-center">
              <Clock className="w-12 h-12 mx-auto text-green-600 dark:text-green-400 mb-2" />
              <p className="font-bold text-green-700 dark:text-green-400 mb-2">✅ Réponse enregistrée mais le temps est écoulé ! ⏰</p>
              {myAnswer && myAnswer.trim() ? (
                <div className="bg-white dark:bg-gray-800 rounded p-3 border border-green-300 dark:border-green-600 mb-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Votre réponse a été enregistrée :</p>
                  <p className="break-all font-bold text-green-700 dark:text-green-400">{myAnswer}</p>
                </div>
              ) : (
                  <div className="bg-red-100 dark:bg-red-900/30 rounded p-3 border border-red-300 dark:border-red-600 mb-3">
                    <p className="text-sm text-red-700 dark:text-red-400">❌ Aucune réponse enregistrée</p>
                  </div>
                )}
              <p className="text-sm text-gray-600 dark:text-gray-400">⏳ Attente des autres participants...</p>
            </div>
          ) : (
              // Réponse validée normalement - Affichage vert
              <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600 rounded-lg p-6 text-center">
                <Check className="w-12 h-12 mx-auto text-green-600 dark:text-green-400 mb-2" />
                <p className="font-bold text-green-700 dark:text-green-400 mb-2">✅ Réponse enregistrée !</p>
                <div className="bg-white dark:bg-gray-800 rounded p-3 border border-green-300 dark:border-green-600 mb-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Votre réponse :</p>
                  <p className="break-all font-bold text-green-700 dark:text-green-400">{myAnswer || '(vide)'}</p>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">⏳ Attente des autres participants...</p>
              </div>
            )
        ) : isTimeExpired ? (
          // isTimeExpired mais pas hasAnswered - Ne devrait jamais arriver normalement
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 rounded-lg p-6 text-center">
            <Clock className="w-12 h-12 mx-auto text-red-600 dark:text-red-400 mb-2" />
            <p className="font-bold text-red-700 dark:text-red-400 mb-2">⏰ Temps écoulé !</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">En attente de la question suivante...</p>
          </div>
        ) : question?.type === 'qcm' ? (
          // ✅ CORRECTION: Interface QCM sans auto-submit
          <div className="space-y-3">
            {question.choices ?.map((choice, index) => (
              <button
                key={index}
                onClick={() => handleQCMChoice(choice)}
                disabled={isTimeExpired}
                className={`w-full p-4 rounded-lg border-2 text-left font-semibold transition-all ${
                  isTimeExpired
                    ? 'opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700'
                    : myAnswer === choice
                      ? 'border-purple-600 dark:border-purple-500 bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 scale-105 shadow-lg'
                      : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10'
                  }`}
              >
                <span className="text-purple-600 dark:text-purple-400 mr-2 font-bold">
                  {String.fromCharCode(65 + index)}.
                  </span>
                {choice}
                {myAnswer === choice && (
                  <span className="ml-2 text-purple-600 dark:text-purple-400">✓</span>
                )}
              </button>
            ))}
              
            {/* ✅ NOUVEAU: Bouton de validation pour QCM */}
            {myAnswer && (
              <div className="pt-4">
                <button
                  onClick={onSubmitAnswer}
                  disabled={isTimeExpired}
                  className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${
                    isTimeExpired
                      ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed'
                      : 'bg-purple-600 dark:bg-purple-700 text-white hover:bg-purple-700 dark:hover:bg-purple-600 shadow-lg'
                    }`}
                >
                  <Check className="w-5 h-5" />
                  Valider ma réponse
                  </button>

                <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                  💾 Réponse auto-sauvegardée : {myAnswer}
                </p>
              </div>
            )}
          </div>
        ) : (
            <>
            <input
              ref={inputRef}
              type="text"
              value={myAnswer}
              onChange={handleAnswerChange}
              onPaste={handlePaste}
              placeholder="Votre réponse..."
              className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none mb-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              onKeyPress={(e) => e.key === 'Enter' && !hasAnswered && !isTimeExpired && onSubmitAnswer()}
              disabled={isTimeExpired}
            />
              
              {/* Indicateur d'auto-sauvegarde */ }
              {myAnswer && !hasAnswered && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 flex items-center gap-1">
          💾 Réponse sauvegardée automatiquement
                </p>
        )}

              <button
          onClick={onSubmitAnswer}
          disabled={isTimeExpired}
          className={`w-full py-3 rounded-lg font-semibold ${
            isTimeExpired
              ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed'
              : 'bg-purple-600 dark:bg-purple-700 text-white hover:bg-purple-700 dark:hover:bg-purple-600'
            }`}
        >
          {isTimeExpired ? '⏰ Temps écoulé' : 'Valider ma réponse'}
        </button>

        <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
          💡 Votre réponse est automatiquement sauvegardée pendant que vous tapez
              </p>
            </>
      )}
        </div>
      </div >
    </div >
  );
};

export default QuizView;