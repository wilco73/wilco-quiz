import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, Trophy, Send, Check, Users, Crown, LogOut,
  AlertCircle, Palette, ChevronLeft, ChevronRight, Download, Image
} from 'lucide-react';
import DrawingCanvas from './DrawingCanvas';

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
  const [externalStrokes, setExternalStrokes] = useState([]);
  const [showAllTeamsPopup, setShowAllTeamsPopup] = useState(null);
  const [showTimeUpPopup, setShowTimeUpPopup] = useState(null);
  const [clearSignal, setClearSignal] = useState(0);
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  
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
  
  // Mettre à jour le lobby si la prop change
  useEffect(() => {
    setLobby(initialLobby);
  }, [initialLobby]);
  
  // Écouter les événements Socket
  useEffect(() => {
    if (!socket || !lobby) return;
    
    // Mise à jour du lobby (nouveaux participants, etc.)
    const handleLobbyUpdated = (data) => {
      if (data.lobby && data.lobby.id === lobby.id) {
        console.log('[DRAWING] Lobby mis à jour:', data.lobby.participants?.length, 'participants');
        setLobby(data.lobby);
      }
    };
    
    // Nouveau participant rejoint
    const handleParticipantJoined = (data) => {
      console.log('[DRAWING] Participant rejoint:', data.pseudo);
      // Rafraîchir le lobby depuis l'API pour avoir la liste complète
      fetchLobby();
    };
    
    // Participant quitte
    const handleParticipantLeft = (data) => {
      console.log('[DRAWING] Participant parti:', data.odId);
      fetchLobby();
    };
    
    // Recevoir les traits de dessin
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
    
    // Canvas effacé
    const handleClear = (data) => {
      if (data.lobbyId === lobby.id) {
        setExternalStrokes([]);
        setClearSignal(prev => prev + 1);
        console.log('[DRAWING] Clear reçu');
      }
    };
    
    // Partie démarrée
    const handleStarted = (data) => {
      if (data.lobbyId === lobby.id) {
        setGameState({
          ...data,
          status: 'playing',
          currentWord: null,
          currentDrawerIndex: 0
        });
        setExternalStrokes([]);
        setClearSignal(0); // Reset le signal
        setMyGuesses([]);
        setHasFoundWord(false);
      }
    };
    
    // Timer tick
    const handleTimerTick = (data) => {
      setGameState(prev => prev ? {
        ...prev,
        timeRemaining: data.timeRemaining,
        drawerRotationTime: data.drawerRotationTime
      } : null);
    };
    
    // Révélation du mot (pour l'équipe qui dessine)
    const handleWordReveal = (data) => {
      if (myTeam === data.forTeam) {
        setGameState(prev => prev ? {
          ...prev,
          currentWord: data.word
        } : null);
      }
    };
    
    // Résultat d'une proposition
    const handleGuessResult = (data) => {
      if (data.correct && data.teamName === myTeam) {
        setHasFoundWord(true);
      }
    };
    
    // Mise à jour des scores
    const handleScoreUpdate = (data) => {
      setGameState(prev => prev ? {
        ...prev,
        scores: data.scores,
        teamsFound: data.teamsFound
      } : null);
    };
    
    // Nouveau tour
    const handleNewRound = (data) => {
      setGameState(prev => prev ? {
        ...prev,
        currentRound: data.currentRound,
        drawingTeam: data.drawingTeam,
        timeRemaining: data.timeRemaining,
        teamsFound: [],
        currentWord: null,
        currentDrawerIndex: 0 // Reset l'index du dessinateur
      } : null);
      setExternalStrokes([]);
      setClearSignal(prev => prev + 1); // Effacer le canvas
      setMyGuesses([]);
      setHasFoundWord(false);
      setGuess('');
    };
    
    // Rotation du dessinateur
    const handleDrawerRotation = (data) => {
      setGameState(prev => prev ? {
        ...prev,
        currentDrawerIndex: data.newDrawerIndex,
        drawerRotationTime: prev.config?.timePerDrawer || 0
      } : null);
    };
    
    // Temps écoulé
    const handleTimeUp = (data) => {
      console.log('[DRAWING] TimeUp reçu:', data);
      // Sauvegarder le dessin si c'est notre équipe qui dessine
      saveCurrentDrawing(data.word, data.drawingTeam);
      
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
    
    // Fin de partie
    const handleEnded = (data) => {
      setGameState(prev => prev ? {
        ...prev,
        status: 'finished',
        ranking: data.ranking
      } : null);
    };
    
    // Toutes les équipes ont trouvé
    const handleAllTeamsFound = (data) => {
      console.log('[DRAWING] AllTeamsFound reçu:', data);
      // Sauvegarder le dessin si c'est notre équipe qui dessine
      saveCurrentDrawing(data.word, data.drawingTeam);
      
      setShowAllTeamsPopup({
        word: data.word,
        teamsFound: data.teamsFound,
        scores: data.scores
      });
      
      // Masquer après 4.5 secondes
      setTimeout(() => {
        setShowAllTeamsPopup(null);
      }, 4500);
    };
    
    socket.on('drawing:stroke', handleStroke);
    socket.on('drawing:fill', handleFill);
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
  }, [socket, lobby?.id, myTeam]);
  
  // Fonction pour rafraîchir le lobby depuis l'API
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
  
  // Sauvegarder le dessin actuel (appelé par l'équipe qui dessine)
  const saveCurrentDrawing = async (word, drawingTeam) => {
    console.log('[DRAWING] === DEBUT SAUVEGARDE ===');
    console.log('[DRAWING] myTeam:', myTeam);
    console.log('[DRAWING] drawingTeam:', drawingTeam);
    console.log('[DRAWING] currentUser:', currentUser?.pseudo);
    console.log('[DRAWING] lobby.id:', lobby?.id);
    
    // Seule l'équipe qui dessine sauvegarde
    if (myTeam !== drawingTeam) {
      console.log('[DRAWING] Pas mon équipe qui dessine, skip');
      return;
    }
    
    // Pour éviter les doublons, seul le premier membre de l'équipe qui dessine sauvegarde
    const teamMembers = lobby?.participants?.filter(p => p.team_name === drawingTeam) || [];
    console.log('[DRAWING] Membres équipe:', teamMembers.map(m => m.pseudo));
    
    const firstDrawer = teamMembers[0];
    console.log('[DRAWING] Premier dessinateur:', firstDrawer?.pseudo, '- participant_id:', firstDrawer?.participant_id);
    console.log('[DRAWING] Mon id:', currentUser?.id);
    
    if (!firstDrawer || firstDrawer.participant_id !== currentUser?.id) {
      console.log('[DRAWING] Je ne suis pas le premier dessinateur, skip');
      return;
    }
    
    // Récupérer le canvas
    console.log('[DRAWING] canvasRef.current:', canvasRef.current ? 'EXISTS' : 'NULL');
    if (!canvasRef.current) {
      console.log('[DRAWING] Pas de canvas ref pour sauvegarder');
      return;
    }
    
    try {
      const imageData = canvasRef.current.toDataURL('image/png');
      console.log('[DRAWING] Image générée, taille:', imageData.length);
      
      if (!socket?.pictionarySaveDrawing) {
        console.error('[DRAWING] socket.pictionarySaveDrawing non disponible !');
        return;
      }
      
      const result = await socket.pictionarySaveDrawing(
        lobby.id,
        gameState?.currentRound || 0,
        myTeam,
        word,
        imageData
      );
      
      console.log('[DRAWING] Résultat sauvegarde:', result);
      
      if (result?.success) {
        console.log('[DRAWING] ✅ Dessin sauvegardé:', result.drawingId);
      } else {
        console.error('[DRAWING] ❌ Erreur sauvegarde:', result?.message);
      }
    } catch (error) {
      console.error('[DRAWING] ❌ Exception sauvegarde dessin:', error);
    }
    console.log('[DRAWING] === FIN SAUVEGARDE ===');
  };
  
  // Soumettre une proposition
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
    }
  };
  
  // Quitter le lobby
  const handleLeave = async () => {
    await socket.leaveDrawingLobby(lobby.id, currentUser.id);
    onLeave();
  };
  
  // ==================== RENDUS ====================
  
  // État pour les dessins de la partie terminée
  const [finishedDrawings, setFinishedDrawings] = useState([]);
  const [currentDrawingIndex, setCurrentDrawingIndex] = useState(0);
  
  // Charger les dessins quand la partie est terminée
  useEffect(() => {
    if (gameState?.status === 'finished' && lobby?.id) {
      fetch(`${API_URL}/drawing-lobbies/${lobby.id}/drawings`)
        .then(res => res.json())
        .then(data => setFinishedDrawings(data || []))
        .catch(err => console.error('Erreur chargement dessins:', err));
    }
  }, [gameState?.status, lobby?.id]);
  
  // Télécharger un dessin
  const handleDownloadDrawing = (drawing) => {
    if (!drawing?.image_data) return;
    const link = document.createElement('a');
    link.href = drawing.image_data;
    link.download = `dessin-${drawing.team_name}-${drawing.word}.png`;
    link.click();
  };
  
  // Afficher les résultats finaux
  if (gameState?.status === 'finished') {
    const currentDrawing = finishedDrawings[currentDrawingIndex];
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-600 to-blue-600 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Titre */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mb-6 text-center">
            <h2 className="text-3xl font-bold dark:text-white flex items-center justify-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-500" />
              Partie terminée !
            </h2>
          </div>
          
          {/* Classement */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mb-6">
            <h3 className="text-xl font-bold dark:text-white mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-500" />
              Classement
            </h3>
            <div className="space-y-3">
              {gameState.ranking?.map((entry, idx) => (
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
                    <span className="text-2xl">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `${idx + 1}.`}
                    </span>
                    <span className={`font-bold ${entry.team === myTeam ? 'text-purple-600 dark:text-purple-400' : 'dark:text-white'}`}>
                      {entry.team}
                      {entry.team === myTeam && ' (vous)'}
                    </span>
                  </div>
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-400">
                    {entry.score} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Galerie des dessins */}
          {finishedDrawings.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 mb-6">
              <h3 className="text-xl font-bold dark:text-white mb-4 flex items-center gap-2">
                <Image className="w-5 h-5 text-purple-500" />
                Galerie des dessins ({finishedDrawings.length})
              </h3>
              
              {/* Dessin actuel */}
              {currentDrawing && (
                <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-4">
                  {currentDrawing.image_data ? (
                    <div className="text-center">
                      <img 
                        src={currentDrawing.image_data} 
                        alt={`Dessin de ${currentDrawing.team_name}`}
                        className="max-w-full max-h-80 mx-auto rounded-lg shadow-lg"
                      />
                      <div className="mt-4 flex items-center justify-center gap-6">
                        <div className="text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Équipe</p>
                          <p className={`font-bold ${currentDrawing.team_name === myTeam ? 'text-purple-600 dark:text-purple-400' : 'dark:text-white'}`}>
                            {currentDrawing.team_name}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-gray-500 dark:text-gray-400">Mot</p>
                          <p className="font-bold dark:text-white">{currentDrawing.word}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadDrawing(currentDrawing)}
                        className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2 mx-auto"
                      >
                        <Download className="w-4 h-4" />
                        Télécharger
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Palette className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-500 dark:text-gray-400">Image non disponible</p>
                    </div>
                  )}
                </div>
              )}
              
              {/* Navigation */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setCurrentDrawingIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentDrawingIndex === 0}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 dark:text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                  Précédent
                </button>
                
                <span className="text-gray-600 dark:text-gray-400">
                  {currentDrawingIndex + 1} / {finishedDrawings.length}
                </span>
                
                <button
                  onClick={() => setCurrentDrawingIndex(prev => Math.min(finishedDrawings.length - 1, prev + 1))}
                  disabled={currentDrawingIndex === finishedDrawings.length - 1}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 dark:text-white"
                >
                  Suivant
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
              
              {/* Miniatures */}
              <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                {finishedDrawings.map((drawing, idx) => (
                  <button
                    key={drawing.id || idx}
                    onClick={() => setCurrentDrawingIndex(idx)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                      idx === currentDrawingIndex 
                        ? 'border-purple-500 ring-2 ring-purple-300' 
                        : 'border-gray-300 dark:border-gray-600 hover:border-purple-400'
                    }`}
                  >
                    {drawing.image_data ? (
                      <img 
                        src={drawing.image_data} 
                        alt={`Miniature ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                        <Palette className="w-4 h-4 text-gray-400" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {/* Bouton retour */}
          <button
            onClick={handleLeave}
            className="w-full py-3 bg-white dark:bg-gray-800 text-purple-600 dark:text-purple-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 font-semibold shadow-lg"
          >
            Retour au menu
          </button>
        </div>
      </div>
    );
  }
  
  // Salle d'attente (pas encore de partie)
  if (!gameState || gameState.status !== 'playing') {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                <Palette className="w-6 h-6 text-purple-600" />
                Salle d'attente
              </h2>
              <button
                onClick={handleLeave}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Quitter
              </button>
            </div>
            
            <div className="text-center py-8">
              <div className="animate-pulse mb-4">
                <Palette className="w-16 h-16 mx-auto text-purple-400" />
              </div>
              <h3 className="text-xl font-bold dark:text-white mb-2">
                En attente du lancement...
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                L'administrateur va bientôt démarrer la partie
              </p>
              
              {currentUser && (
                <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <p className="text-purple-700 dark:text-purple-300">
                    Vous êtes connecté en tant que <strong>{currentUser.pseudo}</strong>
                    {myTeam && <span> ({myTeam})</span>}
                  </p>
                </div>
              )}
              
              {lobby?.participants?.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium dark:text-white mb-2">
                    Participants ({lobby.participants.length})
                  </h4>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {lobby.participants.map(p => (
                      <span 
                        key={p.participant_id}
                        className={`px-3 py-1 rounded-full text-sm ${
                          p.participant_id === currentUser?.id
                            ? 'bg-purple-500 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {p.pseudo}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Vue jeu en cours
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      {/* Popup toutes les équipes ont trouvé */}
      {showAllTeamsPopup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 max-w-md animate-pulse">
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
                    <span className={`font-medium ${team === myTeam ? 'text-purple-600 dark:text-purple-400' : 'dark:text-white'}`}>
                      {team} {team === myTeam && '(vous)'}
                    </span>
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
                      <span className={`font-medium ${team === myTeam ? 'text-purple-600 dark:text-purple-400' : 'dark:text-white'}`}>
                        {team} {team === myTeam && '(vous)'}
                      </span>
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
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    Votre équipe dessine !
                  </span>
                ) : (
                  <span>
                    L'équipe <strong className="text-purple-600 dark:text-purple-400">{gameState.drawingTeam}</strong> dessine
                  </span>
                )}
              </p>
            </div>
            
            {/* Timer */}
            <div className="text-right">
              <div className={`flex items-center gap-2 ${
                gameState.timeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-600 dark:text-blue-400'
              }`}>
                <Clock className="w-6 h-6" />
                <span className="text-3xl font-bold">
                  {gameState.timeRemaining || 0}s
                </span>
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
                  <p className="text-3xl font-bold text-white">
                    {gameState.currentWord || '???'}
                  </p>
                </div>
                
                {/* Info rotation dessinateur */}
                {hasRotation && (
                  <div className={`mb-4 p-3 rounded-lg text-center ${
                    canActuallyDraw 
                      ? 'bg-green-100 dark:bg-green-900/30 border border-green-400'
                      : 'bg-orange-100 dark:bg-orange-900/30 border border-orange-400'
                  }`}>
                    {canActuallyDraw ? (
                      <p className="text-green-700 dark:text-green-300 font-bold">
                        ✏️ C'est votre tour de dessiner !
                      </p>
                    ) : (
                      <p className="text-orange-700 dark:text-orange-300">
                        👀 C'est au tour de <strong>{currentDrawer?.pseudo || '...'}</strong> de dessiner
                        {gameState.drawerRotationTime > 0 && (
                          <span className="ml-2">({gameState.drawerRotationTime}s)</span>
                        )}
                      </p>
                    )}
                  </div>
                )}
                
                {!hasRotation && (
                  <div className="mb-4 p-3 rounded-lg text-center bg-blue-100 dark:bg-blue-900/30 border border-blue-400">
                    <p className="text-blue-700 dark:text-blue-300">
                      🎨 Toute l'équipe peut dessiner en même temps !
                    </p>
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
                      <p className="text-green-700 dark:text-green-300 font-bold text-lg">
                        🎉 Bravo ! Vous avez trouvé !
                      </p>
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
                    <div 
                      key={team}
                      className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/20 rounded-lg"
                    >
                      <span className="text-lg">{idx === 0 ? '🥇' : idx === 1 ? '🥈' : '✓'}</span>
                      <span className={`font-medium ${team === myTeam ? 'text-purple-600 dark:text-purple-400' : 'text-green-700 dark:text-green-300'}`}>
                        {team}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Personne n'a encore trouvé...
                </p>
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
