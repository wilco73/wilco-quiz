/**
 * Mot Imposteur (Undercover) — état EN MÉMOIRE par lobby.
 * Phases : reveal -> clues (indices) -> vote -> [guess] -> result/finished.
 * Modes : quick (1 vote) / full (éliminations successives). Variantes : Mr White, vol de victoire.
 */
const db = require('../database');

const impostorLobbies = new Map();
const MIN_PLAYERS = 3;

function generateCode() { let c; do { c = Math.floor(1000 + Math.random() * 9000).toString(); } while (impostorLobbies.has(c)); return c; }
function room(code) { return `impostor:${code}`; }
function isHost(l, odId) { return l && l.hostId === odId; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function recommendedImpostors(n) { return n <= 5 ? 1 : (n <= 8 ? 2 : 3); }
function aliveIds(l) { return l.alive ? l.order.filter((id) => l.alive[id]) : [...l.order]; }
function currentCluePlayer(l) { return (l.phase === 'clues' && l.clueOrder) ? (l.clueOrder[l.clueIndex] || null) : null; }

// validation souple (accents + fautes)
function normalize(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''); }
function levenshtein(a, b) { const m = a.length, n = b.length; if (!m) return n; if (!n) return m; const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]); for (let j = 0; j <= n; j++) d[0][j] = j; for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[m][n]; }
function fuzzyMatch(ans, tgt) { const a = normalize(ans), b = normalize(tgt); if (!a || !b) return false; if (a === b) return true; const tol = b.length >= 8 ? 2 : (b.length >= 4 ? 1 : 0); return levenshtein(a, b) <= tol; }

function publicLobby(l, viewerOdId) {
  const finished = l.phase === 'finished';
  const pg = l.pendingGuess;
  return {
    code: l.code, hostId: l.hostId, status: l.status, phase: l.phase || null,
    mode: l.mode, impostorCount: l.impostorCount, mrWhite: l.mrWhite, stealWin: l.stealWin,
    theme: l.theme, themes: l.themes || [], customPairs: l.customPairs || [],
    minPlayers: MIN_PLAYERS, recommendedImpostors: recommendedImpostors(l.order.length),
    clueDuration: l.clueDuration, clueRound: l.clueRound || 0,
    currentCluePlayerId: currentCluePlayer(l),
    clueRemainingMs: l.clueEndsAt ? Math.max(0, l.clueEndsAt - Date.now()) : null,
    clues: l.clues || [],
    aliveIds: aliveIds(l),
    votedIds: l.phase === 'vote' ? Object.keys(l.votes || {}) : [],
    result: l.result || null,
    pendingGuess: pg ? { guesserId: pg.guesserId, answer: pg.answer, hint: pg.hint, voters: pg.voters, votedIds: Object.keys(pg.votes), yesVotes: Object.values(pg.votes).filter((v) => v).length, noVotes: Object.values(pg.votes).filter((v) => !v).length } : null,
    winner: l.winner || null,
    guessPlayerId: l.phase === 'guess' ? (l.pendingElim || null) : null,
    pair: finished ? (l.pair || null) : null,
    eliminatedOrder: l.eliminatedOrder || [],
    players: l.order.map((id) => {
      const p = l.players[id];
      const reveal = finished || id === viewerOdId;
      return {
        odId: p.odId, pseudo: p.pseudo, avatar: p.avatar, avatarUrl: p.avatarUrl || null,
        alive: l.alive ? !!l.alive[id] : true,
        role: reveal ? (p.role || null) : null,
        word: reveal ? (p.word ?? null) : null,
      };
    }),
  };
}
async function broadcast(io, l) { try { const sockets = await io.in(room(l.code)).fetchSockets(); for (const s of sockets) s.emit('impostor:lobbyState', publicLobby(l, l.socketToPlayer?.[s.id] || null)); } catch (e) { console.error('[IMPOSTOR] broadcast:', e.message); } }

function clearClueTimer(l) { if (l.clueTimer) { clearTimeout(l.clueTimer); l.clueTimer = null; } }
function buildClueOrder(l) { const alive = aliveIds(l); const start = Math.floor(Math.random() * alive.length); return [...alive.slice(start), ...alive.slice(0, start)]; }
function startClueTimer(io, l) { clearClueTimer(l); l.clueEndsAt = Date.now() + l.clueDuration * 1000; l.clueTimer = setTimeout(() => { recordClue(l, ''); advanceClue(io, l); }, l.clueDuration * 1000); broadcast(io, l); }
function recordClue(l, word) { const id = currentCluePlayer(l); if (!id) return; l.clues.push({ round: l.clueRound, odId: id, word: (word || '').trim() || '…' }); }
function advanceClue(io, l) { clearClueTimer(l); l.clueIndex += 1; if (l.clueIndex >= l.clueOrder.length) { l.phase = 'vote'; l.clueEndsAt = null; l.votes = {}; broadcast(io, l); return; } startClueTimer(io, l); }

