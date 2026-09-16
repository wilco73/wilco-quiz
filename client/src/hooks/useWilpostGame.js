import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocketContext } from '../contexts/SocketContext';

export default function useWilpostGame(currentUser) {
  const { socket } = useSocketContext();
  const [lobby, setLobby] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ended, setEnded] = useState(false);
  const codeRef = useRef(null);

  const emitAck = useCallback((event, payload) => new Promise((resolve) => {
    if (!socket) return resolve({ success: false, message: 'Socket indisponible' });
    socket.emit(event, payload, (res) => resolve(res || { success: false }));
  }), [socket]);

  useEffect(() => {
    if (!socket) return;
    const onState = (state) => {
      if (codeRef.current && state?.code && state.code !== codeRef.current) return;
      setLobby(state); if (state?.code) codeRef.current = state.code;
    };
    const onEnded = (data) => {
      if (data?.code && codeRef.current && data.code !== codeRef.current) return;
      setEnded(true);
    };
    socket.on('wilpost:lobbyState', onState);
    socket.on('wilpost:gameEnded', onEnded);
    return () => { socket.off('wilpost:lobbyState', onState); socket.off('wilpost:gameEnded', onEnded); };
  }, [socket]);

  const identity = () => ({
    odId: currentUser?.id,
    pseudo: currentUser?.displayName || currentUser?.pseudo,
    avatar: currentUser?.avatar,
    avatarUrl: currentUser?.avatarUrl,
  });

  const createLobby = useCallback(async () => {
    setLoading(true);
    const res = await emitAck('wilpost:createLobby', identity());
    setLoading(false);
    if (res.success) { setLobby(res.lobby); setIsHost(!!res.isHost); codeRef.current = res.lobby.code; }
    else setError(res.message);
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emitAck, currentUser]);

  const joinLobby = useCallback(async (code) => {
    setLoading(true);
    const res = await emitAck('wilpost:joinLobby', { code, ...identity() });
    setLoading(false);
    if (res.success) { setLobby(res.lobby); setIsHost(!!res.isHost); codeRef.current = res.lobby.code; }
    else setError(res.message);
    return res;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emitAck, currentUser]);

  const beginRound = useCallback(() => emitAck('wilpost:beginRound', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const endTurn = useCallback(() => emitAck('wilpost:endTurn', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);

  const setOrder = useCallback((order) => emitAck('wilpost:setOrder', { code: codeRef.current, odId: currentUser?.id, order }), [emitAck, currentUser]);
  const setRoundDuration = useCallback((duration) => emitAck('wilpost:setRoundDuration', { code: codeRef.current, odId: currentUser?.id, duration }), [emitAck, currentUser]);
  const setWord = useCallback((word) => emitAck('wilpost:setWord', { code: codeRef.current, odId: currentUser?.id, word }), [emitAck, currentUser]);
  const startGame = useCallback(() => emitAck('wilpost:startGame', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const leaveLobby = useCallback(() => emitAck('wilpost:leaveLobby', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const stopGame = useCallback(() => emitAck('wilpost:stopGame', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const submitAnswer = useCallback((answer) => emitAck('wilpost:submitAnswer', { code: codeRef.current, odId: currentUser?.id, answer }), [emitAck, currentUser]);
  const vote = useCallback((v) => emitAck('wilpost:vote', { code: codeRef.current, odId: currentUser?.id, vote: v }), [emitAck, currentUser]);

  return { lobby, isHost, error, loading, ended, createLobby, joinLobby, setOrder, setRoundDuration, setWord, startGame, beginRound, endTurn, stopGame, submitAnswer, vote, leaveLobby, setError };
}
