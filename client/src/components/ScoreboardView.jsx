import React from 'react';
import { Trophy, Medal, Users, TrendingUp, Star } from 'lucide-react';

const ScoreboardView = ({ teams, currentUser }) => {
  const sortedTeams = [...teams].sort((a, b) => (b.validatedScore || 0) - (a.validatedScore || 0));
  const userTeam = teams.find(t => t.name === currentUser?.teamName);
  const userRank = sortedTeams.findIndex(t => t.name === currentUser?.teamName) + 1;

  const getMedalIcon = (rank) => {
    switch(rank) {
      case 1: return <Trophy className="w-8 h-8 text-yellow-500 dark:text-yellow-400" />;
      case 2: return <Medal className="w-8 h-8 text-gray-400 dark:text-gray-500" />;
      case 3: return <Medal className="w-8 h-8 text-orange-600 dark:text-orange-500" />;
      default: return null;
    }
  };

  const getMedalColor = (rank) => {
    switch(rank) {
      case 1: return 'bg-gradient-to-r from-yellow-100 to-yellow-200 dark:from-yellow-900/30 dark:to-yellow-800/30 border-yellow-500 dark:border-yellow-600';
      case 2: return 'bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 border-gray-500 dark:border-gray-600';
      case 3: return 'bg-gradient-to-r from-orange-100 to-orange-200 dark:from-orange-900/30 dark:to-orange-800/30 border-orange-500 dark:border-orange-600';
      default: return 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-600';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 mb-6">
          <div className="text-center">
            <Trophy className="w-16 h-16 mx-auto text-yellow-500 dark:text-yellow-400 mb-4" />
            <h1 className="text-4xl font-bold mb-2 dark:text-white">🏆 Classement Général</h1>
            <p className="text-gray-600 dark:text-gray-400">Scores actuels de toutes les équipes</p>
          </div>
        </div>

        {/* Votre équipe */}
        {userTeam && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6 mb-6 border-4 border-purple-500 dark:border-purple-600">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-purple-100 dark:bg-purple-900/50 rounded-full p-3">
                  <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Votre équipe</p>
                  <h3 className="text-2xl font-bold dark:text-white">{userTeam.name}</h3>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Position</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">#{userRank}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600 dark:text-gray-400">Score</p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{userTeam.validatedScore || 0} pts</p>
              </div>
            </div>
          </div>
        )}

        {/* Podium Top 3 */}
        {sortedTeams.length >= 3 && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            {/* 2ème place */}
            <div className="pt-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 text-center border-4 border-gray-400 dark:border-gray-600">
                <Medal className="w-12 h-12 mx-auto text-gray-400 dark:text-gray-500 mb-2" />
                <p className="text-4xl font-bold mb-1 dark:text-white">2</p>
                <h3 className="font-bold text-lg mb-2 truncate dark:text-white">{sortedTeams[1]?.name}</h3>
                <p className="text-2xl font-bold text-gray-600 dark:text-gray-400">{sortedTeams[1]?.validatedScore || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">points</p>
              </div>
            </div>

            {/* 1ère place */}
            <div className="pt-0">
              <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 dark:from-yellow-900/40 dark:to-yellow-800/40 rounded-lg shadow-2xl p-4 text-center border-4 border-yellow-500 dark:border-yellow-600">
                <Trophy className="w-16 h-16 mx-auto text-yellow-600 dark:text-yellow-400 mb-2 animate-bounce" />
                <p className="text-5xl font-bold mb-1 dark:text-white">1</p>
                <h3 className="font-bold text-xl mb-2 truncate dark:text-white">{sortedTeams[0]?.name}</h3>
                <p className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">{sortedTeams[0]?.validatedScore || 0}</p>
                <p className="text-sm text-yellow-600 dark:text-yellow-400">points</p>
                <Star className="w-8 h-8 mx-auto mt-2 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>

            {/* 3ème place */}
            <div className="pt-8">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 text-center border-4 border-orange-500 dark:border-orange-600">
                <Medal className="w-12 h-12 mx-auto text-orange-600 dark:text-orange-500 mb-2" />
                <p className="text-4xl font-bold mb-1 dark:text-white">3</p>
                <h3 className="font-bold text-lg mb-2 truncate dark:text-white">{sortedTeams[2]?.name}</h3>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-500">{sortedTeams[2]?.validatedScore || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">points</p>
              </div>
            </div>
          </div>
        )}

        {/* Classement complet */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl p-6">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-2 dark:text-white">
            <TrendingUp className="w-6 h-6" />
            Classement Complet
          </h3>
          
          <div className="space-y-3">
            {sortedTeams.map((team, index) => {
              const rank = index + 1;
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
                          {team.validatedScore || 0}
                        </p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">points</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

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
      </div>
    </div>
  );
};

export default ScoreboardView;