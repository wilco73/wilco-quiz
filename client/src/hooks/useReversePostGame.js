import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocketContext } from '../contexts/SocketContext';

export default function useReversePostGame(currentUser) {
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
    const onState = (s) => { if (codeRef.current && s?.code && s.code !== codeRef.current) return; setLobby(s); if (s?.code) codeRef.current = s.code; };
    const onEnded = (d) => { if (d?.code && codeRef.current && d.code !== codeRef.current) return; setEnded(true); };
    socket.on('rpost:lobbyState', onState);
    socket.on('rpost:gameEnded', onEnded);
    return () => { socket.off('rpost:lobbyState', onState); socket.off('rpost:gameEnded', onEnded); };
  }, [socket]);

  const identity = () => ({ odId: currentUser?.id, pseudo: currentUser?.displayName || currentUser?.pseudo, avatar: currentUser?.avatar, avatarUrl: currentUser?.avatarUrl });
  const A = (event, extra = {}) => emitAck(event, { code: codeRef.current, odId: currentUser?.id, ...extra });

  const createLobby = useCallback(async () => { setLoading(true); const r = await emitAck('rpost:createLobby', identity()); setLoading(false); if (r.success) { setLobby(r.lobby); setIsHost(!!r.isHost); codeRef.current = r.lobby.code; } else setError(r.message); return r; /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [emitAck, currentUser]);
  const joinLobby = useCallback(async (code) => { setLoading(true); const r = await emitAck('rpost:joinLobby', { code, ...identity() }); setLoading(false); if (r.success) { setLobby(r.lobby); setIsHost(!!r.isHost); codeRef.current = r.lobby.code; } else setError(r.message); return r; /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [emitAck, currentUser]);

  /* eslint-disable react-hooks/exhaustive-deps */
  const setWord = useCallback((word, wordImage) => A('rpost:setWord', { word, wordImage }), [emitAck, currentUser]);
  const setConfig = useCallback((config) => A('rpost:setConfig', { config }), [emitAck, currentUser]);
  const startGame = useCallback(() => A('rpost:startGame'), [emitAck, currentUser]);
  const begin = useCallback(() => A('rpost:begin'), [emitAck, currentUser]);
  const askQuestion = useCallback((targetId) => A('rpost:askQuestion', { targetId }), [emitAck, currentUser]);
  const submitGuess = useCallback((targetId, answer) => A('rpost:submitGuess', { targetId, answer }), [emitAck, currentUser]);
  const cancelGuess = useCallback(() => A('rpost:cancelGuess'), [emitAck, currentUser]);
  const validateGuess = useCallback((correct) => A('rpost:validateGuess', { correct }), [emitAck, currentUser]);
  const endTurn = useCallback(() => A('rpost:endTurn'), [emitAck, currentUser]);
  const endGame = useCallback(() => A('rpost:endGame'), [emitAck, currentUser]);
  const stopGame = useCallback(() => A('rpost:stopGame'), [emitAck, currentUser]);
  const leaveLobby = useCallback(() => A('rpost:leaveLobby'), [emitAck, currentUser]);
  /* eslint-enable react-hooks/exhaustive-deps */

  return {
    lobby, isHost, error, loading, ended,
    createLobby, joinLobby, setWord, setConfig, startGame, begin,
    askQuestion, submitGuess, cancelGuess, validateGuess, endTurn, endGame, stopGame, leaveLobby, setError,
  };
}
