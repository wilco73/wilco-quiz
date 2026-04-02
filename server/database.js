/**
 * Module de gestion de la base de données Supabase (PostgreSQL)
 * Remplace l'ancienne version SQLite
 * 
 * WilcoQuiz - Migration vers Supabase
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

// Configuration Supabase
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Variables Supabase manquantes !');
  console.error('   Définissez SUPABASE_URL et SUPABASE_SERVICE_KEY dans .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const SALT_ROUNDS = 10;

// ==================== CONSTANTES ROLES ====================

const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPERADMIN: 'superadmin'
};

const ROLE_HIERARCHY = {
  'user': 0,
  'admin': 1,
  'superadmin': 2
};

/**
 * Vérifie si un rôle a les permissions d'un autre rôle
 */
function hasRole(userRole, requiredRole) {
  const userLevel = ROLE_HIERARCHY[userRole] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  return userLevel >= requiredLevel;
}

/**
 * Vérifie si l'utilisateur est au moins admin
 */
function isAdmin(role) {
  return hasRole(role, ROLES.ADMIN);
}

/**
 * Vérifie si l'utilisateur est superadmin
 */
function isSuperAdmin(role) {
  return role === ROLES.SUPERADMIN;
}

/**
 * Initialise la connexion à la base de données
 */
async function initDatabase() {
  try {
    // Test de connexion
    const { data, error } = await supabase.from('admins').select('count').limit(1);
    if (error) throw error;
    console.log('[OK] Connexion Supabase établie');
    
    // Créer l'admin par défaut si nécessaire
    await seedDefaultAdmin();
    
    return supabase;
  } catch (error) {
    console.error('[ERREUR] Connexion Supabase:', error.message);
    throw error;
  }
}

/**
 * Retourne l'instance Supabase
 */
function getDatabase() {
  return supabase;
}

/**
 * Ferme la connexion (non nécessaire avec Supabase mais garde la compatibilité)
 */
function closeDatabase() {
  console.log('[OK] Connexion Supabase fermée');
}

/**
 * Sauvegarde - non nécessaire avec Supabase (garde la compatibilité)
 */
function saveDatabase() {
  // Pas de sauvegarde manuelle nécessaire avec Supabase
}

// ==================== HELPERS POUR LE HASHAGE ====================

function hashPasswordSync(password) {
  return bcrypt.hashSync(password, SALT_ROUNDS);
}

function verifyPasswordSync(password, hash) {
  if (!hash) return false;
  
  if (hash.startsWith('$2')) {
    return bcrypt.compareSync(password, hash);
  }
  
  // Ancien mot de passe en clair (migration)
  if (password === hash) {
    console.log('[WARNING] Mot de passe non-hashé détecté');
    return true;
  }
  
  return false;
}

// ==================== HELPERS NORMALISATION ====================

function normalizeTeamName(teamName) {
  if (!teamName) return '';
  return teamName
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[\u200B-\u200D\uFEFF]/g, '');
}

function areTeamNamesEqual(name1, name2) {
  if (!name1 || !name2) return false;
  return normalizeTeamName(name1).toLowerCase() === normalizeTeamName(name2).toLowerCase();
}

// ==================== ADMIN ====================

async function seedDefaultAdmin() {
  const { data: existing } = await supabase
    .from('admins')
    .select('id')
    .eq('username', 'admin')
    .single();
  
  if (!existing) {
    const passwordHash = hashPasswordSync('admin123');
    await supabase.from('admins').insert({
      username: 'admin',
      password_hash: passwordHash,
      role: 'super_admin'
    });
    console.log('[OK] Admin par défaut créé: admin / admin123');
  }
}

async function verifyAdmin(username, password) {
  const { data: admin } = await supabase
    .from('admins')
    .select('*')
    .eq('username', username)
    .single();
  
  if (!admin) return null;
  
  if (verifyPasswordSync(password, admin.password_hash)) {
    // Mettre à jour last_login
    await supabase
      .from('admins')
      .update({ last_login: Date.now() })
      .eq('id', admin.id);
    
    return { id: admin.id, username: admin.username, role: admin.role };
  }
  return null;
}

// ==================== TEAMS ====================

async function getAllTeams() {
  const { data, error } = await supabase
    .from('teams')
    .select('id, name, validated_score, scores_by_category, created_at')
    .order('name');
  
  if (error) throw error;
  
  return data.map(t => {
    const scoresByCategory = t.scores_by_category || {};
    // Le score validé est maintenant calculé comme la somme des scores par catégorie
    const calculatedScore = Object.values(scoresByCategory).reduce((sum, score) => sum + (score || 0), 0);
    
    return {
      id: t.id,
      name: t.name,
      validatedScore: calculatedScore,
      scoresByCategory: scoresByCategory,
      createdAt: t.created_at
    };
  });
}

async function getTeamByName(name) {
  const normalizedName = normalizeTeamName(name);
  const { data } = await supabase
    .from('teams')
    .select('id, name, validated_score, scores_by_category, created_at')
    .ilike('name', normalizedName)
    .single();
  
  if (!data) return null;
  
  const scoresByCategory = data.scores_by_category || {};
  const calculatedScore = Object.values(scoresByCategory).reduce((sum, score) => sum + (score || 0), 0);
  
  return {
    id: data.id,
    name: data.name,
    validatedScore: calculatedScore,
    scoresByCategory: scoresByCategory,
    createdAt: data.created_at
  };
}

async function getTeamById(id) {
  const { data } = await supabase
    .from('teams')
    .select('id, name, validated_score, scores_by_category, created_at')
    .eq('id', id)
    .single();
  
  if (!data) return null;
  
  const scoresByCategory = data.scores_by_category || {};
  const calculatedScore = Object.values(scoresByCategory).reduce((sum, score) => sum + (score || 0), 0);
  
  return {
    id: data.id,
    name: data.name,
    validatedScore: calculatedScore,
    scoresByCategory: scoresByCategory,
    createdAt: data.created_at
  };
}

async function createTeam(name) {
  const normalizedName = normalizeTeamName(name);
  const existing = await getTeamByName(normalizedName);
  if (existing) return existing;
  
  const { data, error } = await supabase
    .from('teams')
    .insert({ name: normalizedName, scores_by_category: {} })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    name: data.name,
    validatedScore: 0,
    scoresByCategory: {},
    createdAt: data.created_at
  };
}

// DEPRECATED - garder pour compatibilité mais ne devrait plus être utilisé
async function updateTeamScore(teamId, score) {
  console.warn('[DEPRECATED] updateTeamScore - utiliser updateTeamScoreByCategory');
  // Ne fait plus rien car le score est calculé depuis scores_by_category
}

// Ajouter des points à une équipe dans une catégorie spécifique
async function addTeamScoreByCategory(teamId, category, points) {
  const team = await getTeamById(teamId);
  if (!team) return;
  
  const categoryKey = category || 'Sans catégorie';
  const currentScores = team.scoresByCategory || {};
  const currentCategoryScore = currentScores[categoryKey] || 0;
  
  const updatedScores = {
    ...currentScores,
    [categoryKey]: currentCategoryScore + points
  };
  
  await supabase
    .from('teams')
    .update({ scores_by_category: updatedScores })
    .eq('id', teamId);
  
  console.log(`[SCORE] +${points} point(s) pour équipe id=${teamId} dans catégorie "${categoryKey}"`);
}

// Définir le score d'une équipe dans une catégorie (pour édition admin)
async function setTeamScoreByCategory(teamId, category, score) {
  const team = await getTeamById(teamId);
  if (!team) return;
  
  const categoryKey = category || 'Sans catégorie';
  const currentScores = team.scoresByCategory || {};
  
  const updatedScores = {
    ...currentScores,
    [categoryKey]: score
  };
  
  await supabase
    .from('teams')
    .update({ scores_by_category: updatedScores })
    .eq('id', teamId);
}

// Supprimer une catégorie des scores d'une équipe
async function deleteTeamScoreCategory(teamId, category) {
  const team = await getTeamById(teamId);
  if (!team) return;
  
  const currentScores = { ...team.scoresByCategory };
  delete currentScores[category];
  
  await supabase
    .from('teams')
    .update({ scores_by_category: currentScores })
    .eq('id', teamId);
}

// DEPRECATED - garder pour compatibilité
async function addTeamScore(teamId, points) {
  console.warn('[DEPRECATED] addTeamScore appelé sans catégorie - utiliser addTeamScoreByCategory');
  // Fallback: ajouter dans "Sans catégorie"
  await addTeamScoreByCategory(teamId, 'Sans catégorie', points);
}

async function resetAllTeamScores() {
  await supabase
    .from('teams')
    .update({ scores_by_category: {} })
    .neq('id', 0);
}

async function deleteTeam(teamId) {
  await supabase.from('teams').delete().eq('id', teamId);
}

async function saveAllTeams(teams) {
  for (const team of teams) {
    const existing = await getTeamById(team.id);
    if (existing) {
      await supabase
        .from('teams')
        .update({ 
          name: team.name, 
          scores_by_category: team.scoresByCategory || {} 
        })
        .eq('id', team.id);
    } else {
      await supabase
        .from('teams')
        .insert({ 
          name: team.name, 
          scores_by_category: team.scoresByCategory || {} 
        });
    }
  }
}

// ==================== PARTICIPANTS ====================

async function getAllParticipants() {
  const { data, error } = await supabase
    .from('participants')
    .select(`
      id, pseudo, password_hash, team_id, avatar, role, created_at,
      teams (name)
    `)
    .order('pseudo');
  
  if (error) throw error;
  
  return data.map(p => ({
    id: p.id,
    pseudo: p.pseudo,
    password: p.password_hash,
    teamId: p.team_id,
    teamName: p.teams?.name || null,
    avatar: p.avatar || 'default',
    role: p.role || 'user',
    createdAt: p.created_at
  }));
}

