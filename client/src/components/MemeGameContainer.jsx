import React, { useState, useEffect } from 'react';
import { useSocketContext } from '../contexts/SocketContext';
import useMemeGame from '../hooks/useMemeGame';
import MemeLobbyView from './MemeLobbyView';
import MemeGameView from './MemeGameView';
import { API_URL } from '../config';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

/**
 * MemeGameContainer - Conteneur principal pour le jeu Make It Meme
 * 
 * v12 CORRIGÉ:
 * - Accepte `lobby` directement (quand créé depuis l'accueil)
 * - Accepte `lobbyCode` pour rejoindre par code
 * - Plus d'écran intermédiaire si on a déjà un lobby
 * 
 * Props:
 * - currentUser: { id, pseudo, role }
 * - lobby: object (optionnel, si déjà créé/rejoint)
 * - lobbyCode: string (optionnel, rejoindre par code court)
 * - onBack: () => void
 */
export default function MemeGameContainer({ 
  currentUser, 
  lobby: initialLobby,
  lobbyCode: initialLobbyCode,
  onBack 
}) {
  const socketContext = useSocketContext();
  const socket = socketContext.socket;
  const [availableTags, setAvailableTags] = useState([]);
  const [joinLobbyId, setJoinLobbyId] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [initialJoinAttempted, setInitialJoinAttempted] = useState(false);

  // Hook pour gérer tout le jeu
  const game = useMemeGame(socket, currentUser);

  // Charger les tags disponibles
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const res = await fetch(`${API_URL}/meme-templates/tags`);
        const data = await res.json();
        if (data.success) {
          setAvailableTags(data.tags || []);
        }
      } catch (error) {
        console.error('Erreur chargement tags:', error);
      }
    };
    fetchTags();
  }, []);

  // Si on a un lobby initial (créé depuis l'accueil), rejoindre via socket
  useEffect(() => {
    const joinInitialLobby = async () => {
      if (!initialLobby || game.lobby || !socket || !currentUser) return;
      
      console.log('[MemeGameContainer] Joining initial lobby via socket:', initialLobby.id);
      const result = await game.joinLobby(initialLobby.id);
      console.log('[MemeGameContainer] Join result:', result);
    };
    
    joinInitialLobby();
  }, [initialLobby, socket, currentUser]); // Ne pas mettre game.lobby pour éviter boucle

  // Si on a un code, rejoindre par code
  useEffect(() => {
    const joinByCode = async () => {
      if (!initialLobbyCode || initialLobby || game.lobby || initialJoinAttempted) return;
      if (!socket || !currentUser) return;
      
      setInitialJoinAttempted(true);
      console.log('[MemeGameContainer] Joining by code:', initialLobbyCode);
      const result = await game.joinLobbyByCode(initialLobbyCode);
      console.log('[MemeGameContainer] Join by code result:', result);
    };
    
    joinByCode();
  }, [initialLobbyCode, socket, currentUser, initialLobby, initialJoinAttempted]);

  // Handlers
  const handleCreateLobby = async () => {
    const defaultSettings = {
      rounds: 3,
      creationTime: 120,
      voteTime: 30,
      maxRotations: 3,
      maxUndos: 1,
      tags: [],
    };
    await game.createLobby(defaultSettings);
  };

  const handleJoinLobby = async () => {
    if (!joinLobbyId.trim()) return;
    const input = joinLobbyId.trim().toUpperCase();
    let success;
    
    if (input.length === 6 && !input.includes('-')) {
      success = await game.joinLobbyByCode(input);
    } else {
      success = await game.joinLobby(input);
    }
    
    if (success) {
      setJoinLobbyId('');
      setShowJoinInput(false);
    }
  };

  const handleBack = () => {
    if (game.lobby) {
      game.leaveLobby();
    }
    onBack?.();
  };

  // Affichage du chargement
  if (game.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Chargement...</p>
        </div>
      </div>
    );
  }

  // Affichage de l'erreur
  if (game.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-900/50 border border-red-500 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Erreur</h2>
          <p className="text-red-300 mb-4">{game.error}</p>
          <button
            onClick={handleBack}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  // Vue du jeu en cours (pas en phase lobby)
  if (game.lobby && game.phase && game.phase !== 'lobby') {
    return (
      <MemeGameView
        lobby={game.lobby}
        currentUser={currentUser}
        gamePhase={game.phase}
        template={game.template}
        currentMeme={game.currentMeme}
        allMemes={game.allMemes}
        players={game.players}
        timeRemaining={game.timeRemaining}
        currentVoteIndex={game.currentVoteIndex}
        hasSuperVote={game.hasSuperVote}
        hasSubmitted={game.hasSubmitted}
        rotationsUsed={game.rotationsUsed}
        undosUsed={game.undosUsed}
        maxRotations={game.maxRotations}
        maxUndos={game.maxUndos}
        canRotate={game.canRotate}
        canUndo={game.canUndo}
        votesCount={game.votesCount}
        totalVoters={game.totalVoters}
        hasVoted={game.hasVoted}
        onSubmitCreation={(textLayers, finalImage) => game.submitCreation({ textLayers, finalImage })}
        onCancelSubmission={() => game.cancelSubmission()}
        onVote={(voteType, isSuper) => game.vote(voteType, isSuper)}
        onRotateTemplate={() => game.rotateTemplate()}
        onUndoTemplate={() => game.undoTemplate()}
        onPlayAgain={() => game.playAgain()}
        onBackToLobby={handleBack}
        onSetGetCurrentCreation={(getter) => game.setGetCurrentCreation(getter)}
      />
    );
  }

  // Vue du lobby (salle d'attente)
  if (game.lobby) {
    return (
      <MemeLobbyView
        lobby={game.lobby}
        currentUser={currentUser}
        availableTags={availableTags}
        onStart={() => game.startGame()}
        onLeave={handleBack}
        onUpdateSettings={(settings) => game.updateSettings(settings)}
      />
    );
  }

  // Si on attend de rejoindre un lobby (par code ou lobby initial)
  if (initialLobby || initialLobbyCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Connexion au lobby...</p>
        </div>
      </div>
    );
  }

  // Vue pour créer/rejoindre - SEULEMENT accessible depuis l'admin
  // (si on arrive ici depuis l'accueil, c'est un bug)
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900 p-4">
      <div className="max-w-md mx-auto pt-8">
        <button
          onClick={handleBack}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Retour
        </button>

        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            😂 Make It Meme
          </h1>
          <p className="text-gray-400">
            Créez les memes les plus drôles !
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleCreateLobby}
            className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-lg transition-colors"
          >
            Créer une partie
          </button>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-700"></div>
            <span className="text-gray-500">ou</span>
            <div className="flex-1 h-px bg-gray-700"></div>
          </div>

          {showJoinInput ? (
            <div className="space-y-3">
              <input
                type="text"
                value={joinLobbyId}
                onChange={(e) => setJoinLobbyId(e.target.value.toUpperCase())}
                placeholder="Entrez le code du lobby"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-center font-mono text-xl uppercase focus:outline-none focus:ring-2 focus:ring-purple-500"
                maxLength={36}
                autoFocus
                onKeyPress={(e) => e.key === 'Enter' && handleJoinLobby()}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowJoinInput(false);
                    setJoinLobbyId('');
                  }}
                  className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleJoinLobby}
                  disabled={!joinLobbyId.trim()}
                  className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Rejoindre
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowJoinInput(true)}
              className="w-full py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-bold text-lg transition-colors"
            >
              Rejoindre une partie
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
