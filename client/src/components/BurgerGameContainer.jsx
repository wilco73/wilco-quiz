import React, { useEffect, useRef, useState } from 'react';
import useBurgerGame from '../hooks/useBurgerGame';
import BurgerCreateConfig from './BurgerCreateConfig';
import BurgerTeamChoice from './BurgerTeamChoice';
import BurgerBuzzer from './BurgerBuzzer';
import BurgerScoreboard from './BurgerScoreboard';
import BurgerTransitionOverlay from './BurgerTransitionOverlay';
import BurgerBuzzFlash from './BurgerBuzzFlash';

/**
 * BurgerGameContainer - point d'entrée du mode Burger Quiz.
 * - entry 'create' : écran de configuration (nb d'équipes) puis création.
 * - entry 'join'   : rejoint directement par code.
 */
export default function BurgerGameContainer({ currentUser, entry, joinCode, onExit }) {
  const game = useBurgerGame(currentUser);
  const started = useRef(false);
  const [fatal, setFatal] = useState(null);

  // Rejoindre automatiquement (entry 'join'). La création attend la config.
  useEffect(() => {
    if (started.current || !currentUser) return;
    if (entry === 'join') {
      started.current = true;
      (async () => {
        const res = await game.joinLobby(joinCode);
        if (!res?.success) setFatal(res?.message || 'Impossible de rejoindre la partie');
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // Fin de partie déclenchée par l'animateur -> tout le monde revient à l'accueil
  useEffect(() => {
    if (game.ended) onExit?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.ended]);

  const handleConfirmCreate = async (options) => {
    const res = await game.createLobby(options);
    if (!res?.success) setFatal(res?.message || 'Impossible de créer la partie');
  };

  const handleExit = async () => {
    await game.leaveLobby();
    onExit?.();
  };

  if (fatal) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900 text-white p-6">
        <div className="text-center">
          <p className="text-lg mb-4">🍔 {fatal}</p>
          <button onClick={onExit} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg">Retour</button>
        </div>
      </div>
    );
  }

  // Création : écran de config tant que le lobby n'existe pas
  if (entry === 'create' && !game.lobby) {
    return <BurgerCreateConfig onCreate={handleConfirmCreate} onBack={onExit} loading={game.loading} />;
  }

  // Attente (join en cours)
  if (!game.lobby) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900 text-white">
        <p className="animate-pulse">Connexion à la partie…</p>
      </div>
    );
  }

  // Spectateur : a rejoint une partie en cours sans être dans une équipe -> vue lecture seule
  if (game.isSpectator) {
    return (
      <>
        <BurgerScoreboard lobby={game.lobby} readOnly onBack={handleExit} />
        <BurgerTransitionOverlay video={game.activeTransition} onEnd={game.clearTransition} />
        <BurgerBuzzFlash color={game.buzzFlash} />
      </>
    );
  }

  // Écran principal selon l'état
  let screen;
  if (game.lobby.status === 'playing') {
    screen = game.isAnimator ? (
      <BurgerScoreboard
        lobby={game.lobby}
        onLock={game.lockBuzzers}
        onUnlock={game.unlockBuzzers}
        onAddPoint={game.addPoint}
        onTransition={game.sendTransition}
        onBadResponse={game.badResponse}
        onReload={game.reload}
        onEndGame={game.endGame}
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
  } else {
    screen = (
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

  return (
    <>
      {screen}
      <BurgerTransitionOverlay video={game.activeTransition} onEnd={game.clearTransition} />
      <BurgerBuzzFlash color={game.buzzFlash} />
    </>
  );
}
