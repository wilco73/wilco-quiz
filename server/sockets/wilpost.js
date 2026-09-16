/**
 * Wilpost-it — jeu "mot sur le front".
 * État EN MÉMOIRE par lobby (éphémère, pas de base).
 * Phase 1 : lobby (rejoindre, ordonner les joueurs = chaîne des mots + rotation des rounds,
 * durée de round, saisie du mot pour sa cible, démarrage).
 * (Le déroulé de jeu — tours, timer, tentatives, votes — arrive en Phase 2 ; l'état est déjà prévu.)
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

function publicLobby(lobby) {
  return {
    code: lobby.code,
    hostId: lobby.hostId,
    status: lobby.status,
    roundDuration: lobby.roundDuration,
    order: lobby.order,
    minPlayers: MIN_PLAYERS,
    startIndex: lobby.startIndex ?? null,
    players: lobby.order.map((id) => {
      const p = lobby.players[id];
      return { odId: p.odId, pseudo: p.pseudo, avatar: p.avatar, avatarUrl: p.avatarUrl || null, hasWord: !!p.word };
    }),
  };
}
function broadcast(io, lobby) {
  io.to(room(lobby.code)).emit('wilpost:lobbyState', publicLobby(lobby));
}

function register(socket, io) {
  // Créer un lobby (l'hôte est un joueur)
  socket.on('wilpost:createLobby', (data, cb) => {
    try {
      const { odId, pseudo, avatar, avatarUrl } = data || {};
      if (!odId) return cb?.({ success: false, message: 'Utilisateur invalide' });
      // Fermer un ancien lobby du même hôte
      for (const [c, l] of wilpostLobbies) {
        if (l.hostId === odId) { socket.to(room(c)).emit('wilpost:gameEnded', { code: c }); wilpostLobbies.delete(c); }
      }
      const code = generateCode();
      const lobby = {
        code, hostId: odId, status: 'waiting', roundDuration: 60,
        players: { [odId]: { odId, pseudo, avatar, avatarUrl: avatarUrl || null, word: null } },
        order: [odId], createdAt: Date.now(),
      };
      wilpostLobbies.set(code, lobby);
      socket.join(room(code));
      cb?.({ success: true, code, lobby: publicLobby(lobby), isHost: true });
    } catch (e) { console.error('[WILPOST] create:', e); cb?.({ success: false, message: e.message }); }
  });

  // Rejoindre
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
          if (!existing) {
            lobby.players[odId] = { odId, pseudo, avatar, avatarUrl: avatarUrl || null, word: null };
            lobby.order.push(odId);
          }
        } else {
          // Partie lancée : joueur d'origine -> reconnexion ; nouveau venu -> spectateur (Phase 2)
          spectator = !existing;
        }
      }
      socket.join(room(code));
      broadcast(io, lobby);
      cb?.({ success: true, lobby: publicLobby(lobby), isHost: host, spectator });
    } catch (e) { console.error('[WILPOST] join:', e); cb?.({ success: false, message: e.message }); }
  });

  socket.on('wilpost:getState', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    if (!lobby) return cb?.({ success: false, message: 'Partie introuvable' });
    socket.join(room(lobby.code));
    cb?.({ success: true, lobby: publicLobby(lobby) });
  });

  // Réordonner (hôte) : définit la chaîne des mots ET l'ordre des tours
  socket.on('wilpost:setOrder', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    if (!isHost(lobby, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
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

  // Chaque joueur saisit le mot qu'il donne à sa cible (contenu jamais diffusé, juste "hasWord")
  socket.on('wilpost:setWord', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    if (!lobby) return cb?.({ success: false, message: 'Partie introuvable' });
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
      if (lobby.players[odId] && lobby.status === 'waiting') {
        delete lobby.players[odId];
        lobby.order = lobby.order.filter((id) => id !== odId);
        if (odId === lobby.hostId) {
          if (lobby.order.length > 0) lobby.hostId = lobby.order[0]; // transfert d'hôte
          else { wilpostLobbies.delete(lobby.code); socket.leave(room(lobby.code)); return cb?.({ success: true }); }
        }
        broadcast(io, lobby);
      }
      socket.leave(room(lobby.code));
    }
    cb?.({ success: true });
  });

  // Démarrage (hôte) : valide, choisit un joueur de départ aléatoire, passe en "playing"
  socket.on('wilpost:startGame', (data, cb) => {
    const lobby = wilpostLobbies.get(String(data?.code || '').trim());
    if (!isHost(lobby, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (lobby.order.length < MIN_PLAYERS) return cb?.({ success: false, message: `Minimum ${MIN_PLAYERS} joueurs` });
    if (lobby.order.some((id) => !lobby.players[id].word)) return cb?.({ success: false, message: 'Tous les joueurs doivent saisir un mot' });

    lobby.startIndex = Math.floor(Math.random() * lobby.order.length); // départ aléatoire
    lobby.status = 'playing';
    // Phase 2 : initialiser currentIndex = startIndex, timer, tentatives, assignation des mots à deviner
    // (le mot que doit deviner order[i] = le mot donné par order[i-1]).
    broadcast(io, lobby);
    cb?.({ success: true });
  });
}

module.exports = { register };