function newClueRound(io, l) {
  l.result = null; l.pendingGuess = null; l.pendingElim = null; l.votes = {};
  l.clueRound = (l.clueRound || 0) + 1;
  l.clueOrder = buildClueOrder(l); l.clueIndex = 0; l.phase = 'clues';
  startClueTimer(io, l);
}
function checkWin(l) {
  const alive = aliveIds(l);
  const nonCivil = alive.filter((id) => l.players[id].role !== 'civil').length;
  const civil = alive.filter((id) => l.players[id].role === 'civil').length;
  if (nonCivil === 0) return 'civils';
  if (nonCivil >= civil) return 'impostors';
  return null;
}
function finalizeElimination(io, l, elimId) {
  l.alive[elimId] = false;
  l.eliminatedOrder = l.eliminatedOrder || [];
  l.eliminatedOrder.push({ id: elimId, role: l.players[elimId].role });
  l.votes = {}; l.pendingGuess = null; l.pendingElim = null;
  const role = l.players[elimId].role;
  if (l.mode === 'quick') { l.winner = (role === 'impostor' || role === 'mrwhite') ? 'civils' : 'impostors'; l.phase = 'finished'; broadcast(io, l); return; }
  const win = checkWin(l);
  if (win) { l.winner = win; l.phase = 'finished'; } else { l.result = { type: 'eliminated', id: elimId, role }; l.phase = 'result'; }
  broadcast(io, l);
}
function resolveVote(io, l) {
  const tally = {};
  Object.values(l.votes).forEach((t) => { tally[t] = (tally[t] || 0) + 1; });
  const values = Object.values(tally);
  if (!values.length) { l.result = { type: 'tie' }; l.phase = 'result'; l.votes = {}; broadcast(io, l); return; }
  const max = Math.max(...values);
  const top = Object.keys(tally).filter((id) => tally[id] === max);
  if (top.length !== 1) { l.result = { type: 'tie' }; l.phase = 'result'; l.votes = {}; broadcast(io, l); return; }
  const elimId = top[0];
  const role = l.players[elimId].role;
  const canGuess = (role === 'mrwhite' && l.mrWhite) || (role === 'impostor' && l.stealWin);
  if (canGuess) { l.phase = 'guess'; l.pendingElim = elimId; l.pendingGuess = null; l.votes = {}; broadcast(io, l); return; }
  finalizeElimination(io, l, elimId);
}
function resolveGuess(io, l, accepted) {
  const guesserId = l.pendingElim;
  const role = l.players[guesserId].role;
  if (accepted) { l.winner = (role === 'mrwhite') ? 'mrwhite' : 'impostors'; l.phase = 'finished'; l.pendingGuess = null; broadcast(io, l); return; }
  l.pendingGuess = null;
  finalizeElimination(io, l, guesserId);
}

