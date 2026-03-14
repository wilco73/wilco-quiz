import React, { useEffect, useState } from 'react';
import { Users, Play, Clock, Palette, Shuffle, BookOpen } from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

/**
 * LobbyList - Liste des lobbies disponibles (sans le layout)
 * À utiliser dans MainLayout
 */
const LobbyList = ({ 
  currentUser, 
  lobbies, 
  quizzes, 
  onJoinLobby, 
  onJoinDrawingLobby 
}) => {
  const availableLobbies = lobbies.filter(l => l.status === 'waiting' || l.status === 'playing');
  const [drawingLobbies, setDrawingLobbies] = useState([]);
  
  // Charger les lobbies de dessin
  useEffect(() => {
    const fetchDrawingLobbies = async () => {
      try {
        const res = await fetch(`${API_URL}/drawing-lobbies`);
        const data = await res.json();
        setDrawingLobbies(data.filter(l => l.status === 'waiting' || l.status === 'playing'));
      } catch (error) {
        console.error('Erreur chargement drawing lobbies:', error);
      }
    };
    
    fetchDrawingLobbies();
    const interval = setInterval(fetchDrawingLobbies, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-4xl mx-auto">
      {/* Message si pas d'équipe */}
      {!currentUser?.teamName && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-4 mb-6 border-2 border-orange-200 dark:border-orange-700">
          <p className="text-orange-800 dark:text-orange-300">
            ⚠️ Vous n'êtes pas encore dans une équipe. Allez dans <strong>Profil</strong> pour rejoindre ou créer une équipe.
          </p>
        </div>
      )}

      {/* Section Quiz */}
      <section className="mb-8">
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Play className="w-5 h-5 text-purple-600" />
          Quiz disponibles
        </h2>
        
        {availableLobbies.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-sm">
            <Clock className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              Aucun quiz disponible pour le moment
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Un administrateur doit créer une salle
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {availableLobbies.map(lobby => {
              const quiz = quizzes.find(q => q.id === lobby.quizId);
              const isPlaying = lobby.status === 'playing';
              const currentQ = lobby.session?.currentQuestionIndex || 0;
              const totalQ = quiz?.questions?.length || 0;
              const isInLobby = lobby.participants?.some(p => p.participantId === currentUser?.id);
              
              return (
                <div 
                  key={lobby.id} 
                  className={`
                    bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all
                    ${isPlaying ? 'ring-2 ring-orange-400 dark:ring-orange-500' : ''}
                  `}
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {quiz?.title || 'Quiz'}
                        </h3>
                        {quiz?.description && (
                          <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                            {quiz.description}
                          </p>
                        )}
                      </div>
                      
                      {isPlaying && (
                        <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-sm rounded-full font-semibold animate-pulse">
                          🔴 En cours
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {lobby.participants?.length || 0} participant{(lobby.participants?.length || 0) > 1 ? 's' : ''}
                        </span>
                        <span className="flex items-center gap-1">
                          {lobby.shuffled ? <Shuffle className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                          {totalQ} questions
                        </span>
                        {isPlaying && (
                          <span className="text-orange-600 dark:text-orange-400 font-medium">
                            Q{currentQ + 1}/{totalQ}
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={() => onJoinLobby(lobby.id)}
                        disabled={isPlaying && !isInLobby}
                        className={`
                          px-4 py-2 rounded-lg font-semibold transition-colors
                          ${isInLobby 
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : isPlaying
                              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                              : 'bg-purple-600 hover:bg-purple-700 text-white'
                          }
                        `}
                      >
                        {isInLobby ? 'Rejoindre' : isPlaying ? 'En cours...' : 'Participer'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section Jeux de dessin */}
      <section>
        <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-pink-600" />
          Jeux de dessin
        </h2>
        
        {drawingLobbies.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-sm">
            <Palette className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              Aucun jeu de dessin disponible
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {drawingLobbies.map(lobby => {
              const isPlaying = lobby.status === 'playing';
              const gameType = lobby.config?.gameType;
              const gameLabel = gameType === 'relay' ? 'Passe-moi le Relais' : 'Pictionary';
              const isInLobby = lobby.participants?.some(p => p.odId === currentUser?.id);
              
              return (
                <div 
                  key={lobby.id}
                  className={`
                    bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all
                    ${isPlaying ? 'ring-2 ring-pink-400 dark:ring-pink-500' : ''}
                  `}
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400 text-xs rounded-full font-medium">
                            {gameLabel}
                          </span>
                          {isPlaying && (
                            <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs rounded-full animate-pulse">
                              🔴 En cours
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                          {lobby.title || `Partie ${gameLabel}`}
                        </h3>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Users className="w-4 h-4" />
                        {lobby.participants?.length || 0} joueur{(lobby.participants?.length || 0) > 1 ? 's' : ''}
                      </span>
                      
                      <button
                        onClick={() => onJoinDrawingLobby(lobby)}
                        disabled={isPlaying && !isInLobby}
                        className={`
                          px-4 py-2 rounded-lg font-semibold transition-colors
                          ${isInLobby 
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : isPlaying
                              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                              : 'bg-pink-600 hover:bg-pink-700 text-white'
                          }
                        `}
                      >
                        {isInLobby ? 'Rejoindre' : isPlaying ? 'En cours...' : 'Jouer'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default LobbyList;
