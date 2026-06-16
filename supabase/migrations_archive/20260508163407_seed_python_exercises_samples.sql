-- Migration: Seed five sample python exercises (one per validation strategy)
-- Created: 2026-05-08
-- Description:
--   Adds five varied exercises authored by the first teacher in profiles, to
--   exercise the three validation strategies of the python exercise system:
--     1) Affiche les nombres pairs            — output (no stdin)
--     2) Carré d'un nombre lu                 — output (with stdin)
--     3) Inverse d'une chaîne                 — unit_test
--     4) Factorielle récursive                — ast (structure only)
--     5) Nombres premiers                     — ast + output_tests
--
--   All instructions / starter_code / solution_code are built via segment-by-
--   segment `||` concatenation so no rogue newline can sneak in via a
--   soft-wrap on copy/paste.
--
--   Each exercise is tagged is_public = TRUE so any visitor can open the link
--   without auth.

-- ============================================================================
-- 1. Compter avec une boucle (output)
-- ============================================================================

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
)
INSERT INTO python_exercises (
    title, description, instructions, starter_code, solution_code,
    validation_config, level, tags, author_id, is_public
)
SELECT
    'Compter avec une boucle',
    'Première boucle avec range — affiche des nombres pairs.',
    '# Énoncé' || E'\n\n' ||
        'Affiche les nombres **pairs** de 0 à 10 (inclus), un par ligne.' || E'\n\n' ||
        '## Sortie attendue' || E'\n\n' ||
        '```' || E'\n' ||
        '0' || E'\n' ||
        '2' || E'\n' ||
        '4' || E'\n' ||
        '6' || E'\n' ||
        '8' || E'\n' ||
        '10' || E'\n' ||
        '```',
    '# Écris ta boucle ici' || E'\n',
    'for i in range(0, 11, 2):' || E'\n' ||
        '    print(i)' || E'\n',
    '{
        "behavior": {
            "kind": "output",
            "test_cases": [
                {"input": "", "expected_output": "0\n2\n4\n6\n8\n10\n"}
            ],
            "comparison": {"kind": "exact"}
        }
    }'::jsonb,
    'college',
    ARRAY['for', 'print'],
    first_teacher.id,
    TRUE
FROM first_teacher;

-- ============================================================================
-- 2. Carré d'un nombre lu (output avec stdin)
-- ============================================================================

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
)
INSERT INTO python_exercises (
    title, description, instructions, starter_code, solution_code,
    validation_config, level, tags, author_id, is_public
)
SELECT
    'Carré d''un nombre lu',
    'Lecture stdin, conversion, calcul, affichage.',
    '# Énoncé' || E'\n\n' ||
        'Lis un entier `n` depuis l''entrée standard (stdin) puis affiche `n²`.' || E'\n\n' ||
        '## Exemples' || E'\n\n' ||
        '- Si l''entrée est `5`, la sortie est `25`' || E'\n' ||
        '- Si l''entrée est `-7`, la sortie est `49`' || E'\n' ||
        '- Si l''entrée est `0`, la sortie est `0`',
    'n = int(input())' || E'\n' ||
        '# Affiche n au carré' || E'\n',
    'n = int(input())' || E'\n' ||
        'print(n * n)' || E'\n',
    '{
        "behavior": {
            "kind": "output",
            "test_cases": [
                {"input": "5",  "expected_output": "25\n"},
                {"input": "0",  "expected_output": "0\n"},
                {"input": "-7", "expected_output": "49\n"},
                {"input": "12", "expected_output": "144\n"}
            ],
            "comparison": {"kind": "exact"}
        }
    }'::jsonb,
    'college',
    ARRAY['input', 'print', 'types'],
    first_teacher.id,
    TRUE
FROM first_teacher;

-- ============================================================================
-- 3. Inverser une chaîne (unit_test)
-- ============================================================================

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
)
INSERT INTO python_exercises (
    title, description, instructions, starter_code, solution_code,
    validation_config, level, tags, author_id, is_public
)
SELECT
    'Inverser une chaîne',
    'Manipuler une string, retourner sans afficher.',
    '# Énoncé' || E'\n\n' ||
        'Écris une fonction `inverse(s)` qui retourne la chaîne `s` à l''envers.' || E'\n\n' ||
        '## Exemples' || E'\n\n' ||
        '- `inverse("abc")` retourne `"cba"`' || E'\n' ||
        '- `inverse("")` retourne `""`' || E'\n' ||
        '- `inverse("a")` retourne `"a"`' || E'\n' ||
        '- `inverse("bonjour")` retourne `"ruojnob"`' || E'\n\n' ||
        '## Conseil' || E'\n\n' ||
        '`s[::-1]` est la manière la plus directe en Python. Tu peux aussi le faire avec une boucle.',
    'def inverse(s):' || E'\n' ||
        '    # ton code ici' || E'\n' ||
        '    pass' || E'\n',
    'def inverse(s):' || E'\n' ||
        '    return s[::-1]' || E'\n',
    '{
        "behavior": {
            "kind": "unit_test",
            "function_name": "inverse",
            "test_cases": [
                {"args": ["abc"],      "expected": "cba"},
                {"args": [""],         "expected": ""},
                {"args": ["a"],        "expected": "a"},
                {"args": ["bonjour"],  "expected": "ruojnob"},
                {"args": ["RaCONTaR"], "expected": "RaTNOCaR"}
            ]
        }
    }'::jsonb,
    'lycee',
    ARRAY['methodes-string', 'slicing'],
    first_teacher.id,
    TRUE
