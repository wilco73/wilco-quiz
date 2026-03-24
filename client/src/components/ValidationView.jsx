import React, { useState } from 'react';
import { Trophy, Check, XCircle, Users, ChevronDown, ChevronUp, AlertCircle, RotateCcw, ChevronLeft, ChevronRight, Image as ImageIcon, Video as VideoIcon, Music, Archive, Clipboard } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Composant pour afficher les médias en miniature
const MediaPreview = ({ question }) => {
  if (!question?.media) return null;
  
  return (
    <div className="mt-2 mb-3">
      {(question.type === 'image' || question.type === 'qcm') && (
        <img 
          src={question.media} 
          alt="Media" 
          className="max-h-16 sm:max-h-20 md:max-h-24 w-auto rounded border border-gray-300 dark:border-gray-600"
        />
      )}
      {question.type === 'video' && (
        <video 
          src={question.media}
          controls
          playsInline
          className="max-h-16 sm:max-h-20 md:max-h-24 w-auto rounded border border-gray-300 dark:border-gray-600"
        />
      )}
      {question.type === 'audio' && (
        <audio 
          src={question.media}
          controls
          className="w-full max-w-[200px] sm:max-w-xs h-8 sm:h-10"
        />
      )}
    </div>
  );
};

// Composant de pagination
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  
  return (
    <div className="flex justify-center items-center gap-1 sm:gap-2 mt-4">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-2 py-1.5 sm:px-3 sm:py-1 bg-gray-200 dark:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-500 transition active:scale-[0.98]"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm dark:text-white min-w-[60px] text-center">
        {currentPage} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="px-2 py-1.5 sm:px-3 sm:py-1 bg-gray-200 dark:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-500 transition active:scale-[0.98]"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

const ValidationView = ({ lobbies, quizzes, onValidateAnswer }) => {
  // Filtrer les lobbies terminés et NON archivés
  const finishedLobbies = lobbies.filter(l => l.status === 'finished' && !l.archived);
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [expandedLobbies, setExpandedLobbies] = useState({});
  const [viewMode, setViewMode] = useState('team');
  const [questionsPage, setQuestionsPage] = useState({});
  const questionsPerPage = 5;

  const toggleQuestion = (lobbyId, questionId) => {
    const key = `${lobbyId}-${questionId}`;
    setExpandedQuestions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleLobby = (lobbyId) => {
    setExpandedLobbies(prev => ({ ...prev, [lobbyId]: !prev[lobbyId] }));
  };

  const validateTeamForQuestion = (lobby, question, teamName, isCorrect, points) => {
    const teamMembers = lobby.participants.filter(p => p.teamName === teamName);
    teamMembers.forEach(participant => {
      onValidateAnswer(lobby.id, participant.participantId, question.id, isCorrect, isCorrect ? points : 0);
    });
  };

  const toggleValidation = (lobby, question, participantId, currentValidation, points) => {
    const newValidation = !currentValidation;
    onValidateAnswer(lobby.id, participantId, question.id, newValidation, newValidation ? points : 0);
  };

  const validateAllForQuestion = (lobby, question, isCorrect, points) => {
    if (!window.confirm(isCorrect ? 'Valider TOUS les participants ?' : 'Refuser TOUS les participants ?')) return;
    lobby.participants.forEach(participant => {
      onValidateAnswer(lobby.id, participant.participantId, question.id, isCorrect, isCorrect ? points : 0);
    });
  };

  const archiveLobby = async (lobbyId) => {
    if (!window.confirm('Archiver ce lobby ? Il ne sera plus visible dans la validation mais restera accessible.')) return;
    try {
      await fetch(`${API_URL}/lobbies/${lobbyId}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ archived: true })
      });
    } catch (error) {
      console.error('Erreur archivage:', error);
    }
  };

  if (finishedLobbies.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 sm:p-8 md:p-12 text-center">
        <Trophy className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 mx-auto text-gray-400 mb-4" />
        <p className="text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-400">Aucun quiz à valider</p>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-500 mt-2">Les quiz terminés apparaîtront ici</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 sm:p-4 md:p-6">
        {/* Header avec titre et toggle mode */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold dark:text-white">Validation des réponses</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('team')}
              className={`flex-1 sm:flex-none px-2 sm:px-3 md:px-4 py-2 rounded-lg flex items-center justify-center gap-1 sm:gap-2 transition text-xs sm:text-sm md:text-base active:scale-[0.98] ${
                viewMode === 'team' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Équipe
            </button>
            <button
              onClick={() => setViewMode('individual')}
              className={`flex-1 sm:flex-none px-2 sm:px-3 md:px-4 py-2 rounded-lg flex items-center justify-center gap-1 sm:gap-2 transition text-xs sm:text-sm md:text-base active:scale-[0.98] ${
                viewMode === 'individual' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              Individuel
            </button>
          </div>
        </div>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
          {viewMode === 'team' 
            ? '👥 Vue par équipe : validez une équipe si au moins un membre a la bonne réponse.'
            : '👤 Vue individuelle : validez chaque participant séparément.'
          }
        </p>
      </div>

      {finishedLobbies.map(lobby => {
        const quiz = quizzes.find(q => q.id === lobby.quizId);
        const questions = lobby.shuffled && lobby.shuffledQuestions ? lobby.shuffledQuestions : quiz?.questions || [];
        const isLobbyExpanded = expandedLobbies[lobby.id] !== false;
        
        const currentQPage = questionsPage[lobby.id] || 1;
        const totalQPages = Math.ceil(questions.length / questionsPerPage);
        const startQIndex = (currentQPage - 1) * questionsPerPage;
        const paginatedQuestions = questions.slice(startQIndex, startQIndex + questionsPerPage);

        const teamGroups = {};
        const noTeamParticipants = [];
        lobby.participants?.forEach(p => {
          if (p.teamName) {
            if (!teamGroups[p.teamName]) teamGroups[p.teamName] = [];
            teamGroups[p.teamName].push(p);
          } else {
            noTeamParticipants.push(p);
          }
        });

        const totalParticipants = lobby.participants?.length || 0;
        const totalValidations = lobby.participants?.reduce((acc, p) => acc + Object.keys(p.validationsByQuestionId || {}).length, 0) || 0;
        const maxValidations = questions.length * totalParticipants;
        const progressPercent = maxValidations > 0 ? (totalValidations / maxValidations) * 100 : 0;

        return (
          <div key={lobby.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            {/* Header du lobby - cliquable */}
            <div 
              className="p-3 sm:p-4 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 cursor-pointer"
              onClick={() => toggleLobby(lobby.id)}
            >
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="text-base sm:text-lg md:text-xl font-bold dark:text-white truncate">{quiz?.title || 'Quiz'}</h4>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    {totalParticipants} participant{totalParticipants > 1 ? 's' : ''} • {Object.keys(teamGroups).length} équipe{Object.keys(teamGroups).length > 1 ? 's' : ''} • {questions.length} question{questions.length > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4">
                  <div className="text-left sm:text-right">
                    <p className="text-xs sm:text-sm font-semibold dark:text-white">{Math.round(progressPercent)}% validé</p>
                    <div className="w-20 sm:w-24 md:w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 sm:h-2">
                      <div className="bg-green-500 h-1.5 sm:h-2 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                  {progressPercent === 100 && (
                    <button
                      onClick={(e) => { e.stopPropagation(); archiveLobby(lobby.id); }}
                      className="px-2 sm:px-3 py-1.5 sm:py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-1 text-xs sm:text-sm active:scale-[0.98]"
                      title="Archiver ce lobby"
                    >
                      <Archive className="w-3 h-3 sm:w-4 sm:h-4" />
                      <span className="hidden sm:inline">Archiver</span>
                    </button>
                  )}
                  {isLobbyExpanded ? <ChevronUp className="w-5 h-5 flex-shrink-0 dark:text-white" /> : <ChevronDown className="w-5 h-5 flex-shrink-0 dark:text-white" />}
                </div>
              </div>
            </div>

            {/* Contenu du lobby déplié */}
            {isLobbyExpanded && (
              <div className="p-2 sm:p-3 md:p-4 space-y-2 sm:space-y-3 md:space-y-4">
                {paginatedQuestions.map((question, qIndex) => {
                  const actualIndex = startQIndex + qIndex;
                  const key = `${lobby.id}-${question.id}`;
                  const isExpanded = expandedQuestions[key] !== false;
                  const points = question.points || 1;

                  return (
                    <div key={question.id} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                      {/* Header de la question */}
                      <div 
                        className="p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 cursor-pointer"
                        onClick={() => toggleQuestion(lobby.id, question.id)}
                      >
                        <div className="flex flex-col gap-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <span className="font-semibold dark:text-white text-sm sm:text-base">Q{actualIndex + 1}.</span>
                              <span className="ml-1 dark:text-gray-300 text-xs sm:text-sm md:text-base line-clamp-2">{question.text}</span>
                              <span className="ml-1 text-xs text-purple-600 dark:text-purple-400">({points} pt{points > 1 ? 's' : ''})</span>
                            </div>
                            <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                              {question.type !== 'qcm' && (
                                <>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); validateAllForQuestion(lobby, question, true, points); }}
                                    className="p-1.5 sm:px-2 sm:py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600 active:scale-[0.98]"
                                    title="Valider tous"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); validateAllForQuestion(lobby, question, false, 0); }}
                                    className="p-1.5 sm:px-2 sm:py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600 active:scale-[0.98]"
                                    title="Refuser tous"
                                  >
                                    <XCircle className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                              {isExpanded ? <ChevronUp className="w-4 h-4 sm:w-5 sm:h-5 dark:text-white" /> : <ChevronDown className="w-4 h-4 sm:w-5 sm:h-5 dark:text-white" />}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Contenu de la question dépliée */}
                      {isExpanded && (
                        <div className="p-2 sm:p-3 space-y-2">
                          {/* Aperçu du média */}
                          <MediaPreview question={question} />
                          
                          <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-2 sm:mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <strong>Réponse attendue :</strong> <span className="break-all">{question.answer}</span>
                          </div>

                          {/* Vue par équipe */}
                          {viewMode === 'team' && (
                            <div className="space-y-2 sm:space-y-3">
                              {Object.entries(teamGroups).map(([teamName, members]) => {
                                const teamAnswers = members.map(m => ({
                                  pseudo: m.pseudo,
                                  answer: m.answersByQuestionId?.[question.id] || '',
                                  validation: m.validationsByQuestionId?.[question.id],
                                  participantId: m.participantId
                                }));
                                
                                const hasCorrectAnswer = teamAnswers.some(a => 
                                  a.answer.toLowerCase().trim() === question.answer.toLowerCase().trim()
                                );
                                const allValidated = teamAnswers.every(a => a.validation !== undefined);
                                const teamValidation = teamAnswers[0]?.validation;

                                return (
                                  <div key={teamName} className={`p-2 sm:p-3 rounded-lg border-2 ${
                                    teamValidation === true ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                                    : teamValidation === false ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                    : 'border-gray-200 dark:border-gray-600'
                                  }`}>
                                    <div className="flex flex-col gap-2">
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 sm:mb-2 flex-wrap">
                                          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-600 flex-shrink-0" />
                                          <span className="font-semibold dark:text-white text-sm sm:text-base">{teamName}</span>
                                          {hasCorrectAnswer && !allValidated && (
                                            <span className="text-xs bg-yellow-200 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 px-1.5 sm:px-2 py-0.5 rounded">
                                              Bonne réponse
                                            </span>
                                          )}
                                        </div>
                                        <div className="space-y-0.5 sm:space-y-1">
                                          {teamAnswers.map(a => (
                                            <div key={a.participantId} className="text-xs sm:text-sm flex flex-wrap items-center gap-1">
                                              <span className="text-gray-500 dark:text-gray-400">{a.pseudo}:</span>
                                              <span className={`break-all ${a.answer.toLowerCase().trim() === question.answer.toLowerCase().trim()
                                                ? 'text-green-600 dark:text-green-400 font-semibold' : 'dark:text-gray-300'
                                              }`}>
                                                {a.answer || '(vide)'}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      
                                      {/* Boutons de validation équipe */}
                                      <div className="flex gap-1 sm:gap-2">
                                        {allValidated ? (
                                          <button
                                            onClick={() => validateTeamForQuestion(lobby, question, teamName, !teamValidation, points)}
                                            className={`flex-1 sm:flex-none px-2 sm:px-3 py-2 rounded-lg flex items-center justify-center gap-1 text-xs sm:text-sm active:scale-[0.98] ${
                                              teamValidation ? 'bg-green-500 hover:bg-red-500 text-white' : 'bg-red-500 hover:bg-green-500 text-white'
                                            }`}
                                            title="Cliquez pour inverser"
                                          >
                                            <RotateCcw className="w-3 h-3 sm:w-4 sm:h-4" />
                                            {teamValidation ? '✓ Validé' : '✗ Refusé'}
                                          </button>
                                        ) : (
                                          <>
                                            <button
                                              onClick={() => validateTeamForQuestion(lobby, question, teamName, true, points)}
                                              className="flex-1 sm:flex-none px-2 sm:px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center justify-center gap-1 text-xs sm:text-sm active:scale-[0.98]"
                                            >
                                              <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                                              Valider
                                            </button>
                                            <button
                                              onClick={() => validateTeamForQuestion(lobby, question, teamName, false, 0)}
                                              className="flex-1 sm:flex-none px-2 sm:px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center justify-center gap-1 text-xs sm:text-sm active:scale-[0.98]"
                                            >
                                              <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                              Refuser
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {/* Participants sans équipe */}
                              {noTeamParticipants.length > 0 && (
                                <div className="p-2 sm:p-3 rounded-lg border-2 border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20">
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-600" />
                                    <span className="font-semibold dark:text-white text-sm sm:text-base">Sans équipe</span>
                                  </div>
                                  {noTeamParticipants.map(p => {
                                    const answer = p.answersByQuestionId?.[question.id] || '';
                                    const validation = p.validationsByQuestionId?.[question.id];
                                    
                                    return (
                                      <div key={p.participantId} className="flex flex-wrap justify-between items-center py-1 gap-2">
                                        <div className="text-xs sm:text-sm min-w-0 flex-1">
                                          <span className="text-gray-500 dark:text-gray-400">{p.pseudo}:</span>
                                          <span className="ml-1 dark:text-gray-300 break-all">{answer || '(vide)'}</span>
                                        </div>
                                        {validation !== undefined ? (
                                          <button
                                            onClick={() => toggleValidation(lobby, question, p.participantId, validation, points)}
                                            className={`px-2 py-1.5 rounded text-xs flex items-center gap-1 active:scale-[0.98] ${
                                              validation ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                                            }`}
                                          >
                                            <RotateCcw className="w-3 h-3" />
                                            {validation ? '✓' : '✗'}
                                          </button>
                                        ) : (
                                          <div className="flex gap-1">
                                            <button
                                              onClick={() => onValidateAnswer(lobby.id, p.participantId, question.id, true, points)}
                                              className="px-2 py-1.5 bg-green-500 text-white rounded text-xs active:scale-[0.98]"
                                            >✓</button>
                                            <button
                                              onClick={() => onValidateAnswer(lobby.id, p.participantId, question.id, false, 0)}
                                              className="px-2 py-1.5 bg-red-500 text-white rounded text-xs active:scale-[0.98]"
                                            >✗</button>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Vue individuelle */}
                          {viewMode === 'individual' && (
                            <div className="space-y-1.5 sm:space-y-2">
                              {lobby.participants?.map(participant => {
                                const answer = participant.answersByQuestionId?.[question.id] || '';
                                const validation = participant.validationsByQuestionId?.[question.id];
                                const isCorrectAnswer = answer.toLowerCase().trim() === question.answer.toLowerCase().trim();
                                const hasPasted = participant.pastedByQuestionId?.[question.id];

                                return (
                                  <div key={participant.participantId} className={`p-2 rounded flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 ${
                                    validation === true ? 'bg-green-50 dark:bg-green-900/20' 
                                    : validation === false ? 'bg-red-50 dark:bg-red-900/20'
                                    : 'bg-gray-50 dark:bg-gray-700'
                                  }`}>
                                    <div className="flex flex-wrap items-center gap-1 min-w-0 text-xs sm:text-sm">
                                      <span className="font-semibold dark:text-white">{participant.pseudo}</span>
                                      {participant.teamName && (
                                        <span className="text-xs text-purple-600 dark:text-purple-400">({participant.teamName})</span>
                                      )}
                                      <span className={`break-all ${isCorrectAnswer ? 'text-green-600 dark:text-green-400' : 'dark:text-gray-300'}`}>
                                        : {answer || '(vide)'}
                                      </span>
                                      {hasPasted && (
                                        <Clipboard 
                                          className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500 dark:text-orange-400 flex-shrink-0" 
                                          title="Copier-coller détecté"
                                        />
                                      )}
                                    </div>
                                    
                                    {validation !== undefined ? (
                                      <button
                                        onClick={() => toggleValidation(lobby, question, participant.participantId, validation, points)}
                                        className={`self-end sm:self-auto px-2 sm:px-3 py-1.5 rounded flex items-center gap-1 text-xs sm:text-sm active:scale-[0.98] ${
                                          validation ? 'bg-green-500 hover:bg-red-500 text-white' : 'bg-red-500 hover:bg-green-500 text-white'
                                        }`}
                                        title="Cliquez pour inverser"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        {validation ? 'Correct' : 'Incorrect'}
                                      </button>
                                    ) : (
                                      <div className="flex gap-1 self-end sm:self-auto">
                                        <button
                                          onClick={() => onValidateAnswer(lobby.id, participant.participantId, question.id, true, points)}
                                          className="px-2 sm:px-3 py-1.5 bg-green-500 text-white rounded hover:bg-green-600 active:scale-[0.98]"
                                        >
                                          <Check className="w-3 h-3 sm:w-4 sm:h-4" />
                                        </button>
                                        <button
                                          onClick={() => onValidateAnswer(lobby.id, participant.participantId, question.id, false, 0)}
                                          className="px-2 sm:px-3 py-1.5 bg-red-500 text-white rounded hover:bg-red-600 active:scale-[0.98]"
                                        >
                                          <XCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
                
                <Pagination
                  currentPage={currentQPage}
                  totalPages={totalQPages}
                  onPageChange={(page) => setQuestionsPage(prev => ({ ...prev, [lobby.id]: page }))}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ValidationView;
