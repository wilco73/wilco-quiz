import React, { useEffect, useState, useCallback } from 'react';
import { Users, Play, Clock, Palette, Shuffle, BookOpen, Grid, Smile, Plus, Hash } from 'lucide-react';
import { API_URL } from '../config';

/**
 * LobbyList - Liste des lobbies disponibles selon les game_settings
 * Affiche les jeux visibles et permet de créer/rejoindre selon les permissions
 */
const LobbyList = ({ 
  currentUser, 
  lobbies, 
  quizzes, 
  onJoinLobby, 
  onJoinDrawingLobby,
  onJoinMysteryLobby,
  onJoinMemeLobby,
  onCreateMemeLobby
}) => {
  const [gameSettings, setGameSettings] = useState([]);
  const [drawingLobbies, setDrawingLobbies] = useState([]);
  const [mysteryLobbies, setMysteryLobbies] = useState([]);
  const [memeLobbies, setMemeLobbies] = useState([]);
  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(null); // 'meme' | null
  const [loadingCreate, setLoadingCreate] = useState(false);

  const availableLobbies = lobbies.filter(l => l.status === 'waiting' || l.status === 'playing');

  // Charger les game_settings
  useEffect(() => {
    const fetchGameSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/game-settings`);
        const data = await res.json();
        if (data.success) {
          setGameSettings(data.games || []);
        }
      } catch (error) {
        console.error('Erreur chargement game settings:', error);
      }
    };
    fetchGameSettings();
  }, []);

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

  // Charger les lobbies meme
  useEffect(() => {
    const fetchMemeLobbies = async () => {
      try {
        const res = await fetch(`${API_URL}/meme-lobbies`);
        const data = await res.json();
        if (data.success) {
          setMemeLobbies((data.lobbies || []).filter(l => l.status === 'waiting' || l.status === 'playing'));
        }
      } catch (error) {
        console.error('Erreur chargement meme lobbies:', error);
      }
    };
    
    fetchMemeLobbies();
    const interval = setInterval(fetchMemeLobbies, 5000);
    return () => clearInterval(interval);
  }, []);

  // Vérifier si un jeu est visible
  const isGameVisible = useCallback((gameId) => {
    const game = gameSettings.find(g => g.id === gameId);
    return game?.is_visible !== false;
  }, [gameSettings]);

  // Vérifier si l'utilisateur peut créer un lobby pour ce jeu
  const canCreateLobby = useCallback((gameId) => {
    const game = gameSettings.find(g => g.id === gameId);
    if (!game) return false;
    
    const permission = game.create_permission || 'admin';
    const userRole = currentUser?.role || 'user';
    
    if (permission === 'all') return true;
    if (permission === 'admin' && (userRole === 'admin' || userRole === 'superadmin')) return true;
    if (permission === 'superadmin' && userRole === 'superadmin') return true;
    return false;
  }, [gameSettings, currentUser]);

  // Vérifier si l'utilisateur peut rejoindre un lobby pour ce jeu
  const canJoinLobby = useCallback((gameId) => {
    const game = gameSettings.find(g => g.id === gameId);
    if (!game) return true; // Par défaut, tout le monde peut rejoindre
    
    const permission = game.join_permission || 'all';
    const userRole = currentUser?.role || 'user';
    
    if (permission === 'all') return true;
    if (permission === 'admin' && (userRole === 'admin' || userRole === 'superadmin')) return true;
    if (permission === 'superadmin' && userRole === 'superadmin') return true;
    return false;
  }, [gameSettings, currentUser]);

  // Gérer la création de lobby meme
  const handleCreateMeme = async () => {
    if (!onCreateMemeLobby) return;
    setLoadingCreate(true);
    await onCreateMemeLobby();
    setLoadingCreate(false);
  };

  // Rejoindre un lobby meme avec code
  const handleJoinMemeWithCode = () => {
    if (!joinCode.trim() || !onJoinMemeLobby) return;
    onJoinMemeLobby({ id: joinCode.trim().toUpperCase() });
    setJoinCode('');
    setShowJoinInput(null);
  };

  // Style commun pour les cartes de lobby
  const cardBaseClass = "bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all";
  const cardPlayingClass = "ring-2 ring-orange-400 dark:ring-orange-500";
  
  // Style commun pour les boutons
  const buttonBaseClass = "w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg font-semibold transition-colors text-sm sm:text-base active:scale-[0.98]";
  const buttonPrimaryClass = "bg-purple-600 hover:bg-purple-700 text-white";
  const buttonSuccessClass = "bg-green-600 hover:bg-green-700 text-white";
  const buttonDisabledClass = "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed";
  
  // Couleurs par type de jeu
  const gameColors = {
    quiz: { primary: 'purple', icon: Play },
    pictionary: { primary: 'purple', icon: Palette },
    relay: { primary: 'teal', icon: Palette },
    mystery: { primary: 'indigo', icon: Grid },
    meme: { primary: 'pink', icon: Smile }
  };

  return (
    <div className="max-w-4xl mx-auto px-2 sm:px-0">
      {/* Message si pas d'équipe */}
      {!currentUser?.teamName && (
        <div className="bg-orange-50 dark:bg-orange-900/20 rounded-xl p-3 sm:p-4 mb-4 sm:mb-6 border-2 border-orange-200 dark:border-orange-700">
          <p className="text-orange-800 dark:text-orange-300 text-sm sm:text-base">
            ⚠️ Vous n'êtes pas encore dans une équipe. Allez dans <strong>Profil</strong> pour rejoindre ou créer une équipe.
          </p>
        </div>
      )}

      {/* Section Quiz */}
      {isGameVisible('quiz') && (
        <section className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
            <Play className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            Quiz disponibles
          </h2>
          
          {availableLobbies.length === 0 ? (
            <div className={`${cardBaseClass} p-6 sm:p-8 text-center`}>
              <Clock className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                Aucun quiz disponible pour le moment
              </p>
              <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1">
                Un administrateur doit créer une salle
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4">
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
                      ${cardBaseClass}
                      ${isPlaying ? cardPlayingClass : ''}
                      ${lobby.trainingMode ? 'border-2 border-orange-300 dark:border-orange-600' : ''}
                    `}
                  >
                    <div className="p-3 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex flex-wrap items-center gap-2">
                            <span className="truncate">{quiz?.title || 'Quiz'}</span>
                            {lobby.trainingMode && (
                              <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs rounded-full font-medium whitespace-nowrap">
                                Entraînement
                              </span>
                            )}
                          </h3>
                          {quiz?.description && (
                            <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-1 line-clamp-2">
                              {quiz.description}
                            </p>
                          )}
                        </div>
                        
                        {isPlaying && (
                          <span className="self-start px-2 sm:px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 text-xs sm:text-sm rounded-full font-semibold animate-pulse whitespace-nowrap">
                            🔴 En cours
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            {lobby.participants?.length || 0} participant{(lobby.participants?.length || 0) > 1 ? 's' : ''}
                          </span>
                          <span className="flex items-center gap-1">
                            {lobby.shuffled ? <Shuffle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
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
                            ${buttonBaseClass}
                            ${isInLobby 
                              ? buttonSuccessClass
                              : isPlaying
                                ? buttonDisabledClass
                                : buttonPrimaryClass
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
      )}

      {/* Section Jeux de Dessin (Pictionary + Relay) */}
      {(isGameVisible('pictionary') || isGameVisible('relay')) && (
        <section className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
            <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
            Jeux de dessin
          </h2>
          
          {drawingLobbies.length === 0 ? (
            <div className={`${cardBaseClass} p-6 sm:p-8 text-center`}>
              <Palette className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                Aucune partie de dessin en cours
              </p>
              <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1">
                Un administrateur doit créer une partie
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {drawingLobbies.map(lobby => {
                const isRelay = lobby.game_type === 'relay';
                const gameId = isRelay ? 'relay' : 'pictionary';
                
                if (!isGameVisible(gameId)) return null;
                
                const gameLabel = isRelay ? 'Passe moi le relais' : 'Dessiner c\'est gagné';
                const isPlaying = lobby.status === 'playing';
                const isInLobby = lobby.participants?.some(p => p.odId === currentUser?.id);
                const isCreator = lobby.creator_id === currentUser?.id;
                const colorClass = isRelay ? 'teal' : 'purple';
                
                return (
                  <div 
                    key={lobby.id} 
                    className={`
                      ${cardBaseClass}
                      ${isPlaying ? cardPlayingClass : ''}
                    `}
                  >
                    <div className="p-3 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 text-xs rounded-full font-medium bg-${colorClass}-100 dark:bg-${colorClass}-900/30 text-${colorClass}-700 dark:text-${colorClass}-400`}>
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
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-1 truncate">
                            {lobby.title || `Partie ${gameLabel}`}
                          </h3>
                        </div>
                      </div>
                      
                      {lobby.custom_words?.length > 0 && (
                        <p className="text-xs sm:text-sm text-purple-600 dark:text-purple-400 mb-2">
                          📝 {lobby.custom_words.length} mot(s) personnalisé(s)
                        </p>
                      )}
                      
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <span className="flex items-center gap-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          {lobby.participants?.length || 0} joueur{(lobby.participants?.length || 0) > 1 ? 's' : ''}
                        </span>
                        
                        {currentUser?.teamName && canJoinLobby(gameId) ? (
                          <button
                            onClick={() => onJoinDrawingLobby(lobby)}
                            disabled={isPlaying && !isInLobby}
                            className={`
                              ${buttonBaseClass}
                              ${isInLobby 
                                ? buttonSuccessClass
                                : isPlaying
                                  ? buttonDisabledClass
                                  : isRelay
                                    ? 'bg-teal-600 hover:bg-teal-700 text-white'
                                    : buttonPrimaryClass
                              }
                            `}
                          >
                            {isInLobby ? 'Rejoindre' : isPlaying ? 'En cours...' : 'Jouer'}
                          </button>
                        ) : (
                          <p className="text-orange-600 dark:text-orange-400 text-xs sm:text-sm">
                            {!currentUser?.teamName ? 'Rejoignez une équipe d\'abord' : 'Accès non autorisé'}
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
      )}

      {/* Section Cases Mystères */}
      {isGameVisible('mystery') && mysteryLobbies.length > 0 && (
        <section className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
            <Grid className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            Cases Mystères
          </h2>
          
          <div className="grid gap-3 sm:gap-4">
            {mysteryLobbies.map(lobby => {
              const isPlaying = lobby.status === 'playing';
              const isInLobby = lobby.participants?.some(p => p.odId === currentUser?.id);
              const revealedCount = lobby.gameState?.revealedCount || 0;
              const totalCells = lobby.gameState?.totalCells || 0;
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
                  <div className="p-3 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <Grid className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 flex-shrink-0" />
                          <span className="truncate">{lobby.gridTitle || 'Cases Mystères'}</span>
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 text-xs sm:text-sm mt-1">
                          {totalCells} cases à découvrir
                        </p>
                      </div>
                      
                      {isPlaying && (
                        <span className="self-start px-2 sm:px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs sm:text-sm rounded-full font-semibold animate-pulse whitespace-nowrap">
                          🔮 En cours
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                          {lobby.participants?.length || 0} joueur{(lobby.participants?.length || 0) > 1 ? 's' : ''}
                        </span>
                        {isPlaying && totalCells > 0 && (
                          <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                            {revealedCount}/{totalCells} révélées
                          </span>
                        )}
                      </div>
                      
                      {canJoinLobby('mystery') ? (
                        <button
                          onClick={() => onJoinMysteryLobby?.(lobby)}
                          className={`
                            ${buttonBaseClass}
                            ${isInLobby 
                              ? buttonSuccessClass
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                            }
                          `}
                        >
                          {buttonText}
                        </button>
                      ) : (
                        <p className="text-orange-600 dark:text-orange-400 text-xs sm:text-sm">
                          Accès non autorisé
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Section Make It Meme */}
      {isGameVisible('meme') && (
        <section className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
            <Smile className="w-4 h-4 sm:w-5 sm:h-5 text-pink-600" />
            Make It Meme
          </h2>
          
          {/* Actions : Créer / Rejoindre avec code */}
          {canJoinLobby('meme') && (
            <div className="flex flex-wrap gap-2 mb-4">
              {/* Bouton créer (si permission) */}
              {canCreateLobby('meme') && (
                <button
                  onClick={handleCreateMeme}
                  disabled={loadingCreate}
                  className={`
                    ${buttonBaseClass}
                    bg-pink-600 hover:bg-pink-700 text-white flex items-center gap-2
                    ${loadingCreate ? 'opacity-50 cursor-wait' : ''}
                  `}
                >
                  <Plus className="w-4 h-4" />
                  {loadingCreate ? 'Création...' : 'Créer une partie'}
                </button>
              )}
              
              {/* Bouton rejoindre avec code */}
              {showJoinInput === 'meme' ? (
                <div className="flex gap-2 flex-1 sm:flex-none">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="CODE"
                    className="w-24 sm:w-32 px-3 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-center font-mono uppercase text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
                    maxLength={15}
                    onKeyPress={(e) => e.key === 'Enter' && handleJoinMemeWithCode()}
                  />
                  <button
                    onClick={handleJoinMemeWithCode}
                    disabled={!joinCode.trim()}
                    className={`${buttonBaseClass} bg-pink-600 hover:bg-pink-700 text-white disabled:opacity-50`}
                  >
                    OK
                  </button>
                  <button
                    onClick={() => { setShowJoinInput(null); setJoinCode(''); }}
                    className={`${buttonBaseClass} bg-gray-500 hover:bg-gray-600 text-white`}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowJoinInput('meme')}
                  className={`${buttonBaseClass} bg-gray-600 hover:bg-gray-700 text-white flex items-center gap-2`}
                >
                  <Hash className="w-4 h-4" />
                  Rejoindre avec code
                </button>
              )}
            </div>
          )}
          
          {/* Liste des lobbies meme */}
          {memeLobbies.length === 0 ? (
            <div className={`${cardBaseClass} p-6 sm:p-8 text-center`}>
              <Smile className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-400 mb-3" />
              <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">
                Aucune partie de meme en cours
              </p>
              {canCreateLobby('meme') && (
                <p className="text-xs sm:text-sm text-gray-400 dark:text-gray-500 mt-1">
                  Créez une partie pour commencer !
                </p>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4">
              {memeLobbies.map(lobby => {
                const isPlaying = lobby.status === 'playing';
                const isInLobby = (lobby.participants || []).some(p => p.odId === currentUser?.id);
                const isCreator = lobby.creator_id === currentUser?.id;
                const participantCount = lobby.participants?.length || 0;
                const currentRound = lobby.current_round || 0;
                const totalRounds = lobby.settings?.rounds || 3;
                
                return (
                  <div 
                    key={lobby.id} 
                    className={`
                      bg-gradient-to-r from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 
                      rounded-xl shadow-sm hover:shadow-md transition-all border border-pink-200 dark:border-pink-700
                      ${isPlaying ? 'ring-2 ring-pink-400 dark:ring-pink-500' : ''}
                    `}
                  >
                    <div className="p-3 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-400">
                              😂 Make It Meme
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
                          <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white mt-1 flex items-center gap-2">
                            <span className="truncate">Partie Meme</span>
                            <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                              #{lobby.id.split('-')[1]?.substring(0, 6).toUpperCase() || lobby.id.substring(0, 6).toUpperCase()}
                            </span>
                          </h3>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            {participantCount} joueur{participantCount > 1 ? 's' : ''}
                          </span>
                          <span>{totalRounds} manches</span>
                          {isPlaying && currentRound > 0 && (
                            <span className="text-pink-600 dark:text-pink-400 font-medium">
                              Manche {currentRound}/{totalRounds}
                            </span>
                          )}
                        </div>
                        
                        {canJoinLobby('meme') ? (
                          <button
                            onClick={() => onJoinMemeLobby?.(lobby)}
                            disabled={isPlaying && !isInLobby}
                            className={`
                              ${buttonBaseClass}
                              ${isInLobby 
                                ? buttonSuccessClass
                                : isPlaying
                                  ? buttonDisabledClass
                                  : 'bg-pink-600 hover:bg-pink-700 text-white'
                              }
                            `}
                          >
                            {isInLobby ? 'Rejoindre' : isPlaying ? 'En cours...' : 'Jouer'}
                          </button>
                        ) : (
                          <p className="text-orange-600 dark:text-orange-400 text-xs sm:text-sm">
                            Accès non autorisé
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
      )}
    </div>
  );
};

export default LobbyList;
