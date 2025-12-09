// Fonctions utilitaires

/**
 * Formatte une date en chaîne lisible
 */
export const formatDate = (timestamp) => {
  return new Date(timestamp).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Génère un ID unique
 */
export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Valide qu'une réponse est correcte (comparaison flexible)
 */
export const isAnswerCorrect = (userAnswer, correctAnswer) => {
  if (!userAnswer || !correctAnswer) return false;
  
  const normalize = (str) => str.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  return normalize(userAnswer) === normalize(correctAnswer);
};

/**
 * Calcule le score total d'un participant
 */
export const calculateScore = (participant, questions) => {
  let score = 0;
  Object.entries(participant.validations || {}).forEach(([qIndex, isCorrect]) => {
    if (isCorrect && questions[qIndex]) {
      score += questions[qIndex].points || 1;
    }
  });
  return score;
};

/**
 * Calcule les statistiques d'un lobby
 */
export const calculateLobbyStats = (lobby, quiz) => {
  const totalQuestions = quiz?.questions?.length || 0;
  const totalParticipants = lobby.participants?.length || 0;
  
  let totalValidated = 0;
  let totalRejected = 0;
  
  lobby.participants?.forEach(p => {
    Object.values(p.validations || {}).forEach(validation => {
      if (validation === true) totalValidated++;
      if (validation === false) totalRejected++;
    });
  });
  
  return {
    totalQuestions,
    totalParticipants,
    totalValidated,
    totalRejected,
    completionRate: totalQuestions > 0 ? (totalValidated + totalRejected) / (totalQuestions * totalParticipants) * 100 : 0
  };
};

/**
 * Trie les équipes par score
 */
export const sortTeamsByScore = (teams) => {
  return [...teams].sort((a, b) => (b.validatedScore || 0) - (a.validatedScore || 0));
};

/**
 * Vérifie si tous les participants ont répondu
 */
export const allParticipantsAnswered = (lobby) => {
  return lobby.participants?.every(p => p.hasAnswered) || false;
};

/**
 * Obtient la couleur du statut d'un lobby
 */
export const getLobbyStatusColor = (status) => {
  const colors = {
    waiting: { bg: 'bg-yellow-100', border: 'border-yellow-500', text: 'text-yellow-700' },
    playing: { bg: 'bg-blue-100', border: 'border-blue-500', text: 'text-blue-700' },
    finished: { bg: 'bg-green-100', border: 'border-green-500', text: 'text-green-700' }
  };
  return colors[status] || colors.waiting;
};

/**
 * Obtient le texte du statut d'un lobby
 */
export const getLobbyStatusText = (status) => {
  const texts = {
    waiting: 'En attente',
    playing: 'En cours',
    finished: 'Terminé'
  };
  return texts[status] || 'Inconnu';
};

/**
 * Valide les données d'un quiz
 */
export const validateQuiz = (quiz) => {
  const errors = [];
  
  if (!quiz.title?.trim()) {
    errors.push('Le titre est requis');
  }
  
  if (!quiz.questions || quiz.questions.length === 0) {
    errors.push('Au moins une question est requise');
  }
  
  quiz.questions?.forEach((q, index) => {
    if (!q.text?.trim()) {
      errors.push(`Question ${index + 1}: le texte est requis`);
    }
    if (!q.answer?.trim()) {
      errors.push(`Question ${index + 1}: la réponse est requise`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Filtre les questions par catégorie
 */
export const filterQuestionsByCategory = (questions, category) => {
  if (!category) return questions;
  return questions.filter(q => q.category?.toLowerCase() === category.toLowerCase());
};

/**
 * Obtient toutes les catégories uniques
 */
export const getUniqueCategories = (questions) => {
  const categories = questions
    .map(q => q.category)
    .filter(Boolean)
    .filter((v, i, a) => a.indexOf(v) === i);
  return categories.sort();
};

// ==================== HELPERS POUR NORMALISATION DES NOMS D'ÉQUIPES ====================

/**
 * Normalise un nom d'équipe pour éviter les doublons
 * - Trim les espaces au début et à la fin
 * - Supprime les espaces multiples consécutifs
 * - Convertit en minuscules pour comparaison (optionnel)
 * - Supprime les caractères invisibles
 */
export const normalizeTeamName = (teamName) => {
  if (!teamName) return '';
  
  return teamName
    .trim()                           // Enlever espaces début/fin
    .replace(/\s+/g, ' ')            // Remplacer espaces multiples par un seul
    .replace(/[\u200B-\u200D\uFEFF]/g, ''); // Enlever caractères invisibles (zero-width space, etc.)
};

/**
 * Compare deux noms d'équipes de manière intelligente
 * Retourne true si les noms sont considérés identiques
 */
export const areTeamNamesEqual = (name1, name2) => {
  if (!name1 || !name2) return false;
  
  const normalized1 = normalizeTeamName(name1).toLowerCase();
  const normalized2 = normalizeTeamName(name2).toLowerCase();
  
  return normalized1 === normalized2;
};

/**
 * Trouve une équipe en utilisant la comparaison intelligente
 * Retourne l'équipe trouvée ou null
 */
export const findTeamByName = (teams, teamName) => {
  if (!teamName) return null;
  
  return teams.find(team => areTeamNamesEqual(team.name, teamName)) || null;
};

/**
 * Trouve le nom exact d'une équipe existante
 * Utile pour récupérer la casse correcte
 */
export const getExactTeamName = (teams, searchName) => {
  const team = findTeamByName(teams, searchName);
  return team ? team.name : normalizeTeamName(searchName);
};

/**
 * Valide un nom d'équipe
 * Retourne { valid: boolean, error: string }
 */
export const validateTeamName = (teamName) => {
  const normalized = normalizeTeamName(teamName);
  
  if (!normalized) {
    return { valid: false, error: 'Le nom d\'équipe ne peut pas être vide' };
  }
  
  if (normalized.length < 2) {
    return { valid: false, error: 'Le nom d\'équipe doit faire au moins 2 caractères' };
  }
  
  if (normalized.length > 50) {
    return { valid: false, error: 'Le nom d\'équipe ne peut pas dépasser 50 caractères' };
  }
  
  // Vérifier caractères interdits (optionnel)
  const forbiddenChars = /[<>{}[\]\\\/]/;
  if (forbiddenChars.test(normalized)) {
    return { valid: false, error: 'Le nom d\'équipe contient des caractères interdits' };
  }
  
  return { valid: true, error: null };
};

/**
 * Exemples d'utilisation:
 * 
 * normalizeTeamName("  Test  ") → "Test"
 * normalizeTeamName("Test   Team") → "Test Team"
 * normalizeTeamName("test") → "test"
 * 
 * areTeamNamesEqual("Test", "test") → true
 * areTeamNamesEqual("Test", "  test  ") → true
 * areTeamNamesEqual("Test Team", "Test  Team") → true
 * 
 * findTeamByName([{name: "Test"}], "  test  ") → {name: "Test"}
 */