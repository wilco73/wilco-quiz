/**
 * Handlers Socket.IO pour l'authentification
 */

const db = require('../database');
const { connectedParticipants, participantSockets } = require('../utils/state');
const { broadcastGlobalState } = require('../utils/broadcast');

function register(socket, io) {
  
  // Login (admin ou participant)
  socket.on('auth:login', async (data, callback) => {
    const { teamName, pseudo, password, isAdmin } = data;
    
    if (isAdmin) {
      const admin = await db.verifyAdmin(pseudo, password);
      if (admin) {
        callback({ success: true, user: { ...admin, isAdmin: true } });
      } else {
        callback({ success: false, message: 'Identifiants admin incorrects' });
      }
      return;
    }
    
    // Login participant
    const existingParticipant = await db.getParticipantByPseudo(pseudo);
    
    if (existingParticipant) {
      if (!await db.verifyParticipantPassword(pseudo, password)) {
        callback({ success: false, message: 'Ce pseudo existe avec un mot de passe différent' });
        return;
      }
      
      // Connexion réussie - on garde l'équipe existante du participant
      connectedParticipants.set(socket.id, { odId: existingParticipant.id, pseudo });
      
      if (!participantSockets.has(existingParticipant.id)) {
        participantSockets.set(existingParticipant.id, new Set());
      }
      participantSockets.get(existingParticipant.id).add(socket.id);
      
      callback({ success: true, user: existingParticipant });
      return;
    }
    
    // Créer nouveau participant SANS équipe
    const odId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newParticipant = await db.createParticipant(odId, pseudo, password, null);
    
    connectedParticipants.set(socket.id, { odId, pseudo });
    if (!participantSockets.has(odId)) {
      participantSockets.set(odId, new Set());
    }
    participantSockets.get(odId).add(socket.id);
    
    console.log(`[AUTH] Nouveau participant: "${pseudo}" (sans équipe)`);
    
    // Notifier tout le monde du nouveau participant
    await broadcastGlobalState(io);
    
    callback({ success: true, user: newParticipant, isNew: true });
  });
  
  // Confirmation de changement d'équipe
  socket.on('auth:confirmTeamChange', async (data, callback) => {
    const { odId, newTeamName, password } = data;
    
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
    callback({ success: true, user: updatedParticipant });
  });
}

module.exports = { register };
