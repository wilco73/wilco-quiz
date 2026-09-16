import React, { useState, useEffect, useRef } from 'react';
import Avatar from './Avatar';

/**
 * WilpostGameView - écran de round.
 * - Timer (resynchronisé sur roundRemainingMs du serveur, insensible au décalage d'horloge).
 * - Liste des joueurs + mot à deviner de chacun (le sien est masqué).
 * - Zone de notes perso (locale). Bouton "Fin de mon tour" (joueur courant ou hôte).
 */
function fmt(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function WilpostGameView({ lobby, currentUser, isHost, onEndTurn, onBack }) {
  const [remaining, setRemaining] = useState(lobby.roundRemainingMs ?? 0);
  const [notes, setNotes] = useState('');
  const endRef = useRef(null);

  // Resync du timer à chaque nouvel état serveur
  useEffect(() => {
    setRemaining(lobby.roundRemainingMs ?? 0);
    endRef.current = Date.now() + (lobby.roundRemainingMs ?? 0);
  }, [lobby.roundRemainingMs, lobby.currentPlayerId, lobby.turnNumber]);

  // Décompte local
  useEffect(() => {
    const t = setInterval(() => {
      setRemaining(Math.max(0, endRef.current - Date.now()));
    }, 250);
    return () => clearInterval(t);
  }, []);

  const me = lobby.players.find((p) => p.odId === currentUser?.id);
  const isSpectator = !me;
  const isMyTurn = lobby.currentPlayerId === currentUser?.id;
  const current = lobby.players.find((p) => p.odId === lobby.currentPlayerId);
  const canEndTurn = (isMyTurn || isHost);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-gradient-to-b from-gray-900 to-black text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
        <div className="text-center">
          <p className="text-xs text-gray-400">Tour {lobby.turnNumber}</p>
          <p className="text-2xl font-black font-mono tabular-nums">{fmt(remaining)}</p>
        </div>
        <span className="bg-gray-800 rounded-lg px-3 py-1 font-mono font-bold tracking-widest text-sm">{lobby.code}</span>
      </div>

      {/* Qui joue */}
      <div className="shrink-0 flex items-center justify-center gap-2 py-2 bg-yellow-500/10 border-y border-yellow-500/20">
        {current && <Avatar avatarId={current.avatar} avatarUrl={current.avatarUrl} size="sm" />}
        <p className="font-bold">
          {isMyTurn ? "🎤 C'est ton tour !" : <>Au tour de <span className="text-yellow-300">{current?.pseudo}</span></>}
        </p>
      </div>

      {/* Corps : joueurs + notes */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Liste des joueurs et leurs mots */}
        <div className="lg:col-span-2">
          <h2 className="font-bold mb-2 text-gray-300">Mots à deviner</h2>
          <div className="space-y-2">
            {lobby.players.map((p) => {
              const mine = p.odId === currentUser?.id;
              const isCurrent = p.odId === lobby.currentPlayerId;
              return (
                <div key={p.odId} className={`flex items-center gap-3 rounded-lg p-2 ${isCurrent ? 'bg-yellow-500/15 ring-1 ring-yellow-400/50' : 'bg-gray-800/50'} ${p.guessed ? 'opacity-60' : ''}`}>
                  <Avatar avatarId={p.avatar} avatarUrl={p.avatarUrl} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.pseudo} {mine && <span className="text-xs text-gray-400">(toi)</span>}</p>
                    <p className={`text-lg font-bold truncate ${mine ? 'text-gray-500 italic' : 'text-white'}`}>
                      {mine ? '??? (à toi de deviner)' : (p.guessed ? '✅ trouvé' : (p.guessWord || '—'))}
                    </p>
                  </div>
                  {p.guessed && <span className="text-green-400 text-sm shrink-0">✓</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Notes perso */}
        {!isSpectator && (
          <div className="flex flex-col">
            <h2 className="font-bold mb-2 text-gray-300">Mes notes</h2>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Note ici tes questions et pistes (visible seulement par toi)…"
              className="flex-1 min-h-[140px] w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-yellow-500 outline-none text-sm resize-none"
            />
          </div>
        )}
        {isSpectator && (
          <div className="flex items-center justify-center text-gray-500 text-sm">👁 Mode spectateur</div>
        )}
      </div>

      {/* Barre d'action */}
      <div className="shrink-0 p-3 bg-gray-950/80 border-t border-gray-800 flex items-center justify-center gap-3">
        {canEndTurn ? (
          <button onClick={onEndTurn} className="px-6 py-3 rounded-xl bg-red-700 hover:bg-red-600 font-bold">
            {isMyTurn ? '⏭ Fin de mon tour' : "⏭ Passer le tour (hôte)"}
          </button>
        ) : (
          <p className="text-sm text-gray-500">En attente… (les réponses arriveront à la Phase 3)</p>
        )}
      </div>
    </div>
  );
}
