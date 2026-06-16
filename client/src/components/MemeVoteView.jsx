import React, { useState, useEffect } from 'react';
import { ThumbsUp, Minus, ThumbsDown, Star, Clock, Users, Hash, Loader2 } from 'lucide-react';

/**
 * MemeVoteView - Interface de vote pour un meme
 *
 * v2 - Vote au clic (plus de bouton "Valider") :
 * - Cliquer sur un bouton enregistre/met à jour le vote immédiatement.
 * - Le joueur peut changer son vote tant que la phase de vote sur ce meme dure.
 * - Les boutons Super Vote / Super Downvote sont affichés à côté des autres,
 *   mais uniquement si le super correspondant est encore disponible.
 * - Le super n'est réellement décompté que côté serveur, quand le vote sur ce meme
 *   est terminé (voir finalizeSuperVotesForCreation).
 *
 * Props:
 * - meme: { id, player_id, pseudo, final_image_base64 }
 * - currentUser: { id, pseudo }
 * - timeRemaining: number (secondes)
 * - currentIndex / totalMemes
 * - canVote: boolean (false si c'est son propre meme)
 * - hasSuperVote / hasSuperDownvote: boolean (super encore dispo cette manche)
 * - onVote: (voteType: 'up' | 'neutral' | 'down', isSuper: boolean) => void
 * - roundNumber / totalRounds
 * - votesCount / totalVoters
 * - hasVoted: boolean (le joueur a déjà émis un vote sur ce meme)
 */
