import React, { useEffect, useRef, useState } from 'react';
import useWilpostGame from '../hooks/useWilpostGame';
import Avatar from './Avatar';
import WilpostLobbyView from './WilpostLobbyView';
import WilpostGameView from './WilpostGameView';

export default function WilpostGameContainer({ currentUser, entry, joinCode, onExit }) {
  const game = useWilpostGame(currentUser);
  const started = useRef(false);
  const [fatal, setFatal] = useState(null);

  useEffect(() => {
    if (started.current || !currentUser) return;
    started.current = true;
    (async () => {
      const res = entry === 'create' ? await game.createLobby() : await game.joinLobby(joinCode);
      if (!res?.success) setFatal(res?.message || 'Impossible de rejoindre la partie');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  useEffect(() => { if (game.ended) onExit?.(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [game.ended]);

  const handleExit = async () => { await game.leaveLobby(); onExit?.(); };

  const shell = (content) => (
    <div className="h-full flex items-center justify-center bg-gray-900 text-white rounded-xl p-6">{content}</div>
  );

  if (fatal) return shell(<div className="text-center"><p className="text-lg mb-4">📝 {fatal}</p><button onClick={onExit} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Retour</button></div>);
  if (!game.lobby) return shell(<p className="animate-pulse">Connexion à la partie…</p>);

  const lobby = game.lobby;

  if (lobby.status === 'waiting') {
    return (
      <WilpostLobbyView
        lobby={lobby} currentUser={currentUser} isHost={game.isHost}
        onSetOrder={game.setOrder} onSetDuration={game.setRoundDuration}
        onSetWord={game.setWord} onStart={game.startGame} onStopGame={game.stopGame} onBack={handleExit}
      />
    );
  }

  if (lobby.phase === 'intro') {
    const starter = lobby.players.find((p) => p.odId === lobby.currentPlayerId);
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-yellow-900 via-gray-900 to-gray-900 text-white rounded-xl p-6 text-center gap-5">
        <h1 className="text-3xl font-extrabold">📝 La partie commence !</h1>
        {starter && (
          <div className="flex flex-col items-center gap-2">
            <Avatar avatarId={starter.avatar} avatarUrl={starter.avatarUrl} size="xl" />
            <p className="text-xl">C'est <span className="font-bold text-yellow-300">{starter.pseudo}</span> qui commence.</p>
          </div>
        )}
        <p className="text-gray-400 max-w-md">Chacun pose ses questions à voix haute pour deviner son mot. Le joueur en cours continue tant qu'il obtient des « oui », et termine son tour quand il veut (ou au bout du temps).</p>
        {game.isHost ? (
          <button onClick={game.beginRound} className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-lg">▶ Lancer le premier round</button>
        ) : (
          <p className="text-sm text-gray-400 animate-pulse">En attente que l'hôte lance le premier round…</p>
        )}
        {game.isHost && <button onClick={game.stopGame} className="text-xs text-red-400 hover:text-red-300 mt-1">⏹ Arrêter la partie</button>}
        <button onClick={handleExit} className="text-xs text-gray-500 hover:text-white">Quitter</button>
      </div>
    );
  }

  if (lobby.phase === 'finished') {
    const ranking = [...lobby.players]
      .map((p) => ({ ...p, at: p.guessedAtTurn || Infinity }))
      .sort((a, b) => a.at - b.at);
    return (
      <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black text-white rounded-xl overflow-hidden">
        <div className="text-center py-6 shrink-0">
          <h1 className="text-3xl font-extrabold">🏁 Partie terminée !</h1>
          <p className="text-gray-400">Qui a deviné son mot en le moins de tours ?</p>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 max-w-xl mx-auto w-full space-y-2">
          {ranking.map((p, i) => (
            <div key={p.odId} className="flex items-center gap-3 rounded-lg p-3 bg-gray-800/60">
              <span className="w-6 text-center font-black text-gray-400">{p.guessedAtTurn ? i + 1 : '—'}</span>
              <Avatar avatarId={p.avatar} avatarUrl={p.avatarUrl} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{p.pseudo}</p>
                <p className="text-sm text-gray-400 truncate">son mot : <span className="text-white">{p.guessWord || '—'}</span></p>
              </div>
              <span className="text-sm shrink-0">{p.guessedAtTurn ? `✅ tour ${p.guessedAtTurn}` : '❌ non trouvé'}</span>
            </div>
          ))}
        </div>
        <div className="shrink-0 p-4 flex justify-center">
          <button onClick={game.isHost ? game.stopGame : handleExit} className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold">
            {game.isHost ? 'Terminer et fermer la partie' : "Retour à l'accueil"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <WilpostGameView
      lobby={lobby} currentUser={currentUser} isHost={game.isHost}
      onEndTurn={game.endTurn} onStopGame={game.stopGame}
      onSubmitAnswer={game.submitAnswer} onVote={game.vote} onBack={handleExit}
    />
  );
}
