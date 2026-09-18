import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocketContext } from '../contexts/SocketContext';

export default function useMajorityGame(currentUser) {
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
    socket.on('majority:lobbyState', onState);
    socket.on('majority:gameEnded', onEnded);
    return () => { socket.off('majority:lobbyState', onState); socket.off('majority:gameEnded', onEnded); };
  }, [socket]);

  const identity = () => ({ odId: currentUser?.id, pseudo: currentUser?.displayName || currentUser?.pseudo, avatar: currentUser?.avatar, avatarUrl: currentUser?.avatarUrl });
  const A = (event, extra = {}) => emitAck(event, { code: codeRef.current, odId: currentUser?.id, ...extra });

  const createLobby = useCallback(async () => { setLoading(true); const r = await emitAck('majority:createLobby', identity()); setLoading(false); if (r.success){setLobby(r.lobby);setIsHost(!!r.isHost);codeRef.current=r.lobby.code;} else setError(r.message); return r; /* eslint-disable-next-line */ }, [emitAck, currentUser]);
  const joinLobby = useCallback(async (code) => { setLoading(true); const r = await emitAck('majority:joinLobby', { code, ...identity() }); setLoading(false); if (r.success){setLobby(r.lobby);setIsHost(!!r.isHost);codeRef.current=r.lobby.code;} else setError(r.message); return r; /* eslint-disable-next-line */ }, [emitAck, currentUser]);
  const setConfig = useCallback((config) => A('majority:setConfig', { config }), [emitAck, currentUser]);
  const startGame = useCallback(() => A('majority:startGame'), [emitAck, currentUser]);
  const setQuestion = useCallback((question) => A('majority:setQuestion', { question }), [emitAck, currentUser]);
  const answer = useCallback((ans) => A('majority:answer', { answer: ans }), [emitAck, currentUser]);
  const continueRound = useCallback(() => A('majority:continue'), [emitAck, currentUser]);
  const stopGame = useCallback(() => A('majority:stopGame'), [emitAck, currentUser]);
  const leaveLobby = useCallback(() => A('majority:leaveLobby'), [emitAck, currentUser]);
  const mergeGroups = useCallback((from, to) => A('majority:mergeGroups', { from, to }), [emitAck, currentUser]);
  const resetMerges = useCallback(() => A('majority:resetMerges', {}), [emitAck, currentUser]);

  return { lobby, isHost, error, loading, ended, createLobby, joinLobby, setConfig, startGame, setQuestion, answer, continueRound, mergeGroups, resetMerges, stopGame, leaveLobby, setError };
}
