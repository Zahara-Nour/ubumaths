# Relevé « fonctions trigonométriques » de 1re spé (2026-11-25)

Chantier [`idees-1re-trigo`](idees-1re-trigo-progress.md). Rubrique 1AN4 de l'autre plateforme : 6 exercices
(les `-old` ignorés), lus dans leur code source (copie locale), comparés aux modèles de 1re spé en prod
(MCP, lecture seule). Bornes : [1spe.md](../systeme/programmes/bornes/lycee/1spe.md), § Trigonométrie et
décision **l1s-3** de David (valeurs 0, π/6, π/4, π/3, π/2 et tout réel associé lisible sur le cercle, à 2kπ
près ; **valeurs numériques seulement, pas de simplification littérale**).

## Nos modèles de 1re spé sur le sujet (prod)

| Point    | Modèle                                                    | Ce qu'il couvre                                                                                         |
| -------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1SPE-303 | aae5c0fc Le cercle trigonométrique (3 v)                  | rayon et longueur ; sens direct ; quel point (parmi 4 quarts) est associé à un réel                     |
| 1SPE-304 | f7194c9d Ramener un réel dans ]−π ; π] (6 v)              | aπ/6, aπ/4, aπ/3 à 1 à 4 tours, signes ±                                                                |
| 1SPE-304 | aad6c700 Lire le réel associé à un point du cercle (6 v)  | point M sur le cercle → mesure dans ]−π ; π] (π/6, π/4, π/3, π/2 ; un ou deux points)                   |
| 1SPE-305 | ee4e2ac6 Calculer cos x connaissant sin x (7 v)           | sin x = a/b (pythagoricien ou radical), quatre quarts de tour ; **jamais l'inverse**, jamais un décimal |
| 1SPE-306 | 558c31a7 Placer un point sur le cercle (3 v)              | geste `placer:` ; réels d'un tour, puis 13π/6, −7π/4… ; x et −x ou π − x                                |
| 1SPE-307 | 679a2e3e Cosinus et sinus d'angles associés (3 v)         | 5π/6, −7π/6, 11π/6… : un tour au plus ; ni π, ni 3π/2                                                   |
| 1SPE-408 | ac9b1868 Longueur d'un arc (4 v)                          | longueur d'arc, arc → réel de ]−π ; π]                                                                  |
| 1SPE-409 | 4b3c1d88 Convertir des degrés en radians (3 v)            | v0/v1 remarquables dans les deux sens ; v2 non remarquables (15°, 36°, 20°…) degrés → radians seulement |
| 1SPE-410 | 5a89b292 Cosinus et sinus des angles remarquables (5 v)   | 0, π/6, π/4, π/3, π/2                                                                                   |
| sans     | 174e202b, dc4b8d08 Angles associés : simplifier (brouill) | cos(π − x) = −cos x… ; **hors programme** (l1s-3), laissés en brouillon par `questions-1spe` (D17)      |

## Relevé

| Id      | Ce qu'on demande                                                                                                                                                | Forme de réponse      | Nos modèles                                    | Verdict                                                                                                                    |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 1AN40-1 | Degrés → radians (remarquables, ou tout entier de 1 à 360 : 17° = 17π/180) ; radians → degrés (remarquables, ou aπ/b quelconque, a, b ≤ 50, arrondi au dixième) | saisie                | 4b3c1d88 v0, v1, v2                            | 🟡 manque radians non remarquables → degrés (π/12, 2π/9…), et un degré entier quelconque → radians simplifié (50° = 5π/18) |
| 1AN40-2 | Mesure principale de (2nk + p)π/n, n = 3 à 13, k de −5 à 5 tours                                                                                                | saisie                | f7194c9d (n = 3, 4, 6 ; 1 à 4 tours)           | 🟡 manque les dénominateurs autres que 3, 4, 6 (5, 12…) ; n = 7, 9, 11, 13 ne se lisent sur aucun cercle (pas repris)      |
| 1AN40-3 | Figure à 16 points nommés : réel (± 1 ou 2 tours) → nom du point ; point → réel de ]−π ; π] **ou de [0 ; 2π[**                                                  | saisie d'une lettre   | 558c31a7 (geste `placer:`), aad6c700, f7194c9d | 🟡 réel → point : ✅ (notre geste fait mieux que la lettre) ; manque l'intervalle [0 ; 2π[ (lecture et calcul)             |
| 1AN41-1 | cos ou sin exact : quart de cercle ; angles associés (π − x, π + x, π/2 + x, −x) ; mêmes angles + 2kπ, k de 2 à 30 (cos(61π/3))                                 | saisie                | 5a89b292, 679a2e3e                             | 🟡 manque les réels à plusieurs tours (25π/6, −17π/4) et les points des axes (π, 3π/2, −π/2) ; k jusqu'à 30 non repris     |
| 1AN41-2 | Simplifier cos(x + π), sin(π/2 − x)… en fonction de cos x ou sin x                                                                                              | saisie d'une fonction | 174e202b (brouillon sans point)                | ✅ côté idée, déjà écrite ; **hors programme** (l1s-3 : pas de simplification littérale en 1re) : rien de plus             |
| 1AN41-3 | x dans un demi-tour donné, sin x = 0,a (resp. cos x = 0,a) → cos x (resp. sin x) par cos² + sin² = 1 ; réponse ±√(1 − 0,a²) (laissée sous la forme √0,91)       | saisie                | ee4e2ac6 (sin → cos, fractions)                | 🟡 manque cos → sin, et une valeur décimale donnée                                                                         |

## Décompte

6 relevés : ✅ 1 (hors programme, déjà en brouillon) · 🟡 5 · ❌ 0.

## Ce que leur format fait et pas le nôtre

Rien : leur figure à 16 points nommés (réponse = une lettre) est remplacée chez nous par le geste `placer:`
du bloc `trig` (558c31a7), qui juge le placement lui-même. Aucune ligne pour `outils-manquants.md`.
