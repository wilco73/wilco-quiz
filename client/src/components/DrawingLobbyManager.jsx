import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Users, Clock, Trash2, Eye, Settings,
  Palette, AlertCircle, Check, X, Plus,
  SkipForward, StopCircle, Trophy, EyeOff, RefreshCw,
  Archive, History, Image, Download
} from 'lucide-react';
import { PictionaryConfig } from './PictionaryGame';
import { RelayConfig, RelayResults } from './RelayGame';
import PictionaryResults from './PictionaryResults';
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
  const [selectedLobby, setSelectedLobby] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showRelayConfigModal, setShowRelayConfigModal] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [gameState, setGameState] = useState(null);
  const [showWord, setShowWord] = useState(false);
  const [allGuesses, setAllGuesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllTeamsPopup, setShowAllTeamsPopup] = useState(null);
  const [showTimeUpPopup, setShowTimeUpPopup] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [drawingReferences, setDrawingReferences] = useState([]);
  const canvasRef = useRef(null);
  const toast = useToast();
  
  // Charger les données
  const fetchData = async () => {
    try {
      setLoading(true);
      const [wordsRes, lobbiesRes, refsRes] = await Promise.all([
        fetch(`${API_URL}/drawing-words`),
        fetch(`${API_URL}/drawing-lobbies`),
        fetch(`${API_URL}/drawing-references`)
      ]);
      setDrawingWords(await wordsRes.json());
      setDrawingLobbies(await lobbiesRes.json());
      setDrawingReferences(await refsRes.json());
    } catch (error) {
      console.error('Erreur chargement:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchData();
  }, []);
  
  // Écouter les événements Socket pour les lobbies et Pictionary
  useEffect(() => {
    if (!socket) return;
    
    const handleLobbyUpdated = (data) => {
      setDrawingLobbies(prev => prev.map(l => 
        l.id === data.lobby.id ? data.lobby : l
      ));
      if (selectedLobby?.id === data.lobby.id) {
        setSelectedLobby(data.lobby);
      }
    };
    
    const handleLobbyDeleted = (data) => {
      setDrawingLobbies(prev => prev.filter(l => l.id !== data.lobbyId));
      if (selectedLobby?.id === data.lobbyId) {
        setSelectedLobby(null);
        setGameState(null);
      }
    };
    
    const handleStarted = (data) => {
      setGameState({
        ...data,
        status: 'playing'
      });
      setAllGuesses([]);
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
        currentRound: data.currentRound,
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
      setShowTimeUpPopup({
        word: data.word,
        teamsFound: data.teamsFound || [],
        scores: data.scores || {}
      });
      
      // Masquer après 4.5 secondes
      setTimeout(() => {
        setShowTimeUpPopup(null);
      }, 4500);
    };
    
    const handleEnded = (data) => {
      setGameState(prev => prev ? {
        ...prev,
        status: 'finished',
        finalRanking: data.ranking
      } : null);
      toast.success('Partie terminée !');
      fetchData(); // Refresh lobbies
    };
    
    const handleAllTeamsFound = (data) => {
      // Afficher la popup
      setShowAllTeamsPopup({
        word: data.word,
        teamsFound: data.teamsFound,
        scores: data.scores
      });
      
      // Masquer après 4 secondes (avant le passage auto de 5s)
      setTimeout(() => {
        setShowAllTeamsPopup(null);
      }, 4500);
    };
    
    // Handlers Relay
    const handleRelayStarted = (data) => {
      if (data.lobbyId === selectedLobby?.id) {
        setGameState({
          status: 'playing',
          gameType: 'relay',
          currentRound: data.currentRound,
          totalRounds: data.totalRounds,
          phase: data.phase,
          phaseTimeRemaining: data.phaseTimeRemaining,
          teams: data.teams,
          assignments: data.assignments
        });
        toast.success('Partie lancée !');
      }
    };
    
    const handleRelayTimerTick = (data) => {
      setGameState(prev => prev?.gameType === 'relay' ? {
        ...prev,
        phase: data.phase,
        phaseTimeRemaining: data.phaseTimeRemaining,
        currentRound: data.currentRound
      } : prev);
    };
    
    const handleRelayPhaseChange = (data) => {
      setGameState(prev => prev?.gameType === 'relay' ? {
        ...prev,
        phase: data.phase,
        phaseTimeRemaining: data.phaseTimeRemaining
      } : prev);
    };
    
    const handleRelayNewPassage = (data) => {
      setGameState(prev => prev?.gameType === 'relay' ? {
        ...prev,
        currentRound: data.currentRound,
        phase: data.phase,
        phaseTimeRemaining: data.phaseTimeRemaining,
        assignments: data.assignments
      } : prev);
    };
    
    const handleRelayEnded = (data) => {
      setGameState(prev => prev?.gameType === 'relay' ? {
        ...prev,
        status: 'finished',
        chains: data.chains
      } : prev);
      toast.success('Partie terminée !');
      fetchData();
    };
    
    socket.on('drawingLobby:updated', handleLobbyUpdated);
    socket.on('drawingLobby:deleted', handleLobbyDeleted);
    socket.on('pictionary:started', handleStarted);
    socket.on('pictionary:timerTick', handleTimerTick);
    socket.on('pictionary:guessResult', handleGuessResult);
    socket.on('pictionary:scoreUpdate', handleScoreUpdate);
    socket.on('pictionary:newRound', handleNewRound);
    socket.on('pictionary:wordReveal', handleWordReveal);
    socket.on('pictionary:timeUp', handleTimeUp);
    socket.on('pictionary:ended', handleEnded);
    socket.on('pictionary:allTeamsFound', handleAllTeamsFound);
    socket.on('relay:started', handleRelayStarted);
    socket.on('relay:timerTick', handleRelayTimerTick);
    socket.on('relay:phaseChange', handleRelayPhaseChange);
    socket.on('relay:newRound', handleRelayNewPassage);
    socket.on('relay:ended', handleRelayEnded);
    
    return () => {
      socket.off('drawingLobby:updated', handleLobbyUpdated);
      socket.off('drawingLobby:deleted', handleLobbyDeleted);
      socket.off('pictionary:started', handleStarted);
      socket.off('pictionary:timerTick', handleTimerTick);
      socket.off('pictionary:guessResult', handleGuessResult);
      socket.off('pictionary:scoreUpdate', handleScoreUpdate);
      socket.off('pictionary:newRound', handleNewRound);
      socket.off('pictionary:wordReveal', handleWordReveal);
      socket.off('pictionary:timeUp', handleTimeUp);
      socket.off('pictionary:ended', handleEnded);
      socket.off('pictionary:allTeamsFound', handleAllTeamsFound);
      socket.off('relay:started', handleRelayStarted);
      socket.off('relay:timerTick', handleRelayTimerTick);
      socket.off('relay:phaseChange', handleRelayPhaseChange);
      socket.off('relay:newRound', handleRelayNewPassage);
      socket.off('relay:ended', handleRelayEnded);
    };
  }, [socket, selectedLobby?.id, toast]);
  
  // Créer un nouveau lobby
  const handleCreateLobby = async (gameType = 'pictionary') => {
    try {
      const res = await fetch(`${API_URL}/drawing-lobbies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: { gameType }
        })
      });
      const result = await res.json();
      
      if (result.success) {
        const gameName = gameType === 'relay' ? 'Passe moi le relais' : 'Pictionary';
        toast.success(`Lobby ${gameName} créé !`);
        setDrawingLobbies(prev => [result.lobby, ...prev]);
        setSelectedLobby(result.lobby);
        setShowCreateModal(false);
        
        // Rejoindre le lobby en tant qu'admin
        socket.joinDrawingLobby(result.lobby.id, 'admin', 'Admin', null);
      }
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };
  
  // Sélectionner un lobby
  const handleSelectLobby = async (lobby) => {
    setSelectedLobby(lobby);
    setGameState(null);
    setAllGuesses([]);
    
    // Rejoindre le room Socket
    const result = await socket.joinDrawingLobby(lobby.id, 'admin', 'Admin', null);
    
    if (result.gameState) {
      setGameState(result.gameState);
    }
  };
  
  // Supprimer un lobby
  const handleDeleteLobby = async (lobbyId) => {
    if (!window.confirm('Supprimer ce lobby ?')) return;
    
    try {
      await fetch(`${API_URL}/drawing-lobbies/${lobbyId}`, { method: 'DELETE' });
      toast.success('Lobby supprimé');
      
      if (selectedLobby?.id === lobbyId) {
        setSelectedLobby(null);
        setGameState(null);
      }
      
      setDrawingLobbies(prev => prev.filter(l => l.id !== lobbyId));
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };
  
  // Lancer la partie
  const handleStartPictionary = async (config) => {
    if (!selectedLobby) return;
    
    // Filtrer les mots
    const filteredWords = drawingWords.filter(w => {
      const catMatch = !config.selectedCategories?.length || config.selectedCategories.includes(w.category);
      const diffMatch = !config.selectedDifficulties?.length || config.selectedDifficulties.includes(w.difficulty);
      return catMatch && diffMatch;
    });
    
    if (filteredWords.length < config.rounds) {
      toast.error(`Pas assez de mots (${filteredWords.length}) pour ${config.rounds} tours`);
      return;
    }
    
    setShowConfigModal(false);
    
    const result = await socket.startPictionary(
      selectedLobby.id,
      config,
      filteredWords
    );
    
    if (!result.success) {
      toast.error(result.message || 'Erreur lors du démarrage');
    }
  };
  
  // Lancer la partie Relay
  const handleStartRelay = async (config, filteredRefs) => {
    if (!selectedLobby) return;
    
    setShowRelayConfigModal(false);
    
    const result = await socket.startRelay(
      selectedLobby.id,
      config,
      filteredRefs
    );
    
    if (!result.success) {
      toast.error(result.message || 'Erreur lors du démarrage');
    }
  };
  
  // Tour suivant
  const handleNextRound = async () => {
    if (!selectedLobby) return;
    const result = await socket.pictionaryNextRound(selectedLobby.id);
    if (result.ended) {
      toast.info('Partie terminée !');
    }
  };
  
  // Terminer la partie
  const handleEndGame = async () => {
    if (!selectedLobby) return;
    if (window.confirm('Terminer la partie maintenant ?')) {
      await socket.pictionaryEnd(selectedLobby.id);
    }
  };
  
  // Réinitialiser (retour à la liste)
  const handleBack = () => {
    setSelectedLobby(null);
    setGameState(null);
    setAllGuesses([]);
    setShowResults(false);
    fetchData();
  };
  
  // Voir les résultats d'un lobby terminé
  const handleViewResults = (lobby) => {
    setSelectedLobby(lobby);
    setShowResults(true);
  };
  
  // Équipes dans le lobby sélectionné
  const lobbyTeams = selectedLobby?.participants 
    ? [...new Set(selectedLobby.participants.map(p => p.team_name).filter(Boolean))]
    : [];
  
  // Séparer les lobbies actifs et terminés/archivés
  const activeLobbies = drawingLobbies.filter(l => l.status === 'waiting' || l.status === 'playing');
  const finishedLobbies = drawingLobbies.filter(l => l.status === 'finished' || l.status === 'archived');
  
  // ==================== RENDU ====================
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }
  
  // Vue résultats Relay
  if (showResults && selectedLobby && selectedLobby.config?.gameType === 'relay') {
    return (
      <RelayResultsAdmin
        lobbyId={selectedLobby.id}
        onBack={handleBack}
      />
    );
  }
  
  // Vue résultats Pictionary
  if (showResults && selectedLobby) {
    return (
      <PictionaryResults
        lobbyId={selectedLobby.id}
        onBack={handleBack}
        onArchive={() => {
          toast.success('Lobby archivé');
          handleBack();
        }}
      />
    );
  }
  
  // Vue partie Relay en cours (monitoring admin)
  if (selectedLobby && gameState && gameState.status === 'playing' && selectedLobby.config?.gameType === 'relay') {
    const formatTime = (seconds) => {
      if (!seconds || seconds > 9000) return '--:--';
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };
    
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                🔄 Passe moi le relais - En cours
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Passage {(gameState.currentRound || 0) + 1} / {gameState.totalRounds || 0}
                {' • '}
                Phase: {gameState.phase === 'observation' ? '👀 Observation' : '✏️ Dessin'}
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Timer */}
              <div className={`flex items-center gap-2 ${
                gameState.phaseTimeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-600 dark:text-blue-400'
              }`}>
                <Clock className="w-6 h-6" />
                <span className="text-3xl font-bold">{formatTime(gameState.phaseTimeRemaining)}</span>
              </div>
              
              {/* Actions */}
              <button
                onClick={() => socket.relayEnd(selectedLobby.id)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
              >
                <StopCircle className="w-4 h-4" />
                Terminer
              </button>
            </div>
          </div>
        </div>
        
        {/* Info sur les équipes */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h3 className="font-bold dark:text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Équipes en jeu ({gameState.teams?.length || 0})
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {gameState.teams?.map((team, idx) => {
              const assignment = gameState.assignments?.find(a => a.team === team);
              return (
                <div key={team} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <p className="font-bold dark:text-white">{team}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {assignment?.referenceName || 'Image'}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
        
        {/* Note: Les dessins sont isolés par équipe */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
          <p className="text-blue-700 dark:text-blue-300">
            ℹ️ En mode "Passe moi le relais", chaque équipe dessine dans son propre canvas isolé.
            <br />
            Les dessins seront visibles dans les résultats à la fin de la partie.
          </p>
        </div>
        
        <button
          onClick={handleBack}
          className="w-full py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          ← Retour (la partie continue en arrière-plan)
        </button>
      </div>
    );
  }
  
  // Vue partie Pictionary en cours
  if (selectedLobby && gameState && gameState.status === 'playing') {
    return (
      <div className="space-y-4">
        {/* Popup toutes les équipes ont trouvé */}
        {showAllTeamsPopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md animate-bounce-in">
              <div className="text-center">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold dark:text-white mb-2">
                  Tout le monde a trouvé !
                </h3>
                <p className="text-lg text-purple-600 dark:text-purple-400 font-bold mb-4">
                  Le mot était : {showAllTeamsPopup.word}
                </p>
                <div className="space-y-2 mb-4">
                  {showAllTeamsPopup.teamsFound.map((team, idx) => (
                    <div key={team} className="flex items-center justify-center gap-2">
                      <span className="text-xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '✓'}</span>
                      <span className="font-medium dark:text-white">{team}</span>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Passage au tour suivant...
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Popup temps écoulé */}
        {showTimeUpPopup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md">
              <div className="text-center">
                <div className="text-6xl mb-4">⏰</div>
                <h3 className="text-2xl font-bold dark:text-white mb-2">
                  Temps écoulé !
                </h3>
                <p className="text-lg text-purple-600 dark:text-purple-400 font-bold mb-4">
                  Le mot était : {showTimeUpPopup.word}
                </p>
                {showTimeUpPopup.teamsFound.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Équipes qui ont trouvé :</p>
                    {showTimeUpPopup.teamsFound.map((team, idx) => (
                      <div key={team} className="flex items-center justify-center gap-2">
                        <span className="text-xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '✓'}</span>
                        <span className="font-medium dark:text-white">{team}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 mb-4">
                    Personne n'a trouvé le mot 😔
                  </p>
                )}
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Passage au tour suivant...
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                <Palette className="w-6 h-6 text-purple-600" />
                Pictionary en cours
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Tour {(gameState.currentRound || 0) + 1} / {gameState.totalRounds || 0}
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
              showWord ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' : 'bg-gray-100 dark:bg-gray-700 text-gray-400'
            }`}>
              {showWord ? (gameState.currentWord || '???') : '••••••••'}
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
  if (selectedLobby && gameState?.status === 'finished') {
    return (
      <div className="space-y-4">
        <button
          onClick={handleBack}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-2"
        >
          ← Retour aux lobbies
        </button>
        
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
            onClick={handleBack}
            className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-semibold"
          >
            Retour aux lobbies
          </button>
        </div>
      </div>
    );
  }
  
  // Vue salle d'attente du lobby sélectionné
  if (selectedLobby) {
    const isRelay = selectedLobby.config?.gameType === 'relay';
    
    return (
      <div className="space-y-4">
        <button
          onClick={handleBack}
          className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-2"
        >
          ← Retour aux lobbies
        </button>
        
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                <span className="text-2xl">{isRelay ? '🔄' : '🎨'}</span>
                Salle d'attente - {isRelay ? 'Passe moi le relais' : 'Pictionary'}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-mono">
                ID: {selectedLobby.id}
              </p>
            </div>
            
            <button
              onClick={() => handleDeleteLobby(selectedLobby.id)}
              className="px-3 py-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Supprimer
            </button>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {selectedLobby.participants?.length || 0}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Participants</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {lobbyTeams.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Équipes</p>
            </div>
            <div className={`rounded-lg p-4 text-center ${isRelay ? 'bg-teal-50 dark:bg-teal-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
              <p className={`text-3xl font-bold ${isRelay ? 'text-teal-600 dark:text-teal-400' : 'text-green-600 dark:text-green-400'}`}>
                {isRelay ? drawingReferences.length : drawingWords.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isRelay ? 'Images' : 'Mots'}
              </p>
            </div>
          </div>
          
          {/* Liste des participants */}
          <div className="mb-6">
            <h3 className="font-bold dark:text-white mb-3 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Participants ({selectedLobby.participants?.length || 0})
            </h3>
            
            {selectedLobby.participants?.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {selectedLobby.participants.map(p => (
                  <div 
                    key={p.participant_id}
                    className="p-2 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center gap-2"
                  >
                    <span className="font-medium dark:text-white">{p.pseudo}</span>
                    {p.team_name && (
                      <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                        {p.team_name}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-4">
                En attente de participants...
              </p>
            )}
          </div>
          
          {/* Vérifications */}
          {lobbyTeams.length < 2 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-600 rounded-lg p-4 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <span className="text-orange-700 dark:text-orange-300">
                Il faut au moins 2 équipes différentes pour jouer
              </span>
            </div>
          )}
          
          {drawingWords.length === 0 && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-600 rounded-lg p-4 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <span className="text-orange-700 dark:text-orange-300">
                Ajoutez des mots dans la banque
              </span>
            </div>
          )}
          
          {/* Bouton lancer - différent selon le type de jeu */}
          {selectedLobby?.config?.gameType === 'relay' ? (
            <button
              onClick={() => setShowRelayConfigModal(true)}
              disabled={lobbyTeams.length < 2 || drawingReferences.length === 0}
              className="w-full py-4 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl hover:from-green-700 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-xl font-bold shadow-lg transform hover:scale-[1.02] transition flex items-center justify-center gap-2"
            >
              <Play className="w-6 h-6" />
              Lancer la partie
            </button>
          ) : (
            <button
              onClick={() => setShowConfigModal(true)}
              disabled={lobbyTeams.length < 2 || drawingWords.length === 0}
              className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-xl font-bold shadow-lg transform hover:scale-[1.02] transition flex items-center justify-center gap-2"
            >
              <Play className="w-6 h-6" />
              Lancer la partie
            </button>
          )}
          
          {/* Info sur les ressources manquantes */}
          {selectedLobby?.config?.gameType === 'relay' && drawingReferences.length === 0 && (
            <p className="text-orange-600 dark:text-orange-400 text-sm text-center mt-2">
              ⚠️ Aucune image de référence. Ajoutez-en dans l'onglet "Images Réf."
            </p>
          )}
          {selectedLobby?.config?.gameType !== 'relay' && drawingWords.length === 0 && (
            <p className="text-orange-600 dark:text-orange-400 text-sm text-center mt-2">
              ⚠️ Aucun mot disponible. Ajoutez-en dans l'onglet "Mots"
            </p>
          )}
        </div>
        
        {/* Modal config Pictionary */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <PictionaryConfig
              words={drawingWords}
              teams={lobbyTeams}
              customWordsCount={selectedLobby?.custom_words?.length || 0}
              onStart={handleStartPictionary}
              onCancel={() => setShowConfigModal(false)}
            />
          </div>
        )}
        
        {/* Modal config Relay */}
        {showRelayConfigModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <RelayConfig
              references={drawingReferences}
              teams={lobbyTeams}
              onStart={handleStartRelay}
              onCancel={() => setShowRelayConfigModal(false)}
            />
          </div>
        )}
      </div>
    );
  }
  
  // Vue liste des lobbies
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
              <Palette className="w-6 h-6 text-purple-600" />
              Lobbies Jeux de Dessin
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {activeLobbies.length} actif(s) • {finishedLobbies.length} terminé(s) • {drawingWords.length} mots
            </p>
          </div>
          
          <div className="flex gap-2">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`p-2 rounded-lg flex items-center gap-2 ${
                showArchived 
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' 
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title="Voir les lobbies terminés"
            >
              <History className="w-5 h-5" />
            </button>
            <button
              onClick={fetchData}
              className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Nouveau lobby
            </button>
          </div>
        </div>
        
        {/* Lobbies actifs */}
        {activeLobbies.length === 0 && !showArchived ? (
          <div className="text-center py-12">
            <Palette className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Aucun lobby actif
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              Créer un lobby
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {activeLobbies.map(lobby => (
              <div 
                key={lobby.id}
                className={`border rounded-lg p-4 hover:border-purple-400 dark:hover:border-purple-400 transition cursor-pointer ${
                  lobby.config?.gameType === 'relay' 
                    ? 'border-teal-200 dark:border-teal-700' 
                    : 'border-gray-200 dark:border-gray-600'
                }`}
                onClick={() => handleSelectLobby(lobby)}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {lobby.config?.gameType === 'relay' ? '🔄' : '🎨'}
                      </span>
                      <span className="font-medium dark:text-white">
                        {lobby.config?.gameType === 'relay' ? 'Passe moi le relais' : 'Pictionary'}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        lobby.status === 'waiting' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300' :
                        lobby.status === 'playing' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
                        'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {lobby.status === 'waiting' ? 'En attente' :
                         lobby.status === 'playing' ? 'En cours' : 'Terminé'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {lobby.participants?.length || 0} participant(s) • 
                      <span className="text-gray-400 font-mono ml-1">{lobby.id.slice(0, 12)}...</span>
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteLobby(lobby.id); }}
                      className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Lobbies terminés */}
        {showArchived && finishedLobbies.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-bold dark:text-white mb-4 flex items-center gap-2">
              <Archive className="w-5 h-5 text-gray-500" />
              Lobbies terminés ({finishedLobbies.length})
            </h3>
            <div className="space-y-3">
              {finishedLobbies.map(lobby => (
                <div 
                  key={lobby.id}
                  className={`border rounded-lg p-4 hover:border-purple-400 dark:hover:border-purple-400 transition cursor-pointer bg-gray-50 dark:bg-gray-700/50 ${
                    lobby.config?.gameType === 'relay' 
                      ? 'border-teal-200 dark:border-teal-700' 
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                  onClick={() => handleViewResults(lobby)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {lobby.config?.gameType === 'relay' ? '🔄' : '🎨'}
                        </span>
                        <span className="font-medium dark:text-white">
                          {lobby.config?.gameType === 'relay' ? 'Passe moi le relais' : 'Pictionary'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          lobby.status === 'archived' 
                            ? 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                        }`}>
                          {lobby.status === 'archived' ? 'Archivé' : 'Terminé'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Cliquez pour voir les résultats • 
                        <span className="font-mono ml-1">{lobby.id.slice(0, 12)}...</span>
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewResults(lobby); }}
                        className="p-2 text-purple-500 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg"
                        title="Voir les résultats"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteLobby(lobby.id); }}
                        className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      {/* Modal choix type de jeu */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold dark:text-white mb-4 text-center">
              Créer un nouveau lobby
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
              Choisissez le type de jeu
            </p>
            
            <div className="grid grid-cols-1 gap-4">
              <button
                onClick={() => handleCreateLobby('pictionary')}
                className="p-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">🎨</div>
                  <div className="text-left">
                    <h4 className="text-lg font-bold">Pictionary</h4>
                    <p className="text-white/80 text-sm">Une équipe dessine, les autres devinent</p>
                  </div>
                </div>
              </button>
              
              <button
                onClick={() => handleCreateLobby('relay')}
                className="p-4 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg hover:from-green-600 hover:to-teal-600 transition"
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">🔄</div>
                  <div className="text-left">
                    <h4 className="text-lg font-bold">Passe moi le relais</h4>
                    <p className="text-white/80 text-sm">Reproduisez une image de mémoire</p>
                  </div>
                </div>
              </button>
            </div>
            
            <button
              onClick={() => setShowCreateModal(false)}
              className="w-full mt-4 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-white"
            >
              Annuler
            </button>
          </div>
        </div>
      )}
      
      {/* Modal config Relay */}
      {showRelayConfigModal && selectedLobby && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <RelayConfig
            references={drawingReferences}
            teams={lobbyTeams}
            onStart={handleStartRelay}
            onCancel={() => setShowRelayConfigModal(false)}
          />
        </div>
      )}
    </div>
  );
};

// Composant pour afficher les résultats Relay côté admin
const RelayResultsAdmin = ({ lobbyId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [chains, setChains] = useState([]);
  const [lobby, setLobby] = useState(null);
  const [selectedChain, setSelectedChain] = useState(0);
  const [selectedDrawing, setSelectedDrawing] = useState(-1);
  const [debugInfo, setDebugInfo] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('[RelayResults] Chargement pour lobby:', lobbyId);
        
        // Charger le lobby
        const lobbyRes = await fetch(`${API_URL}/drawing-lobbies/${lobbyId}`);
        const lobbyData = await lobbyRes.json();
        setLobby(lobbyData);
        console.log('[RelayResults] Lobby:', lobbyData);
        
        // Charger les dessins du lobby
        const drawingsRes = await fetch(`${API_URL}/drawings/lobby/${lobbyId}`);
        const drawings = await drawingsRes.json();
        console.log('[RelayResults] Dessins chargés:', drawings.length, drawings);
        
        // Charger les références
        const refsRes = await fetch(`${API_URL}/drawing-references`);
        const references = await refsRes.json();
        console.log('[RelayResults] Références:', references.length);
        
        setDebugInfo({
          drawingsCount: drawings.length,
          referencesCount: references.length,
          drawings: drawings.map(d => ({ id: d.id, team: d.team_name, word: d.word, round: d.round, hasImage: !!d.image_data }))
        });
        
        if (drawings.length === 0) {
          console.log('[RelayResults] Aucun dessin trouvé');
          setChains([]);
          setLoading(false);
          return;
        }
        
        // Regrouper par chaîne (par nom de référence/mot)
        const usedRefNames = [...new Set(drawings.map(d => d.word).filter(Boolean))];
        console.log('[RelayResults] Références utilisées:', usedRefNames);
        
        // Créer les chaînes
        const chainsData = usedRefNames.map(refName => {
          const ref = references.find(r => r.name === refName);
          const chainDrawings = drawings
            .filter(d => d.word === refName)
            .sort((a, b) => (a.round || 0) - (b.round || 0))
            .map(d => ({
              round: d.round || 0,
              team: d.team_name,
              imageData: d.image_data,
              drawingId: d.id
            }));
          
          return {
            referenceId: ref?.id,
            referenceName: refName,
            referenceUrl: ref?.imageUrl || ref?.image_url,
            drawings: chainDrawings
          };
        });
        
        console.log('[RelayResults] Chaînes créées:', chainsData.length);
        setChains(chainsData);
      } catch (error) {
        console.error('[RelayResults] Erreur chargement:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [lobbyId]);
  
  const handleDownload = (imageData, name, passage) => {
    const link = document.createElement('a');
    link.href = imageData;
    link.download = `relay-${name}-passage-${passage + 1}.png`;
    link.click();
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }
  
  const currentChain = chains[selectedChain];
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              Résultats - Passe moi le relais
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {chains.length} chaîne(s) de dessins
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
          >
            ← Retour
          </button>
        </div>
      </div>
      
      {chains.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-12 text-center">
          <Image className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
          <p className="text-gray-500 dark:text-gray-400">Aucun dessin sauvegardé pour ce lobby</p>
        </div>
      ) : (
        <>
          {/* Sélection de la chaîne */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="font-bold dark:text-white mb-4">Sélectionner une image de référence :</h3>
            <div className="flex flex-wrap gap-3">
              {chains.map((chain, idx) => (
                <button
                  key={idx}
                  onClick={() => { setSelectedChain(idx); setSelectedDrawing(-1); }}
                  className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                    selectedChain === idx
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                  }`}
                >
                  {chain.referenceName}
                  <span className="text-xs opacity-70">({chain.drawings.length} dessins)</span>
                </button>
              ))}
            </div>
          </div>
          
          {/* Chaîne de dessins */}
          {currentChain && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              <h3 className="font-bold dark:text-white mb-4 flex items-center gap-2">
                <Image className="w-5 h-5 text-purple-500" />
                Évolution : {currentChain.referenceName}
              </h3>
              
              {/* Barre de progression */}
              <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-4">
                {/* Image originale */}
                <button
                  onClick={() => setSelectedDrawing(-1)}
                  className={`flex-shrink-0 p-2 rounded-lg transition ${
                    selectedDrawing === -1 
                      ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/30' 
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="w-20 h-20 rounded overflow-hidden bg-gray-200 dark:bg-gray-700">
                    {currentChain.referenceUrl ? (
                      <img src={currentChain.referenceUrl} alt="Original" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Image className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-center mt-1 dark:text-white">Original</p>
                </button>
                
                {/* Flèche */}
                <span className="text-gray-400 text-2xl">→</span>
                
                {/* Dessins successifs */}
                {currentChain.drawings.map((drawing, idx) => (
                  <React.Fragment key={idx}>
                    <button
                      onClick={() => setSelectedDrawing(idx)}
                      className={`flex-shrink-0 p-2 rounded-lg transition ${
                        selectedDrawing === idx 
                          ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/30' 
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <div className="w-20 h-20 rounded overflow-hidden bg-gray-200 dark:bg-gray-700">
                        {drawing.imageData ? (
                          <img src={drawing.imageData} alt={`Passage ${idx + 1}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-gray-400 text-xs">Vide</span>
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-center mt-1 dark:text-white">{drawing.team}</p>
                    </button>
                    {idx < currentChain.drawings.length - 1 && (
                      <span className="text-gray-400 text-2xl">→</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
              
              {/* Image agrandie */}
              <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-6 text-center">
                {selectedDrawing === -1 ? (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      📷 Image originale : {currentChain.referenceName}
                    </p>
                    {currentChain.referenceUrl ? (
                      <img 
                        src={currentChain.referenceUrl}
                        alt="Original"
                        className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
                      />
                    ) : (
                      <p className="text-gray-400">Image non disponible</p>
                    )}
                  </>
                ) : currentChain.drawings[selectedDrawing] ? (
                  <>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      ✏️ Passage {selectedDrawing + 1} - Dessin de {currentChain.drawings[selectedDrawing].team}
                    </p>
                    {currentChain.drawings[selectedDrawing].imageData ? (
                      <>
                        <img 
                          src={currentChain.drawings[selectedDrawing].imageData}
                          alt={`Passage ${selectedDrawing + 1}`}
                          className="max-w-full max-h-96 mx-auto rounded-lg shadow-lg"
                        />
                        <button
                          onClick={() => handleDownload(
                            currentChain.drawings[selectedDrawing].imageData,
                            currentChain.referenceName,
                            selectedDrawing
                          )}
                          className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 inline-flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Télécharger
                        </button>
                      </>
                    ) : (
                      <p className="text-gray-400">Dessin non disponible</p>
                    )}
                  </>
                ) : null}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DrawingLobbyManager;
