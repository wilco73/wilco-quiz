import React, { useEffect, useRef, useState } from 'react';
import usePixelGame from '../hooks/usePixelGame';
import Avatar from './Avatar';
import PixelLobbyView from './PixelLobbyView';
import PixelPaintView from './PixelPaintView';
import PixelDirectorView from './PixelDirectorView';

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
  const shell = (c) => <div className="h-full flex items-center justify-center bg-gray-900 text-white rounded-xl p-6 text-center">{c}</div>;

  if (fatal) return shell(<div><p className="text-lg mb-4">🎨 {fatal}</p><button onClick={onExit} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Retour</button></div>);
  if (!game.lobby) return shell(<p className="animate-pulse">Connexion à la partie…</p>);
  const l = game.lobby;
  const isDir = l.director === currentUser?.id;
  const iVotedDir = (l.directorVotedIds || []).includes(currentUser?.id);

  if (l.status === 'waiting') {
    return <PixelLobbyView lobby={l} currentUser={currentUser} isHost={game.isHost} onSetConfig={game.setConfig} onStart={game.startGame} onStopGame={game.stopGame} onBack={handleExit} />;
  }

  // Vote du Directeur
  if (l.phase === 'director-vote') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-cyan-900 via-gray-900 to-gray-900 text-white rounded-xl p-6 gap-4 text-center">
        <h1 className="text-2xl font-extrabold">👑 Qui sera le Directeur ?</h1>
        <p className="text-sm text-gray-400">{l.directorVotedIds?.length || 0}/{l.players.length} ont voté</p>
        {iVotedDir ? <p className="text-green-400">Vote enregistré — en attente des autres…</p> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-w-md">
            {l.players.map((p) => (
              <button key={p.odId} onClick={() => game.voteDirector(p.odId)} className="flex items-center gap-2 rounded-lg p-2 bg-gray-800/60 hover:bg-cyan-900/40 border border-transparent hover:border-cyan-500/50">
                <Avatar avatarId={p.avatar} avatarUrl={p.avatarUrl} size="sm" /><span className="text-sm font-semibold">{p.pseudo}</span>
              </button>
            ))}
          </div>
        )}
        {game.isHost && <button onClick={game.stopGame} className="text-xs text-red-400 hover:text-red-300 mt-2">⏹ Arrêter la partie</button>}
      </div>
    );
  }

  // Préparation
  if (l.phase === 'prep') {
    if (isDir) return <PixelDirectorView lobby={l} isHost={game.isHost} onLaunch={game.launchPaint} onEndRound={game.endRound} onStopGame={game.stopGame} onBack={handleExit} />;
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-cyan-900 via-gray-900 to-gray-900 text-white rounded-xl p-6 gap-3 text-center">
        <h1 className="text-2xl font-extrabold">🎨 Manche {l.currentRound}/{l.rounds}</h1>
        <p className="text-lg">Préparez-vous ! <span className="font-bold text-cyan-300">{l.directorPseudo}</span> va vous guider.</p>
        <p className="text-sm text-gray-400">Vous dessinerez à l'aveugle — écoutez bien ses consignes.</p>
        <button onClick={handleExit} className="text-xs text-gray-500 hover:text-white mt-2">Quitter</button>
      </div>
    );
  }

  // Peinture
  if (l.phase === 'paint') {
    if (isDir) return <PixelDirectorView lobby={l} isHost={game.isHost} onLaunch={game.launchPaint} onEndRound={game.endRound} onStopGame={game.stopGame} onBack={handleExit} />;
    return <PixelPaintView lobby={l} currentUser={currentUser} isHost={game.isHost} onPaintCell={game.paintCell} onClearGrid={game.clearGrid} onStopGame={game.stopGame} onBack={handleExit} />;
  }

  // Fin de manche (transition ; le reveal + score arrivent en Phase 3)
  if (l.phase === 'round-end') {
    const last = l.currentRound >= l.rounds;
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gray-900 text-white rounded-xl p-6 gap-4 text-center">
        <h1 className="text-2xl font-extrabold">✅ Manche {l.currentRound} terminée !</h1>
        <p className="text-gray-400">Le rendu de toutes les grilles + le score arriveront à la prochaine étape.</p>
        {(isDir || game.isHost) ? (
          <button onClick={game.continueRound} className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 font-bold">{last ? '🏁 Voir la fin' : '▶ Manche suivante'}</button>
        ) : <p className="text-sm text-gray-400 animate-pulse">En attente du Directeur…</p>}
        {game.isHost && <button onClick={game.stopGame} className="text-xs text-red-400 hover:text-red-300">⏹ Arrêter la partie</button>}
      </div>
    );
  }

  // finished (placeholder Phase 3)
  return shell(<div><p className="text-2xl font-extrabold mb-2">🏁 Partie terminée !</p><p className="text-gray-400 mb-4">Le récap et les scores arrivent en Phase 3.</p><button onClick={game.isHost ? game.stopGame : handleExit} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">{game.isHost ? 'Fermer' : 'Retour'}</button></div>);
}
