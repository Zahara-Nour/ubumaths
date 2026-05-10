-- Migration: Seed three terminale spé maths "algorithme de seuil" exercises
-- Created: 2026-05-10
--
-- Three Bac-style threshold algorithm exercises using a `while` loop:
--   1. Suite arithmético-géométrique convergente : seuil(s)
--   2. Suite géométrique croissante (population)  : annee_seuil(s)
--   3. Somme partielle (série de Riemann ζ(2))    : seuil_somme(s)
--
-- All three are parametrized over the threshold `s` so the unit_test strategy
-- can probe several values — a no-arg function (the canonical Bac form) would
-- be defeated by a hardcoded `return 51`. Pédagogiquement, le paramètre rend
-- l'algorithme réutilisable et explicite la dépendance sur le seuil.
--
-- All instructions / starter_code / solution_code are built via segment-by-
-- segment `||` concatenation so no rogue newline can sneak in via a
-- soft-wrap on copy/paste.
--
-- Tag schema reminder (since 20260509094828_normalize_exercise_tags) :
--   `python_exercises` no longer has a `tags TEXT[]` column — tags live in
--   the junction table `python_exercise_tags(exercise_id, tag_id)` referencing
--   `python_tags(id, name)`.

-- ============================================================================
-- 0. ENSURE NEW TAGS EXIST (existing: 'while'; added here: 'suite','seuil','terminale')
-- ============================================================================

INSERT INTO python_tags (name) VALUES
    ('suite'),
    ('seuil'),
    ('terminale')
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 1. Suite arithmético-géométrique : seuil(s)
-- ============================================================================

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, author_id, is_public
    )
    SELECT
        'Seuil — suite arithmético-géométrique',
        'Algorithme de seuil sur une suite convergente, type Bac terminale spé maths.',
        '# Énoncé' || E'\n\n' ||
            'On considère la suite $(u_n)$ définie par $u_0 = 100$ et $u_{n+1} = 0{,}8\,u_n + 5$.' || E'\n\n' ||
            'On admet que $(u_n)$ converge vers $\ell = 25$ par valeurs supérieures.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `seuil(s)` ci-dessous pour qu''elle renvoie le **plus petit entier $n$** tel que $u_n - 25 < s$, où `s` est un réel strictement positif.' || E'\n\n' ||
            '## Exemples' || E'\n\n' ||
            '- `seuil(0.001)` doit renvoyer `51`' || E'\n' ||
            '- `seuil(0.1)` doit renvoyer `30`' || E'\n' ||
            '- `seuil(1)` doit renvoyer `20`' || E'\n\n' ||
            '## Conseils' || E'\n\n' ||
            '- Utilise une boucle `while` qui s''arrête dès que $u_n - 25 < s$.' || E'\n' ||
            '- Pense à initialiser le compteur `n` et à le mettre à jour dans la boucle.',
        'def seuil(s):' || E'\n' ||
            '    u = 100' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    # Compléter la boucle while ci-dessous :' || E'\n' ||
            '    # - condition d''arrêt sur u' || E'\n' ||
            '    # - mise à jour de u via la relation de récurrence' || E'\n' ||
            '    # - incrémentation de n' || E'\n' ||
            '    return n' || E'\n',
        'def seuil(s):' || E'\n' ||
            '    u = 100' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    while u - 25 >= s:' || E'\n' ||
            '        u = 0.8 * u + 5' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '    return n' || E'\n',
        '{
            "type": "unit_test",
            "function_name": "seuil",
            "test_cases": [
                {"args": [0.001], "expected": 51},
                {"args": [0.1], "expected": 30},
                {"args": [1], "expected": 20},
                {"args": [10], "expected": 10}
            ]
        }'::jsonb,
        'lycee',
        first_teacher.id,
        TRUE
    FROM first_teacher
    RETURNING id
)
INSERT INTO python_exercise_tags (exercise_id, tag_id)
SELECT inserted_exercise.id, python_tags.id
FROM inserted_exercise
CROSS JOIN python_tags
WHERE python_tags.name IN ('while', 'suite', 'seuil', 'terminale');

