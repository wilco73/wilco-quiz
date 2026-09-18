import { useState, useEffect, useCallback, useRef } from 'react';
import { useSocketContext } from '../contexts/SocketContext';

// Petit bip de secours si aucun son n'est configuré (found = aigu, trap = grave)
function beep(type) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = new AC(); const o = ctx.createOscillator(); const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = 'square'; o.frequency.value = type === 'found' ? 880 : 200;
    g.gain.setValueAtTime(0.15, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    o.start(); o.stop(ctx.currentTime + 0.4);
  } catch (e) {}
}

export default function usePitchGame(currentUser) {
  const { socket } = useSocketContext();
  const [lobby, setLobby] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ended, setEnded] = useState(false);
  const codeRef = useRef(null);
  const soundsRef = useRef({ found: null, trap: null });

  useEffect(() => { soundsRef.current = { found: lobby?.soundFound || null, trap: lobby?.soundTrap || null }; }, [lobby?.soundFound, lobby?.soundTrap]);

  const emitAck = useCallback((event, payload) => new Promise((resolve) => {
    if (!socket) return resolve({ success: false, message: 'Socket indisponible' });
    socket.emit(event, payload, (res) => resolve(res || { success: false }));
  }), [socket]);

  useEffect(() => {
    if (!socket) return;
    const onState = (s) => { if (codeRef.current && s?.code && s.code !== codeRef.current) return; setLobby(s); if (s?.code) codeRef.current = s.code; };
    const onEnded = (d) => { if (d?.code && codeRef.current && d.code !== codeRef.current) return; setEnded(true); };
    const onBuzz = ({ type }) => {
      const url = type === 'found' ? soundsRef.current.found : (type === 'trapped' ? soundsRef.current.trap : null);
      if (url) { try { new Audio(url).play().catch(() => {}); } catch (e) { beep(type === 'found' ? 'found' : 'trap'); } }
      else if (type !== 'timeout') beep(type === 'found' ? 'found' : 'trap');
    };
    socket.on('pitch:lobbyState', onState);
    socket.on('pitch:gameEnded', onEnded);
    socket.on('pitch:buzz', onBuzz);
    return () => { socket.off('pitch:lobbyState', onState); socket.off('pitch:gameEnded', onEnded); socket.off('pitch:buzz', onBuzz); };
  }, [socket]);

  const identity = () => ({ odId: currentUser?.id, pseudo: currentUser?.displayName || currentUser?.pseudo, avatar: currentUser?.avatar, avatarUrl: currentUser?.avatarUrl });
  const A = (event, extra = {}) => emitAck(event, { code: codeRef.current, odId: currentUser?.id, ...extra });

  const createLobby = useCallback(async () => { setLoading(true); const r = await emitAck('pitch:createLobby', identity()); setLoading(false); if (r.success){setLobby(r.lobby);setIsHost(!!r.isHost);codeRef.current=r.lobby.code;} else setError(r.message); return r; /* eslint-disable-next-line */ }, [emitAck, currentUser]);
  const joinLobby = useCallback(async (code) => { setLoading(true); const r = await emitAck('pitch:joinLobby', { code, ...identity() }); setLoading(false); if (r.success){setLobby(r.lobby);setIsHost(!!r.isHost);codeRef.current=r.lobby.code;} else setError(r.message); return r; /* eslint-disable-next-line */ }, [emitAck, currentUser]);

  const chooseTeam = useCallback((team) => A('pitch:chooseTeam', { team }), [emitAck, currentUser]);
  const shuffleTeams = useCallback(() => A('pitch:shuffleTeams'), [emitAck, currentUser]);
  const setConfig = useCallback((config) => A('pitch:setConfig', { config }), [emitAck, currentUser]);
  const addCustomWord = useCallback((word) => A('pitch:addCustomWord', { word }), [emitAck, currentUser]);
  const removeCustomWord = useCallback((index) => A('pitch:removeCustomWord', { index }), [emitAck, currentUser]);
  const startGame = useCallback(() => A('pitch:startGame'), [emitAck, currentUser]);
  const beginPlay = useCallback(() => A('pitch:beginPlay'), [emitAck, currentUser]);
  const addTrap = useCallback((word) => A('pitch:addTrap', { word }), [emitAck, currentUser]);
  const removeTrap = useCallback((index) => A('pitch:removeTrap', { index }), [emitAck, currentUser]);
  const lockTraps = useCallback(() => A('pitch:lockTraps'), [emitAck, currentUser]);
  const buzzFound = useCallback(() => A('pitch:buzzFound'), [emitAck, currentUser]);
  const buzzTrap = useCallback((index) => A('pitch:buzzTrap', { index }), [emitAck, currentUser]);
  const continueWord = useCallback(() => A('pitch:continueWord'), [emitAck, currentUser]);
  const stopGame = useCallback(() => A('pitch:stopGame'), [emitAck, currentUser]);
  const leaveLobby = useCallback(() => A('pitch:leaveLobby'), [emitAck, currentUser]);

  return { lobby, isHost, error, loading, ended, createLobby, joinLobby, chooseTeam, shuffleTeams, setConfig, addCustomWord, removeCustomWord, startGame, beginPlay, addTrap, removeTrap, lockTraps, buzzFound, buzzTrap, continueWord, stopGame, leaveLobby, setError };
}
