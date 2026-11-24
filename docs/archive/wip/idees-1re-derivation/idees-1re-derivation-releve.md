# Relevé « dérivation » de Première spécialité (2026-11-23)

Chantier [`idees-1re-derivation`](idees-1re-derivation-progress.md). 12 exercices de la rubrique 1AN1
d'une autre plateforme (1AN10-1 à 4, 1AN11-1 à 8), lus dans leur code source (copie locale, sans les
`-old` ni les `Old`), comparés à nos modèles publiés en prod (MCP en lecture seule, énoncés et
variables des variations lus). Les ids sont ceux de la plateforme.

**Leur forme** : tous se saisissent au clavier (une expression ou un nombre) ; 1AN10-2 a deux ou trois
champs (taux, nombre dérivé, tangente), 1AN10-3 une à trois tangentes sur la même courbe.

## Nos modèles (prod, publiés, 1re spé)

| Id court | Titre                                                                 | Var. | Point    | Niveaux         |
| -------- | --------------------------------------------------------------------- | ---- | -------- | --------------- |
| de73e71d | Utiliser la définition du taux de variation                           | 2    | 1SPE-259 | 1 SPE, 1 TECHNO |
| 46913a48 | Taux de variation et nombre dérivé (x², x² + bx)                      | 2    | 1SPE-260 | 1 SPE, 1 TECHNO |
| ed8444bb | Lire l'équation d'une tangente sur un graphique                       | 2    | 1SPE-261 | 1 SPE, 1 TECHNO |
| be57bd36 | Fonction affine tangente (x², x³, 1/x, √x)                            | 4    | 1SPE-262 | 1 SPE           |
| 74d77343 | Calculer une dérivée (b/x, k√x, kxⁿ, kx + b ; entiers)                | 6    | 1SPE-265 | 1 SPE           |
| 9755a856 | Dériver une somme avec 1/x et √x                                      | 2    | 1SPE-265 | 1 SPE           |
| cda8e0d2 | Calculer un nombre dérivé (degré 2, 3)                                | 2    | 1SPE-265 | 1 SPE, 1 TECHNO |
| 1666b8e9 | Dériver un polynôme (entiers ; a/3 x³ + b/2 x² + cx)                  | 3    | 1SPE-265 | 1 SPE, 1 TECHNO |
| a86442c1 | Calculer une dérivée (x, x², xⁿ, 1/x, constante)                      | 5    | 1SPE-266 | 1 SPE           |
| 286a68a8 | Calculer un taux de variation (degré 2, inverse, √x)                  | 3    | 1SPE-268 | 1 SPE, 1 TECHNO |
| d58208eb | Lire un nombre dérivé sur un graphique (parabole, pente k/2)          | 2    | 1SPE-270 | 1 SPE, 1 TECHNO |
| edb094bd | Tracer une tangente connaissant le nombre dérivé                      | 2    | 1SPE-271 | 1 SPE, 1 TECHNO |
| f52395d1 | Équation d'une tangente connaissant f(a) et f′(a)                     | 2    | 1SPE-272 | 1 SPE, 1 TECHNO |
| 05387201 | Équation de la tangente à un polynôme (degré 2, 3)                    | 2    | 1SPE-272 | 1 SPE, 1 TECHNO |
| 15d3aaa0 | Tangente à la courbe de exp en un point                               | 3    | 1SPE-272 | 1 SPE           |
| 496f958d | Dériver (ax + b)eˣ                                                    | 2    | 1SPE-274 | 1 SPE           |
| cffdd283 | Dériver une somme d'exponentielle et de polynôme                      | 3    | 1SPE-274 | 1 SPE           |
| 227f2c9c | Dériver une exponentielle de fonction affine                          | 3    | 1SPE-295 | 1 SPE           |
| 8997f7c6 | Dériver un produit ((ax + b)(x² + c), ax√x, (ax + b)√x)               | 3    | 1SPE-394 | 1 SPE           |
| 0140fdfa | Dériver l'inverse d'une fonction (1/(ax + b), k/(ax + b), k/(x² + c)) | 3    | 1SPE-395 | 1 SPE           |
| f1440b52 | Dériver un quotient ((ax + b)/(cx + d), (x² + a)/(x + b))             | 3    | 1SPE-396 | 1 SPE           |

Et, par point : a181f10b, a16a9bba, 7201f3b2, ff36ebdf (dérivées de référence, QCM) ; d2bca2d8, b359cd25,
e9fe1a28, 2067f7a4, 5be4ac71, 3020b065, 8a384698 ; démonstrations 9e377c97, f7938cd3, b05ec37a,
16ee6f33, e2908d60. En Tle : 8b599a53 « Dériver g(ax + b) » (TSPE-408).

## Relevé

