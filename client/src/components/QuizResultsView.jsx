import React from 'react';
import { CheckCircle, XCircle, Clock, Trophy, Target } from 'lucide-react';

const QuizResultsView = ({ currentLobby, quiz, currentUser, onLeaveLobby, onViewScoreboard }) => {
  if (!currentLobby || !quiz || !currentUser) return null;

  const participant = currentLobby.participants.find(p => p.participantId === currentUser.id);
  
  if (!participant) return null;

  // ✅ CORRECTION: Utiliser les bonnes questions (mélangées ou non)
  const questions = currentLobby.shuffled && currentLobby.shuffledQuestions 
    ? currentLobby.shuffledQuestions 
    : quiz.questions;

  // ✅ CORRECTION: Utiliser answersByQuestionId et validationsByQuestionId
  const answersByQuestionId = participant.answersByQuestionId || {};
  const validationsByQuestionId = participant.validationsByQuestionId || {};

  // Calculer les statistiques
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(answersByQuestionId).length;
  const validatedCount = Object.values(validationsByQuestionId).filter(v => v === true).length;
  const rejectedCount = Object.values(validationsByQuestionId).filter(v => v === false).length;
  const pendingCount = answeredCount - validatedCount - rejectedCount;
  
  // ✅ CORRECTION: Calculer le score en utilisant les IDs
  const totalPoints = questions.reduce((acc, q) => {
    if (validationsByQuestionId[q.id] === true) {
      return acc + (q.points || 1);
    }
    return acc;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6 text-center">
          <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
          <h2 className="text-3xl font-bold mb-2 dark:text-white">Quiz Terminé !</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">{quiz.title}</p>
          
          {currentLobby.shuffled && (
            <div className="inline-block px-3 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-full text-sm mb-4">
              🔀 Questions en ordre aléatoire
            </div>
          )}
          
          {/* Stats globales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <Target className="w-8 h-8 mx-auto text-blue-600 dark:text-blue-400 mb-2" />
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{answeredCount}/{totalQuestions}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Réponses</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <CheckCircle className="w-8 h-8 mx-auto text-green-600 dark:text-green-400 mb-2" />
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{validatedCount}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Validées</p>
            </div>
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
              <XCircle className="w-8 h-8 mx-auto text-red-600 dark:text-red-400 mb-2" />
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{rejectedCount}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Refusées</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
              <Clock className="w-8 h-8 mx-auto text-yellow-600 dark:text-yellow-400 mb-2" />
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingCount}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">En attente</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-500 dark:border-purple-600">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Votre score actuel</p>
            <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">{totalPoints} points</p>
            {pendingCount > 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                ⏳ {pendingCount} réponse{pendingCount > 1 ? 's' : ''} en attente de validation
              </p>
            )}
          </div>
        </div>

        {/* Récapitulatif des questions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-2xl font-bold mb-4 dark:text-white">📝 Vos Réponses</h3>
          
          <div className="space-y-4">
            {/* ✅ CORRECTION: Parcourir les questions dans le bon ordre */}
            {questions.map((question, displayIndex) => {
              // ✅ Récupérer par ID de question
              const userAnswer = answersByQuestionId[question.id];
              const validation = validationsByQuestionId[question.id];
              const hasAnswer = userAnswer !== undefined;
              
              let statusColor = 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700';
              let statusIcon = <Clock className="w-6 h-6 text-gray-400" />;
              let statusText = 'En attente de validation';
              
              if (validation === true) {
                statusColor = 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20';
                statusIcon = <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />;
                statusText = 'Validée';
              } else if (validation === false) {
                statusColor = 'border-red-500 dark:border-red-600 bg-red-50 dark:bg-red-900/20';
                statusIcon = <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />;
                statusText = 'Refusée';
              }
              
              return (
                <div key={question.id} className={`border-2 rounded-lg p-4 ${statusColor}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-purple-600 dark:text-purple-400">Q{displayIndex + 1}</span>
                      {question.category && (
                        <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs rounded">
                          {question.category}
                        </span>
                      )}
                      {question.type === 'qcm' && (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs rounded">
                          QCM
                        </span>
                      )}
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {question.points || 1} point{question.points > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusIcon}
                      <span className="text-sm font-semibold dark:text-white">{statusText}</span>
                    </div>
                  </div>
                  
                  <p className="font-semibold mb-3 dark:text-white">{question.text}</p>
                  
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-gray-700 rounded p-3 border border-gray-200 dark:border-gray-600">
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">✅ Réponse correcte :</p>
                      <p className="font-bold text-green-700 dark:text-green-400">{question.answer}</p>
                    </div>
                    
                    <div className={`rounded p-3 border ${
                      !hasAnswer ? 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600' :
                      validation === true ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600' :
                      validation === false ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-600' :
                      'bg-yellow-100 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-600'
                    }`}>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                        {!hasAnswer ? '❌ Pas de réponse' : '📝 Votre réponse :'}
                      </p>
                      <p className={`font-bold ${
                        !hasAnswer ? 'text-gray-500 dark:text-gray-400 italic' :
                        validation === true ? 'text-green-700 dark:text-green-400' :
                        validation === false ? 'text-red-700 dark:text-red-400' :
                        'text-yellow-700 dark:text-yellow-400'
                      }`}>
                        {hasAnswer ? userAnswer : '(Aucune réponse)'}
                      </p>
                    </div>
                  </div>

                  {validation === true && (
                    <div className="mt-3 pt-3 border-t border-green-300 dark:border-green-700">
                      <p className="text-green-700 dark:text-green-400 font-semibold text-sm">
                        🎉 +{question.points || 1} point{question.points > 1 ? 's' : ''} pour votre équipe !
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={onViewScoreboard}
            className="w-full py-4 bg-purple-600 dark:bg-purple-700 text-white rounded-lg font-semibold hover:bg-purple-700 dark:hover:bg-purple-600 flex items-center justify-center gap-2 text-lg"
          >
            <Trophy className="w-6 h-6" />
            Voir le Classement
          </button>
          <button
            onClick={onLeaveLobby}
            className="w-full py-4 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-400 dark:hover:bg-gray-600 text-lg"
          >
            Quitter le Quiz
          </button>
        </div>

        {pendingCount > 0 && (
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-600 rounded-lg p-4 text-center">
            <Clock className="w-8 h-8 mx-auto text-blue-600 dark:text-blue-400 mb-2" />
            <p className="text-blue-800 dark:text-blue-300 font-semibold">
              ⏳ Validation en cours par l'administrateur
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              Votre score final sera mis à jour une fois toutes les réponses validées
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizResultsView;