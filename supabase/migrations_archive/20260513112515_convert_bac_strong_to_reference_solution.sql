-- Migration: Convert 19 STRONG Bac exercises from unit_test
--            to reference_solution (fixed sentinels + generator).
-- Created: 2026-05-13
--
-- For each converted exo:
--   - existing test_cases are preserved as fixed.cases (sentinels
--     that double-check the reference itself);
--   - solution_code is copied verbatim into reference_code;
--   - a hand-curated generator (range adapted to the function\'s
--     natural domain) adds random-input coverage;
--   - ast_requirements, function_name, tolerance are preserved.
--
-- Identification is by (source, title) to keep the UPDATE narrow.
-- All 19 exos generated via scripts/generate-bac-reference-solution-migration.ts

-- Bac Amérique du Nord 05/2025 Q3 — Algorithme de Briggs — approximation de ln(a)
-- Briggs(a) requires a >= 1.01; large a → many sqrt iterations.
UPDATE python_exercises
SET validation_config = '{
  "ast_requirements": [
    {
      "name": "Briggs",
      "type": "defines_function",
      "message": "Tu dois définir la fonction Briggs(a)."
    },
    {
      "type": "uses_loop",
      "message": "Tu dois utiliser une boucle while (pas de raccourci via math.log)."
    }
  ],
  "behavior": {
    "kind": "reference_solution",
    "function_name": "Briggs",
    "reference_code": "from math import *\n\ndef Briggs(a):\n    n = 0\n    while a >= 1.01:\n        a = sqrt(a)\n        n = n + 1\n    L = 2 ** n * (a - 1)\n    return L\n",
    "fixed": {
      "cases": [
        {
          "args": [
            2
          ],
          "expected": 0.695027342438749
        },
        {
          "args": [
            10
          ],
          "expected": 2.312971479410578
        },
        {
          "args": [
            100
          ],
          "expected": 4.625942958821156
        }
      ]
    },
    "generator": {
      "code": "(__import__(\"random\").uniform(1.5, 200),)",
      "count": 50,
      "seed": 42
    }
  }
}'::jsonb
WHERE id = '094a32c7-d267-47fb-80fd-2a9f5c9a1bbe';

-- Bac Amérique du Sud 09/2022 Q1.b — Suite quadratique u²/5 — calcul du p-ième terme
-- suite_u(p) = u^2/5; underflows to 0 beyond p ≈ 8.
UPDATE python_exercises
SET validation_config = '{
  "ast_requirements": [
    {
      "name": "suite_u",
      "type": "defines_function",
      "message": "Tu dois définir la fonction suite_u(p)."
    },
    {
      "type": "uses_loop",
      "message": "Tu dois utiliser une boucle (for ou while)."
    }
  ],
  "behavior": {
    "kind": "reference_solution",
    "function_name": "suite_u",
    "reference_code": "def suite_u(p):\n    u = 4\n    for i in range(1, p + 1):\n        u = u * u / 5\n    return u\n",
    "fixed": {
      "cases": [
        {
          "args": [
            0
          ],
          "expected": 4
        },
        {
          "args": [
            1
          ],
          "expected": 3.2
        },
        {
          "args": [
            2
          ],
          "expected": 2.0480000000000005
        },
        {
          "args": [
            3
          ],
          "expected": 0.8388608000000003
        },
        {
          "args": [
            5
          ],
          "expected": 0.003961408125713222
        },
        {
          "args": [
            10
          ],
          "expected": 2.904802997685112e-99
        }
      ]
    },
    "generator": {
      "code": "(__import__(\"random\").randint(0, 8),)",
      "count": 50,
      "seed": 42
    }
  }
}'::jsonb
WHERE id = 'b27aed1a-e815-499b-a10b-5fed9960c070';

