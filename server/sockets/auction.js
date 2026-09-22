/**
 * Encan Clandestin — enchères secrètes. État EN MÉMOIRE par lobby.
 * Phase 1 : lobby + config + enchères simultanées + résolution (surenchère en cas d'égalité) + score final.
 * Objets générés automatiquement (structure { id, name, pv, imageUrl } prête pour la Phase 2 = objets R2 paramétrables).
 * (Cartes bonus/malus : Phase 2.)
 */

const db = require('../database');

const auctionLobbies = new Map();
const MIN_PLAYERS = 3;

function generateCode() { let c; do { c = Math.floor(1000 + Math.random() * 9000).toString(); } while (auctionLobbies.has(c)); return c; }
function room(code) { return `auction:${code}`; }
function isHost(l, odId) { return l && l.hostId === odId; }
function pseudoOf(l, id) { return l.players[id]?.pseudo || '?'; }

function genItems(n) {
  const adj = ['Ancien', 'Précieux', 'Mystérieux', 'Royal', 'Maudit', 'Doré', 'Rare', 'Antique', 'Sacré', 'Oublié'];
  const noun = ['Vase', 'Trésor', 'Grimoire', 'Joyau', 'Artefact', 'Tableau', 'Relique', 'Sceptre', 'Masque', 'Cristal'];
  const items = [];
  for (let i = 0; i < n; i++) items.push({ id: `auto_${i}`, name: `${adj[i % adj.length]} ${noun[Math.floor(Math.random() * noun.length)]}`, pv: 1 + Math.floor(Math.random() * 10), imageUrl: null, rarity: null });
  return items;
}
function currentItem(l) { return (l.items && l.currentItemIndex != null) ? l.items[l.currentItemIndex] : null; }

function publicLobby(l, viewerOdId) {
  const reveal = l.phase === 'result';
  const it = currentItem(l);
  const isTied = (l.tiedPlayers || []).includes(viewerOdId);
  const myBid = l.bids ? l.bids[viewerOdId] : undefined;
  const coins = l.players[viewerOdId]?.coins;
  return {
    code: l.code, hostId: l.hostId, status: l.status, phase: l.phase || null,
    minPlayers: MIN_PLAYERS, startCoins: l.startCoins, itemCount: l.itemCount, bidTime: l.bidTime,
    itemNumber: (l.currentItemIndex || 0) + 1, totalItems: l.itemCount,
    item: it ? { name: it.name, pv: it.pv, imageUrl: it.imageUrl || null, rarity: it.rarity || null } : null,
    bidRemainingMs: (l.phase === 'bid' && l.bidEndsAt) ? Math.max(0, l.bidEndsAt - Date.now()) : null,
    tieRemainingMs: (l.phase === 'tiebreak' && l.tieEndsAt) ? Math.max(0, l.tieEndsAt - Date.now()) : null,
    bidSubmittedIds: l.phase === 'bid' ? Object.keys(l.bids || {}) : [],
    myBid: (l.phase === 'bid') ? (myBid ?? null) : null,
    // Tiebreak
    tiedPlayers: (l.phase === 'tiebreak') ? (l.tiedPlayers || []).map((id) => ({ odId: id, pseudo: pseudoOf(l, id) })) : [],
    tieSubmittedIds: l.phase === 'tiebreak' ? Object.keys(l.tieBids || {}) : [],
    tieRound: l.tieRound || 0,
    myTie: (l.phase === 'tiebreak' && isTied) ? { current: l.bids[viewerOdId] || 0, maxAdd: Math.max(0, (coins || 0) - (l.bids[viewerOdId] || 0)) } : null,
    // Résultat (mises révélées)
    result: reveal ? l.result : null,
    players: l.order.map((id) => { const p = l.players[id]; return { odId: p.odId, pseudo: p.pseudo, avatar: p.avatar, avatarUrl: p.avatarUrl || null, coins: p.coins, pv: p.pv }; }),
    finalRanking: l.phase === 'finished' ? l.order.map((id) => ({ odId: id, pseudo: pseudoOf(l, id), pv: l.players[id].pv, coins: l.players[id].coins })).sort((a, b) => b.pv - a.pv || b.coins - a.coins) : null,
  };
}
async function broadcast(io, l) { try { const sockets = await io.in(room(l.code)).fetchSockets(); for (const s of sockets) s.emit('auction:lobbyState', publicLobby(l, l.socketToPlayer?.[s.id] || null)); } catch (e) { console.error('[AUCTION] broadcast:', e.message); } }
function clearT(l) { if (l.timer) { clearTimeout(l.timer); l.timer = null; } }

