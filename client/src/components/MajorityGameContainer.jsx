import React, { useEffect, useRef, useState } from 'react';
import useMajorityGame from '../hooks/useMajorityGame';
import Avatar from './Avatar';
import MajorityLobbyView from './MajorityLobbyView';
import MajorityGameView from './MajorityGameView';

export default function MajorityGameContainer({ currentUser, entry, joinCode, onExit }) {
  const game = useMajorityGame(currentUser);
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

  if (fatal) return shell(<div><p className="text-lg mb-4">🐑 {fatal}</p><button onClick={onExit} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Retour</button></div>);
  if (!game.lobby) return shell(<p className="animate-pulse">Connexion à la partie…</p>);
  const l = game.lobby;

  if (l.status === 'waiting') {
    return <MajorityLobbyView lobby={l} currentUser={currentUser} isHost={game.isHost} onSetConfig={game.setConfig} onStart={game.startGame} onStopGame={game.stopGame} onBack={handleExit} />;
  }
  if (l.phase === 'ask' || l.phase === 'answer' || l.phase === 'reveal') {
    return <MajorityGameView lobby={l} currentUser={currentUser} isHost={game.isHost} onSetQuestion={game.setQuestion} onAnswer={game.answer} onContinue={game.continueRound} onStopGame={game.stopGame} onBack={handleExit} />;
  }
  // finished
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black text-white rounded-xl overflow-hidden">
      <div className="text-center py-5 shrink-0"><h1 className="text-3xl font-extrabold">🏁 Classement final</h1></div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 max-w-md mx-auto w-full space-y-2">
        {(l.finalRanking || []).map((p, i) => (
          <div key={p.odId} className={`flex items-center gap-3 rounded-lg p-3 ${i === 0 ? 'bg-emerald-900/30 border border-emerald-500/40' : 'bg-gray-800/60'}`}>
            <span className="w-6 text-center font-black text-gray-400">{i + 1}</span>
            <span className="flex-1 font-semibold">{p.pseudo}{i === 0 ? ' 🏆' : ''}</span>
            <span className="font-black">{p.score} pt{Math.abs(p.score) > 1 ? 's' : ''}</span>
          </div>
        ))}
      </div>
      <div className="shrink-0 p-4 flex justify-center">
        <button onClick={game.isHost ? game.stopGame : handleExit} className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold">{game.isHost ? 'Terminer et fermer' : "Retour à l'accueil"}</button>
      </div>
    </div>
  );
}
