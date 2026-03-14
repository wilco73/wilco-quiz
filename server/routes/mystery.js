/**
 * Routes API pour Mystery Grid (Case Mystère)
 */

const express = require('express');
const router = express.Router();
const db = require('../database');

// ==================== GRILLES ====================

// GET - Toutes les grilles
router.get('/grids', async (req, res) => {
  try {
    const grids = await db.getAllMysteryGrids();
    res.json({ success: true, grids });
  } catch (error) {
    console.error('[MYSTERY API] Erreur getAllMysteryGrids:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Une grille par ID
router.get('/grids/:id', async (req, res) => {
  try {
    const grid = await db.getMysteryGridById(req.params.id);
    if (!grid) {
      return res.status(404).json({ success: false, message: 'Grille non trouvée' });
    }
    res.json({ success: true, grid });
  } catch (error) {
    console.error('[MYSTERY API] Erreur getMysteryGridById:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Créer une grille
router.post('/grids', async (req, res) => {
  try {
    const { title, gridSize, defaultSoundUrl, thumbnailDefault } = req.body;
    
    if (!title || !gridSize) {
      return res.status(400).json({ success: false, message: 'Titre et taille requis' });
    }
    
    const grid = await db.createMysteryGrid({
      title,
      gridSize: parseInt(gridSize),
      defaultSoundUrl,
      thumbnailDefault
    });
    
    res.json({ success: true, grid });
  } catch (error) {
    console.error('[MYSTERY API] Erreur createMysteryGrid:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT - Mettre à jour une grille
router.put('/grids/:id', async (req, res) => {
  try {
    const grid = await db.updateMysteryGrid(req.params.id, req.body);
    res.json({ success: true, grid });
  } catch (error) {
    console.error('[MYSTERY API] Erreur updateMysteryGrid:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE - Supprimer une grille
router.delete('/grids/:id', async (req, res) => {
  try {
    await db.deleteMysteryGrid(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('[MYSTERY API] Erreur deleteMysteryGrid:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== TYPES DE CASES ====================

// GET - Types d'une grille
router.get('/grids/:gridId/types', async (req, res) => {
  try {
    const types = await db.getMysteryGridTypes(req.params.gridId);
    res.json({ success: true, types });
  } catch (error) {
    console.error('[MYSTERY API] Erreur getMysteryGridTypes:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Créer un type de case
router.post('/grids/:gridId/types', async (req, res) => {
  try {
    const { name, imageUrl, thumbnailUrl, soundUrl, occurrence } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, message: 'Nom requis' });
    }
    
    const type = await db.createMysteryGridType(req.params.gridId, {
      name,
      imageUrl,
      thumbnailUrl,
      soundUrl,
      occurrence: parseInt(occurrence) || 1
    });
    
    res.json({ success: true, type });
  } catch (error) {
    console.error('[MYSTERY API] Erreur createMysteryGridType:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT - Mettre à jour un type de case
router.put('/types/:id', async (req, res) => {
  try {
    const type = await db.updateMysteryGridType(req.params.id, req.body);
    res.json({ success: true, type });
  } catch (error) {
    console.error('[MYSTERY API] Erreur updateMysteryGridType:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE - Supprimer un type de case
router.delete('/types/:id', async (req, res) => {
  try {
    await db.deleteMysteryGridType(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('[MYSTERY API] Erreur deleteMysteryGridType:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== LOBBIES ====================

// GET - Tous les lobbies
router.get('/lobbies', async (req, res) => {
  try {
    const lobbies = await db.getAllMysteryLobbies();
    res.json({ success: true, lobbies });
  } catch (error) {
    console.error('[MYSTERY API] Erreur getAllMysteryLobbies:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Un lobby par ID
router.get('/lobbies/:id', async (req, res) => {
  try {
    const lobby = await db.getMysteryLobbyById(req.params.id);
    if (!lobby) {
      return res.status(404).json({ success: false, message: 'Lobby non trouvé' });
    }
    res.json({ success: true, lobby });
  } catch (error) {
    console.error('[MYSTERY API] Erreur getMysteryLobbyById:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