-- Bac Amérique du Sud 09/2022 sujet 2 Q6.b — Population — années avant un seuil
-- population(S): S must be > 1000 (sequence converges to 1000).
UPDATE python_exercises
SET validation_config = '{
  "ast_requirements": [
    {
      "name": "population",
      "type": "defines_function",
      "message": "Tu dois définir la fonction population(S)."
    },
    {
      "type": "uses_loop",
      "message": "Tu dois utiliser une boucle while."
    }
  ],
  "behavior": {
    "kind": "reference_solution",
    "function_name": "population",
    "reference_code": "def population(S):\n    n = 0\n    u = 2000\n    while u > S:\n        u = 0.9 * u + 100\n        n = n + 1\n    return n\n",
    "fixed": {
      "cases": [
        {
          "args": [
            1020
          ],
          "expected": 38
        },
        {
          "args": [
            1050
          ],
          "expected": 29
        },
        {
          "args": [
            1100
          ],
          "expected": 22
        },
        {
          "args": [
            1500
          ],
          "expected": 7
        },
        {
          "args": [
            1900
          ],
          "expected": 1
        }
      ]
    },
    "generator": {
      "code": "(__import__(\"random\").uniform(1010, 1990),)",
      "count": 50,
      "seed": 42
    }
  }
}'::jsonb
WHERE id = '9c290871-6311-48d5-8cf8-62e2578a73c3';

-- Bac Amérique du Sud 09/2023 Q2 — Suite arithmétique récurrente — calcul du n-ième terme
-- suite_u(n) ≈ 5^n, capped at n=12 (≈ 10^9 manageable).
UPDATE python_exercises
SET validation_config = '{
  "ast_requirements": [
    {
      "name": "suite_u",
      "type": "defines_function",
      "message": "Tu dois définir la fonction suite_u(n)."
    },
    {
      "type": "uses_loop",
      "message": "Tu dois utiliser une boucle (for ou while)."
    }
  ],
  "behavior": {
    "kind": "reference_solution",
    "function_name": "suite_u",
    "reference_code": "def suite_u(n):\n    u = 0\n    for i in range(1, n + 1):\n        u = 5 * u - 8 * (i - 1) + 6\n    return u\n",
    "fixed": {
      "cases": [
        {
          "args": [
            0
          ],
          "expected": 0
        },
        {
          "args": [
            1
          ],
          "expected": 6
        },
        {
          "args": [
            2
          ],
          "expected": 28
        },
        {
          "args": [
            5
          ],
          "expected": 3134
        },
        {
          "args": [
            10
          ],
          "expected": 9765644
        }
      ]
    },
    "generator": {
      "code": "(__import__(\"random\").randint(0, 12),)",
      "count": 50,
      "seed": 42
    }
  }
}'::jsonb
WHERE id = '73bf2e59-233b-4236-a2b9-b6a6a57b24ba';

-- Bac Asie 03/2023 Q5 — Désintégration du polonium — liste des termes
-- noyaux(n): list of n+1 nuclear-decay terms, capped at n=10.
UPDATE python_exercises
SET validation_config = '{
  "ast_requirements": [
    {
      "name": "noyaux",
      "type": "defines_function",
      "message": "Tu dois définir la fonction noyaux(n)."
    },
    {
      "type": "uses_loop",
      "message": "Tu dois utiliser une boucle for."
    }
  ],
  "behavior": {
    "kind": "reference_solution",
    "function_name": "noyaux",
    "reference_code": "def noyaux(n):\n    V = 6 * 10 ** 21\n    L = [V]\n    for k in range(n):\n        V = 0.995 * V + 1.5 * 10 ** 19\n        L.append(V)\n    return L\n",
    "fixed": {
      "cases": [
        {
          "args": [
            0
          ],
          "expected": [
            6e+21
          ]
        },
        {
          "args": [
            1
          ],
          "expected": [
            6e+21,
            5.985e+21
          ]
        },
        {
          "args": [
            2
          ],
          "expected": [
            6e+21,
            5.985e+21,
            5.970075e+21
          ]
        },
        {
          "args": [
            3
          ],
          "expected": [
            6e+21,
            5.985e+21,
            5.970075e+21,
            5.955224625e+21
          ]
        },
        {
          "args": [
            7
          ],
          "expected": [
            6e+21,
            5.985e+21,
            5.970075e+21,
            5.955224625e+21,
            5.940448501875e+21,
            5.925746259365626e+21,
            5.911117528068798e+21,
            5.896561940428454e+21
          ]
        }
      ]
    },
    "generator": {
      "code": "(__import__(\"random\").randint(0, 10),)",
      "count": 50,
      "seed": 42
    }
  }
}'::jsonb
WHERE id = '6463678c-1ed5-4c2b-a563-4e2d91532d6a';

