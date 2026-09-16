/**
 * Wilpost-it — jeu "mot sur le front". État EN MÉMOIRE par lobby.
 * Phase 1 : lobby. Phase 2 : intro -> rounds (timer serveur). Phase 3 : réponses + vote + fin.
 * Chaque joueur reçoit son mot à deviner MASQUÉ (diffusion par socket).
 */

const wilpostLobbies = new Map();
const MIN_PLAYERS = 3;

function generateCode() {
  let code;
  do { code = Math.floor(1000 + Math.random() * 9000).toString(); } while (wilpostLobbies.has(code));
  return code;
}
function room(code) { return `wilpost:${code}`; }
function isHost(lobby, odId) { return lobby && lobby.hostId === odId; }
function currentPlayerId(lobby) {
  if (lobby.currentIndex == null || !lobby.order.length) return null;
  return lobby.order[lobby.currentIndex];
}

// --- Validation semi-auto (tolérante aux accents / fautes) ---
function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
function fuzzyMatch(answer, target) {
  const a = normalize(answer), b = normalize(target);
  if (!a || !b) return false;
  if (a === b) return true;
  const tol = b.length >= 8 ? 2 : (b.length >= 4 ? 1 : 0);
  return levenshtein(a, b) <= tol;
}

function publicLobby(lobby, viewerOdId) {
  const pv = lobby.pendingVote;
  return {
    code: lobby.code,
    hostId: lobby.hostId,
    status: lobby.status,
    phase: lobby.phase || null,
    roundDuration: lobby.roundDuration,
    order: lobby.order,
    minPlayers: MIN_PLAYERS,
    turnNumber: lobby.turnNumber || 0,
    currentPlayerId: (lobby.status === 'playing') ? currentPlayerId(lobby) : null,
    roundRemainingMs: lobby.roundEndsAt ? Math.max(0, lobby.roundEndsAt - Date.now()) : null,
    attempts: lobby.attempts || [],
    pendingVote: pv ? {
      guesserId: pv.guesserId, answer: pv.answer, hint: pv.hint, voters: pv.voters,
      votedIds: Object.keys(pv.votes),
      yesVotes: Object.values(pv.votes).filter((v) => v).length,
      noVotes: Object.values(pv.votes).filter((v) => !v).length,
    } : null,
    players: lobby.order.map((id) => {
      const p = lobby.players[id];
      return {
        odId: p.odId, pseudo: p.pseudo, avatar: p.avatar, avatarUrl: p.avatarUrl || null,
        hasWord: !!p.word,
        guessed: !!(lobby.guessed && lobby.guessed[id]),
        guessedAtTurn: p.guessedAtTurn || null,
        guessWord: (lobby.status === 'playing' && (lobby.phase === 'finished' || id !== viewerOdId)) ? (p.guessWord || null) : null,
      };
    }),
  };
}

async function broadcast(io, lobby) {
  try {
    const sockets = await io.in(room(lobby.code)).fetchSockets();
    for (const s of sockets) {
      const viewer = lobby.socketToPlayer?.[s.id] || null;
      s.emit('wilpost:lobbyState', publicLobby(lobby, viewer));
    }
  } catch (e) { console.error('[WILPOST] broadcast:', e.message); }
}

function clearTimer(lobby) { if (lobby.timer) { clearTimeout(lobby.timer); lobby.timer = null; } }

function startRound(io, lobby) {
  clearTimer(lobby);
  lobby.phase = 'round';
  lobby.roundStartedAt = Date.now();
  lobby.roundEndsAt = Date.now() + lobby.roundDuration * 1000;
  lobby.timer = setTimeout(() => advanceTurn(io, lobby), lobby.roundDuration * 1000);
  broadcast(io, lobby);
}
function finishGame(io, lobby) {
  clearTimer(lobby);
  lobby.phase = 'finished';
  lobby.roundEndsAt = null;
  lobby.pendingVote = null;
  broadcast(io, lobby);
}
function advanceTurn(io, lobby) {
  clearTimer(lobby);
  const n = lobby.order.length;
  const active = lobby.order.filter((id) => !lobby.guessed[id]).length;
  if (active === 0) { finishGame(io, lobby); return; }
  const distFromStart = (i) => (i - lobby.startIndex + n) % n;
  const oldDist = distFromStart(lobby.currentIndex);
  let idx = lobby.currentIndex;
  for (let k = 0; k < n; k++) { idx = (idx + 1) % n; if (!lobby.guessed[lobby.order[idx]]) break; }
  if (distFromStart(idx) <= oldDist) lobby.turnNumber += 1;
  lobby.currentIndex = idx;
  startRound(io, lobby);
}
function resolveVote(io, lobby, accepted) {
  const pv = lobby.pendingVote;
  if (!pv) return;
  lobby.attempts.push({ guesserId: pv.guesserId, answer: pv.answer, turnNumber: lobby.turnNumber, accepted, at: Date.now() });
  if (accepted) {
    lobby.guessed[pv.guesserId] = true;
    lobby.players[pv.guesserId].guessedAtTurn = lobby.turnNumber;
  }
  lobby.pendingVote = null;
  const active = lobby.order.filter((id) => !lobby.guessed[id]).length;
  if (active === 0) { finishGame(io, lobby); return; }
  advanceTurn(io, lobby); // le tour se termine dans tous les cas (trouvé ou raté)
}

