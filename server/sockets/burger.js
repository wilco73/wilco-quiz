/**
 * Mode "Burger Quiz" — buzzer + équipes + points + transitions.
 * État EN MÉMOIRE par lobby (éphémère, pas de base de données).
 *
 * Format par défaut : 2 équipes (Mayo/Ketchup), 3 joueurs par équipe, + 1 animateur.
 * Extensible : ajouter une équipe (ex. Wasabi) = passer teams: ['mayo','ketchup','wasabi'].
 *
 * Étape 1 : création/join de lobby + choix d'équipe.
 * (Buzzer / points / transitions arrivent aux étapes suivantes — l'état est déjà prévu.)
 */

// ---- Configuration des équipes (extensible) ----
const TEAM_PRESETS = {
  mayo:    { id: 'mayo',    name: 'Mayo',    color: '#E0C800' },
  ketchup: { id: 'ketchup', name: 'Ketchup', color: '#C71000' },
  wasabi:  { id: 'wasabi',  name: 'Wasabi',  color: '#3FA34D' },
};
const DEFAULT_TEAMS = ['mayo', 'ketchup'];
const DEFAULT_MAX_PER_TEAM = 3;

// Transitions (vidéos) — servies depuis /resources/burger/videos/
const TRANSITIONS = [
  { file: 'nuggets-transition.mp4',     label: 'Nuggets',           order: 1 },
  { file: 'selt-pepper-transition.mp4', label: 'Sel ou Poivre',     order: 2 },
  { file: 'menus-transition.mp4',       label: 'Les menus',         order: 3 },
  { file: 'addition-transition.mp4',    label: "L'addition",        order: 4 },
  { file: 'death-burger-transition.mp4',label: 'Burger de la mort', order: 5 },
];

// ---- Registre en mémoire : code -> lobby ----
const burgerLobbies = new Map();

function generateCode() {
  let code;
  do {
    code = Math.floor(1000 + Math.random() * 9000).toString();
  } while (burgerLobbies.has(code));
  return code;
}

function room(code) {
  return `burger:${code}`;
}

function buildTeams(teamIds) {
  const ids = (Array.isArray(teamIds) && teamIds.length >= 2 ? teamIds : DEFAULT_TEAMS)
    .filter((id) => TEAM_PRESETS[id]);
  return ids.map((id) => ({ ...TEAM_PRESETS[id] }));
}

// Vue "publique" du lobby (envoyée aux clients)
function publicLobby(lobby) {
  if (!lobby) return null;
  return {
    code: lobby.code,
    status: lobby.status,
    animator: { id: lobby.animatorId, pseudo: lobby.animatorPseudo },
    teams: lobby.teams,                 // [{id,name,color}]
    maxPerTeam: lobby.maxPerTeam,
    players: Object.values(lobby.players).map((p) => ({
      odId: p.odId, pseudo: p.pseudo, avatar: p.avatar, team: p.team,
    })),
    points: lobby.points,               // { mayo: 0, ketchup: 0, ... }
    buzzerLocked: lobby.buzzerLocked,
    firstBuzz: lobby.firstBuzz,
    winner: lobby.winner || null,
    teamCounts: countByTeam(lobby),
  };
}

function countByTeam(lobby) {
  const counts = {};
  lobby.teams.forEach((t) => { counts[t.id] = 0; });
  Object.values(lobby.players).forEach((p) => {
    if (p.team && counts[p.team] !== undefined) counts[p.team]++;
  });
  return counts;
}

function broadcast(io, lobby) {
  io.to(room(lobby.code)).emit('burger:lobbyState', publicLobby(lobby));
}