-- Bac Asie 05/2022 sujet 2 Q4 — Bactérie — liste des n premiers termes
-- suite(n): list of n bacterial-population terms.
UPDATE python_exercises
SET validation_config = '{
  "ast_requirements": [
    {
      "name": "suite",
      "type": "defines_function",
      "message": "Tu dois définir la fonction suite(n)."
    },
    {
      "type": "uses_loop",
      "message": "Tu dois utiliser une boucle for."
    }
  ],
  "behavior": {
    "kind": "reference_solution",
    "function_name": "suite",
    "reference_code": "def suite(n):\n    p = 0.3\n    s = [p]\n    for i in range(n - 1):\n        p = 0.3 + 0.7 * p ** 2\n        s.append(p)\n    return s\n",
    "fixed": {
      "cases": [
        {
          "args": [
            1
          ],
          "expected": [
            0.3
          ]
        },
        {
          "args": [
            2
          ],
          "expected": [
            0.3,
            0.363
          ]
        },
        {
          "args": [
            3
          ],
          "expected": [
            0.3,
            0.363,
            0.3922383
          ]
        },
        {
          "args": [
            5
          ],
          "expected": [
            0.3,
            0.363,
            0.3922383,
            0.407695618790823,
            0.41635100230686245
          ]
        },
        {
          "args": [
            10
          ],
          "expected": [
            0.3,
            0.363,
            0.3922383,
            0.407695618790823,
            0.41635100230686245,
            0.42134370998535026,
            0.4242713653609532,
            0.42600433402567317,
            0.4270357848260601,
            0.42765169306540635
          ]
        }
      ]
    },
    "generator": {
      "code": "(__import__(\"random\").randint(1, 15),)",
      "count": 50,
      "seed": 42
    }
  }
}'::jsonb
WHERE id = '4bfb4438-9e76-4788-89ff-a495b5919439';

-- Bac Asie 06/2024 Q9 — Seuil — probabilité de gagner
-- seuil(e) probability epsilon; smaller e → more iterations.
UPDATE python_exercises
SET validation_config = '{
  "ast_requirements": [
    {
      "name": "seuil",
      "type": "defines_function",
      "message": "Tu dois définir la fonction seuil(e)."
    },
    {
      "type": "uses_loop",
      "message": "Tu dois utiliser une boucle while."
    }
  ],
  "behavior": {
    "kind": "reference_solution",
    "function_name": "seuil",
    "reference_code": "def seuil(e):\n    g = 0.5\n    n = 1\n    while g > 0.4 + e:\n        g = 0.5 * g + 0.2\n        n = n + 1\n    return n\n",
    "fixed": {
      "cases": [
        {
          "args": [
            0.001
          ],
          "expected": 8
        },
        {
          "args": [
            0.01
          ],
          "expected": 5
        },
        {
          "args": [
            0.05
          ],
          "expected": 2
        },
        {
          "args": [
            0.0001
          ],
          "expected": 11
        },
        {
          "args": [
            0.1
          ],
          "expected": 1
        }
      ]
    },
    "generator": {
      "code": "(__import__(\"random\").uniform(0.0001, 0.1),)",
      "count": 50,
      "seed": 42
    }
  }
}'::jsonb
WHERE id = 'db5fb6e2-0178-4869-b356-351d26778076';

