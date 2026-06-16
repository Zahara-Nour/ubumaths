/**
 * Seed Question Templates
 * =======================
 *
 * Example question templates demonstrating all features:
 * - 6 question types
 * - Variables with random generation
 * - Complex exclusions
 * - Evaluation expressions
 * - All grade levels
 *
 * These examples showcase the full syntax and capabilities.
 */

-- Example 1: Numerical Exact - Simple Fraction Addition
INSERT INTO question_templates (
  type,
  statement,
  variables,
  answer,
  precision,
  grades,
  delay,
  correction
) VALUES (
  'numerical_exact',
  '[{"type": "text", "content": "Calculer : $$\\frac{{@:num1}}{{@:den}} + \\frac{{@:num2}}{{@:den}}$$"}]'::jsonb,
  '[
    {"name": "den", "expression": "{#:2-9}"},
    {"name": "num1", "expression": "{#:1-{@:den}-1}"},
    {"name": "num2", "expression": "{#:1-{@:den}-1!{@:num1}}"}
  ]'::jsonb,
  '"{eval:({@:num1}+{@:num2})/{@:den}}"'::jsonb,
  '{"type": "none"}'::jsonb,
  ARRAY['6', '5'],
  90,
  '[{"type": "text", "content": "Additionner les numérateurs : $$\\frac{{@:num1} + {@:num2}}{{@:den}} = \\frac{{eval:{@:num1}+{@:num2}}}{{@:den}}$$"}]'::jsonb
);

-- Example 2: Numerical Decimal - Decimal Operations
INSERT INTO question_templates (
  type,
  statement,
  variables,
  answer,
  precision,
  grades,
  delay
) VALUES (
  'numerical_decimal',
  '[{"type": "text", "content": "Calculer le produit : $${@:a} \\times {@:b}$$"}]'::jsonb,
  '[
    {"name": "a", "expression": "{#:1.1}"},
    {"name": "b", "expression": "{#:1.2}"}
  ]'::jsonb,
  '"{eval:{@:a}*{@:b}}"'::jsonb,
  '{"type": "decimal", "digits": 2}'::jsonb,
  ARRAY['CM1', 'CM2', '6'],
  60
);

-- Example 3: Numerical Rounded - Area Calculation
INSERT INTO question_templates (
  type,
  statement,
  variables,
  answer,
  precision,
  grades,
  delay,
  correction
) VALUES (
  'numerical_rounded',
  '[
    {"type": "text", "content": "Un cercle a un rayon de ${@:radius}$ cm. Quelle est son aire ? (Utiliser $\\pi \\approx 3.14159$)"}
  ]'::jsonb,
  '[
    {"name": "radius", "expression": "{#:5-15}"}
  ]'::jsonb,
  '"{eval:3.14159*{@:radius}^2}"'::jsonb,
  '{"type": "significant", "digits": 3}'::jsonb,
  ARRAY['4', '3', '2'],
  120,
  '[
    {"type": "text", "content": "Formule de l''aire : $$A = \\pi r^2 = 3.14159 \\times {@:radius}^2 = {eval:3.14159*{@:radius}^2}$$"}
  ]'::jsonb
);

-- Example 4: Algebraic Transform - Factorization
INSERT INTO question_templates (
  type,
  statement,
  variables,
  answer,
  transform_type,
  grades,
  delay,
  correction
) VALUES (
  'algebraic_transform',
  '[{"type": "text", "content": "Factoriser l''expression : $$x^2 - {@:c}$$"}]'::jsonb,
  '[
    {"name": "a", "expression": "{#:2-9}"},
    {"name": "c", "expression": "{eval:{@:a}^2}"}
  ]'::jsonb,
  '"(x-{@:a})(x+{@:a})"'::jsonb,
  'factor',
  ARRAY['3', '2'],
  180,
  '[
    {"type": "text", "content": "Identité remarquable : $$a^2 - b^2 = (a-b)(a+b)$$"},
    {"type": "text", "content": "Donc : $$x^2 - {@:c} = x^2 - {@:a}^2 = (x-{@:a})(x+{@:a})$$"}
  ]'::jsonb
);

-- Example 5: Fill in Blanks - Pythagorean Theorem
INSERT INTO question_templates (
  type,
  statement,
  variables,
  answer,
  blanks,
  grades,
  delay,
  correction
) VALUES (
  'fill_in_blanks',
  '[
    {"type": "text", "content": "Dans un triangle rectangle, si les côtés de l''angle droit mesurent ${@:a}$ cm et ${@:b}$ cm, alors l''hypoténuse mesure ____ cm. Le théorème utilisé est le théorème de ____."}
  ]'::jsonb,
  '[
    {"name": "a", "expression": "{#:3-9}"},
    {"name": "b", "expression": "{#:3-9!{@:a}}"},
    {"name": "c", "expression": "{eval:sqrt({@:a}^2+{@:b}^2)}"}
  ]'::jsonb,
  '["{@:c}", "Pythagore"]'::jsonb,
  '[0, 1]'::jsonb,
  ARRAY['4', '3'],
  150,
  '[
    {"type": "text", "content": "Théorème de Pythagore : $$c^2 = a^2 + b^2$$"},
    {"type": "text", "content": "Donc : $$c = \\sqrt{{@:a}^2 + {@:b}^2} = \\sqrt{{eval:{@:a}^2 + {@:b}^2}} = {@:c}$$ cm"}
  ]'::jsonb
);

