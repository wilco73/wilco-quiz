import React, { useEffect, useRef, useState } from 'react';
import usePixelGame from '../hooks/usePixelGame';
import PixelLobbyView from './PixelLobbyView';
import PixelPaintView from './PixelPaintView';

export default function PixelGameContainer({ currentUser, entry, joinCode, onExit }) {
  const game = usePixelGame(currentUser);
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

  if (fatal) return shell(<div className="text-center"><p className="text-lg mb-4">🎨 {fatal}</p><button onClick={onExit} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Retour</button></div>);
  if (!game.lobby) return shell(<p className="animate-pulse">Connexion à la partie…</p>);
  const l = game.lobby;

  if (l.status === 'waiting') {
    return <PixelLobbyView lobby={l} currentUser={currentUser} isHost={game.isHost} onSetConfig={game.setConfig} onStart={game.startGame} onStopGame={game.stopGame} onBack={handleExit} />;
  }
  if (l.phase === 'paint') {
    return <PixelPaintView lobby={l} currentUser={currentUser} isHost={game.isHost} onPaintCell={game.paintCell} onClearGrid={game.clearGrid} onStopGame={game.stopGame} onBack={handleExit} />;
  }
  return shell(<div className="text-center"><p className="text-lg mb-2">🎨 Suite à venir (Directeur + timer + reveal)</p><button onClick={handleExit} className="px-4 py-2 bg-gray-700 rounded-lg">Quitter</button></div>);
}
