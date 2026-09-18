import React, { useState, useEffect, useRef } from 'react';
import Avatar from './Avatar';

function fmt(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

/**
 * ImpostorGameView - manche d'indices (ordre imposé, timer serveur, journal).
 */
export default function ImpostorGameView({ lobby, currentUser, isHost, onSubmitClue, onStopGame, onBack }) {
  const [remaining, setRemaining] = useState(lobby.clueRemainingMs ?? 0);
  const [clue, setClue] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    setRemaining(lobby.clueRemainingMs ?? 0);
    endRef.current = Date.now() + (lobby.clueRemainingMs ?? 0);
  }, [lobby.clueRemainingMs, lobby.currentCluePlayerId]);
  useEffect(() => { const t = setInterval(() => setRemaining(Math.max(0, endRef.current - Date.now())), 250); return () => clearInterval(t); }, []);

  const me = lobby.players.find((p) => p.odId === currentUser?.id);
  const isMyTurn = lobby.currentCluePlayerId === currentUser?.id;
  const current = lobby.players.find((p) => p.odId === lobby.currentCluePlayerId);
  const pseudoOf = (id) => lobby.players.find((p) => p.odId === id)?.pseudo || '?';

  const submit = () => { if (clue.trim()) { onSubmitClue(clue.trim()); setClue(''); } };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black text-white rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
        <div className="text-center">
          <p className="text-xs text-gray-400">Manche d'indices {lobby.clueRound}</p>
          <p className="text-2xl font-black font-mono tabular-nums">{fmt(remaining)}</p>
        </div>
        <span className="bg-gray-800 rounded-lg px-3 py-1 font-mono font-bold tracking-widest text-sm">{lobby.code}</span>
      </div>

      {/* Rappel de mon mot */}
      {me && (
        <div className="shrink-0 text-center py-1 text-sm">
          {me.role === 'mrwhite'
            ? <span className="text-pink-400 font-bold">Tu es Mr White — bluffe !</span>
            : <>Ton mot : <span className="font-bold text-purple-300">{me.word}</span></>}
        </div>
      )}

      {/* Qui donne son indice */}
      <div className="shrink-0 flex items-center justify-center gap-2 py-2 bg-purple-500/10 border-y border-purple-500/20">
        {current && <Avatar avatarId={current.avatar} avatarUrl={current.avatarUrl} size="sm" />}
        <p className="font-bold">{isMyTurn ? "✍️ À toi de donner un indice (1 mot)" : <>Au tour de <span className="text-purple-300">{current?.pseudo}</span></>}</p>
      </div>

      {/* Journal des indices */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <h2 className="font-bold mb-2 text-gray-300 text-center">Indices donnés</h2>
        <div className="max-w-md mx-auto space-y-1">
          {(lobby.clues || []).length === 0 && <p className="text-center text-sm text-gray-500">Aucun indice pour l'instant.</p>}
          {(lobby.clues || []).map((c, i) => (
            <div key={i} className="flex items-center justify-between gap-2 bg-gray-800/50 rounded-lg px-3 py-1.5">
              <span className="text-sm text-gray-300"><span className="text-xs text-gray-500 mr-1">M{c.round}</span>{pseudoOf(c.odId)}</span>
              <span className="font-bold">{c.word}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Saisie de l'indice (mon tour) */}
      <div className="shrink-0 p-3 bg-gray-950/80 border-t border-gray-800">
        {isMyTurn ? (
          <div className="flex gap-2 max-w-md mx-auto">
            <input
              type="text" value={clue} onChange={(e) => setClue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Ton indice en 1 mot…" maxLength={30} autoFocus
              className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-purple-500 outline-none"
            />
            <button onClick={submit} disabled={!clue.trim()} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 font-bold disabled:opacity-40">Valider</button>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500">{current ? `${current.pseudo} réfléchit…` : ''}</p>
        )}
        {isHost && <div className="text-center mt-2"><button onClick={onStopGame} className="text-xs text-red-400 hover:text-red-300">⏹ Arrêter la partie</button></div>}
      </div>
    </div>
  );
}
