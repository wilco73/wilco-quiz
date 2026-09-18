import React from 'react';
import Avatar from './Avatar';

export default function PixelLobbyView({ lobby, currentUser, isHost, onSetConfig, onStart, onStopGame, onBack }) {
  const enough = lobby.players.length >= lobby.minPlayers;
  return (
    <div className="min-h-full bg-gradient-to-br from-cyan-900 via-gray-900 to-gray-900 text-white rounded-xl p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
            {isHost && <button onClick={onStopGame} className="px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-sm">Fermer</button>}
          </div>
          <h1 className="text-xl font-extrabold">🎨 Pixel-Art</h1>
          <span className="bg-gray-800 rounded-lg px-3 py-1 font-mono font-bold tracking-widest">{lobby.code}</span>
        </div>

        <div className="bg-gray-800/60 rounded-xl p-4 mb-4">
          <h2 className="font-bold mb-2">Joueurs ({lobby.players.length})</h2>
          <div className="flex flex-wrap gap-2">
            {lobby.players.map((p) => (
              <div key={p.odId} className={`flex items-center gap-2 rounded-full px-3 py-1 ${p.odId===currentUser?.id?'bg-cyan-500/30 ring-1 ring-cyan-400':'bg-gray-900/60'}`}>
                <Avatar avatarId={p.avatar} avatarUrl={p.avatarUrl} size="sm" />
                <span className="text-sm font-semibold">{p.pseudo}{p.odId===lobby.hostId && <span className="text-xs text-cyan-300"> (hôte)</span>}</span>
              </div>
            ))}
          </div>
        </div>

        {isHost ? (
          <>
            <div className="bg-gray-800/60 rounded-xl p-4 mb-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Taille de la grille</label>
                <div className="grid grid-cols-3 gap-2">
                  {lobby.gridSizes.map((s) => (
                    <button key={s} onClick={()=>onSetConfig({gridSize:s})} className={`py-2 rounded-lg font-bold text-sm border-2 ${lobby.gridSize===s?'border-cyan-400 bg-cyan-400/10':'border-gray-700 hover:border-gray-500'}`}>{s}×{s}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Choix du Directeur à chaque manche</label>
                <div className="grid grid-cols-2 gap-2">
                  {[['random','Aléatoire'],['vote','Élu par les joueurs']].map(([v,label])=>(
                    <button key={v} onClick={()=>onSetConfig({directorMode:v})} className={`py-2 rounded-lg font-bold text-sm border-2 ${lobby.directorMode===v?'border-cyan-400 bg-cyan-400/10':'border-gray-700 hover:border-gray-500'}`}>{label}</button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">Nombre de manches</label>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>onSetConfig({rounds: Math.max(1, lobby.rounds-1)})} className="w-9 h-9 rounded bg-gray-700 hover:bg-gray-600 font-bold">−</button>
                    <span className="w-10 text-center text-lg font-black">{lobby.rounds}</span>
                    <button onClick={()=>onSetConfig({rounds: lobby.rounds+1})} className="w-9 h-9 rounded bg-gray-700 hover:bg-gray-600 font-bold">+</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">Durée par manche (s)</label>
                  <input type="number" min="30" max="600" defaultValue={lobby.roundDuration} onBlur={(e)=>onSetConfig({roundDuration: parseInt(e.target.value)||90})} className="w-28 px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 outline-none" />
                </div>
              </div>
            </div>
            <button onClick={onStart} disabled={!enough} className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold disabled:opacity-40 disabled:cursor-not-allowed">
              {enough ? '▶ Démarrer la partie' : `Minimum ${lobby.minPlayers} joueurs`}
            </button>
          </>
        ) : (
          <p className="text-center text-sm text-gray-400">En attente que l'hôte démarre la partie…</p>
        )}
      </div>
    </div>
  );
}
