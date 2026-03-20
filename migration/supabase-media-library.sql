-- ============================================
-- WILCO QUIZ - Système de Médiathèque et Broadcast
-- ============================================

-- Table principale : Bibliothèque de médias
CREATE TABLE IF NOT EXISTS media_library (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('image', 'video', 'audio')),
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  tags JSONB DEFAULT '[]'::jsonb,
  duration_seconds INTEGER, -- Pour vidéos/audios
  file_size INTEGER, -- En bytes
  created_by TEXT, -- ID du créateur
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index pour la recherche
CREATE INDEX IF NOT EXISTS idx_media_library_name ON media_library USING gin(to_tsvector('french', name));
CREATE INDEX IF NOT EXISTS idx_media_library_tags ON media_library USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_media_library_type ON media_library(type);
CREATE INDEX IF NOT EXISTS idx_media_library_created_at ON media_library(created_at DESC);

-- Table de liaison : Médias associés à une grille mystère
CREATE TABLE IF NOT EXISTS mystery_grid_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grid_id UUID NOT NULL REFERENCES mystery_grids(id) ON DELETE CASCADE,
  media_id UUID NOT NULL REFERENCES media_library(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(grid_id, media_id)
);

CREATE INDEX IF NOT EXISTS idx_mystery_grid_media_grid ON mystery_grid_media(grid_id);

-- Table d'historique des broadcasts (optionnel, pour logs)
CREATE TABLE IF NOT EXISTS broadcast_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lobby_id TEXT, -- NULL si broadcast global
  lobby_type TEXT CHECK (lobby_type IN ('quiz', 'mystery', 'drawing', 'global')),
  sender_id TEXT NOT NULL,
  sender_pseudo TEXT NOT NULL,
  message TEXT,
  media_id UUID REFERENCES media_library(id) ON DELETE SET NULL,
  options JSONB DEFAULT '{}'::jsonb, -- autoplay, volume, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcast_history_lobby ON broadcast_history(lobby_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_history_created_at ON broadcast_history(created_at DESC);

-- ============================================
-- Politiques RLS (Row Level Security)
-- ============================================

ALTER TABLE media_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE mystery_grid_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcast_history ENABLE ROW LEVEL SECURITY;

-- Politique pour media_library : lecture pour tous, écriture pour authentifiés
CREATE POLICY "Media readable by all" ON media_library FOR SELECT USING (true);
CREATE POLICY "Media insertable by authenticated" ON media_library FOR INSERT WITH CHECK (true);
CREATE POLICY "Media updatable by authenticated" ON media_library FOR UPDATE USING (true);
CREATE POLICY "Media deletable by authenticated" ON media_library FOR DELETE USING (true);

-- Politique pour mystery_grid_media
CREATE POLICY "Grid media readable by all" ON mystery_grid_media FOR SELECT USING (true);
CREATE POLICY "Grid media insertable by authenticated" ON mystery_grid_media FOR INSERT WITH CHECK (true);
CREATE POLICY "Grid media deletable by authenticated" ON mystery_grid_media FOR DELETE USING (true);

-- Politique pour broadcast_history
CREATE POLICY "Broadcast history readable by all" ON broadcast_history FOR SELECT USING (true);
CREATE POLICY "Broadcast history insertable by authenticated" ON broadcast_history FOR INSERT WITH CHECK (true);

-- ============================================
-- Fonction de recherche de médias
-- ============================================

CREATE OR REPLACE FUNCTION search_media(
  search_term TEXT DEFAULT NULL,
  media_type TEXT DEFAULT NULL,
  tag_filter TEXT DEFAULT NULL,
  page_limit INTEGER DEFAULT 20,
  page_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  type TEXT,
  url TEXT,
  thumbnail_url TEXT,
  tags JSONB,
  duration_seconds INTEGER,
  file_size INTEGER,
  created_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  total_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.id,
    m.name,
    m.type,
    m.url,
    m.thumbnail_url,
    m.tags,
    m.duration_seconds,
    m.file_size,
    m.created_by,
    m.created_at,
    COUNT(*) OVER() AS total_count
  FROM media_library m
  WHERE 
    (search_term IS NULL OR 
     m.name ILIKE '%' || search_term || '%' OR
     m.tags::text ILIKE '%' || search_term || '%')
    AND (media_type IS NULL OR m.type = media_type)
    AND (tag_filter IS NULL OR m.tags ? tag_filter)
  ORDER BY m.created_at DESC
  LIMIT page_limit
  OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Données de test (optionnel)
-- ============================================

-- INSERT INTO media_library (name, type, url, tags) VALUES
-- ('Image test 1', 'image', 'https://example.com/test1.jpg', '["test", "demo"]'),
-- ('Vidéo test', 'video', 'https://example.com/test.mp4', '["test", "video"]'),
-- ('Son test', 'audio', 'https://example.com/test.mp3', '["test", "audio"]');