async function getParticipantByPseudo(pseudo) {
  // Recherche insensible à la casse avec ilike
  const { data } = await supabase
    .from('participants')
    .select(`
      id, pseudo, password_hash, team_id, avatar, role, created_at,
      teams (name)
    `)
    .ilike('pseudo', pseudo)
    .single();
  
  if (!data) return null;
  
  return {
    id: data.id,
    pseudo: data.pseudo,
    password: data.password_hash,
    teamId: data.team_id,
    teamName: data.teams?.name || null,
    avatar: data.avatar || 'default',
    role: data.role || 'user',
    createdAt: data.created_at
  };
}

async function getParticipantById(id) {
  const { data } = await supabase
    .from('participants')
    .select(`
      id, pseudo, password_hash, team_id, avatar, role, created_at,
      teams (name)
    `)
    .eq('id', id)
    .single();
  
  if (!data) return null;
  
  return {
    id: data.id,
    pseudo: data.pseudo,
    password: data.password_hash,
    teamId: data.team_id,
    teamName: data.teams?.name || null,
    avatar: data.avatar || 'default',
    role: data.role || 'user',
    createdAt: data.created_at
  };
}

async function createParticipant(id, pseudo, password, teamId, avatar = 'default', role = 'user') {
  const passwordHash = hashPasswordSync(password);
  
  const { error } = await supabase
    .from('participants')
    .insert({
      id,
      pseudo,
      password_hash: passwordHash,
      team_id: teamId,
      avatar,
      role
    });
  
  if (error) throw error;
  
  return getParticipantById(id);
}

async function updateParticipantTeam(participantId, teamId) {
  await supabase
    .from('participants')
    .update({ team_id: teamId })
    .eq('id', participantId);
}

async function updateParticipantAvatar(participantId, avatar) {
  await supabase
    .from('participants')
    .update({ avatar })
    .eq('id', participantId);
  
  return getParticipantById(participantId);
}

async function verifyParticipantPassword(pseudo, password) {
  // Recherche insensible à la casse avec ilike
  const { data } = await supabase
    .from('participants')
    .select('password_hash')
    .ilike('pseudo', pseudo)
    .single();
  
  if (!data) {
    console.log(`[AUTH] Participant "${pseudo}" non trouvé`);
    return false;
  }
  
  const result = verifyPasswordSync(password, data.password_hash);
  console.log(`[AUTH] Vérification mot de passe pour "${pseudo}": ${result ? 'OK' : 'ECHEC'}`);
  return result;
}

async function updateParticipantPassword(participantId, newPassword) {
  const passwordHash = hashPasswordSync(newPassword);
  await supabase
    .from('participants')
    .update({ password_hash: passwordHash })
    .eq('id', participantId);
}

async function updateParticipantPseudo(participantId, newPseudo) {
  await supabase
    .from('participants')
    .update({ pseudo: newPseudo })
    .eq('id', participantId);
}

async function deleteParticipant(participantId) {
  // Supprimer des lobbies d'abord
  await supabase.from('lobby_participants').delete().eq('participant_id', participantId);
  await supabase.from('lobby_answers').delete().eq('participant_id', participantId);
  await supabase.from('drawing_lobby_participants').delete().eq('participant_id', participantId);
  // Puis supprimer le participant
  await supabase.from('participants').delete().eq('id', participantId);
}

// ==================== GESTION DES ROLES ====================

async function updateParticipantRole(participantId, role) {
  if (!Object.values(ROLES).includes(role)) {
    throw new Error(`Rôle invalide: ${role}`);
  }
  
  await supabase
    .from('participants')
    .update({ role })
    .eq('id', participantId);
  
  return getParticipantById(participantId);
}

async function getParticipantsByRole(role) {
  const { data, error } = await supabase
    .from('participants')
    .select(`
      id, pseudo, password_hash, team_id, avatar, role, created_at,
      teams (name)
    `)
    .eq('role', role)
    .order('pseudo');
  
  if (error) throw error;
  
  return data.map(p => ({
    id: p.id,
    pseudo: p.pseudo,
    password: p.password_hash,
    teamId: p.team_id,
    teamName: p.teams?.name || null,
    avatar: p.avatar || 'default',
    role: p.role || 'user',
    createdAt: p.created_at
  }));
}

async function getAdminParticipants() {
  const { data, error } = await supabase
    .from('participants')
    .select(`
      id, pseudo, password_hash, team_id, avatar, role, created_at,
      teams (name)
    `)
    .in('role', ['admin', 'superadmin'])
    .order('pseudo');
  
  if (error) throw error;
  
  return data.map(p => ({
    id: p.id,
    pseudo: p.pseudo,
    password: p.password_hash,
    teamId: p.team_id,
    teamName: p.teams?.name || null,
    avatar: p.avatar || 'default',
    role: p.role,
    createdAt: p.created_at
  }));
}

async function saveAllParticipants(participants) {
  for (const p of participants) {
    const existing = await getParticipantById(p.id);
    if (existing) {
      let teamId = null;
      if (p.teamName) {
        const team = await getTeamByName(p.teamName) || await createTeam(p.teamName);
        teamId = team.id;
      }
      await supabase
        .from('participants')
        .update({ pseudo: p.pseudo, team_id: teamId })
        .eq('id', p.id);
    }
  }
}

// ==================== QUESTIONS ====================

async function getAllQuestions() {
  // Supabase a une limite par défaut de 1000 lignes
  // On récupère toutes les questions avec une limite plus élevée
  const { data, error, count } = await supabase
    .from('questions')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, 9999); // Récupérer jusqu'à 10000 questions
  
  if (error) throw error;
  
  console.log(`[DB] getAllQuestions: ${data?.length || 0} questions récupérées (total en base: ${count})`);
  
  return (data || []).map(q => ({
    id: q.id,
    text: q.text,
    answer: q.answer,
    type: q.type,
    category: q.category,
    tags: q.tags ? JSON.parse(q.tags) : [],
    points: q.points,
    timer: q.timer,
    media: q.media,
    mediaType: q.media_type,
    silhouetteMode: q.silhouette_mode || false,
    silhouetteRotation: q.silhouette_rotation || false,
    choices: q.choices ? JSON.parse(q.choices) : null,
    createdAt: q.created_at
  }));
}

async function getQuestionById(id) {
  const { data } = await supabase
    .from('questions')
    .select('*')
    .eq('id', id)
    .single();
  
  if (!data) return null;
  
  return {
    id: data.id,
    text: data.text,
    answer: data.answer,
    type: data.type,
    category: data.category,
    tags: data.tags ? JSON.parse(data.tags) : [],
    points: data.points,
    timer: data.timer,
    media: data.media,
    mediaType: data.media_type,
    silhouetteMode: data.silhouette_mode || false,
    silhouetteRotation: data.silhouette_rotation || false,
    choices: data.choices ? JSON.parse(data.choices) : null,
    createdAt: data.created_at
  };
}

