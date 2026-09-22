import React, { useEffect, useRef, useState } from 'react';
import useAuctionGame from '../hooks/useAuctionGame';
import AuctionLobbyView from './AuctionLobbyView';
import AuctionGameView from './AuctionGameView';

export default function AuctionGameContainer({ currentUser, entry, joinCode, onExit }) {
  const game = useAuctionGame(currentUser);
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

  if (fatal) return shell(<div><p className="text-lg mb-4">💰 {fatal}</p><button onClick={onExit} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Retour</button></div>);
  if (!game.lobby) return shell(<p className="animate-pulse">Connexion à la partie…</p>);
  const l = game.lobby;

  if (l.status === 'waiting') return <AuctionLobbyView lobby={l} currentUser={currentUser} isHost={game.isHost} onSetConfig={game.setConfig} onStart={game.startGame} onStopGame={game.stopGame} onBack={handleExit} />;

  if (l.phase === 'intro') {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-900 via-gray-900 to-gray-900 text-white rounded-xl p-6 gap-4 text-center">
        <h1 className="text-3xl font-extrabold">💰 Encan Clandestin</h1>
        <p className="text-gray-300">{l.players.length} joueurs · {l.startCoins} pièces chacun · {l.itemCount} objets</p>
        <p className="text-sm text-gray-400 max-w-md">Chaque objet vaut des points de victoire. Misez en secret ; le plus offrant paie sa mise et gagne l'objet. En cas d'égalité : surenchère entre les ex æquo. Le plus de PV gagne (les pièces départagent).</p>
        {game.isHost ? <button onClick={game.beginPlay} className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 font-bold text-lg">▶ Commencer</button> : <p className="text-sm text-gray-400 animate-pulse">En attente de l'hôte…</p>}
        {game.isHost && <button onClick={game.stopGame} className="text-xs text-red-400 hover:text-red-300">⏹ Arrêter</button>}
      </div>
    );
  }

  if (l.phase === 'bid' || l.phase === 'tiebreak' || l.phase === 'result') {
    return <AuctionGameView lobby={l} currentUser={currentUser} isHost={game.isHost} onBid={game.bid} onTieBid={game.tieBid} onContinue={game.continueItem} onStopGame={game.stopGame} onBack={handleExit} />;
  }

  // finished
  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-black text-white rounded-xl overflow-hidden">
      <div className="text-center py-5 shrink-0"><h1 className="text-3xl font-extrabold">🏁 Résultats de l'encan</h1></div>
      <div className="flex-1 min-h-0 overflow-y-auto px-4 max-w-md mx-auto w-full space-y-2">
        {(l.finalRanking || []).map((p, i) => (
          <div key={p.odId} className={`flex items-center gap-3 rounded-lg p-3 ${i === 0 ? 'bg-amber-900/30 border border-amber-500/40' : 'bg-gray-800/60'}`}>
            <span className="w-6 text-center font-black text-gray-400">{i + 1}</span>
            <span className="flex-1 font-semibold">{p.pseudo}{i === 0 ? ' 🏆' : ''}</span>
            <span className="font-black text-amber-300">{p.pv} PV</span>
            <span className="text-xs text-gray-400">💰 {p.coins}</span>
          </div>
        ))}
      </div>
      <div className="shrink-0 p-4 flex justify-center"><button onClick={game.isHost ? game.stopGame : handleExit} className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold">{game.isHost ? 'Terminer et fermer' : "Retour à l'accueil"}</button></div>
    </div>
  );
}
