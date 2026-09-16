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

  if (fatal) {
    return (
      <div className="fixed inset-0 z-60 flex items-center justify-center bg-gray-900 text-white p-6">
        <div className="text-center">
          <p className="text-lg mb-4">📝 {fatal}</p>
          <button onClick={onExit} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Retour</button>
        </div>
      </div>
    );
  }
  if (!game.lobby) {
    return <div className="fixed inset-0 z-60 flex items-center justify-center bg-gray-900 text-white"><p className="animate-pulse">Connexion à la partie…</p></div>;
  }

  const lobby = game.lobby;

  // Lobby
  if (lobby.status === 'waiting') {
    return (
      <WilpostLobbyView
        lobby={lobby} currentUser={currentUser} isHost={game.isHost}
        onSetOrder={game.setOrder} onSetDuration={game.setRoundDuration}
        onSetWord={game.setWord} onStart={game.startGame} onBack={handleExit}
      />
    );
  }

  // Intro : tout le monde se prépare, l'hôte lance le 1er round
  if (lobby.phase === 'intro') {
    const starter = lobby.players.find((p) => p.odId === lobby.currentPlayerId);
    return (
      <div className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-gradient-to-br from-yellow-900 via-gray-900 to-gray-900 text-white p-6 text-center gap-5">
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
        <button onClick={handleExit} className="text-xs text-gray-500 hover:text-white mt-4">Quitter</button>
        {game.isHost && (
          <button onClick={game.stopGame} className="text-xs text-red-400 hover:text-red-300 mt-2">⏹ Arrêter la partie</button>
        )}
      </div>
    );
  }

  // Fin de partie (Phase 3 fera un vrai récap)
  if (lobby.phase === 'finished') {
    return (
      <div className="fixed inset-0 z-60 flex flex-col items-center justify-center bg-gray-900 text-white gap-4 text-center p-6">
        <h1 className="text-3xl font-extrabold">🏁 Partie terminée !</h1>
        <p className="text-gray-400">Le récap détaillé arrivera avec la Phase 3.</p>
        <button
          onClick={game.isHost ? game.stopGame : handleExit}
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg"
        >
          {game.isHost ? 'Terminer et fermer la partie' : 'Retour à l\'accueil'}
        </button>
      </div>
    );
  }

  // Round en cours
  return (
    <WilpostGameView
      lobby={lobby} currentUser={currentUser} isHost={game.isHost}
      onEndTurn={game.endTurn} onStopGame={game.stopGame} onBack={handleExit}
    />
  );
}