function startItem(io, l) {
  clearT(l);
  l.bids = {}; l.tiedPlayers = []; l.tieBids = {}; l.tieRound = 0; l.result = null;
  l.phase = 'bid';
  l.bidEndsAt = Date.now() + l.bidTime * 1000;
  l.timer = setTimeout(() => resolveBids(io, l), l.bidTime * 1000);
  broadcast(io, l);
}
function resolveBids(io, l) {
  clearT(l);
  // Les joueurs sans mise = 0
  l.order.forEach((id) => { if (l.bids[id] == null) l.bids[id] = 0; });
  const max = Math.max(...l.order.map((id) => l.bids[id]));
  const top = l.order.filter((id) => l.bids[id] === max);
  if (max <= 0) { finalizeWin(io, l, null); return; } // personne ne mise -> objet non vendu
  if (top.length === 1) { finalizeWin(io, l, top[0]); return; }
  startTiebreak(io, l, top);
}
function startTiebreak(io, l, tied) {
  clearT(l);
  l.tiedPlayers = tied; l.tieBids = {}; l.tieRound = (l.tieRound || 0) + 1;
  // Les joueurs déjà "all-in" ne peuvent ajouter que 0 -> auto-enregistrés
  tied.forEach((id) => { const maxAdd = (l.players[id].coins || 0) - (l.bids[id] || 0); if (maxAdd <= 0) l.tieBids[id] = 0; });
  if (Object.keys(l.tieBids).length >= tied.length) { resolveTiebreak(io, l); return; } // tous all-in
  l.phase = 'tiebreak';
  l.tieEndsAt = Date.now() + l.bidTime * 1000;
  l.timer = setTimeout(() => resolveTiebreak(io, l), l.bidTime * 1000);
  broadcast(io, l);
}
function resolveTiebreak(io, l) {
  clearT(l);
  const tied = l.tiedPlayers;
  tied.forEach((id) => { const add = l.tieBids[id] || 0; l.bids[id] = (l.bids[id] || 0) + add; });
  const max = Math.max(...tied.map((id) => l.bids[id]));
  const top = tied.filter((id) => l.bids[id] === max);
  if (top.length === 1) { finalizeWin(io, l, top[0]); return; }
  // Encore égalité : si tous all-in -> tirage au sort (dernier recours), sinon nouveau tour
  const allMaxed = top.every((id) => l.bids[id] >= l.players[id].coins);
  if (allMaxed) { finalizeWin(io, l, top[Math.floor(Math.random() * top.length)], true); return; }
  startTiebreak(io, l, top);
}
function finalizeWin(io, l, winnerId, byDraw = false) {
  clearT(l);
  const it = currentItem(l);
  if (winnerId) { const w = l.players[winnerId]; const paid = l.bids[winnerId] || 0; w.coins -= paid; w.pv += it.pv; }
  l.result = {
    winnerId: winnerId || null, winnerPseudo: winnerId ? pseudoOf(l, winnerId) : null,
    paid: winnerId ? (l.bids[winnerId] || 0) : 0, item: { name: it.name, pv: it.pv }, byDraw,
    bids: l.order.map((id) => ({ odId: id, pseudo: pseudoOf(l, id), amount: l.bids[id] || 0 })).sort((a, b) => b.amount - a.amount),
  };
  l.phase = 'result';
  broadcast(io, l);
}
function continueItem(io, l) {
  if (l.currentItemIndex >= l.itemCount - 1) { l.phase = 'finished'; clearT(l); broadcast(io, l); return; }
  l.currentItemIndex += 1;
  startItem(io, l);
}

