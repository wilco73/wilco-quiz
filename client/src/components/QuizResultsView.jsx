import React from 'react';
import { CheckCircle, XCircle, Clock, Trophy, Target } from 'lucide-react';

const QuizResultsView = ({ currentLobby, quiz, currentUser, onLeaveLobby, onViewScoreboard }) => {
  if (!currentLobby || !quiz || !currentUser) return null;

  const participant = currentLobby.participants.find(p => p.participantId === currentUser.id);
  
  if (!participant) return null;

  const answers = participant.answers || {};
  const validations = participant.validations || {};

  // Calculer les statistiques
  const totalQuestions = quiz.questions.length;
  const answeredCount = Object.keys(answers).length;
  const validatedCount = Object.values(validations).filter(v => v === true).length;
  const rejectedCount = Object.values(validations).filter(v => v === false).length;
  const pendingCount = answeredCount - validatedCount - rejectedCount;
  const totalPoints = quiz.questions.reduce((acc, q, idx) => {
    if (validations[idx] === true) {
      return acc + (q.points || 1);
    }
    return acc;
  }, 0);

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6 text-center">
          <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
          <h2 className="text-3xl font-bold mb-2">Quiz Terminé !</h2>
          <p className="text-lg text-gray-600 mb-4">{quiz.title}</p>
          
          {/* Stats globales */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <Target className="w-8 h-8 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold text-blue-600">{answeredCount}/{totalQuestions}</p>
              <p className="text-sm text-gray-600">Réponses</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <CheckCircle className="w-8 h-8 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold text-green-600">{validatedCount}</p>
              <p className="text-sm text-gray-600">Validées</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <XCircle className="w-8 h-8 mx-auto text-red-600 mb-2" />
              <p className="text-2xl font-bold text-red-600">{rejectedCount}</p>
              <p className="text-sm text-gray-600">Refusées</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4">
              <Clock className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
              <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              <p className="text-sm text-gray-600">En attente</p>
            </div>
          </div>

          <div className="mt-6 p-4 bg-purple-50 rounded-lg border-2 border-purple-500">
            <p className="text-sm text-gray-600 mb-1">Votre score actuel</p>
            <p className="text-4xl font-bold text-purple-600">{totalPoints} points</p>
            {pendingCount > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                ⏳ {pendingCount} réponse{pendingCount > 1 ? 's' : ''} en attente de validation
              </p>
            )}
          </div>
        </div>

        {/* Récapitulatif des questions */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h3 className="text-2xl font-bold mb-4">📝 Vos Réponses</h3>
          
          <div className="space-y-4">
            {quiz.questions.map((question, index) => {
              const userAnswer = answers[index];
              const validation = validations[index];
              const hasAnswer = userAnswer !== undefined;
              
              let statusColor = 'border-gray-200 bg-gray-50';
              let statusIcon = <Clock className="w-6 h-6 text-gray-400" />;
              let statusText = 'En attente de validation';
              
              if (validation === true) {
                statusColor = 'border-green-500 bg-green-50';
                statusIcon = <CheckCircle className="w-6 h-6 text-green-600" />;
                statusText = 'Validée';
              } else if (validation === false) {
                statusColor = 'border-red-500 bg-red-50';
                statusIcon = <XCircle className="w-6 h-6 text-red-600" />;
                statusText = 'Refusée';
              }
              
              return (
                <div key={index} className={`border-2 rounded-lg p-4 ${statusColor}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-purple-600">Q{index + 1}</span>
                      {question.category && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">
                          {question.category}
                        </span>
                      )}
                      <span className="text-sm text-gray-600">
                        {question.points || 1} point{question.points > 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusIcon}
                      <span className="text-sm font-semibold">{statusText}</span>
                    </div>
                  </div>
                  
                  <p className="font-semibold mb-3">{question.text}</p>
                  
                  <div className="grid md:grid-cols-2 gap-3">
                    <div className="bg-white rounded p-3 border border-gray-200">
                      <p className="text-xs text-gray-600 mb-1">✅ Réponse correcte :</p>
                      <p className="font-bold text-green-700">{question.answer}</p>
                    </div>
                    
                    <div className={`rounded p-3 border ${
                      !hasAnswer ? 'bg-gray-100 border-gray-300' :
                      validation === true ? 'bg-green-100 border-green-300' :
                      validation === false ? 'bg-red-100 border-red-300' :
                      'bg-yellow-100 border-yellow-300'
                    }`}>
                      <p className="text-xs text-gray-600 mb-1">
                        {!hasAnswer ? '❌ Pas de réponse' : '📝 Votre réponse :'}
                      </p>
                      <p className={`font-bold ${
                        !hasAnswer ? 'text-gray-500 italic' :
                        validation === true ? 'text-green-700' :
                        validation === false ? 'text-red-700' :
                        'text-yellow-700'
                      }`}>
                        {hasAnswer ? userAnswer : '(Aucune réponse)'}
                      </p>
                    </div>
                  </div>

                  {validation === true && (
                    <div className="mt-3 pt-3 border-t border-green-300">
                      <p className="text-green-700 font-semibold text-sm">
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
            className="w-full py-4 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 flex items-center justify-center gap-2 text-lg"
          >
            <Trophy className="w-6 h-6" />
            Voir le Classement
          </button>
          <button
            onClick={onLeaveLobby}
            className="w-full py-4 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 text-lg"
          >
            Quitter le Quiz
          </button>
        </div>

        {pendingCount > 0 && (
          <div className="mt-6 bg-blue-50 border-2 border-blue-500 rounded-lg p-4 text-center">
            <Clock className="w-8 h-8 mx-auto text-blue-600 mb-2" />
            <p className="text-blue-800 font-semibold">
              ⏳ Validation en cours par l'administrateur
            </p>
            <p className="text-sm text-blue-600 mt-1">
              Votre score final sera mis à jour une fois toutes les réponses validées
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizResultsView;