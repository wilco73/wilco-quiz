import React, { useState } from 'react';
import { 
  Trophy, Medal, Crown, ThumbsUp, ThumbsDown, Star, 
  Download, Home, RotateCcw, ChevronLeft, ChevronRight,
  ImageIcon
} from 'lucide-react';
import Avatar from './Avatar';

/**
 * MemeResultsView - Résultats de fin de partie Make It Meme
 * 
 * Props:
 * - players: [{ odId, pseudo, avatar, totalScore }]
 * - allMemes: [{ id, player_id, player_pseudo, final_image_base64, total_score, votes }]
 * - currentUser: { id, pseudo }
 * - onPlayAgain: () => void
 * - onBackToLobby: () => void
 */
export default function MemeResultsView({
  players = [],
  allMemes = [],
  currentUser,
  onPlayAgain,
  onBackToLobby,
}) {
  const [selectedMemeIndex, setSelectedMemeIndex] = useState(0);

  // Enrichir les players avec leurs memes
  const playersWithMemes = players.map(player => ({
    ...player,
    memes: allMemes.filter(m => m.player_id === player.odId)
  }));

  // Trier par score décroissant
  const sortedPlayers = [...playersWithMemes].sort((a, b) => b.totalScore - a.totalScore);
  
  // Podium (top 3)
  const winner = sortedPlayers[0];
  const second = sortedPlayers[1];
  const third = sortedPlayers[2];

  // Position du joueur actuel
  const currentPlayerRank = sortedPlayers.findIndex(p => p.odId === currentUser?.id) + 1;
  const currentPlayerData = sortedPlayers.find(p => p.odId === currentUser?.id);

  // Télécharger un meme
  const downloadMeme = (imageBase64, filename) => {
    const link = document.createElement('a');
    link.href = imageBase64;
    link.download = filename || 'meme.png';
    link.click();
  };

  // Télécharger tous les memes
  const downloadAllMemes = () => {
    allMemes.forEach((meme, index) => {
      setTimeout(() => {
        downloadMeme(meme.final_image_base64, `meme_${index + 1}_${meme.player_pseudo}.png`);
      }, index * 500);
    });
  };

  // Couleurs pour le podium
  const podiumColors = {
    1: 'from-yellow-400 to-yellow-600',
    2: 'from-gray-300 to-gray-500',
    3: 'from-orange-400 to-orange-600',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
          <h1 className="text-3xl font-bold text-white">
            Résultats
          </h1>
        </div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-4 mb-8 h-56">
          {/* 2ème place */}
          {second && (
            <div className="flex flex-col items-center">
              <div className="mb-2">
                <Medal className="w-6 h-6 text-gray-300" />
              </div>
              <Avatar avatarId={second.avatar || 'default'} size="lg" />
              <div className={`w-24 sm:w-28 bg-gradient-to-t ${podiumColors[2]} rounded-t-lg p-2 h-28 flex flex-col items-center justify-end mt-2`}>
                <p className="text-white font-bold text-sm truncate w-full text-center">
                  {second.pseudo}
                </p>
                <p className="text-white/90 text-lg font-bold">
                  {second.totalScore}
                </p>
              </div>
              <div className="bg-gray-600 w-24 sm:w-28 text-center py-1 rounded-b-lg">
                <span className="text-gray-200 font-bold text-sm">2ème</span>
              </div>
            </div>
          )}

          {/* 1ère place */}
          {winner && (
            <div className="flex flex-col items-center">
              <div className="mb-2 animate-bounce">
                <Crown className="w-8 h-8 text-yellow-400" />
              </div>
              <Avatar avatarId={winner.avatar || 'default'} size="xl" />
              <div className={`w-28 sm:w-32 bg-gradient-to-t ${podiumColors[1]} rounded-t-lg p-3 h-36 flex flex-col items-center justify-end mt-2`}>
                <p className="text-white font-bold truncate w-full text-center">
                  {winner.pseudo}
                </p>
                <p className="text-white text-2xl font-bold">
                  {winner.totalScore}
                </p>
              </div>
              <div className="bg-yellow-600 w-28 sm:w-32 text-center py-1 rounded-b-lg">
                <span className="text-white font-bold">1er 🎉</span>
              </div>
            </div>
          )}

          {/* 3ème place */}
          {third && (
            <div className="flex flex-col items-center">
              <div className="mb-2">
                <Medal className="w-5 h-5 text-orange-400" />
              </div>
              <Avatar avatarId={third.avatar || 'default'} size="lg" />
              <div className={`w-20 sm:w-24 bg-gradient-to-t ${podiumColors[3]} rounded-t-lg p-2 h-20 flex flex-col items-center justify-end mt-2`}>
                <p className="text-white font-bold text-xs truncate w-full text-center">
                  {third.pseudo}
                </p>
                <p className="text-white/90 font-bold">
                  {third.totalScore}
                </p>
              </div>
              <div className="bg-orange-700 w-20 sm:w-24 text-center py-1 rounded-b-lg">
                <span className="text-white font-bold text-sm">3ème</span>
              </div>
            </div>
          )}
        </div>

        {/* Position du joueur si pas sur le podium */}
        {currentPlayerData && currentPlayerRank > 3 && (
          <div className="bg-purple-900/40 border border-purple-500/30 rounded-xl p-4 mb-6 text-center">
            <p className="text-purple-300">
              Vous êtes <span className="font-bold text-white">{currentPlayerRank}ème</span> avec{' '}
              <span className="font-bold text-yellow-400">{currentPlayerData.totalScore} points</span>
            </p>
          </div>
        )}

        {/* Classement complet */}
        <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-400" />
            Classement complet
          </h2>
          <div className="space-y-2">
            {sortedPlayers.map((player, index) => (
              <div
                key={player.odId}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  player.odId === currentUser?.id
                    ? 'bg-purple-600/30 border border-purple-500'
                    : 'bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-gray-400 text-black' :
                    index === 2 ? 'bg-orange-500 text-white' :
                    'bg-gray-600 text-white'
                  }`}>
                    {index + 1}
                  </span>
                  <Avatar avatarId={player.avatar || 'default'} size="sm" />
                  <span className="text-white font-medium">
                    {player.pseudo}
                    {player.odId === currentUser?.id && (
                      <span className="text-purple-300 text-sm ml-2">(vous)</span>
                    )}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-yellow-400 font-bold">{player.totalScore} pts</p>
                  <p className="text-xs text-gray-400">
                    {player.memes?.length || 0} meme{(player.memes?.length || 0) !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Galerie des memes */}
        <div className="bg-gray-800/50 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-pink-400" />
              Galerie des memes ({allMemes.length})
            </h2>
            {allMemes.length > 0 && (
              <button
                onClick={downloadAllMemes}
                className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
              >
                <Download className="w-4 h-4" />
                Tout télécharger
              </button>
            )}
          </div>

          {allMemes.length > 0 ? (
            <div className="relative">
              <div className="flex items-center justify-center">
                <button
                  onClick={() => setSelectedMemeIndex(Math.max(0, selectedMemeIndex - 1))}
                  disabled={selectedMemeIndex === 0}
                  className="p-2 text-white disabled:opacity-30"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>

                <div className="flex-1 max-w-md mx-4">
                  <img
                    src={allMemes[selectedMemeIndex]?.final_image_base64}
                    alt="Meme"
                    className="w-full rounded-lg shadow-xl"
                  />
                  <div className="mt-2 text-center">
                    <p className="text-white font-medium">
                      Par {allMemes[selectedMemeIndex]?.player_pseudo}
                    </p>
                    <p className="text-yellow-400 text-sm">
                      {allMemes[selectedMemeIndex]?.total_score || 0} pts
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedMemeIndex(Math.min(allMemes.length - 1, selectedMemeIndex + 1))}
                  disabled={selectedMemeIndex === allMemes.length - 1}
                  className="p-2 text-white disabled:opacity-30"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
              </div>

              {/* Indicateurs */}
              <div className="flex justify-center gap-1 mt-3">
                {allMemes.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedMemeIndex(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === selectedMemeIndex ? 'bg-purple-500' : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>

              {/* Télécharger ce meme */}
              <div className="flex justify-center mt-3">
                <button
                  onClick={() => downloadMeme(
                    allMemes[selectedMemeIndex]?.final_image_base64,
                    `meme_${allMemes[selectedMemeIndex]?.player_pseudo}.png`
                  )}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm text-white transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Télécharger
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              <ImageIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucun meme à afficher</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onBackToLobby}
            className="flex-1 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Home className="w-5 h-5" />
            Retour au menu
          </button>
          
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-5 h-5" />
            Rejouer
          </button>
        </div>
      </div>
    </div>
  );
}