function register(socket, io) {
  const mapSocket = (l, odId) => { if (!l.socketToPlayer) l.socketToPlayer = {}; l.socketToPlayer[socket.id] = odId; };
  const get = (data) => auctionLobbies.get(String(data?.code || '').trim());

  socket.on('auction:createLobby', (data, cb) => {
    try {
      const { odId, pseudo, avatar, avatarUrl } = data || {};
      if (!odId) return cb?.({ success: false, message: 'Utilisateur invalide' });
      for (const [c, l] of auctionLobbies) { if (l.hostId === odId) { socket.to(room(c)).emit('auction:gameEnded', { code: c }); clearT(l); auctionLobbies.delete(c); } }
      const code = generateCode();
      const lobby = { code, hostId: odId, status: 'waiting', phase: null, startCoins: 100, itemCount: 8, bidTime: 20, players: { [odId]: { odId, pseudo, avatar, avatarUrl: avatarUrl || null, coins: 100, pv: 0 } }, order: [odId], socketToPlayer: {}, createdAt: Date.now() };
      auctionLobbies.set(code, lobby); socket.join(room(code)); mapSocket(lobby, odId);
      cb?.({ success: true, code, lobby: publicLobby(lobby, odId), isHost: true });
    } catch (e) { console.error('[AUCTION] create:', e); cb?.({ success: false, message: e.message }); }
  });

  socket.on('auction:joinLobby', (data, cb) => {
    try {
      const { code, odId, pseudo, avatar, avatarUrl } = data || {};
      const l = auctionLobbies.get(String(code || '').trim());
      if (!l) return cb?.({ success: false, message: 'Partie introuvable' });
      if (!odId) return cb?.({ success: false, message: 'Utilisateur invalide' });
      const host = isHost(l, odId); const existing = l.players[odId]; let spectator = false;
      if (!host) { if (l.status === 'waiting') { if (!existing) { l.players[odId] = { odId, pseudo, avatar, avatarUrl: avatarUrl || null, coins: l.startCoins, pv: 0 }; l.order.push(odId); } } else spectator = !existing; }
      socket.join(room(code)); mapSocket(l, odId); broadcast(io, l);
      cb?.({ success: true, lobby: publicLobby(l, odId), isHost: host, spectator });
    } catch (e) { console.error('[AUCTION] join:', e); cb?.({ success: false, message: e.message }); }
  });

  socket.on('auction:getState', (data, cb) => { const l = get(data); if (!l) return cb?.({ success: false, message: 'Partie introuvable' }); socket.join(room(l.code)); mapSocket(l, data?.odId); cb?.({ success: true, lobby: publicLobby(l, data?.odId) }); });

  socket.on('auction:setConfig', (data, cb) => {
    const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (l.status !== 'waiting') return cb?.({ success: false });
    const c = data.config || {};
    if (Number.isInteger(c.startCoins)) l.startCoins = Math.max(10, Math.min(1000, c.startCoins));
    if (Number.isInteger(c.itemCount)) l.itemCount = Math.max(1, Math.min(30, c.itemCount));
    if (Number.isInteger(c.bidTime)) l.bidTime = Math.max(10, Math.min(120, c.bidTime));
    l.order.forEach((id) => { l.players[id].coins = l.startCoins; }); // resync capital
    broadcast(io, l); cb?.({ success: true });
  });

  socket.on('auction:leaveLobby', (data, cb) => { const l = get(data); if (l) { const { odId } = data; if (l.socketToPlayer) delete l.socketToPlayer[socket.id]; if (l.players[odId] && l.status === 'waiting') { delete l.players[odId]; l.order = l.order.filter((id) => id !== odId); if (odId === l.hostId) { if (l.order.length) l.hostId = l.order[0]; else { clearT(l); auctionLobbies.delete(l.code); socket.leave(room(l.code)); return cb?.({ success: true }); } } broadcast(io, l); } socket.leave(room(l.code)); } cb?.({ success: true }); });
  socket.on('auction:stopGame', (data, cb) => { const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" }); io.to(room(l.code)).emit('auction:gameEnded', { code: l.code }); clearT(l); auctionLobbies.delete(l.code); cb?.({ success: true }); });

  socket.on('auction:startGame', async (data, cb) => {
    const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" });
    if (l.order.length < MIN_PLAYERS) return cb?.({ success: false, message: `Minimum ${MIN_PLAYERS} joueurs` });
    // Objets : banque admin (R2) en priorité, complétée par des objets génériques si besoin
    let bank = []; try { bank = await db.getRandomAuctionItems(l.itemCount); } catch (e) {}
    let items = (bank || []).map((i) => ({ id: i.id, name: i.name, pv: i.pv, imageUrl: i.imageUrl || null, rarity: i.rarity || null }));
    if (items.length < l.itemCount) items = items.concat(genItems(l.itemCount - items.length));
    l.items = items; l.currentItemIndex = 0;
    l.order.forEach((id) => { l.players[id].coins = l.startCoins; l.players[id].pv = 0; });
    l.status = 'playing'; l.phase = 'intro';
    broadcast(io, l); cb?.({ success: true });
  });
  socket.on('auction:beginPlay', (data, cb) => { const l = get(data); if (!isHost(l, data?.odId)) return cb?.({ success: false }); if (l.phase !== 'intro') return cb?.({ success: false }); startItem(io, l); cb?.({ success: true }); });

  // Mise secrète (phase 'bid')
  socket.on('auction:bid', (data, cb) => {
    const l = get(data); if (!l || l.phase !== 'bid') return cb?.({ success: false });
    const p = l.players[data?.odId]; if (!p) return cb?.({ success: false });
    let amount = parseInt(data.amount, 10); if (!Number.isInteger(amount) || amount < 0) return cb?.({ success: false, message: 'Mise invalide' });
    amount = Math.min(amount, p.coins);
    l.bids[data.odId] = amount;
    if (Object.keys(l.bids).length >= l.order.length) resolveBids(io, l); else broadcast(io, l);
    cb?.({ success: true });
  });

  // Surenchère (phase 'tiebreak') — additionnelle, min 1 sauf all-in, max = pièces restantes
  socket.on('auction:tieBid', (data, cb) => {
    const l = get(data); if (!l || l.phase !== 'tiebreak') return cb?.({ success: false });
    if (!l.tiedPlayers.includes(data?.odId)) return cb?.({ success: false, message: "Vous n'êtes pas en surenchère" });
    if (l.tieBids[data.odId] != null) return cb?.({ success: false, message: 'Déjà misé' });
    const p = l.players[data.odId];
    const maxAdd = (p.coins || 0) - (l.bids[data.odId] || 0);
    let add = parseInt(data.amount, 10); if (!Number.isInteger(add) || add < 0) return cb?.({ success: false });
    if (maxAdd > 0 && add < 1) return cb?.({ success: false, message: 'Surenchère : au moins 1 (impossible de passer)' });
    add = Math.min(add, maxAdd);
    l.tieBids[data.odId] = add;
    if (Object.keys(l.tieBids).length >= l.tiedPlayers.length) resolveTiebreak(io, l); else broadcast(io, l);
    cb?.({ success: true });
  });

  // Objet suivant (hôte)
  socket.on('auction:continue', (data, cb) => { const l = get(data); if (!l || l.phase !== 'result') return cb?.({ success: false }); if (!isHost(l, data?.odId)) return cb?.({ success: false, message: "Réservé à l'hôte" }); continueItem(io, l); cb?.({ success: true }); });
}

module.exports = { register };
