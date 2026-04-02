/**
 * Cache mémoire simple pour réduire les requêtes Supabase
 * 
 * Stratégie : 
 * - TTL court (5-10 secondes) pour les données qui changent souvent
 * - Invalidation manuelle quand on sait qu'une donnée a changé
 */

const cache = new Map();

// TTL par défaut en millisecondes
const DEFAULT_TTL = 5000; // 5 secondes

/**
 * Récupère une valeur du cache
 * @param {string} key 
 * @returns {any|null}
 */
function get(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  
  return entry.value;
}

/**
 * Stocke une valeur dans le cache
 * @param {string} key 
 * @param {any} value 
 * @param {number} ttl - Durée de vie en ms
 */
function set(key, value, ttl = DEFAULT_TTL) {
  cache.set(key, {
    value,
    expiresAt: Date.now() + ttl
  });
}

/**
 * Invalide une entrée du cache
 * @param {string} key 
 */
function invalidate(key) {
  cache.delete(key);
}

/**
 * Invalide toutes les entrées qui commencent par un préfixe
 * @param {string} prefix 
 */
function invalidatePrefix(prefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
}

/**
 * Invalide tout le cache
 */
function invalidateAll() {
  cache.clear();
}

/**
 * Helper pour récupérer ou calculer une valeur
 * @param {string} key 
 * @param {Function} fetcher - Fonction async qui récupère la valeur
 * @param {number} ttl 
 * @returns {Promise<any>}
 */
async function getOrFetch(key, fetcher, ttl = DEFAULT_TTL) {
  const cached = get(key);
  if (cached !== null) {
    return cached;
  }
  
  const value = await fetcher();
  set(key, value, ttl);
  return value;
}

/**
 * Stats du cache pour debug
 */
function stats() {
  let valid = 0;
  let expired = 0;
  const now = Date.now();
  
  for (const entry of cache.values()) {
    if (now > entry.expiresAt) {
      expired++;
    } else {
      valid++;
    }
  }
  
  return { total: cache.size, valid, expired };
}

// Nettoyage périodique des entrées expirées (toutes les 30 secondes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key);
    }
  }
}, 30000);

module.exports = {
  get,
  set,
  invalidate,
  invalidatePrefix,
  invalidateAll,
  getOrFetch,
  stats,
  // Clés de cache standards
  KEYS: {
    ALL_LOBBIES: 'all_lobbies',
    ALL_TEAMS: 'all_teams',
    ALL_PARTICIPANTS: 'all_participants',
    ALL_QUIZZES: 'all_quizzes',
    ALL_QUESTIONS: 'all_questions',
    LOBBY: (id) => `lobby:${id}`,
    QUIZ: (id) => `quiz:${id}`,
    TEAM: (id) => `team:${id}`,
    PARTICIPANT: (id) => `participant:${id}`,
  }
};
