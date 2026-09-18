/**
 * Match de Pitch (Trapwords) — 2 équipes, bouton PIÈGE. État EN MÉMOIRE par lobby.
 * Phase 1 : lobby (2 équipes : choix/mélange/spectateur) + config + banque de mots + sons.
 * (Déroulé : pose des pièges -> devinette -> buzzers trouvé/piégé -> reveal + score : Phases 2/3.)
 */
const db = require('../database');

const pitchLobbies = new Map();
const MIN_PLAYERS = 4;
const TEAMS = [
  { id: 'red', name: 'Rouge', color: '#E53935' },
  { id: 'blue', name: 'Bleu', color: '#1E88E5' },
];

function generateCode() { let c; do { c = Math.floor(1000 + Math.random() * 9000).toString(); } while (pitchLobbies.has(c)); return c; }
function room(code) { return `pitch:${code}`; }
function isHost(l, odId) { return l && l.hostId === odId; }
function teamMembers(l, teamId) { return l.order.filter((id) => l.players[id].team === teamId); }

function publicLobby(l) {
  return {
    code: l.code, hostId: l.hostId, status: l.status, phase: l.phase || null,
    teams: TEAMS, minPlayers: MIN_PLAYERS,
    trapCount: l.trapCount, trapTime: l.trapTime, wordsPerTeam: l.wordsPerTeam, guessTime: l.guessTime,
    soundFound: l.soundFound || null, soundTrap: l.soundTrap || null,
    themes: l.themes || [], theme: l.theme || null, customWords: l.customWords || [],
    scores: l.scores || { red: 0, blue: 0 },
    players: l.order.map((id) => { const p = l.players[id]; return { odId: p.odId, pseudo: p.pseudo, avatar: p.avatar, avatarUrl: p.avatarUrl || null, team: p.team || null }; }),
    teamCounts: { red: teamMembers(l, 'red').length, blue: teamMembers(l, 'blue').length },
  };
}
function broadcast(io, l) { io.to(room(l.code)).emit('pitch:lobbyState', publicLobby(l)); }

