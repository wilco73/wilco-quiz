/**
 * Pixel-Art coopératif aveugle — état EN MÉMOIRE par lobby.
 * Mode B : chaque joueur a SA propre grille (qu'il est seul à voir). Fusion + score au reveal (Phase 3).
 * Phase 1 : lobby + config + peinture (palette + gomme). (Directeur/cible/timer : Phase 2 ; reveal : Phase 3.)
 */
const { PALETTE, randomTarget } = require('./pixelShapes');

const pixelLobbies = new Map();
const MIN_PLAYERS = 3;
const GRID_SIZES = [8, 16, 24];

function generateCode() { let c; do { c = Math.floor(1000 + Math.random() * 9000).toString(); } while (pixelLobbies.has(c)); return c; }
function room(code) { return `pixel:${code}`; }
function isHost(l, odId) { return l && l.hostId === odId; }
function blankGrid(size) { return new Array(size * size).fill(-1); }

function publicLobby(l, viewerOdId) {
  return {
    code: l.code, hostId: l.hostId, status: l.status, phase: l.phase || null,
    palette: PALETTE, gridSize: l.gridSize, rounds: l.rounds, directorMode: l.directorMode,
    roundDuration: l.roundDuration, currentRound: l.currentRound || 0, minPlayers: MIN_PLAYERS, gridSizes: GRID_SIZES,
    players: l.order.map((id) => { const p = l.players[id]; return { odId: p.odId, pseudo: p.pseudo, avatar: p.avatar, avatarUrl: p.avatarUrl || null }; }),
    myGrid: (l.grids && viewerOdId && l.grids[viewerOdId]) ? l.grids[viewerOdId] : null,
  };
}
async function broadcast(io, l) {
  try { const sockets = await io.in(room(l.code)).fetchSockets(); for (const s of sockets) s.emit('pixel:lobbyState', publicLobby(l, l.socketToPlayer?.[s.id] || null)); }
  catch (e) { console.error('[PIXEL] broadcast:', e.message); }
}

function register(socket, io) {
  const mapSocket = (l, odId) => { if (!l.socketToPlayer) l.socketToPlayer = {}; l.socketToPlayer[socket.id] = odId; };
  const get = (data) => pixelLobbies.get(String(data?.code || '').trim());

  socket.on('pixel:createLobby', (data, cb) => {
    try {
      const { odId, pseudo, avatar, avatarUrl } = data || {};
      if (!odId) return cb?.({ success: false, message: 'Utilisateur invalide' });
      for (const [c, l] of pixelLobbies) { if (l.hostId === odId) { socket.to(room(c)).emit('pixel:gameEnded', { code: c }); pixelLobbies.delete(c); } }
      const code = generateCode();
      const lobby = { code, hostId: odId, status: 'waiting', phase: null, gridSize: 16, rounds: 3, directorMode: 'random', roundDuration: 90, currentRound: 0, players: { [odId]: { odId, pseudo, avatar, avatarUrl: avatarUrl || null } }, order: [odId], grids: {}, socketToPlayer: {}, createdAt: Date.now() };
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
    if (l) { const { odId } = data; if (l.socketToPlayer) delete l.socketToPlayer[socket.id]; if (l.players[odId] && l.status === 'waiting') { delete l.players[odId]; l.order = l.order.filter((id) => id !== odId); if (odId === l.hostId) { if (l.order.length) l.hostId = l.order[0]; else { pixelLobbies.delete(l.code); socket.leave(room(l.code)); return cb?.({ success: true }); } } broadcast(io, l); } socket.leave(room(l.code)); }
    cb?.({ success: true });
  });

  socket.on('pixel:stopGame', (data, cb) => { const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" }); io.to(room(l.code)).emit('pixel:gameEnded', { code: l.code }); pixelLobbies.delete(l.code); cb?.({ success: true }); });

  // Phase 1 : démarrage -> phase peinture (chacun a sa grille vide). (Directeur/cible/timer : Phase 2)
  socket.on('pixel:startGame', (data, cb) => {
    const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (l.order.length < MIN_PLAYERS) return cb?.({ success: false, message: `Minimum ${MIN_PLAYERS} joueurs` });
    l.grids = {}; l.order.forEach((id) => { l.grids[id] = blankGrid(l.gridSize); });
    l.currentRound = 1; l.status = 'playing'; l.phase = 'paint';
    broadcast(io, l); cb?.({ success: true });
  });

  // Peindre une case de SA grille (pas de diffusion : grille privée). color = index palette, ou -1 pour gomme.
  socket.on('pixel:paintCell', (data, cb) => {
    const l = get(data); if (!l || l.phase !== 'paint') return cb?.({ success: false });
    const g = l.grids?.[data?.odId]; if (!g) return cb?.({ success: false });
    const i = data.index, color = data.color;
    if (!Number.isInteger(i) || i < 0 || i >= g.length) return cb?.({ success: false });
    if (color !== -1 && (!Number.isInteger(color) || color < 0 || color >= PALETTE.length)) return cb?.({ success: false });
    g[i] = color; cb?.({ success: true });
  });

  // Effacer toute sa grille
  socket.on('pixel:clearGrid', (data, cb) => {
    const l = get(data); if (!l || l.phase !== 'paint') return cb?.({ success: false });
    if (l.grids?.[data?.odId]) l.grids[data.odId] = blankGrid(l.gridSize);
    cb?.({ success: true });
  });
}

module.exports = { register };
