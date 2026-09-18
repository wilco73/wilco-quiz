import React, { useEffect, useRef, useState } from 'react';
import useImpostorGame from '../hooks/useImpostorGame';
import ImpostorLobbyView from './ImpostorLobbyView';

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

  if (l.status === 'waiting') {
    return <ImpostorLobbyView lobby={l} currentUser={currentUser} isHost={game.isHost} onSetConfig={game.setConfig} onAddPair={game.addCustomPair} onRemovePair={game.removeCustomPair} onStart={game.startGame} onStopGame={game.stopGame} onBack={handleExit} />;
  }

  // Phase 1 : reveal — chacun voit SON mot
  const me = l.players.find((p) => p.odId === currentUser?.id);
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-gray-900 to-gray-900 text-white rounded-xl p-6 text-center gap-5">
      <h1 className="text-2xl font-extrabold">🕵️ Ton mot secret</h1>
      {me ? (
        me.role === 'mrwhite' ? (
          <div className="bg-gray-800/70 rounded-2xl px-8 py-6">
            <p className="text-3xl font-black text-pink-400">Tu es Mr White</p>
            <p className="text-gray-400 mt-2">Tu n'as aucun mot… à toi de bluffer !</p>
          </div>
        ) : (
          <div className="bg-gray-800/70 rounded-2xl px-10 py-6">
            <p className="text-4xl font-black text-purple-300">{me.word}</p>
            <p className="text-gray-500 text-sm mt-2">Ne le dis à personne. Décris-le sans le donner.</p>
          </div>
        )
      ) : <p className="text-gray-400">👁 Mode spectateur</p>}
      <p className="text-gray-400 max-w-md text-sm">Les manches d'indices et le vote arrivent à la prochaine étape.</p>
      {game.isHost && <button onClick={game.stopGame} className="text-xs text-red-400 hover:text-red-300">⏹ Arrêter la partie</button>}
      <button onClick={handleExit} className="text-xs text-gray-500 hover:text-white">Quitter</button>
    </div>
  );
}
