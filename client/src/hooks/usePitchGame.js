import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocketContext } from '../contexts/SocketContext';

export default function usePitchGame(currentUser) {
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
    socket.on('pitch:lobbyState', onState);
    socket.on('pitch:gameEnded', onEnded);
    return () => { socket.off('pitch:lobbyState', onState); socket.off('pitch:gameEnded', onEnded); };
  }, [socket]);

  const identity = () => ({ odId: currentUser?.id, pseudo: currentUser?.displayName || currentUser?.pseudo, avatar: currentUser?.avatar, avatarUrl: currentUser?.avatarUrl });

  const createLobby = useCallback(async () => { setLoading(true); const r = await emitAck('pitch:createLobby', identity()); setLoading(false); if (r.success){setLobby(r.lobby);setIsHost(!!r.isHost);codeRef.current=r.lobby.code;} else setError(r.message); return r; /* eslint-disable-next-line */ }, [emitAck, currentUser]);
  const joinLobby = useCallback(async (code) => { setLoading(true); const r = await emitAck('pitch:joinLobby', { code, ...identity() }); setLoading(false); if (r.success){setLobby(r.lobby);setIsHost(!!r.isHost);codeRef.current=r.lobby.code;} else setError(r.message); return r; /* eslint-disable-next-line */ }, [emitAck, currentUser]);
  const chooseTeam = useCallback((team) => emitAck('pitch:chooseTeam', { code: codeRef.current, odId: currentUser?.id, team }), [emitAck, currentUser]);
  const shuffleTeams = useCallback(() => emitAck('pitch:shuffleTeams', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const setConfig = useCallback((config) => emitAck('pitch:setConfig', { code: codeRef.current, odId: currentUser?.id, config }), [emitAck, currentUser]);
  const addCustomWord = useCallback((word) => emitAck('pitch:addCustomWord', { code: codeRef.current, odId: currentUser?.id, word }), [emitAck, currentUser]);
  const removeCustomWord = useCallback((index) => emitAck('pitch:removeCustomWord', { code: codeRef.current, odId: currentUser?.id, index }), [emitAck, currentUser]);
  const startGame = useCallback(() => emitAck('pitch:startGame', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const stopGame = useCallback(() => emitAck('pitch:stopGame', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const leaveLobby = useCallback(() => emitAck('pitch:leaveLobby', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);

  return { lobby, isHost, error, loading, ended, createLobby, joinLobby, chooseTeam, shuffleTeams, setConfig, addCustomWord, removeCustomWord, startGame, stopGame, leaveLobby, setError };
}
