-- Add resources field to exercises table for supplementary materials
-- Resources are stored as JSONB array with type, url, title, and optional description

ALTER TABLE exercises ADD COLUMN resources JSONB DEFAULT '[]'::jsonb;

-- Comment for documentation
COMMENT ON COLUMN exercises.resources IS 'Array of supplementary resources: [{ type, url, title, description? }]';

-- Example structure:
-- [
--   { "type": "video", "url": "https://youtube.com/...", "title": "Explication détaillée" },
--   { "type": "pdf", "url": "/docs/fiche.pdf", "title": "Fiche méthode" },
--   { "type": "geogebra", "url": "https://geogebra.org/...", "title": "Figure interactive" },
--   { "type": "link", "url": "https://...", "title": "Article complémentaire", "description": "Pour aller plus loin" }
-- ]
