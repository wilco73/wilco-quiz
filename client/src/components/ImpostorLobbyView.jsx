import React, { useState } from 'react';
import Avatar from './Avatar';

export default function ImpostorLobbyView({ lobby, currentUser, isHost, onSetConfig, onAddPair, onRemovePair, onStart, onStopGame, onBack }) {
  const [civil, setCivil] = useState('');
  const [impostor, setImpostor] = useState('');
  const enough = lobby.players.length >= lobby.minPlayers;
  const addPair = () => { if (civil.trim() && impostor.trim()) { onAddPair(civil.trim(), impostor.trim()); setCivil(''); setImpostor(''); } };

  return (
    <div className="min-h-full bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900 text-white rounded-xl p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
            {isHost && <button onClick={onStopGame} className="px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-sm">Fermer</button>}
          </div>
          <h1 className="text-xl font-extrabold">🕵️ Mot Imposteur</h1>
          <span className="bg-gray-800 rounded-lg px-3 py-1 font-mono font-bold tracking-widest">{lobby.code}</span>
        </div>

        <div className="bg-gray-800/60 rounded-xl p-4 mb-4">
          <h2 className="font-bold mb-2">Joueurs ({lobby.players.length})</h2>
          <div className="flex flex-wrap gap-2">
            {lobby.players.map((p) => (
              <div key={p.odId} className={`flex items-center gap-2 rounded-full px-3 py-1 ${p.odId===currentUser?.id?'bg-purple-500/30 ring-1 ring-purple-400':'bg-gray-900/60'}`}>
                <Avatar avatarId={p.avatar} avatarUrl={p.avatarUrl} size="sm" />
                <span className="text-sm font-semibold">{p.pseudo}{p.odId===lobby.hostId && <span className="text-xs text-purple-300"> (hôte)</span>}</span>
              </div>
            ))}
          </div>
        </div>

        {isHost ? (
          <>
            <div className="bg-gray-800/60 rounded-xl p-4 mb-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">Mode</label>
                <div className="grid grid-cols-2 gap-2">
                  {[['quick','Rapide (1 vote)'],['full','Complet (éliminations)']].map(([v,label])=>(
                    <button key={v} onClick={()=>onSetConfig({mode:v})} className={`py-2 rounded-lg font-bold text-sm border-2 ${lobby.mode===v?'border-purple-400 bg-purple-400/10':'border-gray-700 hover:border-gray-500'}`}>{label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">Nombre d'imposteurs <span className="text-xs text-gray-500">(recommandé : {lobby.recommendedImpostors})</span></label>
                <div className="flex items-center gap-2">
                  <button onClick={()=>onSetConfig({impostorCount: Math.max(1, lobby.impostorCount-1)})} className="w-9 h-9 rounded bg-gray-700 hover:bg-gray-600 font-bold">−</button>
                  <span className="w-10 text-center text-lg font-black">{lobby.impostorCount}</span>
                  <button onClick={()=>onSetConfig({impostorCount: lobby.impostorCount+1})} className="w-9 h-9 rounded bg-gray-700 hover:bg-gray-600 font-bold">+</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">Durée par indice (secondes)</label>
                <input type="number" min="15" max="300" defaultValue={lobby.clueDuration}
                  onBlur={(e) => onSetConfig({ clueDuration: parseInt(e.target.value) || 60 })}
                  className="w-32 px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 outline-none" />
              </div>
              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={lobby.mrWhite} onChange={(e)=>onSetConfig({mrWhite:e.target.checked})} className="rounded"/> Mr White (joueur sans mot)</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={lobby.stealWin} onChange={(e)=>onSetConfig({stealWin:e.target.checked})} className="rounded"/> Vol de victoire</label>
              </div>
              {lobby.themes?.length > 0 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-1">Thème</label>
                  <select value={lobby.theme||''} onChange={(e)=>onSetConfig({theme:e.target.value||null})} className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 outline-none">
                    <option value="">Tous les thèmes</option>
                    {lobby.themes.map((t)=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="bg-gray-800/60 rounded-xl p-4 mb-4">
              <h2 className="font-bold mb-2">Paires personnalisées <span className="text-xs text-gray-500">(optionnel)</span></h2>
              <div className="flex flex-wrap gap-2 mb-2">
                <input value={civil} onChange={(e)=>setCivil(e.target.value)} placeholder="Mot civil (ex: chat)" className="flex-1 min-w-[120px] px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 outline-none text-sm"/>
                <input value={impostor} onChange={(e)=>setImpostor(e.target.value)} placeholder="Mot imposteur (ex: chien)" className="flex-1 min-w-[120px] px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 outline-none text-sm"/>
                <button onClick={addPair} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 font-semibold text-sm">Ajouter</button>
              </div>
              {lobby.customPairs?.length > 0 && (
                <div className="space-y-1">
                  {lobby.customPairs.map((p,i)=>(
                    <div key={i} className="flex items-center justify-between text-sm bg-gray-900/60 rounded px-2 py-1">
                      <span>{p.civil} / {p.impostor}</span>
                      <button onClick={()=>onRemovePair(i)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                    </div>
                  ))}
                </div>
              )}
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
