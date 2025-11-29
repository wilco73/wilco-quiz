// Configuration de l'application

// Détection de l'environnement
const isDevelopment = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
const isProduction = process.env.NODE_ENV === 'production';

// Configuration de l'URL de l'API
// En production, utilise l'URL actuelle du navigateur
// En développement, utilise localhost avec le port spécifié
export const API_URL = process.env.REACT_APP_API_URL || 
  (isProduction 
    ? `${window.location.protocol}//${window.location.hostname}:${window.location.port}/api`
    : 'http://localhost:3001/api'
  );

// Intervalle de polling en millisecondes
export const POLL_INTERVAL = parseInt(process.env.REACT_APP_POLL_INTERVAL) || 1000;

// Statuts des quiz
export const STATUS = {
  WAITING: 'waiting',
  PLAYING: 'playing',
  FINISHED: 'finished'
};

// Configuration pour le mode debug
export const DEBUG = process.env.REACT_APP_DEBUG === 'true' || isDevelopment;

// Log de la configuration au démarrage
if (DEBUG) {
  console.log('🔧 Configuration de l\'application:');
  console.log('  - Environnement:', process.env.NODE_ENV || 'development');
  console.log('  - API URL:', API_URL);
  console.log('  - Poll Interval:', POLL_INTERVAL, 'ms');
}