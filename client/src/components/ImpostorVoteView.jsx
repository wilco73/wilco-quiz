import React, { useState } from 'react';
import Avatar from './Avatar';

const ROLE_LABEL = { civil: 'Civil', impostor: 'Imposteur', mrwhite: 'Mr White' };

/**
 * ImpostorVoteView - gère les phases 'vote' et 'guess'.
 */
export default function ImpostorVoteView({ lobby, currentUser, isHost, onVote, onSubmitGuess, onVoteGuess, onStopGame, onBack }) {
  const [guess, setGuess] = useState('');
  const me = lobby.players.find((p) => p.odId === currentUser?.id);
  const alive = lobby.aliveIds || [];
  const iAmAlive = alive.includes(currentUser?.id);
  const iVoted = (lobby.votedIds || []).includes(currentUser?.id);
  const pseudoOf = (id) => lobby.players.find((p) => p.odId === id)?.pseudo || '?';

  const pg = lobby.pendingGuess;
  const guessPlayerId = lobby.guessPlayerId;
  const iAmGuesser = lobby.phase === 'guess' && guessPlayerId === currentUser?.id;
  const iAmGuessVoter = pg && pg.voters.includes(currentUser?.id);
  const iVotedGuess = pg && pg.votedIds.includes(currentUser?.id);

  const submitGuess = () => { if (guess.trim()) { onSubmitGuess(guess.trim()); setGuess(''); } };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black text-white rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 shrink-0">
        <button onClick={onBack} className="px-3 py-1.5 rounded-lg bg-gray-800/70 hover:bg-gray-700 text-sm">← Quitter</button>
        <h1 className="text-lg font-extrabold">🕵️ {lobby.phase === 'guess' ? 'Dernière chance' : 'Qui est l\'imposteur ?'}</h1>
        <span className="bg-gray-800 rounded-lg px-3 py-1 font-mono font-bold tracking-widest text-sm">{lobby.code}</span>
      </div>

      {me && (
        <div className="shrink-0 text-center py-1 text-sm">
          {me.role === 'mrwhite' ? <span className="text-pink-400 font-bold">Tu es Mr White</span> : <>Ton mot : <span className="font-bold text-purple-300">{me.word}</span></>}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto p-4">
        {/* Rappel des indices */}
        <details className="max-w-md mx-auto mb-4 bg-gray-800/40 rounded-lg p-2">
          <summary className="text-sm text-gray-400 cursor-pointer">Revoir les indices ({(lobby.clues || []).length})</summary>
          <div className="mt-2 space-y-1">
            {(lobby.clues || []).map((c, i) => (
              <div key={i} className="flex justify-between text-sm"><span className="text-gray-400"><span className="text-xs text-gray-500 mr-1">M{c.round}</span>{pseudoOf(c.odId)}</span><span className="font-semibold">{c.word}</span></div>
            ))}
          </div>
        </details>

        {/* PHASE VOTE */}
        {lobby.phase === 'vote' && (
          <div className="max-w-md mx-auto">
            <p className="text-center text-sm text-gray-400 mb-3">{lobby.votedIds?.length || 0}/{alive.length} ont voté</p>
            {!iAmAlive ? (
              <p className="text-center text-gray-500">Vous ne participez pas au vote.</p>
            ) : iVoted ? (
              <p className="text-center text-green-400">Vote enregistré — en attente des autres…</p>
            ) : (
              <div className="space-y-2">
                {lobby.players.filter((p) => p.alive && p.odId !== currentUser?.id).map((p) => (
                  <button key={p.odId} onClick={() => onVote(p.odId)} className="w-full flex items-center gap-3 rounded-lg p-2 bg-gray-800/60 hover:bg-red-900/40 border border-transparent hover:border-red-500/50 transition">
                    <Avatar avatarId={p.avatar} avatarUrl={p.avatarUrl} size="sm" />
                    <span className="font-semibold">{p.pseudo}</span>
                    <span className="ml-auto text-red-300 text-sm">Voter contre</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* PHASE GUESS */}
        {lobby.phase === 'guess' && (
          <div className="max-w-md mx-auto text-center">
            <p className="text-sm text-gray-300 mb-3">
              <span className="font-bold">{pseudoOf(guessPlayerId)}</span> a été démasqué… et tente de deviner le <span className="text-purple-300 font-bold">mot des civils</span> pour voler la victoire !
            </p>
            {iAmGuesser && !pg && (
              <div className="flex gap-2">
                <input value={guess} onChange={(e) => setGuess(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && submitGuess()} placeholder="Le mot des civils…" maxLength={40} autoFocus className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-600 focus:border-purple-500 outline-none" />
                <button onClick={submitGuess} disabled={!guess.trim()} className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 font-bold disabled:opacity-40">Proposer</button>
              </div>
            )}
            {pg && (
              <div className="rounded-lg border-2 border-blue-500/60 bg-blue-900/20 p-3 mt-2">
                <p className={`text-xl font-black mb-2 ${pg.hint ? 'text-green-400' : 'text-white'}`}>« {pg.answer} » {pg.hint && <span className="text-xs font-normal text-green-300">(probable ✓)</span>}</p>
                {iAmGuessVoter ? (iVotedGuess ? (
                  <p className="text-sm text-gray-400">Vote enregistré… ({pg.yesVotes} oui / {pg.noVotes} non)</p>
                ) : (
                  <div className="flex gap-2"><button onClick={() => onVoteGuess(true)} className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-500 font-bold">✓ Correct</button><button onClick={() => onVoteGuess(false)} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-500 font-bold">✗ Faux</button></div>
                )) : <p className="text-sm text-gray-400">{iAmGuesser ? 'En attente du vote des joueurs…' : 'Vote en cours…'} ({pg.yesVotes} oui / {pg.noVotes} non)</p>}
              </div>
            )}
            {iAmGuesser && !pg && <p className="text-xs text-gray-500 mt-2">Trouve le mot exact des civils pour gagner.</p>}
          </div>
        )}
      </div>

      {isHost && <div className="shrink-0 p-2 text-center border-t border-gray-800"><button onClick={onStopGame} className="text-xs text-red-400 hover:text-red-300">⏹ Arrêter la partie</button></div>}
    </div>
  );
}
