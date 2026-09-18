/**
 * Match de Pitch (Trapwords) — 2 équipes, bouton PIÈGE. État EN MÉMOIRE par lobby.
 * Phase 1 : lobby + config. Phase 2 : pose des pièges -> devinette (timers) -> buzzers Trouvé/PIÈGE -> reveal.
 * Masquage par socket : le devineur ne voit pas le mot ; seule l'équipe piège voit les pièges (avant reveal).
 */
const db = require('../database');

const pitchLobbies = new Map();
const MIN_PLAYERS = 4;
const TEAMS = [
  { id: 'red', name: 'Rouge', color: '#E53935' },
  { id: 'blue', name: 'Bleu', color: '#1E88E5' },
];
const other = (t) => (t === 'red' ? 'blue' : 'red');

function generateCode() { let c; do { c = Math.floor(1000 + Math.random() * 9000).toString(); } while (pitchLobbies.has(c)); return c; }
function room(code) { return `pitch:${code}`; }
function isHost(l, odId) { return l && l.hostId === odId; }
function teamMembers(l, teamId) { return l.order.filter((id) => l.players[id].team === teamId); }
function pseudoOf(l, id) { return l.players[id]?.pseudo || '?'; }

async function pickWord(l) {
  let bank = []; try { const w = await db.getRandomPitchWord(l.theme); if (w) bank = [w]; } catch (e) {}
  const all = [...(l.customWords || []), ...bank];
  const fresh = all.filter((w) => !l.usedWords.includes(w.toLowerCase()));
  const list = fresh.length ? fresh : all;
  const w = list.length ? list[Math.floor(Math.random() * list.length)] : 'Mystère';
  l.usedWords.push(w.toLowerCase());
  return w;
}

function publicLobby(l, viewerOdId) {
  const viewer = l.players[viewerOdId];
  const isGuesser = viewerOdId === l.guesserId;
  const isTrap = viewer && l.trapTeam && viewer.team === l.trapTeam;
  const isActive = viewer && l.activeTeam && viewer.team === l.activeTeam;
  const inPlay = l.phase === 'trap' || l.phase === 'guess';
  const showWord = l.phase === 'reveal' || (isTrap && inPlay) || (isActive && !isGuesser && l.phase === 'guess');
  const showTraps = l.phase === 'reveal' || (isTrap && inPlay);
  return {
    code: l.code, hostId: l.hostId, status: l.status, phase: l.phase || null,
    teams: TEAMS, minPlayers: MIN_PLAYERS,
    trapCount: l.trapCount, trapTime: l.trapTime, wordsPerTeam: l.wordsPerTeam, guessTime: l.guessTime,
    soundFound: l.soundFound || null, soundTrap: l.soundTrap || null,
    themes: l.themes || [], theme: l.theme || null, customWords: l.customWords || [],
    scores: l.scores || { red: 0, blue: 0 },
    players: l.order.map((id) => { const p = l.players[id]; return { odId: p.odId, pseudo: p.pseudo, avatar: p.avatar, avatarUrl: p.avatarUrl || null, team: p.team || null }; }),
    teamCounts: { red: teamMembers(l, 'red').length, blue: teamMembers(l, 'blue').length },
    // Déroulé
    wordNumber: (l.currentWordIndex || 0) + 1, totalWords: 2 * l.wordsPerTeam,
    activeTeam: l.activeTeam || null, trapTeam: l.trapTeam || null,
    guesserId: l.guesserId || null, guesserPseudo: l.guesserId ? pseudoOf(l, l.guesserId) : null,
    isGuesser, roleTeam: viewer?.team || null,
    secretWord: showWord ? l.secretWord : null,
    traps: showTraps ? l.traps : null,
    trapsPlaced: l.traps ? l.traps.length : 0,
    trapsLocked: !!l.trapsLocked,
    trapRemainingMs: (l.phase === 'trap' && l.trapEndsAt) ? Math.max(0, l.trapEndsAt - Date.now()) : null,
    guessRemainingMs: (l.phase === 'guess' && l.guessEndsAt) ? Math.max(0, l.guessEndsAt - Date.now()) : null,
    result: l.phase === 'reveal' ? l.result : null,
  };
}
async function broadcast(io, l) { try { const sockets = await io.in(room(l.code)).fetchSockets(); for (const s of sockets) s.emit('pitch:lobbyState', publicLobby(l, l.socketToPlayer?.[s.id] || null)); } catch (e) { console.error('[PITCH] broadcast:', e.message); } }
function clearT(l) { if (l.timer) { clearTimeout(l.timer); l.timer = null; } }

