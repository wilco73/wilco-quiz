import React, { useState, useEffect, useRef } from 'react';
import Avatar from './Avatar';

function fmt(ms) { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; }

/**
 * ReversePostGameView - phase 'turn'.
 * Le joueur courant choisit une cible : question à l'oral (puis « Fin de mon tour ») ou proposition écrite,
 * que la cible valide. Journal des actions + bloc-notes personnel.
 */
export default function ReversePostGameView({ lobby, currentUser, isHost, onAskQuestion, onSubmitGuess, onCancelGuess, onValidateGuess, onEndTurn, onEndGame, onStopGame, onBack }) {
  const [remaining, setRemaining] = useState(lobby.turnRemainingMs ?? 0);
  const [notes, setNotes] = useState('');
  const [guessTarget, setGuessTarget] = useState(null);
  const [guessText, setGuessText] = useState('');
  const [zoomImg, setZoomImg] = useState(null);
  const endRef = useRef(null);

  const a = lobby.action;
  const pending = a && a.type === 'guess';
  const hasTimer = !!lobby.turnDuration;

  useEffect(() => {
    setRemaining(lobby.turnRemainingMs ?? 0);
    endRef.current = Date.now() + (lobby.turnRemainingMs ?? 0);
  }, [lobby.turnRemainingMs, lobby.currentPlayerId, lobby.turnNumber, pending]);
  useEffect(() => {
    if (pending || !hasTimer) return; // gelé pendant une validation / pas de timer
    const t = setInterval(() => setRemaining(Math.max(0, (endRef.current || 0) - Date.now())), 250);
    return () => clearInterval(t);
  }, [pending, hasTimer]);
  // Nouveau tour : on referme la saisie de proposition
  useEffect(() => { setGuessTarget(null); setGuessText(''); }, [lobby.turnNumber]);

  const me = lobby.players.find((p) => p.odId === currentUser?.id);
  const isSpectator = !me;
  const isMyTurn = lobby.currentPlayerId === currentUser?.id;
  const current = lobby.players.find((p) => p.odId === lobby.currentPlayerId);
  const target = a ? lobby.players.find((p) => p.odId === a.targetId) : null;
  const pseudoOf = (id) => lobby.players.find((p) => p.odId === id)?.pseudo || '?';
  const iAmTarget = a && a.targetId === currentUser?.id;
  const isTargetable = (p) => isMyTurn && !pending && p.odId !== currentUser?.id && !p.found;

  const sendGuess = () => {
    if (!guessTarget || !guessText.trim()) return;
    onSubmitGuess(guessTarget, guessText.trim());
    setGuessTarget(null); setGuessText('');
  };

  // Bandeau : qui joue, et que se passe-t-il
  let actionLine = null;
  if (a && a.type === 'question') {
    actionLine = iAmTarget
      ? <p className="text-sky-200 font-bold">🎤 {current?.pseudo} te pose une question — réponds à l'oral par oui ou non</p>
      : <p className="text-sky-200">🎤 <b>{current?.pseudo}</b> pose une question à <b>{target?.pseudo}</b></p>;
  } else if (pending) {
    actionLine = <p className="text-amber-200">💡 <b>{current?.pseudo}</b> propose <b>« {a.answer} »</b> pour <b>{target?.pseudo}</b></p>;
  }

  const logLine = (e) => {
    if (e.type === 'question') return <>{pseudoOf(e.from)} → {pseudoOf(e.to)} : <span className="text-sky-300">question</span></>;
    if (e.type === 'guess') return <>{pseudoOf(e.from)} → {pseudoOf(e.to)} : « {e.answer} » {e.correct ? '✅' : '❌'}</>;
    if (e.type === 'timeout') return <>{pseudoOf(e.from)} : temps écoulé</>;
    return <>{pseudoOf(e.from)} passe son tour</>;
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black text-white rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
        <div className="text-center">
          <p className="text-xs text-gray-400">Tour {lobby.turnNumber}{pending && <span className="text-amber-300"> · validation en cours</span>}</p>
          <p className={`text-2xl font-black font-mono tabular-nums ${pending ? 'text-amber-300' : ''}`}>{hasTimer ? fmt(remaining) : '∞'}{pending && hasTimer && ' ⏸'}</p>
        </div>
        <span className="bg-gray-800 rounded-lg px-3 py-1 font-mono font-bold tracking-widest text-sm">{lobby.code}</span>
      </div>

      {/* Qui joue */}
      <div className="shrink-0 py-2 px-3 bg-sky-500/10 border-y border-sky-500/20 text-center">
        <div className="flex items-center justify-center gap-2">
          {current && <Avatar avatarId={current.avatar} avatarUrl={current.avatarUrl} size="sm" />}
          <p className="font-bold">{isMyTurn ? "🎯 C'est ton tour : choisis un joueur" : <>Au tour de <span className="text-sky-300">{current?.pseudo}</span></>}</p>
        </div>
        {actionLine && <div className="mt-1 text-sm">{actionLine}</div>}
      </div>

      {/* Validation de la proposition */}
      {pending && (
        <div className="shrink-0 mx-4 mt-3 rounded-lg border-2 border-amber-500/60 bg-amber-900/20 p-3">
          {iAmTarget ? (
            <>
              <p className="text-sm text-gray-300 mb-1"><b>{current?.pseudo}</b> pense que ton mot est :</p>
              <p className="text-xl font-black mb-1">« {a.answer} »</p>
              {a.hint && <p className="text-xs text-green-300 mb-2">Ça ressemble beaucoup à ton mot ✓</p>}
              <div className="flex gap-2">
                <button onClick={() => onValidateGuess(true)} className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 font-bold">✅ C'est juste</button>
                <button onClick={() => onValidateGuess(false)} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 font-bold">❌ C'est faux</button>
              </div>
            </>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-300">En attente de la réponse de <b>{target?.pseudo}</b>…</p>
              {isMyTurn && <button onClick={onCancelGuess} className="mt-1 text-xs text-gray-400 hover:text-white underline">Annuler ma proposition (erreur de saisie)</button>}
              {isHost && !isMyTurn && (
                <div className="mt-2 flex gap-2 justify-center">
                  <span className="text-xs text-gray-500 self-center">Hôte, si la cible est absente :</span>
                  <button onClick={() => onValidateGuess(true)} className="px-2 py-1 rounded bg-green-800 hover:bg-green-700 text-xs">Juste</button>
                  <button onClick={() => onValidateGuess(false)} className="px-2 py-1 rounded bg-red-800 hover:bg-red-700 text-xs">Faux</button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Corps */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col lg:flex-row gap-4">
        {/* Joueurs */}
        <div className="lg:flex-[2] space-y-2">
          <h2 className="font-bold text-gray-300">Joueurs</h2>
          {lobby.players.map((p) => {
            const mine = p.odId === currentUser?.id;
            const isCur = p.odId === lobby.currentPlayerId;
            const isTgt = a && a.targetId === p.odId;
            const targetable = isTargetable(p);
            return (
              <div key={p.odId} className={`rounded-lg p-2 ${isTgt ? 'bg-sky-500/15 ring-1 ring-sky-400/60' : isCur ? 'bg-yellow-500/10 ring-1 ring-yellow-400/40' : 'bg-gray-800/50'}`}>
                <div className="flex items-center gap-3">
                  <Avatar avatarId={p.avatar} avatarUrl={p.avatarUrl} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{isCur && '🎯 '}{p.pseudo} {mine && <span className="text-xs text-gray-400">(toi)</span>} <span className="text-xs text-yellow-300">⭐ {p.points}</span></p>
                    <p className={`text-base font-bold truncate ${p.found ? 'text-green-300' : mine ? 'text-sky-200' : 'text-gray-500'}`}>
                      {p.found
                        ? <>✅ {p.word} <span className="text-xs font-normal text-gray-400">— trouvé par {p.foundByPseudo} (tour {p.foundAtTurn})</span></>
                        : mine ? <>🤫 {p.word} <span className="text-xs font-normal text-gray-500">(ton mot, caché aux autres)</span></> : '???'}
                    </p>
                  </div>
                  {p.wordImage && (
                    <button onClick={() => setZoomImg(p.wordImage)} title="Voir l'image" className="shrink-0 w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600 flex items-center justify-center">👁</button>
                  )}
                </div>

                {/* Actions du joueur courant sur cette cible */}
                {targetable && guessTarget !== p.odId && (
                  <div className="flex gap-2 mt-2 ml-11">
                    <button onClick={() => onAskQuestion(p.odId)} className={`px-3 py-1.5 rounded-lg text-sm font-semibold ${isTgt ? 'bg-sky-600' : 'bg-sky-800 hover:bg-sky-700'}`}>❓ {isTgt ? 'Question en cours' : 'Poser une question'}</button>
                    <button onClick={() => { setGuessTarget(p.odId); setGuessText(''); }} className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-amber-700 hover:bg-amber-600">💡 Proposer</button>
                  </div>
                )}
                {targetable && guessTarget === p.odId && (
                  <div className="flex gap-2 mt-2 ml-11">
                    <input value={guessText} onChange={(e) => setGuessText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendGuess()}
                      placeholder={`Le mot de ${p.pseudo}…`} maxLength={60} autoFocus
                      className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-600 focus:border-amber-500 outline-none text-sm" />
                    <button onClick={sendGuess} disabled={!guessText.trim()} className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm font-bold disabled:opacity-40">Proposer</button>
                    <button onClick={() => setGuessTarget(null)} className="px-2 py-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm">✕</button>
                  </div>
                )}
              </div>
            );
          })}
          {isMyTurn && !pending && <p className="text-xs text-gray-500">Une proposition compte comme ton tour, qu'elle soit juste ou fausse.</p>}
        </div>

        {/* Journal + notes */}
        <div className="lg:flex-1 flex flex-col gap-4 min-h-0">
          <div>
            <h2 className="font-bold mb-2 text-gray-300">Journal</h2>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {(lobby.log || []).length === 0 && <p className="text-xs text-gray-500">Rien pour l'instant.</p>}
              {[...(lobby.log || [])].reverse().map((e, i) => (
                <div key={i} className={`text-xs rounded px-2 py-1 ${e.type === 'guess' && e.correct ? 'bg-green-900/30 text-green-200' : 'bg-gray-800/60 text-gray-300'}`}>
                  <span className="text-gray-500 mr-1">T{e.turn}</span>{logLine(e)}
                </div>
              ))}
            </div>
          </div>
          {!isSpectator ? (
            <div className="flex-1 flex flex-col min-h-0">
              <h2 className="font-bold mb-2 text-gray-300">Mes notes</h2>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                placeholder="Note les réponses aux questions (visible seulement par toi)…"
                className="flex-1 min-h-[120px] w-full p-3 rounded-lg bg-gray-800 border border-gray-700 focus:border-sky-500 outline-none text-sm resize-none" />
            </div>
          ) : <div className="text-center text-gray-500 text-sm">👁 Mode spectateur</div>}
        </div>
      </div>

      {/* Actions */}
      <div className="shrink-0 p-3 bg-gray-950/80 border-t border-gray-800 flex flex-wrap items-center justify-center gap-3">
        {!pending && (isMyTurn || isHost) && (
          <button onClick={onEndTurn} className="px-6 py-3 rounded-xl bg-sky-700 hover:bg-sky-600 font-bold">
            {isMyTurn ? (a && a.type === 'question' ? '✅ Question posée — fin de mon tour' : '⏭ Passer mon tour') : '⏭ Passer le tour (hôte)'}
          </button>
        )}
        {isHost && <button onClick={onEndGame} className="px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-yellow-300 font-semibold text-sm">🏁 Terminer la partie</button>}
        {isHost && <button onClick={onStopGame} className="px-4 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-red-300 font-semibold text-sm">⏹ Arrêter</button>}
      </div>

      {zoomImg && (
        <div className="fixed inset-0 z-[80] bg-black/85 flex items-center justify-center p-4" onClick={() => setZoomImg(null)}>
          <button onClick={() => setZoomImg(null)} className="absolute top-3 right-3 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white text-xl leading-none">✕</button>
          <img src={zoomImg} alt="" onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[85vh] rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
