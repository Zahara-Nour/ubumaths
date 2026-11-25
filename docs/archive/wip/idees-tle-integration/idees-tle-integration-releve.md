# Relevé « primitives, équations différentielles, intégration » de Terminale spécialité (2026-11-25)

Chantier [`idees-tle-integration`](idees-tle-integration-progress.md). 12 exercices des rubriques
TSA7 (primitives et équations différentielles : TSA7-10 à 14, 20, 21) et TSA8 (intégration : TSA8-10,
20, 21, 22, 41) d'une autre plateforme, lus en entier dans leur code source (copie locale, sans les
anciennes versions), comparés aux énoncés et aux plages de nos variations publiées en prod (MCP en
lecture seule). Les ids sont ceux de la plateforme.

**Leur forme** : 9 exercices se cochent (QCM ou vrai / faux : TSA7-10 à 14, 20, TSA8-10), 4 se
saisissent (TSA7-21, TSA8-20, 21, 22, 41).

## Nos modèles (prod, publiés, Tle spé)

65 modèles publiés touchent la rubrique, aucun brouillon, aucun réservé par une autre session
(2026-11-25). Ceux qui comptent pour le relevé :

| Id court | Titre                                                          | Var. | Point    |
| -------- | -------------------------------------------------------------- | ---- | -------- |
| 4329e837 | F est-elle une primitive de f ?                                | 3    | TSPE-462 |
| 3dbc5a7b | Deux primitives d'une même fonction diffèrent d'une constante  | 3    | TSPE-602 |
| 9f47bf89 | Primitive de x ↦ xⁿ                                            | 3    |          |
| fe25be0a | Primitive d'un polynôme vérifiant une condition                | 5    | TSPE-467 |
| d0930e8c | Primitive de 1/x, eˣ, 1/x² ou 1/√x vérifiant une condition     | 8    |          |
| 194a7c10 | Primitive de la forme u′/u                                     | 2    |          |
| 2d480f3d | Primitive de la forme u′eᵘ                                     | 3    | TSPE-468 |
| e332140f | Coefficient d'une primitive de la forme (v′∘u)×u′              | 4    |          |
| b822359e | Résoudre l'équation y′ = f                                     | 2    |          |
| 968f4295 | Solution de y′ = ay vérifiant une condition initiale           | 6    |          |
| 2a1413ff | Solution de y′ = ay + b vérifiant une condition initiale       | 5    |          |
| e02fb162 | Solution de y′ = ay + f à partir d'une solution particulière   | 2    |          |
| 5e702745 | Fonction x ↦ ∫ₐˣ f(t) dt : sens de variation et valeur en a    | 2    | TSPE-476 |
| b52c53d8 | Calculer une intégrale à l'aide d'une primitive                | 5    | TSPE-487 |
| 74da1cd6 | Positivité et intégration des inégalités                       | 3    | TSPE-481 |
| e68152f7 | Linéarité de l'intégrale                                       | 3    |          |
| a32e6d38 | Intégrale d'une fonction de signe quelconque : aire algébrique | 3    |          |
| fc2ea212 | Intégration par parties                                        | 4    | TSPE-488 |
| 6035aa61 | Suite d'intégrales                                             | 4    | TSPE-491 |

Aussi : primitives de cos, sin, exp, 1/√x, 2uu′, coefficients de u′/u et u′eᵘ, existence de
primitives (31defbfe), équation logistique, Euler, rectangles, trapèzes, Monte-Carlo, valeur moyenne,
Chasles, encadrement, démonstrations du cours. Aucune intégrale de cos ou de sin, aucune primitive de
e^(ax+b) avec une condition, aucune primitive à coefficients fractionnaires.

## Relevé

