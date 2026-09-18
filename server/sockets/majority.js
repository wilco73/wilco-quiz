/**
 * Majorité ("L'esprit du troupeau") — état EN MÉMOIRE par lobby.
 * Un poseur tiré au sort écrit une question ; tout le monde (poseur inclus) répond en secret ;
 * on regroupe les réponses identiques et on score. Manches successives, poseur différent à chaque fois.
 */

const majorityLobbies = new Map();
const MIN_PLAYERS = 3;

function generateCode() { let c; do { c = Math.floor(1000 + Math.random() * 9000).toString(); } while (majorityLobbies.has(c)); return c; }
function room(code) { return `majority:${code}`; }
function isHost(l, odId) { return l && l.hostId === odId; }
function pseudoOf(l, id) { return l.players[id]?.pseudo || '?'; }

// Normalisation pour regrouper : minuscules, sans accents, sans ponctuation, pluriel léger
function normalize(s) {
  let t = (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ');
  if (t.length > 3 && t.endsWith('s')) t = t.slice(0, -1); // pluriel simple
  return t;
}

function publicLobby(l, viewerOdId) {
  return {
    code: l.code, hostId: l.hostId, status: l.status, phase: l.phase || null,
    minPlayers: MIN_PLAYERS, rounds: l.rounds, answerTime: l.answerTime, penalizeNoAnswer: l.penalizeNoAnswer,
    roundNumber: l.roundNumber || 0,
    askerId: l.askerId || null, askerPseudo: l.askerId ? pseudoOf(l, l.askerId) : null,
    question: l.question || null,
    answeredIds: l.phase === 'answer' ? Object.keys(l.answers || {}) : [],
    answerRemainingMs: (l.phase === 'answer' && l.answerEndsAt) ? Math.max(0, l.answerEndsAt - Date.now()) : null,
    groups: l.phase === 'reveal' ? (l.groups || []) : null,
    unanimous: l.phase === 'reveal' ? !!l.unanimous : false,
    roundScores: l.phase === 'reveal' ? (l.roundScores || {}) : null,
    scores: l.scores || {},
    players: l.order.map((id) => { const p = l.players[id]; return { odId: p.odId, pseudo: p.pseudo, avatar: p.avatar, avatarUrl: p.avatarUrl || null }; }),
    finalRanking: l.phase === 'finished' ? l.order.map((id) => ({ odId: id, pseudo: pseudoOf(l, id), score: l.scores[id] || 0 })).sort((a, b) => b.score - a.score) : null,
  };
}
async function broadcast(io, l) { try { const sockets = await io.in(room(l.code)).fetchSockets(); for (const s of sockets) s.emit('majority:lobbyState', publicLobby(l, l.socketToPlayer?.[s.id] || null)); } catch (e) { console.error('[MAJORITY] broadcast:', e.message); } }
function clearT(l) { if (l.timer) { clearTimeout(l.timer); l.timer = null; } }

function pickAsker(l) {
  let pool = l.order.filter((id) => id !== l.lastAsker);
  if (!pool.length) pool = [...l.order];
  return pool[Math.floor(Math.random() * pool.length)];
}
function startRound(io, l) {
  clearT(l);
  l.askerId = pickAsker(l); l.lastAsker = l.askerId;
  l.question = null; l.answers = {}; l.groups = null; l.roundScores = null;
  l.phase = 'ask'; // le poseur écrit sa question
  broadcast(io, l);
}
function startAnswering(io, l) {
  clearT(l);
  l.phase = 'answer';
  l.answerEndsAt = Date.now() + l.answerTime * 1000;
  l.timer = setTimeout(() => resolveRound(io, l), l.answerTime * 1000);
  broadcast(io, l);
}
// Calcule groupes + scores à partir des réponses brutes + des fusions manuelles (remaps)
function computeGroups(l) {
  const remaps = l.remaps || {}; // normSource -> normCible
  const keyOf = (raw) => { let k = normalize(raw); while (remaps[k] && remaps[k] !== k) k = remaps[k]; return k; };

  const groupsMap = {}; // key -> { label, ids: [] }
  l.order.forEach((id) => {
    const raw = (l.answers[id] || '').trim(); if (!raw) return;
    const key = keyOf(raw); if (!key) return;
    if (!groupsMap[key]) groupsMap[key] = { key, label: raw, ids: [] };
    groupsMap[key].ids.push(id);
  });
  const groups = Object.values(groupsMap).sort((a, b) => b.ids.length - a.ids.length);
  const maxSize = groups.length ? groups[0].ids.length : 0;
  const answeredCount = l.order.reduce((n, id) => n + ((l.answers[id] || '').trim() ? 1 : 0), 0);
  const unanimous = groups.length === 1 && maxSize === answeredCount && answeredCount > 1;

  const roundScores = {};
  l.order.forEach((id) => {
    const raw = (l.answers[id] || '').trim();
    if (!raw) { roundScores[id] = l.penalizeNoAnswer ? -1 : 0; return; }
    const g = groupsMap[keyOf(raw)];
    if (!g) { roundScores[id] = 0; return; }
    if (g.ids.length === 1) roundScores[id] = -1;
    else if (g.ids.length === maxSize) roundScores[id] = unanimous ? 0 : 1;
    else roundScores[id] = 0;
  });

  l.groups = groups.map((g) => ({ key: g.key, label: g.label, count: g.ids.length, isMajority: !unanimous && g.ids.length === maxSize && maxSize > 1, isLone: g.ids.length === 1, members: g.ids.map((id) => pseudoOf(l, id)) }));
  l.unanimous = unanimous;
  l.roundScores = roundScores;
}

function resolveRound(io, l) {
  clearT(l);
  l.remaps = {};              // aucune fusion manuelle au départ
  computeGroups(l);
  l.phase = 'reveal';
  l.answerEndsAt = null;
  broadcast(io, l);
}
function continueRound(io, l) {
  // Appliquer les scores de la manche (recalculés avec les éventuelles fusions) au cumul
  const rs = l.roundScores || {};
  l.order.forEach((id) => { l.scores[id] = (l.scores[id] || 0) + (rs[id] || 0); });
  if (l.roundNumber >= l.rounds) { l.phase = 'finished'; clearT(l); broadcast(io, l); return; }
  l.roundNumber += 1;
  startRound(io, l);
}

function register(socket, io) {
  const mapSocket = (l, odId) => { if (!l.socketToPlayer) l.socketToPlayer = {}; l.socketToPlayer[socket.id] = odId; };
  const get = (data) => majorityLobbies.get(String(data?.code || '').trim());

  socket.on('majority:createLobby', (data, cb) => {
    try {
      const { odId, pseudo, avatar, avatarUrl } = data || {};
      if (!odId) return cb?.({ success: false, message: 'Utilisateur invalide' });
      for (const [c, l] of majorityLobbies) { if (l.hostId === odId) { socket.to(room(c)).emit('majority:gameEnded', { code: c }); clearT(l); majorityLobbies.delete(c); } }
      const code = generateCode();
      const lobby = { code, hostId: odId, status: 'waiting', phase: null, rounds: 5, answerTime: 30, penalizeNoAnswer: false, roundNumber: 0, scores: {}, players: { [odId]: { odId, pseudo, avatar, avatarUrl: avatarUrl || null } }, order: [odId], socketToPlayer: {}, createdAt: Date.now() };
      majorityLobbies.set(code, lobby); socket.join(room(code)); mapSocket(lobby, odId);
      cb?.({ success: true, code, lobby: publicLobby(lobby, odId), isHost: true });
    } catch (e) { console.error('[MAJORITY] create:', e); cb?.({ success: false, message: e.message }); }
  });

  socket.on('majority:joinLobby', (data, cb) => {
    try {
      const { code, odId, pseudo, avatar, avatarUrl } = data || {};
      const l = majorityLobbies.get(String(code || '').trim());
      if (!l) return cb?.({ success: false, message: 'Partie introuvable' });
      if (!odId) return cb?.({ success: false, message: 'Utilisateur invalide' });
      const host = isHost(l, odId); const existing = l.players[odId]; let spectator = false;
      if (!host) { if (l.status === 'waiting') { if (!existing) { l.players[odId] = { odId, pseudo, avatar, avatarUrl: avatarUrl || null }; l.order.push(odId); l.scores[odId] = l.scores[odId] || 0; } } else spectator = !existing; }
      socket.join(room(code)); mapSocket(l, odId); broadcast(io, l);
      cb?.({ success: true, lobby: publicLobby(l, odId), isHost: host, spectator });
    } catch (e) { console.error('[MAJORITY] join:', e); cb?.({ success: false, message: e.message }); }
  });

  socket.on('majority:getState', (data, cb) => { const l = get(data); if (!l) return cb?.({ success: false, message: 'Partie introuvable' }); socket.join(room(l.code)); mapSocket(l, data?.odId); cb?.({ success: true, lobby: publicLobby(l, data?.odId) }); });

  socket.on('majority:setConfig', (data, cb) => {
    const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (l.status !== 'waiting') return cb?.({ success: false });
    const c = data.config || {};
    if (Number.isInteger(c.rounds)) l.rounds = Math.max(1, Math.min(20, c.rounds));
    if (Number.isInteger(c.answerTime)) l.answerTime = Math.max(10, Math.min(180, c.answerTime));
    if (typeof c.penalizeNoAnswer === 'boolean') l.penalizeNoAnswer = c.penalizeNoAnswer;
    broadcast(io, l); cb?.({ success: true });
  });

  socket.on('majority:leaveLobby', (data, cb) => { const l = get(data); if (l) { const { odId } = data; if (l.socketToPlayer) delete l.socketToPlayer[socket.id]; if (l.players[odId] && l.status === 'waiting') { delete l.players[odId]; l.order = l.order.filter((id) => id !== odId); if (odId === l.hostId) { if (l.order.length) l.hostId = l.order[0]; else { clearT(l); majorityLobbies.delete(l.code); socket.leave(room(l.code)); return cb?.({ success: true }); } } broadcast(io, l); } socket.leave(room(l.code)); } cb?.({ success: true }); });
  socket.on('majority:stopGame', (data, cb) => { const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" }); io.to(room(l.code)).emit('majority:gameEnded', { code: l.code }); clearT(l); majorityLobbies.delete(l.code); cb?.({ success: true }); });

  socket.on('majority:startGame', (data, cb) => {
    const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (l.order.length < MIN_PLAYERS) return cb?.({ success: false, message: `Minimum ${MIN_PLAYERS} joueurs` });
    l.status = 'playing'; l.roundNumber = 1; l.lastAsker = null;
    l.order.forEach((id) => { l.scores[id] = 0; });
    startRound(io, l); cb?.({ success: true });
  });

  // Le poseur soumet sa question
  socket.on('majority:setQuestion', (data, cb) => {
    const l = get(data); if (!l || l.phase !== 'ask') return cb?.({ success: false });
    if (data?.odId !== l.askerId) return cb?.({ success: false, message: "Ce n'est pas à toi de poser la question" });
    const q = (data.question || '').trim(); if (!q) return cb?.({ success: false, message: 'Question vide' });
    l.question = q; startAnswering(io, l); cb?.({ success: true });
  });

  // Répondre (tout le monde, poseur inclus)
  socket.on('majority:answer', (data, cb) => {
    const l = get(data); if (!l || l.phase !== 'answer') return cb?.({ success: false });
    if (!l.players[data?.odId]) return cb?.({ success: false }); // spectateurs exclus
    const a = (data.answer || '').trim(); if (!a) return cb?.({ success: false, message: 'Réponse vide' });
    l.answers[data.odId] = a;
    if (Object.keys(l.answers).length >= l.order.length) resolveRound(io, l); else broadcast(io, l);
    cb?.({ success: true });
  });

  // Manche suivante (hôte ou poseur)
  socket.on('majority:continue', (data, cb) => {
    const l = get(data); if (!l || l.phase !== 'reveal') return cb?.({ success: false });
    if (!isHost(l, data?.odId) && data?.odId !== l.askerId) return cb?.({ success: false });
    continueRound(io, l); cb?.({ success: true });
  });
  // L'hôte fusionne le groupe "from" dans le groupe "to" (clés normalisées des groupes)
  socket.on('majority:mergeGroups', (data, cb) => {
    const l = get(data); if (!l || l.phase !== 'reveal') return cb?.({ success: false });
    if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    const { from, to } = data; if (!from || !to || from === to) return cb?.({ success: false });
    l.remaps = l.remaps || {}; l.remaps[from] = to;
    computeGroups(l); broadcast(io, l); cb?.({ success: true });
  });
  // Annuler toutes les fusions de la manche
  socket.on('majority:resetMerges', (data, cb) => {
    const l = get(data); if (!l || l.phase !== 'reveal') return cb?.({ success: false });
    if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    l.remaps = {}; computeGroups(l); broadcast(io, l); cb?.({ success: true });
  });
}

module.exports = { register };
