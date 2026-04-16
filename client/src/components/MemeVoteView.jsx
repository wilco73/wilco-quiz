import React, { useState, useEffect } from 'react';
import { ThumbsUp, Minus, ThumbsDown, Star, Clock, Users, Hash } from 'lucide-react';

/**
 * MemeVoteView - Interface de vote pour un meme
 * 
 * Props:
 * - meme: { id, player_id, pseudo, final_image_base64 }
 * - currentUser: { odId, pseudo }
 * - timeRemaining: number (secondes)
 * - currentIndex: number (index du meme actuel)
 * - totalMemes: number
 * - canVote: boolean (false si c'est son propre meme)
 * - hasSuperVote: boolean (si le joueur peut encore utiliser son super vote)
 * - onVote: (voteType: 'up' | 'neutral' | 'down', isSuper: boolean) => void
 * - roundNumber: number
 * - totalRounds: number
 */
export default function MemeVoteView({
  meme,
  currentUser,
  timeRemaining,
  currentIndex,
  totalMemes,
  canVote = true,
  hasSuperVote = true,
  onVote,
  roundNumber = 1,
  totalRounds = 3,
}) {
  const [selectedVote, setSelectedVote] = useState(null);
  const [isSuper, setIsSuper] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  // Reset quand on change de meme
  useEffect(() => {
    setSelectedVote(null);
    setIsSuper(false);
    setHasVoted(false);
  }, [meme?.id]);

  const isOwnMeme = meme?.player_id === currentUser?.odId;

  const handleVote = (voteType) => {
    if (hasVoted || isOwnMeme) return;
    setSelectedVote(voteType);
  };

  const handleSuperToggle = () => {
    if (!hasSuperVote || !selectedVote || selectedVote !== 'up') return;
    setIsSuper(!isSuper);
  };

  const submitVote = () => {
    if (!selectedVote || hasVoted) return;
    onVote(selectedVote, isSuper);
    setHasVoted(true);
  };

  // Timer critique
  const isCritical = timeRemaining <= 5;

  // Points par type de vote
  const votePoints = {
    up: isSuper ? '+200' : '+100',
    neutral: '0',
    down: '-50',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-gray-900 to-gray-900 p-4 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="bg-gray-800/70 rounded-lg px-3 py-1 flex items-center gap-2">
            <Hash className="w-4 h-4 text-purple-400" />
            <span className="text-white text-sm">
              Manche {roundNumber}/{totalRounds}
            </span>
          </div>
          <div className="bg-gray-800/70 rounded-lg px-3 py-1 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="text-white text-sm">
              {currentIndex + 1}/{totalMemes}
            </span>
          </div>
        </div>
        
        {/* Timer */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
          isCritical ? 'bg-red-600 animate-pulse' : 'bg-gray-800/70'
        }`}>
          <Clock className={`w-5 h-5 ${isCritical ? 'text-white' : 'text-gray-400'}`} />
          <span className={`text-xl font-mono font-bold ${
            isCritical ? 'text-white' : 'text-yellow-400'
          }`}>
            {timeRemaining}s
          </span>
        </div>
      </div>

      {/* Auteur du meme */}
      <div className="text-center mb-2">
        <span className="text-gray-400">Meme de </span>
        <span className={`font-bold ${isOwnMeme ? 'text-purple-400' : 'text-white'}`}>
          {meme?.pseudo || 'Anonyme'}
          {isOwnMeme && ' (vous)'}
        </span>
      </div>

      {/* Image du meme */}
      <div className="flex-1 flex items-center justify-center mb-4">
        <div className="relative max-w-lg w-full">
          <img
            src={meme?.final_image_base64}
            alt="Meme"
            className="w-full rounded-xl shadow-2xl"
          />
          
          {/* Badge si propre meme */}
          {isOwnMeme && (
            <div className="absolute top-4 right-4 bg-purple-600/90 text-white px-3 py-1 rounded-lg text-sm font-semibold">
              Votre création
            </div>
          )}
        </div>
      </div>

      {/* Zone de vote */}
      {canVote && !isOwnMeme ? (
        <div className="max-w-lg mx-auto w-full">
          {/* Boutons de vote */}
          <div className="flex gap-3 mb-4">
            {/* Downvote */}
            <button
              onClick={() => handleVote('down')}
              disabled={hasVoted}
              className={`flex-1 py-4 rounded-xl font-bold text-lg flex flex-col items-center gap-1 transition-all ${
                selectedVote === 'down'
                  ? 'bg-red-600 text-white scale-105 ring-2 ring-red-400'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              } ${hasVoted ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <ThumbsDown className="w-8 h-8" />
              <span className="text-sm">{votePoints.down}</span>
            </button>

            {/* Neutral */}
            <button
              onClick={() => handleVote('neutral')}
              disabled={hasVoted}
              className={`flex-1 py-4 rounded-xl font-bold text-lg flex flex-col items-center gap-1 transition-all ${
                selectedVote === 'neutral'
                  ? 'bg-gray-600 text-white scale-105 ring-2 ring-gray-400'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              } ${hasVoted ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Minus className="w-8 h-8" />
              <span className="text-sm">{votePoints.neutral}</span>
            </button>

            {/* Upvote */}
            <button
              onClick={() => handleVote('up')}
              disabled={hasVoted}
              className={`flex-1 py-4 rounded-xl font-bold text-lg flex flex-col items-center gap-1 transition-all ${
                selectedVote === 'up'
                  ? isSuper 
                    ? 'bg-yellow-500 text-black scale-105 ring-2 ring-yellow-300'
                    : 'bg-green-600 text-white scale-105 ring-2 ring-green-400'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              } ${hasVoted ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isSuper ? (
                <Star className="w-8 h-8 fill-current" />
              ) : (
                <ThumbsUp className="w-8 h-8" />
              )}
              <span className="text-sm">{votePoints.up}</span>
            </button>
          </div>

          {/* Super vote toggle */}
          {selectedVote === 'up' && hasSuperVote && !hasVoted && (
            <button
              onClick={handleSuperToggle}
              className={`w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all mb-4 ${
                isSuper
                  ? 'bg-yellow-500 text-black'
                  : 'bg-gray-800 text-yellow-400 border border-yellow-500/50 hover:bg-gray-700'
              }`}
            >
              <Star className={`w-5 h-5 ${isSuper ? 'fill-current' : ''}`} />
              {isSuper ? 'Super Vote activé ! (+200 pts)' : 'Activer le Super Vote (+200 pts)'}
            </button>
          )}

          {/* Indicateur super vote déjà utilisé */}
          {selectedVote === 'up' && !hasSuperVote && !hasVoted && (
            <p className="text-center text-gray-500 text-sm mb-4">
              Super vote déjà utilisé cette manche
            </p>
          )}

          {/* Bouton valider */}
          <button
            onClick={submitVote}
            disabled={!selectedVote || hasVoted}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              selectedVote && !hasVoted
                ? 'bg-purple-600 hover:bg-purple-700 text-white'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {hasVoted ? '✓ Vote enregistré' : 'Valider mon vote'}
          </button>
        </div>
      ) : isOwnMeme ? (
        /* Message pour son propre meme */
        <div className="max-w-lg mx-auto w-full">
          <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-6 text-center">
            <p className="text-purple-300 text-lg">
              🎨 C'est votre meme !
            </p>
            <p className="text-gray-400 text-sm mt-2">
              Vous ne pouvez pas voter pour votre propre création.
              <br />
              En attente du prochain meme...
            </p>
          </div>
        </div>
      ) : (
        /* Vote déjà effectué ou pas autorisé */
        <div className="max-w-lg mx-auto w-full">
          <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-6 text-center">
            <p className="text-green-300 text-lg">
              ✓ Vote enregistré !
            </p>
            <p className="text-gray-400 text-sm mt-2">
              En attente des autres joueurs...
            </p>
          </div>
        </div>
      )}

      {/* Légende des points */}
      <div className="mt-4 text-center text-xs text-gray-500">
        👍 +100 pts • 😐 0 pts • 👎 -50 pts • ⭐ Super vote +200 pts (1 par manche)
      </div>
    </div>
  );
}