function register(socket, io) {
  const mapSocket = (l, odId) => { if (!l.socketToPlayer) l.socketToPlayer = {}; l.socketToPlayer[socket.id] = odId; };
  const get = (data) => impostorLobbies.get(String(data?.code || '').trim());

  socket.on('impostor:createLobby', async (data, cb) => {
    try {
      const { odId, pseudo, avatar, avatarUrl } = data || {};
      if (!odId) return cb?.({ success: false, message: 'Utilisateur invalide' });
      for (const [c, l] of impostorLobbies) { if (l.hostId === odId) { socket.to(room(c)).emit('impostor:gameEnded', { code: c }); clearClueTimer(l); impostorLobbies.delete(c); } }
      let themes = []; try { themes = await db.getImpostorThemes(); } catch (e) {}
      const code = generateCode();
      const lobby = { code, hostId: odId, status: 'waiting', phase: null, mode: 'quick', impostorCount: 1, mrWhite: false, stealWin: false, theme: null, clueDuration: 60, themes, customPairs: [], players: { [odId]: { odId, pseudo, avatar, avatarUrl: avatarUrl || null } }, order: [odId], socketToPlayer: {}, createdAt: Date.now() };
      impostorLobbies.set(code, lobby); socket.join(room(code)); mapSocket(lobby, odId);
      cb?.({ success: true, code, lobby: publicLobby(lobby, odId), isHost: true });
    } catch (e) { console.error('[IMPOSTOR] create:', e); cb?.({ success: false, message: e.message }); }
  });

  socket.on('impostor:joinLobby', (data, cb) => {
    try {
      const { code, odId, pseudo, avatar, avatarUrl } = data || {};
      const l = impostorLobbies.get(String(code || '').trim());
      if (!l) return cb?.({ success: false, message: 'Partie introuvable' });
      if (!odId) return cb?.({ success: false, message: 'Utilisateur invalide' });
      const host = isHost(l, odId); const existing = l.players[odId]; let spectator = false;
      if (!host) { if (l.status === 'waiting') { if (!existing) { l.players[odId] = { odId, pseudo, avatar, avatarUrl: avatarUrl || null }; l.order.push(odId); } } else spectator = !existing; }
      socket.join(room(code)); mapSocket(l, odId); broadcast(io, l);
      cb?.({ success: true, lobby: publicLobby(l, odId), isHost: host, spectator });
    } catch (e) { console.error('[IMPOSTOR] join:', e); cb?.({ success: false, message: e.message }); }
  });

  socket.on('impostor:getState', (data, cb) => { const l = get(data); if (!l) return cb?.({ success: false, message: 'Partie introuvable' }); socket.join(room(l.code)); mapSocket(l, data?.odId); cb?.({ success: true, lobby: publicLobby(l, data?.odId) }); });

  socket.on('impostor:setConfig', (data, cb) => {
    const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (l.status !== 'waiting') return cb?.({ success: false, message: 'Partie déjà lancée' });
    const c = data.config || {};
    if (c.mode === 'quick' || c.mode === 'full') l.mode = c.mode;
    if (Number.isInteger(c.impostorCount)) l.impostorCount = Math.max(1, Math.min(5, c.impostorCount));
    if (typeof c.mrWhite === 'boolean') l.mrWhite = c.mrWhite;
    if (typeof c.stealWin === 'boolean') l.stealWin = c.stealWin;
    if ('theme' in c) l.theme = c.theme || null;
    if (Number.isInteger(c.clueDuration)) l.clueDuration = Math.max(15, Math.min(300, c.clueDuration));
    broadcast(io, l); cb?.({ success: true });
  });

  socket.on('impostor:addCustomPair', (data, cb) => { const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" }); const civil = (data.civil || '').trim(), impostor = (data.impostor || '').trim(); if (!civil || !impostor) return cb?.({ success: false, message: 'Les deux mots sont requis' }); l.customPairs.push({ civil, impostor }); broadcast(io, l); cb?.({ success: true }); });
  socket.on('impostor:removeCustomPair', (data, cb) => { const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" }); if (Number.isInteger(data.index)) l.customPairs.splice(data.index, 1); broadcast(io, l); cb?.({ success: true }); });

  socket.on('impostor:leaveLobby', (data, cb) => {
    const l = get(data);
    if (l) { const { odId } = data; if (l.socketToPlayer) delete l.socketToPlayer[socket.id]; if (l.players[odId] && l.status === 'waiting') { delete l.players[odId]; l.order = l.order.filter((id) => id !== odId); if (odId === l.hostId) { if (l.order.length) l.hostId = l.order[0]; else { clearClueTimer(l); impostorLobbies.delete(l.code); socket.leave(room(l.code)); return cb?.({ success: true }); } } broadcast(io, l); } socket.leave(room(l.code)); }
    cb?.({ success: true });
  });

  socket.on('impostor:stopGame', (data, cb) => { const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" }); io.to(room(l.code)).emit('impostor:gameEnded', { code: l.code }); clearClueTimer(l); impostorLobbies.delete(l.code); cb?.({ success: true }); });

  socket.on('impostor:startGame', async (data, cb) => {
    try {
      const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
      const n = l.order.length;
      if (n < MIN_PLAYERS) return cb?.({ success: false, message: `Minimum ${MIN_PLAYERS} joueurs` });
      const extra = l.impostorCount + (l.mrWhite ? 1 : 0);
      if (n - extra < 2) return cb?.({ success: false, message: "Trop d'imposteurs (il faut au moins 2 civils)" });
      let bankPairs = []; try { const p = await db.getRandomImpostorPair(l.theme); if (p) bankPairs = [p]; } catch (e) {}
      const pool = [...(l.customPairs || []), ...bankPairs];
      if (!pool.length) return cb?.({ success: false, message: 'Aucune paire disponible (ajoutez-en ou changez de thème)' });
      const pair = pool[Math.floor(Math.random() * pool.length)];
      const ids = shuffle([...l.order]);
      const impostors = ids.slice(0, l.impostorCount);
      const mrWhiteId = l.mrWhite ? ids[l.impostorCount] : null;
      l.order.forEach((id) => { const p = l.players[id]; if (impostors.includes(id)) { p.role = 'impostor'; p.word = pair.impostor; } else if (id === mrWhiteId) { p.role = 'mrwhite'; p.word = null; } else { p.role = 'civil'; p.word = pair.civil; } });
      l.pair = pair; l.alive = {}; l.order.forEach((id) => { l.alive[id] = true; });
      l.clues = []; l.clueRound = 0; l.eliminatedOrder = []; l.winner = null; l.result = null; l.pendingGuess = null; l.pendingElim = null;
      l.status = 'playing'; l.phase = 'reveal';
      broadcast(io, l); cb?.({ success: true });
    } catch (e) { console.error('[IMPOSTOR] start:', e); cb?.({ success: false, message: e.message }); }
  });

  socket.on('impostor:beginClues', (data, cb) => {
    const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (l.phase !== 'reveal' && l.phase !== 'result') return cb?.({ success: false, message: 'Impossible maintenant' });
    newClueRound(io, l); cb?.({ success: true });
  });

  socket.on('impostor:submitClue', (data, cb) => {
    const l = get(data); if (!l || l.phase !== 'clues') return cb?.({ success: false, message: 'Pas de manche en cours' });
    if (data?.odId !== currentCluePlayer(l)) return cb?.({ success: false, message: "Ce n'est pas ton tour" });
    recordClue(l, data.word); advanceClue(io, l); cb?.({ success: true });
  });

  // Phase 3 : vote d'élimination
  socket.on('impostor:vote', (data, cb) => {
    const l = get(data); if (!l || l.phase !== 'vote') return cb?.({ success: false, message: 'Pas de vote en cours' });
    const alive = aliveIds(l);
    if (!alive.includes(data?.odId)) return cb?.({ success: false, message: 'Vous ne pouvez pas voter' });
    if (!data.targetId || data.targetId === data.odId || !alive.includes(data.targetId)) return cb?.({ success: false, message: 'Cible invalide' });
    l.votes = l.votes || {}; l.votes[data.odId] = data.targetId;
    if (Object.keys(l.votes).length >= alive.length) resolveVote(io, l); else broadcast(io, l);
    cb?.({ success: true });
  });

  // Phase 3 : tentative de devinette (Mr White / vol de victoire) -> déclenche un vote
  socket.on('impostor:submitGuess', (data, cb) => {
    const l = get(data); if (!l || l.phase !== 'guess') return cb?.({ success: false, message: 'Pas de devinette en cours' });
    if (data?.odId !== l.pendingElim) return cb?.({ success: false, message: "Ce n'est pas à vous de deviner" });
    if (l.pendingGuess) return cb?.({ success: false, message: 'Vote déjà en cours' });
    const answer = (data.answer || '').trim(); if (!answer) return cb?.({ success: false, message: 'Réponse vide' });
    const hint = fuzzyMatch(answer, l.pair.civil);
    const voters = l.order.filter((id) => id !== l.pendingElim);
    l.pendingGuess = { guesserId: l.pendingElim, answer, hint, votes: {}, voters };
    broadcast(io, l); cb?.({ success: true });
  });
  socket.on('impostor:voteGuess', (data, cb) => {
    const l = get(data); const pg = l?.pendingGuess; if (!pg) return cb?.({ success: false, message: 'Aucun vote en cours' });
    if (!pg.voters.includes(data?.odId)) return cb?.({ success: false, message: 'Vous ne pouvez pas voter' });
    if (data.odId in pg.votes) return cb?.({ success: false, message: 'Déjà voté' });
    pg.votes[data.odId] = !!data.vote;
    const yes = Object.values(pg.votes).filter((v) => v).length, no = Object.values(pg.votes).filter((v) => !v).length;
    const majority = Math.floor(pg.voters.length / 2) + 1;
    if (yes >= majority || no >= majority || Object.keys(pg.votes).length >= pg.voters.length) resolveGuess(io, l, yes > no); else broadcast(io, l);
    cb?.({ success: true });
  });
}

module.exports = { register };