export default function MemeVoteView({
  meme,
  currentUser,
  timeRemaining,
  currentIndex,
  totalMemes,
  canVote = true,
  hasSuperVote = true,
  hasSuperDownvote = true,
  onVote,
  roundNumber = 1,
  totalRounds = 3,
  votesCount = 0,
  totalVoters = 0,
  hasVoted: hasVotedProp = false,
}) {
  // Vote sélectionné localement : { type: 'up'|'neutral'|'down', isSuper: boolean } | null
  const [selected, setSelected] = useState(null);
  const [hasVotedLocal, setHasVotedLocal] = useState(false);

  const hasVoted = hasVotedProp || hasVotedLocal;

  // Reset quand on change de meme
  useEffect(() => {
    setSelected(null);
    setHasVotedLocal(false);
  }, [meme?.id]);

  const isOwnMeme = meme?.player_id === currentUser?.id;

  // Émettre / changer le vote immédiatement au clic
  const castVote = (type, isSuper = false) => {
    if (isOwnMeme) return;
    setSelected({ type, isSuper });
    setHasVotedLocal(true);
    onVote(type, isSuper);
  };

  const isActive = (type, isSuper = false) =>
    selected?.type === type && !!selected?.isSuper === !!isSuper;

  const isCritical = timeRemaining <= 5;

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
              Meme {currentIndex + 1}/{totalMemes}
            </span>
          </div>
          {totalVoters > 0 && (
            <div className={`rounded-lg px-3 py-1 flex items-center gap-2 ${
              votesCount >= totalVoters ? 'bg-green-600/70' : 'bg-gray-800/70'
            }`}>
              <span className="text-white text-sm">
                ✓ {votesCount}/{totalVoters} votes
              </span>
            </div>
          )}
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

      {isOwnMeme && (
        <div className="text-center mb-2">
          <span className="text-purple-400 font-bold">Votre création</span>
        </div>
      )}

      {/* Image du meme */}
      <div className="flex-1 flex items-center justify-center mb-4">
        <div className="relative max-w-lg w-full">
          <img
            src={meme?.final_image_base64}
            alt="Meme"
            className="w-full rounded-xl shadow-2xl"
          />
          {isOwnMeme && (
            <div className="absolute top-4 right-4 bg-purple-600/90 text-white px-3 py-1 rounded-lg text-sm font-semibold">
              Votre création
            </div>
          )}
        </div>
      </div>

      {/* Zone de vote */}
      {canVote && !isOwnMeme ? (
        <div className="max-w-2xl mx-auto w-full">
          {/* Rangée de boutons : Super👎 | 👎 | 😐 | 👍 | Super👍
              Les boutons super ne sont affichés que si le super correspondant est dispo. */}
          <div className="flex gap-2 sm:gap-3 mb-4 items-stretch justify-center">
            {/* Super Downvote */}
            {hasSuperDownvote && (
              <button
                onClick={() => castVote('down', true)}
                className={`flex-1 py-4 rounded-xl font-bold flex flex-col items-center gap-1 transition-all ${
                  isActive('down', true)
                    ? 'bg-orange-600 text-white scale-105 ring-2 ring-orange-400'
                    : 'bg-gray-800 text-orange-300 border border-orange-500/40 hover:bg-gray-700'
                }`}
                title="Super Downvote (-100 pts)"
              >
                <ThumbsDown className="w-7 h-7 fill-current" />
                <span className="text-xs">-100</span>
              </button>
            )}

            {/* Downvote */}
            <button
              onClick={() => castVote('down', false)}
              className={`flex-1 py-4 rounded-xl font-bold flex flex-col items-center gap-1 transition-all ${
                isActive('down', false)
                  ? 'bg-red-600 text-white scale-105 ring-2 ring-red-400'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <ThumbsDown className="w-7 h-7" />
              <span className="text-xs">-50</span>
            </button>

            {/* Neutral */}
            <button
              onClick={() => castVote('neutral', false)}
              className={`flex-1 py-4 rounded-xl font-bold flex flex-col items-center gap-1 transition-all ${
                isActive('neutral', false)
                  ? 'bg-gray-600 text-white scale-105 ring-2 ring-gray-400'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Minus className="w-7 h-7" />
              <span className="text-xs">0</span>
            </button>

            {/* Upvote */}
            <button
              onClick={() => castVote('up', false)}
              className={`flex-1 py-4 rounded-xl font-bold flex flex-col items-center gap-1 transition-all ${
                isActive('up', false)
                  ? 'bg-green-600 text-white scale-105 ring-2 ring-green-400'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              <ThumbsUp className="w-7 h-7" />
              <span className="text-xs">+100</span>
            </button>

            {/* Super Upvote */}
            {hasSuperVote && (
              <button
                onClick={() => castVote('up', true)}
                className={`flex-1 py-4 rounded-xl font-bold flex flex-col items-center gap-1 transition-all ${
                  isActive('up', true)
                    ? 'bg-yellow-500 text-black scale-105 ring-2 ring-yellow-300'
                    : 'bg-gray-800 text-yellow-300 border border-yellow-500/40 hover:bg-gray-700'
                }`}
                title="Super Vote (+200 pts)"
              >
                <Star className="w-7 h-7 fill-current" />
                <span className="text-xs">+200</span>
              </button>
            )}
          </div>

          {/* Statut du vote (modifiable) */}
          {hasVoted ? (
            <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-3 text-center">
              <p className="text-green-300 text-sm">
                ✓ Vote enregistré — vous pouvez encore le changer
              </p>
              <div className="mt-2 flex items-center justify-center gap-2 text-gray-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>En attente des autres ({votesCount}/{totalVoters})</span>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm">
              Cliquez pour voter (vous pourrez changer d'avis)
            </p>
          )}
        </div>
      ) : isOwnMeme ? (
        <div className="max-w-lg mx-auto w-full">
          <div className="bg-purple-900/30 border border-purple-500/30 rounded-xl p-6 text-center">
            <p className="text-purple-300 text-lg">🎨 C'est votre meme !</p>
            <p className="text-gray-400 text-sm mt-2">
              Vous ne pouvez pas voter pour votre propre création.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>En attente des votes... ({votesCount}/{totalVoters})</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-lg mx-auto w-full">
          <div className="bg-green-900/30 border border-green-500/30 rounded-xl p-6 text-center">
            <p className="text-green-300 text-lg">✓ Vote enregistré !</p>
            <div className="mt-3 flex items-center justify-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>En attente des autres joueurs... ({votesCount}/{totalVoters})</span>
            </div>
          </div>
        </div>
      )}

      {/* Légende des points */}
      <div className="mt-4 text-center text-xs text-gray-500">
        👍 +100 • 😐 0 • 👎 -50 • ⭐ Super +200 / -100 (1 par manche, décompté à la fin du vote)
      </div>
    </div>
  );
}
