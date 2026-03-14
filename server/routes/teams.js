/**
 * Routes pour les équipes
 */

const express = require('express');
const router = express.Router();
const db = require('../database');

let broadcastGlobalState = null;

// Initialise avec la fonction de broadcast
function init(broadcastFn) {
  broadcastGlobalState = broadcastFn;
}

// Liste des équipes
router.get('/', async (req, res) => {
  res.json(await db.getAllTeams());
});

// Créer une équipe
router.post('/create', async (req, res) => {
  const { name, score } = req.body;
  
  if (!name || !name.trim()) {
    return res.json({ success: false, message: 'Le nom de l\'équipe est requis' });
  }
  
  const normalizedName = db.normalizeTeamName(name);
  const existing = await db.getTeamByName(normalizedName);
  if (existing) {
    return res.json({ success: false, message: 'Une équipe avec ce nom existe déjà' });
  }
  
  const team = await db.createTeam(normalizedName);
  if (score !== undefined && score > 0) {
    await db.updateTeamScore(team.id, score);
  }
  
  if (broadcastGlobalState) await broadcastGlobalState();
  res.json({ success: true, team: await db.getTeamById(team.id) });
});

// Modifier une équipe
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { score } = req.body;
  
  const team = await db.getTeamById(parseInt(id));
  if (!team) {
    return res.json({ success: false, message: 'Équipe introuvable' });
  }
  
  if (score !== undefined) {
    await db.updateTeamScore(team.id, parseInt(score));
  }
  
  if (broadcastGlobalState) await broadcastGlobalState();
  res.json({ success: true, team: await db.getTeamById(team.id) });
});

// Supprimer une équipe (via POST pour compatibilité)
router.post('/delete', async (req, res) => {
  const { teamName } = req.body;
  
  const team = await db.getTeamByName(teamName);
  if (!team) {
    return res.json({ success: false, message: 'Équipe introuvable' });
  }
  
  const participants = await db.getAllParticipants();
  const affectedCount = participants.filter(p => p.teamId === team.id).length;
  
  await db.deleteTeam(team.id);
  
  if (broadcastGlobalState) await broadcastGlobalState();
  res.json({ success: true, affectedCount });
});

// Route alternative pour supprimer
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  const team = await db.getTeamById(parseInt(id));
  if (!team) {
    return res.json({ success: false, message: 'Équipe introuvable' });
  }
  
  await db.deleteTeam(team.id);
  
  if (broadcastGlobalState) await broadcastGlobalState();
  res.json({ success: true });
});

module.exports = router;
module.exports.init = init;
