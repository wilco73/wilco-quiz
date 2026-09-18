import React, { useState } from 'react';
import Avatar from './Avatar';

export default function PitchLobbyView({ lobby, currentUser, isHost, onChooseTeam, onShuffle, onSetConfig, onAddWord, onRemoveWord, onStart, onStopGame, onBack }) {
  const [word, setWord] = useState('');
  const me = lobby.players.find((p) => p.odId === currentUser?.id);
  const canStart = lobby.teamCounts.red >= 2 && lobby.teamCounts.blue >= 2;
  const addWord = () => { if (word.trim()) { onAddWord(word.trim()); setWord(''); } };

  const TeamCol = ({ team }) => {
    const members = lobby.players.filter((p) => p.team === team.id);
    const mine = me?.team === team.id;
    return (
      <div className="flex-1 rounded-xl p-3 border-2" style={{ borderColor: team.color + '66', backgroundColor: team.color + '11' }}>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold" style={{ color: team.color }}>{team.name} ({members.length})</h3>
          {!mine && <button onClick={() => onChooseTeam(team.id)} className="text-xs px-2 py-1 rounded-lg font-semibold text-gray-900" style={{ backgroundColor: team.color }}>Rejoindre</button>}
        </div>
        <div className="space-y-1 min-h-[40px]">
          {members.map((p) => (
            <div key={p.odId} className={`flex items-center gap-2 rounded px-2 py-1 ${p.odId === currentUser?.id ? 'bg-white/10' : ''}`}>
              <Avatar avatarId={p.avatar} avatarUrl={p.avatarUrl} size="sm" />
              <span className="text-sm">{p.pseudo}{p.odId === lobby.hostId && <span className="text-xs text-gray-400"> (hôte)</span>}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const noTeam = lobby.players.filter((p) => !p.team);

  return (
    <div className="min-h-full bg-gradient-to-br from-rose-900 via-gray-900 to-blue-900 text-white rounded-xl p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
            {isHost && <button onClick={onStopGame} className="px-3 py-1.5 rounded-lg bg-red-900/60 hover:bg-red-800 text-sm">Fermer</button>}
          </div>
          <h1 className="text-xl font-extrabold">🎤 Match de Pitch</h1>
          <span className="bg-gray-800 rounded-lg px-3 py-1 font-mono font-bold tracking-widest">{lobby.code}</span>
        </div>

        {/* Équipes */}
        <div className="flex gap-3 mb-3">
          <TeamCol team={lobby.teams[0]} />
          <TeamCol team={lobby.teams[1]} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="text-xs text-gray-400">
            {noTeam.length > 0 && <span>Sans équipe : {noTeam.map((p) => p.pseudo).join(', ')} · </span>}
            {me?.team && <button onClick={() => onChooseTeam(null)} className="underline hover:text-white">Devenir spectateur</button>}
          </div>
          {isHost && <button onClick={onShuffle} className="text-sm px-3 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600">🔀 Mélanger les équipes</button>}
        </div>

        {isHost ? (
          <>
            <div className="bg-gray-800/60 rounded-xl p-4 mb-4 grid grid-cols-2 gap-3">
              {[['wordsPerTeam','Mots par équipe',1,20],['trapCount','Mots-pièges',1,8],['trapTime','Temps de pièges (s)',15,180],['guessTime','Temps de devinette (s)',30,300]].map(([key,label,mn,mx]) => (
                <div key={key}>
                  <label className="block text-xs font-semibold text-gray-300 mb-1">{label}</label>
                  <input type="number" min={mn} max={mx} defaultValue={lobby[key]} onBlur={(e)=>onSetConfig({ [key]: parseInt(e.target.value) || lobby[key] })} className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 outline-none" />
                </div>
              ))}
              {lobby.themes?.length > 0 && (
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-gray-300 mb-1">Thème des mots</label>
                  <select value={lobby.theme||''} onChange={(e)=>onSetConfig({theme:e.target.value||null})} className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 outline-none">
                    <option value="">Tous</option>
                    {lobby.themes.map((t)=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              )}
            </div>

            {/* Sons (override lobby) */}
            <details className="bg-gray-800/60 rounded-xl p-4 mb-4">
              <summary className="font-bold cursor-pointer text-sm">🔊 Sons de cette partie (optionnel)</summary>
              <p className="text-xs text-gray-400 my-2">Laisse vide pour utiliser les sons par défaut. URL d'un son (mp3/wav).</p>
              <div className="space-y-2">
                <input defaultValue={lobby.soundFound||''} onBlur={(e)=>onSetConfig({soundFound:e.target.value})} placeholder="Son « Trouvé » (URL)" className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 outline-none text-sm" />
                <input defaultValue={lobby.soundTrap||''} onBlur={(e)=>onSetConfig({soundTrap:e.target.value})} placeholder="Son « Piège » (URL)" className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 outline-none text-sm" />
              </div>
            </details>

            {/* Mots custom */}
            <div className="bg-gray-800/60 rounded-xl p-4 mb-4">
              <h2 className="font-bold mb-2 text-sm">Mots personnalisés <span className="text-xs text-gray-500">(en plus de la banque)</span></h2>
              <div className="flex gap-2 mb-2">
                <input value={word} onChange={(e)=>setWord(e.target.value)} onKeyDown={(e)=>e.key==='Enter'&&addWord()} placeholder="Un mot à faire deviner" className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 outline-none text-sm" />
                <button onClick={addWord} className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 font-semibold text-sm">Ajouter</button>
              </div>
              {lobby.customWords?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {lobby.customWords.map((w,i)=>(<span key={i} className="text-xs bg-gray-900/60 rounded px-2 py-1">{w} <button onClick={()=>onRemoveWord(i)} className="text-red-400 hover:text-red-300">✕</button></span>))}
                </div>
              )}
            </div>

            <button onClick={onStart} disabled={!canStart} className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold disabled:opacity-40 disabled:cursor-not-allowed">
              {canStart ? '▶ Démarrer la partie' : 'Il faut au moins 2 joueurs par équipe'}
            </button>
          </>
        ) : (
          <p className="text-center text-sm text-gray-400">Choisis ton équipe et attends que l'hôte démarre…</p>
        )}
      </div>
    </div>
  );
}
