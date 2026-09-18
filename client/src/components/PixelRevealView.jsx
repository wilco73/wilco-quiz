import React from 'react';
import PixelGrid from './PixelGrid';

export default function PixelRevealView({ lobby, isDirector, isHost, onContinue, onStopGame, onBack }) {
  const r = lobby.reveal;
  const last = lobby.currentRound >= lobby.rounds;
  if (!r) return null;
  const scoreColor = r.score >= 70 ? 'text-green-400' : r.score >= 40 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black text-white rounded-xl overflow-hidden">
      <div className="text-center py-3 shrink-0">
        <h1 className="text-2xl font-extrabold">Manche {r.round} — résultat</h1>
        <p className="text-sm text-gray-400">Directeur : <span className="text-cyan-300 font-semibold">{r.directorPseudo}</span></p>
        <p className={`text-4xl font-black ${scoreColor}`}>{r.score}%</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4">
        <div className="flex flex-wrap items-start justify-center gap-6 mb-5">
          <div className="text-center">
            <p className="text-sm font-bold text-gray-300 mb-1">🎯 Cible</p>
            <PixelGrid grid={r.target.grid} size={lobby.gridSize} palette={lobby.palette} maxW="min(38vmin, 260px)" />
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-gray-300 mb-1">🧩 Fusion de l'équipe</p>
            <PixelGrid grid={r.merged} size={lobby.gridSize} palette={lobby.palette} maxW="min(38vmin, 260px)" />
          </div>
        </div>

        {r.grids?.length > 0 && (
          <>
            <p className="text-center text-sm font-bold text-gray-300 mb-2">Grilles individuelles</p>
            <div className="flex flex-wrap items-start justify-center gap-4 pb-4">
              {r.grids.map((pg) => (
                <div key={pg.odId} className="text-center">
                  <PixelGrid grid={pg.grid} size={lobby.gridSize} palette={lobby.palette} maxW="min(24vmin, 150px)" />
                  <p className="text-xs text-gray-400 mt-1">{pg.pseudo}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="shrink-0 p-3 bg-gray-950/80 border-t border-gray-800 flex flex-wrap items-center justify-center gap-3">
        {(isDirector || isHost) ? (
          <button onClick={onContinue} className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold">{last ? '🏁 Voir le classement final' : '▶ Manche suivante'}</button>
        ) : <p className="text-sm text-gray-400 animate-pulse">En attente du Directeur…</p>}
        {isHost && <button onClick={onStopGame} className="px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-red-300 text-sm">Arrêter</button>}
      </div>
    </div>
  );
}