async function createQuestion(question) {
  const id = question.id || `q${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const { error } = await supabase
    .from('questions')
    .insert({
      id,
      text: question.text,
      answer: question.answer,
      type: question.type || 'text',
      category: question.category || null,
      tags: question.tags?.length > 0 ? JSON.stringify(question.tags) : null,
      points: question.points || 1,
      timer: question.timer || 0,
      media: question.media || null,
      media_type: question.mediaType || null,
      silhouette_mode: question.silhouetteMode || false,
      silhouette_rotation: question.silhouetteRotation || false,
      choices: question.choices ? JSON.stringify(question.choices) : null
    });
  
  if (error) throw error;
  
  return getQuestionById(id);
}

async function updateQuestion(id, question) {
  const { error } = await supabase
    .from('questions')
    .update({
      text: question.text,
      answer: question.answer,
      type: question.type || 'text',
      category: question.category || null,
      tags: question.tags?.length > 0 ? JSON.stringify(question.tags) : null,
      points: question.points || 1,
      timer: question.timer || 0,
      media: question.media || null,
      media_type: question.mediaType || null,
      silhouette_mode: question.silhouetteMode || false,
      silhouette_rotation: question.silhouetteRotation || false,
      choices: question.choices ? JSON.stringify(question.choices) : null
    })
    .eq('id', id);
  
  if (error) throw error;
  
  return getQuestionById(id);
}

async function deleteQuestion(id) {
  await supabase.from('questions').delete().eq('id', id);
}

async function saveAllQuestions(questions) {
  // Supprimer toutes les questions
  await supabase.from('questions').delete().neq('id', '');
  
  // Insérer les nouvelles
  for (const q of questions) {
    await createQuestion(q);
  }
}

async function mergeQuestions(questions, mode = 'update') {
  let added = 0;
  let updated = 0;
  
  if (mode === 'replace') {
    await supabase.from('questions').delete().neq('id', '');
    for (const q of questions) {
      await createQuestion(q);
      added++;
    }
  } else {
    // Récupérer tous les IDs existants
    const { data: existingQuestions } = await supabase
      .from('questions')
      .select('id');
    
    const existingIds = new Set(existingQuestions?.map(q => q.id) || []);
    
    for (const q of questions) {
      const exists = q.id && existingIds.has(q.id);
      
      if (exists) {
        if (mode === 'update') {
          await updateQuestion(q.id, q);
          updated++;
        }
      } else {
        await createQuestion(q);
        added++;
        if (q.id) existingIds.add(q.id);
      }
    }
  }
  
  return { added, updated };
}

// ==================== QUIZZES ====================

// Récupérer toutes les catégories de quiz existantes (pour autocomplete)
async function getAllQuizCategories() {
  const { data, error } = await supabase
    .from('quizzes')
    .select('group_name')
    .not('group_name', 'is', null)
    .order('group_name');
  
  if (error) throw error;
  
  // Extraire les catégories uniques
  const categories = [...new Set(data.map(q => q.group_name).filter(Boolean))];
  return categories;
}

async function getAllQuizzes() {
  const { data, error } = await supabase
    .from('quizzes')
    .select('*')
    .order('group_name', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  const quizzes = [];
  for (const quiz of data) {
    const questions = await getQuizQuestions(quiz.id);
    quizzes.push({
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      groupName: quiz.group_name,
      createdAt: quiz.created_at,
      questions
    });
  }
  
  return quizzes;
}

async function getQuizById(id) {
  const { data } = await supabase
    .from('quizzes')
    .select('*')
    .eq('id', id)
    .single();
  
  if (!data) return null;
  
  const questions = await getQuizQuestions(id);
  
  return {
    id: data.id,
    title: data.title,
    description: data.description,
    groupName: data.group_name,
    createdAt: data.created_at,
    questions
  };
}

async function getQuizQuestions(quizId) {
  const { data, error } = await supabase
    .from('quiz_questions')
    .select(`
      position,
      questions (*)
    `)
    .eq('quiz_id', quizId)
    .order('position');
  
  if (error) throw error;
  
  return data.map(row => ({
    id: row.questions.id,
    text: row.questions.text,
    answer: row.questions.answer,
    type: row.questions.type,
    category: row.questions.category,
    points: row.questions.points,
    timer: row.questions.timer,
    media: row.questions.media,
    mediaType: row.questions.media_type,
    silhouetteMode: row.questions.silhouette_mode || false,
    silhouetteRotation: row.questions.silhouette_rotation || false,
    choices: row.questions.choices ? JSON.parse(row.questions.choices) : null
  }));
}

async function createQuiz(quiz) {
  const id = quiz.id || Date.now().toString();
  
  const { error } = await supabase
    .from('quizzes')
    .insert({
      id,
      title: quiz.title,
      description: quiz.description || null,
      group_name: quiz.groupName || null
    });
  
  if (error) throw error;
  
  if (quiz.questions && quiz.questions.length > 0) {
    await setQuizQuestions(id, quiz.questions);
  }
  
  return getQuizById(id);
}

async function updateQuiz(id, quiz) {
  const { error } = await supabase
    .from('quizzes')
    .update({
      title: quiz.title,
      description: quiz.description || null,
      group_name: quiz.groupName || null
    })
    .eq('id', id);
  
  if (error) throw error;
  
  if (quiz.questions) {
    await setQuizQuestions(id, quiz.questions);
  }
  
  return getQuizById(id);
}

async function setQuizQuestions(quizId, questions) {
  // Supprimer les anciennes liaisons
  await supabase.from('quiz_questions').delete().eq('quiz_id', quizId);
  
  // Insérer les nouvelles
  const inserts = questions.map((q, index) => ({
    quiz_id: quizId,
    question_id: q.id,
    position: index
  }));
  
  if (inserts.length > 0) {
    await supabase.from('quiz_questions').insert(inserts);
  }
}

async function deleteQuiz(id) {
  await supabase.from('quizzes').delete().eq('id', id);
}

async function saveAllQuizzes(quizzes) {
  for (const quiz of quizzes) {
    const existing = await getQuizById(quiz.id);
    if (existing) {
      await updateQuiz(quiz.id, quiz);
    } else {
      await createQuiz(quiz);
    }
  }
}

// ==================== LOBBIES ====================

async function getAllLobbies() {
  // Requête 1: Récupérer tous les lobbies
  const { data, error } = await supabase
    .from('lobbies')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  if (!data || data.length === 0) return [];
  
  const lobbyIds = data.map(l => l.id);
  
  // Requête 2: Récupérer TOUS les participants de tous les lobbies en une seule requête
  const { data: allParticipants } = await supabase
    .from('lobby_participants')
    .select(`
      lobby_id,
      participant_id,
      team_name,
      has_answered,
      current_answer,
      draft_answer,
      participants (pseudo)
    `)
    .in('lobby_id', lobbyIds);
  
  // Requête 3: Récupérer TOUTES les réponses de tous les lobbies
  const { data: allAnswers } = await supabase
    .from('lobby_answers')
    .select('lobby_id, participant_id, question_id, answer, validation, qcm_team_scored, has_pasted')
    .in('lobby_id', lobbyIds);
  
  // Indexer les réponses par lobby_id + participant_id
  const answersIndex = {};
  (allAnswers || []).forEach(a => {
    const key = `${a.lobby_id}:${a.participant_id}`;
    if (!answersIndex[key]) answersIndex[key] = [];
    answersIndex[key].push(a);
  });
  
  // Indexer les participants par lobby_id
  const participantsByLobby = {};
  (allParticipants || []).forEach(p => {
    if (!participantsByLobby[p.lobby_id]) participantsByLobby[p.lobby_id] = [];
    
    const answers = answersIndex[`${p.lobby_id}:${p.participant_id}`] || [];
    
    const answersByQuestionId = {};
    const validationsByQuestionId = {};
    const qcmTeamScored = {};
    const pastedByQuestionId = {};
    
    answers.forEach(a => {
      if (a.answer !== null) answersByQuestionId[a.question_id] = a.answer;
      if (a.validation !== null) validationsByQuestionId[a.question_id] = a.validation === 1;
      if (a.qcm_team_scored) qcmTeamScored[a.question_id] = true;
      if (a.has_pasted) pastedByQuestionId[a.question_id] = true;
    });
    
    participantsByLobby[p.lobby_id].push({
      participantId: p.participant_id,
      pseudo: p.participants?.pseudo,
      teamName: p.team_name,
      hasAnswered: p.has_answered === 1,
      currentAnswer: p.current_answer,
      draftAnswer: p.draft_answer,
      answersByQuestionId,
      validationsByQuestionId,
      qcmTeamScored,
      pastedByQuestionId
    });
  });
  
  // Construire le résultat
  return data.map(lobby => {
    const participants = participantsByLobby[lobby.id] || [];
    const session = lobby.status !== 'waiting' ? {
      currentQuestionIndex: lobby.current_question_index,
      startTime: lobby.start_time,
      status: lobby.status === 'finished' ? 'finished' : undefined
    } : null;
    
    return {
      id: lobby.id,
      quizId: lobby.quiz_id,
      status: lobby.status,
      currentQuestionIndex: lobby.current_question_index,
      shuffled: lobby.shuffled === 1,
      shuffledQuestions: lobby.shuffled_questions ? JSON.parse(lobby.shuffled_questions) : null,
      trainingMode: lobby.training_mode === 1,
      startTime: lobby.start_time,
      archived: lobby.archived === 1,
      createdAt: lobby.created_at,
      participants,
      session
    };
  });
}

async function getLobbyById(id) {
  const { data: lobby } = await supabase
    .from('lobbies')
    .select('*')
    .eq('id', id)
    .single();
  
  if (!lobby) return null;
  
  const participants = await getLobbyParticipants(id);
  
  return {
    id: lobby.id,
    quizId: lobby.quiz_id,
    status: lobby.status,
    currentQuestionIndex: lobby.current_question_index,
    shuffled: lobby.shuffled === 1,
    shuffledQuestions: lobby.shuffled_questions ? JSON.parse(lobby.shuffled_questions) : null,
    trainingMode: lobby.training_mode === 1,
    startTime: lobby.start_time,
    archived: lobby.archived === 1,
    createdAt: lobby.created_at,
    participants,
    session: lobby.status !== 'waiting' ? {
      currentQuestionIndex: lobby.current_question_index,
      startTime: lobby.start_time,
      status: lobby.status === 'finished' ? 'finished' : undefined
    } : null
  };
}

async function getLobbyParticipants(lobbyId) {
  // Requête 1: Récupérer tous les participants du lobby
  const { data: participants } = await supabase
    .from('lobby_participants')
    .select(`
      participant_id,
      team_name,
      has_answered,
      current_answer,
      draft_answer,
      participants (pseudo)
    `)
    .eq('lobby_id', lobbyId);
  
  if (!participants || participants.length === 0) return [];
  
  // Requête 2: Récupérer TOUTES les réponses du lobby en une seule requête
  const participantIds = participants.map(p => p.participant_id);
  const { data: allAnswers } = await supabase
    .from('lobby_answers')
    .select('participant_id, question_id, answer, validation, qcm_team_scored, has_pasted')
    .eq('lobby_id', lobbyId)
    .in('participant_id', participantIds);
  
  // Indexer les réponses par participant_id pour accès O(1)
  const answersByParticipant = {};
  (allAnswers || []).forEach(a => {
    if (!answersByParticipant[a.participant_id]) {
      answersByParticipant[a.participant_id] = [];
    }
    answersByParticipant[a.participant_id].push(a);
  });
  
  // Construire le résultat
  return participants.map(p => {
    const answers = answersByParticipant[p.participant_id] || [];
    
    const answersByQuestionId = {};
    const validationsByQuestionId = {};
    const qcmTeamScored = {};
    const pastedByQuestionId = {};
    
    answers.forEach(a => {
      if (a.answer !== null) answersByQuestionId[a.question_id] = a.answer;
      if (a.validation !== null) validationsByQuestionId[a.question_id] = a.validation === 1;
      if (a.qcm_team_scored) qcmTeamScored[a.question_id] = true;
      if (a.has_pasted) pastedByQuestionId[a.question_id] = true;
    });
    
    return {
      participantId: p.participant_id,
      pseudo: p.participants?.pseudo,
      teamName: p.team_name,
      hasAnswered: p.has_answered === 1,
      currentAnswer: p.current_answer,
      draftAnswer: p.draft_answer,
      answersByQuestionId,
      validationsByQuestionId,
      qcmTeamScored,
      pastedByQuestionId
    };
  });
}

async function createLobby(quizId, shuffle = false, trainingMode = false) {
  const id = Date.now().toString();
  const quiz = await getQuizById(quizId);
  
  let shuffledQuestions = null;
  if (shuffle && quiz && quiz.questions) {
    const shuffled = [...quiz.questions].sort(() => Math.random() - 0.5);
    shuffledQuestions = JSON.stringify(shuffled);
  }
  
  await supabase.from('lobbies').insert({
    id,
    quiz_id: quizId,
    shuffled: shuffle ? 1 : 0,
    shuffled_questions: shuffledQuestions,
    training_mode: trainingMode ? 1 : 0
  });
  
  return getLobbyById(id);
}

async function joinLobby(lobbyId, participantId, pseudo, teamName) {
  const normalizedTeamName = normalizeTeamName(teamName);
  
  const { data: existing } = await supabase
    .from('lobby_participants')
    .select('id')
    .eq('lobby_id', lobbyId)
    .eq('participant_id', participantId)
    .single();
  
  if (!existing) {
    await supabase.from('lobby_participants').insert({
      lobby_id: lobbyId,
      participant_id: participantId,
      team_name: normalizedTeamName
    });
  }
  
  return getLobbyById(lobbyId);
}

async function leaveLobby(lobbyId, participantId) {
  // Récupérer le lobby pour vérifier son statut
  const lobby = await getLobbyById(lobbyId);
  
  if (lobby && lobby.status === 'waiting') {
    // Si le quiz n'a pas commencé, on peut supprimer le participant
    await supabase
      .from('lobby_participants')
      .delete()
      .eq('lobby_id', lobbyId)
      .eq('participant_id', participantId);
    
    // Si le lobby est vide, le supprimer
    const updatedLobby = await getLobbyById(lobbyId);
    if (updatedLobby && updatedLobby.participants.length === 0) {
      await deleteLobby(lobbyId);
    }
  } else {
    // Si le quiz est en cours ou terminé, on garde le participant pour l'historique
    // On pourrait ajouter un flag "left" si besoin, mais pour l'instant on ne fait rien
    // Le participant reste dans l'historique
    console.log(`[LOBBY] ${participantId} a quitté ${lobbyId} mais reste dans l'historique (quiz ${lobby?.status})`);
  }
}