-- Bac Madagascar 05/2022 Partie B Q1.b — Suites entrelacées exp — termes(n)
-- termes(n): interlaced exp sequences, fast convergence.
UPDATE python_exercises
SET validation_config = '{
  "ast_requirements": [
    {
      "name": "termes",
      "type": "defines_function",
      "message": "Tu dois définir la fonction termes(n)."
    },
    {
      "type": "uses_loop",
      "message": "Tu dois utiliser une boucle for."
    }
  ],
  "behavior": {
    "kind": "reference_solution",
    "function_name": "termes",
    "reference_code": "from math import exp\n\ndef termes(n):\n    a = 1 / 10\n    b = 1\n    for k in range(0, n):\n        c = exp(-b)\n        b = exp(-a)\n        a = c\n    return (a, b)\n",
    "fixed": {
      "cases": [
        {
          "args": [
            0
          ],
          "expected": [
            0.1,
            1
          ]
        },
        {
          "args": [
            1
          ],
          "expected": [
            0.36787944117144233,
            0.9048374180359595
          ]
        },
        {
          "args": [
            2
          ],
          "expected": [
            0.40460766166413187,
            0.6922006275553463
          ]
        },
        {
          "args": [
            5
          ],
          "expected": [
            0.545395785975027,
            0.5986228020506361
          ]
        },
        {
          "args": [
            10
          ],
          "expected": [
            0.565315835672005,
            0.5684287250290607
          ]
        }
      ]
    },
    "generator": {
      "code": "(__import__(\"random\").randint(0, 15),)",
      "count": 50,
      "seed": 42
    },
    "tolerance": {
      "eps_abs": 0.0001,
      "eps_rel": 0.0001
    }
  }
}'::jsonb
WHERE id = 'a682b0db-8962-4922-8716-76de8aa3913d';

-- Bac Métropole 06/2024 Q5.a — Seuil — suite avec ln(u²+1)
-- seuil(h) with ln; h < 0.005 takes 1000+ iterations.
UPDATE python_exercises
SET validation_config = '{
  "ast_requirements": [
    {
      "name": "seuil",
      "type": "defines_function",
      "message": "Tu dois définir la fonction seuil(h)."
    },
    {
      "type": "uses_loop",
      "message": "Tu dois utiliser une boucle while."
    }
  ],
  "behavior": {
    "kind": "reference_solution",
    "function_name": "seuil",
    "reference_code": "from math import log as ln\n\ndef seuil(h):\n    n = 0\n    u = 7\n    while u > h:\n        n = n + 1\n        u = u - ln(u ** 2 + 1)\n    return n\n",
    "fixed": {
      "cases": [
        {
          "args": [
            0.01
          ],
          "expected": 97
        },
        {
          "args": [
            0.1
          ],
          "expected": 9
        },
        {
          "args": [
            1
          ],
          "expected": 2
        },
        {
          "args": [
            0.001
          ],
          "expected": 994
        }
      ]
    },
    "generator": {
      "code": "(__import__(\"random\").uniform(0.005, 1.0),)",
      "count": 50,
      "seed": 42
    }
  }
}'::jsonb
WHERE id = 'c4c6c934-237c-40e3-b16e-9bbd42c1dc00';

-- Bac Métropole 06/2024 sujet 2 Partie A Q4 — Alerte chlore
-- alerte_chlore(s): u converges to 3.75 (= 0.3/(1-0.92)).
UPDATE python_exercises
SET validation_config = '{
  "ast_requirements": [
    {
      "name": "alerte_chlore",
      "type": "defines_function",
      "message": "Tu dois définir la fonction alerte_chlore(s)."
    },
    {
      "type": "uses_loop",
      "message": "Tu dois utiliser une boucle while."
    }
  ],
  "behavior": {
    "kind": "reference_solution",
    "function_name": "alerte_chlore",
    "reference_code": "def alerte_chlore(s):\n    n = 0\n    u = 0.7\n    while u <= s:\n        n = n + 1\n        u = 0.92 * u + 0.3\n    return n\n",
    "fixed": {
      "cases": [
        {
          "args": [
            3
          ],
          "expected": 17
        },
        {
          "args": [
            2
          ],
          "expected": 7
        },
        {
          "args": [
            1
          ],
          "expected": 2
        },
        {
          "args": [
            3.5
          ],
          "expected": 30
        },
        {
          "args": [
            0.5
          ],
          "expected": 0
        }
      ]
    },
    "generator": {
      "code": "(__import__(\"random\").uniform(0.5, 3.7),)",
      "count": 50,
      "seed": 42
    }
  }
}'::jsonb
WHERE id = 'fddbcaf8-6245-48c6-9293-194b35782e88';