async function startWord(io, l) {
  clearT(l);
  l.activeTeam = (l.currentWordIndex % 2 === 0) ? l.startTeam : other(l.startTeam);
  l.trapTeam = other(l.activeTeam);
  const members = teamMembers(l, l.activeTeam);
  l.guesserId = members[l.guesserPtr[l.activeTeam] % members.length];
  l.guesserPtr[l.activeTeam] += 1;
  l.secretWord = await pickWord(l);
  l.traps = []; l.trapsLocked = false; l.result = null;
  l.phase = 'trap';
  l.trapEndsAt = Date.now() + l.trapTime * 1000;
  l.timer = setTimeout(() => startGuess(io, l), l.trapTime * 1000);
  broadcast(io, l);
}
function startGuess(io, l) {
  clearT(l);
  l.trapsLocked = true; l.phase = 'guess';
  l.guessEndsAt = Date.now() + l.guessTime * 1000;
  l.timer = setTimeout(() => endWord(io, l, { type: 'timeout' }), l.guessTime * 1000);
  broadcast(io, l);
}
function endWord(io, l, result) {
  clearT(l);
  if (result.type === 'found') l.scores[l.activeTeam] += 1;
  if (result.type === 'trapped') l.scores[l.trapTeam] += 1;
  result.word = l.secretWord; result.traps = l.traps; result.activeTeam = l.activeTeam; result.trapTeam = l.trapTeam;
  l.result = result; l.phase = 'reveal'; l.guessEndsAt = null;
  io.to(room(l.code)).emit('pitch:buzz', { type: result.type }); // déclenche le son
  broadcast(io, l);
}
function continueWord(io, l) {
  l.currentWordIndex += 1;
  if (l.currentWordIndex >= 2 * l.wordsPerTeam) { l.phase = 'finished'; clearT(l); broadcast(io, l); return; }
  startWord(io, l);
}

