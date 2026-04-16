import React, { useState } from 'react';
import { 
  Trophy, Medal, Crown, ThumbsUp, ThumbsDown, Star, 
  Download, Share2, Home, RotateCcw, ChevronLeft, ChevronRight,
  ImageIcon
} from 'lucide-react';

/**
 * MemeResultsView - Résultats de fin de partie Make It Meme
 * 
 * Props:
 * - players: [{ odId, pseudo, totalScore, memes: [{ image, votes, score }] }]
 * - currentUser: { odId, pseudo }
 * - onPlayAgain: () => void
 * - onBackToLobby: () => void
 * - lobbyId: string
 */
export default function MemeResultsView({
  players = [],
  currentUser,
  onPlayAgain,
  onBackToLobby,
  lobbyId,
}) {
  const [selectedMemeIndex, setSelectedMemeIndex] = useState(0);
  const [showGallery, setShowGallery] = useState(false);
  const [galleryPlayerIndex, setGalleryPlayerIndex] = useState(0);

  // Trier par score décroissant
  const sortedPlayers = [...players].sort((a, b) => b.totalScore - a.totalScore);
  
  // Podium (top 3)
  const podium = sortedPlayers.slice(0, 3);
  const winner = podium[0];
  const second = podium[1];
  const third = podium[2];

  // Position du joueur actuel
  const currentPlayerRank = sortedPlayers.findIndex(p => p.odId === currentUser?.odId) + 1;
  const currentPlayerData = sortedPlayers.find(p => p.odId === currentUser?.odId);

  // Collecter tous les memes pour la galerie
  const allMemes = players.flatMap(player => 
    (player.memes || []).map(meme => ({
      ...meme,
      playerPseudo: player.pseudo,
      playerId: player.odId,
    }))
  );

  // Télécharger un meme
  const downloadMeme = (imageBase64, filename) => {
    const link = document.createElement('a');
    link.href = imageBase64;
    link.download = filename || 'meme.png';
    link.click();
  };

  // Télécharger tous les memes en ZIP (simplifié - télécharge un par un)
  const downloadAllMemes = () => {
    allMemes.forEach((meme, index) => {
      setTimeout(() => {
        downloadMeme(meme.final_image_base64, `meme_${index + 1}_${meme.playerPseudo}.png`);
      }, index * 500);
    });
  };

  // Couleurs pour le podium
  const podiumColors = {
    1: 'from-yellow-400 to-yellow-600',
    2: 'from-gray-300 to-gray-500',
    3: 'from-orange-400 to-orange-600',
  };

  const podiumIcons = {
    1: <Crown className="w-8 h-8 text-yellow-300" />,
    2: <Medal className="w-7 h-7 text-gray-300" />,
    3: <Medal className="w-6 h-6 text-orange-300" />,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-indigo-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            🏆 Résultats
          </h1>
          <p className="text-gray-400">
            La partie est terminée !
          </p>
        </div>

        {/* Podium */}
        <div className="flex items-end justify-center gap-4 mb-8 h-64">
          {/* 2ème place */}
          {second && (
            <div className="flex flex-col items-center">
              <div className="mb-2">{podiumIcons[2]}</div>
              <div className={`w-24 sm:w-32 bg-gradient-to-t ${podiumColors[2]} rounded-t-lg p-3 h-32 flex flex-col items-center justify-end`}>
                <p className="text-white font-bold text-sm truncate w-full text-center">
                  {second.pseudo}
                </p>
                <p className="text-white/80 text-lg font-bold">
                  {second.totalScore}
                </p>
              </div>
              <div className="bg-gray-700 w-24 sm:w-32 text-center py-1 rounded-b-lg">
                <span className="text-gray-300 font-bold">2ème</span>
              </div>
            </div>
          )}

          {/* 1ère place */}
          {winner && (
            <div className="flex flex-col items-center">
              <div className="mb-2 animate-bounce">{podiumIcons[1]}</div>
              <div className={`w-28 sm:w-36 bg-gradient-to-t ${podiumColors[1]} rounded-t-lg p-3 h-44 flex flex-col items-center justify-end`}>
                <p className="text-white font-bold truncate w-full text-center">
                  {winner.pseudo}
                </p>
                <p className="text-white/90 text-2xl font-bold">
                  {winner.totalScore}
                </p>
              </div>
              <div className="bg-yellow-600 w-28 sm:w-36 text-center py-1 rounded-b-lg">
                <span className="text-white font-bold">1er 🎉</span>
              </div>
            </div>
          )}

          {/* 3ème place */}
          {third && (
            <div className="flex flex-col items-center">
              <div className="mb-2">{podiumIcons[3]}</div>
              <div className={`w-24 sm:w-32 bg-gradient-to-t ${podiumColors[3]} rounded-t-lg p-3 h-24 flex flex-col items-center justify-end`}>
                <p className="text-white font-bold text-sm truncate w-full text-center">
                  {third.pseudo}
                </p>
                <p className="text-white/80 text-lg font-bold">
                  {third.totalScore}
                </p>
              </div>
              <div className="bg-orange-700 w-24 sm:w-32 text-center py-1 rounded-b-lg">
                <span className="text-white font-bold">3ème</span>
              </div>
            </div>
          )}
        </div>

        {/* Position du joueur */}
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
                  player.odId === currentUser?.odId
                    ? 'bg-purple-600/30 border border-purple-500'
                    : 'bg-gray-700/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    index === 0 ? 'bg-yellow-500 text-black' :
                    index === 1 ? 'bg-gray-400 text-black' :
                    index === 2 ? 'bg-orange-500 text-white' :
                    'bg-gray-600 text-white'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="text-white font-medium">
                    {player.pseudo}
                    {player.odId === currentUser?.odId && (
                      <span className="text-purple-300 text-sm ml-2">(vous)</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-yellow-400 font-bold">{player.totalScore} pts</p>
                    <p className="text-xs text-gray-400">
                      {player.memes?.length || 0} meme{(player.memes?.length || 0) > 1 ? 's' : ''}
                    </p>
                  </div>
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
            <button
              onClick={downloadAllMemes}
              className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white transition-colors"
            >
              <Download className="w-4 h-4" />
              Tout télécharger
            </button>
          </div>

          {/* Carousel */}
          {allMemes.length > 0 && (
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
                      Par {allMemes[selectedMemeIndex]?.playerPseudo}
                    </p>
                    <p className="text-yellow-400 text-sm">
                      {allMemes[selectedMemeIndex]?.total_score || 0} pts
                    </p>
                    <div className="flex items-center justify-center gap-3 mt-1 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 text-green-400" />
                        {allMemes[selectedMemeIndex]?.votes?.up || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400" />
                        {allMemes[selectedMemeIndex]?.votes?.super || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsDown className="w-3 h-3 text-red-400" />
                        {allMemes[selectedMemeIndex]?.votes?.down || 0}
                      </span>
                    </div>
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
                    `meme_${allMemes[selectedMemeIndex]?.playerPseudo}.png`
                  )}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-sm text-white transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Télécharger ce meme
                </button>
              </div>
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