-- Bac Métropole 09/2021 Q3 — Seuil — suite homographique 4u/(1+3u)
-- seuil(E) homographic; E < 1e-4 takes too many iterations.
UPDATE python_exercises
SET validation_config = '{
  "ast_requirements": [
    {
      "name": "seuil",
      "type": "defines_function",
      "message": "Tu dois définir la fonction seuil(E)."
    },
    {
      "type": "uses_loop",
      "message": "Tu dois utiliser une boucle while."
    }
  ],
  "behavior": {
    "kind": "reference_solution",
    "function_name": "seuil",
    "reference_code": "def seuil(E):\n    u = 0.5\n    n = 0\n    while 1 - u >= E:\n        u = 4 * u / (1 + 3 * u)\n        n = n + 1\n    return n\n",
    "fixed": {
      "cases": [
        {
          "args": [
            0.0001
          ],
          "expected": 7
        },
        {
          "args": [
            0.01
          ],
          "expected": 4
        },
        {
          "args": [
            0.000001
          ],
          "expected": 10
        },
        {
          "args": [
            0.1
          ],
          "expected": 2
        }
      ]
    },
    "generator": {
      "code": "(__import__(\"random\").uniform(0.0001, 0.1),)",
      "count": 50,
      "seed": 42
    }
  }
}'::jsonb
WHERE id = '86081be4-ade5-44b8-8b75-38d10d5ee41b';

-- Bac Métropole 09/2023 Q2 — Suite n/eⁿ — calcul du n-ième terme
-- suite(n) = n/e^n. Starts at i=1 (n=0 untested).
UPDATE python_exercises
SET validation_config = '{
  "ast_requirements": [
    {
      "name": "suite",
      "type": "defines_function",
      "message": "Tu dois définir la fonction suite(n)."
    },
    {
      "type": "uses_loop",
      "message": "Tu dois utiliser une boucle (for ou while)."
    }
  ],
  "behavior": {
    "kind": "reference_solution",
    "function_name": "suite",
    "reference_code": "from math import e\n\ndef suite(n):\n    u = 1 / e\n    for i in range(1, n):\n        u = 1 / e * (1 + 1 / i) * u\n    return u\n",
    "fixed": {
      "cases": [
        {
          "args": [
            1
          ],
          "expected": 0.36787944117144233
        },
        {
          "args": [
            2
          ],
          "expected": 0.2706705664732254
        },
        {
          "args": [
            3
          ],
          "expected": 0.14936120510359185
        },
        {
          "args": [
            5
          ],
          "expected": 0.03368973499542734
        },
        {
          "args": [
            10
          ],
          "expected": 0.00045399929762484866
        }
      ]
    },
    "generator": {
      "code": "(__import__(\"random\").randint(1, 20),)",
      "count": 50,
      "seed": 42
    }
  }
}'::jsonb
WHERE id = '8c9facc7-f4b0-4a5a-b41c-43882bc5fea0';

-- Bac Nouvelle Calédonie 08/2023 sujet 2 Q2 — Suite homographique — calcul du n-ième terme
-- terme(n) homographic sequence, bounded and convergent.
UPDATE python_exercises
SET validation_config = '{
  "ast_requirements": [
    {
      "name": "terme",
      "type": "defines_function",
      "message": "Tu dois définir la fonction terme(n)."
    },
    {
      "type": "uses_loop",
      "message": "Tu dois utiliser une boucle (for ou while)."
    }
  ],
  "behavior": {
    "kind": "reference_solution",
    "function_name": "terme",
    "reference_code": "def terme(n):\n    u = 0\n    for i in range(n):\n        u = (-u - 4) / (u + 3)\n    return u\n",
    "fixed": {
      "cases": [
        {
          "args": [
            0
          ],
          "expected": 0
        },
        {
          "args": [
            1
          ],
          "expected": -1.3333333333333333
        },
        {
          "args": [
            2
          ],
          "expected": -1.6
        },
        {
          "args": [
            3
          ],
          "expected": -1.7142857142857144
        },
        {
          "args": [
            5
          ],
          "expected": -1.8181818181818183
        },
        {
          "args": [
            10
          ],
          "expected": -1.9047619047619049
        }
      ]
    },
    "generator": {
      "code": "(__import__(\"random\").randint(0, 25),)",
      "count": 50,
      "seed": 42
    }
  }
}'::jsonb
WHERE id = '4ca5b349-14ba-4879-8cb8-5b1e6bfa8c50';

