import React, { useEffect, useRef, useState } from 'react';
import usePitchGame from '../hooks/usePitchGame';
import PitchLobbyView from './PitchLobbyView';

export default function PitchGameContainer({ currentUser, entry, joinCode, onExit }) {
  const game = usePitchGame(currentUser);
  const started = useRef(false);
  const [fatal, setFatal] = useState(null);

  useEffect(() => {
    if (started.current || !currentUser) return; started.current = true;
    (async () => { const r = entry === 'create' ? await game.createLobby() : await game.joinLobby(joinCode); if (!r?.success) setFatal(r?.message || 'Impossible de rejoindre la partie'); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);
  useEffect(() => { if (game.ended) onExit?.(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [game.ended]);

  const handleExit = async () => { await game.leaveLobby(); onExit?.(); };
  const shell = (c) => <div className="h-full flex items-center justify-center bg-gray-900 text-white rounded-xl p-6 text-center">{c}</div>;

  if (fatal) return shell(<div><p className="text-lg mb-4">🎤 {fatal}</p><button onClick={onExit} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Retour</button></div>);
  if (!game.lobby) return shell(<p className="animate-pulse">Connexion à la partie…</p>);
  const l = game.lobby;

  if (l.status === 'waiting') {
    return <PitchLobbyView lobby={l} currentUser={currentUser} isHost={game.isHost}
      onChooseTeam={game.chooseTeam} onShuffle={game.shuffleTeams} onSetConfig={game.setConfig}
      onAddWord={game.addCustomWord} onRemoveWord={game.removeCustomWord} onStart={game.startGame} onStopGame={game.stopGame} onBack={handleExit} />;
  }
  return shell(<div><p className="text-2xl font-extrabold mb-2">🎤 La partie commence !</p><p className="text-gray-400 mb-4">Le déroulé (pièges + devinette + PIÈGE) arrive à la prochaine étape.</p><button onClick={handleExit} className="px-4 py-2 bg-gray-700 rounded-lg">Quitter</button></div>);
}
