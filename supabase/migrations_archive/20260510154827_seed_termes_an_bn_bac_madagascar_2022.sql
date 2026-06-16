-- Migration: Seed "termes(n) — couples (a_n, b_n)" exercise from Bac Madagascar May 2022
-- Created: 2026-05-10
--
-- Faithful adaptation of the Python question 1.b (Partie B) from the Bac
-- Madagascar May 2022 paper. Deux suites entrelacées :
--   a_0 = 0.1, b_0 = 1
--   a_{n+1} = exp(-b_n), b_{n+1} = exp(-a_n)
-- Convergence vers une limite commune ℓ ≈ 0.567 (point fixe de
-- f(x) = e^{-x} + ln(x) = 0). termes(n) renvoie le tuple (a_n, b_n).
--
-- Strategy: V2 with ast_requirements (defines_function 'termes' +
-- uses_loop) + behavior.output. On utilise output (et non unit_test)
-- car le Bac retourne un tuple `return (a, b)` — Python's tuple ≠ list
-- comparison breaks JSON-driven unit_test (cf. exo Centres étrangers
-- ln(2) traité de la même façon). Le starter inclut des prints fixes
-- pour la validation ; comparaison numérique avec non_numeric: 'ignore'
-- tokenize au-delà des parens/virgule.
--
-- Note math.exp : pas mandaté correctly-rounded par IEEE 754, dérive
-- possible de 1-2 ULP par appel. Avec eps_rel = 1e-10 (vs 1 ULP ≈ 1e-16),
-- absorbé largement.

WITH first_teacher AS (
    SELECT id FROM profiles WHERE role = 'teacher' ORDER BY created_at LIMIT 1
),
inserted_exercise AS (
    INSERT INTO python_exercises (
        title, description, instructions, starter_code, solution_code,
        validation_config, level, source, author_id, is_public
    )
    SELECT
        'Suites entrelacées exp — termes(n)',
        'Deux suites entrelacées $a_{n+1} = e^{-b_n}$ et $b_{n+1} = e^{-a_n}$ qui convergent vers $\ell \approx 0{,}567$ (Bac Madagascar 05/2022).',
        '# Énoncé' || E'\n\n' ||
            'On définit deux suites $(a_n)$ et $(b_n)$ par' || E'\n\n' ||
            '$$a_0 = \dfrac{1}{10}, \quad b_0 = 1, \quad \begin{cases} a_{n+1} = e^{-b_n} \\ b_{n+1} = e^{-a_n} \end{cases}$$' || E'\n\n' ||
            'On démontre que $0 < a_n \le a_{n+1} \le b_{n+1} \le b_n \le 1$ — donc $(a_n)$ croît, $(b_n)$ décroît, et toutes deux convergent vers la même limite $\ell \approx 0{,}567$ (l''unique solution de $f(x) = e^{-x} + \ln(x) = 0$).' || E'\n\n' ||
            '## Travail demandé' || E'\n\n' ||
            'Compléter la fonction `termes(n)` ci-dessous pour qu''elle renvoie le **couple $(a_n, b_n)$** (un tuple Python).' || E'\n\n' ||
            'Deux endroits sont à compléter dans la boucle :' || E'\n\n' ||
            '- la valeur de `c` (= nouveau $a$, calculé à partir de l''ancien $b$)' || E'\n' ||
            '- la mise à jour de `b` (calculé à partir de l''ancien $a$)' || E'\n\n' ||
            '*Astuce : pour respecter l''entrelacement, on calcule d''abord `c` (le nouveau $a$) à partir de l''ancien `b`, on met à jour `b` avec l''ancien `a`, puis on assigne `a = c`. Cela évite de perdre l''ancien $a$ avant le calcul du nouveau $b$.*' || E'\n\n' ||
            '*Rappel : `exp(x)` correspond à $e^x$, importé depuis le module `math`.*',
        'from math import exp' || E'\n\n' ||
            'def termes(n):' || E'\n' ||
            '    a = 1 / 10' || E'\n' ||
            '    b = 1' || E'\n' ||
            '    for k in range(0, n):' || E'\n' ||
            '        c = ...    # à compléter (nouveau a, à partir de l''ancien b)' || E'\n' ||
            '        b = ...    # à compléter (mise à jour de b, à partir de l''ancien a)' || E'\n' ||
            '        a = c' || E'\n' ||
            '    return (a, b)' || E'\n\n' ||
            '# Validation : ne pas modifier' || E'\n' ||
            'print(termes(0))' || E'\n' ||
            'print(termes(1))' || E'\n' ||
            'print(termes(5))' || E'\n' ||
            'print(termes(10))' || E'\n',
        'from math import exp' || E'\n\n' ||
            'def termes(n):' || E'\n' ||
            '    a = 1 / 10' || E'\n' ||
            '    b = 1' || E'\n' ||
            '    for k in range(0, n):' || E'\n' ||
            '        c = exp(-b)' || E'\n' ||
            '        b = exp(-a)' || E'\n' ||
            '        a = c' || E'\n' ||
            '    return (a, b)' || E'\n\n' ||
            'print(termes(0))' || E'\n' ||
            'print(termes(1))' || E'\n' ||
            'print(termes(5))' || E'\n' ||
            'print(termes(10))' || E'\n',
        '{
            "ast_requirements": [
                {
                    "type": "defines_function",
                    "name": "termes",
                    "message": "Tu dois définir la fonction termes(n)."
                },
                {
                    "type": "uses_loop",
                    "message": "Tu dois utiliser une boucle for."
                }
            ],
            "behavior": {
                "kind": "output",
                "test_cases": [
                    {
                        "input": "",
                        "expected_output": "(0.1, 1)\n(0.36787944117144233, 0.9048374180359595)\n(0.545395785975027, 0.5986228020506361)\n(0.565315835672005, 0.5684287250290607)\n"
                    }
                ],
                "comparison": {
                    "kind": "numeric",
                    "shape": "flat",
                    "eps_abs": 0.0001,
                    "eps_rel": 0.0000000001,
                    "non_numeric": "ignore"
                }
            }
        }'::jsonb,
        'lycee',
        'Bac Madagascar 05/2022 Partie B Q1.b',
        first_teacher.id,
        TRUE
    FROM first_teacher
    RETURNING id
)
INSERT INTO python_exercise_tags (exercise_id, tag_id)
SELECT inserted_exercise.id, python_tags.id
FROM inserted_exercise
CROSS JOIN python_tags
WHERE python_tags.name IN ('for', 'suite', 'terminale', 'bac');
