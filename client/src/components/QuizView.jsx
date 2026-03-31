import React, { useEffect, useRef, useState } from 'react';
import { Check, Clock, ZoomIn, X } from 'lucide-react';

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
  const [zoomedImage, setZoomedImage] = useState(null);
  const [autoplayFailed, setAutoplayFailed] = useState(false);

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

  // Cleanup des médias quand on change de question ou quitte le composant
  useEffect(() => {
    return () => {
      // Cleanup au démontage ou changement de question
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.src = '';
        videoRef.current.load();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current.load();
      }
    };
  }, [questionIndex, lobby?.id]);

  // Cleanup quand le lobby est terminé ou qu'on quitte
  useEffect(() => {
    if (isFinished || !currentLobby) {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
    }
  }, [isFinished, currentLobby]);

  // Gestion de l'autoplay avec fallback pour Safari
  useEffect(() => {
    setAutoplayFailed(false);
    
    const tryAutoplay = async (mediaRef) => {
      if (!mediaRef.current) return;
      
      try {
        mediaRef.current.volume = 0.3;
        await mediaRef.current.play();
      } catch (error) {
        console.log('[AUTOPLAY BLOCKED]', error.message);
        setAutoplayFailed(true);
      }
    };

    // Petit délai pour laisser le DOM se mettre à jour
    const timer = setTimeout(() => {
      if (videoRef.current && question?.media && (question?.type === 'video' || (question?.type === 'qcm' && question?.mediaType === 'video'))) {
        tryAutoplay(videoRef);
      }
      if (audioRef.current && question?.media && (question?.type === 'audio' || (question?.type === 'qcm' && question?.mediaType === 'audio'))) {
        tryAutoplay(audioRef);
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [question?.id, questionIndex, question?.media, question?.type, question?.mediaType]);

  // Focus automatique sur l'input (seulement sur desktop)
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    if (inputRef.current && !hasAnswered && !isFinished && question?.type !== 'qcm' && !isMobile) {
      inputRef.current.focus();
    }
  }, [questionIndex, hasAnswered, isFinished, question?.type]);

  // Lancer manuellement le média (pour Safari)
  const handleManualPlay = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(console.error);
    }
    if (audioRef.current) {
      audioRef.current.play().catch(console.error);
    }
    setAutoplayFailed(false);
  };

  // Afficher un loader si pas encore de donnees
  if (!currentLobby || !quiz) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-2 sm:p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Chargement du quiz...</p>
        </div>
      </div>
    );
  }

  // Si pas de question, afficher un message
  if (!question) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-2 sm:p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">En attente de la question...</p>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-2 sm:p-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-center mb-4 sm:mb-6 dark:text-white">Quiz terminé !</h2>
            <p className="text-center text-base sm:text-lg mb-4 sm:mb-6 dark:text-gray-300">
              Consultez vos réponses et le classement en attendant la validation...
            </p>
            <div className="text-center">
              <button
                onClick={onLeaveLobby}
                className="w-full sm:w-auto px-6 py-3 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 text-base sm:text-lg font-semibold"
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
  const hasImageMedia = question?.media && (question?.type === 'image' || (question?.type === 'qcm' && question?.mediaType === 'image'));
  const hasVideoMedia = question?.media && (question?.type === 'video' || (question?.type === 'qcm' && question?.mediaType === 'video'));
  const hasAudioMedia = question?.media && (question?.type === 'audio' || (question?.type === 'qcm' && question?.mediaType === 'audio'));

  // Mode silhouette : l'image est révélée quand le timer expire OU tout le monde a répondu OU l'utilisateur a répondu
  const isSilhouetteMode = question?.silhouetteMode && hasImageMedia;
  const allAnswered = currentLobby?.participants?.every(p => p.hasAnswered) || false;
  const shouldRevealSilhouette = !isSilhouetteMode || isTimeExpired || allAnswered || hasAnswered;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-2 sm:p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 sm:p-6 md:p-8">
          {/* Header avec titre et progression */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3 sm:mb-4">
              <h3 className="text-base sm:text-xl font-bold dark:text-white truncate">{quiz?.title}</h3>
              <span className="text-sm sm:text-base text-gray-600 dark:text-gray-400 font-medium">
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

          {/* Timer - Plus visible sur mobile */}
          {timeRemaining !== null && !hasAnswered && (
            <div className="mb-4 sm:mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className={`w-5 h-5 sm:w-6 sm:h-6 ${timeRemaining <= 5 ? 'text-red-600 animate-pulse' : 'text-blue-600 dark:text-blue-400'}`} />
                <span className={`font-bold text-xl sm:text-2xl ${timeRemaining <= 5 ? 'text-red-600' : 'text-blue-600 dark:text-blue-400'}`}>
                  {timeRemaining}s
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 sm:h-3">
                <div
                  className={`h-2 sm:h-3 rounded-full transition-all ${timeRemaining <= 5 ? 'bg-red-600' : 'bg-blue-600 dark:bg-blue-500'}`}
                  style={{ width: `${(timeRemaining / (question.timer || 1)) * 100}%` }}
                />
              </div>
              {timeRemaining <= 5 && timeRemaining > 0 && (
                <p className="text-center text-red-600 font-bold mt-2 animate-pulse text-sm sm:text-base">
                  ⏰ Dépêchez-vous !
                </p>
              )}
            </div>
          )}

          {/* Texte de la question */}
          <div className="mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-center text-gray-900 dark:text-white mb-3 sm:mb-4 leading-snug">
              {question?.text}
            </h2>
            {question?.category && (
              <div className="text-center">
                <span className="inline-block px-2 sm:px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full text-xs sm:text-sm">
                  {question.category}
                </span>
              </div>
            )}
          </div>

          {/* Média (image, vidéo, audio) */}
          {question?.media && (
            <div className="mb-4 sm:mb-6">
              {/* Image avec zoom et mode silhouette */}
              {hasImageMedia && (
                <div className="flex flex-col items-center">
                  {/* Badge mode silhouette */}
                  {isSilhouetteMode && !shouldRevealSilhouette && (
                    <div className="mb-2 px-3 py-1 bg-gray-800 text-white text-sm rounded-full flex items-center gap-2">
                      <span>🎭</span>
                      <span>Qui est ce personnage ?</span>
                    </div>
                  )}
                  {isSilhouetteMode && shouldRevealSilhouette && !hasAnswered && (
                    <div className="mb-2 px-3 py-1 bg-green-600 text-white text-sm rounded-full flex items-center gap-2 animate-pulse">
                      <span>✨</span>
                      <span>Révélé !</span>
                    </div>
                  )}
                  
                  <div 
                    className="relative cursor-pointer group"
                    onClick={() => shouldRevealSilhouette ? setZoomedImage(question.media) : null}
                  >
                    <img 
                      src={question.media} 
                      alt="Question" 
                      className="max-w-full w-auto max-h-[40vh] sm:max-h-[50vh] md:max-h-[60vh] rounded-lg object-contain transition-all duration-500" 
                      style={{
                        filter: shouldRevealSilhouette ? 'none' : 'brightness(0)',
                        transform: shouldRevealSilhouette && isSilhouetteMode ? 'scale(1.02)' : 'scale(1)'
                      }}
                    />
                    {shouldRevealSilhouette && (
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-lg flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 text-white px-2 py-1 rounded text-xs sm:text-sm flex items-center gap-1">
                          <ZoomIn className="w-3 h-3 sm:w-4 sm:h-4" />
                          Agrandir
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Vidéo */}
              {hasVideoMedia && (
                <div className="relative">
                  <video
                    ref={videoRef}
                    key={`video-${currentSession?.currentQuestionIndex}-${question.id}`}
                    controls
                    playsInline
                    className="w-full rounded-lg max-h-[40vh] sm:max-h-[50vh] md:max-h-[60vh]"
                  >
                    <source src={question.media} />
                  </video>
                  {autoplayFailed && (
                    <button
                      onClick={handleManualPlay}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg"
                    >
                      <div className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm sm:text-base font-semibold shadow-lg">
                        ▶️ Lancer la vidéo
                      </div>
                    </button>
                  )}
                </div>
              )}

              {/* Audio */}
              {hasAudioMedia && (
                <div className="space-y-2">
                  <audio
                    ref={audioRef}
                    key={`audio-${currentSession?.currentQuestionIndex}-${question.id}`}
                    controls
                    className="w-full"
                  >
                    <source src={question.media} />
                  </audio>
                  {autoplayFailed && (
                    <button
                      onClick={handleManualPlay}
                      className="w-full py-2 bg-purple-600 text-white rounded-lg flex items-center justify-center gap-2 text-sm sm:text-base font-semibold"
                    >
                      🎵 Lancer la musique
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Zone de réponse */}
          {hasAnswered ? (
            isTimeExpired ? (
              // Timer expiré mais réponse enregistrée
              <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600 rounded-lg p-4 sm:p-6 text-center">
                <Clock className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-green-600 dark:text-green-400 mb-2" />
                <p className="font-bold text-green-700 dark:text-green-400 mb-2 text-sm sm:text-base">✅ Réponse enregistrée mais le temps est écoulé ! ⏰</p>
                {myAnswer && myAnswer.trim() ? (
                  <div className="bg-white dark:bg-gray-800 rounded p-2 sm:p-3 border border-green-300 dark:border-green-600 mb-3">
                    <p className="text-xs text-gray-600 dark:text-gray-400">Votre réponse :</p>
                    <p className="break-all font-bold text-green-700 dark:text-green-400 text-sm sm:text-base">{myAnswer}</p>
                  </div>
                ) : (
                  <div className="bg-red-100 dark:bg-red-900/30 rounded p-2 sm:p-3 border border-red-300 dark:border-red-600 mb-3">
                    <p className="text-sm text-red-700 dark:text-red-400">❌ Aucune réponse enregistrée</p>
                  </div>
                )}
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">⏳ Attente des autres participants...</p>
              </div>
            ) : (
              // Réponse validée normalement
              <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600 rounded-lg p-4 sm:p-6 text-center">
                <Check className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-green-600 dark:text-green-400 mb-2" />
                <p className="font-bold text-green-700 dark:text-green-400 mb-2 text-sm sm:text-base">✅ Réponse enregistrée !</p>
                <div className="bg-white dark:bg-gray-800 rounded p-2 sm:p-3 border border-green-300 dark:border-green-600 mb-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Votre réponse :</p>
                  <p className="break-all font-bold text-green-700 dark:text-green-400 text-sm sm:text-base">{myAnswer || '(vide)'}</p>
                </div>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">⏳ Attente des autres participants...</p>
              </div>
            )
          ) : isTimeExpired ? (
            // Temps écoulé sans réponse
            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 rounded-lg p-4 sm:p-6 text-center">
              <Clock className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-red-600 dark:text-red-400 mb-2" />
              <p className="font-bold text-red-700 dark:text-red-400 mb-2 text-sm sm:text-base">⏰ Temps écoulé !</p>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">En attente de la question suivante...</p>
            </div>
          ) : question?.type === 'qcm' ? (
            // Interface QCM
            <div className="space-y-2 sm:space-y-3">
              {question.choices?.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => handleQCMChoice(choice)}
                  disabled={isTimeExpired}
                  className={`w-full p-3 sm:p-4 rounded-lg border-2 text-left font-medium sm:font-semibold transition-all text-sm sm:text-base ${
                    isTimeExpired
                      ? 'opacity-50 cursor-not-allowed border-gray-300 dark:border-gray-600 bg-gray-100 dark:bg-gray-700'
                      : myAnswer === choice
                        ? 'border-purple-600 dark:border-purple-500 bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-200 scale-[1.02] shadow-lg'
                        : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 active:scale-[0.98]'
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
                
              {/* Bouton de validation QCM */}
              {myAnswer && (
                <div className="pt-3 sm:pt-4">
                  <button
                    onClick={onSubmitAnswer}
                    disabled={isTimeExpired}
                    className={`w-full py-3 sm:py-4 rounded-lg font-semibold flex items-center justify-center gap-2 text-base sm:text-lg ${
                      isTimeExpired
                        ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed'
                        : 'bg-purple-600 dark:bg-purple-700 text-white hover:bg-purple-700 dark:hover:bg-purple-600 shadow-lg active:scale-[0.98]'
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
            // Input texte libre
            <div>
              <input
                ref={inputRef}
                type="text"
                value={myAnswer}
                onChange={handleAnswerChange}
                onPaste={handlePaste}
                placeholder="Votre réponse..."
                className="w-full px-3 sm:px-4 py-3 sm:py-4 border-2 border-gray-300 dark:border-gray-600 rounded-lg focus:border-purple-500 focus:outline-none mb-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-base sm:text-lg"
                onKeyPress={(e) => e.key === 'Enter' && !hasAnswered && !isTimeExpired && onSubmitAnswer()}
                disabled={isTimeExpired}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />
                
              {/* Indicateur d'auto-sauvegarde */}
              {myAnswer && !hasAnswered && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 sm:mb-4 flex items-center gap-1">
                  💾 Réponse sauvegardée automatiquement
                </p>
              )}

              <button
                onClick={onSubmitAnswer}
                disabled={isTimeExpired}
                className={`w-full py-3 sm:py-4 rounded-lg font-semibold text-base sm:text-lg ${
                  isTimeExpired
                    ? 'bg-gray-400 dark:bg-gray-600 text-gray-200 cursor-not-allowed'
                    : 'bg-purple-600 dark:bg-purple-700 text-white hover:bg-purple-700 dark:hover:bg-purple-600 active:scale-[0.98]'
                }`}
              >
                {isTimeExpired ? '⏰ Temps écoulé' : 'Valider ma réponse'}
              </button>

              <p className="text-xs text-center text-gray-500 dark:text-gray-400 mt-2">
                💡 Votre réponse est automatiquement sauvegardée
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modale zoom image */}
      {zoomedImage && (
        <div 
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-2 sm:p-4"
          onClick={() => setZoomedImage(null)}
        >
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 bg-white/20 hover:bg-white/30 rounded-full text-white transition-colors"
          >
            <X className="w-6 h-6 sm:w-8 sm:h-8" />
          </button>
          <img
            src={zoomedImage}
            alt="Zoom"
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
};

export default QuizView;
