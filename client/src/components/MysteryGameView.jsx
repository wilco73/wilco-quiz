import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  Grid, X, Users, Play, StopCircle, Volume2, VolumeX, 
  ArrowLeft, Crown, Sparkles, Eye, Send
} from 'lucide-react';
import { useToast } from './ToastProvider';
import BroadcastPanel from './BroadcastPanel';
import BroadcastModal, { BroadcastReviewButton, useBroadcastReceiver } from './BroadcastModal';

/**
 * MysteryGameView - Vue de jeu pour les cases mystères
 * Affiche la grille, gère les révélations et la modale
 */
const MysteryGameView = ({ 
  lobby, 
  socket, 
  currentUser, 
  isAdmin, 
  onLeave 
}) => {
  const [loading, setLoading] = useState(true);
  const [gameState, setGameState] = useState({});
  const [participants, setParticipants] = useState([]);
  const [currentReveal, setCurrentReveal] = useState(null);
  const [status, setStatus] = useState('waiting');
  const [isMuted, setIsMuted] = useState(false);
  const [revealAnimation, setRevealAnimation] = useState(null);
  const [grid, setGrid] = useState(null);
  const [showBroadcastPanel, setShowBroadcastPanel] = useState(false);
  const [lobbyCreatedBy, setLobbyCreatedBy] = useState(lobby?.createdBy);
  
  // États responsive
  const [screenSize, setScreenSize] = useState('desktop'); // 'mobile', 'tablet', 'desktop'
  
  const audioRef = useRef(null);
  const toast = useToast();
  
  // Détecter la taille d'écran
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      if (width < 640) {
        setScreenSize('mobile');
      } else if (width < 1024) {
        setScreenSize('tablet');
      } else {
        setScreenSize('desktop');
      }
    };
    
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);
  
  const audioRef = useRef(null);
  const toast = useToast();
  
  // Hook pour recevoir les broadcasts
  const { 
    currentBroadcast, 
    lastBroadcast, 
    hasUnread, 
    closeBroadcast, 
    reviewLastBroadcast 
  } = useBroadcastReceiver(socket?.socket);

  // Déterminer si l'utilisateur peut contrôler ce lobby
  // Seuls le créateur du lobby OU un superadmin peuvent contrôler
  const canControl = useMemo(() => {
    // Superadmin peut tout contrôler
    if (currentUser?.isSuperAdmin) return true;
    
    // Le créateur du lobby peut contrôler (si on connaît le créateur)
    if (lobbyCreatedBy && lobbyCreatedBy === currentUser?.id) return true;
    
    // Les autres (y compris admin non-créateur) ne peuvent pas
    return false;
  }, [currentUser?.isSuperAdmin, currentUser?.id, lobbyCreatedBy]);

  // Rejoindre le lobby au montage et charger les données FRAÎCHES
  const hasJoinedRef = useRef(false);
  const currentLobbyIdRef = useRef(null);
  
  useEffect(() => {
    if (!socket || !lobby?.id || !currentUser) return;
    
    // Si on a déjà rejoint CE lobby, ne pas re-joindre
    if (hasJoinedRef.current && currentLobbyIdRef.current === lobby.id) {
      console.log('[MYSTERY] Already joined this lobby, skipping');
      return;
    }
    
    currentLobbyIdRef.current = lobby.id;
    hasJoinedRef.current = true;
    
    const loadLobbyData = async () => {
      setLoading(true);
      
      // TOUT LE MONDE rejoint comme participant (créateur, admin, user)
      // Seule différence : qui peut CONTRÔLER la partie (créateur ou superadmin)
      console.log('[MYSTERY] Joining as participant:', currentUser.id, currentUser.pseudo);
      const response = await socket.mysteryJoinLobby(
        lobby.id, 
        currentUser.id,
        currentUser.pseudo,
        currentUser.teamName
      );
      console.log('[MYSTERY] Join response:', response);
      
      if (response.success && response.lobby) {
        setGameState(response.lobby.gameState || {});
        setParticipants(response.lobby.participants || []);
        setStatus(response.lobby.status || 'waiting');
        setGrid(response.lobby.grid);
        setCurrentReveal(response.lobby.currentReveal);
        if (response.lobby.createdBy) setLobbyCreatedBy(response.lobby.createdBy);
      } else {
        toast?.error?.(response.message || 'Erreur connexion');
      }
      
      setLoading(false);
    };
    
    loadLobbyData();
    
    // Cleanup - quitter le lobby SEULEMENT si on quitte vraiment (unmount final)
    return () => {
      // On ne reset pas hasJoinedRef ici pour éviter les re-joins en boucle
      // Le leave sera appelé quand l'utilisateur clique sur "Quitter"
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, lobby?.id, currentUser?.id]);
  
  // Effet séparé pour gérer le cleanup quand on quitte vraiment le composant
  useEffect(() => {
    return () => {
      // Cleanup final quand le composant est vraiment démonté
      if (hasJoinedRef.current && currentLobbyIdRef.current && socket && currentUser) {
        console.log('[MYSTERY] Final cleanup - leaving lobby');
        socket.mysteryLeaveLobby(currentLobbyIdRef.current, currentUser.id);
        hasJoinedRef.current = false;
        currentLobbyIdRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Écouter les événements socket
  useEffect(() => {
    if (!socket || !lobby?.id) return;
    
    const handleLobbyUpdated = (updatedLobby) => {
      if (updatedLobby.id === lobby.id) {
        setGameState(updatedLobby.gameState || {});
        setParticipants(updatedLobby.participants || []);
        setStatus(updatedLobby.status);
        if (updatedLobby.grid) setGrid(updatedLobby.grid);
      }
    };
    
    const handleGameStarted = (updatedLobby) => {
      if (updatedLobby.id === lobby.id) {
        setStatus('playing');
        setGameState(updatedLobby.gameState || {});
        toast.success('La partie commence !');
      }
    };
    
    const handleCellRevealed = (data) => {
      const { cellIndex, reveal, gameState: newGameState, allRevealed } = data;
      
      // Animation de flip
      setRevealAnimation({ index: cellIndex, phase: 'flip' });
      
      setTimeout(() => {
        setRevealAnimation({ index: cellIndex, phase: 'show' });
        setGameState(newGameState);
        setCurrentReveal(reveal);
        
        // Jouer le son si pas muted
        if (!isMuted && reveal.soundUrl && audioRef.current) {
          audioRef.current.src = reveal.soundUrl;
          audioRef.current.play().catch(() => {});
        }
        
        if (allRevealed) {
          setTimeout(() => {
            toast.success('Toutes les cases ont été révélées !');
          }, 2000);
        }
      }, 500);
    };
    
    const handleRevealClosed = (updatedLobby) => {
      setCurrentReveal(null);
      setRevealAnimation(null);
    };
    
    const handleGameFinished = (updatedLobby) => {
      setStatus('finished');
      setCurrentReveal(null);
      toast.success('Partie terminée !');
    };
    
    const handleLobbyDeleted = ({ lobbyId }) => {
      if (lobbyId === lobby.id) {
        toast.error('Le lobby a été supprimé');
        onLeave?.();
      }
    };
    
    socket.on('mystery:lobbyUpdated', handleLobbyUpdated);
    socket.on('mystery:gameStarted', handleGameStarted);
    socket.on('mystery:cellRevealed', handleCellRevealed);
    socket.on('mystery:revealClosed', handleRevealClosed);
    socket.on('mystery:gameFinished', handleGameFinished);
    socket.on('mystery:lobbyDeleted', handleLobbyDeleted);
    
    return () => {
      socket.off('mystery:lobbyUpdated', handleLobbyUpdated);
      socket.off('mystery:gameStarted', handleGameStarted);
      socket.off('mystery:cellRevealed', handleCellRevealed);
      socket.off('mystery:revealClosed', handleRevealClosed);
      socket.off('mystery:gameFinished', handleGameFinished);
      socket.off('mystery:lobbyDeleted', handleLobbyDeleted);
    };
  }, [socket, lobby?.id, isMuted, onLeave, toast]);

  // Calculer le nombre optimal de colonnes pour remplir l'écran
  const getGridColumns = useCallback(() => {
    const totalCells = gameState?.totalCells || grid?.gridSize || 12;
    
    // Calcul basé sur le ratio optimal pour remplir l'écran
    // On veut des cases carrées qui remplissent bien l'espace
    const sqrt = Math.sqrt(totalCells);
    const cols = Math.ceil(sqrt);
    
    // Ajuster selon la taille d'écran - moins de colonnes = cases plus grandes
    // Mobile: ratio 9:16 (portrait) -> moins de colonnes
    // Desktop: ratio 16:9 (paysage) -> plus de colonnes
    
    if (totalCells <= 4) return { mobile: 2, tablet: 2, desktop: 2 };
    if (totalCells <= 9) return { mobile: 3, tablet: 3, desktop: 3 };
    if (totalCells <= 12) return { mobile: 3, tablet: 4, desktop: 4 };
    if (totalCells <= 16) return { mobile: 4, tablet: 4, desktop: 4 };
    if (totalCells <= 20) return { mobile: 4, tablet: 5, desktop: 5 };
    if (totalCells <= 25) return { mobile: 5, tablet: 5, desktop: 5 };
    if (totalCells <= 30) return { mobile: 5, tablet: 6, desktop: 6 };
    if (totalCells <= 36) return { mobile: 6, tablet: 6, desktop: 6 };
    if (totalCells <= 42) return { mobile: 6, tablet: 7, desktop: 7 };
    if (totalCells <= 49) return { mobile: 7, tablet: 7, desktop: 7 };
    if (totalCells <= 56) return { mobile: 7, tablet: 8, desktop: 8 };
    if (totalCells <= 64) return { mobile: 8, tablet: 8, desktop: 8 };
    // Pour les très grandes grilles
    return { mobile: Math.min(8, cols), tablet: Math.min(10, cols), desktop: cols };
  }, [gameState?.totalCells, grid?.gridSize]);

  const cols = getGridColumns();

  // Calculer le rôle de l'utilisateur
  const getUserRole = () => {
    if (currentUser?.isSuperAdmin) return 'superadmin';
    if (currentUser?.isAdmin) return 'admin';
    return 'user';
  };

  // Actions admin (créateur ou superadmin uniquement)
  const handleStartGame = async () => {
    const response = await socket.mysteryStartGame(lobby.id, currentUser?.id, getUserRole());
    if (!response.success) {
      toast.error(response.message || 'Erreur');
    }
  };

  const handleRevealCell = async (cellIndex) => {
    if (!canControl || status !== 'playing') return;
    
    const cell = gameState.cells?.find(c => c.index === cellIndex);
    if (!cell || cell.revealed) return;
    
    const response = await socket.mysteryRevealCell(lobby.id, cellIndex, currentUser?.id, getUserRole());
    if (!response.success) {
      toast.error(response.message || 'Erreur');
    }
  };

  const handleCloseReveal = () => {
    socket.mysteryCloseReveal(lobby.id, currentUser?.id, getUserRole());
  };

  const handleFinishGame = async () => {
    if (!window.confirm('Terminer la partie ?')) return;
    const response = await socket.mysteryFinishGame(lobby.id, currentUser?.id, getUserRole());
    if (!response.success) {
      toast.error(response.message || 'Erreur');
    }
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    socket.mysteryToggleMute(lobby.id, currentUser?.id, newMuted);
  };

  // Quitter le lobby proprement
  const handleLeave = () => {
    if (socket && currentUser && lobby?.id) {
      console.log('[MYSTERY] User leaving lobby');
      socket.mysteryLeaveLobby(lobby.id, currentUser.id);
      hasJoinedRef.current = false;
      currentLobbyIdRef.current = null;
    }
    onLeave?.();
  };

  // Trouver les infos d'une cellule
  const getCellInfo = (cellIndex) => {
    const cell = gameState.cells?.find(c => c.index === cellIndex);
    if (!cell) return null;
    
    if (cell.revealed) {
      const type = grid?.types?.find(t => t.id === cell.typeId);
      return { ...cell, type };
    }
    return cell;
  };

  // Rendu d'une cellule
  const renderCell = (index) => {
    const cellInfo = getCellInfo(index);
    const isRevealed = cellInfo?.revealed;
    const isAnimating = revealAnimation?.index === index;
    const isFlipping = isAnimating && revealAnimation.phase === 'flip';
    
    // Taille du numéro selon le nombre de cases et la taille d'écran
    const totalCells = gameState.totalCells || grid?.gridSize || 12;
    const getNumberSize = () => {
      if (screenSize === 'mobile') {
        if (totalCells > 30) return 'text-lg';
        if (totalCells > 16) return 'text-xl';
        return 'text-2xl';
      }
      if (screenSize === 'tablet') {
        if (totalCells > 30) return 'text-2xl';
        if (totalCells > 16) return 'text-3xl';
        return 'text-4xl';
      }
      // Desktop
      if (totalCells > 30) return 'text-3xl';
      if (totalCells > 16) return 'text-5xl';
      return 'text-6xl';
    };
    
    return (
      <button
        key={index}
        onClick={() => handleRevealCell(index)}
        disabled={!canControl || status !== 'playing' || isRevealed}
        className={`
          w-full h-full rounded-lg sm:rounded-xl transition-all duration-300 relative overflow-hidden shadow-md sm:shadow-lg
          ${isRevealed 
            ? 'bg-gradient-to-br from-purple-200 to-indigo-200 dark:from-purple-800/50 dark:to-indigo-800/50 border-purple-400 dark:border-purple-500' 
            : canControl && status === 'playing'
              ? 'bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 border-purple-300 hover:scale-[1.02] hover:shadow-2xl hover:border-yellow-400 cursor-pointer'
              : 'bg-gradient-to-br from-purple-500 via-indigo-500 to-purple-600 border-purple-300'
          }
          ${isFlipping ? 'animate-flip' : ''}
        `}
        style={{
          transform: isFlipping ? 'rotateY(90deg)' : 'rotateY(0deg)',
          transition: 'transform 0.3s ease-in-out',
          borderWidth: screenSize === 'mobile' ? '2px' : '3px'
        }}
      >
        {isRevealed ? (
          // Case révélée - afficher thumbnail/image
          <div className="w-full h-full flex items-center justify-center p-0.5 sm:p-1 md:p-2">
            {(cellInfo?.type?.thumbnailUrl || cellInfo?.type?.imageUrl) ? (
              <img 
                src={cellInfo.type.thumbnailUrl || cellInfo.type.imageUrl}
                alt={cellInfo.type?.name}
                className="w-full h-full object-cover rounded-md sm:rounded-lg"
              />
            ) : (
              <div className="text-center flex flex-col items-center justify-center">
                <Sparkles className="w-4 h-4 sm:w-6 sm:h-6 md:w-10 md:h-10 text-purple-500" />
                <span className="text-xs sm:text-sm md:text-base font-bold text-purple-700 dark:text-purple-300 line-clamp-2 px-0.5">
                  {cellInfo?.type?.name}
                </span>
              </div>
            )}
          </div>
        ) : (
          // Case non révélée - afficher numéro adapté à la taille
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-white/10 to-transparent">
            <span className={`${getNumberSize()} font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]`}>
              {index + 1}
            </span>
          </div>
        )}
        
        {/* Overlay hover pour contrôleur (créateur ou superadmin) */}
        {canControl && status === 'playing' && !isRevealed && (
          <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
            <Eye className="w-6 h-6 sm:w-8 sm:h-8 md:w-12 md:h-12 text-white drop-shadow-lg" />
          </div>
        )}
      </button>
    );
  };

  // === ÉCRAN DE CHARGEMENT ===
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-300 border-t-purple-600 mx-auto mb-4" />
          <p className="text-purple-200 text-lg">Chargement...</p>
        </div>
      </div>
    );
  }

  // === ÉCRAN D'ATTENTE ===
  if (status === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex flex-col">
        {/* Header */}
        <div className="p-4 flex justify-between items-center">
          <button
            onClick={handleLeave}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
            Quitter
          </button>
          <div className="flex items-center gap-2">
            {canControl && (
              <button
                onClick={() => setShowBroadcastPanel(true)}
                className="flex items-center gap-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                title="Envoyer un message"
              >
                <Send className="w-4 h-4" />
                Message
              </button>
            )}
            <button
              onClick={handleToggleMute}
              className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 max-w-md w-full text-center">
            <Grid className="w-16 h-16 text-purple-400 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-white mb-2">{grid?.title}</h1>
            <p className="text-purple-200 mb-6">{grid?.gridSize} cases mystères</p>
            
            {/* Participants */}
            <div className="bg-white/10 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <Users className="w-5 h-5 text-purple-300" />
                <span className="text-purple-200">{participants.length} joueur(s)</span>
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {participants.map((p, idx) => (
                  <span key={idx} className="px-3 py-1 bg-purple-600/50 text-white rounded-full text-sm">
                    {p.pseudo}
                  </span>
                ))}
              </div>
            </div>

            {/* Bouton start (créateur ou superadmin uniquement) */}
            {canControl ? (
              <button
                onClick={handleStartGame}
                disabled={participants.length === 0}
                className="w-full py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Play className="w-6 h-6" />
                Lancer la partie
              </button>
            ) : (
              <div className="text-purple-300 animate-pulse">
                En attente du lancement...
              </div>
            )}
          </div>
        </div>
        
        {/* Panel de broadcast (admin/créateur) - aussi en mode waiting */}
        {canControl && (
          <BroadcastPanel
            isOpen={showBroadcastPanel}
            onClose={() => setShowBroadcastPanel(false)}
            currentLobbyId={lobby?.id}
            currentLobbyType="mystery"
            gridId={lobby?.gridId}
            senderId={currentUser?.id}
            senderPseudo={currentUser?.pseudo}
          />
        )}

        {/* Modal de broadcast reçu */}
        {currentBroadcast && (
          <BroadcastModal
            broadcast={currentBroadcast}
            onClose={closeBroadcast}
          />
        )}

        {/* Bouton pour revoir le dernier message */}
        <BroadcastReviewButton
          lastBroadcast={lastBroadcast}
          hasUnread={hasUnread}
          onClick={reviewLastBroadcast}
        />
        
        <audio ref={audioRef} />
      </div>
    );
  }

  // === ÉCRAN DE JEU ===
  return (
    <div className="h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex flex-col overflow-hidden">
      {/* Header compact */}
      <div className="flex-shrink-0 px-4 py-2 flex justify-between items-center bg-black/30">
        <div className="flex items-center gap-3">
          <button
            onClick={handleLeave}
            className="flex items-center gap-1 px-3 py-1.5 bg-white/10 text-white rounded-lg hover:bg-white/20 text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Quitter</span>
          </button>
          <div>
            <h1 className="text-base md:text-lg font-bold text-white">{grid?.title}</h1>
            <p className="text-purple-300 text-xs">
              {gameState.revealedCount || 0} / {gameState.totalCells || grid?.gridSize} révélées
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {canControl && (
            <span className="px-2 py-0.5 bg-yellow-500 text-black rounded text-xs font-bold flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Maître
            </span>
          )}
          {canControl && (
            <button
              onClick={() => setShowBroadcastPanel(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
              title="Envoyer un message"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Message</span>
            </button>
          )}
          <button
            onClick={handleToggleMute}
            className={`p-1.5 rounded-lg ${isMuted ? 'bg-red-600' : 'bg-white/10'} text-white hover:bg-white/20`}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          {canControl && status === 'playing' && (
            <button
              onClick={handleFinishGame}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm"
            >
              <StopCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          )}
        </div>
      </div>

      {/* Grille plein écran */}
      <div className="flex-1 p-1 sm:p-2 md:p-4 overflow-hidden">
        <style>{`
          @keyframes flip {
            0% { transform: rotateY(0deg); }
            50% { transform: rotateY(90deg); }
            100% { transform: rotateY(0deg); }
          }
          .animate-flip {
            animation: flip 0.5s ease-in-out;
          }
        `}</style>
        <div 
          className="h-full w-full grid gap-1 sm:gap-1.5 md:gap-2 auto-rows-fr"
          style={{
            gridTemplateColumns: `repeat(${cols[screenSize]}, 1fr)`,
          }}
        >
          {Array.from({ length: gameState.totalCells || grid?.gridSize || 0 }, (_, i) => renderCell(i))}
        </div>
      </div>

      {/* Barre participants (très compacte) */}
      <div className="flex-shrink-0 px-2 py-1 bg-black/30 flex items-center justify-center gap-2 flex-wrap text-xs">
        <Users className="w-3 h-3 text-purple-300" />
        <span className="text-purple-300">{participants.length}</span>
        {participants.slice(0, 5).map((p, idx) => (
          <span key={idx} className="px-1.5 py-0.5 bg-purple-600/30 text-purple-200 rounded text-xs">
            {p.pseudo}
          </span>
        ))}
        {participants.length > 5 && (
          <span className="text-purple-300">+{participants.length - 5}</span>
        )}
      </div>

      {/* Modale de révélation */}
      {currentReveal && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4"
          onClick={canControl ? handleCloseReveal : undefined}
        >
          <div 
            className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 max-w-lg w-full text-center animate-bounce-in shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <style>{`
              @keyframes bounce-in {
                0% { transform: scale(0.5); opacity: 0; }
                50% { transform: scale(1.05); }
                100% { transform: scale(1); opacity: 1; }
              }
              .animate-bounce-in {
                animation: bounce-in 0.5s ease-out;
              }
            `}</style>
            
            {/* Numéro de la case */}
            <div className="inline-block px-3 py-0.5 sm:px-4 sm:py-1 bg-white/20 rounded-full text-white text-xs sm:text-sm mb-3 sm:mb-4">
              Case #{currentReveal.index + 1}
            </div>
            
            {/* Image */}
            {currentReveal.imageUrl && (
              <div className="mb-3 sm:mb-4 rounded-lg sm:rounded-xl overflow-hidden bg-white/10 p-1 sm:p-2">
                <img 
                  src={currentReveal.imageUrl}
                  alt={currentReveal.name}
                  className="w-full max-h-40 sm:max-h-56 md:max-h-64 object-contain rounded-lg"
                />
              </div>
            )}
            
            {/* Nom */}
            <h2 className="text-xl sm:text-2xl md:text-4xl font-bold text-white mb-3 sm:mb-4 flex items-center justify-center gap-2 sm:gap-3">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-yellow-400" />
              <span className="flex-1">{currentReveal.name}</span>
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-yellow-400" />
            </h2>
            
            {/* Bouton fermer (créateur ou superadmin) */}
            {canControl && (
              <button
                onClick={handleCloseReveal}
                className="mt-2 sm:mt-4 px-4 sm:px-6 py-2 sm:py-3 bg-white text-purple-700 rounded-lg sm:rounded-xl font-bold hover:bg-purple-100 transition-colors text-sm sm:text-base"
              >
                Continuer
              </button>
            )}
            
            {!canControl && (
              <p className="text-purple-200 text-xs sm:text-sm mt-2 sm:mt-4">
                En attente de l'admin...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Écran de fin */}
      {status === 'finished' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 max-w-md w-full text-center">
            <Sparkles className="w-12 h-12 sm:w-16 sm:h-16 text-yellow-400 mx-auto mb-3 sm:mb-4" />
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Partie terminée !</h2>
            <p className="text-green-200 mb-4 sm:mb-6 text-sm sm:text-base">
              Toutes les cases ont été découvertes.
            </p>
            <button
              onClick={handleLeave}
              className="px-4 sm:px-6 py-2 sm:py-3 bg-white text-green-700 rounded-lg sm:rounded-xl font-bold hover:bg-green-100 text-sm sm:text-base"
            >
              Retour au menu
            </button>
          </div>
        </div>
      )}

      {/* Panel de broadcast (admin/créateur) */}
      {canControl && (
        <BroadcastPanel
          isOpen={showBroadcastPanel}
          onClose={() => setShowBroadcastPanel(false)}
          currentLobbyId={lobby?.id}
          currentLobbyType="mystery"
          gridId={lobby?.gridId}
          senderId={currentUser?.id}
          senderPseudo={currentUser?.pseudo}
        />
      )}

      {/* Modal de broadcast reçu */}
      {currentBroadcast && (
        <BroadcastModal
          broadcast={currentBroadcast}
          onClose={closeBroadcast}
        />
      )}

      {/* Bouton pour revoir le dernier message */}
      <BroadcastReviewButton
        lastBroadcast={lastBroadcast}
        hasUnread={hasUnread}
        onClick={reviewLastBroadcast}
      />

      <audio ref={audioRef} />
    </div>
  );
};

export default MysteryGameView;
