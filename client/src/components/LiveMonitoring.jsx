import React, { useEffect, useRef, useState } from 'react';
import { Eye, Check, Clock, SkipForward, Users, Trophy, Play, Pause, EyeOff } from 'lucide-react';

const LiveMonitoring = ({ lobbies, quizzes, onNextQuestion }) => {
  const activeLobby = lobbies.find(l => l.status === 'playing');
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const audioPlayerRef = useRef(null);
  const [localTimeRemaining, setLocalTimeRemaining] = useState(null);
  
  // ✅ Mode anti-triche : MASQUÉ PAR DÉFAUT + reset à chaque question
  const [hideAnswers, setHideAnswers] = useState(true);
  const previousQuestionIndexRef = useRef(null);
  
  // Auto-avance
  const [autoAdvance, setAutoAdvance] = useState(() => {
    const saved = localStorage.getItem('quiz-auto-advance');
    return saved ? JSON.parse(saved) : false;
  });
  const autoAdvanceTimerRef = useRef(null);
  const [countdown, setCountdown] = useState(0);
  const isAutoAdvancingRef = useRef(false); // ✅ NOUVEAU: Empêcher déclenchements multiples

  // ✅ Sauvegarder auto-avance uniquement
  useEffect(() => {
    localStorage.setItem('quiz-auto-advance', JSON.stringify(autoAdvance));
  }, [autoAdvance]);

  // ✅ RESET anti-triche à chaque nouvelle question
  useEffect(() => {
    if (activeLobby) {
      const currentQuestionIndex = activeLobby.session?.currentQuestionIndex;
      
      if (previousQuestionIndexRef.current !== null && 
          currentQuestionIndex !== previousQuestionIndexRef.current) {
        // Nouvelle question détectée
        setHideAnswers(true);
        isAutoAdvancingRef.current = false; // ✅ Reset flag
        console.log('🔒 Nouvelle question : mode anti-triche réactivé');
      }
      
      previousQuestionIndexRef.current = currentQuestionIndex;
    }
  }, [activeLobby?.session?.currentQuestionIndex]);

  // Son quand tous ont répondu
  useEffect(() => {
    if (activeLobby) {
      const allAnswered = activeLobby.participants?.every(p => p.hasAnswered);
      if (allAnswered && activeLobby.participants?.length > 0) {
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
        }
      }
    }
  }, [activeLobby?.participants]);

  // Timer local
  useEffect(() => {
    if (!activeLobby) {
      setLocalTimeRemaining(null);
      return;
    }

    if (activeLobby.timeRemaining !== undefined && activeLobby.timeRemaining >= 0) {
      setLocalTimeRemaining(activeLobby.timeRemaining);
    } else {
      setLocalTimeRemaining(null);
    }
  }, [activeLobby?.timeRemaining]);

  // ✅ Logique auto-avance CORRIGÉE - Ne se déclenche qu'UNE FOIS
  useEffect(() => {
    // Si déjà en train d'auto-avancer, ne rien faire
    if (isAutoAdvancingRef.current) {
      return;
    }

    // Nettoyer le timer précédent
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }

    if (!activeLobby || !autoAdvance) {
      setCountdown(0);
      return;
    }

    const quiz = quizzes.find(q => q.id === activeLobby.quizId);
    const currentQuestion = quiz?.questions[activeLobby.session?.currentQuestionIndex];
    const allAnswered = activeLobby.participants?.every(p => p.hasAnswered);
    const totalParticipants = activeLobby.participants?.length || 0;

    let shouldAutoAdvance = false;
    let delaySeconds = 3;

    // Condition 1: Timer expiré
    if (currentQuestion?.timer > 0 && localTimeRemaining === 0) {
      shouldAutoAdvance = true;
      delaySeconds = 3;
    } 
    // Condition 2: Tous ont répondu
    else if (allAnswered && totalParticipants > 0) {
      shouldAutoAdvance = true;
      delaySeconds = 5;
    }

    if (shouldAutoAdvance && !isAutoAdvancingRef.current) {
      // ✅ Marquer qu'on est en train d'auto-avancer
      isAutoAdvancingRef.current = true;
      
      console.log(`⏰ ${allAnswered ? 'Tous ont répondu' : 'Timer expiré'}, auto-avance dans ${delaySeconds}s`);
      
      setCountdown(delaySeconds);
      
      // Countdown visuel
      let currentCountdown = delaySeconds;
      const countdownInterval = setInterval(() => {
        currentCountdown--;
        setCountdown(currentCountdown);
        if (currentCountdown <= 0) {
          clearInterval(countdownInterval);
        }
      }, 1000);

      // Timer pour l'auto-avance
      autoAdvanceTimerRef.current = setTimeout(() => {
        console.log('🤖 AUTO-AVANCE: Passage à la question suivante');
        onNextQuestion(activeLobby.id);
        setCountdown(0);
        clearInterval(countdownInterval);
        // Le flag sera reset par le useEffect de changement de question
      }, delaySeconds * 1000);

      return () => {
        clearInterval(countdownInterval);
        if (autoAdvanceTimerRef.current) {
          clearTimeout(autoAdvanceTimerRef.current);
          autoAdvanceTimerRef.current = null;
        }
      };
    }
  }, [activeLobby?.session?.currentQuestionIndex, localTimeRemaining, autoAdvance, quizzes, onNextQuestion]);

  const cancelAutoAdvance = () => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
      setCountdown(0);
      isAutoAdvancingRef.current = false; // ✅ Reset flag
      console.log('🛑 Auto-avance annulée manuellement');
    }
  };

  if (!activeLobby) {
    return (
      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="text-2xl font-bold dark:text-white">Suivi en direct</h3>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
          <Eye className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-xl text-gray-600 dark:text-gray-400">Aucun quiz en cours</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Démarrez un quiz depuis le tableau de bord</p>
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
  const hasTimer = currentQuestion?.timer > 0;

  return (
    <div className="space-y-6">
      <audio ref={audioRef} src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZRA0PVq3n77BdGAg+ltrzxnMpBSl+zPLaizsIGGS57OihUBELTKXh8bllHAU2jdXzzn0vBSJ1xe/glEILEly26+ujVRUJQZzd8sFuJAUuhM/z1YU2Bhxqvu7mnEgODVKq5O+2Yh0FO5LY88p1KwUme8rx3I4+CRZiturqpVITC0mi4PK8aB8FM4nU8tGAMQYfb8Tv45ZFDBFYr+fxsV8aBTqU2vPJdC0FKoHO8t2NOwgZabvt56FQEQtMpeLysGQcBTeQ1/POgTEGI3bG8OCWQQoSXbPq7KpYFAlBoN3zv2wiBTOJz/PWhTYGHWy+7+OaSQ4PVqzm8K9gHAU7kdj0yHUsBSh+zPDckD4IGmq97uit0xQLTqXk87BqIAU1kNf0zX4tBSN0yO/hlUMLElyw6+ypVhQJQZzd88FtIgU0iM/z1YU2BRxsu+7imUkNCVOq5O+wXx4FO5HX9MlzKgUqgcvz3I4+CRlpu+7knFIRC06k4fO0aB4FM4nU89GAMQYgccTv45VFCxJctuvqpVIVCUGc3vO+biMFMojO89aGNQYfbsLu4ppICglSrOPvr18dBTuR2fPJcSsFLIHL8t2OOgcZa7zq46hSEQxNpuLxt2smBTWP1vPQgCwGI3TH7+CVRQoSX7Xp66lUFglBoN3yvmwhBTOJzfPWhTUHHm3A7uKZSAgPU6vj769hHAU6j9jzx3QtBSiByvHejz0HGWm86+WhUhALTKPi8bZnIAU0jdXy0H4qBSF0xPDekkMJEl2y6uqnUxUJQJzd8sFsIQYzhc3z1YU1Bh1sw+7jm0kNDVKr5O+vYRwFOY/Y88lzKwcogMvx3I4+CRhr" />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-2xl font-bold mb-2 dark:text-white">{quiz?.title}</h3>
            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4" />
                <span>Question {currentQuestionIndex + 1} / {quiz?.questions.length}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{answeredCount} / {totalParticipants} réponses</span>
              </div>
              {hasTimer && localTimeRemaining !== null && (
                <div className="flex items-center gap-1">
                  <Clock className={`w-4 h-4 ${localTimeRemaining <= 5 ? 'text-red-600 dark:text-red-400 animate-pulse' : 'text-blue-600 dark:text-blue-400'}`} />
                  <span className={`font-bold ${localTimeRemaining <= 5 ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400'}`}>
                    {localTimeRemaining}s restantes
                  </span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setHideAnswers(!hideAnswers)}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 font-semibold transition-all ${
                hideAnswers
                  ? 'bg-orange-600 text-white hover:bg-orange-700'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
              title={hideAnswers ? 'Afficher les réponses' : 'Masquer les réponses (anti-triche)'}
            >
              {hideAnswers ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Cachées 🔒
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Visibles ✅
                </>
              )}
            </button>

            <button
              onClick={() => {
                setAutoAdvance(!autoAdvance);
                if (autoAdvance) cancelAutoAdvance();
              }}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 font-semibold transition-all ${
                autoAdvance
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-400 dark:hover:bg-gray-500'
              }`}
              title={autoAdvance ? 'Désactiver auto-avance' : 'Activer auto-avance'}
            >
              {autoAdvance ? (
                <>
                  <Play className="w-4 h-4" />
                  Auto ✅
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4" />
                  Auto ❌
                </>
              )}
            </button>

            <button
              onClick={() => {
                cancelAutoAdvance();
                onNextQuestion(activeLobby.id);
              }}
              className="px-6 py-3 bg-orange-600 dark:bg-orange-700 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 flex items-center gap-2 font-semibold transition-all hover:scale-105"
            >
              <SkipForward className="w-5 h-5" />
              Question suivante
            </button>
          </div>
        </div>

        {autoAdvance && countdown > 0 && (
          <div className="mb-4 p-4 bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900/30 dark:to-blue-900/30 border-2 border-green-500 dark:border-green-600 rounded-lg animate-pulse">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Clock className="w-8 h-8 text-green-600 dark:text-green-400 animate-spin" />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-green-700 dark:text-green-300">
                    {countdown}
                  </span>
                </div>
                <div>
                  <p className="font-bold text-green-800 dark:text-green-300">
                    🤖 Passage automatique à la question suivante...
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-400">
                    {allAnswered ? 'Tous les participants ont répondu' : 'Temps écoulé'}
                  </p>
                </div>
              </div>
              <button
                onClick={cancelAutoAdvance}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {hasTimer && localTimeRemaining !== null && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
              <span>Temps restant</span>
              <span>{localTimeRemaining}s / {currentQuestion.timer}s</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <div
                className={`h-3 rounded-full transition-all duration-1000 ${
                  localTimeRemaining <= 5 ? 'bg-red-600' : 'bg-blue-600 dark:bg-blue-500'
                }`}
                style={{ width: `${(localTimeRemaining / currentQuestion.timer) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
            <span>Progression des réponses</span>
            <span>{Math.round(progressPercent)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                allAnswered ? 'bg-green-500' : 'bg-purple-600 dark:bg-purple-500'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="bg-purple-50 dark:bg-purple-900/20 border-l-4 border-purple-500 dark:border-purple-600 p-4 mb-6 rounded">
          <h4 className="font-bold text-lg mb-2 dark:text-white">📝 Question actuelle</h4>
          <p className="text-gray-700 dark:text-gray-300 mb-3">{currentQuestion?.text}</p>
          
          {currentQuestion?.type === 'image' && currentQuestion?.media && (
            <div className="mb-3">
              <img 
                src={currentQuestion.media} 
                alt="Question" 
                className="max-w-md h-auto rounded-lg border-2 border-purple-300 dark:border-purple-600" 
              />
            </div>
          )}
          
          {/* ✅ FIX CACHE VIDÉO: key unique par question */}
          {currentQuestion?.type === 'video' && currentQuestion?.media && (
            <div className="mb-3">
              <video 
                key={`video-${currentQuestionIndex}-${currentQuestion.id}`}
                ref={videoRef}
                controls 
                autoPlay
                className="max-w-2xl w-full rounded-lg border-2 border-purple-300 dark:border-purple-600"
                style={{ maxHeight: '400px' }}
                onLoadedMetadata={(e) => {
                  e.target.volume = 0.3;
                }}
              >
                <source src={currentQuestion.media} />
              </video>
            </div>
          )}
          
          {/* ✅ FIX CACHE AUDIO: key unique par question + ref pour forcer reload */}
          {currentQuestion?.type === 'audio' && currentQuestion?.media && (
            <div className="mb-3">
              <audio 
                key={`audio-${currentQuestionIndex}-${currentQuestion.id}`}
                ref={audioPlayerRef}
                controls 
                autoPlay
                className="w-full"
                onLoadedMetadata={(e) => {
                  e.target.volume = 0.3;
                }}
              >
                <source src={`${currentQuestion.media}?t=${currentQuestionIndex}`} />
              </audio>
            </div>
          )}
          
          <div className="flex gap-4 mt-3 text-sm flex-wrap">
            <span className="px-3 py-1 bg-purple-200 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 rounded-full">
              {currentQuestion?.points || 1} points
            </span>
            {currentQuestion?.timer > 0 && (
              <span className="px-3 py-1 bg-blue-200 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-full">
                ⏱️ {currentQuestion.timer}s
              </span>
            )}
            {currentQuestion?.category && (
              <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full">
                {currentQuestion.category}
              </span>
            )}
            {currentQuestion?.type === 'qcm' && (
              <span className="px-3 py-1 bg-blue-200 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 rounded-full">
                QCM
              </span>
            )}
          </div>
          
          {!hideAnswers && (
            <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-700">
              <p className="text-xs text-gray-600 dark:text-gray-400">Réponse attendue :</p>
              <p className="font-bold text-green-700 dark:text-green-400">{currentQuestion?.answer}</p>
            </div>
          )}
          
          {hideAnswers && (
            <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700">
              <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <EyeOff className="w-4 h-4" />
                <p className="text-sm font-semibold">Réponse masquée (mode anti-triche) 🔒</p>
              </div>
            </div>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {activeLobby.participants?.map((p) => (
            <div 
              key={p.participantId} 
              className={`border-2 rounded-lg p-4 transition-all duration-300 ${
                p.hasAnswered 
                  ? 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20 scale-100' 
                  : 'border-orange-300 dark:border-orange-600 bg-orange-50 dark:bg-orange-900/20 scale-95 animate-pulse'
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <div>
                  <p className="font-bold dark:text-white">{p.pseudo}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{p.teamName}</p>
                </div>
                {p.hasAnswered ? (
                  <div className="flex items-center gap-1">
                    <Check className="w-6 h-6 text-green-600 dark:text-green-400" />
                    <span className="text-xs text-green-600 dark:text-green-400 font-semibold">✓</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400 animate-spin" />
                    <span className="text-xs text-orange-600 dark:text-orange-400 font-semibold">...</span>
                  </div>
                )}
              </div>

              {p.hasAnswered && !hideAnswers && (
                <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="bg-white dark:bg-gray-700 rounded p-2 border border-green-300 dark:border-green-600">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Réponse :</p>
                    <p className="font-bold text-green-700 dark:text-green-400 break-words text-sm">
                      {p.currentAnswer || '(vide)'}
                    </p>
                  </div>
                </div>
              )}
              
              {p.hasAnswered && hideAnswers && (
                <div className="mt-3 pt-3 border-t border-orange-200 dark:border-orange-700">
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded p-2 border border-orange-300 dark:border-orange-600 flex items-center justify-center gap-2">
                    <EyeOff className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold">Masqué 🔒</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {allAnswered && totalParticipants > 0 && !countdown && (
        <div className="bg-gradient-to-r from-green-400 to-green-600 dark:from-green-600 dark:to-green-800 rounded-lg p-6 text-center animate-bounce shadow-xl">
          <div className="flex items-center justify-center gap-3 text-white">
            <Check className="w-8 h-8" />
            <p className="font-bold text-xl">
              Tous les participants ont répondu !
            </p>
            <Check className="w-8 h-8" />
          </div>
          {!autoAdvance && (
            <p className="text-white text-sm mt-2 opacity-90">
              Cliquez sur "Question suivante" pour continuer
            </p>
          )}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h4 className="font-bold text-lg mb-4 dark:text-white">📊 Statistiques en direct</h4>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center border border-blue-200 dark:border-blue-700">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{totalParticipants}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Participants</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center border border-green-200 dark:border-green-700">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{answeredCount}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Ont répondu</p>
          </div>
          <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 text-center border border-orange-200 dark:border-orange-700">
            <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{totalParticipants - answeredCount}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">En attente</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveMonitoring;