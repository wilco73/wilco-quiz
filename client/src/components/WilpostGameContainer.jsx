import React, { useEffect, useRef, useState } from 'react';
import useWilpostGame from '../hooks/useWilpostGame';
import WilpostLobbyView from './WilpostLobbyView';

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

  if (fatal) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900 text-white p-6">
        <div className="text-center">
          <p className="text-lg mb-4">📝 {fatal}</p>
          <button onClick={onExit} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Retour</button>
        </div>
      </div>
    );
  }
  if (!game.lobby) {
    return <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900 text-white"><p className="animate-pulse">Connexion à la partie…</p></div>;
  }

  if (game.lobby.status === 'waiting') {
    return (
      <WilpostLobbyView
        lobby={game.lobby}
        currentUser={currentUser}
        isHost={game.isHost}
        onSetOrder={game.setOrder}
        onSetDuration={game.setRoundDuration}
        onSetWord={game.setWord}
        onStart={game.startGame}
        onBack={handleExit}
      />
    );
  }

  // Phase 2 : écran de jeu (placeholder)
  return (
    <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-gray-900 text-white gap-4">
      <p className="text-2xl font-bold">📝 La partie commence !</p>
      <p className="text-gray-400">L'écran de jeu (tours, questions, réponses) arrive à la prochaine étape.</p>
      <button onClick={handleExit} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Quitter</button>
    </div>
  );
}
