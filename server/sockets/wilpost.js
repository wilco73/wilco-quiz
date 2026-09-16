/**
 * Wilpost-it — jeu "mot sur le front". État EN MÉMOIRE par lobby.
 * Phase 1 : lobby. Phase 2 : déroulé (intro -> rounds avec timer serveur -> fin).
 * Le mot que chaque joueur doit deviner est masqué POUR LUI (diffusion par socket).
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

// État public, personnalisé pour un spectateur/joueur (masque SON propre mot à deviner)
function publicLobby(lobby, viewerOdId) {
  return {
    code: lobby.code,
    hostId: lobby.hostId,
    status: lobby.status,
    phase: lobby.phase || null,           // 'intro' | 'round' | 'finished' | null (waiting)
    roundDuration: lobby.roundDuration,
    order: lobby.order,
    minPlayers: MIN_PLAYERS,
    turnNumber: lobby.turnNumber || 0,
    currentPlayerId: (lobby.status === 'playing') ? currentPlayerId(lobby) : null,
    roundRemainingMs: lobby.roundEndsAt ? Math.max(0, lobby.roundEndsAt - Date.now()) : null,
    players: lobby.order.map((id) => {
      const p = lobby.players[id];
      return {
        odId: p.odId, pseudo: p.pseudo, avatar: p.avatar, avatarUrl: p.avatarUrl || null,
        hasWord: !!p.word,
        guessed: !!(lobby.guessed && lobby.guessed[id]),
        // mot à deviner : visible en jeu, sauf le sien
        guessWord: (lobby.status === 'playing' && id !== viewerOdId) ? (p.guessWord || null) : null,
      };
    }),
  };
}

// Diffusion PAR SOCKET (chacun reçoit une version où son propre mot est masqué)
async function broadcast(io, lobby) {
  try {
    const sockets = await io.in(room(lobby.code)).fetchSockets();
    for (const s of sockets) {
      const viewer = lobby.socketToPlayer?.[s.id] || null;
      s.emit('wilpost:lobbyState', publicLobby(lobby, viewer));
    }
  } catch (e) { console.error('[WILPOST] broadcast:', e.message); }
}

function clearTimer(lobby) {
  if (lobby.timer) { clearTimeout(lobby.timer); lobby.timer = null; }
}

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
  lobby.status = 'playing'; // on reste "playing" mais phase 'finished'
  lobby.roundEndsAt = null;
  broadcast(io, lobby);
}

// Passer au joueur suivant non-trouvé (saute ceux qui ont deviné) ; incrémente le n° de tour si on boucle
function advanceTurn(io, lobby) {
  clearTimer(lobby);
  const n = lobby.order.length;
  const active = lobby.order.filter((id) => !lobby.guessed[id]).length;
  if (active === 0) { finishGame(io, lobby); return; }

  const distFromStart = (i) => (i - lobby.startIndex + n) % n;
  const oldDist = distFromStart(lobby.currentIndex);
  let idx = lobby.currentIndex;
  for (let k = 0; k < n; k++) {
    idx = (idx + 1) % n;
    if (!lobby.guessed[lobby.order[idx]]) break;
  }
  if (distFromStart(idx) <= oldDist) lobby.turnNumber += 1; // on a rebouclé
  lobby.currentIndex = idx;
  startRound(io, lobby);
}

function register(socket, io) {
  const mapSocket = (lobby, odId) => {
    if (!lobby.socketToPlayer) lobby.socketToPlayer = {};
    lobby.socketToPlayer[socket.id] = odId;
  };

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
        order: [odId], guessed: {}, socketToPlayer: {}, createdAt: Date.now(),
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
        } else {
          spectator = !existing; // en cours : joueur d'origine -> reconnexion ; sinon spectateur
        }
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
    broadcast(io, lobby);
    cb?.({ success: true });
  });

  socket.on('wilpost:setRoundDuration', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    if (!isHost(lobby, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    const d = parseInt(data.duration, 10);
    if (!d || d < 15 || d > 600) return cb?.({ success: false, message: 'Durée invalide (15-600s)' });
    lobby.roundDuration = d;
    broadcast(io, lobby);
    cb?.({ success: true });
  });

  socket.on('wilpost:setWord', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    if (!lobby) return cb?.({ success: false, message: 'Partie introuvable' });
    if (lobby.status !== 'waiting') return cb?.({ success: false, message: 'Partie déjà lancée' });
    const p = lobby.players[data?.odId];
    if (!p) return cb?.({ success: false, message: 'Joueur introuvable' });
    p.word = (data.word || '').trim() || null;
    broadcast(io, lobby);
    cb?.({ success: true });
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

  // Démarrage (hôte) -> écran d'intro (pas encore de timer)
  socket.on('wilpost:startGame', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    if (!isHost(lobby, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (lobby.order.length < MIN_PLAYERS) return cb?.({ success: false, message: `Minimum ${MIN_PLAYERS} joueurs` });
    if (lobby.order.some((id) => !lobby.players[id].word)) return cb?.({ success: false, message: 'Tous les joueurs doivent saisir un mot' });

    // Assignation : order[j] doit deviner le mot donné par order[j-1]
    const n = lobby.order.length;
    lobby.order.forEach((id, j) => {
      const giver = lobby.order[(j - 1 + n) % n];
      lobby.players[id].guessWord = lobby.players[giver].word;
    });
    lobby.guessed = {};
    lobby.startIndex = Math.floor(Math.random() * n);
    lobby.currentIndex = lobby.startIndex;
    lobby.turnNumber = 1;
    lobby.status = 'playing';
    lobby.phase = 'intro';
    lobby.roundEndsAt = null;
    broadcast(io, lobby);
    cb?.({ success: true });
  });

  // Lancer le premier round depuis l'intro (hôte)
  socket.on('wilpost:beginRound', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    if (!isHost(lobby, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (lobby.phase !== 'intro') return cb?.({ success: false, message: 'Déjà lancé' });
    startRound(io, lobby);
    cb?.({ success: true });
  });

  // Fin du tour (le joueur courant OU l'hôte)
  socket.on('wilpost:endTurn', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    if (!lobby || lobby.phase !== 'round') return cb?.({ success: false, message: 'Aucun round en cours' });
    const allowed = data?.odId === currentPlayerId(lobby) || isHost(lobby, data?.odId);
    if (!allowed) return cb?.({ success: false, message: "Ce n'est pas votre tour" });
    advanceTurn(io, lobby);
    cb?.({ success: true });
  });

  // Arrêter la partie (hôte) : termine pour tout le monde + supprime le lobby
  socket.on('wilpost:stopGame', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    if (!isHost(lobby, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    io.to(room(lobby.code)).emit('wilpost:gameEnded', { code: lobby.code });
    clearTimer(lobby);
    wilpostLobbies.delete(lobby.code);
    cb?.({ success: true });
  });
}

module.exports = { register };
