// Configuration de l'application
// Adapté pour le déploiement Vercel + Render

// Détection de l'environnement
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const isProduction = process.env.NODE_ENV === 'production';

// URL de l'API backend (Render en production)
export const API_URL = process.env.REACT_APP_API_URL || 
  (isProduction 
    ? 'https://wilcoquiz-api.onrender.com/api'  // À adapter avec ton URL Render
    : 'http://localhost:3001/api'
  );

// URL du serveur Socket.IO (même que l'API mais sans /api)
export const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 
  (isProduction 
    ? 'https://wilcoquiz-api.onrender.com'  // À adapter avec ton URL Render
    : 'http://localhost:3001'
  );

// URL des médias sur Cloudflare R2
export const MEDIA_URL = process.env.REACT_APP_MEDIA_URL || 
  'https://pub-213740a6c3174eb3973155e21bca5314.r2.dev';

// Intervalle de polling en millisecondes
export const POLL_INTERVAL = parseInt(process.env.REACT_APP_POLL_INTERVAL) || 5000;

// Statuts des quiz
export const STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  FINISHED: 'finished'
};

// Configuration pour le mode debug
export const DEBUG = process.env.REACT_APP_DEBUG === 'true' || isDevelopment;

// Helper pour construire les URLs de médias
export function getMediaUrl(path) {
  // Si c'est déjà une URL complète (R2), la retourner telle quelle
  if (path && path.startsWith('http')) {
    return path;
  }
  // Sinon, construire l'URL relative (pour les avatars locaux, etc.)
  return path;
}

// Log de la configuration au démarrage
if (DEBUG) {
  console.log('🔧 Configuration de l\'application:');
  console.log('  - Environnement:', process.env.NODE_ENV || 'development');
  console.log('  - API URL:', API_URL);
  console.log('  - Socket URL:', SOCKET_URL);
  console.log('  - Media URL:', MEDIA_URL);
  console.log('  - Poll Interval:', POLL_INTERVAL, 'ms');
}