| Id      | Ce qu'on demande                                                                                                                                                       | Forme chez eux | Nos modèles                                         | Verdict                                                                                         |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| TSA7-10 | 20 affirmations fixes : f ≥ 0 ⇔ F croissante, f croissante ⇔ F convexe, deux primitives diffèrent d'une constante, formules u′/u, u′u, 1/u², e^(−x²) a des primitives… | vrai / faux    | 3dbc5a7b, 9f47bf89, 31defbfe, 4329e837              | 🟡 manque le lien entre f et F (signe de f → variations de F, variations de f → convexité de F) |
| TSA7-11 | Primitive de c/(x + a)², c et d de −5 à 5 : la bonne réponse s'écrit (dx + da − c)/(x + a), pas −c/(x + a)                                                             | QCM 4 choix    | e332140f v4 (k/(ax + b)), 3dbc5a7b                  | 🟡 manque une primitive écrite sous une autre forme, qui diffère de −c/(x + a) d'une constante  |
| TSA7-12 | Primitive de c/(x + a) sur ]−a ; +∞[ → c ln(x + a) + C                                                                                                                 | QCM 4 choix    | 194a7c10 (h·a/(ax + b)), d0930e8c v1, v5            | ✅                                                                                              |
| TSA7-13 | Primitive de e^(ax + b) telle que F(0) = c ; a de ±2 à ±5, b de −5 à 5                                                                                                 | QCM 5 choix    | 2d480f3d v2 (e^(ax), sans b), f01270c2 v1           | 🟡 manque e^(ax + b) avec une condition : la constante vaut c − e^b/a                           |
| TSA7-14 | Primitive de ax² + bx + c, b impair : coefficients a/3 et b/2                                                                                                          | QCM 5 choix    | fe25be0a v1, v2, v4 (f = 3ax² + 2bx + c)            | 🟡 nos coefficients sont toujours entiers ; manquent les fractions                              |
| TSA7-20 | Solution de y′ = ax² + bx (a/3 et b/2 fractionnaires)                                                                                                                  | QCM 5 choix    | b822359e v1, efb12f4b v3                            | ✅ par b822359e ; les fractions viennent avec la fiche de TSA7-14                               |
| TSA7-21 | y′ = ay, y′ + ay = 0, y′ = ay + b, y′ + ay = b avec y(0) ; y′ + ay = cx + d avec une solution particulière donnée ; a, b de −10 à 10                                   | saisie         | 968f4295, 2a1413ff (v3 : b/a demi-entier), e02fb162 | ✅                                                                                              |
| TSA8-10 | 16 affirmations : orientation, réciproque de la positivité fausse, aire = intégrale seulement si f ≥ 0, ∫(f + M) ≠ ∫f + M, ∫ de cos et sin sur [−π ; π], [0 ; π/2]…    | vrai / faux    | 74da1cd6, e68152f7 v3, a32e6d38, 3b396d9c, 76843d15 | 🟡 manquent la réciproque fausse de la positivité et toute intégrale de cos ou de sin           |
| TSA8-20 | ∫ₐᵇ (cx + d) dx, a de −5 à 5, b de a + 1 à a + 5                                                                                                                       | saisie         | b52c53d8 v1                                         | ✅                                                                                              |
| TSA8-21 | ∫ du polynôme 3ax² + 2bx + c entre −2 ou −1 et une borne proche                                                                                                        | saisie         | b52c53d8 v1 (affine), v5 (4x(x² + m))               | 🟡 manque le polynôme du second degré                                                           |
| TSA8-22 | ∫ₐᵇ c/(cx + d) dx avec cx + d > 0 sur [a ; b] → ln((cb + d)/(ca + d))                                                                                                  | saisie         | b52c53d8 v3 (a/x), v4 (2x/(x² + m))                 | 🟡 manque u′/u avec u affine, résultat ln d'un quotient                                         |
| TSA8-41 | Intégration par parties : (ax + b)e^(kx) sur [0 ; 1], (ax + b)cos(kx) ou sin(kx) sur [0 ; π/(2k)], (ax + b)ln x sur [1 ; e] ; a, b de −5 à 5                           | saisie         | fc2ea212 (xeˣ, ln x, x ln x, xe^(−x))               | 🟡 manquent le facteur affine, e^(kx), le cosinus et le sinus                                   |

Idée en attente reprise : suites d'intégrales Iₙ (TSA1-48, réservée par `idees-tle-suites` pour cette
rubrique) : Iₙ = ∫₁ᵉ (ln x)ⁿ dx, sens de variation et relation Iₙ₊₁ = e − (n + 1)Iₙ. 6035aa61 a déjà la
relation (avec xⁿeˣ) ; manque le sens de variation avec (ln x)ⁿ.

## Décompte

✅ 4 · 🟡 8 · ❌ 0. Les 8 manques donnent 10 fiches (F1 à F10, voir
[idees-tle-integration-fiches.md](idees-tle-integration-fiches.md)).

## Ce que leur format fait et pas le nôtre

Rien. Leurs vrai / faux deviennent des lectures de courbe ou des QCM justifiés ; leurs QCM
de primitives deviennent des saisies jugées par équivalence.
