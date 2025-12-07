import React, { useState } from 'react';
import { Trophy, Check, XCircle, Users, ChevronDown, ChevronUp, CheckCircle, AlertCircle } from 'lucide-react';

const ValidationView = ({ lobbies, quizzes, onValidateAnswer }) => {
  const finishedLobbies = lobbies.filter(l => l.status === 'finished');
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [expandedLobbies, setExpandedLobbies] = useState({});

  const toggleQuestion = (lobbyId, questionId) => {
    const key = `${lobbyId}-${questionId}`;
    setExpandedQuestions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleLobby = (lobbyId) => {
    setExpandedLobbies(prev => ({
      ...prev,
      [lobbyId]: !prev[lobbyId]
    }));
  };

  // ✅ NOUVEAU: Valider tous les participants pour une question
  const validateAllForQuestion = (lobby, question, isCorrect) => {
    const confirmMessage = isCorrect
      ? `✅ Valider TOUS les participants pour cette question ?\n\n"${question.text}"\n\n${lobby.participants.length} participant(s) concerné(s)`
      : `❌ Refuser TOUS les participants pour cette question ?\n\n"${question.text}"\n\n${lobby.participants.length} participant(s) concerné(s)`;
    
    if (!window.confirm(confirmMessage)) return;

    // Valider tous les participants qui ont répondu
    lobby.participants.forEach(participant => {
      const hasAnswer = participant.answersByQuestionId?.[question.id] !== undefined;
      const alreadyValidated = participant.validationsByQuestionId?.[question.id] !== undefined;
      
      if (hasAnswer && !alreadyValidated) {
        onValidateAnswer(lobby.id, participant.participantId, question.id, isCorrect);
      }
    });
  };

  if (finishedLobbies.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
        <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p className="text-xl text-gray-600 dark:text-gray-400">Aucun quiz terminé</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center">
          <h3 className="text-2xl font-bold dark:text-white">Validation des réponses</h3>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {finishedLobbies.length} quiz terminé{finishedLobbies.length > 1 ? 's' : ''}
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          💡 Les réponses sont regroupées par question pour faciliter la validation en débrief
        </p>
      </div>

      {finishedLobbies.map(lobby => {
        const quiz = quizzes.find(q => q.id === lobby.quizId);
        
        // ✅ Utiliser les bonnes questions (mélangées ou non)
        const questions = lobby.shuffled && lobby.shuffledQuestions 
          ? lobby.shuffledQuestions 
          : quiz?.questions || [];
        
        const isLobbyExpanded = expandedLobbies[lobby.id] !== false; // Par défaut ouvert
        
        // Calculer les statistiques du lobby
        const totalQuestions = questions.length;
        const totalParticipants = lobby.participants?.length || 0;
        const totalValidations = lobby.participants?.reduce((acc, p) => 
          acc + Object.keys(p.validationsByQuestionId || {}).length, 0
        );
        const totalPossible = totalQuestions * totalParticipants;
        const progressPercent = totalPossible > 0 ? (totalValidations / totalPossible) * 100 : 0;
        
        return (
          <div key={lobby.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            {/* Header du lobby */}
            <div 
              className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30 transition"
              onClick={() => toggleLobby(lobby.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="text-2xl font-bold dark:text-white">{quiz?.title}</h4>
                    {lobby.shuffled && (
                      <span className="px-3 py-1 bg-purple-200 dark:bg-purple-900/50 text-purple-800 dark:text-purple-300 rounded-full text-sm flex items-center gap-1">
                        🔀 Aléatoire
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>{totalParticipants} participant{totalParticipants > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Trophy className="w-4 h-4" />
                      <span>{totalQuestions} question{totalQuestions > 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" />
                      <span>{totalValidations} / {totalPossible} validations</span>
                    </div>
                  </div>
                  
                  {/* Barre de progression */}
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                      <span>Progression de la validation</span>
                      <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          progressPercent === 100 ? 'bg-green-500' : 'bg-purple-600 dark:bg-purple-500'
                        }`}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                <button className="ml-4 p-2 hover:bg-purple-200 dark:hover:bg-purple-800 rounded-lg transition">
                  {isLobbyExpanded ? (
                    <ChevronUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  ) : (
                    <ChevronDown className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Contenu du lobby */}
            {isLobbyExpanded && (
              <div className="p-6">
                {/* ✅ NOUVEAU: Regroupement par question */}
                <div className="space-y-4">
                  {questions.map((question, displayIndex) => {
                    const questionKey = `${lobby.id}-${question.id}`;
                    const isExpanded = expandedQuestions[questionKey] !== false; // Par défaut ouvert
                    
                    // Récupérer toutes les réponses pour cette question
                    const responses = lobby.participants.map(participant => ({
                      participant,
                      answer: participant.answersByQuestionId?.[question.id],
                      validation: participant.validationsByQuestionId?.[question.id]
                    }));
                    
                    const answeredCount = responses.filter(r => r.answer !== undefined).length;
                    const validatedCount = responses.filter(r => r.validation === true).length;
                    const rejectedCount = responses.filter(r => r.validation === false).length;
                    const pendingCount = answeredCount - validatedCount - rejectedCount;
                    
                    return (
                      <div key={question.id} className="border-2 border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
                        {/* Header de la question */}
                        <div 
                          className={`p-4 cursor-pointer transition ${
                            pendingCount === 0 
                              ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30' 
                              : 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
                          }`}
                          onClick={() => toggleQuestion(lobby.id, question.id)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-lg text-purple-600 dark:text-purple-400">
                                  Q{displayIndex + 1}
                                </span>
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
                                <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded">
                                  {question.points || 1} pts
                                </span>
                              </div>
                              
                              <p className="font-semibold text-gray-900 dark:text-white mb-2">
                                {question.text}
                              </p>
                              
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                  <span className="text-green-700 dark:text-green-400 font-semibold">
                                    {validatedCount} validé{validatedCount > 1 ? 's' : ''}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                  <span className="text-red-700 dark:text-red-400 font-semibold">
                                    {rejectedCount} refusé{rejectedCount > 1 ? 's' : ''}
                                  </span>
                                </div>
                                {pendingCount > 0 && (
                                  <div className="flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                                    <span className="text-yellow-700 dark:text-yellow-400 font-semibold">
                                      {pendingCount} en attente
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              {pendingCount === 0 ? (
                                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                              ) : (
                                <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 animate-pulse" />
                              )}
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Contenu de la question */}
                        {isExpanded && (
                          <div className="p-4 bg-white dark:bg-gray-800">
                            {/* Réponse attendue */}
                            <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-700 rounded-lg p-3 mb-4">
                              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-semibold">
                                ✅ RÉPONSE CORRECTE :
                              </p>
                              <p className="font-bold text-green-700 dark:text-green-400 text-lg">
                                {question.answer}
                              </p>
                            </div>

                            {/* ✅ NOUVEAU: Boutons de validation groupée */}
                            {pendingCount > 0 && (
                              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-4">
                                <p className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                                  🚀 Validation rapide ({pendingCount} en attente)
                                </p>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => validateAllForQuestion(lobby, question, true)}
                                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold flex items-center justify-center gap-2 transition"
                                  >
                                    <CheckCircle className="w-5 h-5" />
                                    ✅ Tout le monde a bon
                                  </button>
                                  <button
                                    onClick={() => validateAllForQuestion(lobby, question, false)}
                                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold flex items-center justify-center gap-2 transition"
                                  >
                                    <XCircle className="w-5 h-5" />
                                    ❌ Tout le monde a faux
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Liste des réponses */}
                            <div className="space-y-2">
                              {responses.map(({ participant, answer, validation }) => {
                                const hasAnswer = answer !== undefined;
                                
                                return (
                                  <div 
                                    key={participant.participantId}
                                    className={`border-2 rounded-lg p-3 transition ${
                                      validation === true ? 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20' :
                                      validation === false ? 'border-red-500 dark:border-red-600 bg-red-50 dark:bg-red-900/20' :
                                      hasAnswer ? 'border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' :
                                      'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                                    }`}
                                  >
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="font-bold dark:text-white">
                                            {participant.pseudo}
                                          </span>
                                          <span className="text-sm text-gray-600 dark:text-gray-400">
                                            ({participant.teamName})
                                          </span>
                                        </div>
                                        
                                        <div className={`rounded p-2 ${
                                          !hasAnswer ? 'bg-gray-100 dark:bg-gray-700' :
                                          validation === true ? 'bg-green-100 dark:bg-green-900/30' :
                                          validation === false ? 'bg-red-100 dark:bg-red-900/30' :
                                          'bg-white dark:bg-gray-700'
                                        }`}>
                                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                            {!hasAnswer ? '❌ Pas de réponse' : '📝 Réponse :'}
                                          </p>
                                          <p className={`font-bold ${
                                            !hasAnswer ? 'text-gray-500 dark:text-gray-400 italic' :
                                            validation === true ? 'text-green-700 dark:text-green-400' :
                                            validation === false ? 'text-red-700 dark:text-red-400' :
                                            'text-gray-900 dark:text-white'
                                          }`}>
                                            {hasAnswer ? answer : '(Aucune réponse)'}
                                          </p>
                                        </div>
                                      </div>
                                      
                                      <div className="ml-3">
                                        {validation === undefined && hasAnswer ? (
                                          <div className="flex flex-col gap-1">
                                            <button
                                              onClick={() => onValidateAnswer(lobby.id, participant.participantId, question.id, true)}
                                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-1 whitespace-nowrap"
                                            >
                                              <Check className="w-3 h-3" />
                                              Valider
                                            </button>
                                            <button
                                              onClick={() => onValidateAnswer(lobby.id, participant.participantId, question.id, false)}
                                              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm flex items-center gap-1 whitespace-nowrap"
                                            >
                                              <XCircle className="w-3 h-3" />
                                              Refuser
                                            </button>
                                          </div>
                                        ) : validation !== undefined ? (
                                          <div className={`px-3 py-2 rounded font-bold text-sm flex items-center gap-1 ${
                                            validation ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                          }`}>
                                            {validation ? (
                                              <>
                                                <CheckCircle className="w-4 h-4" />
                                                Validé
                                              </>
                                            ) : (
                                              <>
                                                <XCircle className="w-4 h-4" />
                                                Refusé
                                              </>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="px-3 py-2 text-gray-400 dark:text-gray-500 text-sm">
                                            -
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ValidationView;