// ---- Handlers ----
function register(socket, io) {
  // Créer une partie (par l'animateur)
  socket.on('burger:createLobby', (data, callback) => {
    try {
      const { odId, pseudo, teams, maxPerTeam } = data || {};
      if (!odId) return callback?.({ success: false, message: 'Utilisateur invalide' });

      const teamList = buildTeams(teams);
      const points = {};
      teamList.forEach((t) => { points[t.id] = 0; });

      const code = generateCode();
      const lobby = {
        code,
        animatorId: odId,
        animatorPseudo: pseudo || 'Animateur',
        teams: teamList,
        maxPerTeam: Number(maxPerTeam) > 0 ? Number(maxPerTeam) : DEFAULT_MAX_PER_TEAM,
        status: 'waiting',
        players: {},                    // odId -> { odId, pseudo, avatar, team }
        points,
        buzzerLocked: true,
        firstBuzz: null,
        transitionsQueue: TRANSITIONS.slice().sort((a, b) => a.order - b.order),
        createdAt: Date.now(),
      };
      burgerLobbies.set(code, lobby);
      socket.join(room(code));

      console.log(`[BURGER] Lobby ${code} créé par ${pseudo}`);
      callback?.({ success: true, lobby: publicLobby(lobby) });
    } catch (e) {
      console.error('[BURGER] createLobby:', e);
      callback?.({ success: false, message: e.message });
    }
  });

  // Rejoindre une partie (joueur) par code
  socket.on('burger:joinLobby', (data, callback) => {
    try {
      const { code, odId, pseudo, avatar } = data || {};
      const lobby = burgerLobbies.get(String(code || '').trim());
      if (!lobby) return callback?.({ success: false, message: 'Partie introuvable' });
      if (!odId) return callback?.({ success: false, message: 'Utilisateur invalide' });

      // L'animateur qui rejoint sa propre partie
      const isAnimator = odId === lobby.animatorId;

      if (!isAnimator && !lobby.players[odId]) {
        // Nouveau joueur : vérifier la capacité globale (équipes * maxPerTeam)
        const capacity = lobby.teams.length * lobby.maxPerTeam;
        if (Object.keys(lobby.players).length >= capacity) {
          return callback?.({ success: false, message: 'Partie complète' });
        }
        lobby.players[odId] = { odId, pseudo, avatar: avatar || null, team: null };
      }

      socket.join(room(code));
      broadcast(io, lobby);
      callback?.({ success: true, lobby: publicLobby(lobby), isAnimator });
    } catch (e) {
      console.error('[BURGER] joinLobby:', e);
      callback?.({ success: false, message: e.message });
    }
  });

  // Choisir / changer d'équipe
  socket.on('burger:chooseTeam', (data, callback) => {
    try {
      const { code, odId, team } = data || {};
      const lobby = burgerLobbies.get(String(code || '').trim());
      if (!lobby) return callback?.({ success: false, message: 'Partie introuvable' });
      const player = lobby.players[odId];
      if (!player) return callback?.({ success: false, message: 'Joueur non inscrit' });
      if (!lobby.teams.some((t) => t.id === team)) {
        return callback?.({ success: false, message: 'Équipe invalide' });
      }

      // Vérifier la place dans l'équipe visée (sauf si le joueur y est déjà)
      if (player.team !== team) {
        const counts = countByTeam(lobby);
        if (counts[team] >= lobby.maxPerTeam) {
          return callback?.({ success: false, message: `Équipe complète (${lobby.maxPerTeam} max)` });
        }
      }

      player.team = team;
      broadcast(io, lobby);
      callback?.({ success: true, lobby: publicLobby(lobby) });
    } catch (e) {
      console.error('[BURGER] chooseTeam:', e);
      callback?.({ success: false, message: e.message });
    }
  });

  // Demander l'état courant (reconnexion / ouverture d'écran)
  socket.on('burger:getState', (data, callback) => {
    const lobby = burgerLobbies.get(String(data?.code || '').trim());
    if (!lobby) return callback?.({ success: false, message: 'Partie introuvable' });
    socket.join(room(lobby.code));
    callback?.({ success: true, lobby: publicLobby(lobby) });
  });

  // Quitter (joueur) — l'animateur qui quitte ne supprime pas la partie ici (étape ultérieure)
  socket.on('burger:leaveLobby', (data, callback) => {
    const { code, odId } = data || {};
    const lobby = burgerLobbies.get(String(code || '').trim());
    if (lobby && lobby.players[odId]) {
      delete lobby.players[odId];
      socket.leave(room(code));
      broadcast(io, lobby);
    }
    callback?.({ success: true });
  });

  const requireAnimator = (lobby, odId) => !!lobby && lobby.animatorId === odId;

  // Lancer la partie (animateur)
  socket.on('burger:start', (data, callback) => {
    const lobby = burgerLobbies.get(String(data?.code || '').trim());
    if (!lobby) return callback?.({ success: false, message: 'Partie introuvable' });
    if (!requireAnimator(lobby, data?.odId)) return callback?.({ success: false, message: "Réservé à l'animateur" });
    lobby.status = 'playing';
    lobby.buzzerLocked = true;
    lobby.firstBuzz = null;
    broadcast(io, lobby);
    callback?.({ success: true });
  });

  // Verrouiller les buzzers (animateur)
  socket.on('burger:lockBuzzers', (data, callback) => {
    const lobby = burgerLobbies.get(String(data?.code || '').trim());
    if (!requireAnimator(lobby, data?.odId)) return callback?.({ success: false, message: "Réservé à l'animateur" });
    lobby.buzzerLocked = true;
    broadcast(io, lobby);
    callback?.({ success: true });
  });

  // Déverrouiller les buzzers = ré-armer pour une nouvelle question (animateur)
  socket.on('burger:unlockBuzzers', (data, callback) => {
    const lobby = burgerLobbies.get(String(data?.code || '').trim());
    if (!requireAnimator(lobby, data?.odId)) return callback?.({ success: false, message: "Réservé à l'animateur" });
    lobby.buzzerLocked = false;
    lobby.firstBuzz = null;
    broadcast(io, lobby);
    callback?.({ success: true });
  });

  // Un joueur buzz — le premier verrouille tout le monde
  socket.on('burger:buzz', (data, callback) => {
    const lobby = burgerLobbies.get(String(data?.code || '').trim());
    if (!lobby) return callback?.({ success: false, message: 'Partie introuvable' });
    if (lobby.status !== 'playing') return callback?.({ success: false, message: 'Partie non lancée' });
    if (lobby.buzzerLocked) return callback?.({ success: false, message: 'Buzzers verrouillés' });
    if (lobby.firstBuzz) return callback?.({ success: false, message: 'Trop tard' });
    const player = lobby.players[data?.odId];
    if (!player || !player.team) return callback?.({ success: false, message: 'Choisissez une équipe' });

    lobby.firstBuzz = { odId: player.odId, pseudo: player.pseudo, team: player.team, at: Date.now() };
    lobby.buzzerLocked = true; // auto-lock : un seul buzz
    io.to(room(lobby.code)).emit('burger:buzzed', lobby.firstBuzz);
    broadcast(io, lobby);
    callback?.({ success: true });
  });

  // Ajuster les points d'une équipe (animateur)
  socket.on('burger:addPoint', (data, callback) => {
    const lobby = burgerLobbies.get(String(data?.code || '').trim());
    if (!requireAnimator(lobby, data?.odId)) return callback?.({ success: false, message: "Réservé à l'animateur" });
    const { team, delta } = data || {};
    if (!lobby.points || lobby.points[team] === undefined) return callback?.({ success: false, message: 'Équipe invalide' });
    lobby.points[team] = Math.max(0, Math.min(25, (lobby.points[team] || 0) + (Number(delta) || 0)));
    // Menu rempli : 25 points -> équipe gagnante, on verrouille les buzzers
    if (lobby.points[team] >= 25) {
      lobby.winner = team;
      lobby.buzzerLocked = true;
    } else if (lobby.winner && (lobby.points[lobby.winner] || 0) < 25) {
      lobby.winner = null; // si on retire un point au gagnant
    }
    broadcast(io, lobby);
    callback?.({ success: true });
  });

  // Jouer une vidéo de transition — diffusée à tout le lobby (animateur)
  socket.on('burger:transition', (data, callback) => {
    const lobby = burgerLobbies.get(String(data?.code || '').trim());
    if (!requireAnimator(lobby, data?.odId)) return callback?.({ success: false, message: "Réservé à l'animateur" });
    io.to(room(lobby.code)).emit('burger:playTransition', { video: data?.video || null });
    callback?.({ success: true });
  });

  // Signaler une mauvaise réponse (son) (animateur)
  socket.on('burger:badResponse', (data, callback) => {
    const lobby = burgerLobbies.get(String(data?.code || '').trim());
    if (!requireAnimator(lobby, data?.odId)) return callback?.({ success: false, message: "Réservé à l'animateur" });
    io.to(room(lobby.code)).emit('burger:badResponse');
    callback?.({ success: true });
  });

  // Réinitialiser la partie : scores à 0, buzzers verrouillés (animateur)
  socket.on('burger:reload', (data, callback) => {
    const lobby = burgerLobbies.get(String(data?.code || '').trim());
    if (!requireAnimator(lobby, data?.odId)) return callback?.({ success: false, message: "Réservé à l'animateur" });
    lobby.teams.forEach((t) => { lobby.points[t.id] = 0; });
    lobby.firstBuzz = null;
    lobby.buzzerLocked = true;
    lobby.winner = null;
    io.to(room(lobby.code)).emit('burger:playTransition', { video: null }); // stoppe une transition en cours
    broadcast(io, lobby);
    callback?.({ success: true });
  });

  // Fin de partie : renvoie tout le monde à l'accueil + supprime le lobby (animateur)
  socket.on('burger:endGame', (data, callback) => {
    const lobby = burgerLobbies.get(String(data?.code || '').trim());
    if (!requireAnimator(lobby, data?.odId)) return callback?.({ success: false, message: "Réservé à l'animateur" });
    io.to(room(lobby.code)).emit('burger:gameEnded');
    burgerLobbies.delete(lobby.code);
    callback?.({ success: true });
  });
}

// Petit helper HTTP-friendly pour lister les parties (facultatif, pour un futur écran)
function listLobbies() {
  return Array.from(burgerLobbies.values()).map(publicLobby);
}

module.exports = { register, listLobbies, burgerLobbies };