-- Bac Polynésie 05/2022 Q1.b — Suite 1/(n+1) — liste des termes
-- liste(k): list of k+1 harmonic-like terms.
UPDATE python_exercises
SET validation_config = '{
  "ast_requirements": [
    {
      "name": "liste",
      "type": "defines_function",
      "message": "Tu dois définir la fonction liste(k)."
    },
    {
      "type": "uses_loop",
      "message": "Tu dois utiliser une boucle for."
    }
  ],
  "behavior": {
    "kind": "reference_solution",
    "function_name": "liste",
    "reference_code": "def liste(k):\n    L = []\n    u = 1\n    for i in range(0, k + 1):\n        L.append(u)\n        u = u / (1 + u)\n    return L\n",
    "fixed": {
      "cases": [
        {
          "args": [
            0
          ],
          "expected": [
            1
          ]
        },
        {
          "args": [
            1
          ],
          "expected": [
            1,
            0.5
          ]
        },
        {
          "args": [
            2
          ],
          "expected": [
            1,
            0.5,
            0.3333333333333333
          ]
        },
        {
          "args": [
            5
          ],
          "expected": [
            1,
            0.5,
            0.3333333333333333,
            0.25,
            0.2,
            0.16666666666666669
          ]
        },
        {
          "args": [
            10
          ],
          "expected": [
            1,
            0.5,
            0.3333333333333333,
            0.25,
            0.2,
            0.16666666666666669,
            0.14285714285714288,
            0.12500000000000003,
            0.11111111111111113,
            0.10000000000000002,
            0.09090909090909093
          ]
        }
      ]
    },
    "generator": {
      "code": "(__import__(\"random\").randint(0, 15),)",
      "count": 50,
      "seed": 42
    }
  }
}'::jsonb
WHERE id = 'c1808174-5f22-485e-a726-1867d4c0288c';

-- Bac Polynésie 06/2024 Partie A Q1 — Suite homographique — calcul du n-ième terme
-- suite(n) homographic 4/(5-u), converges to 1.
UPDATE python_exercises
SET validation_config = '{
  "ast_requirements": [
    {
      "name": "suite",
      "type": "defines_function",
      "message": "Tu dois définir la fonction suite(n)."
    },
    {
      "type": "uses_loop",
      "message": "Tu dois utiliser une boucle (for ou while)."
    }
  ],
  "behavior": {
    "kind": "reference_solution",
    "function_name": "suite",
    "reference_code": "def suite(n):\n    u = 3\n    for i in range(n):\n        u = 4 / (5 - u)\n    return u\n",
    "fixed": {
      "cases": [
        {
          "args": [
            0
          ],
          "expected": 3
        },
        {
          "args": [
            1
          ],
          "expected": 2
        },
        {
          "args": [
            2
          ],
          "expected": 1.3333333333333333
        },
        {
          "args": [
            5
          ],
          "expected": 1.0058479532163742
        },
        {
          "args": [
            10
          ],
          "expected": 1.0000057220349845
        }
      ]
    },
    "generator": {
      "code": "(__import__(\"random\").randint(0, 25),)",
      "count": 50,
      "seed": 42
    }
  }
}'::jsonb
WHERE id = 'b6459994-fd00-4188-9102-0533a5ee242d';