FROM first_teacher;

-- ============================================================================
-- 4. Factorielle récursive (ast — structure only)
-- ============================================================================

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
)
INSERT INTO python_exercises (
    title, description, instructions, starter_code, solution_code,
    validation_config, level, tags, author_id, is_public
)
SELECT
    'Factorielle récursive',
    'Définir une fonction récursive sans print ni boucle.',
    '# Énoncé' || E'\n\n' ||
        'Écris une fonction **récursive** `factorielle(n)` qui retourne `n!` :' || E'\n\n' ||
        '- `factorielle(0) = 1`' || E'\n' ||
        '- `factorielle(n) = n × factorielle(n - 1)` pour `n ≥ 1`' || E'\n\n' ||
        '## Contraintes' || E'\n\n' ||
        '- Doit être **récursive** (la fonction s''appelle elle-même)' || E'\n' ||
        '- Pas de `print`, juste un `return`' || E'\n\n' ||
        '## Note' || E'\n\n' ||
        'La validation vérifie uniquement la **structure du code** (récursion, pas de print). '
        || 'Pour vérifier les valeurs, écris un test toi-même dans le playground.',
    'def factorielle(n):' || E'\n' ||
        '    # écris une version récursive' || E'\n' ||
        '    pass' || E'\n',
    'def factorielle(n):' || E'\n' ||
        '    if n <= 0:' || E'\n' ||
        '        return 1' || E'\n' ||
        '    return n * factorielle(n - 1)' || E'\n',
    '{
        "ast_requirements": [
            {"type": "defines_function", "name": "factorielle", "message": "Tu dois définir une fonction `factorielle`"},
            {"type": "uses_recursion", "message": "Ta fonction doit être récursive (s''appeler elle-même)"},
            {"type": "no_print", "message": "N''utilise pas `print`, retourne la valeur avec `return`"}
        ]
    }'::jsonb,
    'nsi',
    ARRAY['recursion', 'math'],
    first_teacher.id,
    TRUE
FROM first_teacher;

-- ============================================================================
-- 5. Nombres premiers (ast + output_tests)
-- ============================================================================

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
)
INSERT INTO python_exercises (
    title, description, instructions, starter_code, solution_code,
    validation_config, level, tags, author_id, is_public
)
SELECT
    'Nombres premiers entre 2 et 20',
    'Boucle avec test de divisibilité — combine structure + sortie.',
    '# Énoncé' || E'\n\n' ||
        'Affiche les nombres premiers entre 2 et 20 (inclus), séparés par des espaces, sur une seule ligne.' || E'\n\n' ||
        '## Sortie attendue' || E'\n\n' ||
        '```' || E'\n' ||
        '2 3 5 7 11 13 17 19' || E'\n' ||
        '```' || E'\n\n' ||
        '## Contrainte' || E'\n\n' ||
        'Tu dois utiliser au moins une **boucle** (`for` ou `while`).',
    '# Affiche les nombres premiers entre 2 et 20' || E'\n',
    'premiers = []' || E'\n' ||
        'for n in range(2, 21):' || E'\n' ||
        '    est_premier = True' || E'\n' ||
        '    for d in range(2, n):' || E'\n' ||
        '        if n % d == 0:' || E'\n' ||
        '            est_premier = False' || E'\n' ||
        '            break' || E'\n' ||
        '    if est_premier:' || E'\n' ||
        '        premiers.append(n)' || E'\n' ||
        'print('' ''.join(str(p) for p in premiers))' || E'\n',
    '{
        "ast_requirements": [
            {"type": "uses_loop", "message": "Utilise une boucle (for ou while)"}
        ],
        "behavior": {
            "kind": "output",
            "test_cases": [
                {"input": "", "expected_output": "2 3 5 7 11 13 17 19\n"}
            ],
            "comparison": {"kind": "exact"}
        }
    }'::jsonb,
    'lycee',
    ARRAY['for', 'if', 'list', 'print'],
    first_teacher.id,
    TRUE
FROM first_teacher;
