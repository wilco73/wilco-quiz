import React, { useEffect, useRef, useState } from 'react';
import { useSocketContext } from '../contexts/SocketContext';
import useBurgerGame from '../hooks/useBurgerGame';
import BurgerCreateConfig from './BurgerCreateConfig';
import BurgerTeamChoice from './BurgerTeamChoice';
import BurgerBuzzer from './BurgerBuzzer';
import BurgerScoreboard from './BurgerScoreboard';
import BurgerTransitionOverlay from './BurgerTransitionOverlay';
import BurgerBuzzFlash from './BurgerBuzzFlash';
import BroadcastPanel from './BroadcastPanel';
import BroadcastModal, { BroadcastReviewButton, useBroadcastReceiver } from './BroadcastModal';

/**
 * BurgerGameContainer - point d'entrée du mode Burger Quiz.
 */
export default function BurgerGameContainer({ currentUser, entry, joinCode, onExit }) {
  const game = useBurgerGame(currentUser);
  const { socket: rawSocket } = useSocketContext();
  const started = useRef(false);
  const [fatal, setFatal] = useState(null);
  const [showBroadcastPanel, setShowBroadcastPanel] = useState(false);

  // Réception des médias envoyés par l'animateur (+ "revoir le dernier")
  const { currentBroadcast, lastBroadcast, hasUnread, closeBroadcast, reviewLastBroadcast } = useBroadcastReceiver(rawSocket);

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

  // Overlays communs (médias reçus + revoir + flash de buzz)
  const overlays = game.lobby ? (
    <>
      {game.isAnimator && (
        <BroadcastPanel
          isOpen={showBroadcastPanel}
          onClose={() => setShowBroadcastPanel(false)}
          currentLobbyId={game.lobby.code}
          currentLobbyType="burger"
          gridId={null}
          senderId={currentUser?.id}
          senderPseudo={currentUser?.pseudo}
        />
      )}
      {currentBroadcast && <BroadcastModal broadcast={currentBroadcast} onClose={closeBroadcast} />}
      <BroadcastReviewButton lastBroadcast={lastBroadcast} hasUnread={hasUnread} onClick={reviewLastBroadcast} />
      <BurgerTransitionOverlay video={game.activeTransition} onEnd={game.clearTransition} />
      <BurgerBuzzFlash color={game.buzzFlash} />
    </>
  ) : null;

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

  if (entry === 'create' && !game.lobby) {
    return <BurgerCreateConfig onCreate={handleConfirmCreate} onBack={onExit} loading={game.loading} />;
  }

  if (!game.lobby) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-gray-900 text-white">
        <p className="animate-pulse">Connexion à la partie…</p>
      </div>
    );
  }

  // Spectateur : partie en cours sans équipe -> lecture seule
  if (game.isSpectator) {
    return (
      <>
        <BurgerScoreboard lobby={game.lobby} readOnly onBack={handleExit} />
        {overlays}
      </>
    );
  }

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
        onSendMedia={() => setShowBroadcastPanel(true)}
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
      {overlays}
    </>
  );
}