-- Example 6: Multiple Choice - Equation Solving
INSERT INTO question_templates (
  type,
  statement,
  variables,
  answer,
  choices,
  multiple_answers,
  grades,
  delay,
  correction
) VALUES (
  'multiple_choice',
  '[
    {"type": "text", "content": "Résoudre l''équation : $${@:a}x + {@:b} = {@:c}$$"}
  ]'::jsonb,
  '[
    {"name": "a", "expression": "{#:2-9}"},
    {"name": "b", "expression": "{#:-20-20!0}"},
    {"name": "c", "expression": "{#:-20-20!{@:b}}"},
    {"name": "solution", "expression": "{eval:({@:c}-{@:b})/{@:a}}"},
    {"name": "wrong1", "expression": "{eval:({@:c}+{@:b})/{@:a}}"},
    {"name": "wrong2", "expression": "{eval:{@:c}-{@:b}}"},
    {"name": "wrong3", "expression": "{eval:{@:c}/{@:a}}"}
  ]'::jsonb,
  '"0"'::jsonb,
  '[
    "x = {@:solution}",
    "x = {@:wrong1}",
    "x = {@:wrong2}",
    "x = {@:wrong3}"
  ]'::jsonb,
  false,
  ARRAY['3', '2'],
  120,
  '[
    {"type": "text", "content": "Isoler $x$ :"},
    {"type": "text", "content": "$$\\begin{align} {@:a}x + {@:b} &= {@:c} \\\\ {@:a}x &= {@:c} - {@:b} \\\\ {@:a}x &= {eval:{@:c}-{@:b}} \\\\ x &= \\frac{{eval:{@:c}-{@:b}}}{{@:a}} = {@:solution} \\end{align}$$"}
  ]'::jsonb
);

-- Example 7: Percentage Calculation
INSERT INTO question_templates (
  type,
  statement,
  variables,
  answer,
  precision,
  grades,
  delay
) VALUES (
  'numerical_exact',
  '[
    {"type": "text", "content": "Un article coûte ${@:original}$ €. Après une réduction de ${@:percent}\\%$, quel est le nouveau prix ?"}
  ]'::jsonb,
  '[
    {"name": "original", "expression": "{#:50-200:10}"},
    {"name": "percent", "expression": "{#:10-50:5}"},
    {"name": "discount", "expression": "{eval:{@:original}*{@:percent}/100}"},
    {"name": "final", "expression": "{eval:{@:original}-{@:discount}}"}
  ]'::jsonb,
  '"{@:final}"'::jsonb,
  '{"type": "decimal", "digits": 2}'::jsonb,
  ARRAY['5', '4'],
  90
);

-- Example 8: GCD/LCM with Exclusions
INSERT INTO question_templates (
  type,
  statement,
  variables,
  answer,
  precision,
  grades,
  delay,
  correction
) VALUES (
  'numerical_exact',
  '[
    {"type": "text", "content": "Simplifier la fraction : $$\\frac{{@:num}}{{@:den}}$$"}
  ]'::jsonb,
  '[
    {"name": "gcd", "expression": "{#:2-12}"},
    {"name": "a", "expression": "{#:2-9}"},
    {"name": "b", "expression": "{#:2-9!{@:a}}"},
    {"name": "num", "expression": "{eval:{@:a}*{@:gcd}}"},
    {"name": "den", "expression": "{eval:{@:b}*{@:gcd}}"},
    {"name": "simplified_num", "expression": "{@:a}"},
    {"name": "simplified_den", "expression": "{@:b}"}
  ]'::jsonb,
  '"\\frac{{@:simplified_num}}{{@:simplified_den}}"'::jsonb,
  '{"type": "none"}'::jsonb,
  ARRAY['6', '5', '4'],
  120,
  '[
    {"type": "text", "content": "Diviser le numérateur et le dénominateur par leur PGCD ({@:gcd}) :"},
    {"type": "text", "content": "$$\\frac{{@:num}}{{@:den}} = \\frac{{@:num} \\div {@:gcd}}{{@:den} \\div {@:gcd}} = \\frac{{@:simplified_num}}{{@:simplified_den}}$$"}
  ]'::jsonb
);

-- Add comment
COMMENT ON TABLE question_templates IS 'Question templates with variables and random generation. Contains 8 seed examples demonstrating core features.';
