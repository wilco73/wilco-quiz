/**
 * Routes API pour Meme Templates
 * Gestion des images meme sources
 */

const express = require('express');
const router = express.Router();

let db;

function init(database) {
  db = database;
}

// GET - Tous les templates (admin: inclut inactifs)
router.get('/', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const templates = await db.getAllMemeTemplates(includeInactive);
    res.json({ success: true, templates });
  } catch (error) {
    console.error('[MEME API] Erreur getAllMemeTemplates:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Tous les tags disponibles
router.get('/tags', async (req, res) => {
  try {
    const tags = await db.getAllMemeTags();
    res.json({ success: true, tags });
  } catch (error) {
    console.error('[MEME API] Erreur getAllMemeTags:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Templates par tags
router.get('/by-tags', async (req, res) => {
  try {
    const tags = req.query.tags ? req.query.tags.split(',') : [];
    const templates = await db.getMemeTemplatesByTags(tags);
    res.json({ success: true, templates });
  } catch (error) {
    console.error('[MEME API] Erreur getMemeTemplatesByTags:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Un template par ID
router.get('/:id', async (req, res) => {
  try {
    const template = await db.getMemeTemplateById(req.params.id);
    if (!template) {
      return res.status(404).json({ success: false, message: 'Template non trouvé' });
    }
    res.json({ success: true, template });
  } catch (error) {
    console.error('[MEME API] Erreur getMemeTemplateById:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Créer un template
router.post('/', async (req, res) => {
  try {
    const { title, image_url, tags, preset_zones, width, height } = req.body;
    
    if (!title || !image_url) {
      return res.status(400).json({ success: false, message: 'Titre et URL image requis' });
    }
    
    const template = await db.createMemeTemplate({
      title,
      image_url,
      tags: tags || [],
      preset_zones: preset_zones || [],
      width: width || 800,
      height: height || 800
    });
    
    res.json({ success: true, template });
  } catch (error) {
    console.error('[MEME API] Erreur createMemeTemplate:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT - Mettre à jour un template
router.put('/:id', async (req, res) => {
  try {
    const template = await db.updateMemeTemplate(req.params.id, req.body);
    res.json({ success: true, template });
  } catch (error) {
    console.error('[MEME API] Erreur updateMemeTemplate:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE - Désactiver un template (soft delete)
router.delete('/:id', async (req, res) => {
  try {
    await db.deleteMemeTemplate(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('[MEME API] Erreur deleteMemeTemplate:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// DELETE - Supprimer définitivement un template
router.delete('/:id/hard', async (req, res) => {
  try {
    await db.hardDeleteMemeTemplate(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('[MEME API] Erreur hardDeleteMemeTemplate:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Import en masse de templates
router.post('/import', async (req, res) => {
  try {
    const { templates } = req.body;
    
    if (!templates || !Array.isArray(templates)) {
      return res.status(400).json({ success: false, message: 'Array templates requis' });
    }
    
    const results = [];
    const errors = [];
    
    for (const templateData of templates) {
      try {
        if (!templateData.title || !templateData.image_url) {
          errors.push({ data: templateData, error: 'Titre et URL requis' });
          continue;
        }
        
        const template = await db.createMemeTemplate(templateData);
        results.push(template);
      } catch (err) {
        errors.push({ data: templateData, error: err.message });
      }
    }
    
    res.json({
      success: true,
      imported: results.length,
      failed: errors.length,
      results,
      errors
    });
  } catch (error) {
    console.error('[MEME API] Erreur import:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.init = init;
module.exports = router;
