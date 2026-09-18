import React from 'react';
import Avatar from './Avatar';

export default function MajorityLobbyView({ lobby, currentUser, isHost, onSetConfig, onStart, onStopGame, onBack }) {
  const enough = lobby.players.length >= lobby.minPlayers;
  return (
    <div className="min-h-full bg-gradient-to-br from-emerald-900 via-gray-900 to-gray-900 text-white rounded-xl p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
            {isHost && <button onClick={onStopGame} className="px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-sm">Fermer</button>}
          </div>
          <h1 className="text-xl font-extrabold">🐑 Majorité</h1>
          <span className="bg-gray-800 rounded-lg px-3 py-1 font-mono font-bold tracking-widest">{lobby.code}</span>
        </div>

        <p className="text-center text-sm text-gray-400 mb-4">Réponds comme la majorité pour marquer. Seul dans ton coin = malus !</p>

        <div className="bg-gray-800/60 rounded-xl p-4 mb-4">
          <h2 className="font-bold mb-2">Joueurs ({lobby.players.length})</h2>
          <div className="flex flex-wrap gap-2">
            {lobby.players.map((p) => (
              <div key={p.odId} className={`flex items-center gap-2 rounded-full px-3 py-1 ${p.odId===currentUser?.id?'bg-emerald-500/30 ring-1 ring-emerald-400':'bg-gray-900/60'}`}>
                <Avatar avatarId={p.avatar} avatarUrl={p.avatarUrl} size="sm" />
                <span className="text-sm font-semibold">{p.pseudo}{p.odId===lobby.hostId && <span className="text-xs text-emerald-300"> (hôte)</span>}</span>
              </div>
            ))}
          </div>
        </div>

        {isHost ? (
          <>
            <div className="bg-gray-800/60 rounded-xl p-4 mb-4 space-y-4">
              <div className="flex flex-wrap gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">Nombre de manches</label>
                  <div className="flex items-center gap-2">
                    <button onClick={()=>onSetConfig({rounds: Math.max(1, lobby.rounds-1)})} className="w-9 h-9 rounded bg-gray-700 hover:bg-gray-600 font-bold">−</button>
                    <span className="w-10 text-center text-lg font-black">{lobby.rounds}</span>
                    <button onClick={()=>onSetConfig({rounds: lobby.rounds+1})} className="w-9 h-9 rounded bg-gray-700 hover:bg-gray-600 font-bold">+</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">Temps de réponse (s)</label>
                  <input type="number" min="10" max="180" defaultValue={lobby.answerTime} onBlur={(e)=>onSetConfig({answerTime: parseInt(e.target.value)||30})} className="w-28 px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 outline-none" />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={lobby.penalizeNoAnswer} onChange={(e)=>onSetConfig({penalizeNoAnswer:e.target.checked})} className="rounded" />
                Malus (−1) en cas de non-réponse
              </label>
            </div>
            <button onClick={onStart} disabled={!enough} className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold disabled:opacity-40 disabled:cursor-not-allowed">
              {enough ? '▶ Démarrer la partie' : `Minimum ${lobby.minPlayers} joueurs`}
            </button>
          </>
        ) : (
          <p className="text-center text-sm text-gray-400">En attente que l'hôte démarre…</p>
        )}
      </div>
    </div>
  );
}
