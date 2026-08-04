import BurgerBuzzer from './BurgerBuzzer';
import BurgerAnimatorControls from './BurgerAnimatorControls';
import React, { useEffect, useRef, useState } from 'react';
import useBurgerGame from '../hooks/useBurgerGame';
import BurgerTeamChoice from './BurgerTeamChoice';

/**
 * BurgerGameContainer - point d'entrée du mode Burger Quiz (étape 1).
 *
 * Props:
 * - currentUser: { id, pseudo, avatar }
 * - entry: 'create' | 'join'
 * - joinCode: string (si entry === 'join')
 * - createOptions: { teams?, maxPerTeam? } (si entry === 'create', optionnel)
 * - onExit: () => void
 */
export default function BurgerGameContainer({ currentUser, entry, joinCode, createOptions, onExit }) {
  const game = useBurgerGame(currentUser);
  const started = useRef(false);
  const [fatal, setFatal] = useState(null);

  useEffect(() => {
    if (started.current || !currentUser) return;
    started.current = true;
    (async () => {
      const res = entry === 'create'
        ? await game.createLobby(createOptions || {})
        : await game.joinLobby(joinCode);
      if (!res?.success) setFatal(res?.message || 'Impossible de rejoindre la partie');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  const handleExit = async () => {
    await game.leaveLobby();
    onExit?.();
  };

  if (fatal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-6">
        <div className="text-center">
          <p className="text-lg mb-4">🍔 {fatal}</p>
          <button onClick={onExit} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Retour</button>
        </div>
      </div>
    );
  }

  if (!game.lobby) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p className="animate-pulse">Connexion à la partie…</p>
      </div>
    );
  }

  // Partie lancée : buzzer (joueur) ou télécommande (animateur)
  if (game.lobby.status === 'playing') {
    return game.isAnimator ? (
      <BurgerAnimatorControls
        lobby={game.lobby}
        onLock={game.lockBuzzers}
        onUnlock={game.unlockBuzzers}
        onAddPoint={game.addPoint}
        onBack={handleExit}
      />
    ) : (
      <BurgerBuzzer
        lobby={game.lobby}
        currentUser={currentUser}
        myPlayer={game.myPlayer}
        onBuzz={game.buzz}
        onBack={handleExit}
      />
    );
  }

  // Sinon : lobby d'attente + choix d'équipe (+ bouton Lancer pour l'animateur)
  return (
    <BurgerTeamChoice
      lobby={game.lobby}
      currentUser={currentUser}
      isAnimator={game.isAnimator}
      myPlayer={game.myPlayer}
      onChooseTeam={game.chooseTeam}
      onStart={game.isAnimator ? game.startGame : undefined}
      onBack={handleExit}
    />
  );
}