| Id      | Ce qu'on demande                                                                                                                                         | Forme chez eux        | Nos modèles                                      | Verdict                                                                                                      |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 1AN10-1 | Taux de variation entre a et b (affine, x², second degré, 1/x, √x) ou entre a et a + h, simplifié                                                        | saisie                | 286a68a8 (a, b) ; 46913a48 (a + h : x², x² + bx) | 🟡 manquent, entre a et a + h : 1/x et αx² + βx + γ avec α ≠ 1                                               |
| 1AN10-2 | Nombre dérivé par la définition : taux t(h), puis f′(a), puis tangente (affine, x², 1/x, √x, x² + bx + c, ax² + bx + c, a/x, a/(x + b))                  | 2 ou 3 champs         | 46913a48 (x², x² + bx)                           | 🟡 manquent 1/x, k/x, k/(x + b) (« cas qui s'y prêtent » du BO) ; √x demande la quantité conjuguée, hors BO  |
| 1AN10-3 | Lire f′(a) par la pente de la tangente tracée : parabole, cube, degré 3, √x, 1/x, exp, ln, périodique ; 1 à 3 tangentes ; pente entière ou fractionnaire | saisie (1 à 3 champs) | d58208eb (parabole, pente entière ou demi)       | 🟡 manquent une autre courbe (degré 3, hyperbole), la tangente horizontale, une pente en tiers ; ln hors 1re |
| 1AN10-4 | Équation réduite de la tangente : f(a) et f′(a) donnés, degré 2, degré 3, a/(bx + c)                                                                     | saisie                | f52395d1, 05387201                               | 🟡 manque la fonction rationnelle a/(bx + c)                                                                 |
| 1AN11-1 | Dériver λu : affine, monôme degré 2 à 6 à coefficient fractionnaire, degré 3, a/x, k√x (coefficients fractionnaires)                                     | saisie                | 74d77343 (entiers)                               | 🟡 manquent les coefficients fractionnaires (2/3·x⁴, −3/5·√x)                                                |
| 1AN11-2 | Dériver u + v : polynôme + inverse, polynôme + √x, inverse + √x, les trois                                                                               | saisie                | 9755a856, 74d77343                               | ✅                                                                                                           |
| 1AN11-3 | Dériver un polynôme (constante à degré 3, deux monômes), coefficients entiers, rationnels ou décimaux                                                    | saisie                | 1666b8e9                                         | 🟡 manquent les coefficients décimaux (0,5x³ − 1,2x²)                                                        |
| 1AN11-4 | Dériver u(ax + b) : (ax + b)ⁿ, √(ax + b), 1/(ax + b), e^(ax + b)                                                                                         | saisie                | 227f2c9c, 0140fdfa ; Tle 8b599a53                | ✅ au programme ; √(ax + b) et (ax + b)ⁿ hors liste du BO de 1re (décision l1s-1), couverts en Tle           |
| 1AN11-5 | Dériver a/u : u = x + b, mx + p, ax² + b                                                                                                                 | saisie                | 0140fdfa                                         | 🟡 manque ax² + b avec a ≠ 1                                                                                 |
| 1AN11-6 | Dériver un produit : ax²·(mx + p), (1/x)(mx + p) en un seul quotient, √x·polynôme, √x·(ax² + c), ax²·√x                                                  | saisie                | 8997f7c6 (affine × x² + c, x√x, affine × √x)     | 🟡 manquent ax²√x et (ax² + c)√x ; (1/x)(mx + p) = m + p/x se dérive sans la formule du produit              |
| 1AN11-7 | Dériver un quotient : (ax + b)/(cx + d), axⁿ/(cx + d), (ax² + bx + c)/(ex + f), axⁿ/(ax² + c)                                                            | saisie                | f1440b52 ((ax + b)/(cx + d), (x² + a)/(x + b))   | 🟡 manquent axⁿ/(cx + d), un numérateur de degré 2 complet, kx/(x² + c)                                      |
| 1AN11-8 | Bilan : mélange de 1AN11-1 à 7                                                                                                                           | saisie                | une série                                        | ✅ rien à écrire                                                                                             |

## Ce que leur format fait et pas le nôtre

Rien de bloquant. Plusieurs tangentes sur une même courbe (1AN10-3) : chez nous, une case par
question (une tangente). « Montrer que f′(x) = … » sans saisie (1AN11-7, option) : nos démonstrations
sont des modèles à part ; pas repris. Leur « utiliser la formule du produit » (1AN11-6) ne se vérifie
pas sur la réponse : pas repris.

## Remarques sur nos modèles

- 46913a48 porte aussi 1 TECHNO (1TECHNO-070) : le BO techno réserve le calcul du taux aux
  polynômes simples (décision l1t-7). Les cas 1/x, k/x, k/(x + b) vont donc dans un **modèle neuf**
  de 1 SPE seul, pas en variation de 46913a48.
- d58208eb porte 1 TECHNO : une courbe de degré 3 ou une hyperbole y restent lisibles (lecture
  graphique, 1TECHNO-077).
