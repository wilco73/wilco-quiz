import React, { useState } from 'react';
import { History, Trophy, Clock, Users, ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';

// Composant de pagination
const Pagination = ({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }) => {
  if (totalPages <= 1) return null;
  
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  return (
    <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
      <span className="text-sm text-gray-600 dark:text-gray-400">
        {startItem}-{endItem} sur {totalItems}
      </span>
      <div className="flex items-center gap-2">
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
    </div>
  );
};

const HistoryView = ({ currentUser, lobbies, quizzes, onViewResults, onBack }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  // Lobbies terminés où le participant a joué
  const myFinishedLobbies = lobbies
    .filter(l => 
      l.status === 'finished' && 
      l.participants?.some(p => p.participantId === currentUser.id)
    )
    .sort((a, b) => b.createdAt - a.createdAt); // Plus récent en premier
  
  const totalPages = Math.ceil(myFinishedLobbies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedLobbies = myFinishedLobbies.slice(startIndex, startIndex + itemsPerPage);

  const formatDate = (timestamp) => {
    return new Date(timestamp).toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 dark:bg-blue-900/50 rounded-full p-3">
                <History className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-2xl font-bold dark:text-white">Mon historique</h2>
                <p className="text-gray-600 dark:text-gray-400">
                  {myFinishedLobbies.length} quiz termine{myFinishedLobbies.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <button
              onClick={onBack}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </button>
          </div>
        </div>

        {/* Liste des quiz terminés */}
        {myFinishedLobbies.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
            <History className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <p className="text-xl text-gray-600 dark:text-gray-400">Aucun quiz dans votre historique</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Participez a des quiz pour les voir apparaitre ici
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="space-y-4">
              {paginatedLobbies.map(lobby => {
                const quiz = quizzes.find(q => q.id === lobby.quizId);
                const myParticipation = lobby.participants.find(p => p.participantId === currentUser.id);
                const validations = myParticipation?.validationsByQuestionId || {};
                const myValidatedCount = Object.values(validations).filter(v => v === true).length;
                const myRefusedCount = Object.values(validations).filter(v => v === false).length;
                const totalQuestions = quiz?.questions?.length || 0;
                const pendingCount = totalQuestions - myValidatedCount - myRefusedCount;
                const scorePercent = totalQuestions > 0 ? Math.round((myValidatedCount / totalQuestions) * 100) : 0;
                
                return (
                  <div 
                    key={lobby.id} 
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold dark:text-white mb-2">{quiz?.title || 'Quiz'}</h3>
                        
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {formatDate(lobby.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {lobby.participants?.length || 0} participants
                          </span>
                        </div>
                        
                        {/* Statistiques */}
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full transition-all" 
                                style={{ width: `${scorePercent}%` }} 
                              />
                            </div>
                            <span className="text-sm font-semibold dark:text-white">{scorePercent}%</span>
                          </div>
                          
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-green-600 dark:text-green-400 font-semibold">
                              ✓ {myValidatedCount}
                            </span>
                            <span className="text-red-600 dark:text-red-400 font-semibold">
                              ✗ {myRefusedCount}
                            </span>
                            {pendingCount > 0 && (
                              <span className="text-orange-600 dark:text-orange-400">
                                ⏳ {pendingCount} en attente
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => onViewResults(lobby)}
                        className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                      >
                        <Trophy className="w-4 h-4" />
                        Voir resultats
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={myFinishedLobbies.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryView;
