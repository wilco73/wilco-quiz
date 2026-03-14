-- ============================================================
-- WILCO QUIZ - SCHEMA POSTGRESQL POUR SUPABASE
-- ============================================================
-- Ce fichier crée toutes les tables nécessaires pour l'application
-- À exécuter dans Supabase SQL Editor
-- ============================================================

-- Activer l'extension UUID si nécessaire
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: admins
-- Administrateurs de l'application
-- ============================================================
CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email TEXT,
    role TEXT DEFAULT 'admin',  -- 'super_admin', 'admin', 'moderator'
    created_by INTEGER REFERENCES admins(id),
    last_login BIGINT,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Index pour recherche par username
CREATE INDEX IF NOT EXISTS idx_admins_username ON admins(username);

-- ============================================================
-- TABLE: teams
-- Équipes des participants
-- ============================================================
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    validated_score INTEGER DEFAULT 0,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Index pour recherche par nom
CREATE INDEX IF NOT EXISTS idx_teams_name ON teams(name);

-- ============================================================
-- TABLE: participants
-- Joueurs/Participants
-- ============================================================
CREATE TABLE IF NOT EXISTS participants (
    id TEXT PRIMARY KEY,
    pseudo TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    team_id INTEGER REFERENCES teams(id) ON DELETE SET NULL,
    avatar TEXT DEFAULT 'default',
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Index pour recherche par pseudo et team
CREATE INDEX IF NOT EXISTS idx_participants_pseudo ON participants(pseudo);
CREATE INDEX IF NOT EXISTS idx_participants_team ON participants(team_id);

-- ============================================================
-- TABLE: questions
-- Banque de questions
-- ============================================================
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    answer TEXT NOT NULL,
    type TEXT DEFAULT 'text',  -- 'text', 'qcm', 'image', 'audio', 'video'
    category TEXT,
    tags TEXT,  -- JSON array stocké en texte
    points INTEGER DEFAULT 1,
    timer INTEGER DEFAULT 0,
    media TEXT,  -- URL du média
    media_type TEXT,  -- 'image', 'audio', 'video'
    choices TEXT,  -- JSON array pour QCM
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Index pour recherche par catégorie
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
CREATE INDEX IF NOT EXISTS idx_questions_type ON questions(type);

-- ============================================================
-- TABLE: quizzes
-- Quiz (ensemble de questions)
-- ============================================================
CREATE TABLE IF NOT EXISTS quizzes (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    group_name TEXT,  -- Pour regrouper les quiz
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Index pour recherche par groupe
CREATE INDEX IF NOT EXISTS idx_quizzes_group ON quizzes(group_name);

-- ============================================================
-- TABLE: quiz_questions
-- Liaison quiz-questions (ordre des questions)
-- ============================================================
CREATE TABLE IF NOT EXISTS quiz_questions (
    id SERIAL PRIMARY KEY,
    quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    position INTEGER NOT NULL,
    UNIQUE(quiz_id, question_id)
);

-- Index pour recherche par quiz
CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz ON quiz_questions(quiz_id);

-- ============================================================
-- TABLE: lobbies
-- Sessions de jeu (salles)
-- ============================================================
CREATE TABLE IF NOT EXISTS lobbies (
    id TEXT PRIMARY KEY,
    quiz_id TEXT NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'waiting',  -- 'waiting', 'playing', 'finished'
    current_question_index INTEGER DEFAULT 0,
    shuffled INTEGER DEFAULT 0,  -- 0 = false, 1 = true
    shuffled_questions TEXT,  -- JSON array des IDs mélangés
    start_time BIGINT,
    archived INTEGER DEFAULT 0,  -- 0 = false, 1 = true
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Index pour recherche par status
CREATE INDEX IF NOT EXISTS idx_lobbies_status ON lobbies(status);
CREATE INDEX IF NOT EXISTS idx_lobbies_quiz ON lobbies(quiz_id);

-- ============================================================
-- TABLE: lobby_participants
-- Participants dans un lobby
-- ============================================================
CREATE TABLE IF NOT EXISTS lobby_participants (
    id SERIAL PRIMARY KEY,
    lobby_id TEXT NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    team_name TEXT,
    has_answered INTEGER DEFAULT 0,
    current_answer TEXT DEFAULT '',
    draft_answer TEXT DEFAULT '',
    UNIQUE(lobby_id, participant_id)
);

-- Index pour recherche par lobby
CREATE INDEX IF NOT EXISTS idx_lobby_participants_lobby ON lobby_participants(lobby_id);

-- ============================================================
-- TABLE: lobby_answers
-- Réponses des participants aux questions
-- ============================================================
CREATE TABLE IF NOT EXISTS lobby_answers (
    id SERIAL PRIMARY KEY,
    lobby_id TEXT NOT NULL REFERENCES lobbies(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
    answer TEXT,
    validation INTEGER,  -- NULL = non validé, 1 = correct, 0 = incorrect
    qcm_team_scored INTEGER DEFAULT 0,
    has_pasted INTEGER DEFAULT 0,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    UNIQUE(lobby_id, participant_id, question_id)
);

-- Index pour recherche
CREATE INDEX IF NOT EXISTS idx_lobby_answers_lobby ON lobby_answers(lobby_id);
CREATE INDEX IF NOT EXISTS idx_lobby_answers_participant ON lobby_answers(participant_id);

-- ============================================================
-- TABLES JEUX DE DESSIN
-- ============================================================

-- ============================================================
-- TABLE: drawing_words
-- Banque de mots pour Pictionary
-- ============================================================
CREATE TABLE IF NOT EXISTS drawing_words (
    id TEXT PRIMARY KEY,
    word TEXT NOT NULL,
    category TEXT,
    difficulty TEXT DEFAULT 'moyen',  -- 'facile', 'moyen', 'difficile'
    tags TEXT,  -- JSON array
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Index pour recherche par catégorie
CREATE INDEX IF NOT EXISTS idx_drawing_words_category ON drawing_words(category);

-- ============================================================
-- TABLE: drawing_references
-- Images de référence pour Téléphone Arabe
-- ============================================================
CREATE TABLE IF NOT EXISTS drawing_references (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT,
    tags TEXT,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Index pour recherche par catégorie
CREATE INDEX IF NOT EXISTS idx_drawing_references_category ON drawing_references(category);

-- ============================================================
-- TABLE: drawing_games
-- Configuration des parties de dessin
-- ============================================================
CREATE TABLE IF NOT EXISTS drawing_games (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    game_type TEXT NOT NULL,  -- 'pictionary', 'telephone', etc.
    config TEXT,  -- JSON configuration
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- ============================================================
-- TABLE: drawing_game_words
-- Mots personnalisés pour une partie
-- ============================================================
CREATE TABLE IF NOT EXISTS drawing_game_words (
    id SERIAL PRIMARY KEY,
    game_id TEXT NOT NULL REFERENCES drawing_games(id) ON DELETE CASCADE,
    word_id TEXT,
    custom_word TEXT,
    proposed_by TEXT,
    approved INTEGER DEFAULT 1
);

-- Index
CREATE INDEX IF NOT EXISTS idx_drawing_game_words_game ON drawing_game_words(game_id);

-- ============================================================
-- TABLE: drawing_lobbies
-- Lobbies pour jeux de dessin
-- ============================================================
CREATE TABLE IF NOT EXISTS drawing_lobbies (
    id TEXT PRIMARY KEY,
    game_id TEXT REFERENCES drawing_games(id),
    status TEXT DEFAULT 'waiting',
    current_round INTEGER DEFAULT 0,
    current_drawer_index INTEGER DEFAULT 0,
    current_word TEXT,
    round_start_time BIGINT,
    drawer_rotation_order TEXT,  -- JSON array
    config TEXT,  -- JSON configuration
    creator_id TEXT,
    creator_type TEXT DEFAULT 'admin',
    custom_words TEXT,  -- JSON array
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Index
CREATE INDEX IF NOT EXISTS idx_drawing_lobbies_status ON drawing_lobbies(status);

-- ============================================================
-- TABLE: drawing_lobby_participants
-- Participants dans un lobby de dessin
-- ============================================================
CREATE TABLE IF NOT EXISTS drawing_lobby_participants (
    id SERIAL PRIMARY KEY,
    lobby_id TEXT NOT NULL REFERENCES drawing_lobbies(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
    team_name TEXT,
    is_drawing INTEGER DEFAULT 0,
    UNIQUE(lobby_id, participant_id)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_drawing_lobby_participants_lobby ON drawing_lobby_participants(lobby_id);

-- ============================================================
-- TABLE: drawings
-- Dessins sauvegardés
-- ============================================================
CREATE TABLE IF NOT EXISTS drawings (
    id TEXT PRIMARY KEY,
    lobby_id TEXT NOT NULL REFERENCES drawing_lobbies(id) ON DELETE CASCADE,
    round INTEGER NOT NULL,
    team_id TEXT,
    image_data TEXT,  -- Base64 ou URL
    word_or_reference TEXT,
    source_drawing_id TEXT,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Index
CREATE INDEX IF NOT EXISTS idx_drawings_lobby ON drawings(lobby_id);

-- ============================================================
-- TABLE: drawing_scores
-- Scores des jeux de dessin
-- ============================================================
CREATE TABLE IF NOT EXISTS drawing_scores (
    id SERIAL PRIMARY KEY,
    lobby_id TEXT NOT NULL REFERENCES drawing_lobbies(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    round INTEGER,
    points INTEGER DEFAULT 0,
    reason TEXT,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Index
CREATE INDEX IF NOT EXISTS idx_drawing_scores_lobby ON drawing_scores(lobby_id);

-- ============================================================
-- FONCTIONS UTILITAIRES
-- ============================================================

-- Fonction pour obtenir le timestamp actuel en millisecondes
CREATE OR REPLACE FUNCTION current_timestamp_ms()
RETURNS BIGINT AS $$
BEGIN
    RETURN (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- COMMENTAIRES SUR LES TABLES
-- ============================================================
COMMENT ON TABLE admins IS 'Administrateurs de l''application Wilco Quiz';
COMMENT ON TABLE teams IS 'Équipes des participants';
COMMENT ON TABLE participants IS 'Joueurs/Participants';
COMMENT ON TABLE questions IS 'Banque de questions pour les quiz';
COMMENT ON TABLE quizzes IS 'Quiz (ensemble de questions)';
COMMENT ON TABLE quiz_questions IS 'Liaison entre quiz et questions avec ordre';
COMMENT ON TABLE lobbies IS 'Sessions de jeu (salles de quiz)';
COMMENT ON TABLE lobby_participants IS 'Participants dans une session de jeu';
COMMENT ON TABLE lobby_answers IS 'Réponses des participants aux questions';
COMMENT ON TABLE drawing_words IS 'Banque de mots pour le mode Pictionary';
COMMENT ON TABLE drawing_references IS 'Images de référence pour le mode Téléphone Arabe';
COMMENT ON TABLE drawing_games IS 'Configuration des parties de dessin';
COMMENT ON TABLE drawing_game_words IS 'Mots personnalisés par partie';
COMMENT ON TABLE drawing_lobbies IS 'Sessions de jeu de dessin';
COMMENT ON TABLE drawing_lobby_participants IS 'Participants dans une session de dessin';
COMMENT ON TABLE drawings IS 'Dessins sauvegardés';
COMMENT ON TABLE drawing_scores IS 'Scores des jeux de dessin';

-- ============================================================
-- FIN DU SCHEMA
-- ============================================================
