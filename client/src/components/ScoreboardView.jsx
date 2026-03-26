import React, { useState, useMemo } from 'react';
import { Trophy, Medal, Users, TrendingUp, Star, ArrowLeft, ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const ScoreboardView = ({ teams, currentUser, onBack, embedded = false }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('all'); // 'all' = toutes catégories
  const teamsPerPage = embedded ? 10 : 5;
  
  // Extraire toutes les catégories disponibles depuis les équipes
  const allCategories = useMemo(() => {
    const categories = new Set();
    teams.forEach(team => {
      if (team.scoresByCategory) {
        Object.keys(team.scoresByCategory).forEach(cat => categories.add(cat));
      }
    });
    return Array.from(categories).sort();
  }, [teams]);
  
  // Calculer les scores selon la catégorie sélectionnée
  const getTeamScore = (team) => {
    if (selectedCategory === 'all') {
      return team.validatedScore || 0;
    }
    return team.scoresByCategory?.[selectedCategory] || 0;
  };
  
  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => getTeamScore(b) - getTeamScore(a));
  }, [teams, selectedCategory]);
  
  const userTeam = teams.find(t => t.name === currentUser?.teamName);
  const userRank = sortedTeams.findIndex(t => t.name === currentUser?.teamName) + 1;
  const userScore = userTeam ? getTeamScore(userTeam) : 0;

  // Pagination
  const totalPages = Math.ceil(sortedTeams.length / teamsPerPage);
  const startIndex = (currentPage - 1) * teamsPerPage;
  const endIndex = startIndex + teamsPerPage;
  const currentTeams = sortedTeams.slice(startIndex, endIndex);

  const getMedalIcon = (rank, small = false) => {
    const size = small ? "w-5 h-5" : "w-8 h-8";
    switch(rank) {
      case 1: return <Trophy className={`${size} text-yellow-500`} />;
      case 2: return <Medal className={`${size} text-gray-400`} />;
      case 3: return <Medal className={`${size} text-orange-600`} />;
      default: return null;
    }
  };

  const getMedalColor = (rank) => {
    switch(rank) {
      case 1: return 'bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-400';
      case 2: return 'bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-gray-400';
      case 3: return 'bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-400';
      default: return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600';
    }
  };

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };
  
  // Reset page quand on change de catégorie
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    setCurrentPage(1);
  };

  // Composant sélecteur de catégorie
  const CategorySelector = ({ compact = false }) => (
    <div className={`flex items-center gap-2 ${compact ? 'text-sm' : ''}`}>
      <Filter className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-gray-500`} />
      <select
        value={selectedCategory}
        onChange={(e) => handleCategoryChange(e.target.value)}
        className={`${compact ? 'px-2 py-1 text-sm' : 'px-3 py-2'} bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500`}
      >
        <option value="all">Toutes catégories</option>
        {allCategories.map(cat => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>
    </div>
  );

  // Version compacte pour embedded
  if (embedded) {
    return (
      <div className="h-full flex flex-col">
        {/* Header compact */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold dark:text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Classement
          </h1>
          <CategorySelector compact />
        </div>

        {/* Votre équipe - compact */}
        {userTeam && (
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 mb-4 border border-purple-300 dark:border-purple-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span className="font-semibold dark:text-white">{userTeam.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-purple-600 font-bold">#{userRank}</span>
                <span className="text-purple-600 font-bold">{userScore} pts</span>
              </div>
            </div>
          </div>
        )}

        {/* Podium inline compact */}
        {sortedTeams.length >= 3 && (
          <div className="flex gap-2 mb-4">
            {[0, 1, 2].map(idx => (
              <div key={idx} className={`flex-1 p-2 rounded-lg border text-center ${getMedalColor(idx + 1)}`}>
                <div className="flex items-center justify-center gap-1 mb-1">
                  {getMedalIcon(idx + 1, true)}
                  <span className="font-bold text-sm">{idx + 1}</span>
                </div>
                <p className="font-semibold text-sm truncate dark:text-white">{sortedTeams[idx]?.name}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{getTeamScore(sortedTeams[idx])} pts</p>
              </div>
            ))}
          </div>
        )}

        {/* Liste compacte */}
        <div className="flex-1 overflow-auto">
          <div className="space-y-1">
            {currentTeams.map((team, pageIndex) => {
              const rank = startIndex + pageIndex + 1;
              const isUserTeam = team.name === currentUser?.teamName;
              
              return (
                <div
                  key={team.id}
                  className={`flex items-center justify-between p-2 rounded-lg border ${
                    isUserTeam 
                      ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20' 
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 flex justify-center">
                      {rank <= 3 ? getMedalIcon(rank, true) : (
                        <span className="text-sm font-bold text-gray-500">#{rank}</span>
                      )}
                    </div>
                    <span className={`font-medium text-sm truncate max-w-[150px] ${isUserTeam ? 'text-purple-700 dark:text-purple-300' : 'dark:text-white'}`}>
                      {team.name}
                    </span>
                  </div>
                  <span className="font-bold text-purple-600 dark:text-purple-400 text-sm">
                    {getTeamScore(team)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pagination compacte */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t dark:border-gray-700">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 rounded disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Version complète (non embedded)
  const containerClass = "min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 dark:from-gray-900 dark:to-gray-800 p-2 sm:p-4";

  return (
    <div className={containerClass} style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
      <div className="max-w-4xl mx-auto">
        {/* Header avec bouton retour */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 sm:p-6 mb-4 sm:mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3 sm:mb-4">
            {/* Bouton Retour - seulement si pas embedded */}
            {!embedded && onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition font-semibold text-gray-800 dark:text-gray-200 text-sm sm:text-base"
              >
                <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="hidden sm:inline">Retour</span>
              </button>
            )}
            <CategorySelector />
          </div>
          
          <div className="text-center">
            <Trophy className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-yellow-500 dark:text-yellow-400 mb-3 sm:mb-4" />
            <h1 className="text-2xl sm:text-4xl font-bold mb-2 dark:text-white">🏆 Classement</h1>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
              {selectedCategory === 'all' ? 'Toutes catégories' : selectedCategory}
            </p>
          </div>
        </div>

        {/* Votre équipe */}
        {userTeam && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 sm:p-6 mb-4 sm:mb-6 border-2 sm:border-4 border-purple-500 dark:border-purple-600">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="bg-purple-100 dark:bg-purple-900/50 rounded-full p-2 sm:p-3">
                  <Users className="w-5 h-5 sm:w-8 sm:h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Votre équipe</p>
                  <h3 className="text-lg sm:text-2xl font-bold dark:text-white">{userTeam.name}</h3>
                </div>
              </div>
              <div className="flex gap-4 sm:gap-6">
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Position</p>
                  <p className="text-xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">#{userRank}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Score</p>
                  <p className="text-xl sm:text-3xl font-bold text-purple-600 dark:text-purple-400">{userScore} pts</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Podium Top 3 */}
        {sortedTeams.length >= 3 && (
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
            {/* 2ème place */}
            <div className="pt-4 sm:pt-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-2 sm:p-4 text-center border-2 sm:border-4 border-gray-400 dark:border-gray-600">
                <Medal className="w-8 h-8 sm:w-12 sm:h-12 mx-auto text-gray-400 dark:text-gray-500 mb-1 sm:mb-2" />
                <p className="text-2xl sm:text-4xl font-bold mb-1 dark:text-white">2</p>
                <h3 className="font-bold text-xs sm:text-lg mb-1 sm:mb-2 truncate dark:text-white">{sortedTeams[1]?.name}</h3>
                <p className="text-lg sm:text-2xl font-bold text-gray-600 dark:text-gray-400">{getTeamScore(sortedTeams[1])}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">points</p>
              </div>
            </div>

            {/* 1ère place */}
            <div className="pt-0">
              <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/40 rounded-lg shadow-2xl p-2 sm:p-4 text-center border-2 sm:border-4 border-yellow-500 dark:border-yellow-600">
                <Trophy className="w-10 h-10 sm:w-16 sm:h-16 mx-auto text-yellow-600 dark:text-yellow-400 mb-1 sm:mb-2 animate-bounce" />
                <p className="text-3xl sm:text-5xl font-bold mb-1 dark:text-white">1</p>
                <h3 className="font-bold text-sm sm:text-xl mb-1 sm:mb-2 truncate dark:text-white">{sortedTeams[0]?.name}</h3>
                <p className="text-xl sm:text-3xl font-bold text-yellow-700 dark:text-yellow-300">{getTeamScore(sortedTeams[0])}</p>
                <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-400 hidden sm:block">points</p>
                <Star className="w-5 h-5 sm:w-8 sm:h-8 mx-auto mt-1 sm:mt-2 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>

            {/* 3ème place */}
            <div className="pt-4 sm:pt-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-2 sm:p-4 text-center border-2 sm:border-4 border-orange-500 dark:border-orange-600">
                <Medal className="w-8 h-8 sm:w-12 sm:h-12 mx-auto text-orange-600 dark:text-orange-500 mb-1 sm:mb-2" />
                <p className="text-2xl sm:text-4xl font-bold mb-1 dark:text-white">3</p>
                <h3 className="font-bold text-xs sm:text-lg mb-1 sm:mb-2 truncate dark:text-white">{sortedTeams[2]?.name}</h3>
                <p className="text-lg sm:text-2xl font-bold text-orange-600 dark:text-orange-500">{getTeamScore(sortedTeams[2])}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">points</p>
              </div>
            </div>
          </div>
        )}

        {/* Classement complet avec pagination */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <h3 className="text-lg sm:text-2xl font-bold flex items-center gap-2 dark:text-white">
              <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" />
              <span className="hidden sm:inline">Classement Complet</span>
              <span className="sm:hidden">Classement</span>
            </h3>
            
            {/* Indicateur de page */}
            {totalPages > 1 && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} / {totalPages}
              </span>
            )}
          </div>
          
          <div className="space-y-3">
            {currentTeams.map((team, pageIndex) => {
              const rank = startIndex + pageIndex + 1;
              const isUserTeam = team.name === currentUser?.teamName;
              
              return (
                <div
                  key={team.id}
                  className={`border-2 rounded-lg p-4 transition-all ${
                    isUserTeam 
                      ? 'border-purple-500 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20 scale-105 shadow-lg' 
                      : getMedalColor(rank)
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center justify-center w-12">
                        {rank <= 3 ? (
                          getMedalIcon(rank)
                        ) : (
                          <span className="text-2xl font-bold text-gray-600 dark:text-gray-400">#{rank}</span>
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <h4 className="font-bold text-lg flex items-center gap-2 dark:text-white">
                          {team.name}
                          {isUserTeam && (
                            <span className="px-2 py-1 bg-purple-600 dark:bg-purple-700 text-white text-xs rounded-full">
                              Votre équipe
                            </span>
                          )}
                        </h4>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                          {getTeamScore(team)}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">points</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-2 rounded-lg flex items-center gap-1 transition ${
                  currentPage === 1
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 dark:bg-purple-700 text-white hover:bg-purple-700 dark:hover:bg-purple-600'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                Précédent
              </button>

              {/* Numéros de pages */}
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  // Afficher seulement quelques pages autour de la page actuelle
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={page}
                        onClick={() => goToPage(page)}
                        className={`w-10 h-10 rounded-lg font-semibold transition ${
                          page === currentPage
                            ? 'bg-purple-600 dark:bg-purple-700 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return <span key={page} className="px-2 text-gray-500">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-2 rounded-lg flex items-center gap-1 transition ${
                  currentPage === totalPages
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-purple-600 dark:bg-purple-700 text-white hover:bg-purple-700 dark:hover:bg-purple-600'
                }`}
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {sortedTeams.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Aucune équipe enregistrée</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Équipes</p>
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{teams.length}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Score Maximum</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {sortedTeams[0]?.validatedScore || 0}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 text-center">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">Score Moyen</p>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {teams.length > 0 
                ? Math.round(teams.reduce((acc, t) => acc + (t.validatedScore || 0), 0) / teams.length)
                : 0
              }
            </p>
          </div>
        </div>

        {/* Bouton Retour en bas - seulement si pas embedded */}
        {!embedded && onBack && (
          <div className="mt-6 text-center">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition font-semibold text-gray-800 dark:text-gray-200 shadow-lg"
            >
              <ArrowLeft className="w-5 h-5" />
              Retour
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoreboardView;