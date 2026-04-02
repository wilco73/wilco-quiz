/**
 * Module de debounce pour les broadcasts Socket.IO
 * 
 * Évite d'envoyer plusieurs broadcasts identiques en rafale
 * (ex: 5 joueurs qui répondent en même temps)
 */

const pendingBroadcasts = new Map();

// Délai de debounce par type (en ms)
const DEBOUNCE_DELAYS = {
  'lobbies': 100,      // Très fréquent, debounce court
  'lobby': 50,         // État d'un lobby spécifique
  'teams': 200,        // Moins fréquent
  'participants': 200, // Moins fréquent
  'quizzes': 500,      // Rare
  'questions': 500,    // Rare
  'mystery': 100       // Fréquent pendant les parties
};

/**
 * Programme un broadcast avec debounce
 * @param {string} type - Type de broadcast
 * @param {Function} broadcastFn - Fonction de broadcast à exécuter
 * @param {string} [key] - Clé optionnelle pour distinguer les broadcasts (ex: lobbyId)
 */
function schedule(type, broadcastFn, key = '') {
  const fullKey = `${type}:${key}`;
  
  // Annuler le broadcast précédent si en attente
  if (pendingBroadcasts.has(fullKey)) {
    clearTimeout(pendingBroadcasts.get(fullKey).timeout);
  }
  
  const delay = DEBOUNCE_DELAYS[type] || 100;
  
  const timeout = setTimeout(async () => {
    pendingBroadcasts.delete(fullKey);
    try {
      await broadcastFn();
    } catch (error) {
      console.error(`[BROADCAST] Erreur ${type}:`, error.message);
    }
  }, delay);
  
  pendingBroadcasts.set(fullKey, { timeout, type, key });
}

/**
 * Exécute immédiatement un broadcast (bypass debounce)
 * @param {string} type 
 * @param {Function} broadcastFn 
 * @param {string} [key]
 */
async function immediate(type, broadcastFn, key = '') {
  const fullKey = `${type}:${key}`;
  
  // Annuler si en attente
  if (pendingBroadcasts.has(fullKey)) {
    clearTimeout(pendingBroadcasts.get(fullKey).timeout);
    pendingBroadcasts.delete(fullKey);
  }
  
  try {
    await broadcastFn();
  } catch (error) {
    console.error(`[BROADCAST] Erreur ${type}:`, error.message);
  }
}

/**
 * Annule tous les broadcasts en attente
 */
function cancelAll() {
  for (const { timeout } of pendingBroadcasts.values()) {
    clearTimeout(timeout);
  }
  pendingBroadcasts.clear();
}

/**
 * Stats pour debug
 */
function stats() {
  return {
    pending: pendingBroadcasts.size,
    types: [...new Set([...pendingBroadcasts.values()].map(p => p.type))]
  };
}

module.exports = {
  schedule,
  immediate,
  cancelAll,
  stats
};
