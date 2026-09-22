import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocketContext } from '../contexts/SocketContext';

export default function useAuctionGame(currentUser) {
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
    socket.on('auction:lobbyState', onState);
    socket.on('auction:gameEnded', onEnded);
    return () => { socket.off('auction:lobbyState', onState); socket.off('auction:gameEnded', onEnded); };
  }, [socket]);

  const identity = () => ({ odId: currentUser?.id, pseudo: currentUser?.displayName || currentUser?.pseudo, avatar: currentUser?.avatar, avatarUrl: currentUser?.avatarUrl });
  const A = (event, extra = {}) => emitAck(event, { code: codeRef.current, odId: currentUser?.id, ...extra });

  const createLobby = useCallback(async () => { setLoading(true); const r = await emitAck('auction:createLobby', identity()); setLoading(false); if (r.success){setLobby(r.lobby);setIsHost(!!r.isHost);codeRef.current=r.lobby.code;} else setError(r.message); return r; /* eslint-disable-next-line */ }, [emitAck, currentUser]);
  const joinLobby = useCallback(async (code) => { setLoading(true); const r = await emitAck('auction:joinLobby', { code, ...identity() }); setLoading(false); if (r.success){setLobby(r.lobby);setIsHost(!!r.isHost);codeRef.current=r.lobby.code;} else setError(r.message); return r; /* eslint-disable-next-line */ }, [emitAck, currentUser]);
  const setConfig = useCallback((config) => A('auction:setConfig', { config }), [emitAck, currentUser]);
  const startGame = useCallback(() => A('auction:startGame'), [emitAck, currentUser]);
  const beginPlay = useCallback(() => A('auction:beginPlay'), [emitAck, currentUser]);
  const bid = useCallback((amount) => A('auction:bid', { amount }), [emitAck, currentUser]);
  const tieBid = useCallback((amount) => A('auction:tieBid', { amount }), [emitAck, currentUser]);
  const continueItem = useCallback(() => A('auction:continue'), [emitAck, currentUser]);
  const stopGame = useCallback(() => A('auction:stopGame'), [emitAck, currentUser]);
  const leaveLobby = useCallback(() => A('auction:leaveLobby'), [emitAck, currentUser]);

  return { lobby, isHost, error, loading, ended, createLobby, joinLobby, setConfig, startGame, beginPlay, bid, tieBid, continueItem, stopGame, leaveLobby, setError };
}
