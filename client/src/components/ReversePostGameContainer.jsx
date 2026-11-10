import React, { useEffect, useRef, useState } from 'react';
import useReversePostGame from '../hooks/useReversePostGame';
import Avatar from './Avatar';
import ReversePostLobbyView from './ReversePostLobbyView';
import ReversePostGameView from './ReversePostGameView';

export default function ReversePostGameContainer({ currentUser, entry, joinCode, onExit }) {
  const game = useReversePostGame(currentUser);
  const started = useRef(false);
  const [fatal, setFatal] = useState(null);
  const [zoomImg, setZoomImg] = useState(null);

  useEffect(() => {
    if (started.current || !currentUser) return; started.current = true;
    (async () => { const r = entry === 'create' ? await game.createLobby() : await game.joinLobby(joinCode); if (!r?.success) setFatal(r?.message || 'Impossible de rejoindre la partie'); })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);
  useEffect(() => { if (game.ended) onExit?.(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [game.ended]);

  const handleExit = async () => { await game.leaveLobby(); onExit?.(); };
  const shell = (c) => <div className="h-full flex items-center justify-center bg-gray-900 text-white rounded-xl p-6 text-center">{c}</div>;

  if (fatal) return shell(<div><p className="text-lg mb-4">🔄 {fatal}</p><button onClick={onExit} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Retour</button></div>);
  if (!game.lobby) return shell(<p className="animate-pulse">Connexion à la partie…</p>);
  const l = game.lobby;
  const me = l.players.find((p) => p.odId === currentUser?.id);

  if (l.status === 'waiting') {
    return <ReversePostLobbyView lobby={l} currentUser={currentUser} isHost={game.isHost}
      onSetWord={game.setWord} onSetConfig={game.setConfig} onStart={game.startGame} onStopGame={game.stopGame} onBack={handleExit} />;
  }

  if (l.phase === 'intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-sky-900 via-gray-900 to-gray-900 text-white rounded-xl p-6 gap-4 text-center">
        <h1 className="text-3xl font-extrabold">🔄 Post-it inversé</h1>
        {me ? <p className="text-lg">Ton mot secret : <span className="font-black text-sky-300">{me.word}</span></p> : <p className="text-gray-400">👁 Mode spectateur</p>}
        <div className="max-w-md text-sm text-gray-300 space-y-1 text-left bg-gray-800/50 rounded-xl p-4">
          <p>🎯 À ton tour, choisis un joueur encore non trouvé.</p>
          <p>❓ Pose-lui une question <b>à l'oral</b> : il répond oui ou non. Puis clique « fin de mon tour ».</p>
          <p>💡 Ou fais une <b>proposition</b> sur son mot : c'est lui qui valide. Juste = +1 point pour toi.</p>
          <p>✅ Un joueur trouvé continue à jouer, mais on ne peut plus le cibler.</p>
          <p>🏁 La partie s'arrête quand tout le monde a été trouvé.</p>
          <p className="text-gray-500">📝 Pense à prendre des notes : le bloc-notes est à côté du jeu.</p>
        </div>
        {game.isHost ? <button onClick={game.begin} className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-lg">▶ Commencer</button> : <p className="text-sm text-gray-400 animate-pulse">En attente de l'hôte…</p>}
        {game.isHost && <button onClick={game.stopGame} className="text-xs text-red-400 hover:text-red-300">⏹ Arrêter</button>}
      </div>
    );
  }

  if (l.phase === 'turn') {
    return <ReversePostGameView lobby={l} currentUser={currentUser} isHost={game.isHost}
      onAskQuestion={game.askQuestion} onSubmitGuess={game.submitGuess} onCancelGuess={game.cancelGuess}
      onValidateGuess={game.validateGuess} onEndTurn={game.endTurn} onEndGame={game.endGame}
      onStopGame={game.stopGame} onBack={handleExit} />;
  }

  // Fin de partie : classement + tous les mots révélés
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black text-white rounded-xl overflow-hidden">
      <div className="text-center py-5 shrink-0"><h1 className="text-3xl font-extrabold">🏁 Classement</h1></div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 max-w-lg mx-auto w-full space-y-2">
        {(l.ranking || []).map((r, i) => {
          const p = l.players.find((x) => x.odId === r.odId) || {};
          return (
            <div key={r.odId} className={`flex items-center gap-3 rounded-lg p-3 ${i === 0 ? 'bg-sky-900/30 border border-sky-500/40' : 'bg-gray-800/60'}`}>
              <span className="w-7 text-center text-lg">{medals[i] || i + 1}</span>
              <Avatar avatarId={p.avatar} avatarUrl={p.avatarUrl} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{r.pseudo}</p>
                <p className="text-xs text-gray-400 truncate">Son mot : <span className="text-gray-200">{r.word}</span>{p.foundByPseudo ? ` — trouvé par ${p.foundByPseudo}` : ' — jamais trouvé !'}</p>
              </div>
              {p.wordImage && <button onClick={() => setZoomImg(p.wordImage)} className="w-8 h-8 rounded-lg bg-gray-700 hover:bg-gray-600">👁</button>}
              <span className="font-black text-yellow-300">{r.points} pt{r.points > 1 ? 's' : ''}</span>
            </div>
          );
        })}
      </div>
      <div className="shrink-0 p-4 flex justify-center">
        <button onClick={game.isHost ? game.stopGame : handleExit} className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold">{game.isHost ? 'Terminer et fermer' : "Retour à l'accueil"}</button>
      </div>
      {zoomImg && (
        <div className="fixed inset-0 z-[80] bg-black/85 flex items-center justify-center p-4" onClick={() => setZoomImg(null)}>
          <img src={zoomImg} alt="" className="max-w-[90vw] max-h-[85vh] rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
