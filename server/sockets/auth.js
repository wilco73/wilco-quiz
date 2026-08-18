/**
 * Handlers Socket.IO pour l'authentification
 * Version 2.1 - Login unifié avec gestion des rôles et meilleure gestion d'erreurs
 */

const db = require('../database');
const { connectedParticipants, participantSockets } = require('../utils/state');
const { broadcastParticipantsUpdate, broadcastTeamsUpdate } = require('../utils/broadcast');

function register(socket, io) {
  
  /**
   * Login unifié - Plus besoin de mode "admin" séparé
   * Le rôle est déterminé par la colonne 'role' du participant
   */
  socket.on('auth:login', async (data, callback) => {
    try {
      const { pseudo, password } = data;
      const existing = await db.getParticipantByPseudo(pseudo);
      if (!existing) return callback({ success: false, message: 'Compte introuvable' });
      if (!await db.verifyParticipantPassword(pseudo, password)) {
        return callback({ success: false, message: 'Mot de passe incorrect' });
      }
      if (existing.status === 'banned' || existing.status === 'blocked') {
        return callback({ success: false, message: 'Compte bloqué' });
      }
      connectedParticipants.set(socket.id, { odId: existing.id, pseudo });
      if (!participantSockets.has(existing.id)) participantSockets.set(existing.id, new Set());
      participantSockets.get(existing.id).add(socket.id);
      const user = { ...existing, isAdmin: db.isAdmin(existing.role), isSuperAdmin: db.isSuperAdmin(existing.role) };
      callback({ success: true, user });
    } catch (error) {
      console.error('[AUTH:LOGIN]', error.message);
      callback({ success: false, message: 'Erreur serveur' });
    }
  });

  socket.on('auth:loginWithToken', async (data, callback) => {
    try {
      const { token } = data || {};
      const authUser = await db.verifySupabaseJwt(token);
      if (!authUser) return callback({ success: false, message: 'Session invalide' });

      let participant = await db.getParticipantByAuthUserId(authUser.id);
      if (!participant) {
        // 1re connexion d'un compte Supabase -> création du profil
        const desired = authUser.user_metadata?.pseudo || authUser.email?.split('@')[0] || 'Joueur';
        const pseudo = await db.ensureUniquePseudo(desired);
        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        participant = await db.createAuthParticipant({ id, pseudo, email: authUser.email, authUserId: authUser.id });
      }
      if (participant.status === 'banned' || participant.status === 'blocked') {
        return callback({ success: false, message: 'Compte bloqué', banned: true });
      }

      connectedParticipants.set(socket.id, { odId: participant.id, pseudo: participant.pseudo });
      if (!participantSockets.has(participant.id)) participantSockets.set(participant.id, new Set());
      participantSockets.get(participant.id).add(socket.id);

      const user = { ...participant, isAdmin: db.isAdmin(participant.role), isSuperAdmin: db.isSuperAdmin(participant.role) };
      callback({ success: true, user });
    } catch (error) {
      console.error('[AUTH:TOKEN]', error.message);
      callback({ success: false, message: 'Erreur serveur' });
    }
  });

  socket.on('auth:completeAccount', async (data, callback) => {
    try {
      const { odId, currentPassword, email, password } = data || {};
      if (!odId || !currentPassword) return callback({ success: false, message: 'Reconnectez-vous pour compléter votre compte' });
      if (!email) return callback({ success: false, message: 'Email requis' });

      const participant = await db.getParticipantByIdWithSecret
        ? await db.getParticipantById(odId)
        : await db.getParticipantById(odId);
      if (!participant) return callback({ success: false, message: 'Compte introuvable' });

      // Ré-authentifier l'action avec le mot de passe legacy actuel (le socket peut ne pas être ré-identifié après un reload)
      const okPwd = await db.verifyParticipantPassword(participant.pseudo, currentPassword);
      if (!okPwd) return callback({ success: false, message: 'Mot de passe actuel incorrect' });

      // (ré)enregistre la présence socket au passage
      connectedParticipants.set(socket.id, { odId: participant.id, pseudo: participant.pseudo });

      // Déjà complété -> on renvoie simplement l'utilisateur à jour
      if (participant.authUserId) {
        const user = { ...participant, isAdmin: db.isAdmin(participant.role), isSuperAdmin: db.isSuperAdmin(participant.role) };
        return callback({ success: true, user });
      }

      const finalPassword = (password && password.length >= 6) ? password : currentPassword;
      let authUser;
      try {
        authUser = await db.createAuthUser({ email: email.trim(), password: finalPassword, pseudo: participant.pseudo, emailConfirm: true });
      } catch (e) {
        const msg = /already|exists|registered/i.test(e.message) ? 'Cet email est déjà utilisé' : 'Impossible de créer le compte';
        return callback({ success: false, message: msg });
      }

      const updated = await db.linkParticipantAuth(participant.id, { authUserId: authUser.id, email: email.trim() });
      const user = { ...updated, isAdmin: db.isAdmin(updated.role), isSuperAdmin: db.isSuperAdmin(updated.role) };
      callback({ success: true, user });
    } catch (error) {
      console.error('[AUTH:COMPLETE]', error.message);
      callback({ success: false, message: 'Erreur serveur' });
    }
  });
  
  /**
   * Confirmation de changement d'équipe
   */
  socket.on('auth:confirmTeamChange', async (data, callback) => {
    try {
      const { odId, newTeamName } = data;
      
      const participant = await db.getParticipantById(odId);
      if (!participant) {
        callback({ success: false, message: 'Participant introuvable' });
        return;
      }
      
      const normalizedTeamName = db.normalizeTeamName(newTeamName);
      let team = await db.getTeamByName(normalizedTeamName);
      if (!team) {
        team = await db.createTeam(normalizedTeamName);
        // Nouvelle équipe créée, mettre à jour la liste (avec debounce)
        broadcastTeamsUpdate(io);
      }
      
      await db.updateParticipantTeam(odId, team.id);
      const updatedParticipant = await db.getParticipantById(odId);
      
      console.log(`[AUTH] Changement d'équipe: "${participant.pseudo}" -> "${normalizedTeamName}"`);
      
      // Mettre à jour participants (avec debounce)
      broadcastParticipantsUpdate(io);
      
      const user = {
        ...updatedParticipant,
        isAdmin: db.isAdmin(updatedParticipant.role),
        isSuperAdmin: db.isSuperAdmin(updatedParticipant.role)
      };
      
      callback({ success: true, user });
    } catch (error) {
      console.error('[AUTH:TEAM_CHANGE] Erreur:', error.message);
      callback({ success: false, message: 'Erreur lors du changement d\'équipe: ' + error.message });
    }
  });
  
  /**
   * Mise à jour du rôle d'un participant (superadmin uniquement)
   */
  socket.on('auth:updateRole', async (data, callback) => {
    try {
      const { requesterId, targetId, newRole } = data;
      
      // Vérifier que le demandeur est superadmin
      const requester = await db.getParticipantById(requesterId);
      if (!requester || !db.isSuperAdmin(requester.role)) {
        callback({ success: false, message: 'Permission refusée' });
        return;
      }
      
      // Empêcher de modifier son propre rôle
      if (requesterId === targetId) {
        callback({ success: false, message: 'Vous ne pouvez pas modifier votre propre rôle' });
        return;
      }
      
      // Empêcher de créer un autre superadmin
      if (newRole === 'superadmin') {
        callback({ success: false, message: 'Il ne peut y avoir qu\'un seul superadmin' });
        return;
      }
      
      const updatedParticipant = await db.updateParticipantRole(targetId, newRole);
      console.log(`[AUTH] Rôle modifié: "${updatedParticipant.pseudo}" -> ${newRole} (par ${requester.pseudo})`);
      
      broadcastParticipantsUpdate(io);
      callback({ success: true, participant: updatedParticipant });
    } catch (error) {
      console.error('[AUTH:UPDATE_ROLE] Erreur:', error.message);
      callback({ success: false, message: error.message });
    }
  });
  
  /**
   * Récupérer les infos de l'utilisateur connecté (refresh)
   */
  socket.on('auth:getUser', async (data, callback) => {
    try {
      const { odId } = data;
      
      const participant = await db.getParticipantById(odId);
      if (!participant) {
        callback({ success: false, message: 'Utilisateur introuvable' });
        return;
      }
      
      const user = {
        ...participant,
        isAdmin: db.isAdmin(participant.role),
        isSuperAdmin: db.isSuperAdmin(participant.role)
      };
      
      callback({ success: true, user });
    } catch (error) {
      console.error('[AUTH:GET_USER] Erreur:', error.message);
      callback({ success: false, message: 'Erreur serveur' });
    }
  });
  
  /**
   * Récupérer tous les utilisateurs (superadmin only)
   */
  socket.on('auth:getAllUsers', async (data, callback) => {
    // Vérifier que callback est une fonction
    if (typeof callback !== 'function') {
      console.error('[AUTH] auth:getAllUsers - callback n\'est pas une fonction');
      return;
    }
    
    try {
      const { requesterId } = data || {};
      
      if (!requesterId) {
        callback({ success: false, message: 'requesterId manquant' });
        return;
      }
      
      // Vérifier que le demandeur est superadmin
      const requester = await db.getParticipantById(requesterId);
      
      if (!requester || !db.isSuperAdmin(requester.role)) {
        callback({ success: false, message: 'Permission refusée' });
        return;
      }
      
      const participants = await db.getAllParticipants();
      callback({ success: true, users: participants || [] });
    } catch (error) {
      console.error('[AUTH:GET_ALL_USERS] Erreur:', error.message);
      callback({ success: false, message: error.message || 'Erreur serveur' });
    }
  });
}

module.exports = { register };
