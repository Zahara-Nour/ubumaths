---
title: Dérivation 1re SPE — questions
date: 2026-10-02
status: livré (#637, #638, #640, #641, #642) ; 16 modèles en brouillon + 74d77343 corrigé (2026-10-02)
---

# Dérivation 1re SPE — point de reprise

## Commande de David (2026-10-02)

« Même chose » que suites, exponentielle et trigonométrie. Existant : `a86442c1` (dérivées usuelles,
publié) et `74d77343` (b/x, une variation, astuce `x|x`), cartes de cours « Étude de fonction ».
Décisions validées (« ok » sur mes recommandations) :

1. Faux négatif `\frac{1}{2}x^{-\frac12}` ≢ `\frac{1}{2\sqrt x}` à corriger → `fix/puissances-fractionnaires`.
2. Clé `tangente: f ; a` dans le bloc ```courbe → PR #637.
3. `form: warn` pour « calcule f′(x) » (ADR 0013, la valeur est l'objet) ; `strict` si l'énoncé exige
   une forme (factorisée pour étudier un signe).
4. `74d77343` corrigé en place (astuce retirée, variations ajoutées en fin de liste).
5. Domaine « Dérivation » : Apprivoiser, Nombre dérivé, Tangente, Fonctions dérivées, Variations.

## Modèles (`scripts/questions/derivation-1spe/`)

| Lot | Contenu                                                                                            |
| --- | -------------------------------------------------------------------------------------------------- |
| A   | Nombre dérivé (taux, f′(a) calculé, lu), Tangente (à partir de f(a), f′(a) ; calcul complet ; lue) |
| B   | Fonctions dérivées (polynômes, ku et sommes, produit, quotient, 1/v, composée)                     |
| C   | Variations (signe de f′, intervalles de croissance, extremum degré 3, courbe de f′) + 74d77343     |

**16 modèles créés en BROUILLON en production le 2026-10-02** (A : 6, B : 6, C : 4) et `74d77343`
corrigé en place (lot `derivation` de `update-published-questions.ts` ; aucun usage élève vérifié ;
astuce `x|x` retirée ; variations k√x, kxⁿ, kx + b, b/x avec b < 0, −k√x ajoutées en fin de liste ;
preuve rouge : 3/22 specs vertes sur le contenu d'avant). Chaque modèle : `question:specs` vert, 150
tirages par variation, réponses recalculées en Python (sympy pour B) ; figures : tangente tracée
tangente à la courbe tracée, lecture sur la grille ; PDF compilés 4/4.

Formes : `warn` pour « calcule f′(x) » ; `strict` pour A-01 (taux simplifié), A-04, A-05 (équation
réduite), C-01 à C-04.

## Défauts trouvés en route

- #638 : puissances fractionnaires ≡ racines (`\frac12 x^{-\frac12}` jugé faux pour `\frac{1}{2\sqrt x}`).
- **`simplify` AFFICHAIT une valeur fausse** (`(4x+1)^{\frac12}` → `4x+1`, `2^{\frac12}` → `2`) :
  corrigé par #642 (exposant « 1/2 » relu comme 1) ; touchait l'ordonnée exacte des extremums du
  grapheur et la commande `.simplify` (calculatrice, console, atelier), PAS les corrigés élèves ni la
  correction des réponses. Garde-fou ajouté : `simplify/__tests__/preserve-valeur.test.ts`.
- Conditions : `==` toujours FAUX en silence, `!(a = b)` aussi → corrigé par #641 ; une condition
  illisible lève une erreur explicite. Vérifié : 14 880 générations de toute la production, 0 échec
  avant comme après.
- Bloc courbe : le nom d'une courbe s'écarte des points, pas des autres noms (« C_f » + « T » → « CT ») ;
  contourné en retirant les noms dans A-03, A-06.

## Points à relire (David)

- B-04 v2 (quotient, signe à étudier) : `warn` ; « sous forme factorisée » + `strict` possible.
- B-06, a < 0 : `12(3x-2)^3` pour `-12(-3x+2)^3` est « non optimal » (écriture juste).
- A-01 en `strict` : `(6h+h^2)/h` (non simplifié) est « mauvaise forme ».

## cleanCoefficients activé (2026-10-03)

`shared.cleanCoefficients: true` (`1x` → `x`, `+0` retiré, `+-` → `-`) ; exclusions de ±1 / 0 qui ne servaient qu'à l'affichage levées. Vérifié : specs vertes (150 tirages), 300 tirages par variation sans `1x`, `0x`, `+-`, `--` dans le rendu (les `4+0`, `-1-0` restants sont des étapes de calcul voulues).

- A-01 v1 : b de 1 à 6 (et non 2) ; retirées `abs(2a+b) != 1`, `a+b != 0`.
- A-04 : m de 1 à 6. A-05 : retirées `fa != 0`, `abs(fpa) != 1` (tangente horizontale ou par l'origine possible).
- B-01 à B-04, B-06 : coefficients dès 1 (et non 2). B-02 v0 a ∈ {1, 3, 5, 7}.
- B-05, B-06 : variable `x` déclarée lettre tirée (`x|x`) pour que `{{eval:a*x+b}}` écrive `x+3` et non `1x+3` (calcul littéral).
- Gardé : dénominateur non nul, a ≠ 0 quand le degré en dépend.
