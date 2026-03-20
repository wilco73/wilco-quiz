/**
 * Routes pour la médiathèque et le système de broadcast
 */

const express = require('express');
const router = express.Router();
const db = require('../database');

let broadcastFunctions = null;
let io = null;

// Initialise avec les fonctions de broadcast et Socket.IO
function init(broadcasts, socketIo) {
  broadcastFunctions = broadcasts;
  io = socketIo;
}

// ==================== MEDIA LIBRARY ====================

// Liste des médias avec pagination et recherche
router.get('/', async (req, res) => {
  try {
    const { 
      search = '', 
      type = '', 
      tag = '',
      page = 1, 
      limit = 20 
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const result = await db.searchMedia(search, type, tag, parseInt(limit), offset);
    
    res.json({
      success: true,
      media: result.media,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.total,
        totalPages: Math.ceil(result.total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('[MEDIA] Erreur liste:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Récupérer un média par ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const media = await db.getMediaById(id);
    
    if (!media) {
      return res.status(404).json({ success: false, message: 'Média introuvable' });
    }
    
    res.json({ success: true, media });
  } catch (error) {
    console.error('[MEDIA] Erreur get:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Créer un nouveau média
router.post('/', async (req, res) => {
  try {
    const { name, type, url, thumbnailUrl, tags, durationSeconds, fileSize, createdBy } = req.body;
    
    if (!name || !type || !url) {
      return res.status(400).json({ success: false, message: 'name, type et url sont requis' });
    }
    
    if (!['image', 'video', 'audio'].includes(type)) {
      return res.status(400).json({ success: false, message: 'type doit être image, video ou audio' });
    }
    
    const media = await db.createMedia({
      name,
      type,
      url,
      thumbnailUrl,
      tags: tags || [],
      durationSeconds,
      fileSize,
      createdBy
    });
    
    res.json({ success: true, media });
  } catch (error) {
    console.error('[MEDIA] Erreur création:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Modifier un média
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, tags, thumbnailUrl } = req.body;
    
    const media = await db.updateMedia(id, { name, tags, thumbnailUrl });
    
    if (!media) {
      return res.status(404).json({ success: false, message: 'Média introuvable' });
    }
    
    res.json({ success: true, media });
  } catch (error) {
    console.error('[MEDIA] Erreur modification:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Supprimer un média
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.deleteMedia(id);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[MEDIA] Erreur suppression:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== GRID MEDIA (liaison grille ↔ médias) ====================

// Liste des médias d'une grille
router.get('/grid/:gridId', async (req, res) => {
  try {
    const { gridId } = req.params;
    const media = await db.getGridMedia(gridId);
    
    res.json({ success: true, media });
  } catch (error) {
    console.error('[MEDIA] Erreur grid media:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Ajouter un média à une grille
router.post('/grid/:gridId', async (req, res) => {
  try {
    const { gridId } = req.params;
    const { mediaId, sortOrder } = req.body;
    
    if (!mediaId) {
      return res.status(400).json({ success: false, message: 'mediaId est requis' });
    }
    
    await db.addMediaToGrid(gridId, mediaId, sortOrder);
    const media = await db.getGridMedia(gridId);
    
    res.json({ success: true, media });
  } catch (error) {
    console.error('[MEDIA] Erreur ajout grid media:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Retirer un média d'une grille
router.delete('/grid/:gridId/:mediaId', async (req, res) => {
  try {
    const { gridId, mediaId } = req.params;
    
    await db.removeMediaFromGrid(gridId, mediaId);
    
    res.json({ success: true });
  } catch (error) {
    console.error('[MEDIA] Erreur suppression grid media:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ==================== BROADCAST ====================

// Envoyer un broadcast (via HTTP pour compatibilité, mais préférer WebSocket)
router.post('/broadcast', async (req, res) => {
  try {
    const { 
      lobbyId, 
      lobbyType = 'global',
      senderId, 
      senderPseudo,
      message, 
      mediaId,
      options = {}
    } = req.body;
    
    if (!senderId || !senderPseudo) {
      return res.status(400).json({ success: false, message: 'senderId et senderPseudo sont requis' });
    }
    
    if (!message && !mediaId) {
      return res.status(400).json({ success: false, message: 'message ou mediaId requis' });
    }
    
    // Récupérer le média si fourni
    let media = null;
    if (mediaId) {
      media = await db.getMediaById(mediaId);
      if (!media) {
        return res.status(404).json({ success: false, message: 'Média introuvable' });
      }
    }
    
    // Sauvegarder dans l'historique
    const broadcast = await db.saveBroadcast({
      lobbyId,
      lobbyType,
      senderId,
      senderPseudo,
      message,
      mediaId,
      options
    });
    
    // Émettre via Socket.IO
    const broadcastData = {
      id: broadcast.id,
      message,
      media,
      senderPseudo,
      options,
      timestamp: broadcast.created_at
    };
    
    if (io) {
      if (lobbyId && lobbyType !== 'global') {
        // Broadcast ciblé vers un lobby
        const roomName = lobbyType === 'mystery' ? `mystery:${lobbyId}` : `lobby:${lobbyId}`;
        io.to(roomName).emit('broadcast:received', broadcastData);
        console.log(`[BROADCAST] Envoyé à ${roomName}:`, message || media?.name);
      } else {
        // Broadcast global
        io.emit('broadcast:received', broadcastData);
        console.log('[BROADCAST] Envoyé à tous:', message || media?.name);
      }
    }
    
    res.json({ success: true, broadcast: broadcastData });
  } catch (error) {
    console.error('[BROADCAST] Erreur:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Historique des broadcasts d'un lobby
router.get('/broadcast/history/:lobbyId', async (req, res) => {
  try {
    const { lobbyId } = req.params;
    const { limit = 20 } = req.query;
    
    const history = await db.getBroadcastHistory(lobbyId, parseInt(limit));
    
    res.json({ success: true, history });
  } catch (error) {
    console.error('[BROADCAST] Erreur historique:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
module.exports.init = init;
