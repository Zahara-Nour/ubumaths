-- Migration: Seed whiteboard_templates with starter templates
-- Description: Adds default system templates for common use cases

-- =====================================================
-- SYSTEM TEMPLATES
-- =====================================================

-- 1. Quadrillage standard (Grid)
INSERT INTO whiteboard_templates (name, description, category, page_data, is_system, is_public)
VALUES (
  'Quadrillage standard',
  'Page avec quadrillage de 20px pour dessins et constructions geometriques',
  'grids',
  '{
    "elements": [],
    "background": {
      "type": "plain",
      "style": "grid",
      "color": "#ffffff",
      "gridSpacing": 20,
      "gridOpacity": 0.3
    },
    "width": 794,
    "height": 1123
  }'::jsonb,
  true,
  true
);

-- 2. Papier pointe (Dotted)
INSERT INTO whiteboard_templates (name, description, category, page_data, is_system, is_public)
VALUES (
  'Papier pointe',
  'Page avec points espaces de 20px, ideal pour les constructions geometriques',
  'grids',
  '{
    "elements": [],
    "background": {
      "type": "plain",
      "style": "dotted",
      "color": "#ffffff",
      "gridSpacing": 20,
      "gridOpacity": 0.4
    },
    "width": 794,
    "height": 1123
  }'::jsonb,
  true,
  true
);

-- 3. Papier ligne (Ruled)
INSERT INTO whiteboard_templates (name, description, category, page_data, is_system, is_public)
VALUES (
  'Papier ligne',
  'Page avec lignes horizontales espacees de 20px pour l''ecriture',
  'grids',
  '{
    "elements": [],
    "background": {
      "type": "plain",
      "style": "ruled",
      "color": "#ffffff",
      "gridSpacing": 20,
      "gridOpacity": 0.3
    },
    "width": 794,
    "height": 1123
  }'::jsonb,
  true,
  true
);

-- 4. Repere orthonorme (Coordinate System)
-- This template includes axis lines as elements
INSERT INTO whiteboard_templates (name, description, category, page_data, is_system, is_public)
VALUES (
  'Repere orthonorme',
  'Page avec axes X et Y et quadrillage pour graphiques et fonctions',
  'graphs',
  '{
    "elements": [
      {
        "id": "axis-x",
        "type": "shape",
        "shapeType": "arrow",
        "start": { "x": 50, "y": 561 },
        "end": { "x": 744, "y": 561 },
        "color": "#000000",
        "strokeWidth": 2,
        "opacity": 1,
        "strokeStyle": "solid",
        "fillMode": "none"
      },
      {
        "id": "axis-y",
        "type": "shape",
        "shapeType": "arrow",
        "start": { "x": 397, "y": 1073 },
        "end": { "x": 397, "y": 50 },
        "color": "#000000",
        "strokeWidth": 2,
        "opacity": 1,
        "strokeStyle": "solid",
        "fillMode": "none"
      }
    ],
    "background": {
      "type": "plain",
      "style": "grid",
      "color": "#ffffff",
      "gridSpacing": 40,
      "gridOpacity": 0.2
    },
    "width": 794,
    "height": 1123
  }'::jsonb,
  true,
  true
);

-- 5. Grille triangulaire (Triangular)
INSERT INTO whiteboard_templates (name, description, category, page_data, is_system, is_public)
VALUES (
  'Grille triangulaire',
  'Page avec grille triangulaire pour geometrie et tessellations',
  'geometry',
  '{
    "elements": [],
    "background": {
      "type": "plain",
      "style": "triangular",
      "color": "#ffffff",
      "gridSpacing": 30,
      "gridOpacity": 0.3
    },
    "width": 794,
    "height": 1123
  }'::jsonb,
  true,
  true
);

-- 6. Grille triangulaire pointee (Triangular dotted)
INSERT INTO whiteboard_templates (name, description, category, page_data, is_system, is_public)
VALUES (
  'Papier isometrique',
  'Page avec points en grille triangulaire pour dessins isometriques',
  'geometry',
  '{
    "elements": [],
    "background": {
      "type": "plain",
      "style": "triangular-dotted",
      "color": "#ffffff",
      "gridSpacing": 20,
      "gridOpacity": 0.4
    },
    "width": 794,
    "height": 1123
  }'::jsonb,
  true,
  true
);

-- 7. Grille hexagonale (Hexagonal)
INSERT INTO whiteboard_templates (name, description, category, page_data, is_system, is_public)
VALUES (
  'Grille hexagonale',
  'Page avec grille hexagonale (nid d''abeille) pour chimie et jeux',
  'geometry',
  '{
    "elements": [],
    "background": {
      "type": "plain",
      "style": "hexagonal",
      "color": "#ffffff",
      "gridSpacing": 30,
      "gridOpacity": 0.3
    },
    "width": 794,
    "height": 1123
  }'::jsonb,
  true,
  true
);

-- 8. Page blanche (Blank)
INSERT INTO whiteboard_templates (name, description, category, page_data, is_system, is_public)
VALUES (
  'Page blanche',
  'Page vierge sans arriere-plan',
  'blank',
  '{
    "elements": [],
    "background": {
      "type": "plain",
      "style": "plain",
      "color": "#ffffff"
    },
    "width": 794,
    "height": 1123
  }'::jsonb,
  true,
  true
);

-- 9. Page coloree (Colored blank)
INSERT INTO whiteboard_templates (name, description, category, page_data, is_system, is_public)
VALUES (
  'Fond creme',
  'Page avec fond couleur creme, plus confortable pour la lecture',
  'blank',
  '{
    "elements": [],
    "background": {
      "type": "plain",
      "style": "plain",
      "color": "#faf8f5"
    },
    "width": 794,
    "height": 1123
  }'::jsonb,
  true,
  true
);

-- 10. Page avec petits carreaux (Small grid)
INSERT INTO whiteboard_templates (name, description, category, page_data, is_system, is_public)
VALUES (
  'Petits carreaux',
  'Page avec quadrillage fin de 10px',
  'grids',
  '{
    "elements": [],
    "background": {
      "type": "plain",
      "style": "grid",
      "color": "#ffffff",
      "gridSpacing": 10,
      "gridOpacity": 0.25
    },
    "width": 794,
    "height": 1123
  }'::jsonb,
  true,
  true
);

-- Add a comment to explain the seed data
COMMENT ON TABLE whiteboard_templates IS 'Reusable whiteboard page templates. System templates (is_system=true) are seeded by migration and cannot be deleted.';
