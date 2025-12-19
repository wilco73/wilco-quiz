import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, Trophy, Target, Users, ChevronDown, ChevronUp } from 'lucide-react';
import Avatar from './Avatar';

const QuizResultsView = ({ currentLobby, quiz, currentUser, participants, onLeaveLobby, onViewScoreboard, onBackToLobbies }) => {
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [viewMode, setViewMode] = useState('personal'); // 'personal' ou 'team'

  // Récupérer l'avatar d'un participant
  const getParticipantAvatar = (participantId) => {
    const p = participants?.find(p => p.id === participantId);
    return p?.avatar || 'default';
  };

  // Afficher un loader si données manquantes
  if (!currentLobby || !quiz || !currentUser) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Chargement des resultats...</p>
          {onBackToLobbies && (
            <button 
              onClick={onBackToLobbies}
              className="mt-4 text-purple-600 hover:text-purple-800 underline"
            >
              Retour a la liste des salles
            </button>
          )}
        </div>
      </div>
    );
  }

  // ✅ Récupérer tous les membres de l'équipe
  const teamMembers = currentLobby.participants?.filter(p => p.teamName === currentUser.teamName) || [];
  const currentParticipant = teamMembers.find(p => p.participantId === currentUser.id);
  
  if (!currentParticipant) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Participant non trouve dans le lobby</p>
          {onBackToLobbies && (
            <button 
              onClick={onBackToLobbies}
              className="mt-4 text-purple-600 hover:text-purple-800 underline"
            >
              Retour a la liste des salles
            </button>
          )}
        </div>
      </div>
    );
  }

  // ✅ Utiliser les bonnes questions (mélangées ou non)
  const questions = currentLobby.shuffled && currentLobby.shuffledQuestions 
    ? currentLobby.shuffledQuestions 
    : quiz.questions;

  const toggleQuestion = (questionId) => {
    setExpandedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  // ✅ Calculer les statistiques personnelles
  const myAnswers = currentParticipant.answersByQuestionId || {};
  const myValidations = currentParticipant.validationsByQuestionId || {};
  
  const myAnsweredCount = Object.keys(myAnswers).length;
  const myValidatedCount = Object.values(myValidations).filter(v => v === true).length;
  const myRejectedCount = Object.values(myValidations).filter(v => v === false).length;
  const myPendingCount = myAnsweredCount - myValidatedCount - myRejectedCount;
  const myTotalPoints = questions.reduce((acc, q) => {
    if (myValidations[q.id] === true) {
      return acc + (q.points || 1);
    }
    return acc;
  }, 0);

  // ✅ NOUVEAU: Calculer les statistiques de l'équipe
  const teamStats = teamMembers.map(member => {
    const validations = member.validationsByQuestionId || {};
    const answers = member.answersByQuestionId || {};
    const validatedCount = Object.values(validations).filter(v => v === true).length;
    const rejectedCount = Object.values(validations).filter(v => v === false).length;
    const answeredCount = Object.keys(answers).length;
    const pendingCount = answeredCount - validatedCount - rejectedCount;
    const totalPoints = questions.reduce((acc, q) => {
      if (validations[q.id] === true) {
        return acc + (q.points || 1);
      }
      return acc;
    }, 0);

    return {
      ...member,
      validatedCount,
      rejectedCount,
      pendingCount,
      totalPoints
    };
  }).sort((a, b) => b.totalPoints - a.totalPoints); // Tri par score décroissant

  const teamTotalPoints = teamStats.reduce((acc, member) => acc + member.totalPoints, 0);
  const teamValidatedCount = teamStats.reduce((acc, member) => acc + member.validatedCount, 0);
  const teamRejectedCount = teamStats.reduce((acc, member) => acc + member.rejectedCount, 0);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6 text-center">
          <Trophy className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
          <h2 className="text-3xl font-bold mb-2 dark:text-white">Quiz Terminé !</h2>
          <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">{quiz.title}</p>
          
          {/* Toggle Personnel / Équipe */}
          <div className="flex justify-center gap-2 mb-6">
            <button
              onClick={() => setViewMode('personal')}
              className={`px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
                viewMode === 'personal'
                  ? 'bg-purple-600 dark:bg-purple-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <Target className="w-5 h-5" />
              Mes Résultats
            </button>
            <button
              onClick={() => setViewMode('team')}
              className={`px-6 py-3 rounded-lg font-semibold transition flex items-center gap-2 ${
                viewMode === 'team'
                  ? 'bg-purple-600 dark:bg-purple-700 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              <Users className="w-5 h-5" />
              Mon Équipe ({teamMembers.length})
            </button>
          </div>

          {/* ===== VUE PERSONNELLE ===== */}
          {viewMode === 'personal' && (
            <>
              {/* Stats personnelles */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <Target className="w-8 h-8 mx-auto text-blue-600 dark:text-blue-400 mb-2" />
                  <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{myAnsweredCount}/{questions.length}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Réponses</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                  <CheckCircle className="w-8 h-8 mx-auto text-green-600 dark:text-green-400 mb-2" />
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{myValidatedCount}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Validées</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                  <XCircle className="w-8 h-8 mx-auto text-red-600 dark:text-red-400 mb-2" />
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{myRejectedCount}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Refusées</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                  <Clock className="w-8 h-8 mx-auto text-yellow-600 dark:text-yellow-400 mb-2" />
                  <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{myPendingCount}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">En attente</p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border-2 border-purple-500 dark:border-purple-600">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Votre score actuel</p>
                <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">{myTotalPoints} points</p>
                {myPendingCount > 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    ⏳ {myPendingCount} réponse{myPendingCount > 1 ? 's' : ''} en attente de validation
                  </p>
                )}
              </div>
            </>
          )}

          {/* ===== VUE ÉQUIPE ===== */}
          {viewMode === 'team' && (
            <>
              {/* Stats de l'équipe */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-6 mb-6 border-2 border-purple-300 dark:border-purple-600">
                <div className="flex items-center justify-center gap-3 mb-4">
                  <Users className="w-10 h-10 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-2xl font-bold dark:text-white">Équipe {currentUser.teamName}</h3>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{teamTotalPoints}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Points totaux</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">{teamValidatedCount}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Réponses validées</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{teamMembers.length}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Membres</p>
                  </div>
                </div>
              </div>

              {/* Classement de l'équipe */}
              <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-6">
                <h4 className="text-xl font-bold mb-4 dark:text-white flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-yellow-500" />
                  Classement Interne
                </h4>
                
                <div className="space-y-3">
                  {teamStats.map((member, index) => {
                    const isCurrentUser = member.participantId === currentUser.id;
                    const rank = index + 1;
                    
                    return (
                      <div
                        key={member.participantId}
                        className={`border-2 rounded-lg p-4 transition ${
                          isCurrentUser 
                            ? 'border-purple-500 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20 scale-105 shadow-lg' 
                            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4 flex-1">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30">
                              <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                                #{rank}
                              </span>
                            </div>
                            
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-lg dark:text-white">
                                  {member.pseudo}
                                </h4>
                                {isCurrentUser && (
                                  <span className="px-2 py-1 bg-purple-600 dark:bg-purple-700 text-white text-xs rounded-full">
                                    Vous
                                  </span>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-3 mt-1 text-sm">
                                <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                                  <CheckCircle className="w-4 h-4" />
                                  {member.validatedCount} validées
                                </span>
                                <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                                  <XCircle className="w-4 h-4" />
                                  {member.rejectedCount} refusées
                                </span>
                                {member.pendingCount > 0 && (
                                  <span className="text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {member.pendingCount} en attente
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                {member.totalPoints}
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">points</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ===== RÉCAPITULATIF DÉTAILLÉ PAR QUESTION ===== */}
        {viewMode === 'personal' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-2xl font-bold mb-4 dark:text-white">📝 Vos Réponses Détaillées</h3>
            
            <div className="space-y-4">
              {questions.map((question, index) => {
                const userAnswer = myAnswers[question.id];
                const validation = myValidations[question.id];
                const hasAnswer = userAnswer !== undefined;
                const isExpanded = expandedQuestions[question.id];
                
                let statusColor = 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700';
                let statusIcon = <Clock className="w-6 h-6 text-gray-400" />;
                let statusText = 'En attente';
                
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
                  <div key={question.id} className={`border-2 rounded-lg ${statusColor}`}>
                    {/* Header cliquable */}
                    <div 
                      className="p-4 cursor-pointer hover:opacity-80 transition"
                      onClick={() => toggleQuestion(question.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="font-bold text-purple-600 dark:text-purple-400 text-lg">
                            Q{index + 1}
                          </span>
                          {question.category && (
                            <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs rounded">
                              {question.category}
                            </span>
                          )}
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {question.points || 1} point{question.points > 1 ? 's' : ''}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {statusIcon}
                            <span className="text-sm font-semibold dark:text-white">{statusText}</span>
                          </div>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          )}
                        </div>
                      </div>
                      
                      <p className="font-semibold mt-2 dark:text-white">{question.text}</p>
                    </div>

                    {/* Détails dépliables */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-600 pt-3">
                        <div className="grid md:grid-cols-2 gap-3 mb-4">
                          <div className="bg-white dark:bg-gray-700 rounded p-3 border border-gray-200 dark:border-gray-600">
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">✅ Réponse correcte :</p>
                            <p className="font-bold text-green-700 dark:text-green-400">{question.answer}</p>
                          </div>
                          
                          <div className={`rounded p-3 border ${
                            !hasAnswer ? 'bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600' :
                            validation === true ? 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-600' :
                            validation === false ? 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-600' :
                            'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-600'
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
                          <div>
                            {question.type === 'qcm' ? (
                              // Pour les QCM : vérifier si l'équipe a vraiment gagné
                              currentParticipant.qcmTeamScored?.[question.id] ? (
                                <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-600 rounded p-3">
                                  <p className="text-green-700 dark:text-green-400 font-semibold text-sm">
                                    🎉 +{question.points || 1} point{question.points > 1 ? 's' : ''} pour votre équipe !
                                  </p>
                                  <p className="text-green-600 dark:text-green-500 text-xs mt-1">
                                    Toute l'équipe a eu juste ! ✅
                                  </p>
                                </div>
                              ) : (
                                <div className="bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-600 rounded p-3">
                                  <p className="text-orange-700 dark:text-orange-400 font-semibold text-sm">
                                    ✅ Bonne réponse !
                                  </p>
                                  <p className="text-orange-600 dark:text-orange-500 text-xs mt-1">
                                    Mais toute l'équipe doit avoir juste pour gagner les points (QCM)
                                  </p>
                                </div>
                              )
                            ) : (
                              // Pour les questions normales
                              <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-600 rounded p-3">
                                <p className="text-green-700 dark:text-green-400 font-semibold text-sm">
                                  🎉 +{question.points || 1} point{question.points > 1 ? 's' : ''} pour votre équipe !
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== RÉCAPITULATIF ÉQUIPE PAR QUESTION ===== */}
        {viewMode === 'team' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-2xl font-bold mb-4 dark:text-white flex items-center gap-2">
              <Users className="w-6 h-6" />
              Performance de l'Équipe par Question
            </h3>
            
            <div className="space-y-4">
              {questions.map((question, index) => {
                const isExpanded = expandedQuestions[question.id];
                
                // Récupérer les réponses de tous les membres de l'équipe pour cette question
                const teamAnswers = teamMembers.map(member => ({
                  member,
                  answer: member.answersByQuestionId?.[question.id],
                  validation: member.validationsByQuestionId?.[question.id]
                }));

                const validatedCount = teamAnswers.filter(ta => ta.validation === true).length;
                const rejectedCount = teamAnswers.filter(ta => ta.validation === false).length;
                const pendingCount = teamAnswers.filter(ta => ta.answer !== undefined && ta.validation === undefined).length;
                
                return (
                  <div key={question.id} className="border-2 border-gray-200 dark:border-gray-600 rounded-lg">
                    {/* Header cliquable */}
                    <div 
                      className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      onClick={() => toggleQuestion(question.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-bold text-lg text-purple-600 dark:text-purple-400">
                              Q{index + 1}
                            </span>
                            {question.category && (
                              <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs rounded">
                                {question.category}
                              </span>
                            )}
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {question.points || 1} pts
                            </span>
                          </div>
                          
                          <p className="font-semibold dark:text-white mb-3">{question.text}</p>
                          
                          <div className="flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                              <span className="text-green-700 dark:text-green-400 font-semibold">
                                {validatedCount} ✅
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                              <span className="text-red-700 dark:text-red-400 font-semibold">
                                {rejectedCount} ❌
                              </span>
                            </div>
                            {pendingCount > 0 && (
                              <div className="flex items-center gap-1">
                                <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                                <span className="text-yellow-700 dark:text-yellow-400 font-semibold">
                                  {pendingCount} ⏳
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                        )}
                      </div>
                    </div>

                    {/* Détails dépliables */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-600 pt-3">
                        {/* Réponse correcte */}
                        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-700 rounded-lg p-3 mb-4">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 font-semibold">
                            ✅ RÉPONSE CORRECTE :
                          </p>
                          <p className="font-bold text-green-700 dark:text-green-400 text-lg">
                            {question.answer}
                          </p>
                        </div>

                        {/* Réponses de chaque membre */}
                        <div className="space-y-2">
                          {teamAnswers.map(({ member, answer, validation }) => {
                            const hasAnswer = answer !== undefined;
                            const isCurrentUser = member.participantId === currentUser.id;
                            
                            return (
                              <div 
                                key={member.participantId}
                                className={`border-2 rounded-lg p-3 ${
                                  isCurrentUser ? 'border-purple-500 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20' :
                                  validation === true ? 'border-green-300 dark:border-green-600 bg-green-50 dark:bg-green-900/20' :
                                  validation === false ? 'border-red-300 dark:border-red-600 bg-red-50 dark:bg-red-900/20' :
                                  hasAnswer ? 'border-yellow-300 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20' :
                                  'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                                }`}
                              >
                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className={`font-bold ${isCurrentUser ? 'text-purple-700 dark:text-purple-400' : 'dark:text-white'}`}>
                                      {member.pseudo}
                                    </span>
                                    {isCurrentUser && (
                                      <span className="px-2 py-1 bg-purple-600 dark:bg-purple-700 text-white text-xs rounded-full">
                                        Vous
                                      </span>
                                    )}
                                  </div>
                                  
                                  {validation === true && (
                                    <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                                  )}
                                  {validation === false && (
                                    <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                                  )}
                                  {validation === undefined && hasAnswer && (
                                    <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                                  )}
                                </div>
                                
                                <p className={`text-sm mt-1 ${
                                  !hasAnswer ? 'text-gray-500 dark:text-gray-400 italic' :
                                  validation === true ? 'text-green-700 dark:text-green-400 font-semibold' :
                                  validation === false ? 'text-red-700 dark:text-red-400 font-semibold' :
                                  'text-gray-700 dark:text-gray-300 font-semibold'
                                }`}>
                                  {hasAnswer ? `Réponse: ${answer}` : 'Pas de réponse'}
                                </p>
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

        {/* Actions */}
        <div className="grid md:grid-cols-2 gap-4">
          <button
            onClick={onViewScoreboard}
            className="w-full py-4 bg-purple-600 dark:bg-purple-700 text-white rounded-lg font-semibold hover:bg-purple-700 dark:hover:bg-purple-600 flex items-center justify-center gap-2 text-lg transition"
          >
            <Trophy className="w-6 h-6" />
            Voir le Classement Général
          </button>
          <button
            onClick={onBackToLobbies}
            className="w-full py-4 bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-400 dark:hover:bg-gray-600 text-lg transition"
          >
            Quitter le Quiz
          </button>
        </div>

        {myPendingCount > 0 && (
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500 dark:border-blue-600 rounded-lg p-4 text-center">
            <Clock className="w-8 h-8 mx-auto text-blue-600 dark:text-blue-400 mb-2" />
            <p className="text-blue-800 dark:text-blue-300 font-semibold">
              ⏳ Validation en cours par l'administrateur
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
              Les scores seront mis à jour une fois toutes les réponses validées
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizResultsView;