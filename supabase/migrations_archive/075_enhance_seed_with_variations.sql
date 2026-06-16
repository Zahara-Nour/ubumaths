/**
 * Enhance Seed Question Templates with Variations
 * ================================================
 *
 * This migration:
 * 1. Updates existing seed templates with proper categorization
 * 2. Adds second variations to some templates to demonstrate multi-variation feature
 * 3. Adds new multi-variation example templates
 *
 * Note: Migration 074 already converted old structure to variations format.
 * This migration enhances those existing single-variation templates.
 */

-- Update categorization for existing seed templates
-- (Templates inserted in 071, migrated to variations in 074)

-- Example 1: Fraction Addition (numerical_exact)
-- Update to add proper categories
UPDATE question_templates
SET
  theme = 'Arithmétique',
  domain = 'Fractions',
  subdomain = 'Addition',
  level = 2
WHERE type = 'numerical_exact'
  AND variations @> '[{"statement": [{"type": "text", "content": "Calculer : $$\\frac{{@:num1}}{{@:den}} + \\frac{{@:num2}}{{@:den}}$$"}]}]'::jsonb;

-- Example 2: Decimal Operations (numerical_decimal)
UPDATE question_templates
SET
  theme = 'Arithmétique',
  domain = 'Décimaux',
  subdomain = 'Multiplication',
  level = 1
WHERE type = 'numerical_decimal'
  AND variations @> '[{"statement": [{"type": "text", "content": "Calculer le produit : $${@:a} \\times {@:b}$$"}]}]'::jsonb;

-- Example 3: Area Calculation (numerical_rounded)
UPDATE question_templates
SET
  theme = 'Géométrie',
  domain = 'Aires',
  subdomain = 'Cercle',
  level = 3
WHERE type = 'numerical_rounded'
  AND variations::text LIKE '%Un cercle a un rayon de%';

-- Example 4: Factorization (algebraic_transform)
UPDATE question_templates
SET
  theme = 'Algèbre',
  domain = 'Factorisation',
  subdomain = 'Identités remarquables',
  level = 4
WHERE type = 'algebraic_transform'
  AND transform_type = 'factor'
  AND variations::text LIKE '%Factoriser l''expression%';

-- Example 5: Pythagorean Theorem (fill_in_blanks)
UPDATE question_templates
SET
  theme = 'Géométrie',
  domain = 'Théorème de Pythagore',
  subdomain = NULL,
  level = 3
WHERE type = 'fill_in_blanks'
  AND variations::text LIKE '%théorème de Pythagore%';

-- Example 6: Equation Solving (multiple_choice)
UPDATE question_templates
SET
  theme = 'Algèbre',
  domain = 'Équations',
  subdomain = 'Linéaires',
  level = 3
WHERE type = 'multiple_choice'
  AND variations::text LIKE '%Résoudre l''équation%';

-- Example 7: Percentage (numerical_exact)
UPDATE question_templates
SET
  theme = 'Arithmétique',
  domain = 'Pourcentages',
  subdomain = 'Réduction',
  level = 2
WHERE type = 'numerical_exact'
  AND variations::text LIKE '%réduction de%';

-- Example 8: Fraction Simplification (numerical_exact)
UPDATE question_templates
SET
  theme = 'Arithmétique',
  domain = 'Fractions',
  subdomain = 'Simplification',
  level = 2
WHERE type = 'numerical_exact'
  AND variations::text LIKE '%Simplifier la fraction%';

-- Add second variation to Example 1 (Fraction Addition)
-- Demonstrates multi-variation feature with subtraction variant
UPDATE question_templates
SET variations = variations ||
  '[{
    "statement": [{"type": "text", "content": "Calculer : $$\\frac{{@:num1}}{{@:den}} - \\frac{{@:num2}}{{@:den}}$$"}],
    "variables": [
      {"name": "den", "expression": "{#:2-9}"},
      {"name": "num1", "expression": "{#:2-20}"},
      {"name": "num2", "expression": "{#:1-{@:num1}-1}"}
    ],
    "answer": "{eval:({@:num1}-{@:num2})/{@:den}}",
    "correction": [{"type": "text", "content": "Soustraire les numérateurs : $$\\frac{{@:num1} - {@:num2}}{{@:den}} = \\frac{{eval:{@:num1}-{@:num2}}}{{@:den}}$$"}]
  }]'::jsonb
WHERE type = 'numerical_exact'
  AND theme = 'Arithmétique'
  AND domain = 'Fractions'
  AND subdomain = 'Addition';

-- Add second variation to Example 4 (Factorization)
-- Demonstrates multi-variation with different identity
UPDATE question_templates
SET variations = variations ||
  '[{
    "statement": [{"type": "text", "content": "Factoriser : $${@:a}x^2 - {@:c}$$"}],
    "variables": [
      {"name": "a", "expression": "{#:2-5}"},
      {"name": "b", "expression": "{#:2-9}"},
      {"name": "c", "expression": "{eval:{@:a}*{@:b}^2}"}
    ],
    "answer": "{@:a}(x-{@:b})(x+{@:b})",
    "correction": [
      {"type": "text", "content": "Factoriser par {@:a} puis appliquer $a^2 - b^2 = (a-b)(a+b)$ :"},
      {"type": "text", "content": "$$${@:a}x^2 - {@:c} = {@:a}(x^2 - {@:b}^2) = {@:a}(x-{@:b})(x+{@:b})$$"}
    ]
  }]'::jsonb
