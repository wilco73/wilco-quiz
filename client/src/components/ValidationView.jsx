import React from 'react';
import { Trophy, Check, XCircle } from 'lucide-react';

const ValidationView = ({ lobbies, quizzes, onValidateAnswer }) => {
  const finishedLobbies = lobbies.filter(l => l.status === 'finished');

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
        <h3 className="text-2xl font-bold dark:text-white">Validation des réponses</h3>
      </div>

      {finishedLobbies.map(lobby => {
        const quiz = quizzes.find(q => q.id === lobby.quizId);
        return (
          <div key={lobby.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h4 className="text-xl font-bold mb-4 dark:text-white">{quiz?.title}</h4>
            {lobby.participants?.map(participant => (
              <div key={participant.participantId} className="mb-6 border-b dark:border-gray-700 pb-4">
                <h5 className="font-bold mb-3 dark:text-white">{participant.pseudo} ({participant.teamName})</h5>
                {quiz?.questions.map((question, qIndex) => {
                  const answer = participant.answers?.[qIndex];
                  const isValidated = participant.validations?.[qIndex];
                  
                  return (
                    <div 
                      key={qIndex} 
                      className={`mb-3 p-3 rounded-lg border-2 ${
                        isValidated === true ? 'border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20' :
                        isValidated === false ? 'border-red-500 dark:border-red-600 bg-red-50 dark:bg-red-900/20' :
                        'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
                      }`}
                    >
                      <p className="font-semibold text-sm mb-1 dark:text-white">Q{qIndex + 1}: {question.text}</p>
                      <p className="text-xs mb-1 dark:text-gray-400">Attendu: <span className="font-bold">{question.answer}</span></p>
                      <p className="text-xs mb-2 dark:text-gray-400">Répondu: <span className="font-bold">{answer || '(vide)'}</span></p>

                      {isValidated === undefined && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => onValidateAnswer(lobby.id, participant.participantId, qIndex, true)}
                            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center gap-1"
                          >
                            <Check className="w-3 h-3" />
                            Valider ({question.points || 1} pts)
                          </button>
                          <button
                            onClick={() => onValidateAnswer(lobby.id, participant.participantId, qIndex, false)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" />
                            Refuser
                          </button>
                        </div>
                      )}

                      {isValidated !== undefined && (
                        <p className={`font-bold text-sm ${isValidated ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {isValidated ? '✓ Validé' : '✗ Refusé'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default ValidationView;