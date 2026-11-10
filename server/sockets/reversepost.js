/**
 * Post-it inversé — état EN MÉMOIRE par lobby.
 * Chaque joueur choisit SON PROPRE mot/personnage (+ image optionnelle) que les autres doivent deviner.
 * Tour par tour : le joueur courant choisit une cible encore non trouvée et
 *   - soit lui pose une question à l'oral (réponse oui/non à l'oral), puis termine son tour,
 *   - soit fait une proposition écrite, que la CIBLE valide (juste/faux).
 * Proposition juste : +1 point au devineur, la cible est "trouvée" (elle continue à jouer mais n'est plus ciblable).
 * Proposition fausse : pas de pénalité, le tour passe (une proposition compte comme le tour).
 * Fin quand tout le monde a été trouvé (ou sur décision de l'hôte) -> classement par points.
 * Phases : waiting -> intro -> turn -> finished.
 */

const lobbies = new Map();
const MIN_PLAYERS = 3;

function generateCode() { let c; do { c = Math.floor(1000 + Math.random() * 9000).toString(); } while (lobbies.has(c)); return c; }
function room(code) { return `rpost:${code}`; }
function isHost(l, odId) { return l && l.hostId === odId; }
function pseudoOf(l, id) { return l.players[id]?.pseudo || '?'; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// --- Indice de validation (tolérant aux accents / fautes), montré uniquement à la cible ---
function normalize(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, ''); }
function levenshtein(a, b) {
  const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
  const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
function fuzzyMatch(answer, target) {
  const a = normalize(answer), b = normalize(target); if (!a || !b) return false; if (a === b) return true;
  const tol = b.length >= 8 ? 2 : (b.length >= 4 ? 1 : 0); return levenshtein(a, b) <= tol;
}

// Cibles possibles pour un joueur : les autres joueurs pas encore trouvés
function validTargets(l, fromId) { return l.order.filter((id) => id !== fromId && !l.players[id].found); }
function allFound(l) { return l.order.every((id) => l.players[id].found); }

function remainingMs(l) {
  if (l.phase !== 'turn') return null;
  if (l.action && l.action.type === 'guess') return l.frozenRemainingMs ?? null; // gelé pendant la validation
  return l.turnEndsAt ? Math.max(0, l.turnEndsAt - Date.now()) : null;
}

function publicLobby(l, viewerOdId) {
  const finished = l.phase === 'finished';
  const a = l.action;
  return {
    code: l.code, hostId: l.hostId, status: l.status, phase: l.phase || null,
    minPlayers: MIN_PLAYERS, turnDuration: l.turnDuration,
    turnNumber: l.turnNumber || 0,
    currentPlayerId: l.phase === 'turn' ? (l.currentPlayerId || null) : null,
    action: a ? {
      type: a.type, targetId: a.targetId,
      answer: a.type === 'guess' ? a.answer : undefined,
      hint: (a.type === 'guess' && viewerOdId === a.targetId) ? !!a.hint : undefined, // l'indice n'est montré qu'à la cible
    } : null,
    turnRemainingMs: remainingMs(l),
    log: l.log || [],
    players: l.order.map((id) => {
      const p = l.players[id];
      const reveal = id === viewerOdId || p.found || finished;
      return {
        odId: p.odId, pseudo: p.pseudo, avatar: p.avatar, avatarUrl: p.avatarUrl || null,
        hasWord: !!p.word, hasImage: !!p.wordImage,
        found: !!p.found, foundByPseudo: p.foundBy ? pseudoOf(l, p.foundBy) : null, foundAtTurn: p.foundAtTurn || null,
        points: p.points || 0,
        word: reveal ? (p.word || null) : null,
        wordImage: reveal ? (p.wordImage || null) : null,
      };
    }),
    ranking: finished
      ? l.order.map((id) => ({ odId: id, pseudo: pseudoOf(l, id), points: l.players[id].points || 0, word: l.players[id].word, found: !!l.players[id].found }))
        .sort((x, y) => y.points - x.points || x.pseudo.localeCompare(y.pseudo))
      : null,
  };
}
async function broadcast(io, l) {
  try { const sockets = await io.in(room(l.code)).fetchSockets(); for (const s of sockets) s.emit('rpost:lobbyState', publicLobby(l, l.socketToPlayer?.[s.id] || null)); }
  catch (e) { console.error('[RPOST] broadcast:', e.message); }
}
function clearTimer(l) { if (l.timer) { clearTimeout(l.timer); l.timer = null; } }

function armTimer(io, l, ms) {
  clearTimer(l);
  if (!l.turnDuration) { l.turnEndsAt = null; return; } // pas de timer
  l.turnEndsAt = Date.now() + ms;
  const turnAtArm = l.turnNumber;
  l.timer = setTimeout(() => { if (l.phase === 'turn' && l.turnNumber === turnAtArm) endTurn(io, l, 'timeout'); }, ms);
}

// Démarre le tour du prochain joueur (à partir de fromIndex) qui a au moins une cible
function startTurn(io, l, fromIndex) {
  clearTimer(l);
  if (allFound(l)) return finishGame(io, l);
  const n = l.order.length;
  for (let k = 0; k < n; k++) {
    const idx = (fromIndex + k) % n;
    const id = l.order[idx];
    if (validTargets(l, id).length) {
      l.turnIndex = idx; l.currentPlayerId = id; l.turnNumber = (l.turnNumber || 0) + 1;
      l.action = null; l.frozenRemainingMs = null;
      armTimer(io, l, l.turnDuration * 1000);
      return broadcast(io, l);
    }
  }
  return finishGame(io, l); // personne n'a de cible (ne devrait pas arriver si quelqu'un n'est pas trouvé)
}

function endTurn(io, l, reason) {
  const a = l.action;
  if (a && a.type === 'question') l.log.push({ turn: l.turnNumber, type: 'question', from: l.currentPlayerId, to: a.targetId });
  else if (!a) l.log.push({ turn: l.turnNumber, type: reason === 'timeout' ? 'timeout' : 'pass', from: l.currentPlayerId });
  startTurn(io, l, (l.turnIndex || 0) + 1);
}

function finishGame(io, l) {
  clearTimer(l);
  l.phase = 'finished'; l.action = null; l.turnEndsAt = null; l.currentPlayerId = null;
  broadcast(io, l);
}

function register(socket, io) {
  const mapSocket = (l, odId) => { if (!l.socketToPlayer) l.socketToPlayer = {}; l.socketToPlayer[socket.id] = odId; };
  const get = (data) => lobbies.get(String(data?.code || '').trim());
  const isCurrent = (l, odId) => l && l.phase === 'turn' && odId && odId === l.currentPlayerId;

  socket.on('rpost:createLobby', (data, cb) => {
    try {
      const { odId, pseudo, avatar, avatarUrl } = data || {};
      if (!odId) return cb?.({ success: false, message: 'Utilisateur invalide' });
      // Ferme l'ancien lobby du même hôte (évite les lobbys fantômes)
      for (const [c, old] of lobbies) { if (old.hostId === odId) { socket.to(room(c)).emit('rpost:gameEnded', { code: c }); clearTimer(old); lobbies.delete(c); } }
      const code = generateCode();
      const l = {
        code, hostId: odId, status: 'waiting', phase: null, turnDuration: 90,
        players: { [odId]: { odId, pseudo, avatar, avatarUrl: avatarUrl || null, word: null, wordImage: null, found: false, points: 0 } },
        order: [odId], log: [], socketToPlayer: {}, createdAt: Date.now(),
      };
      lobbies.set(code, l); socket.join(room(code)); mapSocket(l, odId);
      cb?.({ success: true, code, lobby: publicLobby(l, odId), isHost: true });
    } catch (e) { console.error('[RPOST] create:', e); cb?.({ success: false, message: e.message }); }
  });

  socket.on('rpost:joinLobby', (data, cb) => {
    try {
      const { code, odId, pseudo, avatar, avatarUrl } = data || {};
      const l = lobbies.get(String(code || '').trim());
      if (!l) return cb?.({ success: false, message: 'Partie introuvable' });
      if (!odId) return cb?.({ success: false, message: 'Utilisateur invalide' });
      const host = isHost(l, odId); const existing = l.players[odId]; let spectator = false;
      if (!host) {
        if (l.status === 'waiting') { if (!existing) { l.players[odId] = { odId, pseudo, avatar, avatarUrl: avatarUrl || null, word: null, wordImage: null, found: false, points: 0 }; l.order.push(odId); } }
        else spectator = !existing; // partie en cours : les nouveaux arrivent en spectateur
      }
      socket.join(room(code)); mapSocket(l, odId); broadcast(io, l);
      cb?.({ success: true, lobby: publicLobby(l, odId), isHost: host, spectator });
    } catch (e) { console.error('[RPOST] join:', e); cb?.({ success: false, message: e.message }); }
  });

  socket.on('rpost:getState', (data, cb) => {
    const l = get(data); if (!l) return cb?.({ success: false, message: 'Partie introuvable' });
    socket.join(room(l.code)); mapSocket(l, data?.odId); cb?.({ success: true, lobby: publicLobby(l, data?.odId) });
  });

  socket.on('rpost:setWord', (data, cb) => {
    const l = get(data); if (!l || l.status !== 'waiting') return cb?.({ success: false, message: 'Partie déjà lancée' });
    const p = l.players[data?.odId]; if (!p) return cb?.({ success: false });
    p.word = String(data.word || '').trim().slice(0, 60) || null;
    p.wordImage = String(data.wordImage || '').trim() || null;
    broadcast(io, l); cb?.({ success: true });
  });

  socket.on('rpost:setConfig', (data, cb) => {
    const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (l.status !== 'waiting') return cb?.({ success: false });
    const c = data.config || {};
    if (Number.isInteger(c.turnDuration)) l.turnDuration = c.turnDuration <= 0 ? 0 : Math.max(15, Math.min(600, c.turnDuration));
    broadcast(io, l); cb?.({ success: true });
  });

  socket.on('rpost:leaveLobby', (data, cb) => {
    const l = get(data);
    if (l) {
      const { odId } = data; if (l.socketToPlayer) delete l.socketToPlayer[socket.id];
      if (l.players[odId] && l.status === 'waiting') {
        delete l.players[odId]; l.order = l.order.filter((id) => id !== odId);
        if (odId === l.hostId) { if (l.order.length) l.hostId = l.order[0]; else { clearTimer(l); lobbies.delete(l.code); socket.leave(room(l.code)); return cb?.({ success: true }); } }
        broadcast(io, l);
      }
      socket.leave(room(l.code));
    }
    cb?.({ success: true });
  });

  socket.on('rpost:stopGame', (data, cb) => {
    const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    io.to(room(l.code)).emit('rpost:gameEnded', { code: l.code }); clearTimer(l); lobbies.delete(l.code); cb?.({ success: true });
  });

  socket.on('rpost:startGame', (data, cb) => {
    const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (l.order.length < MIN_PLAYERS) return cb?.({ success: false, message: `Minimum ${MIN_PLAYERS} joueurs` });
    if (!l.order.every((id) => l.players[id].word)) return cb?.({ success: false, message: 'Tout le monde doit avoir choisi son mot' });
    shuffle(l.order); // ordre de jeu aléatoire
    l.order.forEach((id) => { const p = l.players[id]; p.found = false; p.foundBy = null; p.foundAtTurn = null; p.points = 0; });
    l.log = []; l.turnNumber = 0; l.turnIndex = 0; l.action = null;
    l.status = 'playing'; l.phase = 'intro';
    broadcast(io, l); cb?.({ success: true });
  });

  socket.on('rpost:begin', (data, cb) => {
    const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (l.phase !== 'intro') return cb?.({ success: false });
    l.phase = 'turn'; startTurn(io, l, 0); cb?.({ success: true });
  });

  // Le joueur courant choisit la cible de sa question orale (modifiable tant que le tour n'est pas fini)
  socket.on('rpost:askQuestion', (data, cb) => {
    const l = get(data); if (!isCurrent(l, data?.odId)) return cb?.({ success: false, message: "Ce n'est pas ton tour" });
    if (l.action && l.action.type === 'guess') return cb?.({ success: false, message: 'Une proposition est en cours de validation' });
    if (!validTargets(l, data.odId).includes(data.targetId)) return cb?.({ success: false, message: 'Cible invalide' });
    l.action = { type: 'question', targetId: data.targetId };
    broadcast(io, l); cb?.({ success: true });
  });

  // Le joueur courant fait une proposition pour une cible -> la cible valide
  socket.on('rpost:submitGuess', (data, cb) => {
    const l = get(data); if (!isCurrent(l, data?.odId)) return cb?.({ success: false, message: "Ce n'est pas ton tour" });
    if (l.action && l.action.type === 'guess') return cb?.({ success: false, message: 'Une proposition est déjà en cours' });
    if (!validTargets(l, data.odId).includes(data.targetId)) return cb?.({ success: false, message: 'Cible invalide' });
    const answer = String(data.answer || '').trim().slice(0, 60); if (!answer) return cb?.({ success: false, message: 'Proposition vide' });
    l.frozenRemainingMs = l.turnEndsAt ? Math.max(0, l.turnEndsAt - Date.now()) : null;
    clearTimer(l); // le timer est gelé pendant la validation
    l.action = { type: 'guess', targetId: data.targetId, answer, hint: fuzzyMatch(answer, l.players[data.targetId].word) };
    broadcast(io, l); cb?.({ success: true });
  });

  // Le joueur courant annule sa proposition (erreur de saisie) avant validation : le timer reprend
  socket.on('rpost:cancelGuess', (data, cb) => {
    const l = get(data); if (!isCurrent(l, data?.odId)) return cb?.({ success: false });
    if (!l.action || l.action.type !== 'guess') return cb?.({ success: false });
    l.action = null;
    if (l.turnDuration) armTimer(io, l, l.frozenRemainingMs ?? l.turnDuration * 1000);
    l.frozenRemainingMs = null;
    broadcast(io, l); cb?.({ success: true });
  });

  // La cible (ou l'hôte en secours) valide la proposition
  socket.on('rpost:validateGuess', (data, cb) => {
    const l = get(data); const a = l?.action;
    if (!l || l.phase !== 'turn' || !a || a.type !== 'guess') return cb?.({ success: false, message: 'Aucune proposition en cours' });
    if (data?.odId !== a.targetId && !isHost(l, data?.odId)) return cb?.({ success: false, message: 'Seule la cible peut valider' });
    const guesser = l.currentPlayerId; const target = l.players[a.targetId];
    const correct = !!data.correct;
    l.log.push({ turn: l.turnNumber, type: 'guess', from: guesser, to: a.targetId, answer: a.answer, correct, word: correct ? target.word : undefined });
    if (correct) {
      target.found = true; target.foundBy = guesser; target.foundAtTurn = l.turnNumber;
      l.players[guesser].points = (l.players[guesser].points || 0) + 1;
    }
    l.action = null;
    if (allFound(l)) finishGame(io, l); else startTurn(io, l, (l.turnIndex || 0) + 1);
    cb?.({ success: true });
  });

  // Fin du tour (après la question orale, ou pour passer) : joueur courant ou hôte
  socket.on('rpost:endTurn', (data, cb) => {
    const l = get(data); if (!l || l.phase !== 'turn') return cb?.({ success: false });
    if (data?.odId !== l.currentPlayerId && !isHost(l, data?.odId)) return cb?.({ success: false, message: "Ce n'est pas ton tour" });
    if (l.action && l.action.type === 'guess') return cb?.({ success: false, message: 'Une proposition attend sa validation' });
    endTurn(io, l, 'manual'); cb?.({ success: true });
  });

  // L'hôte termine la partie (classement immédiat, tous les mots révélés)
  socket.on('rpost:endGame', (data, cb) => {
    const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (l.status !== 'playing') return cb?.({ success: false });
    finishGame(io, l); cb?.({ success: true });
  });
}

module.exports = { register };
