import React, { useEffect, useState } from 'react';
import { LogOut, UserPlus, Trophy, Users, Star, User, History, Clock } from 'lucide-react';
import DarkModeToggle from './DarkModeToggle';

const LobbyViewList = ({ currentUser, lobbies, quizzes, teams, participants, onJoinLobby, onViewScoreboard, onViewProfile, onViewResults, onLogout }) => {
  const availableLobbies = lobbies.filter(l => l.status === 'waiting' || l.status === 'playing');
  const userTeam = teams.find(t => t.name === currentUser.teamName);
  const [showHistory, setShowHistory] = useState(false);
  
  // Lobbies terminés où le participant a joué
  const myFinishedLobbies = lobbies.filter(l => 
    l.status === 'finished' && 
    l.participants?.some(p => p.participantId === currentUser.id)
  );
  
  // Récupérer les coéquipiers en temps réel
  const [teamMembers, setTeamMembers] = useState([]);

  useEffect(() => {
    if (currentUser.teamName) {
      const members = participants.filter(p => 
        p.teamName === currentUser.teamName && p.id !== currentUser.id
      );
      setTeamMembers(members);
    } else {
      setTeamMembers([]);
    }
  }, [participants, currentUser]);

  // Trouver le rang de l'équipe
  const sortedTeams = [...teams].sort((a, b) => (b.validatedScore || 0) - (a.validatedScore || 0));
  const teamRank = userTeam ? sortedTeams.findIndex(t => t.name === userTeam.name) + 1 : null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header avec info utilisateur et équipe */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-purple-100 dark:bg-purple-900/50 rounded-full p-3">
                  <Users className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold dark:text-white">{currentUser.pseudo}</h2>
                  {currentUser.teamName ? (
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-gray-600 dark:text-gray-400">
                        Équipe: <span className="font-bold text-purple-600 dark:text-purple-400">{currentUser.teamName}</span>
                      </p>
                      {teamRank && teamRank <= 3 && (
                        <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded-full">
                          {teamRank === 1 && '🥇'}
                          {teamRank === 2 && '🥈'}
                          {teamRank === 3 && '🥉'}
                          #{teamRank}
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-orange-600 dark:text-orange-400 font-semibold mt-1">
                      ⚠️ Pas d'équipe assignée
                    </p>
                  )}
                </div>
              </div>

              {/* ✅ NOUVEAU: Info équipe détaillée */}
              {currentUser.teamName && userTeam && (
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg p-4 border-2 border-purple-200 dark:border-purple-700">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-3">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                        {userTeam.validatedScore || 0}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Points</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        #{teamRank || '-'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Classement</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {teamMembers.length + 1}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Membres</p>
                    </div>
                  </div>

                  {/* ✅ NOUVEAU: Liste des coéquipiers */}
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Coéquipiers ({teamMembers.length})
                    </p>
                    {teamMembers.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {teamMembers.map(member => (
                          <div 
                            key={member.id}
                            className="flex items-center gap-1 px-3 py-1 bg-white dark:bg-gray-700 border border-purple-200 dark:border-purple-600 rounded-full text-sm"
                          >
                            <Star className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            <span className="font-semibold text-gray-800 dark:text-gray-200">
                              {member.pseudo}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        Vous êtes seul dans cette équipe
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Message si pas d'équipe */}
              {!currentUser.teamName && (
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 border-2 border-orange-200 dark:border-orange-700">
                  <p className="text-sm text-orange-800 dark:text-orange-300">
                    ℹ️ Vous n'êtes pas encore dans une équipe. Cliquez sur <strong>Profil</strong> pour rejoindre ou créer une équipe.
                  </p>
                </div>
              )}
            </div>

            {/* Boutons d'action */}
            <div className="flex gap-2 ml-4">
              <DarkModeToggle />
              <button
                onClick={onViewProfile}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600"
                title="Mon profil"
              >
                <User className="w-4 h-4" />
                Profil
              </button>
              <button
                onClick={onViewScoreboard}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 dark:bg-purple-700 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600"
              >
                <Trophy className="w-4 h-4" />
                Classement
              </button>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </div>
        </div>

        {/* Liste des salles disponibles */}
        <h3 className="text-xl font-bold mb-4 dark:text-white">Salles disponibles</h3>
        <div className="grid gap-4">
          {availableLobbies.map(lobby => {
            const quiz = quizzes.find(q => q.id === lobby.quizId);
            const isPlaying = lobby.status === 'playing';
            const currentQ = lobby.session?.currentQuestionIndex || 0;
            const totalQ = quiz?.questions?.length || 0;
            
            return (
              <div key={lobby.id} className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition ${
                isPlaying ? 'border-2 border-orange-400 dark:border-orange-500' : ''
              }`}>
                <div className="flex justify-between items-start mb-2">
                  <h4 className="text-xl font-bold dark:text-white">{quiz?.title}</h4>
                  {isPlaying && (
                    <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-sm rounded-full font-semibold animate-pulse">
                      🔴 En cours (Q{currentQ + 1}/{totalQ})
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{quiz?.description}</p>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    <p className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      {lobby.participants?.length || 0} participants
                    </p>
                    <p className="flex items-center gap-1 mt-1">
                      <Trophy className="w-4 h-4" />
                      {totalQ} questions
                    </p>
                  </div>
                  <button
                    onClick={() => onJoinLobby(lobby.id)}
                    className={`px-6 py-2 text-white rounded-lg flex items-center gap-2 ${
                      isPlaying 
                        ? 'bg-orange-500 hover:bg-orange-600' 
                        : 'bg-purple-600 dark:bg-purple-700 hover:bg-purple-700 dark:hover:bg-purple-600'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    {isPlaying ? 'Rejoindre en cours' : 'Rejoindre'}
                  </button>
                </div>
                {isPlaying && (
                  <p className="text-xs text-orange-600 dark:text-orange-400 mt-3">
                    ⚠️ Le quiz est deja en cours. Les questions manquees seront comptees comme non repondues.
                  </p>
                )}
              </div>
            );
          })}
          {availableLobbies.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
              <Trophy className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-xl text-gray-600 dark:text-gray-400">Aucune salle disponible</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Revenez plus tard ou contactez l'administrateur
              </p>
            </div>
          )}
        </div>
        
        {/* Section Historique */}
        {myFinishedLobbies.length > 0 && (
          <>
            <div className="flex justify-between items-center mb-4 mt-8">
              <h3 className="text-xl font-bold dark:text-white flex items-center gap-2">
                <History className="w-5 h-5" />
                Mes quiz termines ({myFinishedLobbies.length})
              </h3>
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-3 py-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
              >
                {showHistory ? 'Masquer' : 'Afficher'}
              </button>
            </div>
            
            {showHistory && (
              <div className="grid gap-3">
                {myFinishedLobbies.map(lobby => {
                  const quiz = quizzes.find(q => q.id === lobby.quizId);
                  const myParticipation = lobby.participants.find(p => p.participantId === currentUser.id);
                  const myValidatedCount = myParticipation ? Object.values(myParticipation.validationsByQuestionId || {}).filter(v => v === true).length : 0;
                  const totalQuestions = quiz?.questions?.length || 0;
                  
                  return (
                    <div key={lobby.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-lg transition">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-bold dark:text-white">{quiz?.title}</h4>
                          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <span className="flex items-center gap-1">
                              <Trophy className="w-3 h-3 text-green-500" />
                              {myValidatedCount}/{totalQuestions} bonnes reponses
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(lobby.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => onViewResults(lobby)}
                          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                        >
                          Voir resultats
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LobbyViewList;