function register(socket, io) {
  const mapSocket = (l, odId) => { if (!l.socketToPlayer) l.socketToPlayer = {}; l.socketToPlayer[socket.id] = odId; };
  const get = (data) => pitchLobbies.get(String(data?.code || '').trim());

  socket.on('pitch:createLobby', async (data, cb) => {
    try {
      const { odId, pseudo, avatar, avatarUrl } = data || {};
      if (!odId) return cb?.({ success: false, message: 'Utilisateur invalide' });
      for (const [c, l] of pitchLobbies) { if (l.hostId === odId) { socket.to(room(c)).emit('pitch:gameEnded', { code: c }); clearT(l); pitchLobbies.delete(c); } }
      let soundFound = null, soundTrap = null, themes = [];
      try { soundFound = await db.getAppSetting('pitch_sound_found'); } catch (e) {}
      try { soundTrap = await db.getAppSetting('pitch_sound_trap'); } catch (e) {}
      try { themes = await db.getPitchThemes(); } catch (e) {}
      const code = generateCode();
      const lobby = { code, hostId: odId, status: 'waiting', phase: null, trapCount: 3, trapTime: 45, wordsPerTeam: 5, guessTime: 90, soundFound, soundTrap, theme: null, themes, customWords: [], scores: { red: 0, blue: 0 }, players: { [odId]: { odId, pseudo, avatar, avatarUrl: avatarUrl || null, team: null } }, order: [odId], socketToPlayer: {}, createdAt: Date.now() };
      pitchLobbies.set(code, lobby); socket.join(room(code)); mapSocket(lobby, odId);
      cb?.({ success: true, code, lobby: publicLobby(lobby, odId), isHost: true });
    } catch (e) { console.error('[PITCH] create:', e); cb?.({ success: false, message: e.message }); }
  });

  socket.on('pitch:joinLobby', (data, cb) => {
    try {
      const { code, odId, pseudo, avatar, avatarUrl } = data || {};
      const l = pitchLobbies.get(String(code || '').trim());
      if (!l) return cb?.({ success: false, message: 'Partie introuvable' });
      if (!odId) return cb?.({ success: false, message: 'Utilisateur invalide' });
      const host = isHost(l, odId); const existing = l.players[odId]; let spectator = false;
      if (!host) { if (l.status === 'waiting') { if (!existing) { l.players[odId] = { odId, pseudo, avatar, avatarUrl: avatarUrl || null, team: null }; l.order.push(odId); } } else spectator = !(existing && existing.team); }
      socket.join(room(code)); mapSocket(l, odId); broadcast(io, l);
      cb?.({ success: true, lobby: publicLobby(l, odId), isHost: host, spectator });
    } catch (e) { console.error('[PITCH] join:', e); cb?.({ success: false, message: e.message }); }
  });

  socket.on('pitch:getState', (data, cb) => { const l = get(data); if (!l) return cb?.({ success: false, message: 'Partie introuvable' }); socket.join(room(l.code)); mapSocket(l, data?.odId); cb?.({ success: true, lobby: publicLobby(l, data?.odId) }); });

  socket.on('pitch:chooseTeam', (data, cb) => { const l = get(data); if (!l || l.status !== 'waiting') return cb?.({ success: false }); const p = l.players[data?.odId]; if (!p) return cb?.({ success: false }); const t = data.team; if (t !== null && !TEAMS.find((x) => x.id === t)) return cb?.({ success: false }); p.team = t || null; broadcast(io, l); cb?.({ success: true }); });

  socket.on('pitch:shuffleTeams', (data, cb) => { const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" }); if (l.status !== 'waiting') return cb?.({ success: false }); const ids = [...l.order]; for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; } ids.forEach((id, i) => { l.players[id].team = i % 2 === 0 ? 'red' : 'blue'; }); broadcast(io, l); cb?.({ success: true }); });

  socket.on('pitch:setConfig', (data, cb) => {
    const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (l.status !== 'waiting') return cb?.({ success: false });
    const c = data.config || {};
    if (Number.isInteger(c.trapCount)) l.trapCount = Math.max(1, Math.min(8, c.trapCount));
    if (Number.isInteger(c.trapTime)) l.trapTime = Math.max(15, Math.min(180, c.trapTime));
    if (Number.isInteger(c.wordsPerTeam)) l.wordsPerTeam = Math.max(1, Math.min(20, c.wordsPerTeam));
    if (Number.isInteger(c.guessTime)) l.guessTime = Math.max(30, Math.min(300, c.guessTime));
    if ('theme' in c) l.theme = c.theme || null;
    if ('soundFound' in c) l.soundFound = (c.soundFound || '').trim() || null;
    if ('soundTrap' in c) l.soundTrap = (c.soundTrap || '').trim() || null;
    broadcast(io, l); cb?.({ success: true });
  });

  socket.on('pitch:addCustomWord', (data, cb) => { const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false }); const w = (data.word || '').trim(); if (!w) return cb?.({ success: false }); l.customWords.push(w); broadcast(io, l); cb?.({ success: true }); });
  socket.on('pitch:removeCustomWord', (data, cb) => { const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false }); if (Number.isInteger(data.index)) l.customWords.splice(data.index, 1); broadcast(io, l); cb?.({ success: true }); });

  socket.on('pitch:leaveLobby', (data, cb) => { const l = get(data); if (l) { const { odId } = data; if (l.socketToPlayer) delete l.socketToPlayer[socket.id]; if (l.players[odId] && l.status === 'waiting') { delete l.players[odId]; l.order = l.order.filter((id) => id !== odId); if (odId === l.hostId) { if (l.order.length) l.hostId = l.order[0]; else { clearT(l); pitchLobbies.delete(l.code); socket.leave(room(l.code)); return cb?.({ success: true }); } } broadcast(io, l); } socket.leave(room(l.code)); } cb?.({ success: true }); });
  socket.on('pitch:stopGame', (data, cb) => { const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" }); io.to(room(l.code)).emit('pitch:gameEnded', { code: l.code }); clearT(l); pitchLobbies.delete(l.code); cb?.({ success: true }); });

  socket.on('pitch:startGame', (data, cb) => {
    const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (teamMembers(l, 'red').length < 2 || teamMembers(l, 'blue').length < 2) return cb?.({ success: false, message: 'Il faut au moins 2 joueurs par équipe' });
    l.status = 'playing'; l.phase = 'intro'; l.scores = { red: 0, blue: 0 };
    l.startTeam = Math.random() < 0.5 ? 'red' : 'blue'; l.guesserPtr = { red: 0, blue: 0 }; l.usedWords = []; l.currentWordIndex = 0;
    broadcast(io, l); cb?.({ success: true });
  });

  socket.on('pitch:beginPlay', (data, cb) => { const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" }); if (l.phase !== 'intro') return cb?.({ success: false }); startWord(io, l); cb?.({ success: true }); });

  // Équipe piège : gérer les pièges (phase 'trap')
  socket.on('pitch:addTrap', (data, cb) => {
    const l = get(data); if (!l || l.phase !== 'trap') return cb?.({ success: false });
    if (l.players[data?.odId]?.team !== l.trapTeam) return cb?.({ success: false });
    const w = (data.word || '').trim(); if (!w) return cb?.({ success: false });
    if (l.traps.length >= l.trapCount) return cb?.({ success: false, message: 'Nombre de pièges atteint' });
    l.traps.push(w); broadcast(io, l); cb?.({ success: true });
  });
  socket.on('pitch:removeTrap', (data, cb) => { const l = get(data); if (!l || l.phase !== 'trap') return cb?.({ success: false }); if (l.players[data?.odId]?.team !== l.trapTeam) return cb?.({ success: false }); if (Number.isInteger(data.index)) l.traps.splice(data.index, 1); broadcast(io, l); cb?.({ success: true }); });
  socket.on('pitch:lockTraps', (data, cb) => { const l = get(data); if (!l || l.phase !== 'trap') return cb?.({ success: false }); if (l.players[data?.odId]?.team !== l.trapTeam && !isHost(l, data?.odId)) return cb?.({ success: false }); startGuess(io, l); cb?.({ success: true }); });

  // Buzzers (phase 'guess')
  socket.on('pitch:buzzFound', (data, cb) => { const l = get(data); if (!l || l.phase !== 'guess') return cb?.({ success: false }); if (l.players[data?.odId]?.team !== l.activeTeam) return cb?.({ success: false, message: "Réservé à l'équipe qui devine" }); endWord(io, l, { type: 'found', by: data.odId }); cb?.({ success: true }); });
  socket.on('pitch:buzzTrap', (data, cb) => { const l = get(data); if (!l || l.phase !== 'guess') return cb?.({ success: false }); if (l.players[data?.odId]?.team !== l.trapTeam) return cb?.({ success: false, message: "Réservé à l'équipe piège" }); const fell = Number.isInteger(data.index) ? l.traps[data.index] : (data.word || null); endWord(io, l, { type: 'trapped', by: data.odId, fell }); cb?.({ success: true }); });

  // Mot suivant (hôte ou devineur)
  socket.on('pitch:continueWord', (data, cb) => { const l = get(data); if (!l || l.phase !== 'reveal') return cb?.({ success: false }); if (!isHost(l, data?.odId) && data?.odId !== l.guesserId) return cb?.({ success: false }); continueWord(io, l); cb?.({ success: true }); });
}

module.exports = { register };
