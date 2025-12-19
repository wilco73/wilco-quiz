import React, { useState } from 'react';
import { Trophy, Check, XCircle, Users, ChevronDown, ChevronUp, AlertCircle, RotateCcw, ChevronLeft, ChevronRight, Image as ImageIcon, Video as VideoIcon, Music } from 'lucide-react';

// Composant pour afficher les médias en miniature
const MediaPreview = ({ question }) => {
  if (!question?.media) return null;
  
  return (
    <div className="mt-2 mb-3">
      {(question.type === 'image' || question.type === 'qcm') && (
        <img 
          src={question.media} 
          alt="Media" 
          className="max-h-24 w-auto rounded border border-gray-300 dark:border-gray-600"
        />
      )}
      {question.type === 'video' && (
        <video 
          src={question.media}
          controls
          className="max-h-24 w-auto rounded border border-gray-300 dark:border-gray-600"
        />
      )}
      {question.type === 'audio' && (
        <audio 
          src={question.media}
          controls
          className="w-full max-w-xs"
        />
      )}
    </div>
  );
};

// Composant de pagination
const Pagination = ({ currentPage, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null;
  
  return (
    <div className="flex justify-center items-center gap-2 mt-4">
      <button
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-500 transition"
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <span className="px-3 py-1 text-sm dark:text-white">
        {currentPage} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="px-3 py-1 bg-gray-200 dark:bg-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-500 transition"
      >
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};

const ValidationView = ({ lobbies, quizzes, onValidateAnswer }) => {
  const finishedLobbies = lobbies.filter(l => l.status === 'finished');
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

  if (finishedLobbies.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
        <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
        <p className="text-xl text-gray-600 dark:text-gray-400">Aucun quiz termine</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold dark:text-white">Validation des reponses</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('team')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                viewMode === 'team' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Users className="w-4 h-4" />
              Par equipe
            </button>
            <button
              onClick={() => setViewMode('individual')}
              className={`px-4 py-2 rounded-lg flex items-center gap-2 transition ${
                viewMode === 'individual' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              Individuel
            </button>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {viewMode === 'team' 
            ? '👥 Vue par equipe : validez une equipe si au moins un membre a la bonne reponse. Cliquez sur une validation pour la corriger.'
            : '👤 Vue individuelle : validez chaque participant separement. Cliquez sur une validation pour la corriger.'
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
            <div 
              className="p-4 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/30 dark:to-blue-900/30 cursor-pointer"
              onClick={() => toggleLobby(lobby.id)}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-xl font-bold dark:text-white">{quiz?.title || 'Quiz'}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {totalParticipants} participants - {Object.keys(teamGroups).length} equipes - {questions.length} questions
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm font-semibold dark:text-white">{Math.round(progressPercent)}% valide</p>
                    <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
                    </div>
                  </div>
                  {isLobbyExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                </div>
              </div>
            </div>

            {isLobbyExpanded && (
              <div className="p-4 space-y-4">
                {paginatedQuestions.map((question, qIndex) => {
                  const actualIndex = startQIndex + qIndex;
                  const key = `${lobby.id}-${question.id}`;
                  const isExpanded = expandedQuestions[key] !== false;
                  const points = question.points || 1;

                  return (
                    <div key={question.id} className="border dark:border-gray-700 rounded-lg overflow-hidden">
                      <div 
                        className="p-3 bg-gray-50 dark:bg-gray-700 cursor-pointer flex justify-between items-center"
                        onClick={() => toggleQuestion(lobby.id, question.id)}
                      >
                        <div className="flex-1">
                          <span className="font-semibold dark:text-white">Q{actualIndex + 1}.</span>
                          <span className="ml-2 dark:text-gray-300">{question.text}</span>
                          <span className="ml-2 text-xs text-purple-600 dark:text-purple-400">({points} pt{points > 1 ? 's' : ''})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {question.type !== 'qcm' && (
                            <>
                              <button
                                onClick={(e) => { e.stopPropagation(); validateAllForQuestion(lobby, question, true, points); }}
                                className="px-2 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                                title="Valider tous"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); validateAllForQuestion(lobby, question, false, 0); }}
                                className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                                title="Refuser tous"
                              >
                                <XCircle className="w-3 h-3" />
                              </button>
                            </>
                          )}
                          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="p-3 space-y-2">
                          {/* Aperçu du média */}
                          <MediaPreview question={question} />
                          
                          <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                            <strong>Reponse attendue :</strong> {question.answer}
                          </div>

                          {viewMode === 'team' && (
                            <div className="space-y-3">
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
                                  <div key={teamName} className={`p-3 rounded-lg border-2 ${
                                    teamValidation === true ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                                    : teamValidation === false ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                                    : 'border-gray-200 dark:border-gray-600'
                                  }`}>
                                    <div className="flex justify-between items-start">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                          <Users className="w-4 h-4 text-purple-600" />
                                          <span className="font-semibold dark:text-white">{teamName}</span>
                                          {hasCorrectAnswer && !allValidated && (
                                            <span className="text-xs bg-yellow-200 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded">
                                              Bonne reponse detectee
                                            </span>
                                          )}
                                        </div>
                                        <div className="space-y-1">
                                          {teamAnswers.map(a => (
                                            <div key={a.participantId} className="text-sm flex items-center gap-2">
                                              <span className="text-gray-500 dark:text-gray-400">{a.pseudo}:</span>
                                              <span className={a.answer.toLowerCase().trim() === question.answer.toLowerCase().trim()
                                                ? 'text-green-600 dark:text-green-400 font-semibold' : 'dark:text-gray-300'
                                              }>
                                                {a.answer || '(pas de reponse)'}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                      
                                      <div className="flex flex-col gap-1 ml-4">
                                        {allValidated ? (
                                          <button
                                            onClick={() => validateTeamForQuestion(lobby, question, teamName, !teamValidation, points)}
                                            className={`px-3 py-2 rounded-lg flex items-center gap-1 ${
                                              teamValidation ? 'bg-green-500 hover:bg-red-500 text-white' : 'bg-red-500 hover:bg-green-500 text-white'
                                            }`}
                                            title="Cliquez pour inverser"
                                          >
                                            <RotateCcw className="w-4 h-4" />
                                            {teamValidation ? 'Correct' : 'Incorrect'}
                                          </button>
                                        ) : (
                                          <>
                                            <button
                                              onClick={() => validateTeamForQuestion(lobby, question, teamName, true, points)}
                                              className="px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-1"
                                            >
                                              <Check className="w-4 h-4" />
                                              Valider
                                            </button>
                                            <button
                                              onClick={() => validateTeamForQuestion(lobby, question, teamName, false, 0)}
                                              className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-1"
                                            >
                                              <XCircle className="w-4 h-4" />
                                              Refuser
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              
                              {noTeamParticipants.length > 0 && (
                                <div className="p-3 rounded-lg border-2 border-orange-200 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20">
                                  <div className="flex items-center gap-2 mb-2">
                                    <AlertCircle className="w-4 h-4 text-orange-600" />
                                    <span className="font-semibold dark:text-white">Sans equipe</span>
                                  </div>
                                  {noTeamParticipants.map(p => {
                                    const answer = p.answersByQuestionId?.[question.id] || '';
                                    const validation = p.validationsByQuestionId?.[question.id];
                                    
                                    return (
                                      <div key={p.participantId} className="flex justify-between items-center py-1">
                                        <div>
                                          <span className="text-gray-500 dark:text-gray-400">{p.pseudo}:</span>
                                          <span className="ml-2 dark:text-gray-300">{answer || '(vide)'}</span>
                                        </div>
                                        {validation !== undefined ? (
                                          <button
                                            onClick={() => toggleValidation(lobby, question, p.participantId, validation, points)}
                                            className={`px-2 py-1 rounded text-xs flex items-center gap-1 ${
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
                                              className="px-2 py-1 bg-green-500 text-white rounded text-xs"
                                            >✓</button>
                                            <button
                                              onClick={() => onValidateAnswer(lobby.id, p.participantId, question.id, false, 0)}
                                              className="px-2 py-1 bg-red-500 text-white rounded text-xs"
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

                          {viewMode === 'individual' && (
                            <div className="space-y-2">
                              {lobby.participants?.map(participant => {
                                const answer = participant.answersByQuestionId?.[question.id] || '';
                                const validation = participant.validationsByQuestionId?.[question.id];
                                const isCorrectAnswer = answer.toLowerCase().trim() === question.answer.toLowerCase().trim();

                                return (
                                  <div key={participant.participantId} className={`p-2 rounded flex justify-between items-center ${
                                    validation === true ? 'bg-green-50 dark:bg-green-900/20' 
                                    : validation === false ? 'bg-red-50 dark:bg-red-900/20'
                                    : 'bg-gray-50 dark:bg-gray-700'
                                  }`}>
                                    <div>
                                      <span className="font-semibold dark:text-white">{participant.pseudo}</span>
                                      {participant.teamName && (
                                        <span className="ml-2 text-xs text-purple-600 dark:text-purple-400">({participant.teamName})</span>
                                      )}
                                      <span className={`ml-2 ${isCorrectAnswer ? 'text-green-600 dark:text-green-400' : 'dark:text-gray-300'}`}>
                                        : {answer || '(vide)'}
                                      </span>
                                    </div>
                                    
                                    {validation !== undefined ? (
                                      <button
                                        onClick={() => toggleValidation(lobby, question, participant.participantId, validation, points)}
                                        className={`px-3 py-1 rounded flex items-center gap-1 ${
                                          validation ? 'bg-green-500 hover:bg-red-500 text-white' : 'bg-red-500 hover:bg-green-500 text-white'
                                        }`}
                                        title="Cliquez pour inverser"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                        {validation ? 'Correct' : 'Incorrect'}
                                      </button>
                                    ) : (
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => onValidateAnswer(lobby.id, participant.participantId, question.id, true, points)}
                                          className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                                        >
                                          <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={() => onValidateAnswer(lobby.id, participant.participantId, question.id, false, 0)}
                                          className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                                        >
                                          <XCircle className="w-4 h-4" />
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
