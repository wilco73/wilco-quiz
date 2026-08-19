/**
 * Routes d'authentification
 */

const express = require('express');
const router = express.Router();
const db = require('../database');

// Configuration serveur
router.get('/config', async (req, res) => {
  res.json({
    serverTime: Date.now(),
    version: '4.0.0',
    features: ['socket.io', 'supabase', 'realtime']
  });
});

// Login admin
router.post('/admin-login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await db.verifyAdmin(username, password);
  if (admin) {
    res.json({ success: true, admin });
  } else {
    res.json({ success: false, message: 'Identifiants incorrects' });
  }
});

function extractTwitch(authUser) {
  if (!authUser) return null;
  const identities = authUser.identities || [];
  const tw = identities.find((i) => i.provider === 'twitch');
  const d = tw?.identity_data || {};
  const m = authUser.user_metadata || {};
  const providers = authUser.app_metadata?.providers || [authUser.app_metadata?.provider];
  if (!tw && !providers.includes('twitch')) return null;
  const twitchId = d.sub || d.provider_id || d.user_id || m.sub || m.provider_id || null;
  if (!twitchId) return null;
  return {
    twitch_user_id: String(twitchId),
    twitch_login: d.nickname || d.preferred_username || d.login || m.nickname || m.preferred_username || null,
    twitch_display_name: d.name || d.full_name || d.nickname || m.name || m.full_name || null,
    twitch_avatar_url: d.picture || d.avatar_url || m.picture || m.avatar_url || null,
  };
}

// Connexion via token Supabase (email/Twitch) — en HTTP (fiable, pas d'ack socket)
router.post('/auth/token', async (req, res) => {
  try {
    const { token } = req.body || {};
    const authUser = await db.verifySupabaseJwt(token);
    if (!authUser) return res.json({ success: false, message: 'Session invalide' });

    const twitch = extractTwitch(authUser);
    let participant = await db.getParticipantByAuthUserId(authUser.id);
    if (!participant) {
      const desired = authUser.user_metadata?.pseudo || twitch?.twitch_display_name || authUser.email?.split('@')[0] || 'Joueur';
      const pseudo = await db.ensureUniquePseudo(desired);
      const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      participant = await db.createAuthParticipant({ id, pseudo, email: authUser.email, authUserId: authUser.id, twitch });
    } else if (twitch?.twitch_user_id && participant.twitch?.id !== twitch.twitch_user_id) {
      await db.updateParticipantTwitch(participant.id, twitch);
      participant = await db.getParticipantById(participant.id);
    }
    if (participant.status === 'banned' || participant.status === 'blocked') {
      return res.json({ success: false, message: 'Compte bloqué', banned: true });
    }
    const user = { ...participant, isAdmin: db.isAdmin(participant.role), isSuperAdmin: db.isSuperAdmin(participant.role) };
    res.json({ success: true, user });
  } catch (e) {
    console.error('[AUTH /token]', e.message);
    res.json({ success: false, message: 'Erreur serveur' });
  }
});

module.exports = router;
