import React, { useState, useEffect } from 'react';
import { 
  Play, Users, Clock, Trash2, Eye, Settings,
  Palette, Shuffle, AlertCircle, Check, X,
  SkipForward, StopCircle, Trophy, EyeOff
} from 'lucide-react';
import DrawingCanvas from './DrawingCanvas';
import { PictionaryConfig } from './PictionaryGame';
import { useToast } from './ToastProvider';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const DrawingLobbyManager = ({ 
  socket, 
  teams, 
  participants,
  onRefresh 
}) => {
  const [drawingWords, setDrawingWords] = useState([]);
  const [drawingLobbies, setDrawingLobbies] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedLobby, setSelectedLobby] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [showWord, setShowWord] = useState(false);
  const [allGuesses, setAllGuesses] = useState([]);
  const toast = useToast();
  
  // Charger les mots
  useEffect(() => {
    const fetchData = async () => {
      try {
        const wordsRes = await fetch(`${API_URL}/drawing-words`);
        setDrawingWords(await wordsRes.json());
      } catch (error) {
        console.error('Erreur chargement:', error);
      }
    };
    fetchData();
  }, []);
  
  // Écouter les événements Pictionary
  useEffect(() => {
    if (!socket) return;
    
    const handleStarted = (data) => {
      setGameState(prev => ({
        ...prev,
        ...data,
        status: 'playing'
      }));
      toast.success('Partie démarrée !');
    };
    
    const handleTimerTick = (data) => {
      setGameState(prev => prev ? {
        ...prev,
        timeRemaining: data.timeRemaining,
        drawerRotationTime: data.drawerRotationTime
      } : null);
    };
    
    const handleGuessResult = (data) => {
      setAllGuesses(prev => [...prev, {
        team: data.teamName,
        text: data.guess,
        correct: data.correct,
        timestamp: Date.now()
      }]);
    };
    
    const handleScoreUpdate = (data) => {
      setGameState(prev => prev ? {
        ...prev,
        scores: data.scores,
        teamsFound: data.teamsFound
      } : null);
    };
    
    const handleNewRound = (data) => {
      setGameState(prev => prev ? {
        ...prev,
        currentRound: data.currentRound - 1,
        drawingTeam: data.drawingTeam,
        timeRemaining: data.timeRemaining,
        teamsFound: []
      } : null);
      setAllGuesses([]);
      setShowWord(false);
    };
    
    const handleWordReveal = (data) => {
      setGameState(prev => prev ? {
        ...prev,
        currentWord: data.word
      } : null);
    };
    
    const handleTimeUp = (data) => {
      toast.info(`Temps écoulé ! Le mot était: ${data.word}`);
    };
    
    const handleEnded = (data) => {
      setGameState(prev => prev ? {
        ...prev,
        status: 'finished',
        finalRanking: data.ranking
      } : null);
      toast.success('Partie terminée !');
    };
    
    socket.on('pictionary:started', handleStarted);
    socket.on('pictionary:timerTick', handleTimerTick);
    socket.on('pictionary:guessResult', handleGuessResult);
    socket.on('pictionary:scoreUpdate', handleScoreUpdate);
    socket.on('pictionary:newRound', handleNewRound);
    socket.on('pictionary:wordReveal', handleWordReveal);
    socket.on('pictionary:timeUp', handleTimeUp);
    socket.on('pictionary:ended', handleEnded);
    
    return () => {
      socket.off('pictionary:started', handleStarted);
      socket.off('pictionary:timerTick', handleTimerTick);
      socket.off('pictionary:guessResult', handleGuessResult);
      socket.off('pictionary:scoreUpdate', handleScoreUpdate);
      socket.off('pictionary:newRound', handleNewRound);
      socket.off('pictionary:wordReveal', handleWordReveal);
      socket.off('pictionary:timeUp', handleTimeUp);
      socket.off('pictionary:ended', handleEnded);
    };
  }, [socket, toast]);
  
  // Équipes uniques avec participants
  const uniqueTeams = [...new Set(participants.filter(p => p.teamName).map(p => p.teamName))];
  const teamParticipants = {};
  uniqueTeams.forEach(team => {
    teamParticipants[team] = participants.filter(p => p.teamName === team);
  });
  
  // Créer un nouveau lobby de dessin
  const handleCreateLobby = () => {
    if (uniqueTeams.length < 2) {
      toast.error('Il faut au moins 2 équipes');
      return;
    }
    if (drawingWords.length === 0) {
      toast.error('Ajoutez des mots dans la banque');
      return;
    }
    setShowCreateModal(true);
  };
  
  // Lancer une partie Pictionary
  const handleStartPictionary = async (config) => {
    // Filtrer les mots
    const filteredWords = drawingWords.filter(w => {
      const catMatch = config.selectedCategories?.length === 0 || config.selectedCategories?.includes(w.category);
      const diffMatch = config.selectedDifficulties?.length === 0 || config.selectedDifficulties?.includes(w.difficulty);
      return catMatch && diffMatch;
    });
    
    if (filteredWords.length < config.rounds) {
      toast.error(`Pas assez de mots (${filteredWords.length}) pour ${config.rounds} tours`);
      return;
    }
    
    // Créer un ID de lobby temporaire
    const lobbyId = `pictionary-${Date.now()}`;
    
    // Initialiser l'état local
    setGameState({
      lobbyId,
      config,
      teams: uniqueTeams,
      teamMembers: teamParticipants,
      status: 'starting',
      currentRound: 0,
      scores: Object.fromEntries(uniqueTeams.map(t => [t, 0])),
      teamsFound: []
    });
    
    setShowCreateModal(false);
    setAllGuesses([]);
    
    // Rejoindre le lobby Socket
    socket.joinLobby(lobbyId, 'admin', 'Admin');
    
    // Démarrer la partie via Socket
    const result = await socket.startPictionary(
      lobbyId,
      config,
      uniqueTeams,
      filteredWords
    );
    
    if (!result.success) {
      toast.error('Erreur lors du démarrage');
      setGameState(null);
    }
  };
  
  // Tour suivant
  const handleNextRound = async () => {
    if (!gameState?.lobbyId) return;
    
    const result = await socket.pictionaryNextRound(gameState.lobbyId);
    
    if (result.ended) {
      toast.info('Partie terminée !');
    }
  };
  
  // Terminer la partie
  const handleEndGame = async () => {
    if (!gameState?.lobbyId) return;
    
    if (window.confirm('Terminer la partie maintenant ?')) {
      await socket.pictionaryEnd(gameState.lobbyId);
    }
  };
  
  // Réinitialiser
  const handleReset = () => {
    setGameState(null);
    setAllGuesses([]);
    setShowWord(false);
  };
  
  // Vue partie en cours
  if (gameState && gameState.status !== 'finished') {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                <Palette className="w-6 h-6 text-purple-600" />
                Pictionary en cours
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Tour {(gameState.currentRound || 0) + 1} / {gameState.config?.rounds || 0}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Timer */}
              <div className="text-center">
                <div className={`flex items-center gap-2 ${
                  gameState.timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-600 dark:text-blue-400'
                }`}>
                  <Clock className="w-6 h-6" />
                  <span className="text-3xl font-bold">{gameState.timeRemaining || 0}s</span>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={handleNextRound}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
                >
                  <SkipForward className="w-4 h-4" />
                  Tour suivant
                </button>
                <button
                  onClick={handleEndGame}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
                >
                  <StopCircle className="w-4 h-4" />
                  Terminer
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* Grille principale */}
        <div className="grid grid-cols-3 gap-4">
          {/* Mot secret */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold dark:text-white">🔒 Mot secret</h3>
              <button
                onClick={() => setShowWord(!showWord)}
                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                {showWord ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <div className={`text-2xl font-bold text-center py-4 rounded-lg ${
              showWord ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-700'
            }`}>
              {showWord ? gameState.currentWord : '••••••••'}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 text-center">
              Équipe qui dessine: <strong className="text-purple-600 dark:text-purple-400">{gameState.drawingTeam}</strong>
            </p>
          </div>
          
          {/* Scores */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <h3 className="font-bold dark:text-white mb-3 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Scores
            </h3>
            <div className="space-y-2">
              {Object.entries(gameState.scores || {})
                .sort(([,a], [,b]) => b - a)
                .map(([team, score], idx) => (
                  <div 
                    key={team}
                    className={`flex justify-between items-center p-2 rounded-lg ${
                      team === gameState.drawingTeam 
                        ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-600'
                        : gameState.teamsFound?.includes(team)
                          ? 'bg-green-50 dark:bg-green-900/20'
                          : 'bg-gray-50 dark:bg-gray-700/50'
                    }`}
                  >
                    <span className="dark:text-white flex items-center gap-2">
                      {idx === 0 && '🥇'}
                      {idx === 1 && '🥈'}
                      {idx === 2 && '🥉'}
                      {team}
                      {team === gameState.drawingTeam && <Palette className="w-4 h-4 text-purple-500" />}
                      {gameState.teamsFound?.includes(team) && <Check className="w-4 h-4 text-green-500" />}
                    </span>
                    <span className="font-bold text-purple-600 dark:text-purple-400">{score} pts</span>
                  </div>
                ))}
            </div>
          </div>
          
          {/* Propositions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
            <h3 className="font-bold dark:text-white mb-3">💬 Propositions</h3>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {allGuesses.slice().reverse().map((g, i) => (
                <div 
                  key={i}
                  className={`text-sm px-2 py-1 rounded ${
                    g.correct 
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 font-medium'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span className="font-medium">{g.team}:</span> {g.text}
                  {g.correct && ' ✓'}
                </div>
              ))}
              {allGuesses.length === 0 && (
                <p className="text-gray-400 dark:text-gray-500 text-sm text-center py-4">
                  Aucune proposition
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Équipes qui ont trouvé */}
        {gameState.teamsFound?.length > 0 && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-600 rounded-lg p-4">
            <h3 className="font-bold text-green-700 dark:text-green-300 mb-2">
              ✅ Équipes qui ont trouvé :
            </h3>
            <div className="flex gap-2 flex-wrap">
              {gameState.teamsFound.map((team, idx) => (
                <span 
                  key={team}
                  className="px-3 py-1 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded-full font-medium"
                >
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '✓'} {team}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }
  
  // Vue résultats finaux
  if (gameState && gameState.status === 'finished') {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-center dark:text-white mb-6">
          🏆 Partie terminée !
        </h2>
        
        <div className="space-y-3 mb-6">
          {gameState.finalRanking?.map((entry, idx) => (
            <div 
              key={entry.team}
              className={`flex items-center justify-between p-4 rounded-lg ${
                idx === 0 ? 'bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-400' :
                idx === 1 ? 'bg-gray-100 dark:bg-gray-700 border-2 border-gray-400' :
                idx === 2 ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-400' :
                'bg-gray-50 dark:bg-gray-700/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                </span>
                <span className="font-bold text-lg dark:text-white">{entry.team}</span>
              </div>
              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {entry.score} pts
              </span>
            </div>
          ))}
        </div>
        
        <button
          onClick={handleReset}
          className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
        >
          Nouvelle partie
        </button>
      </div>
    );
  }
  
  // Vue création
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold dark:text-white mb-4 flex items-center gap-2">
          <Palette className="w-6 h-6 text-purple-600" />
          Lancer un Pictionary
        </h2>
        
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">{uniqueTeams.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Équipes</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{participants.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Participants</p>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">{drawingWords.length}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Mots</p>
          </div>
        </div>
        
        {/* Vérifications */}
        {uniqueTeams.length < 2 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-600 rounded-lg p-4 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <span className="text-orange-700 dark:text-orange-300">
              Il faut au moins 2 équipes pour jouer
            </span>
          </div>
        )}
        
        {drawingWords.length === 0 && (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-600 rounded-lg p-4 mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-orange-500" />
            <span className="text-orange-700 dark:text-orange-300">
              Ajoutez des mots dans la banque "Mots Pictionary"
            </span>
          </div>
        )}
        
        {/* Liste des équipes */}
        <div className="mb-6">
          <h3 className="font-bold dark:text-white mb-2">Équipes participantes :</h3>
          <div className="flex flex-wrap gap-2">
            {uniqueTeams.map(team => (
              <div key={team} className="px-3 py-2 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg">
                <span className="font-medium">{team}</span>
                <span className="text-sm ml-2">({teamParticipants[team]?.length || 0})</span>
              </div>
            ))}
            {uniqueTeams.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400">Aucune équipe</p>
            )}
          </div>
        </div>
        
        {/* Bouton lancer */}
        <button
          onClick={handleCreateLobby}
          disabled={uniqueTeams.length < 2 || drawingWords.length === 0}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xl font-bold shadow-lg transform hover:scale-[1.02] transition flex items-center justify-center gap-2"
        >
          <Play className="w-6 h-6" />
          Configurer et Lancer
        </button>
      </div>
      
      {/* Modal configuration */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <PictionaryConfig
            words={drawingWords}
            teams={uniqueTeams}
            onStart={handleStartPictionary}
            onCancel={() => setShowCreateModal(false)}
          />
        </div>
      )}
    </div>
  );
};

export default DrawingLobbyManager;
