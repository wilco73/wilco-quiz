import React, { useState, useEffect, useRef } from 'react';
import Avatar from './Avatar';

function fmt(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

/**
 * ImpostorGameView - manche d'indices.
 * - Mode "turn" : ordre imposé, un joueur à la fois (timer par indice).
 * - Mode "simultaneous" : tout le monde écrit en même temps (un timer pour la manche),
 *   révélation à la fin du timer ou quand tout le monde a validé.
 * Dans les deux cas : la saisie en cours est envoyée en brouillon (gardée si le timer tombe à 0),
 * et une fois tous les indices donnés, on reste sur cet écran jusqu'à ce que l'hôte passe aux votes.
 */
export default function ImpostorGameView({ lobby, currentUser, isHost, onSubmitClue, onClueDraft, onGoToVote, onStopGame, onBack }) {
  const [remaining, setRemaining] = useState(lobby.clueRemainingMs ?? 0);
  const [clue, setClue] = useState('');
  const [mySimClue, setMySimClue] = useState(null);
  const endRef = useRef(null);
  const draftTimer = useRef(null);

  const sim = lobby.clueMode === 'simultaneous';
  const done = !!lobby.roundComplete;

  useEffect(() => {
    setRemaining(lobby.clueRemainingMs ?? 0);
    endRef.current = Date.now() + (lobby.clueRemainingMs ?? 0);
  }, [lobby.clueRemainingMs, lobby.currentCluePlayerId]);
  useEffect(() => { const t = setInterval(() => setRemaining(Math.max(0, (endRef.current || 0) - Date.now())), 250); return () => clearInterval(t); }, []);

  // Nouvelle manche ou nouveau tour : on vide la saisie
  useEffect(() => { setClue(''); setMySimClue(null); }, [lobby.clueRound, lobby.currentCluePlayerId]);
  useEffect(() => () => clearTimeout(draftTimer.current), []);

  const me = lobby.players.find((p) => p.odId === currentUser?.id);
  const iAmAlive = (lobby.aliveIds || []).includes(currentUser?.id);
  const isMyTurn = !sim && !done && lobby.currentCluePlayerId === currentUser?.id;
  const current = lobby.players.find((p) => p.odId === lobby.currentCluePlayerId);
  const pseudoOf = (id) => lobby.players.find((p) => p.odId === id)?.pseudo || '?';
  const submittedIds = lobby.simSubmittedIds || [];
  const iSubmittedSim = sim && submittedIds.includes(currentUser?.id);
  const canWrite = !done && (sim ? (iAmAlive && !iSubmittedSim) : isMyTurn);
  const aliveCount = (lobby.aliveIds || []).length;

  const onType = (v) => {
    setClue(v);
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => onClueDraft && onClueDraft(v), 250);
  };
  const submit = () => {
    const w = clue.trim(); if (!w) return;
    clearTimeout(draftTimer.current);
    onSubmitClue(w);
    if (sim) setMySimClue(w);
    setClue('');
  };

  // Indices groupés par manche (la manche en cours en premier)
  const clues = lobby.clues || [];
  const rounds = [...new Set(clues.map((c) => c.round))].sort((a, b) => b - a);

  let banner;
  if (done) {
    banner = <p className="font-bold text-green-300">✅ Tous les indices sont donnés — {isHost ? 'passe aux votes quand tout le monde a lu' : "en attente de l'hôte pour passer aux votes"}</p>;
  } else if (sim) {
    banner = <p className="font-bold">✍️ Tout le monde écrit son indice en même temps <span className="text-purple-300">({submittedIds.length}/{aliveCount} validés)</span></p>;
  } else {
    banner = (
      <>
        {current && <Avatar avatarId={current.avatar} avatarUrl={current.avatarUrl} size="sm" />}
        <p className="font-bold">{isMyTurn ? '✍️ À toi de donner un indice (1 mot)' : <>Au tour de <span className="text-purple-300">{current?.pseudo}</span></>}</p>
      </>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black text-white rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
        <div className="text-center">
          <p className="text-xs text-gray-400">Manche d'indices {lobby.clueRound}{sim ? ' · simultanée' : ''}</p>
          <p className="text-2xl font-black font-mono tabular-nums">{done ? '—' : fmt(remaining)}</p>
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

      {/* Bandeau d'état */}
      <div className={`shrink-0 flex items-center justify-center gap-2 py-2 px-3 text-center border-y ${done ? 'bg-green-500/10 border-green-500/20' : 'bg-purple-500/10 border-purple-500/20'}`}>
        {banner}
      </div>

      {/* Journal des indices */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        <h2 className="font-bold mb-2 text-gray-300 text-center">Indices donnés</h2>
        <div className="max-w-md mx-auto space-y-3">
          {clues.length === 0 && <p className="text-center text-sm text-gray-500">{sim && !done ? 'Les indices seront révélés tous ensemble.' : "Aucun indice pour l'instant."}</p>}
          {rounds.map((r) => (
            <div key={r}>
              <p className={`text-xs mb-1 ${r === lobby.clueRound ? 'text-purple-300 font-semibold' : 'text-gray-500'}`}>Manche {r}{r === lobby.clueRound ? ' (en cours)' : ''}</p>
              <div className="space-y-1">
                {clues.filter((c) => c.round === r).map((c, i) => (
                  <div key={i} className={`flex items-center justify-between gap-2 rounded-lg px-3 py-1.5 ${r === lobby.clueRound ? 'bg-gray-800/80' : 'bg-gray-800/40'}`}>
                    <span className="text-sm text-gray-300">{pseudoOf(c.odId)}</span>
                    <span className={`font-bold ${c.word === '…' ? 'text-gray-500' : ''}`}>{c.word}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Saisie / actions */}
      <div className="shrink-0 p-3 bg-gray-950/80 border-t border-gray-800">
        {done ? (
          isHost
            ? <div className="text-center"><button onClick={onGoToVote} className="px-6 py-3 rounded-xl bg-red-600 hover:bg-red-500 font-bold text-lg">🗳️ Passer aux votes</button></div>
            : <p className="text-center text-sm text-gray-400 animate-pulse">Prenez le temps de relire les indices…</p>
        ) : canWrite ? (
          <div className="flex gap-2 max-w-md mx-auto">
            <input
              type="text" value={clue} onChange={(e) => onType(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submit()}
              placeholder="Ton indice en 1 mot…" maxLength={30} autoFocus
              className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-purple-500 outline-none"
            />
            <button onClick={submit} disabled={!clue.trim()} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 font-bold disabled:opacity-40">Valider</button>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-500">
            {sim
              ? (iSubmittedSim ? <>✅ Indice validé{mySimClue ? <> : <b className="text-gray-300">{mySimClue}</b></> : ''} — en attente des autres…</> : (iAmAlive ? '' : 'Tu ne participes pas à cette manche.'))
              : (current ? `${current.pseudo} réfléchit…` : '')}
          </p>
        )}
        {!done && canWrite && <p className="text-center text-[11px] text-gray-600 mt-1">Si le temps s'écoule, ce que tu as commencé à écrire sera quand même envoyé.</p>}
        {isHost && <div className="text-center mt-2"><button onClick={onStopGame} className="text-xs text-red-400 hover:text-red-300">⏹ Arrêter la partie</button></div>}
      </div>
    </div>
  );
}
