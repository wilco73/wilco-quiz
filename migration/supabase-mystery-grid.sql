-- =====================================================
-- WILCO QUIZ - MYSTERY GRID (Case Mystère)
-- Script de création des tables Supabase
-- =====================================================

-- Table principale des grilles mystères
CREATE TABLE IF NOT EXISTS mystery_grids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  grid_size INTEGER NOT NULL CHECK (grid_size > 0 AND grid_size <= 100),
  default_sound_url TEXT, -- Son par défaut (optionnel, URL vers R2)
  thumbnail_default TEXT, -- Thumbnail par défaut si un type n'en a pas
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des types de cases pour chaque grille
CREATE TABLE IF NOT EXISTS mystery_grid_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  grid_id UUID NOT NULL REFERENCES mystery_grids(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  image_url TEXT, -- Image principale (optionnelle)
  thumbnail_url TEXT, -- Thumbnail pour la grille (optionnel, sinon image_url)
  sound_url TEXT, -- Son personnalisé pour ce type (optionnel)
  occurrence INTEGER NOT NULL DEFAULT 1 CHECK (occurrence > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des lobbies de jeu mystère
CREATE TABLE IF NOT EXISTS mystery_lobbies (
  id TEXT PRIMARY KEY, -- Format: timestamp-randomstring
  grid_id UUID NOT NULL REFERENCES mystery_grids(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  
  -- État du jeu (JSON)
  -- Structure: { cells: [{ index: 0, typeId: 'uuid', revealed: false }, ...] }
  game_state JSONB DEFAULT '{}',
  
  -- Participants (JSON array)
  -- Structure: [{ odId: 'xxx', odIdpseudo: 'xxx', teamName: 'xxx', joinedAt: 'timestamp' }, ...]
  participants JSONB DEFAULT '[]',
  
  -- Case actuellement révélée (pour la modale)
  current_reveal JSONB, -- { index: 0, typeId: 'uuid', name: 'xxx', imageUrl: 'xxx' }
  
  -- Audio mute par participant (JSON)
  -- Structure: { odId: true/false, ... }
  muted_participants JSONB DEFAULT '{}',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finished_at TIMESTAMP WITH TIME ZONE
);

-- Index pour les performances
CREATE INDEX IF NOT EXISTS idx_mystery_grid_types_grid_id ON mystery_grid_types(grid_id);
CREATE INDEX IF NOT EXISTS idx_mystery_lobbies_grid_id ON mystery_lobbies(grid_id);
CREATE INDEX IF NOT EXISTS idx_mystery_lobbies_status ON mystery_lobbies(status);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_mystery_grids_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mystery_grids
DROP TRIGGER IF EXISTS trigger_mystery_grids_updated_at ON mystery_grids;
CREATE TRIGGER trigger_mystery_grids_updated_at
  BEFORE UPDATE ON mystery_grids
  FOR EACH ROW
  EXECUTE FUNCTION update_mystery_grids_updated_at();

-- =====================================================
-- COMMENTAIRES
-- =====================================================
COMMENT ON TABLE mystery_grids IS 'Configuration des grilles de cases mystères';
COMMENT ON TABLE mystery_grid_types IS 'Types de cases pour chaque grille (nom, image, occurrences)';
COMMENT ON TABLE mystery_lobbies IS 'Lobbies de jeu en cours ou terminés';
COMMENT ON COLUMN mystery_grids.grid_size IS 'Nombre total de cases dans la grille';
COMMENT ON COLUMN mystery_grid_types.occurrence IS 'Nombre de fois que ce type apparaît dans la grille';
COMMENT ON COLUMN mystery_lobbies.game_state IS 'État du jeu: position des cases et statut révélé';
COMMENT ON COLUMN mystery_lobbies.current_reveal IS 'Case en cours de révélation (pour sync modale)';
