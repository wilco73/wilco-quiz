import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocketContext } from '../contexts/SocketContext';

/**
 * useBurgerGame - état temps réel d'une partie "Burger Quiz".
 * Étape 1 : lobby + choix d'équipe. (Buzzer/points/transitions viendront s'ajouter ici.)
 */
export default function useBurgerGame(currentUser) {
  const { socket } = useSocketContext();
  const [lobby, setLobby] = useState(null);
  const [isAnimator, setIsAnimator] = useState(false);
  const [isSpectator, setIsSpectator] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTransition, setActiveTransition] = useState(null);
  const [ended, setEnded] = useState(false);
  const codeRef = useRef(null);

  // Écoute l'état du lobby diffusé par le serveur
  useEffect(() => {
    if (!socket) return;
    const onState = (state) => { setLobby(state); if (state?.code) codeRef.current = state.code; };
    const onBuzzed = () => { try { new Audio('/resources/burger/sounds/buzz.mp3').play().catch(() => {}); } catch (e) {} };
    const onTransition = ({ video }) => setActiveTransition(video || null);
    const onBad = () => { try { new Audio('/resources/burger/sounds/burger-sound-buzz-1.mp3').play().catch(() => {}); } catch (e) {} };
    const onEnded = () => setEnded(true);
    socket.on('burger:lobbyState', onState);
    socket.on('burger:buzzed', onBuzzed);
    socket.on('burger:playTransition', onTransition);
    socket.on('burger:badResponse', onBad);
    socket.on('burger:gameEnded', onEnded);
    return () => {
      socket.off('burger:lobbyState', onState);
      socket.off('burger:buzzed', onBuzzed);
      socket.off('burger:playTransition', onTransition);
      socket.off('burger:badResponse', onBad);
      socket.off('burger:gameEnded', onEnded);
    };
  }, [socket]);

  const emitAck = useCallback((event, payload, timeoutMs = 8000) => {
    return new Promise((resolve) => {
      if (!socket) return resolve({ success: false, message: 'Socket indisponible' });
      let settled = false;
      const timer = setTimeout(() => { if (!settled) { settled = true; resolve({ success: false, message: 'timeout' }); } }, timeoutMs);
      socket.emit(event, payload, (res) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(res || { success: false });
      });
    });
  }, [socket]);

  const createLobby = useCallback(async ({ teams, maxPerTeam } = {}) => {
    setLoading(true); setError(null);
    const res = await emitAck('burger:createLobby', {
      odId: currentUser?.id, pseudo: currentUser?.pseudo, teams, maxPerTeam,
    });
    setLoading(false);
    if (res.success) {
      setLobby(res.lobby);
      setIsAnimator(true);
      codeRef.current = res.lobby.code;
    } else setError(res.message || 'Erreur création');
    return res;
  }, [emitAck, currentUser]);

  const joinLobby = useCallback(async (code) => {
    setLoading(true); setError(null);
    const res = await emitAck('burger:joinLobby', {
      code, odId: currentUser?.id, pseudo: currentUser?.pseudo, avatar: currentUser?.avatar,
    });
    setLoading(false);
    if (res.success) {
      setLobby(res.lobby);
      setIsAnimator(!!res.isAnimator);
      setIsSpectator(!!res.spectator);
      codeRef.current = res.lobby.code;
    } else setError(res.message || 'Partie introuvable');
    return res;
  }, [emitAck, currentUser]);

  const startGame = useCallback(() => emitAck('burger:start', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const lockBuzzers = useCallback(() => emitAck('burger:lockBuzzers', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const unlockBuzzers = useCallback(() => emitAck('burger:unlockBuzzers', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const buzz = useCallback(() => emitAck('burger:buzz', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const addPoint = useCallback((team, delta) => emitAck('burger:addPoint', { code: codeRef.current, odId: currentUser?.id, team, delta }), [emitAck, currentUser]);
  const sendTransition = useCallback((video) => emitAck('burger:transition', { code: codeRef.current, odId: currentUser?.id, video }), [emitAck, currentUser]);
  const badResponse = useCallback(() => emitAck('burger:badResponse', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const reload = useCallback(() => emitAck('burger:reload', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const clearTransition = useCallback(() => setActiveTransition(null), []);
  const chooseTeam = useCallback(async (team) => {
    const code = codeRef.current;
    if (!code) return { success: false };
    return emitAck('burger:chooseTeam', { code, odId: currentUser?.id, team });
  }, [emitAck, currentUser]);

  const refreshState = useCallback(async (code) => {
    const res = await emitAck('burger:getState', { code: code || codeRef.current });
    if (res.success) setLobby(res.lobby);
    return res;
  }, [emitAck]);

  const leaveLobby = useCallback(async () => {
    const code = codeRef.current;
    if (code) await emitAck('burger:leaveLobby', { code, odId: currentUser?.id });
    setLobby(null); setIsAnimator(false); codeRef.current = null;
  }, [emitAck, currentUser]);

  // Mon équipe actuelle
  const myPlayer = lobby?.players?.find((p) => p.odId === currentUser?.id) || null;

  const endGame = useCallback(() => emitAck('burger:endGame', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);

  return {
    lobby, isAnimator, isSpectator, error, loading, myPlayer,
    createLobby, joinLobby, chooseTeam, refreshState, leaveLobby, setError,
    startGame, lockBuzzers, unlockBuzzers, buzz, addPoint,
    sendTransition, badResponse, reload, activeTransition, clearTransition,
    ended, endGame,
  };
}
