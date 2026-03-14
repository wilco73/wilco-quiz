/**
 * Handlers Socket.IO pour l'authentification
 * Version 2.0 - Login unifié avec gestion des rôles
 */

const db = require('../database');
const { connectedParticipants, participantSockets } = require('../utils/state');
const { broadcastGlobalState } = require('../utils/broadcast');

function register(socket, io) {
  
  /**
   * Login unifié - Plus besoin de mode "admin" séparé
   * Le rôle est déterminé par la colonne 'role' du participant
   */
  socket.on('auth:login', async (data, callback) => {
    const { pseudo, password } = data;
    
    // Vérifier si le participant existe
    const existingParticipant = await db.getParticipantByPseudo(pseudo);
    
    if (existingParticipant) {
      // Vérifier le mot de passe
      if (!await db.verifyParticipantPassword(pseudo, password)) {
        callback({ success: false, message: 'Mot de passe incorrect' });
        return;
      }
      
      // Connexion réussie
      connectedParticipants.set(socket.id, { odId: existingParticipant.id, pseudo });
      
      if (!participantSockets.has(existingParticipant.id)) {
        participantSockets.set(existingParticipant.id, new Set());
      }
      participantSockets.get(existingParticipant.id).add(socket.id);
      
      // Ajouter les flags de permissions pour le frontend
      const user = {
        ...existingParticipant,
        isAdmin: db.isAdmin(existingParticipant.role),
        isSuperAdmin: db.isSuperAdmin(existingParticipant.role)
      };
      
      console.log(`[AUTH] Connexion: "${pseudo}" (rôle: ${existingParticipant.role})`);
      
      callback({ success: true, user });
      return;
    }
    
    // Créer nouveau participant avec rôle 'user' par défaut
    const odId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newParticipant = await db.createParticipant(odId, pseudo, password, null, 'default', 'user');
    
    connectedParticipants.set(socket.id, { odId, pseudo });
    if (!participantSockets.has(odId)) {
      participantSockets.set(odId, new Set());
    }
    participantSockets.get(odId).add(socket.id);
    
    console.log(`[AUTH] Nouveau participant: "${pseudo}" (rôle: user)`);
    
    // Notifier tout le monde du nouveau participant
    await broadcastGlobalState(io);
    
    const user = {
      ...newParticipant,
      isAdmin: false,
      isSuperAdmin: false
    };
    
    callback({ success: true, user, isNew: true });
  });
  
  /**
   * Confirmation de changement d'équipe
   */
  socket.on('auth:confirmTeamChange', async (data, callback) => {
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
    }
    
    await db.updateParticipantTeam(odId, team.id);
    const updatedParticipant = await db.getParticipantById(odId);
    
    console.log(`[AUTH] Changement d'équipe: "${participant.pseudo}" -> "${normalizedTeamName}"`);
    
    await broadcastGlobalState(io);
    
    const user = {
      ...updatedParticipant,
      isAdmin: db.isAdmin(updatedParticipant.role),
      isSuperAdmin: db.isSuperAdmin(updatedParticipant.role)
    };
    
    callback({ success: true, user });
  });
  
  /**
   * Mise à jour du rôle d'un participant (superadmin uniquement)
   */
  socket.on('auth:updateRole', async (data, callback) => {
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
    
    try {
      const updatedParticipant = await db.updateParticipantRole(targetId, newRole);
      console.log(`[AUTH] Rôle modifié: "${updatedParticipant.pseudo}" -> ${newRole} (par ${requester.pseudo})`);
      
      await broadcastGlobalState(io);
      callback({ success: true, participant: updatedParticipant });
    } catch (error) {
      callback({ success: false, message: error.message });
    }
  });
  
  /**
   * Récupérer les infos de l'utilisateur connecté (refresh)
   */
  socket.on('auth:getUser', async (data, callback) => {
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
  });
  
  /**
   * Récupérer tous les utilisateurs (superadmin only)
   */
  socket.on('auth:getAllUsers', async (data, callback) => {
    console.log('[AUTH] auth:getAllUsers appelé avec:', data);
    
    // Vérifier que callback est une fonction
    if (typeof callback !== 'function') {
      console.error('[AUTH] auth:getAllUsers - callback n\'est pas une fonction');
      return;
    }
    
    try {
      const { requesterId } = data || {};
      
      if (!requesterId) {
        console.log('[AUTH] auth:getAllUsers - requesterId manquant');
        callback({ success: false, message: 'requesterId manquant' });
        return;
      }
      
      // Vérifier que le demandeur est superadmin
      const requester = await db.getParticipantById(requesterId);
      console.log('[AUTH] auth:getAllUsers - requester:', requester?.pseudo, requester?.role);
      
      if (!requester || !db.isSuperAdmin(requester.role)) {
        console.log('[AUTH] auth:getAllUsers - Permission refusée');
        callback({ success: false, message: 'Permission refusée' });
        return;
      }
      
      const participants = await db.getAllParticipants();
      console.log('[AUTH] auth:getAllUsers - participants récupérés:', participants?.length);
      
      callback({ success: true, users: participants || [] });
    } catch (error) {
      console.error('[AUTH] auth:getAllUsers - Erreur:', error);
      if (typeof callback === 'function') {
        callback({ success: false, message: error.message || 'Erreur serveur' });
      }
    }
  });
}

module.exports = { register };
