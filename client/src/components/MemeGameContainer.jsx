import React, { useState, useEffect } from 'react';
import { useSocketContext } from '../contexts/SocketContext';
import useMemeGame from '../hooks/useMemeGame';
import MemeLobbyView from './MemeLobbyView';
import MemeGameView from './MemeGameView';
import { API_URL } from '../config';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

/**
 * MemeGameContainer - Conteneur principal pour le jeu Make It Meme
 * Gère la connexion socket et orchestre les différentes vues
 * 
 * Props:
 * - currentUser: { odId, pseudo, role }
 * - lobbyId: string (optionnel, si on rejoint un lobby existant)
 * - onBack: () => void (retour à la liste des lobbies)
 */
export default function MemeGameContainer({ currentUser, lobbyId: initialLobbyId, onBack }) {
  const socketContext = useSocketContext();
  const socket = socketContext.socket;
  const [availableTags, setAvailableTags] = useState([]);
  const [joinLobbyId, setJoinLobbyId] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);

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

  // Rejoindre automatiquement un lobby si un ID est passé
  useEffect(() => {
    if (initialLobbyId && !game.lobby) {
      game.joinLobby(initialLobbyId);
    }
  }, [initialLobbyId]);

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
    const success = await game.joinLobby(joinLobbyId.trim().toUpperCase());
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
  if (game.loading && !game.lobby) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
          <p className="text-white">Chargement...</p>
        </div>
      </div>
    );
  }

  // Affichage des erreurs
  if (game.error && !game.lobby) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-900/30 border border-red-500/50 rounded-xl p-6 max-w-md text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Erreur</h2>
          <p className="text-red-300 mb-4">{game.error}</p>
          <button
            onClick={() => {
              game.setError(null);
              handleBack();
            }}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  // Pas encore dans un lobby - écran de création/join
  if (!game.lobby) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900 p-4">
        <div className="max-w-md mx-auto pt-8">
          {/* Header */}
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Retour
          </button>

          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">😂 Make It Meme</h1>
            <p className="text-gray-400">Créez les memes les plus drôles !</p>
          </div>

          {/* Actions */}
          <div className="space-y-4">
            <button
              onClick={handleCreateLobby}
              disabled={game.loading}
              className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-lg transition-colors disabled:opacity-50"
            >
              {game.loading ? (
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              ) : (
                'Créer une partie'
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-700" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-900 text-gray-400">ou</span>
              </div>
            </div>

            {showJoinInput ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={joinLobbyId}
                  onChange={(e) => setJoinLobbyId(e.target.value.toUpperCase())}
                  placeholder="Code du lobby (ex: ABC123)"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white text-center font-mono text-xl uppercase focus:outline-none focus:border-purple-500"
                  maxLength={10}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowJoinInput(false)}
                    className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleJoinLobby}
                    disabled={!joinLobbyId.trim() || game.loading}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
                  >
                    Rejoindre
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setShowJoinInput(true)}
                className="w-full py-4 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold transition-colors border border-gray-700"
              >
                Rejoindre une partie
              </button>
            )}
          </div>

          {/* Erreur */}
          {game.error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-500/50 rounded-lg text-red-300 text-center">
              {game.error}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Dans le lobby, en attente
  if (game.phase === 'lobby') {
    return (
      <MemeLobbyView
        lobby={game.lobby}
        currentUser={currentUser}
        availableTags={availableTags}
        onStart={game.startGame}
        onLeave={handleBack}
        onUpdateSettings={game.updateSettings}
      />
    );
  }

  // En jeu
  return (
    <MemeGameView
      lobby={{
        ...game.lobby,
        current_round: game.currentRound,
        phase: game.phase,
      }}
      currentUser={currentUser}
      template={game.template}
      currentMeme={game.currentMeme}
      allMemes={game.allMemes}
      players={game.players}
      timeRemaining={game.timeRemaining}
      currentVoteIndex={game.currentVoteIndex}
      hasSuperVote={game.hasSuperVote}
      rotationsUsed={game.rotationsUsed}
      undosUsed={game.undosUsed}
      canUndo={game.canUndo}
      templatesHistory={game.assignment?.templates_history || []}
      votesCount={game.votesCount}
      totalVoters={game.totalVoters}
      hasVoted={game.hasVoted}
      onSubmitCreation={game.submitCreation}
      onVote={game.vote}
      onRotateTemplate={game.rotateTemplate}
      onUndoTemplate={game.undoTemplate}
      onPlayAgain={game.playAgain}
      onBackToLobby={handleBack}
    />
  );
}
