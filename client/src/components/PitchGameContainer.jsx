import React, { useEffect, useRef, useState } from 'react';
import usePitchGame from '../hooks/usePitchGame';
import PitchLobbyView from './PitchLobbyView';
import PitchGameView from './PitchGameView';

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
  // Intro
  if (l.phase === 'intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-rose-900 via-gray-900 to-blue-900 text-white rounded-xl p-6 gap-4 text-center">
        <h1 className="text-3xl font-extrabold">🎤 Match de Pitch</h1>
        <p className="text-gray-300">{l.teamCounts.red} <span style={{color:l.teams[0].color}}>{l.teams[0].name}</span> vs {l.teamCounts.blue} <span style={{color:l.teams[1].color}}>{l.teams[1].name}</span> — {l.wordsPerTeam} mots par équipe</p>
        <p className="text-sm text-gray-400 max-w-md">Une équipe fait deviner à la voix ; l'autre voit le mot, pose des pièges et clique quand un mot interdit est prononcé. +1 si trouvé, +1 pour l'équipe piège si un piège tombe.</p>
        {game.isHost ? <button onClick={game.beginPlay} className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-lg">▶ Commencer</button> : <p className="text-sm text-gray-400 animate-pulse">En attente de l'hôte…</p>}
        {game.isHost && <button onClick={game.stopGame} className="text-xs text-red-400 hover:text-red-300">⏹ Arrêter</button>}
      </div>
    );
  }

  // Déroulé (pièges / devinette / reveal)
  if (l.phase === 'trap' || l.phase === 'guess' || l.phase === 'reveal') {
    return <PitchGameView lobby={l} currentUser={currentUser} isHost={game.isHost}
      onAddTrap={game.addTrap} onRemoveTrap={game.removeTrap} onLockTraps={game.lockTraps}
      onBuzzFound={game.buzzFound} onBuzzTrap={game.buzzTrap} onContinue={game.continueWord}
      onStopGame={game.stopGame} onBack={handleExit} />;
  }

  // Fin de partie
  const winner = l.scores.red === l.scores.blue ? null : (l.scores.red > l.scores.blue ? l.teams[0] : l.teams[1]);
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-black text-white rounded-xl p-6 gap-4 text-center">
      <h1 className="text-3xl font-extrabold">🏁 Partie terminée !</h1>
      <p className="text-2xl font-black">{winner ? <>🏆 <span style={{color:winner.color}}>{winner.name}</span> gagne !</> : 'Égalité !'}</p>
      <p className="text-xl"><span style={{color:l.teams[0].color}} className="font-black">{l.scores.red}</span> <span className="text-gray-500">-</span> <span style={{color:l.teams[1].color}} className="font-black">{l.scores.blue}</span></p>
      <button onClick={game.isHost ? game.stopGame : handleExit} className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold mt-2">{game.isHost ? 'Terminer et fermer' : "Retour à l'accueil"}</button>
    </div>
  );
}