function register(socket, io) {
  const mapSocket = (l, odId) => { if (!l.socketToPlayer) l.socketToPlayer = {}; l.socketToPlayer[socket.id] = odId; };
  const get = (data) => pitchLobbies.get(String(data?.code || '').trim());

  socket.on('pitch:createLobby', async (data, cb) => {
    try {
      const { odId, pseudo, avatar, avatarUrl } = data || {};
      if (!odId) return cb?.({ success: false, message: 'Utilisateur invalide' });
      for (const [c, l] of pitchLobbies) { if (l.hostId === odId) { socket.to(room(c)).emit('pitch:gameEnded', { code: c }); pitchLobbies.delete(c); } }
      // Défauts sons admin + thèmes banque
      let soundFound = null, soundTrap = null, themes = [];
      try { soundFound = await db.getAppSetting('pitch_sound_found'); } catch (e) {}
      try { soundTrap = await db.getAppSetting('pitch_sound_trap'); } catch (e) {}
      try { themes = await db.getPitchThemes(); } catch (e) {}
      const code = generateCode();
      const lobby = {
        code, hostId: odId, status: 'waiting', phase: null,
        trapCount: 3, trapTime: 45, wordsPerTeam: 5, guessTime: 90,
        soundFound, soundTrap, theme: null, themes, customWords: [], scores: { red: 0, blue: 0 },
        players: { [odId]: { odId, pseudo, avatar, avatarUrl: avatarUrl || null, team: null } },
        order: [odId], socketToPlayer: {}, createdAt: Date.now(),
      };
      pitchLobbies.set(code, lobby); socket.join(room(code)); mapSocket(lobby, odId);
      cb?.({ success: true, code, lobby: publicLobby(lobby), isHost: true });
    } catch (e) { console.error('[PITCH] create:', e); cb?.({ success: false, message: e.message }); }
  });

  socket.on('pitch:joinLobby', (data, cb) => {
    try {
      const { code, odId, pseudo, avatar, avatarUrl } = data || {};
      const l = pitchLobbies.get(String(code || '').trim());
      if (!l) return cb?.({ success: false, message: 'Partie introuvable' });
      if (!odId) return cb?.({ success: false, message: 'Utilisateur invalide' });
      const host = isHost(l, odId); const existing = l.players[odId]; let spectator = false;
      if (!host) {
        if (l.status === 'waiting') { if (!existing) { l.players[odId] = { odId, pseudo, avatar, avatarUrl: avatarUrl || null, team: null }; l.order.push(odId); } }
        else spectator = !(existing && existing.team); // en cours : joueur d'origine avec équipe -> reco ; sinon spectateur
      }
      socket.join(room(code)); mapSocket(l, odId); broadcast(io, l);
      cb?.({ success: true, lobby: publicLobby(l), isHost: host, spectator });
    } catch (e) { console.error('[PITCH] join:', e); cb?.({ success: false, message: e.message }); }
  });

  socket.on('pitch:getState', (data, cb) => { const l = get(data); if (!l) return cb?.({ success: false, message: 'Partie introuvable' }); socket.join(room(l.code)); mapSocket(l, data?.odId); cb?.({ success: true, lobby: publicLobby(l) }); });

  // Choisir son équipe (ou null = spectateur en attente)
  socket.on('pitch:chooseTeam', (data, cb) => {
    const l = get(data); if (!l || l.status !== 'waiting') return cb?.({ success: false });
    const p = l.players[data?.odId]; if (!p) return cb?.({ success: false });
    const t = data.team; if (t !== null && !TEAMS.find((x) => x.id === t)) return cb?.({ success: false, message: 'Équipe invalide' });
    p.team = t || null; broadcast(io, l); cb?.({ success: true });
  });

  // Mélanger : répartir tous les joueurs dans les 2 équipes (hôte)
  socket.on('pitch:shuffleTeams', (data, cb) => {
    const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (l.status !== 'waiting') return cb?.({ success: false });
    const ids = [...l.order]; for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    ids.forEach((id, i) => { l.players[id].team = i % 2 === 0 ? 'red' : 'blue'; });
    broadcast(io, l); cb?.({ success: true });
  });

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

  socket.on('pitch:addCustomWord', (data, cb) => {
    const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    const w = (data.word || '').trim(); if (!w) return cb?.({ success: false, message: 'Mot vide' });
    l.customWords.push(w); broadcast(io, l); cb?.({ success: true });
  });
  socket.on('pitch:removeCustomWord', (data, cb) => {
    const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (Number.isInteger(data.index)) l.customWords.splice(data.index, 1); broadcast(io, l); cb?.({ success: true });
  });

  socket.on('pitch:leaveLobby', (data, cb) => {
    const l = get(data);
    if (l) { const { odId } = data; if (l.socketToPlayer) delete l.socketToPlayer[socket.id]; if (l.players[odId] && l.status === 'waiting') { delete l.players[odId]; l.order = l.order.filter((id) => id !== odId); if (odId === l.hostId) { if (l.order.length) l.hostId = l.order[0]; else { pitchLobbies.delete(l.code); socket.leave(room(l.code)); return cb?.({ success: true }); } } broadcast(io, l); } socket.leave(room(l.code)); }
    cb?.({ success: true });
  });

  socket.on('pitch:stopGame', (data, cb) => { const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" }); io.to(room(l.code)).emit('pitch:gameEnded', { code: l.code }); pitchLobbies.delete(l.code); cb?.({ success: true }); });

  // Démarrage (Phase 1 : validation + placeholder ; le déroulé arrive en Phase 2)
  socket.on('pitch:startGame', (data, cb) => {
    const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    const red = teamMembers(l, 'red').length, blue = teamMembers(l, 'blue').length;
    if (red < 2 || blue < 2) return cb?.({ success: false, message: 'Il faut au moins 2 joueurs par équipe' });
    l.status = 'playing'; l.phase = 'intro'; l.scores = { red: 0, blue: 0 };
    broadcast(io, l); cb?.({ success: true });
  });
}

module.exports = { register };
