/**
 * Routes API pour Game Settings
 * Gestion de la configuration des jeux (activation, permissions, ordre)
 */

const express = require('express');
const router = express.Router();

const db = require('../database');

// GET - Tous les jeux (admin)
router.get('/', async (req, res) => {
  try {
    const games = await db.getAllGameSettings();
    res.json({ success: true, games });
  } catch (error) {
    console.error('[GAME SETTINGS API] Erreur getAllGameSettings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Jeux activés uniquement (pour les joueurs)
router.get('/enabled', async (req, res) => {
  try {
    const games = await db.getEnabledGameSettings();
    res.json({ success: true, games });
  } catch (error) {
    console.error('[GAME SETTINGS API] Erreur getEnabledGameSettings:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Un jeu par ID
router.get('/:id', async (req, res) => {
  try {
    const game = await db.getGameSettingById(req.params.id);
    if (!game) {
      return res.status(404).json({ success: false, message: 'Jeu non trouvé' });
    }
    res.json({ success: true, game });
  } catch (error) {
    console.error('[GAME SETTINGS API] Erreur getGameSettingById:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT - Mettre à jour un jeu
router.put('/:id', async (req, res) => {
  try {
    const { is_enabled, is_beta, create_permission, name, description, icon } = req.body;
    
    const updates = {};
    if (is_enabled !== undefined) updates.is_enabled = is_enabled;
    if (is_beta !== undefined) updates.is_beta = is_beta;
    if (create_permission !== undefined) updates.create_permission = create_permission;
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (icon !== undefined) updates.icon = icon;
    
    const game = await db.updateGameSetting(req.params.id, updates);
    res.json({ success: true, game });
  } catch (error) {
    console.error('[GAME SETTINGS API] Erreur updateGameSetting:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT - Mettre à jour l'ordre des jeux
router.put('/order/update', async (req, res) => {
  try {
    const { orderedIds } = req.body;
    
    if (!orderedIds || !Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: 'orderedIds requis' });
    }
    
    const games = await db.updateGameSettingsOrder(orderedIds);
    res.json({ success: true, games });
  } catch (error) {
    console.error('[GAME SETTINGS API] Erreur updateGameSettingsOrder:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Vérifier si un utilisateur peut créer un lobby
router.post('/can-create', async (req, res) => {
  try {
    const { gameId, userRole } = req.body;
    
    if (!gameId) {
      return res.status(400).json({ success: false, message: 'gameId requis' });
    }
    
    const result = await db.canCreateGameLobby(gameId, userRole || 'user');
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('[GAME SETTINGS API] Erreur canCreateGameLobby:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
