/**
 * Pixel-Art coopératif aveugle — état EN MÉMOIRE par lobby.
 * Phase 1 : lobby + peinture (mode B). Phase 2 : Directeur (aléatoire/vote) + cible + timer + manches.
 * (Reveal des grilles + fusion majoritaire + score : Phase 3.)
 */
const { PALETTE, randomTarget } = require('./pixelShapes');

const pixelLobbies = new Map();
const MIN_PLAYERS = 3;
const GRID_SIZES = [8, 16, 24];

function generateCode() { let c; do { c = Math.floor(1000 + Math.random() * 9000).toString(); } while (pixelLobbies.has(c)); return c; }
function room(code) { return `pixel:${code}`; }
function isHost(l, odId) { return l && l.hostId === odId; }
function blankGrid(size) { return new Array(size * size).fill(-1); }
function pseudoOf(l, id) { return l.players[id]?.pseudo || '?'; }

function publicLobby(l, viewerOdId) {
  const isDir = viewerOdId && viewerOdId === l.director;
  const showTargetToViewer = isDir && (l.phase === 'prep' || l.phase === 'paint');
  return {
    code: l.code, hostId: l.hostId, status: l.status, phase: l.phase || null,
    palette: PALETTE, gridSize: l.gridSize, rounds: l.rounds, directorMode: l.directorMode,
    roundDuration: l.roundDuration, currentRound: l.currentRound || 0, minPlayers: MIN_PLAYERS, gridSizes: GRID_SIZES,
    director: l.director || null, directorPseudo: l.director ? pseudoOf(l, l.director) : null,
    roundRemainingMs: l.roundEndsAt ? Math.max(0, l.roundEndsAt - Date.now()) : null,
    directorVotedIds: l.phase === 'director-vote' ? Object.keys(l.directorVotes || {}) : [],
    target: showTargetToViewer ? l.target : null,
    players: l.order.map((id) => { const p = l.players[id]; return { odId: p.odId, pseudo: p.pseudo, avatar: p.avatar, avatarUrl: p.avatarUrl || null }; }),
    myGrid: (l.grids && viewerOdId && l.grids[viewerOdId]) ? l.grids[viewerOdId] : null,
  };
}
async function broadcast(io, l) { try { const sockets = await io.in(room(l.code)).fetchSockets(); for (const s of sockets) s.emit('pixel:lobbyState', publicLobby(l, l.socketToPlayer?.[s.id] || null)); } catch (e) { console.error('[PIXEL] broadcast:', e.message); } }
function clearTimer(l) { if (l.roundTimer) { clearTimeout(l.roundTimer); l.roundTimer = null; } }

function pickRandomDirector(l) {
  let pool = l.order.filter((id) => id !== l.lastDirector);
  if (!pool.length) pool = [...l.order];
  return pool[Math.floor(Math.random() * pool.length)];
}
function beginRoundSelection(io, l) {
  clearTimer(l); l.director = null; l.target = null; l.roundEndsAt = null;
  if (l.directorMode === 'vote') { l.phase = 'director-vote'; l.directorVotes = {}; }
  else { l.director = pickRandomDirector(l); l.lastDirector = l.director; l.phase = 'prep'; }
  broadcast(io, l);
}
function startPaint(io, l) {
  const t = randomTarget(l.gridSize);
  l.target = t;
  l.grids = {}; l.order.forEach((id) => { l.grids[id] = blankGrid(l.gridSize); }); // grille vierge par manche
  l.phase = 'paint';
  l.roundEndsAt = Date.now() + l.roundDuration * 1000;
  l.roundTimer = setTimeout(() => endRound(io, l), l.roundDuration * 1000);
  broadcast(io, l);
}
function endRound(io, l) {
  clearTimer(l);
  // Snapshot pour la Phase 3 (reveal + fusion + score)
  const gridsCopy = {}; Object.keys(l.grids || {}).forEach((id) => { gridsCopy[id] = [...l.grids[id]]; });
  l.roundResults = l.roundResults || [];
  l.roundResults.push({ round: l.currentRound, director: l.director, target: l.target, grids: gridsCopy });
  l.phase = 'round-end'; l.roundEndsAt = null;
  broadcast(io, l);
}
function continueRound(io, l) {
  if (l.currentRound >= l.rounds) { l.phase = 'finished'; clearTimer(l); broadcast(io, l); return; }
  l.currentRound += 1;
  beginRoundSelection(io, l);
}

