import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Clock, Users, LogOut, Image, RefreshCw, Play, RotateCcw, Smartphone
} from 'lucide-react';
import DrawingCanvas from './DrawingCanvas';
import { RelayConfig, RelayResults } from './RelayGame';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

// Dimensions canvas fixes pour cohérence
const CANVAS_WIDTH = 700;
const CANVAS_HEIGHT = 450;

const RelayLobbyView = ({
  lobby: initialLobby,
  currentUser,
  socket,
  onLeave
}) => {
  const [lobby, setLobby] = useState(initialLobby);
  const [gameState, setGameState] = useState(null);
  const [clearSignal, setClearSignal] = useState(0);
  const [externalStrokes, setExternalStrokes] = useState([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [references, setReferences] = useState([]);
  const canvasRef = useRef(null);
  const gameStateRef = useRef(null);
  
  // États responsive
  const [isMobile, setIsMobile] = useState(false);
  const [isPortrait, setIsPortrait] = useState(false);
  
  const myTeam = currentUser?.teamName;
  const isRoomMaster = lobby?.creator_id === currentUser?.id;
  const isCreatedByParticipant = lobby?.creator_type === 'participant';
  
  const lobbyTeams = lobby?.participants 
    ? [...new Set(lobby.participants.map(p => p.team_name).filter(Boolean))]
    : [];
  
  const myAssignment = gameState?.assignments?.find(a => a.team === myTeam);
  
  // Détecter mobile et orientation
  useEffect(() => {
    const checkDevice = () => {
      const mobile = window.innerWidth < 768 || ('ontouchstart' in window && window.innerWidth < 1024);
      setIsMobile(mobile);
      setIsPortrait(window.innerHeight > window.innerWidth);
    };
    checkDevice();
    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', checkDevice);
    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);
  
  // Garder gameStateRef synchronisé
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);
  
  useEffect(() => {
    setLobby(initialLobby);
  }, [initialLobby]);
  
  useEffect(() => {
    fetch(`${API_URL}/drawing-references`)
      .then(res => res.json())
      .then(data => setReferences(data || []))
      .catch(err => console.error('Erreur chargement références:', err));
  }, []);
  
  // Fonction de sauvegarde avec useCallback
  const saveMyDrawing = useCallback(async () => {
    const currentGameState = gameStateRef.current;
    if (!canvasRef.current || currentGameState?.phase !== 'drawing') {
      console.log('[RELAY] Sauvegarde ignorée - pas en phase dessin');
      return;
    }
    
    const teamMembers = lobby?.participants?.filter(p => p.team_name === myTeam) || [];
    const firstMember = teamMembers[0];
    
    // Seul le premier membre de l'équipe sauvegarde
    if (!firstMember || firstMember.participant_id !== currentUser?.id) {
      console.log('[RELAY] Sauvegarde ignorée - pas le premier membre');
      return;
    }
    
    try {
      console.log('[RELAY] Sauvegarde du dessin...');
      const imageData = canvasRef.current.toDataURL('image/png');
      const result = await socket.relaySaveDrawing(lobby.id, myTeam, imageData);
      console.log('[RELAY] Résultat sauvegarde:', result);
    } catch (error) {
      console.error('[RELAY] Erreur sauvegarde:', error);
    }
  }, [lobby, myTeam, currentUser, socket]);
  
  useEffect(() => {
    if (!socket || !lobby) return;
    
    const handleLobbyUpdated = (data) => {
      if (data.lobby && data.lobby.id === lobby.id) {
        setLobby(data.lobby);
      }
    };
    
    const handleStarted = (data) => {
      if (data.lobbyId === lobby.id) {
        setGameState({ ...data, status: 'playing' });
        setExternalStrokes([]);
        setClearSignal(0);
      }
    };
    
    const handleTimerTick = (data) => {
      setGameState(prev => prev ? {
        ...prev,
        phase: data.phase,
        phaseTimeRemaining: data.phaseTimeRemaining,
        currentRound: data.currentRound
      } : null);
    };
    
    const handlePhaseChange = (data) => {
      setGameState(prev => prev ? {
        ...prev,
        phase: data.phase,
        phaseTimeRemaining: data.phaseTimeRemaining
      } : null);
      
      if (data.phase === 'drawing') {
        setExternalStrokes([]);
        setClearSignal(prev => prev + 1);
      }
    };
    
    const handleDrawingTimeUp = async () => {
      // Sauvegarder le dessin quand le temps est écoulé
      const currentGameState = gameStateRef.current;
      if (!canvasRef.current || currentGameState?.phase !== 'drawing') return;
      
      const teamMembers = lobby?.participants?.filter(p => p.team_name === myTeam) || [];
      const firstMember = teamMembers[0];
      
      if (firstMember && firstMember.participant_id === currentUser?.id) {
        try {
          console.log('[RELAY] Temps écoulé - sauvegarde...');
          const imageData = canvasRef.current.toDataURL('image/png');
          await socket.relaySaveDrawing(lobby.id, myTeam, imageData);
          console.log('[RELAY] Dessin sauvegardé avec succès');
        } catch (error) {
          console.error('[RELAY] Erreur sauvegarde:', error);
        }
      }
    };
    
    const handleNewPassage = (data) => {
      setGameState(prev => prev ? {
        ...prev,
        currentRound: data.currentRound,
        phase: data.phase,
        phaseTimeRemaining: data.phaseTimeRemaining,
        assignments: data.assignments
      } : null);
      setExternalStrokes([]);
      setClearSignal(prev => prev + 1);
    };
    
    const handleEnded = (data) => {
      setGameState(prev => prev ? {
        ...prev,
        status: 'finished',
        chains: data.chains,
        teams: data.teams,
        totalRounds: data.totalRounds
      } : null);
    };
    
    // En mode Relay, seuls les strokes de notre équipe sont acceptés
    const handleStroke = (data) => {
      if (data.lobbyId === lobby.id && data.teamId === myTeam) {
        setExternalStrokes(prev => [...prev, data]);
      }
    };
    
    const handleFill = (data) => {
      if (data.lobbyId === lobby.id && data.teamId === myTeam) {
        setExternalStrokes(prev => [...prev, { ...data, type: 'fill' }]);
      }
    };
    
    const handleShape = (data) => {
      if (data.lobbyId === lobby.id && data.teamId === myTeam) {
        setExternalStrokes(prev => [...prev, { ...data, type: 'shape' }]);
      }
    };
    
    const handleClear = (data) => {
      // Clear peut venir du serveur (fromServer) ou de notre équipe
      if (data.lobbyId === lobby.id && (data.fromServer || data.teamId === myTeam)) {
        setExternalStrokes([]);
        setClearSignal(prev => prev + 1);
      }
    };
    
    socket.on('drawingLobby:updated', handleLobbyUpdated);
    socket.on('relay:started', handleStarted);
    socket.on('relay:timerTick', handleTimerTick);
    socket.on('relay:phaseChange', handlePhaseChange);
    socket.on('relay:drawingTimeUp', handleDrawingTimeUp);
    socket.on('relay:newRound', handleNewPassage);
    socket.on('relay:ended', handleEnded);
    socket.on('drawing:stroke', handleStroke);
    socket.on('drawing:fill', handleFill);
    socket.on('drawing:shape', handleShape);
    socket.on('drawing:clear', handleClear);
    
    return () => {
      socket.off('drawingLobby:updated', handleLobbyUpdated);
      socket.off('relay:started', handleStarted);
      socket.off('relay:timerTick', handleTimerTick);
      socket.off('relay:phaseChange', handlePhaseChange);
      socket.off('relay:drawingTimeUp', handleDrawingTimeUp);
      socket.off('relay:newRound', handleNewPassage);
      socket.off('relay:ended', handleEnded);
      socket.off('drawing:stroke', handleStroke);
      socket.off('drawing:fill', handleFill);
      socket.off('drawing:shape', handleShape);
      socket.off('drawing:clear', handleClear);
    };
  }, [socket, lobby, myTeam, currentUser]);
  
  const handleLeave = async () => {
    await socket.leaveDrawingLobby(lobby.id, currentUser.id);
    onLeave();
  };
  
  const handleStartRelay = async (config, filteredRefs) => {
    setShowConfigModal(false);
    const result = await socket.startRelay(lobby.id, config, filteredRefs);
    if (!result.success) {
      alert(result.message || 'Erreur lors du lancement');
    }
  };
  
  const formatTime = (seconds) => {
    if (!seconds || seconds > 9000) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Partie terminée
  if (gameState?.status === 'finished') {
    return (
      <RelayResults
        chains={gameState.chains || []}
        teams={gameState.teams || []}
        totalRounds={gameState.totalRounds || 0}
        onBack={handleLeave}
      />
    );
  }
  
  // Salle d'attente
  if (!gameState || gameState.status !== 'playing') {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold dark:text-white flex items-center gap-2">
                <RefreshCw className="w-6 h-6 text-purple-600" />
                Passe moi le relais
                {isRoomMaster && (
                  <span className="text-sm px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded">
                    👑 Maître
                  </span>
                )}
              </h2>
              <button
                onClick={handleLeave}
                className="px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Quitter
              </button>
            </div>
            
            {currentUser && (
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg text-center">
                <p className="text-purple-700 dark:text-purple-300">
                  Vous êtes <strong>{currentUser.pseudo}</strong>
                  {myTeam && <span> ({myTeam})</span>}
                </p>
              </div>
            )}
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="font-bold dark:text-white mb-3 flex items-center gap-2">
              <Users className="w-5 h-5" />
              Participants ({lobby?.participants?.length || 0})
            </h3>
            <div className="flex flex-wrap gap-2">
              {lobby?.participants?.map(p => (
                <span 
                  key={p.participant_id}
                  className={`px-3 py-1 rounded-full text-sm flex items-center gap-1 ${
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
              <p className="text-orange-600 dark:text-orange-400 text-sm mt-3">
                ⚠️ Il faut au moins 2 équipes différentes pour jouer
              </p>
            )}
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h3 className="font-bold dark:text-white mb-3">📋 Comment ça marche ?</h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-600 dark:text-gray-400 text-sm">
              <li>Chaque équipe reçoit une image de référence</li>
              <li><strong>Phase d'observation</strong> : Mémorisez l'image</li>
              <li><strong>Phase de dessin</strong> : Reproduisez de mémoire (toute l'équipe)</li>
              <li>Votre dessin passe à l'équipe suivante</li>
              <li>À la fin, on compare l'original et les dessins !</li>
            </ol>
          </div>
          
          {(isRoomMaster || !isCreatedByParticipant) && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
              {isRoomMaster ? (
                <>
                  <p className="text-gray-600 dark:text-gray-400 text-center mb-4">
                    En tant que maître de la room, vous pouvez lancer la partie !
                  </p>
                  <button
                    onClick={() => setShowConfigModal(true)}
                    disabled={lobbyTeams.length < 2}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg flex items-center justify-center gap-2"
                  >
                    <Play className="w-5 h-5" />
                    Configurer et lancer
                  </button>
                </>
              ) : (
                <div className="text-center">
                  <div className="animate-pulse mb-2">
                    <RefreshCw className="w-12 h-12 mx-auto text-purple-400" />
                  </div>
                  <p className="text-gray-600 dark:text-gray-400">En attente du lancement...</p>
                </div>
              )}
            </div>
          )}
          
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 text-center text-sm text-gray-600 dark:text-gray-400">
            <p>📷 {references.length} images de référence disponibles</p>
          </div>
        </div>
        
        {showConfigModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <RelayConfig
              references={references}
              teams={lobbyTeams}
              onStart={handleStartRelay}
              onCancel={() => setShowConfigModal(false)}
            />
          </div>
        )}
      </div>
    );
  }
  
  // Phase d'observation
  if (gameState.phase === 'observation') {
    const imageToShow = myAssignment?.referenceUrl || myAssignment?.sourceDrawingData;
    const isOriginal = gameState.currentRound === 0;
    
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-2 sm:p-4 flex flex-col"
        style={{ paddingTop: isMobile ? 'max(0.5rem, env(safe-area-inset-top))' : undefined }}
      >
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 sm:p-4 mb-2 sm:mb-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg sm:text-xl font-bold dark:text-white">👀 Mémorisez !</h2>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  Passage {gameState.currentRound + 1}/{gameState.totalRounds}
                </p>
              </div>
              <div className={`text-xl sm:text-3xl font-bold ${
                gameState.phaseTimeRemaining <= 10 ? 'text-red-500 animate-pulse' : 'text-blue-600 dark:text-blue-400'
              }`}>
                <Clock className="w-4 h-4 sm:w-6 sm:h-6 inline mr-1" />
                {formatTime(gameState.phaseTimeRemaining)}
              </div>
            </div>
          </div>
          
          {/* Image */}
          <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 sm:p-6 text-center flex flex-col min-h-0">
            <p className="flex-shrink-0 text-sm sm:text-lg text-gray-600 dark:text-gray-400 mb-2 sm:mb-4">
              {isOriginal ? '📷 Mémorisez cette image !' : `🖼️ Dessin de l'équipe ${myAssignment?.sourceTeam}`}
            </p>
            
            <div className="flex-1 flex items-center justify-center min-h-0">
              {imageToShow ? (
                <img 
                  src={imageToShow} 
                  alt="Image à mémoriser" 
                  className="max-w-full max-h-full object-contain rounded-lg shadow-lg" 
                />
              ) : (
                <div className="bg-gray-200 dark:bg-gray-700 rounded-lg p-8 sm:p-12">
                  <Image className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-gray-400" />
                  <p className="text-gray-500 dark:text-gray-400 mt-4 text-sm sm:text-base">Image non disponible</p>
                </div>
              )}
            </div>
            
            <p className="flex-shrink-0 text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2 sm:mt-4">
              {myAssignment?.referenceName || 'Image'}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Phase de dessin
  if (gameState.phase === 'drawing') {
    // Mobile portrait : demander de tourner
    if (isMobile && isPortrait) {
      return (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex flex-col items-center justify-center p-6 text-center">
          <div className="animate-bounce mb-6">
            <Smartphone className="w-16 h-16 text-purple-400 transform rotate-90" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-3">Tournez votre téléphone</h2>
          <p className="text-gray-300 mb-6">Pour dessiner confortablement, passez en mode paysage</p>
          <div className="flex items-center gap-2 text-purple-400">
            <RotateCcw className="w-5 h-5 animate-spin" style={{ animationDuration: '3s' }} />
            <span className="text-sm">Rotation automatique</span>
          </div>
          <div className="mt-8 p-4 bg-gray-800/50 rounded-lg">
            <p className="text-sm text-gray-400">Passage {gameState.currentRound + 1}/{gameState.totalRounds}</p>
            <p className={`text-lg font-bold ${gameState.phaseTimeRemaining <= 30 ? 'text-red-400' : 'text-green-400'}`}>
              ⏱️ {formatTime(gameState.phaseTimeRemaining)}
            </p>
          </div>
        </div>
      );
    }
    
    // Mobile paysage : plein écran
    if (isMobile) {
      return (
        <div className="fixed inset-0 flex flex-col bg-gray-900 overflow-hidden">
          <div 
            className="flex-shrink-0 bg-gray-800 px-2 py-1 flex items-center justify-between"
            style={{ paddingTop: 'max(0.25rem, env(safe-area-inset-top))', paddingLeft: 'max(0.5rem, env(safe-area-inset-left))', paddingRight: 'max(0.5rem, env(safe-area-inset-right))' }}
          >
            <div className={`flex items-center gap-1 ${
              gameState.phaseTimeRemaining <= 30 ? 'text-red-500 animate-pulse' : 'text-green-400'
            }`}>
              <Clock className="w-4 h-4" />
              <span className="text-lg font-bold">{formatTime(gameState.phaseTimeRemaining)}</span>
            </div>
            <span className="text-xs text-gray-400">
              Passage {gameState.currentRound + 1}/{gameState.totalRounds}
            </span>
            <span className="text-xs text-purple-400 truncate max-w-[100px]">
              {myAssignment?.referenceName}
            </span>
          </div>
          
          <div className="flex-1 relative bg-white">
            <DrawingCanvas
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              canDraw={true}
              showTools={true}
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
        </div>
      );
    }
    
    // Desktop
    return (
      <div className="h-screen bg-gray-100 dark:bg-gray-900 p-2 flex flex-col overflow-hidden">
        <div className="flex-shrink-0 bg-white dark:bg-gray-800 rounded-lg shadow px-4 py-2 mb-2 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold dark:text-white">✏️ À vos crayons !</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Passage {gameState.currentRound + 1}/{gameState.totalRounds} • {myAssignment?.referenceName || 'Image'}
            </p>
          </div>
          <div className={`text-2xl font-bold ${
            gameState.phaseTimeRemaining <= 30 ? 'text-red-500 animate-pulse' : 'text-green-600 dark:text-green-400'
          }`}>
            <Clock className="w-5 h-5 inline mr-1" />
            {formatTime(gameState.phaseTimeRemaining)}
          </div>
        </div>
        
        <div className="flex-1 bg-white dark:bg-gray-800 rounded-lg shadow p-3 flex flex-col min-h-0">
          <div className="flex-shrink-0 mb-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center text-sm">
            <p className="text-blue-700 dark:text-blue-300">🎨 Toute l'équipe peut dessiner en même temps !</p>
          </div>
          
          <div className="flex-1 min-h-0">
            <DrawingCanvas
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              canDraw={true}
              showTools={true}
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
        </div>
      </div>
    );
  }
  
  // Transition
  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="animate-pulse mb-4">
          <RefreshCw className="w-16 h-16 mx-auto text-purple-400 animate-spin" />
        </div>
        <p className="text-xl font-bold dark:text-white">Préparation du prochain passage...</p>
      </div>
    </div>
  );
};

export default RelayLobbyView;
