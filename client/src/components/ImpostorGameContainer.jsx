import React, { useEffect, useRef, useState } from 'react';
import useImpostorGame from '../hooks/useImpostorGame';
import Avatar from './Avatar';
import ImpostorLobbyView from './ImpostorLobbyView';
import ImpostorGameView from './ImpostorGameView';
import ImpostorVoteView from './ImpostorVoteView';

const ROLE_LABEL = { civil: 'Civil', impostor: 'Imposteur', mrwhite: 'Mr White' };
const WINNER_LABEL = { civils: '🎉 Les civils gagnent !', impostors: '😈 Les imposteurs gagnent !', mrwhite: '🃏 Mr White gagne, seul !' };

export default function ImpostorGameContainer({ currentUser, entry, joinCode, onExit }) {
  const game = useImpostorGame(currentUser);
  const started = useRef(false);
  const [fatal, setFatal] = useState(null);

  useEffect(() => {
    if (started.current || !currentUser) return; started.current = true;
    (async () => { const r = entry === 'create' ? await game.createLobby() : await game.joinLobby(joinCode); if (!r?.success) setFatal(r?.message || 'Impossible de rejoindre la partie'); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);
  useEffect(() => { if (game.ended) onExit?.(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [game.ended]);

  const handleExit = async () => { await game.leaveLobby(); onExit?.(); };
  const shell = (c) => <div className="h-full flex items-center justify-center bg-gray-900 text-white rounded-xl p-6">{c}</div>;

  if (fatal) return shell(<div className="text-center"><p className="text-lg mb-4">🕵️ {fatal}</p><button onClick={onExit} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Retour</button></div>);
  if (!game.lobby) return shell(<p className="animate-pulse">Connexion à la partie…</p>);
  const l = game.lobby;
  const me = l.players.find((p) => p.odId === currentUser?.id);
  const pseudoOf = (id) => l.players.find((p) => p.odId === id)?.pseudo || '?';

  if (l.status === 'waiting') {
    return <ImpostorLobbyView lobby={l} currentUser={currentUser} isHost={game.isHost} onSetConfig={game.setConfig} onAddPair={game.addCustomPair} onRemovePair={game.removeCustomPair} onStart={game.startGame} onStopGame={game.stopGame} onBack={handleExit} />;
  }

  if (l.phase === 'reveal') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900 text-white rounded-xl p-6 text-center gap-5">
        <h1 className="text-2xl font-extrabold">🕵️ Ton mot secret</h1>
        {me ? (me.role === 'mrwhite'
          ? <div className="bg-gray-800/70 rounded-2xl px-8 py-6"><p className="text-3xl font-black text-pink-400">Tu es Mr White</p><p className="text-gray-400 mt-2">Tu n'as aucun mot… à toi de bluffer !</p></div>
          : <div className="bg-gray-800/70 rounded-2xl px-10 py-6"><p className="text-4xl font-black text-purple-300">{me.word}</p><p className="text-gray-500 text-sm mt-2">Ne le dis à personne. Décris-le sans le donner.</p></div>
        ) : <p className="text-gray-400">👁 Mode spectateur</p>}
        {game.isHost ? <button onClick={game.beginClues} className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-lg">▶ Commencer les indices</button> : <p className="text-sm text-gray-400 animate-pulse">En attente que l'hôte lance les indices…</p>}
        {game.isHost && <button onClick={game.stopGame} className="text-xs text-red-400 hover:text-red-300">⏹ Arrêter la partie</button>}
        <button onClick={handleExit} className="text-xs text-gray-500 hover:text-white">Quitter</button>
      </div>
    );
  }

  if (l.phase === 'clues') {
    return <ImpostorGameView lobby={l} currentUser={currentUser} isHost={game.isHost} onSubmitClue={game.submitClue} onStopGame={game.stopGame} onBack={handleExit} />;
  }

  if (l.phase === 'vote' || l.phase === 'guess') {
    return <ImpostorVoteView lobby={l} currentUser={currentUser} isHost={game.isHost} onVote={game.vote} onSubmitGuess={game.submitGuess} onVoteGuess={game.voteGuess} onStopGame={game.stopGame} onBack={handleExit} />;
  }

  if (l.phase === 'result') {
    const r = l.result || {};
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-900 text-white rounded-xl p-6 text-center gap-4">
        {r.type === 'tie' ? (
          <><h1 className="text-2xl font-extrabold">🤝 Égalité !</h1><p className="text-gray-400">Personne n'est éliminé. On repart pour un tour d'indices.</p></>
        ) : (
          <><h1 className="text-2xl font-extrabold">Éliminé : {pseudoOf(r.id)}</h1>
            <p className={`text-lg font-bold ${r.role === 'civil' ? 'text-green-400' : 'text-red-400'}`}>C'était un {ROLE_LABEL[r.role] || '?'} !</p></>
        )}
        {game.isHost ? <button onClick={game.beginClues} className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 font-bold">▶ Nouveau tour d'indices</button> : <p className="text-sm text-gray-400 animate-pulse">En attente de l'hôte…</p>}
        {game.isHost && <button onClick={game.stopGame} className="text-xs text-red-400 hover:text-red-300">⏹ Arrêter la partie</button>}
      </div>
    );
  }

  // finished
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black text-white rounded-xl overflow-hidden">
      <div className="text-center py-5 shrink-0">
        <h1 className="text-3xl font-extrabold">{WINNER_LABEL[l.winner] || 'Partie terminée'}</h1>
        {l.pair && <p className="text-gray-400 mt-1">Mot civil : <span className="text-green-300 font-bold">{l.pair.civil}</span> — Mot imposteur : <span className="text-red-300 font-bold">{l.pair.impostor}</span></p>}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 max-w-md mx-auto w-full space-y-2">
        {l.players.map((p) => (
          <div key={p.odId} className={`flex items-center gap-3 rounded-lg p-2 ${p.role === 'civil' ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
            <Avatar avatarId={p.avatar} avatarUrl={p.avatarUrl} size="sm" />
            <span className="font-semibold flex-1">{p.pseudo}</span>
            <span className="text-sm">{ROLE_LABEL[p.role]}{p.role !== 'civil' ? '' : ''} {p.alive ? '' : '❌'}</span>
          </div>
        ))}
      </div>
      <div className="shrink-0 p-4 flex justify-center">
        <button onClick={game.isHost ? game.stopGame : handleExit} className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold">{game.isHost ? 'Terminer et fermer' : "Retour à l'accueil"}</button>
      </div>
    </div>
  );
}