function register(socket, io) {
  const mapSocket = (lobby, odId) => { if (!lobby.socketToPlayer) lobby.socketToPlayer = {}; lobby.socketToPlayer[socket.id] = odId; };

  socket.on('wilpost:createLobby', (data, cb) => {
    try {
      const { odId, pseudo, avatar, avatarUrl } = data || {};
      if (!odId) return cb?.({ success: false, message: 'Utilisateur invalide' });
      for (const [c, l] of wilpostLobbies) {
        if (l.hostId === odId) { socket.to(room(c)).emit('wilpost:gameEnded', { code: c }); clearTimer(l); wilpostLobbies.delete(c); }
      }
      const code = generateCode();
      const lobby = {
        code, hostId: odId, status: 'waiting', phase: null, roundDuration: 60,
        players: { [odId]: { odId, pseudo, avatar, avatarUrl: avatarUrl || null, word: null } },
        order: [odId], guessed: {}, attempts: [], pendingVote: null, socketToPlayer: {}, createdAt: Date.now(),
      };
      wilpostLobbies.set(code, lobby);
      socket.join(room(code));
      mapSocket(lobby, odId);
      cb?.({ success: true, code, lobby: publicLobby(lobby, odId), isHost: true });
    } catch (e) { console.error('[WILPOST] create:', e); cb?.({ success: false, message: e.message }); }
  });

  socket.on('wilpost:joinLobby', (data, cb) => {
    try {
      const { code, odId, pseudo, avatar, avatarUrl } = data || {};
      const lobby = wilpostLobbies.get(String(code || '').trim());
      if (!lobby) return cb?.({ success: false, message: 'Partie introuvable' });
      if (!odId) return cb?.({ success: false, message: 'Utilisateur invalide' });
      const host = isHost(lobby, odId);
      const existing = lobby.players[odId];
      let spectator = false;
      if (!host) {
        if (lobby.status === 'waiting') {
          if (!existing) { lobby.players[odId] = { odId, pseudo, avatar, avatarUrl: avatarUrl || null, word: null }; lobby.order.push(odId); }
        } else spectator = !existing;
      }
      socket.join(room(code));
      mapSocket(lobby, odId);
      broadcast(io, lobby);
      cb?.({ success: true, lobby: publicLobby(lobby, odId), isHost: host, spectator });
    } catch (e) { console.error('[WILPOST] join:', e); cb?.({ success: false, message: e.message }); }
  });

  socket.on('wilpost:getState', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    if (!lobby) return cb?.({ success: false, message: 'Partie introuvable' });
    socket.join(room(lobby.code));
    mapSocket(lobby, data?.odId);
    cb?.({ success: true, lobby: publicLobby(lobby, data?.odId) });
  });

  socket.on('wilpost:setOrder', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    if (!isHost(lobby, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (lobby.status !== 'waiting') return cb?.({ success: false, message: 'Partie déjà lancée' });
    const newOrder = Array.isArray(data.order) ? data.order.filter((id) => lobby.players[id]) : null;
    if (!newOrder || newOrder.length !== lobby.order.length) return cb?.({ success: false, message: 'Ordre invalide' });
    lobby.order = newOrder;
    broadcast(io, lobby); cb?.({ success: true });
  });

  socket.on('wilpost:setRoundDuration', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    if (!isHost(lobby, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    const d = parseInt(data.duration, 10);
    if (!d || d < 15 || d > 600) return cb?.({ success: false, message: 'Durée invalide (15-600s)' });
    lobby.roundDuration = d; broadcast(io, lobby); cb?.({ success: true });
  });

  socket.on('wilpost:setWord', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    if (!lobby) return cb?.({ success: false, message: 'Partie introuvable' });
    if (lobby.status !== 'waiting') return cb?.({ success: false, message: 'Partie déjà lancée' });
    const p = lobby.players[data?.odId];
    if (!p) return cb?.({ success: false, message: 'Joueur introuvable' });
    p.word = (data.word || '').trim() || null;
    broadcast(io, lobby); cb?.({ success: true });
  });

  socket.on('wilpost:leaveLobby', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    if (lobby) {
      const { odId } = data;
      if (lobby.socketToPlayer) delete lobby.socketToPlayer[socket.id];
      if (lobby.players[odId] && lobby.status === 'waiting') {
        delete lobby.players[odId];
        lobby.order = lobby.order.filter((id) => id !== odId);
        if (odId === lobby.hostId) {
          if (lobby.order.length > 0) lobby.hostId = lobby.order[0];
          else { clearTimer(lobby); wilpostLobbies.delete(lobby.code); socket.leave(room(lobby.code)); return cb?.({ success: true }); }
        }
        broadcast(io, lobby);
      }
      socket.leave(room(lobby.code));
    }
    cb?.({ success: true });
  });

  socket.on('wilpost:startGame', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    if (!isHost(lobby, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (lobby.order.length < MIN_PLAYERS) return cb?.({ success: false, message: `Minimum ${MIN_PLAYERS} joueurs` });
    if (lobby.order.some((id) => !lobby.players[id].word)) return cb?.({ success: false, message: 'Tous les joueurs doivent saisir un mot' });
    const n = lobby.order.length;
    lobby.order.forEach((id, j) => { lobby.players[id].guessWord = lobby.players[lobby.order[(j - 1 + n) % n]].word; });
    lobby.guessed = {}; lobby.attempts = []; lobby.pendingVote = null;
    lobby.startIndex = Math.floor(Math.random() * n);
    lobby.currentIndex = lobby.startIndex;
    lobby.turnNumber = 1; lobby.status = 'playing'; lobby.phase = 'intro'; lobby.roundEndsAt = null;
    broadcast(io, lobby); cb?.({ success: true });
  });

  socket.on('wilpost:beginRound', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    if (!isHost(lobby, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (lobby.phase !== 'intro') return cb?.({ success: false, message: 'Déjà lancé' });
    startRound(io, lobby); cb?.({ success: true });
  });

  socket.on('wilpost:endTurn', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    if (!lobby || lobby.phase !== 'round') return cb?.({ success: false, message: 'Aucun round en cours' });
    if (lobby.pendingVote) return cb?.({ success: false, message: 'Vote en cours' });
    const allowed = data?.odId === currentPlayerId(lobby) || isHost(lobby, data?.odId);
    if (!allowed) return cb?.({ success: false, message: "Ce n'est pas votre tour" });
    advanceTurn(io, lobby); cb?.({ success: true });
  });

  // Phase 3 : proposer une réponse (joueur courant) -> déclenche un vote
  socket.on('wilpost:submitAnswer', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    if (!lobby || lobby.phase !== 'round') return cb?.({ success: false, message: 'Aucun round en cours' });
    if (data?.odId !== currentPlayerId(lobby)) return cb?.({ success: false, message: "Ce n'est pas votre tour" });
    if (lobby.pendingVote) return cb?.({ success: false, message: 'Vote déjà en cours' });
    const answer = (data.answer || '').trim();
    if (!answer) return cb?.({ success: false, message: 'Réponse vide' });
    const hint = fuzzyMatch(answer, lobby.players[data.odId].guessWord);
    const voters = lobby.order.filter((id) => id !== data.odId); // tous sauf le devineur
    clearTimer(lobby); // on gèle le timer pendant le vote
    lobby.pendingVote = { guesserId: data.odId, answer, hint, votes: {}, voters };
    broadcast(io, lobby); cb?.({ success: true });
  });

  // Phase 3 : voter la réponse (majorité)
  socket.on('wilpost:vote', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    const pv = lobby?.pendingVote;
    if (!pv) return cb?.({ success: false, message: 'Aucun vote en cours' });
    if (!pv.voters.includes(data?.odId)) return cb?.({ success: false, message: 'Vous ne pouvez pas voter' });
    if (data.odId in pv.votes) return cb?.({ success: false, message: 'Déjà voté' });
    pv.votes[data.odId] = !!data.vote;
    const yes = Object.values(pv.votes).filter((v) => v).length;
    const no = Object.values(pv.votes).filter((v) => !v).length;
    const majority = Math.floor(pv.voters.length / 2) + 1;
    if (yes >= majority || no >= majority || Object.keys(pv.votes).length >= pv.voters.length) {
      resolveVote(io, lobby, yes > no);
    } else broadcast(io, lobby);
    cb?.({ success: true });
  });

  socket.on('wilpost:stopGame', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    if (!isHost(lobby, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    io.to(room(lobby.code)).emit('wilpost:gameEnded', { code: lobby.code });
    clearTimer(lobby); wilpostLobbies.delete(lobby.code); cb?.({ success: true });
  });
}

module.exports = { register };