async function startLobby(lobbyId) {
  await supabase
    .from('lobbies')
    .update({
      status: 'playing',
      current_question_index: 0,
      start_time: Date.now()
    })
    .eq('id', lobbyId);
  
  return getLobbyById(lobbyId);
}

async function updateLobbyQuestionIndex(lobbyId, index) {
  await supabase
    .from('lobbies')
    .update({ current_question_index: index })
    .eq('id', lobbyId);
  
  await supabase
    .from('lobby_participants')
    .update({ has_answered: 0, current_answer: '', draft_answer: '' })
    .eq('lobby_id', lobbyId);
}

async function finishLobby(lobbyId) {
  await supabase
    .from('lobbies')
    .update({ status: 'finished' })
    .eq('id', lobbyId);
}

async function resetLobby(lobbyId) {
  await supabase
    .from('lobbies')
    .update({
      status: 'waiting',
      current_question_index: 0,
      start_time: null
    })
    .eq('id', lobbyId);
  
  await supabase
    .from('lobby_participants')
    .update({ has_answered: 0, current_answer: '', draft_answer: '' })
    .eq('lobby_id', lobbyId);
  
  await supabase
    .from('lobby_answers')
    .delete()
    .eq('lobby_id', lobbyId);
}

async function archiveLobby(lobbyId, archived = true) {
  await supabase
    .from('lobbies')
    .update({ archived: archived ? 1 : 0 })
    .eq('id', lobbyId);
  
  return getLobbyById(lobbyId);
}

async function deleteLobby(lobbyId) {
  await supabase.from('lobbies').delete().eq('id', lobbyId);
}

// ==================== LOBBY ANSWERS ====================

async function autoSaveAnswer(lobbyId, participantId, answer) {
  // Récupérer l'état actuel
  const { data: lp } = await supabase
    .from('lobby_participants')
    .select('has_answered')
    .eq('lobby_id', lobbyId)
    .eq('participant_id', participantId)
    .single();
  
  const updates = { draft_answer: answer };
  if (lp && !lp.has_answered) {
    updates.current_answer = answer;
  }
  
  await supabase
    .from('lobby_participants')
    .update(updates)
    .eq('lobby_id', lobbyId)
    .eq('participant_id', participantId);
}

async function submitAnswer(lobbyId, participantId, questionId, answer) {
  await supabase
    .from('lobby_participants')
    .update({ has_answered: 1, current_answer: answer })
    .eq('lobby_id', lobbyId)
    .eq('participant_id', participantId);
  
  // Upsert la réponse
  const { data: existing } = await supabase
    .from('lobby_answers')
    .select('id')
    .eq('lobby_id', lobbyId)
    .eq('participant_id', participantId)
    .eq('question_id', questionId)
    .single();
  
  if (existing) {
    await supabase
      .from('lobby_answers')
      .update({ answer })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('lobby_answers')
      .insert({
        lobby_id: lobbyId,
        participant_id: participantId,
        question_id: questionId,
        answer
      });
  }
}

async function markTimeExpired(lobbyId, participantId, questionId) {
  const { data: lp } = await supabase
    .from('lobby_participants')
    .select('draft_answer')
    .eq('lobby_id', lobbyId)
    .eq('participant_id', participantId)
    .single();
  
  const finalAnswer = lp?.draft_answer || '';
  
  await supabase
    .from('lobby_participants')
    .update({ has_answered: 1, current_answer: finalAnswer })
    .eq('lobby_id', lobbyId)
    .eq('participant_id', participantId);
  
  // Upsert la réponse
  const { data: existing } = await supabase
    .from('lobby_answers')
    .select('id')
    .eq('lobby_id', lobbyId)
    .eq('participant_id', participantId)
    .eq('question_id', questionId)
    .single();
  
  if (existing) {
    await supabase
      .from('lobby_answers')
      .update({ answer: finalAnswer })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('lobby_answers')
      .insert({
        lobby_id: lobbyId,
        participant_id: participantId,
        question_id: questionId,
        answer: finalAnswer
      });
  }
  
  return finalAnswer;
}

async function validateAnswer(lobbyId, participantId, questionId, isCorrect) {
  const { data: existing } = await supabase
    .from('lobby_answers')
    .select('id')
    .eq('lobby_id', lobbyId)
    .eq('participant_id', participantId)
    .eq('question_id', questionId)
    .single();
  
  if (existing) {
    await supabase
      .from('lobby_answers')
      .update({ validation: isCorrect ? 1 : 0 })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('lobby_answers')
      .insert({
        lobby_id: lobbyId,
        participant_id: participantId,
        question_id: questionId,
        validation: isCorrect ? 1 : 0
      });
  }
}

async function markQcmTeamScored(lobbyId, participantId, questionId) {
  await supabase
    .from('lobby_answers')
    .update({ qcm_team_scored: 1 })
    .eq('lobby_id', lobbyId)
    .eq('participant_id', participantId)
    .eq('question_id', questionId);
}

/**
 * Vérifie si une équipe a déjà scoré pour une question donnée
 * Cherche si un membre de l'équipe a déjà été validé correct pour cette question
 */
async function hasTeamScoredForQuestion(lobbyId, teamName, questionId) {
  // Récupérer tous les participants du lobby qui sont dans cette équipe
  const { data: teamParticipants } = await supabase
    .from('lobby_participants')
    .select('participant_id')
    .eq('lobby_id', lobbyId)
    .eq('team_name', teamName);
  
  if (!teamParticipants || teamParticipants.length === 0) return false;
  
  const participantIds = teamParticipants.map(p => p.participant_id);
  
  // Vérifier si l'un d'eux a déjà une validation correcte pour cette question
  const { data: validations } = await supabase
    .from('lobby_answers')
    .select('validation')
    .eq('lobby_id', lobbyId)
    .eq('question_id', questionId)
    .in('participant_id', participantIds)
    .eq('validation', 1);
  
  return validations && validations.length > 0;
}

async function markAnswerPasted(lobbyId, participantId, questionId) {
  const { data: existing } = await supabase
    .from('lobby_answers')
    .select('id')
    .eq('lobby_id', lobbyId)
    .eq('participant_id', participantId)
    .eq('question_id', questionId)
    .single();
  
  if (existing) {
    await supabase
      .from('lobby_answers')
      .update({ has_pasted: 1 })
      .eq('id', existing.id);
  } else {
    await supabase
      .from('lobby_answers')
      .insert({
        lobby_id: lobbyId,
        participant_id: participantId,
        question_id: questionId,
        has_pasted: 1
      });
  }
}

async function getParticipantValidation(lobbyId, participantId, questionId) {
  const { data } = await supabase
    .from('lobby_answers')
    .select('validation, qcm_team_scored, has_pasted')
    .eq('lobby_id', lobbyId)
    .eq('participant_id', participantId)
    .eq('question_id', questionId)
    .single();
  
  if (!data) return null;
  
  return {
    validation: data.validation,
    qcm_team_scored: data.qcm_team_scored,
    hasPasted: data.has_pasted
  };
}

async function updateLobbyParticipantTeam(lobbyId, participantId, teamName) {
  const normalizedTeamName = normalizeTeamName(teamName);
  await supabase
    .from('lobby_participants')
    .update({ team_name: normalizedTeamName })
    .eq('lobby_id', lobbyId)
    .eq('participant_id', participantId);
}

// ==================== DRAWING WORDS (Banque de mots Pictionary) ====================

