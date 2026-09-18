import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocketContext } from '../contexts/SocketContext';

export default function useImpostorGame(currentUser) {
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
    socket.on('impostor:lobbyState', onState);
    socket.on('impostor:gameEnded', onEnded);
    return () => { socket.off('impostor:lobbyState', onState); socket.off('impostor:gameEnded', onEnded); };
  }, [socket]);

  const identity = () => ({ odId: currentUser?.id, pseudo: currentUser?.displayName || currentUser?.pseudo, avatar: currentUser?.avatar, avatarUrl: currentUser?.avatarUrl });

  const createLobby = useCallback(async () => { setLoading(true); const r = await emitAck('impostor:createLobby', identity()); setLoading(false); if (r.success){setLobby(r.lobby);setIsHost(!!r.isHost);codeRef.current=r.lobby.code;} else setError(r.message); return r; /* eslint-disable-next-line */ }, [emitAck, currentUser]);
  const joinLobby = useCallback(async (code) => { setLoading(true); const r = await emitAck('impostor:joinLobby', { code, ...identity() }); setLoading(false); if (r.success){setLobby(r.lobby);setIsHost(!!r.isHost);codeRef.current=r.lobby.code;} else setError(r.message); return r; /* eslint-disable-next-line */ }, [emitAck, currentUser]);
  const setConfig = useCallback((config) => emitAck('impostor:setConfig', { code: codeRef.current, odId: currentUser?.id, config }), [emitAck, currentUser]);
  const addCustomWord = useCallback((word, theme) => emitAck('impostor:addCustomWord', { code: codeRef.current, odId: currentUser?.id, word, theme }), [emitAck, currentUser]);
  const removeCustomWord = useCallback((index) => emitAck('impostor:removeCustomWord', { code: codeRef.current, odId: currentUser?.id, index }), [emitAck, currentUser]);
  const startGame = useCallback(() => emitAck('impostor:startGame', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const stopGame = useCallback(() => emitAck('impostor:stopGame', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const leaveLobby = useCallback(() => emitAck('impostor:leaveLobby', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const beginClues = useCallback(() => emitAck('impostor:beginClues', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const submitClue = useCallback((word) => emitAck('impostor:submitClue', { code: codeRef.current, odId: currentUser?.id, word }), [emitAck, currentUser]);
  const vote = useCallback((targetId) => emitAck('impostor:vote', { code: codeRef.current, odId: currentUser?.id, targetId }), [emitAck, currentUser]);
  const submitGuess = useCallback((answer) => emitAck('impostor:submitGuess', { code: codeRef.current, odId: currentUser?.id, answer }), [emitAck, currentUser]);
  const voteGuess = useCallback((v) => emitAck('impostor:voteGuess', { code: codeRef.current, odId: currentUser?.id, vote: v }), [emitAck, currentUser]);
  

  return { lobby, isHost, error, loading, ended, createLobby, joinLobby, setConfig, addCustomWord, removeCustomWord, startGame, beginClues, submitClue, vote, submitGuess, voteGuess, stopGame, leaveLobby, setError };
}
