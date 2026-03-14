/**
 * Routes pour les participants
 */

const express = require('express');
const router = express.Router();
const db = require('../database');

let broadcastGlobalState = null;

// Initialise avec la fonction de broadcast
function init(broadcastFn) {
  broadcastGlobalState = broadcastFn;
}

// Liste des participants
router.get('/', async (req, res) => {
  const participants = (await db.getAllParticipants()).map(p => ({
    ...p,
    password: '********'
  }));
  res.json(participants);
});

// Créer un participant
router.post('/create', async (req, res) => {
  const { pseudo, password, teamName } = req.body;
  
  if (!pseudo || !pseudo.trim()) {
    return res.json({ success: false, message: 'Le pseudo est requis' });
  }
  
  if (!password || password.length < 4) {
    return res.json({ success: false, message: 'Le mot de passe doit contenir au moins 4 caractères' });
  }
  
  const existing = await db.getParticipantByPseudo(pseudo.trim());
  if (existing) {
    return res.json({ success: false, message: 'Ce pseudo existe déjà' });
  }
  
  let teamId = null;
  if (teamName && teamName.trim()) {
    const normalizedTeamName = db.normalizeTeamName(teamName);
    let team = await db.getTeamByName(normalizedTeamName);
    if (!team) {
      team = await db.createTeam(normalizedTeamName);
    }
    teamId = team.id;
  }
  
  const odId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const participant = await db.createParticipant(odId, pseudo.trim(), password, teamId);
  
  if (broadcastGlobalState) await broadcastGlobalState();
  res.json({ success: true, participant });
});

// Modifier un participant
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { teamName, password } = req.body;
  
  const participant = await db.getParticipantById(id);
  if (!participant) {
    return res.json({ success: false, message: 'Participant introuvable' });
  }
  
  if (teamName !== undefined) {
    const normalizedTeamName = db.normalizeTeamName(teamName);
    if (normalizedTeamName) {
      let team = await db.getTeamByName(normalizedTeamName);
      if (!team) {
        team = await db.createTeam(normalizedTeamName);
      }
      await db.updateParticipantTeam(id, team.id);
    } else {
      await db.updateParticipantTeam(id, null);
    }
  }
  
  if (password && password.length >= 4) {
    await db.updateParticipantPassword(id, password);
  }
  
  if (broadcastGlobalState) await broadcastGlobalState();
  res.json({ success: true, participant: await db.getParticipantById(id) });
});

// Supprimer un participant
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  const participant = await db.getParticipantById(id);
  if (!participant) {
    return res.json({ success: false, message: 'Participant introuvable' });
  }
  
  await db.deleteParticipant(id);
  
  if (broadcastGlobalState) await broadcastGlobalState();
  res.json({ success: true });
});

// Changer l'équipe d'un participant
router.put('/:id/team', async (req, res) => {
  const { id } = req.params;
  const { teamName } = req.body;
  
  const participant = await db.getParticipantById(id);
  if (!participant) {
    return res.json({ success: false, message: 'Participant introuvable' });
  }
  
  if (teamName === null || teamName === '') {
    await db.updateParticipantTeam(id, null);
  } else {
    const normalizedTeamName = db.normalizeTeamName(teamName);
    let team = await db.getTeamByName(normalizedTeamName);
    if (!team) {
      team = await db.createTeam(normalizedTeamName);
    }
    await db.updateParticipantTeam(id, team.id);
  }
  
  if (broadcastGlobalState) await broadcastGlobalState();
  res.json({ success: true, participant: await db.getParticipantById(id) });
});

// Changer le mot de passe d'un participant
router.put('/:id/password', async (req, res) => {
  const { id } = req.params;
  const { currentPassword, newPassword } = req.body;
  
  const participant = await db.getParticipantById(id);
  if (!participant) {
    return res.json({ success: false, message: 'Participant introuvable' });
  }
  
  if (!db.verifyPasswordSync(currentPassword, participant.password)) {
    return res.json({ success: false, message: 'Mot de passe actuel incorrect' });
  }
  
  if (!newPassword || newPassword.length < 4) {
    return res.json({ success: false, message: 'Le nouveau mot de passe doit contenir au moins 4 caractères' });
  }
  
  await db.updateParticipantPassword(id, newPassword);
  
  res.json({ success: true, message: 'Mot de passe modifié avec succès' });
});

// Changer l'avatar d'un participant
router.put('/:id/avatar', async (req, res) => {
  const { id } = req.params;
  const { avatar } = req.body;
  
  const participant = await db.getParticipantById(id);
  if (!participant) {
    return res.json({ success: false, message: 'Participant introuvable' });
  }
  
  // Liste des avatars autorisés
  const allowedAvatars = [
    'default', 'cat', 'dog', 'fox', 'owl', 'panda', 'rabbit', 'bear', 'koala', 'lion',
    'tiger', 'wolf', 'penguin', 'monkey', 'elephant', 'giraffe', 'zebra', 'deer', 'squirrel', 'hedgehog',
    'robot', 'alien', 'ghost', 'ninja', 'pirate', 'wizard', 'knight', 'astronaut', 'chef', 'detective'
  ];
  
  if (!allowedAvatars.includes(avatar)) {
    return res.json({ success: false, message: 'Avatar non autorisé' });
  }
  
  const updatedParticipant = await db.updateParticipantAvatar(id, avatar);
  if (broadcastGlobalState) await broadcastGlobalState();
  
  res.json({ 
    success: true, 
    message: 'Avatar mis à jour', 
    participant: { ...updatedParticipant, password: '********' }
  });
});

// Routes alternatives pour compatibilité
router.post('/update', async (req, res) => {
  const { participantId, updates } = req.body;
  
  const participant = await db.getParticipantById(participantId);
  if (!participant) {
    return res.json({ success: false, message: 'Participant introuvable' });
  }
  
  if (updates.teamName !== undefined) {
    const normalizedTeamName = db.normalizeTeamName(updates.teamName);
    if (normalizedTeamName) {
      let team = await db.getTeamByName(normalizedTeamName);
      if (!team) {
        team = await db.createTeam(normalizedTeamName);
      }
      await db.updateParticipantTeam(participantId, team.id);
    } else {
      await db.updateParticipantTeam(participantId, null);
    }
  }
  
  if (broadcastGlobalState) await broadcastGlobalState();
  res.json({ success: true, participant: await db.getParticipantById(participantId) });
});

router.post('/change-password', async (req, res) => {
  const { participantId, currentPassword, newPassword } = req.body;
  
  const participant = await db.getParticipantById(participantId);
  if (!participant) {
    return res.json({ success: false, message: 'Participant introuvable' });
  }
  
  if (!db.verifyPasswordSync(currentPassword, participant.password)) {
    return res.json({ success: false, message: 'Mot de passe actuel incorrect' });
  }
  
  if (!newPassword || newPassword.length < 4) {
    return res.json({ success: false, message: 'Le nouveau mot de passe doit contenir au moins 4 caractères' });
  }
  
  await db.updateParticipantPassword(participantId, newPassword);
  
  res.json({ success: true, message: 'Mot de passe modifié avec succès' });
});

module.exports = router;
module.exports.init = init;
