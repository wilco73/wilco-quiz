import React from 'react';
import Avatar from './Avatar';

export default function AuctionLobbyView({ lobby, currentUser, isHost, onSetConfig, onStart, onStopGame, onBack }) {
  const enough = lobby.players.length >= lobby.minPlayers;
  return (
    <div className="min-h-full bg-gradient-to-br from-amber-900 via-gray-900 to-gray-900 text-white rounded-xl p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
            {isHost && <button onClick={onStopGame} className="px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-sm">Fermer</button>}
          </div>
          <h1 className="text-xl font-extrabold">💰 Encan Clandestin</h1>
          <span className="bg-gray-800 rounded-lg px-3 py-1 font-mono font-bold tracking-widest">{lobby.code}</span>
        </div>
        <p className="text-center text-sm text-gray-400 mb-4">Misez en secret sur des objets. Le plus offrant l'emporte (et paie sa mise). Le plus de points de victoire gagne !</p>

        <div className="bg-gray-800/60 rounded-xl p-4 mb-4">
          <h2 className="font-bold mb-2">Joueurs ({lobby.players.length})</h2>
          <div className="flex flex-wrap gap-2">
            {lobby.players.map((p) => (
              <div key={p.odId} className={`flex items-center gap-2 rounded-full px-3 py-1 ${p.odId===currentUser?.id?'bg-amber-500/30 ring-1 ring-amber-400':'bg-gray-900/60'}`}>
                <Avatar avatarId={p.avatar} avatarUrl={p.avatarUrl} size="sm" />
                <span className="text-sm font-semibold">{p.pseudo}{p.odId===lobby.hostId && <span className="text-xs text-amber-300"> (hôte)</span>}</span>
              </div>
            ))}
          </div>
        </div>

        {isHost ? (
          <>
            <div className="bg-gray-800/60 rounded-xl p-4 mb-4 grid grid-cols-3 gap-3">
              {[['startCoins','Pièces de départ',10,1000],['itemCount','Nombre d\'objets',1,30],['bidTime','Temps de mise (s)',10,120]].map(([key,label,mn,mx])=>(
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">{label}</label>
                  <input type="number" min={mn} max={mx} defaultValue={lobby[key]} onBlur={(e)=>onSetConfig({ [key]: parseInt(e.target.value) || lobby[key] })} className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 outline-none" />
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm mb-4 dark:text-gray-200">
              <input type="checkbox" checked={lobby.cardsEnabled} onChange={(e) => onSetConfig({ cardsEnabled: e.target.checked })} className="rounded" />
              Activer les cartes bonus/malus (pioche : mise 0 → bonus, 2e enchérisseur → malus)
            </label>
            <button onClick={onStart} disabled={!enough} className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold disabled:opacity-40 disabled:cursor-not-allowed">
              {enough ? '▶ Démarrer la partie' : `Minimum ${lobby.minPlayers} joueurs`}
            </button>
          </>
        ) : <p className="text-center text-sm text-gray-400">En attente que l'hôte démarre…</p>}
      </div>
    </div>
  );
}