async function getAllDrawingWords() {
  const { data, error } = await supabase
    .from('drawing_words')
    .select('*')
    .order('category')
    .order('word');
  
  if (error) throw error;
  
  return data.map(w => ({
    id: w.id,
    word: w.word,
    category: w.category,
    difficulty: w.difficulty,
    tags: w.tags ? JSON.parse(w.tags) : [],
    createdAt: w.created_at
  }));
}

async function getDrawingWordById(id) {
  const { data } = await supabase
    .from('drawing_words')
    .select('*')
    .eq('id', id)
    .single();
  
  if (!data) return null;
  
  return {
    id: data.id,
    word: data.word,
    category: data.category,
    difficulty: data.difficulty,
    tags: data.tags ? JSON.parse(data.tags) : [],
    createdAt: data.created_at
  };
}

async function createDrawingWord(wordData) {
  const id = wordData.id || Date.now().toString();
  
  await supabase.from('drawing_words').insert({
    id,
    word: wordData.word,
    category: wordData.category || null,
    difficulty: wordData.difficulty || 'moyen',
    tags: wordData.tags ? JSON.stringify(wordData.tags) : null
  });
  
  return getDrawingWordById(id);
}

async function updateDrawingWord(id, wordData) {
  await supabase
    .from('drawing_words')
    .update({
      word: wordData.word,
      category: wordData.category || null,
      difficulty: wordData.difficulty || 'moyen',
      tags: wordData.tags ? JSON.stringify(wordData.tags) : null
    })
    .eq('id', id);
  
  return getDrawingWordById(id);
}

async function deleteDrawingWord(id) {
  await supabase.from('drawing_words').delete().eq('id', id);
}

async function mergeDrawingWords(words, mode = 'add') {
  const results = { added: 0, updated: 0, skipped: 0, errors: [] };
  
  if (mode === 'replace') {
    await supabase.from('drawing_words').delete().neq('id', '');
  }
  
  for (const wordData of words) {
    try {
      if (!wordData.word || !wordData.word.trim()) {
        results.skipped++;
        continue;
      }
      
      const { data: existing } = await supabase
        .from('drawing_words')
        .select('id')
        .ilike('word', wordData.word.trim())
        .single();
      
      if (existing) {
        if (mode === 'update' || mode === 'replace') {
          await updateDrawingWord(existing.id, wordData);
          results.updated++;
        } else {
          results.skipped++;
        }
      } else {
        await createDrawingWord(wordData);
        results.added++;
      }
    } catch (error) {
      results.errors.push({ word: wordData.word, error: error.message });
    }
  }
  
  return results;
}

async function getRandomDrawingWords(count, category = null, difficulty = null) {
  let query = supabase.from('drawing_words').select('*');
  
  if (category) query = query.eq('category', category);
  if (difficulty) query = query.eq('difficulty', difficulty);
  
  const { data } = await query;
  
  // Mélanger et prendre les premiers
  const shuffled = (data || []).sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(w => ({
    id: w.id,
    word: w.word,
    category: w.category,
    difficulty: w.difficulty,
    tags: w.tags ? JSON.parse(w.tags) : []
  }));
}

// ==================== DRAWING REFERENCES ====================

async function getAllDrawingReferences() {
  const { data, error } = await supabase
    .from('drawing_references')
    .select('*')
    .order('category')
    .order('name');
  
  if (error) throw error;
  
  return data.map(r => ({
    id: r.id,
    name: r.name,
    imageUrl: r.image_url,
    category: r.category,
    tags: r.tags ? JSON.parse(r.tags) : [],
    createdAt: r.created_at
  }));
}

async function getDrawingReferenceById(id) {
  const { data } = await supabase
    .from('drawing_references')
    .select('*')
    .eq('id', id)
    .single();
  
  if (!data) return null;
  
  return {
    id: data.id,
    name: data.name,
    imageUrl: data.image_url,
    category: data.category,
    tags: data.tags ? JSON.parse(data.tags) : [],
    createdAt: data.created_at
  };
}

async function createDrawingReference(refData) {
  const id = refData.id || Date.now().toString();
  
  await supabase.from('drawing_references').insert({
    id,
    name: refData.name,
    image_url: refData.imageUrl,
    category: refData.category || null,
    tags: refData.tags ? JSON.stringify(refData.tags) : null
  });
  
  return getDrawingReferenceById(id);
}

async function updateDrawingReference(id, refData) {
  await supabase
    .from('drawing_references')
    .update({
      name: refData.name,
      image_url: refData.imageUrl,
      category: refData.category || null,
      tags: refData.tags ? JSON.stringify(refData.tags) : null
    })
    .eq('id', id);
  
  return getDrawingReferenceById(id);
}

async function deleteDrawingReference(id) {
  await supabase.from('drawing_references').delete().eq('id', id);
}

async function mergeDrawingReferences(references, mode = 'add') {
  const results = { added: 0, updated: 0, skipped: 0, errors: [] };
  
  if (mode === 'replace') {
    await supabase.from('drawing_references').delete().neq('id', '');
  }
  
  for (const refData of references) {
    try {
      if (!refData.name || !refData.name.trim()) {
        results.skipped++;
        continue;
      }
      
      const { data: existing } = await supabase
        .from('drawing_references')
        .select('id')
        .ilike('name', refData.name.trim())
        .single();
      
      if (existing) {
        if (mode === 'update' || mode === 'replace') {
          await updateDrawingReference(existing.id, refData);
          results.updated++;
        } else {
          results.skipped++;
        }
      } else {
        await createDrawingReference(refData);
        results.added++;
      }
    } catch (error) {
      results.errors.push({ name: refData.name, error: error.message });
    }
  }
  
  return results;
}

async function getRandomDrawingReferences(count, category = null) {
  let query = supabase.from('drawing_references').select('*');
  
  if (category) query = query.eq('category', category);
  
  const { data } = await query;
  
  const shuffled = (data || []).sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(r => ({
    id: r.id,
    name: r.name,
    imageUrl: r.image_url,
    category: r.category,
    tags: r.tags ? JSON.parse(r.tags) : []
  }));
}

// ==================== DRAWING GAMES ====================

async function getAllDrawingGames() {
  const { data, error } = await supabase
    .from('drawing_games')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return data.map(g => ({
    id: g.id,
    title: g.title,
    gameType: g.game_type,
    config: g.config ? JSON.parse(g.config) : {},
    createdAt: g.created_at
  }));
}

async function getDrawingGameById(id) {
  const { data } = await supabase
    .from('drawing_games')
    .select('*')
    .eq('id', id)
    .single();
  
  if (!data) return null;
  
  return {
    id: data.id,
    title: data.title,
    gameType: data.game_type,
    config: data.config ? JSON.parse(data.config) : {},
    createdAt: data.created_at
  };
}

async function createDrawingGame(gameData) {
  const id = gameData.id || Date.now().toString();
  
  await supabase.from('drawing_games').insert({
    id,
    title: gameData.title,
    game_type: gameData.gameType,
    config: JSON.stringify(gameData.config || {})
  });
  
  return getDrawingGameById(id);
}

async function updateDrawingGame(id, gameData) {
  await supabase
    .from('drawing_games')
    .update({
      title: gameData.title,
      game_type: gameData.gameType,
      config: JSON.stringify(gameData.config || {})
    })
    .eq('id', id);
  
  return getDrawingGameById(id);
}

async function deleteDrawingGame(id) {
  await supabase.from('drawing_games').delete().eq('id', id);
}

// ==================== DRAWING LOBBIES ====================

async function getAllDrawingLobbies() {
  const { data, error } = await supabase
    .from('drawing_lobbies')
    .select(`
      *,
      drawing_games (title, game_type)
    `)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  const lobbies = [];
  for (const lobby of data) {
    const participants = await getDrawingLobbyParticipants(lobby.id);
    lobbies.push({
      ...lobby,
      game_title: lobby.drawing_games?.title,
      game_type: lobby.drawing_games?.game_type,
      config: lobby.config ? JSON.parse(lobby.config) : null,
      drawer_rotation_order: lobby.drawer_rotation_order ? JSON.parse(lobby.drawer_rotation_order) : null,
      custom_words: lobby.custom_words ? JSON.parse(lobby.custom_words) : [],
      participants
    });
  }
  
  return lobbies;
}

async function getDrawingLobbyById(id) {
  const { data: lobby } = await supabase
    .from('drawing_lobbies')
    .select(`
      *,
      drawing_games (title, game_type)
    `)
    .eq('id', id)
    .single();
  
  if (!lobby) return null;
  
  const participants = await getDrawingLobbyParticipants(id);
  
  return {
    ...lobby,
    game_title: lobby.drawing_games?.title,
    game_type: lobby.drawing_games?.game_type,
    config: lobby.config ? JSON.parse(lobby.config) : null,
    drawer_rotation_order: lobby.drawer_rotation_order ? JSON.parse(lobby.drawer_rotation_order) : null,
    custom_words: lobby.custom_words ? JSON.parse(lobby.custom_words) : [],
    participants
  };
}

