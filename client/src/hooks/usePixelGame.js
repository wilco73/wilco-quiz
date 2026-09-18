import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocketContext } from '../contexts/SocketContext';

export default function usePixelGame(currentUser) {
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
    socket.on('pixel:lobbyState', onState);
    socket.on('pixel:gameEnded', onEnded);
    return () => { socket.off('pixel:lobbyState', onState); socket.off('pixel:gameEnded', onEnded); };
  }, [socket]);

  const identity = () => ({ odId: currentUser?.id, pseudo: currentUser?.displayName || currentUser?.pseudo, avatar: currentUser?.avatar, avatarUrl: currentUser?.avatarUrl });

  const createLobby = useCallback(async () => { setLoading(true); const r = await emitAck('pixel:createLobby', identity()); setLoading(false); if (r.success){setLobby(r.lobby);setIsHost(!!r.isHost);codeRef.current=r.lobby.code;} else setError(r.message); return r; /* eslint-disable-next-line */ }, [emitAck, currentUser]);
  const joinLobby = useCallback(async (code) => { setLoading(true); const r = await emitAck('pixel:joinLobby', { code, ...identity() }); setLoading(false); if (r.success){setLobby(r.lobby);setIsHost(!!r.isHost);codeRef.current=r.lobby.code;} else setError(r.message); return r; /* eslint-disable-next-line */ }, [emitAck, currentUser]);
  const setConfig = useCallback((config) => emitAck('pixel:setConfig', { code: codeRef.current, odId: currentUser?.id, config }), [emitAck, currentUser]);
  const startGame = useCallback(() => emitAck('pixel:startGame', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const stopGame = useCallback(() => emitAck('pixel:stopGame', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const leaveLobby = useCallback(() => emitAck('pixel:leaveLobby', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const paintCell = useCallback((index, color) => { if (socket) socket.emit('pixel:paintCell', { code: codeRef.current, odId: currentUser?.id, index, color }); }, [socket, currentUser]);
  const clearGrid = useCallback(() => emitAck('pixel:clearGrid', { code: codeRef.current, odId: currentUser?.id }), [emitAck, currentUser]);
  const fillArea = useCallback((index, color) => { if (socket) socket.emit('pixel:fillArea', { code: codeRef.current, odId: currentUser?.id, index, color }); }, [socket, currentUser]);
  const fillAll = useCallback((color) => { if (socket) socket.emit('pixel:fillAll', { code: codeRef.current, odId: currentUser?.id, color }); }, [socket, currentUser]);

  return { lobby, isHost, error, loading, ended, createLobby, joinLobby, setConfig, startGame, stopGame, leaveLobby, paintCell, clearGrid, setError };
}
