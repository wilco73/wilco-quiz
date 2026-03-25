import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, Trophy, Send, Check, Users, Crown, LogOut,
  AlertCircle, Palette, ChevronLeft, ChevronRight, Download, Image,
  Plus, X, Play, Settings, ChevronUp, ChevronDown, MessageCircle,
  Maximize2, Minimize2, Menu
} from 'lucide-react';
import DrawingCanvas from './DrawingCanvas';
import { PictionaryConfig } from './PictionaryGame';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const DrawingLobbyView = ({
  lobby: initialLobby,
  currentUser,
  socket,
  onLeave
}) => {
  const [lobby, setLobby] = useState(initialLobby);
  const [gameState, setGameState] = useState(null);
  const [guess, setGuess] = useState('');
  const [myGuesses, setMyGuesses] = useState([]);
  const [hasFoundWord, setHasFoundWord] = useState(false);
  const [newCustomWord, setNewCustomWord] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [drawingWords, setDrawingWords] = useState([]);
  const [externalStrokes, setExternalStrokes] = useState([]);
  const [showAllTeamsPopup, setShowAllTeamsPopup] = useState(null);
  const [showTimeUpPopup, setShowTimeUpPopup] = useState(null);
  const [clearSignal, setClearSignal] = useState(0);
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  
  // ========== ÉTATS MOBILE ==========
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileTools, setShowMobileTools] = useState(false);
  const [showMobileGuessModal, setShowMobileGuessModal] = useState(false);
  const [showMobileScores, setShowMobileScores] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Détecter le mode mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Propriétés du joueur
  const myTeam = currentUser?.teamName;
  const isDrawingTeam = myTeam === gameState?.drawingTeam;
  
  // Déterminer si c'est mon tour de dessiner (rotation)
  const getDrawingTeamMembers = () => {
    if (!lobby?.participants || !gameState?.drawingTeam) return [];
    return lobby.participants.filter(p => p.team_name === gameState.drawingTeam);
  };
  
  const drawingTeamMembers = getDrawingTeamMembers();
  const currentDrawerIndex = gameState?.currentDrawerIndex || 0;
  const currentDrawer = drawingTeamMembers[currentDrawerIndex % drawingTeamMembers.length];
  const isMyTurnToDraw = isDrawingTeam && currentDrawer?.participant_id === currentUser?.id;
  
  // Si rotation = 0, tout le monde dans l'équipe peut dessiner
  const hasRotation = gameState?.config?.timePerDrawer > 0;
  const canActuallyDraw = isDrawingTeam && (hasRotation ? isMyTurnToDraw : true);
  
  // Vérifier si je suis le créateur du lobby
  const isRoomMaster = lobby?.creator_id === currentUser?.id;
  const isCreatedByParticipant = lobby?.creator_type === 'participant';
  
  // Équipes dans le lobby
  const lobbyTeams = lobby?.participants 
    ? [...new Set(lobby.participants.map(p => p.team_name).filter(Boolean))]
    : [];
  
  // Mettre à jour le lobby si la prop change
  useEffect(() => {
    setLobby(initialLobby);
  }, [initialLobby]);
  
  // Charger les mots de la DB
  useEffect(() => {
    fetch(`${API_URL}/drawing-words`)
      .then(res => res.json())
      .then(data => setDrawingWords(data || []))
      .catch(err => console.error('Erreur chargement mots:', err));
  }, []);
  
  // ========== SOCKET HANDLERS (INCHANGÉS) ==========
  useEffect(() => {
    if (!socket || !lobby) return;
    
    const handleLobbyUpdated = (data) => {
      if (data.lobby && data.lobby.id === lobby.id) {
        setLobby(data.lobby);
      }
    };
    
    const handleParticipantJoined = (data) => {
      fetchLobby();
    };
    
    const handleParticipantLeft = (data) => {
      fetchLobby();
    };
    
    const handleStroke = (data) => {
      if (data.lobbyId === lobby.id) {
        setExternalStrokes(prev => [...prev, data]);
      }
    };
    
    const handleFill = (data) => {
      if (data.lobbyId === lobby.id) {
        setExternalStrokes(prev => [...prev, { ...data, type: 'fill' }]);
      }
    };
    
    const handleShape = (data) => {
      if (data.lobbyId === lobby.id) {
        setExternalStrokes(prev => [...prev, { ...data, type: 'shape' }]);
      }
    };
    
    const handleClear = (data) => {
      if (data.lobbyId === lobby.id) {
        setExternalStrokes([]);
        setClearSignal(prev => prev + 1);
      }
    };
    
    const handleStarted = (data) => {
      if (data.lobbyId === lobby.id) {
        setGameState({
          ...data,
          status: 'playing',
          currentWord: null,
          currentDrawerIndex: 0
        });
        setExternalStrokes([]);
        setClearSignal(0);
        setMyGuesses([]);
        setHasFoundWord(false);
      }
    };
    
    const handleTimerTick = (data) => {
      setGameState(prev => prev ? {
        ...prev,
        timeRemaining: data.timeRemaining,
        drawerRotationTime: data.drawerRotationTime
      } : null);
    };
    
    const handleWordReveal = (data) => {
      if (myTeam === data.forTeam) {
        setGameState(prev => prev ? {
          ...prev,
          currentWord: data.word
        } : null);
      }
    };
    
    const handleGuessResult = (data) => {
      if (data.correct && data.teamName === myTeam) {
        setHasFoundWord(true);
        // Fermer la modal de réponse sur mobile si trouvé
        if (isMobile) {
          setShowMobileGuessModal(false);
        }
      }
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
        teamsFound: [],
        currentWord: null,
        currentDrawerIndex: 0
      } : null);
      setExternalStrokes([]);
      setClearSignal(prev => prev + 1);
      setMyGuesses([]);
      setHasFoundWord(false);
      setGuess('');
      setShowMobileGuessModal(false);
    };
    
    const handleDrawerRotation = (data) => {
      setGameState(prev => prev ? {
        ...prev,
        currentDrawerIndex: data.newDrawerIndex,
        drawerRotationTime: prev.config?.timePerDrawer || 0
      } : null);
    };
    
    const handleTimeUp = (data) => {
      saveCurrentDrawing(data.word, data.drawingTeam);
      setShowTimeUpPopup({
        word: data.word,
        teamsFound: data.teamsFound || [],
        scores: data.scores || {}
      });
      setTimeout(() => setShowTimeUpPopup(null), 4500);
    };
    
    const handleEnded = (data) => {
      setGameState(prev => prev ? {
        ...prev,
        status: 'finished',
        ranking: data.ranking
      } : null);
    };
    
    const handleAllTeamsFound = (data) => {
      saveCurrentDrawing(data.word, data.drawingTeam);
      setShowAllTeamsPopup({
        word: data.word,
        teamsFound: data.teamsFound,
        scores: data.scores
      });
      setTimeout(() => setShowAllTeamsPopup(null), 4500);
    };
    
    socket.on('drawing:stroke', handleStroke);
    socket.on('drawing:fill', handleFill);
    socket.on('drawing:shape', handleShape);
    socket.on('drawing:clear', handleClear);
    socket.on('pictionary:started', handleStarted);
    socket.on('pictionary:timerTick', handleTimerTick);
    socket.on('pictionary:wordReveal', handleWordReveal);
    socket.on('pictionary:guessResult', handleGuessResult);
    socket.on('pictionary:scoreUpdate', handleScoreUpdate);
    socket.on('pictionary:newRound', handleNewRound);
    socket.on('pictionary:timeUp', handleTimeUp);
    socket.on('pictionary:ended', handleEnded);
    socket.on('pictionary:drawerRotation', handleDrawerRotation);
    socket.on('pictionary:allTeamsFound', handleAllTeamsFound);
    socket.on('drawingLobby:updated', handleLobbyUpdated);
    socket.on('drawingLobby:participantJoined', handleParticipantJoined);
    socket.on('drawingLobby:participantLeft', handleParticipantLeft);
    
    return () => {
      socket.off('drawing:stroke', handleStroke);
      socket.off('drawing:fill', handleFill);
      socket.off('drawing:shape', handleShape);
      socket.off('drawing:clear', handleClear);
      socket.off('pictionary:started', handleStarted);
      socket.off('pictionary:timerTick', handleTimerTick);
      socket.off('pictionary:wordReveal', handleWordReveal);
      socket.off('pictionary:guessResult', handleGuessResult);
      socket.off('pictionary:scoreUpdate', handleScoreUpdate);
      socket.off('pictionary:newRound', handleNewRound);
      socket.off('pictionary:timeUp', handleTimeUp);
      socket.off('pictionary:ended', handleEnded);
      socket.off('pictionary:drawerRotation', handleDrawerRotation);
      socket.off('pictionary:allTeamsFound', handleAllTeamsFound);
      socket.off('drawingLobby:updated', handleLobbyUpdated);
      socket.off('drawingLobby:participantJoined', handleParticipantJoined);
      socket.off('drawingLobby:participantLeft', handleParticipantLeft);
    };
  }, [socket, lobby?.id, myTeam, isMobile]);
  
  // ========== FONCTIONS HELPERS (INCHANGÉES) ==========
  
  const fetchLobby = async () => {
    try {
      const res = await fetch(`${API_URL}/drawing-lobbies/${lobby.id}`);
      if (res.ok) {
        const data = await res.json();
        setLobby(data);
      }
    } catch (error) {
      console.error('Erreur fetch lobby:', error);
    }
  };
  
  const saveCurrentDrawing = async (word, drawingTeam) => {
    if (myTeam !== drawingTeam) return;
    
    const teamMembers = lobby?.participants?.filter(p => p.team_name === drawingTeam) || [];
    const firstDrawer = teamMembers[0];
    
    if (!firstDrawer || firstDrawer.participant_id !== currentUser?.id) return;
    if (!canvasRef.current) return;
    
    try {
      const imageData = canvasRef.current.toDataURL('image/png');
      
      if (!socket?.pictionarySaveDrawing) return;
      
      await socket.pictionarySaveDrawing(
        lobby.id,
        gameState?.currentRound || 0,
        myTeam,
        word,
        imageData
      );
    } catch (error) {
      console.error('Erreur sauvegarde dessin:', error);
    }
  };
  
  const handleSubmitGuess = async () => {
    if (!guess.trim() || hasFoundWord || isDrawingTeam || !gameState) return;
    
    const result = await socket.pictionaryGuess(
      lobby.id,
      currentUser.id,
      myTeam,
      guess.trim()
    );
    
    setMyGuesses(prev => [...prev, { 
      text: guess.trim(), 
      correct: result.correct,
      timestamp: Date.now()
    }]);
    
    setGuess('');
    inputRef.current?.focus();
    
    if (result.correct) {
      setHasFoundWord(true);
      if (isMobile) setShowMobileGuessModal(false);
    }
  };
  
  const handleLeave = async () => {
    await socket.leaveDrawingLobby(lobby.id, currentUser.id);
    onLeave();
  };
  
  const handleAddCustomWord = async () => {
    if (!newCustomWord.trim()) return;
    const result = await socket.addCustomWord(lobby.id, newCustomWord.trim(), currentUser.pseudo);
    if (result?.success) setNewCustomWord('');
  };
  
  const handleRemoveCustomWord = async (wordId) => {
    await socket.removeCustomWord(lobby.id, wordId);
  };
  
  const handleStartPictionary = async (config) => {
    setShowConfigModal(false);
    const result = await socket.startPictionary(lobby.id, config, drawingWords);
    if (!result.success) {
      alert(result.message || 'Erreur lors du lancement');
    }
  };
  
  // ========== DESSINS TERMINÉS ==========
  const [finishedDrawings, setFinishedDrawings] = useState([]);
  const [currentDrawingIndex, setCurrentDrawingIndex] = useState(0);
  
  useEffect(() => {
    if (gameState?.status === 'finished' && lobby?.id) {
      fetch(`${API_URL}/drawing-lobbies/${lobby.id}/drawings`)
        .then(res => res.json())
        .then(data => setFinishedDrawings(data || []))
        .catch(err => console.error('Erreur chargement dessins:', err));
    }
  }, [gameState?.status, lobby?.id]);
  
  const handleDownloadDrawing = (drawing) => {
    if (!drawing?.image_data) return;
    const link = document.createElement('a');
    link.href = drawing.image_data;
    link.download = `dessin-${drawing.team_name}-${drawing.word}.png`;
    link.click();
  };

  // ========== CALCUL DIMENSIONS CANVAS ==========
  const getCanvasDimensions = () => {
    if (isMobile) {
      // Sur mobile, canvas prend toute la largeur avec ratio 4:3
      const width = Math.min(window.innerWidth - 16, 500);
      const height = Math.round(width * 0.75);
      return { width, height };
    }
    return { width: 700, height: 450 };
  };
  
  const canvasDims = getCanvasDimensions();

  // ==================== RENDUS ====================
  
  // ========== VUE PARTIE TERMINÉE ==========
  if (gameState?.status === 'finished') {
    const currentDrawing = finishedDrawings[currentDrawingIndex];
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 to-blue-600 p-2 sm:p-4">
        <div className="max-w-4xl mx-auto">
          {/* Titre */}
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 mb-4 sm:mb-6 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold dark:text-white flex items-center justify-center gap-2 sm:gap-3">
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500" />
              Partie terminée !
            </h2>
          </div>
          
          {/* Classement */}
          <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 mb-4 sm:mb-6">
            <h3 className="text-lg sm:text-xl font-bold dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500" />
              Classement
            </h3>
            <div className="space-y-2 sm:space-y-3">
              {gameState.ranking?.map((entry, idx) => (
                <div 
                  key={entry.team}
                  className={`flex items-center justify-between p-3 sm:p-4 rounded-lg ${
                    idx === 0 ? 'bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-400' :
                    idx === 1 ? 'bg-gray-100 dark:bg-gray-700 border-2 border-gray-400' :
                    idx === 2 ? 'bg-orange-100 dark:bg-orange-900/30 border-2 border-orange-400' :
                    'bg-gray-50 dark:bg-gray-700/50'
                  }`}
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <span className="text-xl sm:text-2xl">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                    </span>
                    <span className={`font-bold text-sm sm:text-base ${entry.team === myTeam ? 'text-purple-600 dark:text-purple-400' : 'dark:text-white'}`}>
                      {entry.team}
                      {entry.team === myTeam && ' (vous)'}
                    </span>
                  </div>
                  <span className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">
                    {entry.score} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Galerie des dessins */}
          {finishedDrawings.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-2xl p-4 sm:p-6 mb-4 sm:mb-6">
              <h3 className="text-lg sm:text-xl font-bold dark:text-white mb-3 sm:mb-4 flex items-center gap-2">
                <Image className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500" />
                Galerie ({finishedDrawings.length})
              </h3>
              
              {currentDrawing && (
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 sm:p-4 mb-4">
                  {currentDrawing.image_data ? (
                    <div className="text-center">
                      <img 
                        src={currentDrawing.image_data} 
                        alt={`Dessin de ${currentDrawing.team_name}`}
                        className="max-w-full max-h-48 sm:max-h-64 md:max-h-80 mx-auto rounded-lg shadow-lg"
                      />
                      <div className="mt-3 sm:mt-4 flex items-center justify-center gap-4 sm:gap-6 text-sm sm:text-base">
                        <div className="text-center">
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Équipe</p>
                          <p className={`font-bold ${currentDrawing.team_name === myTeam ? 'text-purple-600 dark:text-purple-400' : 'dark:text-white'}`}>
                            {currentDrawing.team_name}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Mot</p>
                          <p className="font-bold dark:text-white">{currentDrawing.word}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadDrawing(currentDrawing)}
                        className="mt-3 sm:mt-4 px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 mx-auto text-sm sm:text-base"
                      >
                        <Download className="w-4 h-4" />
                        Télécharger
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-6 sm:py-8">
                      <Palette className="w-10 h-10 sm:w-12 sm:h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500 dark:text-gray-400 text-sm sm:text-base">Image non disponible</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Navigation miniatures */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentDrawingIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentDrawingIndex === 0}
                  className="p-2 bg-gray-200 dark:bg-gray-600 rounded-lg disabled:opacity-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex gap-1 sm:gap-2 overflow-x-auto px-2">
                  {finishedDrawings.map((drawing, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentDrawingIndex(idx)}
                      className={`w-10 h-10 sm:w-12 sm:h-12 rounded border-2 overflow-hidden flex-shrink-0 ${
                        idx === currentDrawingIndex 
                          ? 'border-purple-500 ring-2 ring-purple-300' 
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {drawing.image_data ? (
                        <img src={drawing.image_data} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <Palette className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <button
                  onClick={() => setCurrentDrawingIndex(prev => Math.min(finishedDrawings.length - 1, prev + 1))}
                  disabled={currentDrawingIndex === finishedDrawings.length - 1}
                  className="p-2 bg-gray-200 dark:bg-gray-600 rounded-lg disabled:opacity-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
          
          <button
            onClick={handleLeave}
            className="w-full py-3 bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold shadow-lg text-sm sm:text-base"
          >
            Retour au menu
          </button>
        </div>
      </div>
    );
  }
  
  // ========== SALLE D'ATTENTE ==========
  if (!gameState || gameState.status !== 'playing') {
    const customWords = lobby?.custom_words || [];
    
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-2 sm:p-4">
        <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
          {/* Header */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <h2 className="text-xl sm:text-2xl font-bold dark:text-white flex flex-wrap items-center gap-2">
                <Palette className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                Salle d'attente
                {isRoomMaster && (
                  <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                    👑 Maître
                  </span>
                )}
              </h2>
              <button
                onClick={handleLeave}
                className="self-start sm:self-auto px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2 text-sm"
              >
                <LogOut className="w-4 h-4" />
                Quitter
              </button>
            </div>
            
            {currentUser && (
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center text-sm sm:text-base">
                <p className="text-purple-700 dark:text-purple-300">
                  Vous êtes <strong>{currentUser.pseudo}</strong>
                  {myTeam && <span> ({myTeam})</span>}
                </p>
              </div>
            )}
          </div>
          
          {/* Participants */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
            <h3 className="font-bold dark:text-white mb-3 flex items-center gap-2 text-sm sm:text-base">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              Participants ({lobby?.participants?.length || 0})
            </h3>
            <div className="flex flex-wrap gap-2">
              {lobby?.participants?.map(p => (
                <span 
                  key={p.participant_id}
                  className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm flex items-center gap-1 ${
                    p.participant_id === currentUser?.id
                      ? 'bg-purple-500 text-white'
                      : p.participant_id === lobby.creator_id
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {p.participant_id === lobby.creator_id && '👑 '}
                  {p.pseudo}
                  <span className="text-xs opacity-70">({p.team_name})</span>
                </span>
              ))}
            </div>
            
            {lobbyTeams.length < 2 && (
              <p className="text-orange-600 dark:text-orange-400 text-xs sm:text-sm mt-3">
                ⚠️ Il faut au moins 2 équipes différentes pour jouer
              </p>
            )}
          </div>
          
          {/* Mots personnalisés */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
            <h3 className="font-bold dark:text-white mb-2 sm:mb-3 flex items-center gap-2 text-sm sm:text-base">
              📝 Mots personnalisés ({customWords.length})
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3 sm:mb-4">
              Ajoutez vos propres mots à deviner !
            </p>
            
            <div className="flex gap-2 mb-3 sm:mb-4">
              <input
                type="text"
                value={newCustomWord}
                onChange={(e) => setNewCustomWord(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddCustomWord()}
                placeholder="Entrez un mot..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-purple-500 focus:outline-none text-sm"
              />
              <button
                onClick={handleAddCustomWord}
                disabled={!newCustomWord.trim()}
                className="px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-1 sm:gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Ajouter</span>
              </button>
            </div>
            
            {customWords.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {customWords.map((cw) => (
                  <span 
                    key={cw.id}
                    className="px-2 sm:px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs sm:text-sm flex items-center gap-1 sm:gap-2"
                  >
                    {cw.word}
                    <span className="text-xs opacity-70">({cw.addedBy})</span>
                    <button onClick={() => handleRemoveCustomWord(cw.id)} className="hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm text-center py-3 sm:py-4">
                Aucun mot personnalisé
              </p>
            )}
          </div>
          
          {/* Bouton lancer */}
          {(isRoomMaster || !isCreatedByParticipant) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6">
              {isRoomMaster ? (
                <>
                  <p className="text-gray-600 dark:text-gray-400 text-center mb-4 text-sm sm:text-base">
                    En tant que maître de la room, vous pouvez lancer la partie !
                  </p>
                  <button
                    onClick={() => setShowConfigModal(true)}
                    disabled={lobbyTeams.length < 2}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 font-bold text-base sm:text-lg flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5 sm:w-6 sm:h-6" />
                    Configurer et lancer
                  </button>
                </>
              ) : (
                <div className="text-center py-4 sm:py-6">
                  <div className="animate-pulse text-4xl sm:text-5xl mb-3 sm:mb-4">⏳</div>
                  <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">
                    En attente du lancement par le maître de la room...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Modal de configuration */}
        {showConfigModal && (
          <PictionaryConfig
            onStart={handleStartPictionary}
            onCancel={() => setShowConfigModal(false)}
            wordCount={drawingWords.length + (lobby?.custom_words?.length || 0)}
            teamCount={lobbyTeams.length}
          />
        )}
      </div>
    );
  }
  
  // ========== VUE JEU EN COURS ==========
  
  // ========== POPUPS (INCHANGÉS) ==========
  const renderPopups = () => (
    <>
      {showAllTeamsPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8 max-w-md w-full">
            <div className="text-center">
              <div className="text-5xl sm:text-6xl mb-4">🎉</div>
              <h3 className="text-xl sm:text-2xl font-bold dark:text-white mb-2">
                Tout le monde a trouvé !
              </h3>
              <p className="text-base sm:text-lg text-purple-600 dark:text-purple-400 font-bold mb-4">
                Le mot était : {showAllTeamsPopup.word}
              </p>
              <div className="space-y-2 mb-4">
                {showAllTeamsPopup.teamsFound.map((team, idx) => (
                  <div key={team} className="flex items-center justify-center gap-2">
                    <span className="text-lg sm:text-xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '✓'}</span>
                    <span className={`font-medium ${team === myTeam ? 'text-purple-600 dark:text-purple-400' : 'dark:text-white'}`}>
                      {team} {team === myTeam && '(vous)'}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Passage au tour suivant...</p>
            </div>
          </div>
        </div>
      )}
      
      {showTimeUpPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 sm:p-8 max-w-md w-full">
            <div className="text-center">
              <div className="text-5xl sm:text-6xl mb-4">⏰</div>
              <h3 className="text-xl sm:text-2xl font-bold dark:text-white mb-2">Temps écoulé !</h3>
              <p className="text-base sm:text-lg text-purple-600 dark:text-purple-400 font-bold mb-4">
                Le mot était : {showTimeUpPopup.word}
              </p>
              {showTimeUpPopup.teamsFound.length > 0 ? (
                <div className="space-y-2 mb-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Équipes qui ont trouvé :</p>
                  {showTimeUpPopup.teamsFound.map((team, idx) => (
                    <div key={team} className="flex items-center justify-center gap-2">
                      <span className="text-lg sm:text-xl">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '✓'}</span>
                      <span className={`font-medium ${team === myTeam ? 'text-purple-600 dark:text-purple-400' : 'dark:text-white'}`}>
                        {team} {team === myTeam && '(vous)'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 mb-4">Personne n'a trouvé 😔</p>
              )}
              <p className="text-sm text-gray-500 dark:text-gray-400">Passage au tour suivant...</p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // ========== RENDU MOBILE (JEU EN COURS) ==========
  if (isMobile) {
    return (
      <div className="h-screen flex flex-col bg-gray-900 overflow-hidden">
        {renderPopups()}
        
        {/* Header compact mobile */}
        <div className="flex-shrink-0 bg-gray-800 px-2 py-1.5 flex items-center justify-between">
          {/* Gauche: Timer */}
          <div className={`flex items-center gap-1 ${
            gameState.timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-400'
          }`}>
            <Clock className="w-4 h-4" />
            <span className="text-lg font-bold">{gameState.timeRemaining || 0}s</span>
          </div>
          
          {/* Centre: Tour/Info */}
          <div className="text-center flex-1 px-2">
            <p className="text-xs text-gray-400">Tour {(gameState.currentRound || 0) + 1}/{gameState.totalRounds || 0}</p>
            <p className="text-xs truncate">
              {isDrawingTeam ? (
                <span className="text-green-400 font-medium">Vous dessinez !</span>
              ) : (
                <span className="text-gray-300">
                  <span className="text-purple-400 font-medium">{gameState.drawingTeam}</span> dessine
                </span>
              )}
            </p>
          </div>
          
          {/* Droite: Scores dropdown */}
          <button 
            onClick={() => setShowMobileScores(!showMobileScores)}
            className="flex items-center gap-1 px-2 py-1 bg-gray-700 rounded text-xs"
          >
            <Trophy className="w-3 h-3 text-yellow-500" />
            <span className="text-white">{gameState.scores?.[myTeam] || 0}</span>
            <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${showMobileScores ? 'rotate-180' : ''}`} />
          </button>
        </div>
        
        {/* Dropdown scores */}
        {showMobileScores && (
          <div className="absolute top-12 right-2 z-40 bg-gray-800 rounded-lg shadow-xl p-3 min-w-[150px]">
            <h4 className="text-xs font-bold text-gray-400 mb-2">Scores</h4>
            {Object.entries(gameState.scores || {})
              .sort(([,a], [,b]) => b - a)
              .map(([team, score], idx) => (
                <div key={team} className={`flex justify-between items-center py-1 text-sm ${team === myTeam ? 'text-purple-400' : 'text-gray-300'}`}>
                  <span className="flex items-center gap-1">
                    {idx === 0 && <Crown className="w-3 h-3 text-yellow-500" />}
                    {team}
                  </span>
                  <span className="font-bold">{score}</span>
                </div>
              ))}
            <div className="border-t border-gray-700 mt-2 pt-2">
              <h4 className="text-xs font-bold text-gray-400 mb-1">Ont trouvé</h4>
              {gameState.teamsFound?.length > 0 ? (
                gameState.teamsFound.map((team, idx) => (
                  <div key={team} className="text-xs text-green-400 flex items-center gap-1">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : '✓'} {team}
                  </div>
                ))
              ) : (
                <p className="text-xs text-gray-500">Personne</p>
              )}
            </div>
          </div>
        )}
        
        {/* Mot à faire deviner (si dessinateur) */}
        {isDrawingTeam && (
          <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-blue-600 px-3 py-2 text-center">
            <p className="text-xs text-white/80">Mot à faire deviner :</p>
            <p className="text-xl font-bold text-white">{gameState.currentWord || '???'}</p>
            {hasRotation && !canActuallyDraw && (
              <p className="text-xs text-white/80 mt-1">
                👀 C'est au tour de <strong>{currentDrawer?.pseudo}</strong>
              </p>
            )}
          </div>
        )}
        
        {/* Zone canvas - prend tout l'espace restant */}
        <div className="flex-1 relative overflow-hidden bg-white">
          <DrawingCanvas
            width={canvasDims.width}
            height={canvasDims.height}
            canDraw={canActuallyDraw}
            showTools={canActuallyDraw && showMobileTools}
            collaborative={true}
            socket={socket}
            lobbyId={lobby.id}
            odId={currentUser?.id}
            teamId={myTeam}
            externalStrokes={externalStrokes}
            clearSignal={clearSignal}
            externalCanvasRef={canvasRef}
          />
          
          {/* Bouton toggle outils (si dessinateur) */}
          {canActuallyDraw && (
            <button
              onClick={() => setShowMobileTools(!showMobileTools)}
              className={`absolute bottom-3 left-3 p-3 rounded-full shadow-lg z-30 ${
                showMobileTools ? 'bg-purple-600 text-white' : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              <Palette className="w-5 h-5" />
            </button>
          )}
        </div>
        
        {/* Zone réponse mobile (si pas dessinateur) */}
        {!isDrawingTeam && (
          <>
            {/* FAB pour ouvrir la modal de réponse */}
            {!hasFoundWord && (
              <button
                onClick={() => setShowMobileGuessModal(true)}
                className="fixed bottom-4 right-4 w-14 h-14 bg-purple-600 text-white rounded-full shadow-xl flex items-center justify-center z-40 active:scale-95"
              >
                <MessageCircle className="w-6 h-6" />
              </button>
            )}
            
            {/* Indicateur trouvé */}
            {hasFoundWord && (
              <div className="flex-shrink-0 bg-green-500 px-4 py-3 text-center">
                <p className="text-white font-bold flex items-center justify-center gap-2">
                  <Check className="w-5 h-5" />
                  🎉 Bravo ! Vous avez trouvé !
                </p>
              </div>
            )}
            
            {/* Modal de réponse */}
            {showMobileGuessModal && (
              <div className="fixed inset-0 bg-black/80 z-50 flex flex-col">
                <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-gray-900">
                  <h3 className="text-white font-bold">Proposer une réponse</h3>
                  <button onClick={() => setShowMobileGuessModal(false)} className="p-2 text-gray-400">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                {/* Historique des propositions */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {myGuesses.length > 0 ? (
                    myGuesses.slice().reverse().map((g, i) => (
                      <div 
                        key={i}
                        className={`px-3 py-2 rounded-lg text-sm ${
                          g.correct 
                            ? 'bg-green-900/50 text-green-400 border border-green-600'
                            : 'bg-red-900/50 text-red-400 border border-red-600'
                        }`}
                      >
                        {g.correct ? '✓' : '✗'} {g.text}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-center py-8">Aucune proposition pour l'instant</p>
                  )}
                </div>
                
                {/* Input de réponse */}
                <div className="flex-shrink-0 p-4 bg-gray-900 border-t border-gray-800">
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      value={guess}
                      onChange={(e) => setGuess(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSubmitGuess()}
                      placeholder="Votre réponse..."
                      className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={handleSubmitGuess}
                      disabled={!guess.trim()}
                      className="px-4 py-3 bg-purple-600 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    );
  }

  // ========== RENDU DESKTOP (JEU EN COURS) ==========
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      {renderPopups()}
      
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold dark:text-white">
                🎨 Pictionary - Tour {(gameState.currentRound || 0) + 1}/{gameState.totalRounds || 0}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {isDrawingTeam ? (
                  <span className="text-green-600 dark:text-green-400 font-medium">Votre équipe dessine !</span>
                ) : (
                  <span>L'équipe <strong className="text-purple-600 dark:text-purple-400">{gameState.drawingTeam}</strong> dessine</span>
                )}
              </p>
            </div>
            
            {/* Timer */}
            <div className="text-right">
              <div className={`flex items-center gap-2 ${
                gameState.timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-600 dark:text-blue-400'
              }`}>
                <Clock className="w-6 h-6" />
                <span className="text-3xl font-bold">{gameState.timeRemaining || 0}s</span>
              </div>
              <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1">
                <div 
                  className={`h-2 rounded-full transition-all ${
                    gameState.timeRemaining <= 10 ? 'bg-red-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${((gameState.timeRemaining || 0) / (gameState.config?.timePerRound || 180)) * 100}%` }}
                />
              </div>
            </div>
          </div>
          
          {/* Scores rapides */}
          <div className="flex gap-4 mt-4 pt-4 border-t border-gray-200 dark:border-gray-600 overflow-x-auto">
            {Object.entries(gameState.scores || {})
              .sort(([,a], [,b]) => b - a)
              .map(([team, score], idx) => (
                <div 
                  key={team}
                  className={`flex items-center gap-2 px-3 py-1 rounded-full whitespace-nowrap ${
                    team === myTeam 
                      ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' 
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  {idx === 0 && <Crown className="w-4 h-4 text-yellow-500" />}
                  <span className="font-medium">{team}</span>
                  <span className="font-bold">{score}</span>
                </div>
              ))}
          </div>
        </div>
        
        {/* Zone principale */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Canvas */}
          <div className="lg:col-span-3">
            {isDrawingTeam ? (
              // Vue dessinateur
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                {/* Mot à faire deviner */}
                <div className="bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg p-4 mb-4 text-center">
                  <p className="text-sm text-white/80">Mot à faire deviner :</p>
                  <p className="text-3xl font-bold text-white">{gameState.currentWord || '???'}</p>
                </div>
                
                {/* Info rotation dessinateur */}
                {hasRotation && (
                  <div className={`mb-4 p-3 rounded-lg text-center ${
                    canActuallyDraw 
                      ? 'bg-green-100 dark:bg-green-900/30 border border-green-400'
                      : 'bg-orange-100 dark:bg-orange-900/30 border border-orange-400'
                  }`}>
                    {canActuallyDraw ? (
                      <p className="text-green-700 dark:text-green-300 font-bold">✏️ C'est votre tour de dessiner !</p>
                    ) : (
                      <p className="text-orange-700 dark:text-orange-300">
                        👀 C'est au tour de <strong>{currentDrawer?.pseudo || '...'}</strong> de dessiner
                        {gameState.drawerRotationTime > 0 && <span className="ml-2">({gameState.drawerRotationTime}s)</span>}
                      </p>
                    )}
                  </div>
                )}
                
                {!hasRotation && (
                  <div className="mb-4 p-3 rounded-lg text-center bg-blue-100 dark:bg-blue-900/30 border border-blue-400">
                    <p className="text-blue-700 dark:text-blue-300">🎨 Toute l'équipe peut dessiner en même temps !</p>
                  </div>
                )}
                
                <DrawingCanvas
                  width={700}
                  height={450}
                  canDraw={canActuallyDraw}
                  showTools={canActuallyDraw}
                  collaborative={true}
                  socket={socket}
                  lobbyId={lobby.id}
                  odId={currentUser?.id}
                  teamId={myTeam}
                  externalStrokes={externalStrokes}
                  clearSignal={clearSignal}
                  externalCanvasRef={canvasRef}
                />
              </div>
            ) : (
              // Vue devineur
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                <DrawingCanvas
                  width={700}
                  height={450}
                  canDraw={false}
                  showTools={false}
                  externalStrokes={externalStrokes}
                  clearSignal={clearSignal}
                />
                
                {/* Zone de réponse */}
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                  {hasFoundWord ? (
                    <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-lg p-4 text-center">
                      <Check className="w-10 h-10 mx-auto text-green-600 dark:text-green-400 mb-2" />
                      <p className="text-green-700 dark:text-green-300 font-bold text-lg">🎉 Bravo ! Vous avez trouvé !</p>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        ref={inputRef}
                        type="text"
                        value={guess}
                        onChange={(e) => setGuess(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSubmitGuess()}
                        placeholder="Tapez votre réponse..."
                        className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-lg focus:border-purple-500 focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={handleSubmitGuess}
                        disabled={!guess.trim()}
                        className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-semibold"
                      >
                        <Send className="w-5 h-5" />
                        Proposer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Sidebar */}
          <div className="space-y-4">
            {/* Équipes qui ont trouvé */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
              <h3 className="font-bold dark:text-white mb-3 flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                Ont trouvé
              </h3>
              {gameState.teamsFound?.length > 0 ? (
                <div className="space-y-2">
                  {gameState.teamsFound.map((team, idx) => (
                    <div key={team} className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '✓'}</span>
                      <span className={`font-medium ${team === myTeam ? 'text-purple-600 dark:text-purple-400' : 'text-green-700 dark:text-green-300'}`}>
                        {team}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">Personne n'a encore trouvé...</p>
              )}
            </div>
            
            {/* Mes propositions */}
            {!isDrawingTeam && myGuesses.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                <h3 className="font-bold dark:text-white mb-3">Vos propositions</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {myGuesses.slice().reverse().map((g, i) => (
                    <div 
                      key={i}
                      className={`text-sm px-2 py-1 rounded ${
                        g.correct 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}
                    >
                      {g.correct ? '✓' : '✗'} {g.text}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Rappel pour l'équipe qui dessine */}
            {isDrawingTeam && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                <h3 className="font-bold dark:text-white mb-3">💡 Rappel</h3>
                <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <li>• Pas de lettres ni de chiffres</li>
                  <li>• Pas de mots dans le dessin</li>
                  <li>• Faites deviner avec des images !</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrawingLobbyView;
