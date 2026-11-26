# Relevé « variations » de Première spécialité (2026-11-26)

Chantier [`idees-1re-variations`](idees-1re-variations-progress.md). 5 exercices de la rubrique 1AN2
d'une autre plateforme (1AN20-1 à 3, 1AN21-1 et 2), lus dans leur code source (copie locale), comparés
à nos modèles en prod (MCP en lecture seule, énoncés et variables des variations lus). Les ids sont
ceux de la plateforme.

**Leur forme** : aucun n'est interactif. Ce sont des études complètes à rédiger (dériver, montrer
une factorisation, dresser le tableau, donner les extremums), corrigées par un tableau dessiné.
Leur bloc fait **mieux en rédaction**, le nôtre fait **mieux en saisie** : notre bloc ```variation
à cases `?` (signe, flèche, valeur, `||`) fait compléter et juge le tableau case par case.

## Nos modèles (prod, publiés, 1re spé)

| Id court | Titre                                                        | Var. | Point    | Niveaux         |
| -------- | ------------------------------------------------------------ | ---- | -------- | --------------- |
| 2b382069 | Intervalles où f est croissante, f′ trinôme du second degré  | 3    | 1SPE-281 | 1 SPE           |
| 9a04eb9f | Intervalle où f est croissante, f′ de la forme (ax + b)eˣ    | 4    | 1SPE-281 | 1 SPE           |
| 17f64f63 | Du signe de f′ au sens de variation de f                     | 4    | 1SPE-281 | 1 SPE, 1 TECHNO |
| 782bf7f8 | Lire les variations de f sur la courbe de f′                 | 4    | 1SPE-281 | 1 SPE, 1 TECHNO |
| 47843e39 | Extrémum et tangente horizontale                             | 4    | 1SPE-282 | 1 SPE           |
| f61ddbbb | Tableau de variations d'une fonction avec exponentielle      | 4    | 1SPE-283 | 1 SPE           |
| c7b5130d | Sens de variation d'une fonction exponentielle (paramètre k) | 5    | 1SPE-283 | 1 SPE           |
| 83b1f614 | Maximum local d'une fonction polynôme de degré 3             | 3    | 1SPE-401 | 1 SPE, 1 TECHNO |
| a86fc757 | Extremum de x ↦ (x + a)eˣ                                    | 2    | 1SPE-401 | 1 SPE           |
| 3fa3af6c | Établir une inégalité par les variations (dont x + a²/x)     | 3    | 1SPE-285 | 1 SPE           |
| 0113c53d | Variations et extremum d'une fonction du second degré        | 4    | 1SPE-287 | 1 SPE           |
| f900ea05 | Extremum d'une fonction du second degré sur un intervalle    | 3    | 1SPE-402 | 1 SPE           |
| f1440b52 | Dériver un quotient                                          | 6    | 1SPE-396 | 1 SPE           |
| d1cf9d7c | Équation de la tangente à une fonction rationnelle           | 3    | 1SPE-272 | 1 SPE           |

Ailleurs : 14b60caa « Sens de variation d'une fonction polynôme de degré au plus 3 » (1 TECHNO seul,
tableau à compléter) ; 912caf72 « Étudier une fonction ax + b + k/x » (T TECHNO, minimum sur
]0 ; +∞[) ; 74d73d4e « Variations d'une fonction auxiliaire ou homographique » (T SPE, tableaux
**avec limites**, QCM).

## Relevé

| Id      | Ce qu'on demande                                                                                                                                                                               | Nos modèles                                        | Verdict                                                                                                                                                                                |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1AN20-1 | Degré 3 sur [x₁ − 2 ; x₂ + 2], f′ = a(x − x₁)(x − x₂) à montrer ; tableau de signes et de variations **avec les valeurs** ; maximum et minimum **globaux** (comparer extremum local et bornes) | 83b1f614 (maximum local sur ℝ) ; 14b60caa (techno) | 🟡 manquent en 1 SPE : le tableau complet sur un intervalle fermé (valeurs aux bornes et aux racines), et le max / min sur l'intervalle (piège : l'extremum local n'est pas le global) |
| 1AN20-2 | Degré 3 sur ℝ, étudier le sens de variation : (1) f′ à racines entières ; (2) **f′ sans racine** (Δ < 0) ; (3) racines non entières (√Δ)                                                       | 83b1f614, 2b382069 (f′ donnée)                     | 🟡 (1) ✅ ; (2) manque : f′ de signe constant → f monotone sur ℝ ; (3) non repris : racines en √, tableau illisible, rien de plus que (1)                                              |
| 1AN20-3 | Fonction rationnelle : (ax + b)/(cx + d), a/(cx + d), a/(cx² + d) (définie sur ℝ), (ax² + bx + c)/(dx + e) ; variations sur l'ensemble de définition                                           | f1440b52 (dériver seulement) ; Tle 74d73d4e        | ❌ en 1re : aucun modèle n'étudie les variations d'une fonction rationnelle ; **sans limites** (BO 1re : aucun calcul de limite)                                                       |
| 1AN21-1 | Maximum et minimum sur [m ; n] : (1) ax + b/x (minimum intérieur, maximum intérieur, ou monotone) ; (2) degré 3 ; (3) degré 2 sans dérivée                                                     | f900ea05 (degré 2) ; 3fa3af6c (x + a²/x, minimum)  | 🟡 (3) ✅ ; manquent (1) ax + b/x sur un intervalle fermé (le max est à une borne, à comparer) et (2) degré 3 sur un intervalle (même idée que 1AN20-1)                                |
| 1AN21-2 | f(x) = (x² + bx + c)/(x + a), fonction auxiliaire P(x) = x² + 2ax + ab − c ; signe de P, f′ = P/(x + a)², tableau, extremums exacts, tangente                                                  | f1440b52, d1cf9d7c (tangente)                      | 🟡 tangente ✅ ; manque l'étude : signe de f′ par la fonction auxiliaire, extremums locaux (aux racines de P, f(xᵢ) = 2xᵢ + b, entiers)                                                |

## Ce que leur format fait et pas le nôtre

Rien de bloquant. « Montrer que f′(x) = … » (1AN20-1, 1AN21-2) ne se saisit pas : nos démonstrations
sont des modèles à part, pas repris ici ; chez nous, la forme factorisée est **donnée** et l'élève
s'en sert. Leur tableau complet en une fois devient chez nous un tableau à cases `?`.

## Programme

- Points : 1SPE-283 (étudier les variations), 1SPE-401 (déterminer les extrémums), 1SPE-281 (lien
  signe de f′ / variations). Bornes : fonctions que l'élève sait dériver (quotient compris, 1SPE-396).
- **Pas de limites en 1re** (bornes 1spe.md l. 104) : les tableaux des fonctions rationnelles portent
  la double barre `||` sans limite de part et d'autre, ni en ±∞.
