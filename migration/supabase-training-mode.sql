-- ============================================
-- WILCO QUIZ - Ajout du mode entraînement
-- ============================================

-- Ajouter la colonne training_mode à la table lobbies
-- 0 = mode normal (les points comptent)
-- 1 = mode entraînement (les points ne comptent pas)

ALTER TABLE lobbies ADD COLUMN IF NOT EXISTS training_mode INTEGER DEFAULT 0;

-- Index optionnel pour filtrer rapidement les lobbies d'entraînement
CREATE INDEX IF NOT EXISTS idx_lobbies_training_mode ON lobbies(training_mode);
