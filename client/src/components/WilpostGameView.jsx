import React, { useState, useEffect, useRef } from 'react';
import Avatar from './Avatar';

function fmt(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * WilpostGameView - écran de round (dans le cadre du layout).
 * Phase 3 : proposer une réponse (joueur courant), vote des autres, panneau des tentatives.
 */
export default function WilpostGameView({ lobby, currentUser, isHost, onEndTurn, onStopGame, onSubmitAnswer, onVote, onBack }) {
  const [remaining, setRemaining] = useState(lobby.roundRemainingMs ?? 0);
  const [notes, setNotes] = useState('');
  const [answer, setAnswer] = useState('');
  const endRef = useRef(null);

  useEffect(() => {
    setRemaining(lobby.roundRemainingMs ?? 0);
    endRef.current = Date.now() + (lobby.roundRemainingMs ?? 0);
  }, [lobby.roundRemainingMs, lobby.currentPlayerId, lobby.turnNumber]);

  useEffect(() => {
    const t = setInterval(() => setRemaining(Math.max(0, endRef.current - Date.now())), 250);
    return () => clearInterval(t);
  }, []);

  const me = lobby.players.find((p) => p.odId === currentUser?.id);
  const isSpectator = !me;
  const isMyTurn = lobby.currentPlayerId === currentUser?.id;
  const current = lobby.players.find((p) => p.odId === lobby.currentPlayerId);
  const pv = lobby.pendingVote;
  const canEndTurn = (isMyTurn || isHost) && !pv;

  const iAmVoter = pv && pv.voters.includes(currentUser?.id);
  const iHaveVoted = pv && pv.votedIds.includes(currentUser?.id);
  const guesser = pv && lobby.players.find((p) => p.odId === pv.guesserId);

  const submit = () => { if (answer.trim()) { onSubmitAnswer(answer.trim()); setAnswer(''); } };
  const pseudoOf = (id) => lobby.players.find((p) => p.odId === id)?.pseudo || '?';

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black text-white rounded-xl overflow-hidden">
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
        <p className="font-bold">{isMyTurn ? "🎤 C'est ton tour !" : <>Au tour de <span className="text-yellow-300">{current?.pseudo}</span></>}</p>
      </div>

      {/* Zone de vote (prioritaire, en haut) */}
      {pv && (
        <div className="shrink-0 mx-4 mt-3 rounded-lg border-2 border-blue-500/60 bg-blue-900/20 p-3">
          <p className="text-sm text-gray-300 mb-1"><span className="font-bold">{guesser?.pseudo}</span> propose :</p>
          <p className={`text-xl font-black mb-2 ${pv.hint ? 'text-green-400' : 'text-white'}`}>
            « {pv.answer} » {pv.hint && <span className="text-xs font-normal text-green-300">(probable ✓)</span>}
          </p>
          {iAmVoter ? (
            iHaveVoted ? (
              <p className="text-sm text-gray-400">Vote enregistré — en attente des autres… ({pv.yesVotes} oui / {pv.noVotes} non)</p>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => onVote(true)} className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 font-bold">✓ Valider</button>
                <button onClick={() => onVote(false)} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 font-bold">✗ Refuser</button>
              </div>
            )
          ) : (
            <p className="text-sm text-gray-400">{pv.guesserId === currentUser?.id ? 'En attente du vote des autres joueurs…' : 'Vote en cours…'} ({pv.yesVotes} oui / {pv.noVotes} non)</p>
          )}
        </div>
      )}

      {/* Corps */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Joueurs + mots + zone de réponse */}
        <div className="lg:col-span-2 space-y-3">
          <div>
            <h2 className="font-bold mb-2 text-gray-300">Mots à deviner</h2>
            <div className="space-y-2">
              {lobby.players.map((p) => {
                const mine = p.odId === currentUser?.id;
                const isCur = p.odId === lobby.currentPlayerId;
                return (
                  <div key={p.odId} className={`flex items-center gap-3 rounded-lg p-2 ${isCur ? 'bg-yellow-500/15 ring-1 ring-yellow-400/50' : 'bg-gray-800/50'} ${p.guessed ? 'opacity-60' : ''}`}>
                    <Avatar avatarId={p.avatar} avatarUrl={p.avatarUrl} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{p.pseudo} {mine && <span className="text-xs text-gray-400">(toi)</span>}</p>
                      <p className={`text-lg font-bold truncate ${mine ? 'text-gray-500 italic' : 'text-white'}`}>
                        {mine ? '??? (à toi de deviner)' : (p.guessed ? `✅ trouvé (tour ${p.guessedAtTurn})` : (p.guessWord || '—'))}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ma proposition (mon tour, pas de vote en cours, pas encore trouvé) */}
          {isMyTurn && !pv && !me?.guessed && (
            <div className="rounded-lg bg-gray-800/60 p-3">
              <h3 className="font-bold mb-2 text-gray-300">Proposer une réponse</h3>
              <p className="text-xs text-gray-400 mb-2">Attention : proposer une réponse termine ton tour (juste ou faux).</p>
              <div className="flex gap-2">
                <input
                  type="text" value={answer} onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submit()}
                  placeholder="Ta réponse…" maxLength={60}
                  className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-yellow-500 outline-none"
                />
                <button onClick={submit} disabled={!answer.trim()} className="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 font-bold disabled:opacity-40">Proposer</button>
              </div>
            </div>
          )}
        </div>

        {/* Colonne droite : tentatives + notes */}
        <div className="space-y-4">
          <div>
            <h2 className="font-bold mb-2 text-gray-300">Tentatives</h2>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {(lobby.attempts || []).length === 0 && <p className="text-xs text-gray-500">Aucune tentative pour l'instant.</p>}
              {[...(lobby.attempts || [])].reverse().map((a, i) => (
                <div key={i} className={`text-xs rounded px-2 py-1 flex items-center justify-between gap-2 ${a.accepted ? 'bg-green-900/30 text-green-300' : 'bg-gray-800/60 text-gray-300'}`}>
                  <span className="truncate"><span className="font-semibold">{pseudoOf(a.guesserId)}</span> : {a.answer}</span>
                  <span className="shrink-0 text-gray-400">T{a.turnNumber} {a.accepted ? '✅' : '❌'}</span>
                </div>
              ))}
            </div>
          </div>

          {!isSpectator ? (
            <div className="flex flex-col">
              <h2 className="font-bold mb-2 text-gray-300">Mes notes</h2>
              <textarea
                value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Note tes questions et pistes (visible seulement par toi)…"
                className="min-h-[120px] w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-yellow-500 outline-none text-sm resize-none"
              />
            </div>
          ) : (
            <div className="text-center text-gray-500 text-sm">👁 Mode spectateur</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 p-3 bg-gray-950/80 border-t border-gray-800 flex flex-wrap items-center justify-center gap-3">
        {canEndTurn && (
          <button onClick={onEndTurn} className="px-6 py-3 rounded-xl bg-red-700 hover:bg-red-600 font-bold">
            {isMyTurn ? '⏭ Fin de mon tour' : '⏭ Passer le tour (hôte)'}
          </button>
        )}
        {isHost && (
          <button onClick={onStopGame} className="px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-red-300 font-semibold text-sm">⏹ Arrêter la partie</button>
        )}
      </div>
    </div>
  );
}