function register(socket, io) {
  const mapSocket = (l, odId) => { if (!l.socketToPlayer) l.socketToPlayer = {}; l.socketToPlayer[socket.id] = odId; };
  const get = (data) => pixelLobbies.get(String(data?.code || '').trim());

  socket.on('pixel:createLobby', (data, cb) => {
    try {
      const { odId, pseudo, avatar, avatarUrl } = data || {};
      if (!odId) return cb?.({ success: false, message: 'Utilisateur invalide' });
      for (const [c, l] of pixelLobbies) { if (l.hostId === odId) { socket.to(room(c)).emit('pixel:gameEnded', { code: c }); clearTimer(l); pixelLobbies.delete(c); } }
      const code = generateCode();
      const lobby = { code, hostId: odId, status: 'waiting', phase: null, gridSize: 16, rounds: 3, directorMode: 'random', roundDuration: 90, currentRound: 0, players: { [odId]: { odId, pseudo, avatar, avatarUrl: avatarUrl || null } }, order: [odId], grids: {}, roundResults: [], socketToPlayer: {}, createdAt: Date.now() };
      pixelLobbies.set(code, lobby); socket.join(room(code)); mapSocket(lobby, odId);
      cb?.({ success: true, code, lobby: publicLobby(lobby, odId), isHost: true });
    } catch (e) { console.error('[PIXEL] create:', e); cb?.({ success: false, message: e.message }); }
  });

  socket.on('pixel:joinLobby', (data, cb) => {
    try {
      const { code, odId, pseudo, avatar, avatarUrl } = data || {};
      const l = pixelLobbies.get(String(code || '').trim());
      if (!l) return cb?.({ success: false, message: 'Partie introuvable' });
      if (!odId) return cb?.({ success: false, message: 'Utilisateur invalide' });
      const host = isHost(l, odId); const existing = l.players[odId]; let spectator = false;
      if (!host) { if (l.status === 'waiting') { if (!existing) { l.players[odId] = { odId, pseudo, avatar, avatarUrl: avatarUrl || null }; l.order.push(odId); } } else spectator = !existing; }
      socket.join(room(code)); mapSocket(l, odId); broadcast(io, l);
      cb?.({ success: true, lobby: publicLobby(l, odId), isHost: host, spectator });
    } catch (e) { console.error('[PIXEL] join:', e); cb?.({ success: false, message: e.message }); }
  });

  socket.on('pixel:getState', (data, cb) => { const l = get(data); if (!l) return cb?.({ success: false, message: 'Partie introuvable' }); socket.join(room(l.code)); mapSocket(l, data?.odId); cb?.({ success: true, lobby: publicLobby(l, data?.odId) }); });

  socket.on('pixel:setConfig', (data, cb) => {
    const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (l.status !== 'waiting') return cb?.({ success: false, message: 'Partie déjà lancée' });
    const c = data.config || {};
    if (GRID_SIZES.includes(c.gridSize)) l.gridSize = c.gridSize;
    if (Number.isInteger(c.rounds)) l.rounds = Math.max(1, Math.min(10, c.rounds));
    if (c.directorMode === 'random' || c.directorMode === 'vote') l.directorMode = c.directorMode;
    if (Number.isInteger(c.roundDuration)) l.roundDuration = Math.max(30, Math.min(600, c.roundDuration));
    broadcast(io, l); cb?.({ success: true });
  });

  socket.on('pixel:leaveLobby', (data, cb) => {
    const l = get(data);
    if (l) { const { odId } = data; if (l.socketToPlayer) delete l.socketToPlayer[socket.id]; if (l.players[odId] && l.status === 'waiting') { delete l.players[odId]; l.order = l.order.filter((id) => id !== odId); if (odId === l.hostId) { if (l.order.length) l.hostId = l.order[0]; else { clearTimer(l); pixelLobbies.delete(l.code); socket.leave(room(l.code)); return cb?.({ success: true }); } } broadcast(io, l); } socket.leave(room(l.code)); }
    cb?.({ success: true });
  });

  socket.on('pixel:stopGame', (data, cb) => { const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" }); io.to(room(l.code)).emit('pixel:gameEnded', { code: l.code }); clearTimer(l); pixelLobbies.delete(l.code); cb?.({ success: true }); });

  socket.on('pixel:startGame', (data, cb) => {
    const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (l.order.length < MIN_PLAYERS) return cb?.({ success: false, message: `Minimum ${MIN_PLAYERS} joueurs` });
    l.status = 'playing'; l.currentRound = 1; l.roundResults = []; l.lastDirector = null;
    beginRoundSelection(io, l); cb?.({ success: true });
  });

  // Vote pour le Directeur (mode 'vote')
  socket.on('pixel:voteDirector', (data, cb) => {
    const l = get(data); if (!l || l.phase !== 'director-vote') return cb?.({ success: false });
    if (!l.players[data?.odId]) return cb?.({ success: false });
    if (!data.targetId || !l.players[data.targetId]) return cb?.({ success: false, message: 'Cible invalide' });
    l.directorVotes = l.directorVotes || {}; l.directorVotes[data.odId] = data.targetId;
    if (Object.keys(l.directorVotes).length >= l.order.length) {
      const tally = {}; Object.values(l.directorVotes).forEach((t) => { tally[t] = (tally[t] || 0) + 1; });
      const max = Math.max(...Object.values(tally));
      const top = Object.keys(tally).filter((id) => tally[id] === max);
      l.director = top[Math.floor(Math.random() * top.length)]; // égalité -> tirage
      l.lastDirector = l.director; l.phase = 'prep'; l.directorVotes = {};
      broadcast(io, l);
    } else broadcast(io, l);
    cb?.({ success: true });
  });

  // Le Directeur lance la phase de peinture
  socket.on('pixel:launchPaint', (data, cb) => {
    const l = get(data); if (!l || l.phase !== 'prep') return cb?.({ success: false });
    if (data?.odId !== l.director && !isHost(l, data?.odId)) return cb?.({ success: false, message: 'Réservé au Directeur' });
    startPaint(io, l); cb?.({ success: true });
  });

  // Terminer la manche (Directeur ou hôte)
  socket.on('pixel:endRound', (data, cb) => {
    const l = get(data); if (!l || l.phase !== 'paint') return cb?.({ success: false });
    if (data?.odId !== l.director && !isHost(l, data?.odId)) return cb?.({ success: false, message: 'Réservé au Directeur' });
    endRound(io, l); cb?.({ success: true });
  });

  // Passer à la manche suivante (Directeur ou hôte)
  socket.on('pixel:continueRound', (data, cb) => {
    const l = get(data); if (!l || l.phase !== 'round-end') return cb?.({ success: false });
    if (data?.odId !== l.director && !isHost(l, data?.odId)) return cb?.({ success: false, message: 'Réservé à l\'hôte/Directeur' });
    continueRound(io, l); cb?.({ success: true });
  });

  // Peindre (les OUVRIERS uniquement : le Directeur ne peint pas)
  socket.on('pixel:paintCell', (data, cb) => {
    const l = get(data); if (!l || l.phase !== 'paint') return cb?.({ success: false });
    if (data?.odId === l.director) return cb?.({ success: false, message: 'Le Directeur ne peint pas' });
    const g = l.grids?.[data?.odId]; if (!g) return cb?.({ success: false });
    const i = data.index, color = data.color;
    if (!Number.isInteger(i) || i < 0 || i >= g.length) return cb?.({ success: false });
    if (color !== -1 && (!Number.isInteger(color) || color < 0 || color >= PALETTE.length)) return cb?.({ success: false });
    g[i] = color; cb?.({ success: true });
  });

  socket.on('pixel:clearGrid', (data, cb) => {
    const l = get(data); if (!l || l.phase !== 'paint') return cb?.({ success: false });
    if (data?.odId === l.director) return cb?.({ success: false });
    if (l.grids?.[data?.odId]) l.grids[data.odId] = blankGrid(l.gridSize);
    cb?.({ success: true });
  });
}

module.exports = { register };
