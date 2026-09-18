import React, { useState, useEffect, useRef } from 'react';

function fmt(ms) { const x = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`; }

/**
 * PitchGameView - phases 'trap' / 'guess' / 'reveal' (rôle-dépendant).
 */
export default function PitchGameView({ lobby, currentUser, isHost, onAddTrap, onRemoveTrap, onLockTraps, onBuzzFound, onBuzzTrap, onContinue, onStopGame, onBack }) {
  const [trapWord, setTrapWord] = useState('');
  const remMs = lobby.phase === 'trap' ? lobby.trapRemainingMs : lobby.guessRemainingMs;
  const [remaining, setRemaining] = useState(remMs ?? 0);
  const endRef = useRef(null);
  useEffect(() => { setRemaining(remMs ?? 0); endRef.current = Date.now() + (remMs ?? 0); }, [remMs, lobby.phase, lobby.wordNumber]);
  useEffect(() => { const t = setInterval(() => setRemaining(Math.max(0, endRef.current - Date.now())), 250); return () => clearInterval(t); }, []);

  const team = lobby.teams.find((t) => t.id === lobby.roleTeam);
  const activeTeam = lobby.teams.find((t) => t.id === lobby.activeTeam);
  const trapTeam = lobby.teams.find((t) => t.id === lobby.trapTeam);
  const isTrap = lobby.roleTeam === lobby.trapTeam;
  const isActive = lobby.roleTeam === lobby.activeTeam;
  const isGuesser = lobby.isGuesser;
  const isSpectator = !lobby.roleTeam;
  const addTrap = () => { if (trapWord.trim()) { onAddTrap(trapWord.trim()); setTrapWord(''); } };

  const Header = (
    <div className="flex items-center justify-between px-4 py-2 shrink-0">
      <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
      <div className="text-center">
        <p className="text-xs text-gray-400">Mot {lobby.wordNumber}/{lobby.totalWords} · <span style={{ color: activeTeam?.color }}>{activeTeam?.name} devine</span></p>
        {lobby.phase !== 'reveal' && <p className="text-2xl font-black font-mono tabular-nums">{fmt(remaining)}</p>}
      </div>
      <div className="text-sm font-bold"><span style={{ color: lobby.teams[0].color }}>{lobby.scores.red}</span> <span className="text-gray-500">-</span> <span style={{ color: lobby.teams[1].color }}>{lobby.scores.blue}</span></div>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black text-white rounded-xl overflow-hidden">
      {Header}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col items-center justify-center text-center gap-4">

        {/* ---- PHASE TRAP ---- */}
        {lobby.phase === 'trap' && (isTrap ? (
          <div className="w-full max-w-md">
            <p className="text-sm text-gray-400 mb-1">Mot que {activeTeam?.name} doit faire deviner :</p>
            <p className="text-3xl font-black text-white mb-4">{lobby.secretWord}</p>
            <p className="text-sm text-gray-300 mb-2">Posez <span className="font-bold">{lobby.trapCount}</span> mots-pièges (les mots évidents qu'ils vont dire).</p>
            <div className="flex gap-2 mb-2">
              <input value={trapWord} onChange={(e) => setTrapWord(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addTrap()} placeholder="Un mot-piège" disabled={lobby.trapsPlaced >= lobby.trapCount} className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 outline-none disabled:opacity-50" />
              <button onClick={addTrap} disabled={lobby.trapsPlaced >= lobby.trapCount} className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 font-semibold disabled:opacity-40">+</button>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {(lobby.traps || []).map((w, i) => (<span key={i} className="bg-orange-900/40 border border-orange-500/40 rounded-lg px-3 py-1 text-sm">{w} <button onClick={() => onRemoveTrap(i)} className="text-red-300 hover:text-red-200">✕</button></span>))}
            </div>
            <button onClick={onLockTraps} className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold">✅ Pièges prêts — lancer la devinette</button>
          </div>
        ) : (
          <div>
            <p className="text-2xl font-bold mb-2">⏳ {trapTeam?.name} prépare ses pièges…</p>
            <p className="text-gray-400">Préparez-vous à faire deviner{isGuesser ? '… enfin, à DEVINER 😅' : ''} !</p>
          </div>
        ))}

        {/* ---- PHASE GUESS ---- */}
        {lobby.phase === 'guess' && (
          isGuesser ? (
            <div><p className="text-5xl mb-3">🎧</p><p className="text-2xl font-bold">Écoute ton équipe et devine !</p><p className="text-gray-400 mt-2">Dis le mot à voix haute quand tu l'as.</p></div>
          ) : isActive ? (
            <div className="w-full max-w-md">
              <p className="text-sm text-gray-400 mb-1">Fais deviner (sans dire un mot-piège !) :</p>
              <p className="text-4xl font-black text-green-300 mb-4">{lobby.secretWord}</p>
              <p className="text-xs text-gray-500 mb-4">{lobby.trapsPlaced} pièges adverses posés — tu ne sais pas lesquels 👀</p>
              <button onClick={onBuzzFound} className="w-full py-4 rounded-xl bg-green-600 hover:bg-green-500 font-black text-xl">✅ TROUVÉ !</button>
            </div>
          ) : isTrap ? (
            <div className="w-full max-w-md">
              <p className="text-sm text-gray-400 mb-1">Ils font deviner :</p>
              <p className="text-3xl font-black mb-3">{lobby.secretWord}</p>
              <p className="text-sm text-gray-300 mb-2">Un piège tombe ? Clique-le vite !</p>
              <div className="grid grid-cols-1 gap-2">
                {(lobby.traps || []).map((w, i) => (<button key={i} onClick={() => onBuzzTrap(i)} className="py-3 rounded-xl bg-orange-700 hover:bg-orange-600 font-bold text-lg">🚨 {w}</button>))}
              </div>
            </div>
          ) : (
            <div><p className="text-2xl font-bold">Devinette en cours…</p><p className="text-gray-400 mt-1">{activeTeam?.name} essaie de deviner son mot.</p></div>
          )
        )}

        {/* ---- PHASE REVEAL ---- */}
        {lobby.phase === 'reveal' && lobby.result && (
          <div className="w-full max-w-md">
            {lobby.result.type === 'found' && <p className="text-2xl font-black text-green-400 mb-2">✅ Trouvé ! +1 {activeTeam?.name}</p>}
            {lobby.result.type === 'trapped' && <p className="text-2xl font-black text-orange-400 mb-2">🚨 Piégé ! +1 {trapTeam?.name}</p>}
            {lobby.result.type === 'timeout' && <p className="text-2xl font-black text-gray-400 mb-2">⏰ Temps écoulé — personne ne marque</p>}
            <p className="text-sm text-gray-400">Le mot était :</p>
            <p className="text-3xl font-black mb-3">{lobby.result.word}</p>
            <p className="text-sm text-gray-400 mb-1">Mots-pièges :</p>
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {(lobby.result.traps || []).map((w, i) => (
                <span key={i} className={`rounded-lg px-3 py-1 text-sm ${lobby.result.fell === w ? 'bg-orange-600 font-bold' : 'bg-gray-800 text-gray-300'}`}>{w}{lobby.result.fell === w ? ' 💥' : ''}</span>
              ))}
              {(!lobby.result.traps || lobby.result.traps.length === 0) && <span className="text-gray-500 text-sm">aucun</span>}
            </div>
            {(isHost || isGuesser) ? (
              <button onClick={onContinue} className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold">▶ Mot suivant</button>
            ) : <p className="text-sm text-gray-400 animate-pulse">En attente…</p>}
          </div>
        )}

        {isSpectator && lobby.phase !== 'reveal' && <p className="text-xs text-gray-500 mt-2">👁 Spectateur — tu ne vois pas le mot pour ne pas spoiler.</p>}
      </div>

      {isHost && <div className="shrink-0 p-2 text-center border-t border-gray-800"><button onClick={onStopGame} className="text-xs text-red-400 hover:text-red-300">⏹ Arrêter la partie</button></div>}
    </div>
  );
}
