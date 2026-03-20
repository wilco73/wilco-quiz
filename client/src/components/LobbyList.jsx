import React, { useEffect, useState } from 'react';
import { Users, Play, Clock, Palette, Shuffle, BookOpen, Grid } from 'lucide-react';

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
  onJoinDrawingLobby,
  onJoinMysteryLobby
}) => {
  const availableLobbies = lobbies.filter(l => l.status === 'waiting' || l.status === 'playing');
  const [drawingLobbies, setDrawingLobbies] = useState([]);
  const [mysteryLobbies, setMysteryLobbies] = useState([]);
  
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

  // Charger les lobbies mystery
  useEffect(() => {
    const fetchMysteryLobbies = async () => {
      try {
        const res = await fetch(`${API_URL}/mystery/lobbies`);
        const data = await res.json();
        if (data.success) {
          setMysteryLobbies(data.lobbies.filter(l => l.status === 'waiting' || l.status === 'playing'));
        }
      } catch (error) {
        console.error('Erreur chargement mystery lobbies:', error);
      }
    };
    
    fetchMysteryLobbies();
    const interval = setInterval(fetchMysteryLobbies, 5000);
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
                    ${lobby.trainingMode ? 'border-2 border-orange-300 dark:border-orange-600' : ''}
                  `}
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          {quiz?.title || 'Quiz'}
                          {lobby.trainingMode && (
                            <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs rounded-full font-medium">
                              Entraînement
                            </span>
                          )}
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
        
        {/* Boutons de création - visibles si l'utilisateur a une équipe */}
        {currentUser?.teamName && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <button
              onClick={() => onJoinDrawingLobby({ action: 'create', gameType: 'pictionary' })}
              className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl shadow-sm hover:shadow-md p-4 transition-all text-left"
            >
              <div className="flex items-center gap-3 text-white">
                <div className="text-3xl">🎨</div>
                <div>
                  <h4 className="text-lg font-bold">Pictionary</h4>
                  <p className="text-white/80 text-sm">Dessinez pour faire deviner</p>
                </div>
              </div>
            </button>
            <button
              onClick={() => onJoinDrawingLobby({ action: 'create', gameType: 'relay' })}
              className="bg-gradient-to-r from-green-500 to-teal-500 rounded-xl shadow-sm hover:shadow-md p-4 transition-all text-left"
            >
              <div className="flex items-center gap-3 text-white">
                <div className="text-3xl">🔄</div>
                <div>
                  <h4 className="text-lg font-bold">Passe-moi le Relais</h4>
                  <p className="text-white/80 text-sm">Reproduisez de mémoire</p>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Message si pas d'équipe et pas de lobbies */}
        {!currentUser?.teamName && drawingLobbies.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-sm">
            <Palette className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              Rejoignez une équipe pour créer ou rejoindre un jeu de dessin
            </p>
          </div>
        )}
        
        {/* Liste des lobbies existants */}
        {drawingLobbies.length === 0 && currentUser?.teamName ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center shadow-sm">
            <Palette className="w-12 h-12 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-500 dark:text-gray-400">
              Aucune partie en cours — créez-en une !
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {drawingLobbies.map(lobby => {
              const isPlaying = lobby.status === 'playing';
              const gameType = lobby.config?.gameType;
              const gameLabel = gameType === 'relay' ? 'Passe-moi le Relais' : 'Pictionary';
              const isInLobby = lobby.participants?.some(p => p.odId === currentUser?.id);
              const isCreator = lobby.creator_id === currentUser?.id;
              const isRelay = gameType === 'relay';
              
              return (
                <div 
                  key={lobby.id}
                  className={`
                    bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all
                    ${isPlaying 
                      ? 'ring-2 ring-green-400 dark:ring-green-500' 
                      : isRelay 
                        ? 'ring-1 ring-teal-200 dark:ring-teal-700'
                        : 'ring-1 ring-purple-200 dark:ring-purple-700'
                    }
                  `}
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${
                            isRelay 
                              ? 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400'
                              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
                          }`}>
                            {isRelay ? '🔄' : '🎨'} {gameLabel}
                          </span>
                          {isCreator && (
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs rounded-full">
                              Votre lobby
                            </span>
                          )}
                          {isPlaying && (
                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs rounded-full animate-pulse">
                              🔴 En cours
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                          {lobby.title || `Partie ${gameLabel}`}
                        </h3>
                      </div>
                    </div>
                    
                    {/* Mots custom */}
                    {lobby.custom_words?.length > 0 && (
                      <p className="text-sm text-purple-600 dark:text-purple-400 mb-2">
                        📝 {lobby.custom_words.length} mot(s) personnalisé(s)
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                        <Users className="w-4 h-4" />
                        {lobby.participants?.length || 0} joueur{(lobby.participants?.length || 0) > 1 ? 's' : ''}
                      </span>
                      
                      {currentUser?.teamName ? (
                        <button
                          onClick={() => onJoinDrawingLobby(lobby)}
                          disabled={isPlaying && !isInLobby}
                          className={`
                            px-4 py-2 rounded-lg font-semibold transition-colors
                            ${isInLobby 
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : isPlaying
                                ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                                : isRelay
                                  ? 'bg-teal-600 hover:bg-teal-700 text-white'
                                  : 'bg-purple-600 hover:bg-purple-700 text-white'
                            }
                          `}
                        >
                          {isInLobby ? 'Rejoindre' : isPlaying ? 'En cours...' : 'Jouer'}
                        </button>
                      ) : (
                        <p className="text-orange-600 dark:text-orange-400 text-sm">
                          Rejoignez une équipe d'abord
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Section Cases Mystères */}
      {mysteryLobbies.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
            <Grid className="w-5 h-5 text-indigo-600" />
            Cases Mystères
          </h2>
          
          <div className="grid gap-4">
            {mysteryLobbies.map(lobby => {
              const isPlaying = lobby.status === 'playing';
              const isInLobby = lobby.participants?.some(p => p.odId === currentUser?.id);
              const revealedCount = lobby.gameState?.revealedCount || 0;
              const totalCells = lobby.gameState?.totalCells || 0;
              
              // Tout le monde rejoint comme participant
              // Le bouton est "Reprendre" si déjà dans le lobby, sinon "Rejoindre"
              const buttonText = isInLobby ? 'Reprendre' : 'Rejoindre';
              
              return (
                <div 
                  key={lobby.id} 
                  className={`
                    bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 
                    rounded-xl shadow-sm hover:shadow-md transition-all border border-indigo-200 dark:border-indigo-700
                    ${isPlaying ? 'ring-2 ring-indigo-400 dark:ring-indigo-500' : ''}
                  `}
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <Grid className="w-5 h-5 text-indigo-600" />
                          {lobby.gridTitle || 'Cases Mystères'}
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                          {totalCells} cases à découvrir
                        </p>
                      </div>
                      
                      {isPlaying && (
                        <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-sm rounded-full font-semibold animate-pulse">
                          🔮 En cours
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {lobby.participants?.length || 0} joueur{(lobby.participants?.length || 0) > 1 ? 's' : ''}
                        </span>
                        {isPlaying && totalCells > 0 && (
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                            {revealedCount}/{totalCells} révélées
                          </span>
                        )}
                      </div>
                      
                      <button
                        onClick={() => onJoinMysteryLobby?.(lobby)}
                        className={`
                          px-4 py-2 rounded-lg font-semibold transition-colors
                          ${isInLobby 
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }
                        `}
                      >
                        {buttonText}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
};

export default LobbyList;
