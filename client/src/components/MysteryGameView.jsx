import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Grid, X, Users, Play, StopCircle, Volume2, VolumeX, 
  ArrowLeft, Crown, Sparkles, Eye
} from 'lucide-react';
import { useToast } from './ToastProvider';

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
  const [gameState, setGameState] = useState(lobby?.gameState || {});
  const [participants, setParticipants] = useState(lobby?.participants || []);
  const [currentReveal, setCurrentReveal] = useState(lobby?.currentReveal || null);
  const [status, setStatus] = useState(lobby?.status || 'waiting');
  const [isMuted, setIsMuted] = useState(false);
  const [revealAnimation, setRevealAnimation] = useState(null); // { index, phase: 'flip' | 'show' }
  const [grid, setGrid] = useState(lobby?.grid || null);
  
  const audioRef = useRef(null);
  const toast = useToast();

  // Rejoindre le lobby au montage
  useEffect(() => {
    if (!socket || !lobby?.id || !currentUser) return;
    
    // Les joueurs rejoignent le lobby, les admins utilisent le monitoring
    if (isAdmin) {
      socket.emit('mystery:joinMonitoring', { lobbyId: lobby.id }, (response) => {
        if (response.success && response.lobby) {
          setGameState(response.lobby.gameState || {});
          setParticipants(response.lobby.participants || []);
          setStatus(response.lobby.status);
          setGrid(response.lobby.grid);
          setCurrentReveal(response.lobby.currentReveal);
        }
      });
    } else {
      // Joueur - rejoindre en tant que participant
      socket.emit('mystery:joinLobby', { 
        lobbyId: lobby.id, 
        odId: currentUser.id,
        pseudo: currentUser.pseudo,
        teamName: currentUser.teamName
      }, (response) => {
        if (response.success && response.lobby) {
          setGameState(response.lobby.gameState || {});
          setParticipants(response.lobby.participants || []);
          setStatus(response.lobby.status);
          setGrid(response.lobby.grid);
          setCurrentReveal(response.lobby.currentReveal);
        } else {
          toast.error(response.message || 'Erreur connexion');
        }
      });
    }
    
    // Cleanup - quitter le lobby
    return () => {
      if (!isAdmin && currentUser) {
        socket.emit('mystery:leaveLobby', { lobbyId: lobby.id, odId: currentUser.id }, () => {});
      }
    };
  }, [socket, lobby?.id, currentUser, isAdmin]);

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

  // Calculer le nombre de colonnes adaptatif
  const getGridColumns = useCallback(() => {
    const totalCells = gameState?.totalCells || grid?.gridSize || 12;
    
    // Mobile: 3-4 colonnes
    // Tablet: 4-6 colonnes
    // Desktop: 6-8 colonnes
    if (totalCells <= 9) return { mobile: 3, tablet: 3, desktop: 3 };
    if (totalCells <= 16) return { mobile: 4, tablet: 4, desktop: 4 };
    if (totalCells <= 25) return { mobile: 4, tablet: 5, desktop: 5 };
    if (totalCells <= 36) return { mobile: 4, tablet: 6, desktop: 6 };
    if (totalCells <= 49) return { mobile: 5, tablet: 7, desktop: 7 };
    return { mobile: 5, tablet: 8, desktop: 8 };
  }, [gameState?.totalCells, grid?.gridSize]);

  const cols = getGridColumns();

  // Actions admin
  const handleStartGame = () => {
    socket.emit('mystery:startGame', { lobbyId: lobby.id }, (response) => {
      if (!response.success) {
        toast.error(response.message || 'Erreur');
      }
    });
  };

  const handleRevealCell = (cellIndex) => {
    if (!isAdmin || status !== 'playing') return;
    
    const cell = gameState.cells?.find(c => c.index === cellIndex);
    if (!cell || cell.revealed) return;
    
    socket.emit('mystery:revealCell', { lobbyId: lobby.id, cellIndex }, (response) => {
      if (!response.success) {
        toast.error(response.message || 'Erreur');
      }
    });
  };

  const handleCloseReveal = () => {
    socket.emit('mystery:closeReveal', { lobbyId: lobby.id }, () => {});
  };

  const handleFinishGame = () => {
    if (!window.confirm('Terminer la partie ?')) return;
    socket.emit('mystery:finishGame', { lobbyId: lobby.id }, (response) => {
      if (!response.success) {
        toast.error(response.message || 'Erreur');
      }
    });
  };

  const handleToggleMute = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    
    socket.emit('mystery:toggleMute', { 
      lobbyId: lobby.id, 
      odId: currentUser?.odId, 
      muted: newMuted 
    }, () => {});
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
    
    return (
      <button
        key={index}
        onClick={() => handleRevealCell(index)}
        disabled={!isAdmin || status !== 'playing' || isRevealed}
        className={`
          aspect-square rounded-lg border-2 transition-all duration-300 relative overflow-hidden
          ${isRevealed 
            ? 'bg-purple-100 dark:bg-purple-900/30 border-purple-400 dark:border-purple-600' 
            : isAdmin && status === 'playing'
              ? 'bg-gradient-to-br from-purple-500 to-indigo-600 border-purple-400 hover:scale-105 hover:shadow-lg cursor-pointer'
              : 'bg-gradient-to-br from-purple-500 to-indigo-600 border-purple-400'
          }
          ${isFlipping ? 'animate-flip' : ''}
        `}
        style={{
          transform: isFlipping ? 'rotateY(90deg)' : 'rotateY(0deg)',
          transition: 'transform 0.3s ease-in-out'
        }}
      >
        {isRevealed ? (
          // Case révélée - afficher thumbnail/image
          <div className="w-full h-full flex items-center justify-center p-1">
            {(cellInfo?.type?.thumbnailUrl || cellInfo?.type?.imageUrl) ? (
              <img 
                src={cellInfo.type.thumbnailUrl || cellInfo.type.imageUrl}
                alt={cellInfo.type?.name}
                className="w-full h-full object-cover rounded"
              />
            ) : (
              <div className="text-center">
                <Sparkles className="w-6 h-6 text-purple-500 mx-auto" />
                <span className="text-xs text-purple-600 dark:text-purple-400 truncate block mt-1">
                  {cellInfo?.type?.name}
                </span>
              </div>
            )}
          </div>
        ) : (
          // Case non révélée - afficher numéro
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">
              {index + 1}
            </span>
          </div>
        )}
        
        {/* Overlay hover pour admin */}
        {isAdmin && status === 'playing' && !isRevealed && (
          <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
            <Eye className="w-8 h-8 text-white drop-shadow-lg" />
          </div>
        )}
      </button>
    );
  };

  // === ÉCRAN D'ATTENTE ===
  if (status === 'waiting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex flex-col">
        {/* Header */}
        <div className="p-4 flex justify-between items-center">
          <button
            onClick={onLeave}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
          >
            <ArrowLeft className="w-5 h-5" />
            Quitter
          </button>
          <button
            onClick={handleToggleMute}
            className="p-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
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

            {/* Bouton start (admin) */}
            {isAdmin ? (
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
        
        <audio ref={audioRef} />
      </div>
    );
  }

  // === ÉCRAN DE JEU ===
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 flex flex-col">
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-black/20">
        <div className="flex items-center gap-4">
          <button
            onClick={onLeave}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 text-white rounded-lg hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Quitter</span>
          </button>
          <div>
            <h1 className="text-lg md:text-xl font-bold text-white">{grid?.title}</h1>
            <p className="text-purple-300 text-sm">
              {gameState.revealedCount || 0} / {gameState.totalCells || grid?.gridSize} révélées
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isAdmin && (
            <span className="px-2 py-1 bg-yellow-500 text-black rounded text-xs font-bold flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Admin
            </span>
          )}
          <button
            onClick={handleToggleMute}
            className={`p-2 rounded-lg ${isMuted ? 'bg-red-600' : 'bg-white/10'} text-white hover:bg-white/20`}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          {isAdmin && status === 'playing' && (
            <button
              onClick={handleFinishGame}
              className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <StopCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Stop</span>
            </button>
          )}
        </div>
      </div>

      {/* Grille */}
      <div className="flex-1 p-4 flex items-center justify-center">
        <div 
          className="w-full max-w-4xl grid gap-2 md:gap-3"
          style={{
            gridTemplateColumns: `repeat(${cols.mobile}, 1fr)`,
          }}
        >
          <style>{`
            @media (min-width: 640px) {
              .mystery-grid { grid-template-columns: repeat(${cols.tablet}, 1fr) !important; }
            }
            @media (min-width: 1024px) {
              .mystery-grid { grid-template-columns: repeat(${cols.desktop}, 1fr) !important; }
            }
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
            className="mystery-grid w-full grid gap-2 md:gap-3"
            style={{
              gridTemplateColumns: `repeat(${cols.mobile}, 1fr)`,
            }}
          >
            {Array.from({ length: gameState.totalCells || grid?.gridSize || 0 }, (_, i) => renderCell(i))}
          </div>
        </div>
      </div>

      {/* Participants (petite barre en bas) */}
      <div className="p-2 bg-black/20 flex items-center justify-center gap-2 flex-wrap">
        <Users className="w-4 h-4 text-purple-300" />
        {participants.slice(0, 10).map((p, idx) => (
          <span key={idx} className="px-2 py-0.5 bg-purple-600/30 text-purple-200 rounded text-xs">
            {p.pseudo}
          </span>
        ))}
        {participants.length > 10 && (
          <span className="text-purple-300 text-xs">+{participants.length - 10}</span>
        )}
      </div>

      {/* Modale de révélation */}
      {currentReveal && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={isAdmin ? handleCloseReveal : undefined}
        >
          <div 
            className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 md:p-8 max-w-lg w-full text-center animate-bounce-in shadow-2xl"
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
            <div className="inline-block px-4 py-1 bg-white/20 rounded-full text-white text-sm mb-4">
              Case #{currentReveal.index + 1}
            </div>
            
            {/* Image */}
            {currentReveal.imageUrl && (
              <div className="mb-4 rounded-xl overflow-hidden bg-white/10 p-2">
                <img 
                  src={currentReveal.imageUrl}
                  alt={currentReveal.name}
                  className="w-full max-h-64 object-contain rounded-lg"
                />
              </div>
            )}
            
            {/* Nom */}
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 flex items-center justify-center gap-3">
              <Sparkles className="w-8 h-8 text-yellow-400" />
              {currentReveal.name}
              <Sparkles className="w-8 h-8 text-yellow-400" />
            </h2>
            
            {/* Bouton fermer (admin) */}
            {isAdmin && (
              <button
                onClick={handleCloseReveal}
                className="mt-4 px-6 py-3 bg-white text-purple-700 rounded-xl font-bold hover:bg-purple-100 transition-colors"
              >
                Continuer
              </button>
            )}
            
            {!isAdmin && (
              <p className="text-purple-200 text-sm mt-4">
                En attente de l'admin...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Écran de fin */}
      {status === 'finished' && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-8 max-w-md w-full text-center">
            <Sparkles className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-4">Partie terminée !</h2>
            <p className="text-green-200 mb-6">
              Toutes les cases ont été découvertes.
            </p>
            <button
              onClick={onLeave}
              className="px-6 py-3 bg-white text-green-700 rounded-xl font-bold hover:bg-green-100"
            >
              Retour au menu
            </button>
          </div>
        </div>
      )}

      <audio ref={audioRef} />
    </div>
  );
};

export default MysteryGameView;