WHERE type = 'algebraic_transform'
  AND theme = 'Algèbre'
  AND domain = 'Factorisation';

-- Insert new multi-variation template: Simple Operations
-- 4 variations: addition, subtraction, multiplication, division
INSERT INTO question_templates (
  type,
  variations,
  precision,
  grades,
  theme,
  domain,
  subdomain,
  level,
  delay
) VALUES (
  'numerical_exact',
  '[
    {
      "statement": [{"type": "text", "content": "Calculer : $${@:a} + {@:b}$$"}],
      "variables": [
        {"name": "a", "expression": "{#:10-50}"},
        {"name": "b", "expression": "{#:10-50}"}
      ],
      "answer": "{eval:{@:a}+{@:b}}"
    },
    {
      "statement": [{"type": "text", "content": "Calculer : $${@:a} - {@:b}$$"}],
      "variables": [
        {"name": "a", "expression": "{#:20-99}"},
        {"name": "b", "expression": "{#:10-{@:a}}"}
      ],
      "answer": "{eval:{@:a}-{@:b}}"
    },
    {
      "statement": [{"type": "text", "content": "Calculer : $${@:a} \\times {@:b}$$"}],
      "variables": [
        {"name": "a", "expression": "{#:2-12}"},
        {"name": "b", "expression": "{#:2-12}"}
      ],
      "answer": "{eval:{@:a}*{@:b}}"
    },
    {
      "statement": [{"type": "text", "content": "Calculer : $${@:dividend} \\div {@:divisor}$$"}],
      "variables": [
        {"name": "divisor", "expression": "{#:2-9}"},
        {"name": "quotient", "expression": "{#:2-12}"},
        {"name": "dividend", "expression": "{eval:{@:divisor}*{@:quotient}}"}
      ],
      "answer": "{@:quotient}"
    }
  ]'::jsonb,
  '{"type": "none"}'::jsonb,
  ARRAY['CM1', 'CM2', '6'],
  'Arithmétique',
  'Opérations',
  NULL,
  1,
  60
);

-- Insert new multi-variation template: Quadratic Equations
-- 3 variations: different discriminant cases
INSERT INTO question_templates (
  type,
  variations,
  precision,
  grades,
  theme,
  domain,
  subdomain,
  level,
  delay,
  transform_type
) VALUES (
  'algebraic_transform',
  '[
    {
      "statement": [{"type": "text", "content": "Résoudre : $$x^2 - {@:sum}x + {@:product} = 0$$"}],
      "variables": [
        {"name": "x1", "expression": "{#:2-9}"},
        {"name": "x2", "expression": "{#:2-9!{@:x1}}"},
        {"name": "sum", "expression": "{eval:{@:x1}+{@:x2}}"},
        {"name": "product", "expression": "{eval:{@:x1}*{@:x2}}"}
      ],
      "answer": "x = {@:x1} ou x = {@:x2}",
      "correction": [
        {"type": "text", "content": "Factoriser : $$(x - {@:x1})(x - {@:x2}) = 0$$"},
        {"type": "text", "content": "Solutions : $$x = {@:x1}$$ ou $$x = {@:x2}$$"}
      ]
    },
    {
      "statement": [{"type": "text", "content": "Résoudre : $$x^2 + {@:b}x + {@:c} = 0$$"}],
      "variables": [
        {"name": "b", "expression": "{#:2-10:2}"},
        {"name": "c", "expression": "{eval:({@:b}/2)^2}"}
      ],
      "answer": "x = {eval:-{@:b}/2}",
      "correction": [
        {"type": "text", "content": "Discriminant : $$\\Delta = {@:b}^2 - 4 \\times {@:c} = 0$$"},
        {"type": "text", "content": "Solution double : $$x = \\frac{{eval:-{@:b}}}{2} = {eval:-{@:b}/2}$$"}
      ]
    },
    {
      "statement": [{"type": "text", "content": "Résoudre : $$x^2 - {@:a2} = 0$$"}],
      "variables": [
        {"name": "a", "expression": "{#:2-9}"},
        {"name": "a2", "expression": "{eval:{@:a}^2}"}
      ],
      "answer": "x = -{@:a} ou x = {@:a}",
      "correction": [
        {"type": "text", "content": "$$x^2 = {@:a2}$$"},
        {"type": "text", "content": "Solutions : $$x = -{@:a}$$ ou $$x = {@:a}$$"}
      ]
    }
  ]'::jsonb,
  '{"type": "none"}'::jsonb,
  ARRAY['3', '2', 'SPE_1'],
  'Algèbre',
  'Équations',
  'Quadratiques',
  5,
  240,
  'solve'
);

-- Update table comment
COMMENT ON TABLE question_templates IS 'Question templates with variations and random generation. Contains 10 seed examples (8 from migration 071, 2 new multi-variation templates).';
