-- ============================================
-- WILCO QUIZ - Ajout de created_by aux mystery_lobbies
-- ============================================

-- Ajouter la colonne created_by si elle n'existe pas
ALTER TABLE mystery_lobbies 
ADD COLUMN IF NOT EXISTS created_by TEXT;

-- Index pour les recherches par créateur
CREATE INDEX IF NOT EXISTS idx_mystery_lobbies_created_by ON mystery_lobbies(created_by);