-- ============================================================================
-- 2. Suite géométrique croissante : annee_seuil(s)
-- ============================================================================

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, author_id, is_public
    )
    SELECT
        'Seuil — population croissante',
        'Algorithme de seuil sur une suite géométrique de raison > 1.',
        '# Énoncé' || E'\n\n' ||
            'Une population de bactéries est modélisée par la suite $(P_n)$ définie par $P_0 = 1500$ et $P_{n+1} = 1{,}03\,P_n$ (croissance de 3 % par an).' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `annee_seuil(s)` ci-dessous pour qu''elle renvoie le **plus petit entier $n$** tel que $P_n > s$.' || E'\n\n' ||
            '## Exemples' || E'\n\n' ||
            '- `annee_seuil(5000)` doit renvoyer `41`' || E'\n' ||
            '- `annee_seuil(3000)` doit renvoyer `24`' || E'\n' ||
            '- `annee_seuil(10000)` doit renvoyer `65`' || E'\n\n' ||
            '## Conseils' || E'\n\n' ||
            '- Le sens de l''inégalité dans la condition `while` est inversé par rapport au cas d''une suite convergente : on **continue tant que** $P_n$ n''a **pas encore** dépassé `s`.' || E'\n' ||
            '- N''oublie pas d''incrémenter `n` à chaque tour.',
        'def annee_seuil(s):' || E'\n' ||
            '    P = 1500' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    # Compléter avec une boucle while qui :' || E'\n' ||
            '    # - met à jour P (croissance de 3 %)' || E'\n' ||
            '    # - s''arrête dès que P > s' || E'\n' ||
            '    return n' || E'\n',
        'def annee_seuil(s):' || E'\n' ||
            '    P = 1500' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    while P <= s:' || E'\n' ||
            '        P = 1.03 * P' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '    return n' || E'\n',
        '{
            "type": "unit_test",
            "function_name": "annee_seuil",
            "test_cases": [
                {"args": [5000], "expected": 41},
                {"args": [3000], "expected": 24},
                {"args": [10000], "expected": 65},
                {"args": [1600], "expected": 3}
            ]
        }'::jsonb,
        'lycee',
        first_teacher.id,
        TRUE
    FROM first_teacher
    RETURNING id
)
INSERT INTO python_exercise_tags (exercise_id, tag_id)
SELECT inserted_exercise.id, python_tags.id
FROM inserted_exercise
CROSS JOIN python_tags
WHERE python_tags.name IN ('while', 'suite', 'seuil', 'terminale');

-- ============================================================================
-- 3. Somme partielle (série de Riemann ζ(2)) : seuil_somme(s)
-- ============================================================================

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, author_id, is_public
    )
    SELECT
        'Seuil — somme partielle d''une série',
        'Algorithme de seuil sur la somme partielle S_n = somme de 1/k² (série de Riemann ζ(2)).',
        '# Énoncé' || E'\n\n' ||
            'On considère la suite $(u_n)$ définie pour $n \ge 1$ par $u_n = \dfrac{1}{n^2}$, et on note' || E'\n\n' ||
            '$$S_n = u_1 + u_2 + \cdots + u_n = \sum_{k=1}^{n} \dfrac{1}{k^2}.$$' || E'\n\n' ||
            'On admet que $(S_n)$ converge vers $\dfrac{\pi^2}{6} \approx 1{,}6449$.' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `seuil_somme(s)` ci-dessous pour qu''elle renvoie le **plus petit entier $n$** tel que $S_n > s$, pour `s < π²/6`.' || E'\n\n' ||
            '## Exemples' || E'\n\n' ||
            '- `seuil_somme(1.6)` doit renvoyer `23`' || E'\n' ||
            '- `seuil_somme(1.5)` doit renvoyer `7`' || E'\n' ||
            '- `seuil_somme(1.0)` doit renvoyer `2`' || E'\n\n' ||
            '## Conseils' || E'\n\n' ||
            '- **Attention à l''ordre** : il faut **incrémenter `n` AVANT** d''ajouter $1/n^2$ à $S$ (sinon division par zéro au premier tour, car `n` part de 0).' || E'\n' ||
            '- La somme $S$ se met à jour cumulativement : `S = S + 1/(n**2)`.',
        'def seuil_somme(s):' || E'\n' ||
            '    S = 0' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    # Compléter avec une boucle while qui :' || E'\n' ||
            '    # - incrémente n' || E'\n' ||
            '    # - ajoute 1/n² à S' || E'\n' ||
            '    # - s''arrête dès que S > s' || E'\n' ||
            '    return n' || E'\n',
        'def seuil_somme(s):' || E'\n' ||
            '    S = 0' || E'\n' ||
            '    n = 0' || E'\n' ||
            '    while S <= s:' || E'\n' ||
            '        n = n + 1' || E'\n' ||
            '        S = S + 1 / (n ** 2)' || E'\n' ||
            '    return n' || E'\n',
        '{
            "type": "unit_test",
            "function_name": "seuil_somme",
            "test_cases": [
                {"args": [1.6], "expected": 23},
                {"args": [1.5], "expected": 7},
                {"args": [1.0], "expected": 2},
                {"args": [0.5], "expected": 1}
            ]
        }'::jsonb,
        'lycee',
        first_teacher.id,
        TRUE
    FROM first_teacher
    RETURNING id
)
INSERT INTO python_exercise_tags (exercise_id, tag_id)
SELECT inserted_exercise.id, python_tags.id
FROM inserted_exercise
CROSS JOIN python_tags
WHERE python_tags.name IN ('while', 'suite', 'seuil', 'terminale');