-- Bac Polynésie 09/2024 Q2.b — Pyramide de boules
-- pyramide(n) = sum of squares, polynomial in n.
UPDATE python_exercises
SET validation_config = '{
  "behavior": {
    "kind": "reference_solution",
    "function_name": "pyramide",
    "reference_code": "def pyramide(n):\n    S = 0\n    for i in range(1, n + 1):\n        S = S + i ** 2\n    return S\n",
    "fixed": {
      "cases": [
        {
          "args": [
            1
          ],
          "expected": 1
        },
        {
          "args": [
            4
          ],
          "expected": 30
        },
        {
          "args": [
            5
          ],
          "expected": 55
        },
        {
          "args": [
            7
          ],
          "expected": 140
        },
        {
          "args": [
            10
          ],
          "expected": 385
        },
        {
          "args": [
            0
          ],
          "expected": 0
        }
      ]
    },
    "generator": {
      "code": "(__import__(\"random\").randint(0, 30),)",
      "count": 50,
      "seed": 42
    }
  }
}'::jsonb
WHERE id = '459aefe4-5686-4c90-9309-e8ce3135abbd';

-- Type Bac terminale spé maths — Seuil — population croissante
-- annee_seuil(s): population P_0 = 1500; s must be > 1500.
UPDATE python_exercises
SET validation_config = '{
  "behavior": {
    "kind": "reference_solution",
    "function_name": "annee_seuil",
    "reference_code": "def annee_seuil(s):\n    P = 1500\n    n = 0\n    while P <= s:\n        P = 1.03 * P\n        n = n + 1\n    return n\n",
    "fixed": {
      "cases": [
        {
          "args": [
            5000
          ],
          "expected": 41
        },
        {
          "args": [
            3000
          ],
          "expected": 24
        },
        {
          "args": [
            10000
          ],
          "expected": 65
        },
        {
          "args": [
            1600
          ],
          "expected": 3
        }
      ]
    },
    "generator": {
      "code": "(__import__(\"random\").uniform(1550, 10000),)",
      "count": 50,
      "seed": 42
    }
  }
}'::jsonb
WHERE id = 'c3123de0-1c8c-4290-a247-6b56dda7e4c8';

-- Type Bac terminale spé maths — Seuil — suite arithmético-géométrique
-- seuil(s) arith-geo; converges to 25, so s ≥ 0 is OK.
UPDATE python_exercises
SET validation_config = '{
  "behavior": {
    "kind": "reference_solution",
    "function_name": "seuil",
    "reference_code": "def seuil(s):\n    u = 100\n    n = 0\n    while u - 25 >= s:\n        u = 0.8 * u + 5\n        n = n + 1\n    return n\n",
    "fixed": {
      "cases": [
        {
          "args": [
            0.001
          ],
          "expected": 51
        },
        {
          "args": [
            0.1
          ],
          "expected": 30
        },
        {
          "args": [
            1
          ],
          "expected": 20
        },
        {
          "args": [
            10
          ],
          "expected": 10
        }
      ]
    },
    "generator": {
      "code": "(__import__(\"random\").uniform(0.005, 10.0),)",
      "count": 50,
      "seed": 42
    }
  }
}'::jsonb
WHERE id = '9c015115-bb0b-428c-a222-18b5f1361da6';

-- Type Bac terminale spé maths — Seuil — somme partielle d'une série
-- seuil_somme(s): partial sum of 1/n^2 converges to π^2/6 ≈ 1.6449.
UPDATE python_exercises
SET validation_config = '{
  "behavior": {
    "kind": "reference_solution",
    "function_name": "seuil_somme",
    "reference_code": "def seuil_somme(s):\n    S = 0\n    n = 0\n    while S <= s:\n        n = n + 1\n        S = S + 1 / (n ** 2)\n    return n\n",
    "fixed": {
      "cases": [
        {
          "args": [
            1.6
          ],
          "expected": 23
        },
        {
          "args": [
            1.5
          ],
          "expected": 7
        },
        {
          "args": [
            1
          ],
          "expected": 2
        },
        {
          "args": [
            0.5
          ],
          "expected": 1
        }
      ]
    },
    "generator": {
      "code": "(__import__(\"random\").uniform(0.5, 1.6),)",
      "count": 50,
      "seed": 42
    }
  }
}'::jsonb
WHERE id = '14961769-076b-48e3-a810-b1d6ca2fb0f5';