async function createDrawingLobby(data) {
  const id = data.id || `drawing-lobby-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  await supabase.from('drawing_lobbies').insert({
    id,
    game_id: data.game_id || null,
    status: 'waiting',
    config: JSON.stringify(data.config || {}),
    creator_id: data.creator_id || null,
    creator_type: data.creator_type || 'admin',
    custom_words: JSON.stringify(data.custom_words || [])
  });
  
  return getDrawingLobbyById(id);
}

async function getDrawingLobbyParticipants(lobbyId) {
  const { data } = await supabase
    .from('drawing_lobby_participants')
    .select(`
      *,
      participants (pseudo, avatar)
    `)
    .eq('lobby_id', lobbyId);
  
  return (data || []).map(p => ({
    ...p,
    pseudo: p.participants?.pseudo,
    avatar: p.participants?.avatar
  }));
}

async function joinDrawingLobby(lobbyId, participantId, teamName) {
  const { data: existing } = await supabase
    .from('drawing_lobby_participants')
    .select('*')
    .eq('lobby_id', lobbyId)
    .eq('participant_id', participantId)
    .single();
  
  if (existing) {
    await supabase
      .from('drawing_lobby_participants')
      .update({ team_name: teamName })
      .eq('lobby_id', lobbyId)
      .eq('participant_id', participantId);
  } else {
    await supabase.from('drawing_lobby_participants').insert({
      lobby_id: lobbyId,
      participant_id: participantId,
      team_name: teamName
    });
  }
  
  return getDrawingLobbyById(lobbyId);
}

async function leaveDrawingLobby(lobbyId, participantId) {
  // Récupérer le lobby avant de retirer le participant
  const lobby = await getDrawingLobbyById(lobbyId);
  if (!lobby) return null;
  
  // Retirer le participant
  await supabase
    .from('drawing_lobby_participants')
    .delete()
    .eq('lobby_id', lobbyId)
    .eq('participant_id', participantId);
  
  // Récupérer le lobby mis à jour
  const updatedLobby = await getDrawingLobbyById(lobbyId);
  
  // Si le lobby est vide et en attente → le supprimer
  if (updatedLobby && updatedLobby.status === 'waiting' && 
      (!updatedLobby.participants || updatedLobby.participants.length === 0)) {
    console.log(`[DRAWING] Lobby ${lobbyId} vide et en attente → suppression automatique`);
    await deleteDrawingLobby(lobbyId);
    return null; // Retourner null pour indiquer que le lobby a été supprimé
  }
  
  // Si le créateur est parti mais il reste des participants → transférer la propriété
  if (updatedLobby && updatedLobby.creator_id === participantId && 
      updatedLobby.participants && updatedLobby.participants.length > 0) {
    const newCreator = updatedLobby.participants[0];
    console.log(`[DRAWING] Transfert de propriété du lobby ${lobbyId} à ${newCreator.odId}`);
    await supabase
      .from('drawing_lobbies')
      .update({ creator_id: newCreator.odId })
      .eq('id', lobbyId);
    
    return getDrawingLobbyById(lobbyId);
  }
  
  return updatedLobby;
}

async function startDrawingLobby(lobbyId, gameState) {
  await supabase
    .from('drawing_lobbies')
    .update({
      status: 'playing',
      current_round: gameState.currentRound || 0,
      current_word: gameState.currentWord || '',
      current_drawer_index: gameState.currentDrawerIndex || 0,
      drawer_rotation_order: JSON.stringify(gameState.drawerRotationOrder || []),
      round_start_time: Date.now(),
      config: JSON.stringify(gameState.config || {})
    })
    .eq('id', lobbyId);
  
  return getDrawingLobbyById(lobbyId);
}

async function updateDrawingLobbyCustomWords(lobbyId, customWords) {
  await supabase
    .from('drawing_lobbies')
    .update({ custom_words: JSON.stringify(customWords) })
    .eq('id', lobbyId);
  
  return getDrawingLobbyById(lobbyId);
}

async function updateDrawingLobbyState(lobbyId, updates) {
  const updateData = {};
  
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.currentRound !== undefined) updateData.current_round = updates.currentRound;
  if (updates.currentWord !== undefined) updateData.current_word = updates.currentWord;
  if (updates.currentDrawerIndex !== undefined) updateData.current_drawer_index = updates.currentDrawerIndex;
  if (updates.roundStartTime !== undefined) updateData.round_start_time = updates.roundStartTime;
  
  if (Object.keys(updateData).length > 0) {
    await supabase
      .from('drawing_lobbies')
      .update(updateData)
      .eq('id', lobbyId);
  }
  
  return getDrawingLobbyById(lobbyId);
}

async function finishDrawingLobby(lobbyId) {
  await supabase
    .from('drawing_lobbies')
    .update({ status: 'finished' })
    .eq('id', lobbyId);
  
  return getDrawingLobbyById(lobbyId);
}

async function deleteDrawingLobby(id) {
  await supabase.from('drawing_lobby_participants').delete().eq('lobby_id', id);
  await supabase.from('drawing_scores').delete().eq('lobby_id', id);
  await supabase.from('drawings').delete().eq('lobby_id', id);
  await supabase.from('drawing_lobbies').delete().eq('id', id);
}

async function addDrawingScore(lobbyId, teamName, points, reason, round) {
  await supabase.from('drawing_scores').insert({
    lobby_id: lobbyId,
    team_name: teamName,
    points,
    reason,
    round
  });
}

async function archiveDrawingLobby(lobbyId) {
  await supabase
    .from('drawing_lobbies')
    .update({ status: 'archived' })
    .eq('id', lobbyId);
  
  return getDrawingLobbyById(lobbyId);
}

// ==================== DRAWINGS ====================

async function saveDrawing(lobbyId, round, teamName, word, imageData) {
  const id = `drawing-${lobbyId}-${round}-${Date.now()}`;
  
  await supabase.from('drawings').insert({
    id,
    lobby_id: lobbyId,
    round,
    team_id: teamName,
    word_or_reference: word,
    image_data: imageData
  });
  
  return id;
}

async function getDrawingsByLobby(lobbyId) {
  const { data } = await supabase
    .from('drawings')
    .select('*')
    .eq('lobby_id', lobbyId)
    .order('round');
  
  return (data || []).map(d => ({
    id: d.id,
    lobby_id: d.lobby_id,
    round: d.round,
    team_name: d.team_id,
    word: d.word_or_reference,
    image_data: d.image_data,
    created_at: d.created_at
  }));
}

async function getDrawingById(id) {
  const { data } = await supabase
    .from('drawings')
    .select('*')
    .eq('id', id)
    .single();
  
  if (!data) return null;
  
  return {
    id: data.id,
    lobby_id: data.lobby_id,
    round: data.round,
    team_name: data.team_id,
    word: data.word_or_reference,
    image_data: data.image_data,
    created_at: data.created_at
  };
}

async function getDrawingScoresByLobby(lobbyId) {
  const { data } = await supabase
    .from('drawing_scores')
    .select('*')
    .eq('lobby_id', lobbyId);
  
  // Agréger par équipe
  const scoresByTeam = {};
  (data || []).forEach(s => {
    if (!scoresByTeam[s.team_name]) {
      scoresByTeam[s.team_name] = { total_points: 0, details: [] };
    }
    scoresByTeam[s.team_name].total_points += s.points;
    scoresByTeam[s.team_name].details.push(`${s.round}:${s.points}:${s.reason}`);
  });
  
  return Object.entries(scoresByTeam)
    .map(([team_name, info]) => ({
      team_name,
      total_points: info.total_points,
      details: info.details.join(',')
    }))
    .sort((a, b) => b.total_points - a.total_points);
}

async function getDrawingLobbyResults(lobbyId) {
  const lobby = await getDrawingLobbyById(lobbyId);
  if (!lobby) return null;
  
  const drawings = await getDrawingsByLobby(lobbyId);
  const scores = await getDrawingScoresByLobby(lobbyId);
  
  const ranking = scores.map((s, idx) => ({
    rank: idx + 1,
    team: s.team_name,
    score: s.total_points || 0
  }));
  
  return { lobby, drawings, scores, ranking };
}

// ==================== MYSTERY GRID (Case Mystère) ====================

// Récupérer toutes les grilles mystères
async function getAllMysteryGrids() {
  const { data, error } = await supabase
    .from('mystery_grids')
    .select('*')
    .order('created_at', { ascending: false });
  
  // Si erreur (table n'existe pas), retourner tableau vide
  if (error) {
    console.error('[DB] Erreur getAllMysteryGrids:', error.message);
    return [];
  }
  
  if (!data || data.length === 0) return [];
  
  // Récupérer les types pour chaque grille
  const grids = await Promise.all(data.map(async (grid) => {
    const types = await getMysteryGridTypes(grid.id);
    const totalOccurrences = types.reduce((sum, t) => sum + t.occurrence, 0);
    return {
      id: grid.id,
      title: grid.title,
      gridSize: grid.grid_size,
      defaultSoundUrl: grid.default_sound_url,
      thumbnailDefault: grid.thumbnail_default,
      types,
      totalOccurrences,
      isValid: totalOccurrences === grid.grid_size,
      createdAt: grid.created_at,
      updatedAt: grid.updated_at
    };
  }));
  
  return grids;
}

// Récupérer une grille par ID
async function getMysteryGridById(gridId) {
  const { data, error } = await supabase
    .from('mystery_grids')
    .select('*')
    .eq('id', gridId)
    .single();
  
  if (error) return null;
  
  const types = await getMysteryGridTypes(gridId);
  const totalOccurrences = types.reduce((sum, t) => sum + t.occurrence, 0);
  
  return {
    id: data.id,
    title: data.title,
    gridSize: data.grid_size,
    defaultSoundUrl: data.default_sound_url,
    thumbnailDefault: data.thumbnail_default,
    types,
    totalOccurrences,
    isValid: totalOccurrences === data.grid_size,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
}

// Créer une grille mystère
async function createMysteryGrid(gridData) {
  const { data, error } = await supabase
    .from('mystery_grids')
    .insert({
      title: gridData.title,
      grid_size: gridData.gridSize,
      default_sound_url: gridData.defaultSoundUrl || null,
      thumbnail_default: gridData.thumbnailDefault || null
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    title: data.title,
    gridSize: data.grid_size,
    defaultSoundUrl: data.default_sound_url,
    thumbnailDefault: data.thumbnail_default,
    types: [],
    totalOccurrences: 0,
    isValid: false,
    createdAt: data.created_at
  };
}

// Mettre à jour une grille mystère
async function updateMysteryGrid(gridId, gridData) {
  const updateData = {};
  if (gridData.title !== undefined) updateData.title = gridData.title;
  if (gridData.gridSize !== undefined) updateData.grid_size = gridData.gridSize;
  if (gridData.defaultSoundUrl !== undefined) updateData.default_sound_url = gridData.defaultSoundUrl;
  if (gridData.thumbnailDefault !== undefined) updateData.thumbnail_default = gridData.thumbnailDefault;
  
  const { data, error } = await supabase
    .from('mystery_grids')
    .update(updateData)
    .eq('id', gridId)
    .select()
    .single();
  
  if (error) throw error;
  
  return getMysteryGridById(gridId);
}

// Supprimer une grille mystère
async function deleteMysteryGrid(gridId) {
  const { error } = await supabase
    .from('mystery_grids')
    .delete()
    .eq('id', gridId);
  
  if (error) throw error;
  return true;
}

// Récupérer les types d'une grille
async function getMysteryGridTypes(gridId) {
  const { data, error } = await supabase
    .from('mystery_grid_types')
    .select('*')
    .eq('grid_id', gridId)
    .order('created_at');
  
  // Si erreur, retourner tableau vide
  if (error) {
    console.error('[DB] Erreur getMysteryGridTypes:', error.message);
    return [];
  }
  
  if (!data) return [];
  
  return data.map(t => ({
    id: t.id,
    gridId: t.grid_id,
    name: t.name,
    imageUrl: t.image_url,
    thumbnailUrl: t.thumbnail_url,
    soundUrl: t.sound_url,
    occurrence: t.occurrence,
    createdAt: t.created_at
  }));
}

// Créer un type de case
async function createMysteryGridType(gridId, typeData) {
  const { data, error } = await supabase
    .from('mystery_grid_types')
    .insert({
      grid_id: gridId,
      name: typeData.name,
      image_url: typeData.imageUrl || null,
      thumbnail_url: typeData.thumbnailUrl || null,
      sound_url: typeData.soundUrl || null,
      occurrence: typeData.occurrence || 1
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    gridId: data.grid_id,
    name: data.name,
    imageUrl: data.image_url,
    thumbnailUrl: data.thumbnail_url,
    soundUrl: data.sound_url,
    occurrence: data.occurrence,
    createdAt: data.created_at
  };
}

// Mettre à jour un type de case
async function updateMysteryGridType(typeId, typeData) {
  const updateData = {};
  if (typeData.name !== undefined) updateData.name = typeData.name;
  if (typeData.imageUrl !== undefined) updateData.image_url = typeData.imageUrl;
  if (typeData.thumbnailUrl !== undefined) updateData.thumbnail_url = typeData.thumbnailUrl;
  if (typeData.soundUrl !== undefined) updateData.sound_url = typeData.soundUrl;
  if (typeData.occurrence !== undefined) updateData.occurrence = typeData.occurrence;
  
  const { data, error } = await supabase
    .from('mystery_grid_types')
    .update(updateData)
    .eq('id', typeId)
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    gridId: data.grid_id,
    name: data.name,
    imageUrl: data.image_url,
    thumbnailUrl: data.thumbnail_url,
    soundUrl: data.sound_url,
    occurrence: data.occurrence,
    createdAt: data.created_at
  };
}

// Supprimer un type de case
async function deleteMysteryGridType(typeId) {
  const { error } = await supabase
    .from('mystery_grid_types')
    .delete()
    .eq('id', typeId);
  
  if (error) throw error;
  return true;
}

// ==================== MYSTERY LOBBIES ====================

// Récupérer tous les lobbies mystère
async function getAllMysteryLobbies() {
  const { data, error } = await supabase
    .from('mystery_lobbies')
    .select('*, mystery_grids(title)')
    .order('created_at', { ascending: false });
  
  // Si erreur (table n'existe pas), retourner tableau vide
  if (error) {
    console.error('[DB] Erreur getAllMysteryLobbies:', error.message);
    return [];
  }
  
  if (!data) return [];
  
  return data.map(l => ({
    id: l.id,
    gridId: l.grid_id,
    gridTitle: l.mystery_grids?.title,
    status: l.status,
    gameState: l.game_state,
    participants: l.participants || [],
    currentReveal: l.current_reveal,
    mutedParticipants: l.muted_participants || {},
    createdBy: l.created_by,
    createdAt: l.created_at,
    finishedAt: l.finished_at
  }));
}

// Récupérer un lobby par ID
async function getMysteryLobbyById(lobbyId) {
  const { data, error } = await supabase
    .from('mystery_lobbies')
    .select('*, mystery_grids(*)')
    .eq('id', lobbyId)
    .single();
  
  if (error) return null;
  
  // Récupérer les types de la grille
  const types = data.mystery_grids ? await getMysteryGridTypes(data.grid_id) : [];
  
  return {
    id: data.id,
    gridId: data.grid_id,
    grid: data.mystery_grids ? {
      id: data.mystery_grids.id,
      title: data.mystery_grids.title,
      gridSize: data.mystery_grids.grid_size,
      defaultSoundUrl: data.mystery_grids.default_sound_url,
      thumbnailDefault: data.mystery_grids.thumbnail_default,
      types
    } : null,
    status: data.status,
    gameState: data.game_state,
    participants: data.participants || [],
    currentReveal: data.current_reveal,
    mutedParticipants: data.muted_participants || {},
    createdBy: data.created_by,
    createdAt: data.created_at,
    finishedAt: data.finished_at
  };
}

// Créer un lobby mystère
async function createMysteryLobby(gridId, createdBy = null) {
  const grid = await getMysteryGridById(gridId);
  if (!grid) throw new Error('Grille non trouvée');
  if (!grid.isValid) throw new Error('La grille n\'est pas valide (nombre de cases incorrect)');
  
  // Générer l'état initial du jeu avec les cases mélangées
  const cells = [];
  grid.types.forEach(type => {
    for (let i = 0; i < type.occurrence; i++) {
      cells.push({
        typeId: type.id,
        revealed: false
      });
    }
  });
  
  // Mélanger les cases (Fisher-Yates)
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  
  // Ajouter les index
  const gameState = {
    cells: cells.map((cell, index) => ({ ...cell, index })),
    revealedCount: 0,
    totalCells: cells.length
  };
  
  const lobbyId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const { data, error } = await supabase
    .from('mystery_lobbies')
    .insert({
      id: lobbyId,
      grid_id: gridId,
      status: 'waiting',
      game_state: gameState,
      participants: [],
      muted_participants: {},
      created_by: createdBy
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return getMysteryLobbyById(lobbyId);
}

// Rejoindre un lobby mystère
async function joinMysteryLobby(lobbyId, odId, pseudo, teamName) {
  const lobby = await getMysteryLobbyById(lobbyId);
  if (!lobby) throw new Error('Lobby non trouvé');
  
  // Vérifier si déjà participant
  const existing = lobby.participants.find(p => p.odId === odId);
  if (existing) return lobby;
  
  const participants = [...lobby.participants, {
    odId,
    pseudo,
    teamName,
    joinedAt: new Date().toISOString()
  }];
  
  const { error } = await supabase
    .from('mystery_lobbies')
    .update({ participants })
    .eq('id', lobbyId);
  
  if (error) throw error;
  
  return getMysteryLobbyById(lobbyId);
}

// Quitter un lobby mystère
async function leaveMysteryLobby(lobbyId, odId) {
  const lobby = await getMysteryLobbyById(lobbyId);
  if (!lobby) return null;
  
  const participants = lobby.participants.filter(p => p.odId !== odId);
  
  const { error } = await supabase
    .from('mystery_lobbies')
    .update({ participants })
    .eq('id', lobbyId);
  
  if (error) throw error;
  
  return getMysteryLobbyById(lobbyId);
}

// Démarrer un lobby mystère
async function startMysteryLobby(lobbyId) {
  const { data, error } = await supabase
    .from('mystery_lobbies')
    .update({ status: 'playing' })
    .eq('id', lobbyId)
    .select()
    .single();
  
  if (error) throw error;
  
  return getMysteryLobbyById(lobbyId);
}

// Révéler une case
async function revealMysteryCell(lobbyId, cellIndex) {
  const lobby = await getMysteryLobbyById(lobbyId);
  if (!lobby) throw new Error('Lobby non trouvé');
  if (lobby.status !== 'playing') throw new Error('Le jeu n\'est pas en cours');
  
  const gameState = lobby.gameState;
  const cell = gameState.cells.find(c => c.index === cellIndex);
  
  if (!cell) throw new Error('Case non trouvée');
  if (cell.revealed) throw new Error('Case déjà révélée');
  
  // Trouver le type de la case
  const cellType = lobby.grid.types.find(t => t.id === cell.typeId);
  if (!cellType) throw new Error('Type de case non trouvé');
  
  // Marquer comme révélée
  cell.revealed = true;
  gameState.revealedCount++;
  
  // Préparer les infos de révélation
  const currentReveal = {
    index: cellIndex,
    typeId: cell.typeId,
    name: cellType.name,
    imageUrl: cellType.imageUrl,
    thumbnailUrl: cellType.thumbnailUrl || cellType.imageUrl || lobby.grid.thumbnailDefault,
    soundUrl: cellType.soundUrl || lobby.grid.defaultSoundUrl
  };
  
  const { error } = await supabase
    .from('mystery_lobbies')
    .update({ 
      game_state: gameState,
      current_reveal: currentReveal
    })
    .eq('id', lobbyId);
  
  if (error) throw error;
  
  return {
    lobby: await getMysteryLobbyById(lobbyId),
    reveal: currentReveal,
    allRevealed: gameState.revealedCount === gameState.totalCells
  };
}

// Fermer la modale de révélation
async function closeMysteryReveal(lobbyId) {
  const { error } = await supabase
    .from('mystery_lobbies')
    .update({ current_reveal: null })
    .eq('id', lobbyId);
  
  if (error) throw error;
  
  return getMysteryLobbyById(lobbyId);
}

// Toggle mute pour un participant
async function toggleMysteryMute(lobbyId, odId, muted) {
  const lobby = await getMysteryLobbyById(lobbyId);
  if (!lobby) throw new Error('Lobby non trouvé');
  
  const mutedParticipants = { ...lobby.mutedParticipants, [odId]: muted };
  
  const { error } = await supabase
    .from('mystery_lobbies')
    .update({ muted_participants: mutedParticipants })
    .eq('id', lobbyId);
  
  if (error) throw error;
  
  return getMysteryLobbyById(lobbyId);
}

// Terminer un lobby mystère
async function finishMysteryLobby(lobbyId) {
  const { error } = await supabase
    .from('mystery_lobbies')
    .update({ 
      status: 'finished',
      current_reveal: null,
      finished_at: new Date().toISOString()
    })
    .eq('id', lobbyId);
  
  if (error) throw error;
  
  return getMysteryLobbyById(lobbyId);
}

// Supprimer un lobby mystère
async function deleteMysteryLobby(lobbyId) {
  const { error } = await supabase
    .from('mystery_lobbies')
    .delete()
    .eq('id', lobbyId);
  
  if (error) throw error;
  return true;
}

// ==================== MEDIA LIBRARY ====================

// Rechercher des médias avec pagination
async function searchMedia(searchTerm = '', mediaType = '', tag = '', limit = 20, offset = 0) {
  let query = supabase
    .from('media_library')
    .select('*', { count: 'exact' });
  
  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,tags.cs.["${searchTerm}"]`);
  }
  
  if (mediaType) {
    query = query.eq('type', mediaType);
  }
  
  if (tag) {
    query = query.contains('tags', [tag]);
  }
  
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) throw error;
  
  return {
    media: data || [],
    total: count || 0
  };
}

