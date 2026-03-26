/**
 * Routes pour les équipes
 */

const express = require('express');
const router = express.Router();
const db = require('../database');

let broadcastFunctions = null;

// Initialise avec les fonctions de broadcast
function init(broadcasts) {
  broadcastFunctions = broadcasts;
}

// Liste des équipes
router.get('/', async (req, res) => {
  res.json(await db.getAllTeams());
});

// Créer une équipe
router.post('/create', async (req, res) => {
  const { name } = req.body;
  
  if (!name || !name.trim()) {
    return res.json({ success: false, message: 'Le nom de l\'équipe est requis' });
  }
  
  const normalizedName = db.normalizeTeamName(name);
  const existing = await db.getTeamByName(normalizedName);
  if (existing) {
    return res.json({ success: false, message: 'Une équipe avec ce nom existe déjà' });
  }
  
  const team = await db.createTeam(normalizedName);
  
  if (broadcastFunctions?.teams) await broadcastFunctions.teams();
  res.json({ success: true, team: await db.getTeamById(team.id) });
});

// Modifier le score d'une équipe dans une catégorie
router.put('/:id/score', async (req, res) => {
  const { id } = req.params;
  const { category, score } = req.body;
  
  const team = await db.getTeamById(parseInt(id));
  if (!team) {
    return res.json({ success: false, message: 'Équipe introuvable' });
  }
  
  if (category === undefined || score === undefined) {
    return res.json({ success: false, message: 'Catégorie et score requis' });
  }
  
  await db.setTeamScoreByCategory(team.id, category, parseInt(score));
  
  if (broadcastFunctions?.teams) await broadcastFunctions.teams();
  res.json({ success: true, team: await db.getTeamById(team.id) });
});

// Supprimer une catégorie de score pour une équipe
router.delete('/:id/score/:category', async (req, res) => {
  const { id, category } = req.params;
  
  const team = await db.getTeamById(parseInt(id));
  if (!team) {
    return res.json({ success: false, message: 'Équipe introuvable' });
  }
  
  await db.deleteTeamScoreCategory(team.id, decodeURIComponent(category));
  
  if (broadcastFunctions?.teams) await broadcastFunctions.teams();
  res.json({ success: true, team: await db.getTeamById(team.id) });
});

// Modifier une équipe (DEPRECATED - garder pour compatibilité)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { score, scoresByCategory } = req.body;
  
  const team = await db.getTeamById(parseInt(id));
  if (!team) {
    return res.json({ success: false, message: 'Équipe introuvable' });
  }
  
  // Nouveau format : scoresByCategory
  if (scoresByCategory) {
    for (const [category, catScore] of Object.entries(scoresByCategory)) {
      await db.setTeamScoreByCategory(team.id, category, parseInt(catScore));
    }
  }
  
  if (broadcastFunctions?.teams) await broadcastFunctions.teams();
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
  
  // Équipe supprimée + participants potentiellement affectés
  if (broadcastFunctions?.teams) await broadcastFunctions.teams();
  if (affectedCount > 0 && broadcastFunctions?.participants) await broadcastFunctions.participants();
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
  
  if (broadcastFunctions?.teams) await broadcastFunctions.teams();
  res.json({ success: true });
});

module.exports = router;
module.exports.init = init;
