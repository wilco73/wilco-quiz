import React, { useState, useEffect, useRef } from 'react';

function fmt(ms) { const x = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`; }

/**
 * MajorityGameView - phases 'ask' / 'answer' / 'reveal'.
 */
export default function MajorityGameView({ lobby, currentUser, isHost, onSetQuestion, onAnswer, onContinue, onStopGame, onBack }) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [remaining, setRemaining] = useState(lobby.answerRemainingMs ?? 0);
  const endRef = useRef(null);

  useEffect(() => { setRemaining(lobby.answerRemainingMs ?? 0); endRef.current = Date.now() + (lobby.answerRemainingMs ?? 0); }, [lobby.answerRemainingMs, lobby.roundNumber, lobby.phase]);
  useEffect(() => { const t = setInterval(() => setRemaining(Math.max(0, endRef.current - Date.now())), 250); return () => clearInterval(t); }, []);
  useEffect(() => { setAnswer(''); }, [lobby.roundNumber]); // reset saisie au changement de manche

  const me = lobby.players.find((p) => p.odId === currentUser?.id);
  const isSpectator = !me;
  const isAsker = lobby.askerId === currentUser?.id;
  const iAnswered = (lobby.answeredIds || []).includes(currentUser?.id);
  const submitQ = () => { if (question.trim()) { onSetQuestion(question.trim()); setQuestion(''); } };
  const submitA = () => { if (answer.trim()) onAnswer(answer.trim()); };

  const Header = (
    <div className="flex items-center justify-between px-4 py-2 shrink-0">
      <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
      <div className="text-center">
        <p className="text-xs text-gray-400">Manche {lobby.roundNumber}/{lobby.rounds}</p>
        {lobby.phase === 'answer' && <p className="text-2xl font-black font-mono tabular-nums">{fmt(remaining)}</p>}
      </div>
      <span className="bg-gray-800 rounded-lg px-3 py-1 font-mono font-bold tracking-widest text-sm">{lobby.code}</span>
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black text-white rounded-xl overflow-hidden">
      {Header}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col items-center justify-center text-center gap-4">

        {/* ASK */}
        {lobby.phase === 'ask' && (isAsker ? (
          <div className="w-full max-w-md">
            <p className="text-lg font-bold mb-1">🎤 À toi de poser la question !</p>
            <p className="text-sm text-gray-400 mb-3">Une question ouverte à réponse courte (ex. « Cite un fruit », « Un prénom de garçon »…). Tu y répondras aussi.</p>
            <div className="flex gap-2">
              <input value={question} onChange={(e) => setQuestion(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitQ()} placeholder="Ta question…" maxLength={120} autoFocus className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-emerald-500 outline-none" />
              <button onClick={submitQ} disabled={!question.trim()} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold disabled:opacity-40">Poser</button>
            </div>
          </div>
        ) : (
          <div><p className="text-5xl mb-2">🤔</p><p className="text-xl font-bold"><span className="text-emerald-300">{lobby.askerPseudo}</span> écrit une question…</p></div>
        ))}

        {/* ANSWER */}
        {lobby.phase === 'answer' && (
          <div className="w-full max-w-md">
            <p className="text-sm text-gray-400 mb-1">Question de {lobby.askerPseudo} :</p>
            <p className="text-2xl font-black mb-4">{lobby.question}</p>
            {isSpectator ? (
              <p className="text-gray-500">👁 Spectateur — {lobby.answeredIds.length}/{lobby.players.length} ont répondu</p>
            ) : iAnswered ? (
              <p className="text-green-400">✅ Réponse enregistrée — {lobby.answeredIds.length}/{lobby.players.length} ont répondu</p>
            ) : (
              <>
                <p className="text-xs text-gray-500 mb-2">Réponds comme tu penses que la majorité va répondre.</p>
                <div className="flex gap-2">
                  <input value={answer} onChange={(e) => setAnswer(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitA()} placeholder="Ta réponse…" maxLength={40} autoFocus className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-emerald-500 outline-none" />
                  <button onClick={submitA} disabled={!answer.trim()} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-bold disabled:opacity-40">Valider</button>
                </div>
                <p className="text-xs text-gray-500 mt-2">{lobby.answeredIds.length}/{lobby.players.length} ont répondu</p>
              </>
            )}
          </div>
        )}

        {/* REVEAL */}
        {lobby.phase === 'reveal' && (
          <div className="w-full max-w-md">
            <p className="text-sm text-gray-400 mb-1">{lobby.question}</p>
            <div className="space-y-2 my-3">
              {lobby.unanimous && <p className="text-sm text-yellow-300 mb-2">😑 Tout le monde a répondu pareil — trop évident, personne ne marque !</p>}
              {(lobby.groups || []).map((g, i) => (
                <div key={i} className={`rounded-lg p-2 ${g.isMajority ? 'bg-green-900/30 border border-green-500/40' : g.isLone ? 'bg-red-900/20 border border-red-500/30' : 'bg-gray-800/60'}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-bold">{g.label} <span className="text-xs text-gray-400">×{g.count}</span></span>
                    <span className="text-sm">{g.isMajority ? '🐑 +1' : g.isLone ? '🙈 −1' : '0'}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{g.members.join(', ')}</p>
                </div>
              ))}
              {(!lobby.groups || lobby.groups.length === 0) && <p className="text-gray-500 text-sm">Aucune réponse.</p>}
            </div>
            {(isHost || isAsker) ? (
              <button onClick={onContinue} className="w-full py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold">{lobby.roundNumber >= lobby.rounds ? '🏁 Classement final' : '▶ Manche suivante'}</button>
            ) : <p className="text-sm text-gray-400 animate-pulse">En attente…</p>}
          </div>
        )}
      </div>

      {isHost && <div className="shrink-0 p-2 text-center border-t border-gray-800"><button onClick={onStopGame} className="text-xs text-red-400 hover:text-red-300">⏹ Arrêter la partie</button></div>}
    </div>
  );
}