// Récupérer un média par ID
async function getMediaById(id) {
  const { data, error } = await supabase
    .from('media_library')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Créer un média
async function createMedia({ name, type, url, thumbnailUrl, tags, durationSeconds, fileSize, createdBy, autoplay, defaultVolume }) {
  const { data, error } = await supabase
    .from('media_library')
    .insert({
      name,
      type,
      url,
      thumbnail_url: thumbnailUrl,
      tags: tags || [],
      duration_seconds: durationSeconds,
      file_size: fileSize,
      created_by: createdBy,
      autoplay: autoplay !== false,
      default_volume: defaultVolume !== undefined ? defaultVolume : 80
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Modifier un média
async function updateMedia(id, { name, tags, thumbnailUrl, autoplay, defaultVolume }) {
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (tags !== undefined) updates.tags = tags;
  if (thumbnailUrl !== undefined) updates.thumbnail_url = thumbnailUrl;
  if (autoplay !== undefined) updates.autoplay = autoplay;
  if (defaultVolume !== undefined) updates.default_volume = defaultVolume;
  
  const { data, error } = await supabase
    .from('media_library')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Supprimer un média
async function deleteMedia(id) {
  const { error } = await supabase
    .from('media_library')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
  return true;
}

// Récupérer les médias associés à une grille mystère
async function getGridMedia(gridId) {
  const { data, error } = await supabase
    .from('mystery_grid_media')
    .select(`
      id,
      sort_order,
      media:media_id (
        id, name, type, url, thumbnail_url, tags, duration_seconds
      )
    `)
    .eq('grid_id', gridId)
    .order('sort_order', { ascending: true });
  
  if (error) throw error;
  
  // Aplatir la structure
  return (data || []).map(item => ({
    linkId: item.id,
    sortOrder: item.sort_order,
    ...item.media
  }));
}

// Ajouter un média à une grille
async function addMediaToGrid(gridId, mediaId, sortOrder = 0) {
  const { data, error } = await supabase
    .from('mystery_grid_media')
    .insert({
      grid_id: gridId,
      media_id: mediaId,
      sort_order: sortOrder
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Retirer un média d'une grille
async function removeMediaFromGrid(gridId, mediaId) {
  const { error } = await supabase
    .from('mystery_grid_media')
    .delete()
    .eq('grid_id', gridId)
    .eq('media_id', mediaId);
  
  if (error) throw error;
  return true;
}

// Sauvegarder un broadcast dans l'historique
async function saveBroadcast({ lobbyId, lobbyType, senderId, senderPseudo, message, mediaId, options }) {
  const { data, error } = await supabase
    .from('broadcast_history')
    .insert({
      lobby_id: lobbyId,
      lobby_type: lobbyType,
      sender_id: senderId,
      sender_pseudo: senderPseudo,
      message,
      media_id: mediaId,
      options: options || {}
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Récupérer l'historique des broadcasts d'un lobby
async function getBroadcastHistory(lobbyId, limit = 20) {
  const { data, error } = await supabase
    .from('broadcast_history')
    .select(`
      *,
      media:media_id (
        id, name, type, url, thumbnail_url
      )
    `)
    .eq('lobby_id', lobbyId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

// ==================== EXPORTS ====================

module.exports = {
  initDatabase,
  getDatabase,
  closeDatabase,
  saveDatabase,
  hashPasswordSync,
  verifyPasswordSync,
  normalizeTeamName,
  areTeamNamesEqual,
  
  // Admins
  verifyAdmin,
  
  // Teams
  getAllTeams,
  getTeamByName,
  getTeamById,
  createTeam,
  updateTeamScore, // DEPRECATED
  addTeamScore, // DEPRECATED - utiliser addTeamScoreByCategory
  addTeamScoreByCategory,
  setTeamScoreByCategory,
  deleteTeamScoreCategory,
  resetAllTeamScores,
  deleteTeam,
  saveAllTeams,
  
  // Participants
  getAllParticipants,
  getParticipantByPseudo,
  getParticipantById,
  createParticipant,
  updateParticipantTeam,
  updateParticipantAvatar,
  updateParticipantPassword,
  updateParticipantPseudo,
  deleteParticipant,
  verifyParticipantPassword,
  saveAllParticipants,
  
  // Questions
  getAllQuestions,
  getQuestionById,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  saveAllQuestions,
  mergeQuestions,
  
  // Quizzes
  getAllQuizzes,
  getAllQuizCategories,
  getQuizById,
  getQuizQuestions,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  saveAllQuizzes,
  
  // Lobbies
  getAllLobbies,
  getLobbyById,
  getLobbyParticipants,
  createLobby,
  joinLobby,
  leaveLobby,
  startLobby,
  updateLobbyQuestionIndex,
  finishLobby,
  resetLobby,
  archiveLobby,
  deleteLobby,
  
  // Lobby Answers
  autoSaveAnswer,
  submitAnswer,
  markTimeExpired,
  validateAnswer,
  markQcmTeamScored,
  markAnswerPasted,
  getParticipantValidation,
  hasTeamScoredForQuestion,
  updateLobbyParticipantTeam,
  
  // Drawing Words (Pictionary)
  getAllDrawingWords,
  getDrawingWordById,
  createDrawingWord,
  updateDrawingWord,
  deleteDrawingWord,
  mergeDrawingWords,
  getRandomDrawingWords,
  
  // Drawing References (Passe moi le relais)
  getAllDrawingReferences,
  getDrawingReferenceById,
  createDrawingReference,
  updateDrawingReference,
  deleteDrawingReference,
  mergeDrawingReferences,
  getRandomDrawingReferences,
  
  // Drawing Games
  getAllDrawingGames,
  getDrawingGameById,
  createDrawingGame,
  updateDrawingGame,
  deleteDrawingGame,
  
  // Drawing Lobbies (Pictionary/Téléphone)
  getAllDrawingLobbies,
  getDrawingLobbyById,
  createDrawingLobby,
  joinDrawingLobby,
  leaveDrawingLobby,
  startDrawingLobby,
  updateDrawingLobbyState,
  updateDrawingLobbyCustomWords,
  finishDrawingLobby,
  deleteDrawingLobby,
  getDrawingLobbyParticipants,
  addDrawingScore,
  archiveDrawingLobby,
  getDrawingLobbyResults,
  
  // Drawings (Dessins sauvegardés)
  saveDrawing,
  getDrawingsByLobby,
  getDrawingById,
  getDrawingScoresByLobby,
  
  // Roles
  ROLES,
  hasRole,
  isAdmin,
  isSuperAdmin,
  updateParticipantRole,
  getParticipantsByRole,
  getAdminParticipants,
  
  // Mystery Grids (Case Mystère)
  getAllMysteryGrids,
  getMysteryGridById,
  createMysteryGrid,
  updateMysteryGrid,
  deleteMysteryGrid,
  getMysteryGridTypes,
  createMysteryGridType,
  updateMysteryGridType,
  deleteMysteryGridType,
  
  // Mystery Lobbies
  getAllMysteryLobbies,
  getMysteryLobbyById,
  createMysteryLobby,
  joinMysteryLobby,
  leaveMysteryLobby,
  startMysteryLobby,
  revealMysteryCell,
  closeMysteryReveal,
  toggleMysteryMute,
  finishMysteryLobby,
  deleteMysteryLobby,
  
  // Media Library
  searchMedia,
  getMediaById,
  createMedia,
  updateMedia,
  deleteMedia,
  getGridMedia,
  addMediaToGrid,
  removeMediaFromGrid,
  saveBroadcast,
  getBroadcastHistory
};
