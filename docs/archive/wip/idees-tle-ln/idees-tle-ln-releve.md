# Relevé « fonction logarithme népérien » de Terminale spécialité (2026-11-24)

Chantier [`idees-tle-ln`](idees-tle-ln-progress.md). 12 exercices de la rubrique TSA5 d'une autre
plateforme (TSA5-10, 11, 20 à 23, 30 à 33, 40, 41), lus dans leur code source (copie locale, sans les
anciennes versions), comparés à nos modèles publiés en prod (MCP en lecture seule, énoncés des
variations lus). Six exercices (TSA5-10, 11, 20, 21, 22, 30) ne sont que la version ln d'exercices de
la rubrique technologique (TTE-6, 8, 5, 3, 7, 11). Relevé par deux agents (Sonnet), plages vérifiées
dans le code (TTE-6, TTE-8 lus en entier ; TTE-7, TTE-11, TSA5-23, TSA5-33 contrôlés) ; les verdicts
sont les miens, posés contre nos variations en base. Les ids sont ceux de la plateforme.

**Leur forme** : 9 exercices se saisissent (nombre, expression, intervalle, inégalité sur n, limite),
TSA5-32 et TSA5-40 se cochent (QCM, vrai / faux), TSA5-41 est un sujet rédigé sans saisie.

## Nos modèles (prod, publiés, Tle spé)

| Id court | Titre                                                         | Var. | Point    |
| -------- | ------------------------------------------------------------- | ---- | -------- |
| 1a57c0a4 | ln et exp, fonctions réciproques : calculer sans calculatrice | 5    | TSPE-438 |
| 7c8b341b | Propriétés algébriques du logarithme (QCM)                    | 3    | TSPE-439 |
| ffd5c051 | Propriétés algébriques du logarithme (saisie)                 | 5    | TSPE-444 |
| 9de80159 | Dérivée de la fonction logarithme (QCM)                       | 2    | TSPE-440 |
| 86c59a05 | Variations de ln : comparer, signe                            | 4    | TSPE-593 |
| a6b6db45 | Limite de b + a ln x en 0                                     | 1    | TSPE-441 |
| 2cef3442 | Croissances comparées : logarithme et puissances              | 2    | TSPE-443 |
| d3301f2d | Résoudre une équation avec ln                                 | 3    | TSPE-446 |
| 14036c68 | Résoudre une inéquation avec ln                               | 3    | TSPE-596 |
| 723779c8 | Dérivée d'une fonction avec ln                                | 4    | TSPE-414 |
| 50feeefd | Dérivée de eᵘ, ln u et u²                                     | 7    | TSPE-413 |
| 7f13ca89 | Intervalle de croissance d'une fonction avec ln               | 4    | TSPE-416 |
| f1963ef2 | Seuil : plus petit entier n tel que qⁿ dépasse une valeur     | 3    | TSPE-392 |
| 28ede1b8 | Problème : demi-vie, doublement (exp et ln)                   | 3    | TSPE-447 |

Aussi : 9ad36217 et 74b103a8 (courbes), 2d8d1efd et f68e6a98 (démonstrations), ec4fa70f
(prolongement de x ln x), e814175b v2 (ln(1 + x) ≤ x… par la concavité), 6248e597 v2 (branche infinie de
a ln x + b), 66f033c1 et f0a6ec4e (équation et inéquation avec exp). Aucun brouillon, aucun de ces
modèles réservé par une autre session (2026-11-24). Aucun modèle n'a d'ensemble de définition avec ln.

## Relevé

| Id               | Ce qu'on demande                                                                                                                                                | Forme chez eux               | Nos modèles                            | Verdict                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------- |
| TSA5-10 (TTE-6)  | Exprimer ln(aⁿbᵐ) ou ln(aⁿ/bᵐ) en fonction de ln a et ln b ; a, b ∈ {2, 3, 5}, n, m de 2 à 5 ; option : nombre non décomposé (ln 72)                            | saisie                       | ffd5c051 v1 (ln(2ᵖ3ᑫ), produit)        | 🟡 manquent le quotient (coefficient négatif) et la base 5                                          |
| TSA5-11 (TTE-8)  | a ln(xᵏ) + b ln(1/xʲ) + c ln(xᵐ) = ? ln x, x > 0 ; a, b, c de −5 à 5, exposants ±1 à ±3                                                                         | saisie du coefficient        | aucun (ffd5c051 : numérique)           | ❌ variation de ffd5c051                                                                            |
| TSA5-20 (TTE-5)  | Résoudre aˣ = b : solution entière (2ˣ = 8), rationnelle (4ˣ = 8) ou ln b / ln a (2ˣ = 9) ; couples d'une liste fixe                                            | saisie dans S = {…}          | d3301f2d (ln x = a…), 66f033c1 (eˣ)    | ❌ aˣ = b avec a ≠ e : variations de d3301f2d                                                       |
| TSA5-21 (TTE-3)  | Résoudre aˣ ≤ b (4 sens), intervalle ; le sens change si a < 1 ; mêmes couples                                                                                  | saisie d'un intervalle       | 14036c68 (ln x < a…), f0a6ec4e (eˣ)    | ❌ aˣ < b, et le piège a < 1 : variations de 14036c68                                               |
| TSA5-22 (TTE-7)  | ln(ax + b) = n ou ln(ax + b) = ln(cx + d) : domaine (intersection) puis ensemble des solutions, ∅ possible ; coefficients de −10 à 10                           | 2 champs (domaine, S)        | d3301f2d v2 (ln(ax + b) = c)           | 🟡 manque ln(u) = ln(v), avec une solution hors du domaine (S = ∅)                                  |
| TSA5-23          | Résoudre dans ℕ u₀qⁿ ⋚ s ; u₀ = ±110 à ±990, q de 0,30 à 0,98 ou de 1,02 à 1,95 ; réponse « n ≥ N » ou « n ≤ N »                                                | saisie d'une inégalité sur n | f1963ef2 (u₀ > 0)                      | 🟡 manque u₀ < 0 (le sens change en divisant par u₀)                                                |
| TSA5-30 (TTE-11) | Ensemble de définition de ln(ax + b), ln((ax + b)/(cx + d)), ln(trinôme) ; réponses intervalle, réunion, ℝ, ∅, ℝ ∖ {r}                                          | saisie d'un ensemble         | aucun                                  | ❌ nouveau modèle                                                                                   |
| TSA5-31          | Dériver ln(ax + b), ln(ax² + bx + c) (Δ > 0), ln(xⁿ) ; jugé sur des valeurs                                                                                     | saisie                       | 50feeefd v2, v3 (ln(x² + c))           | 🟡 manquent le trinôme complet et ln(xⁿ) = n ln x                                                   |
| TSA5-32          | QCM de bac : dérivée de ln(ax² + bx + c), leurres 1/u′, 1/u, ln(u′)                                                                                             | QCM 4 choix                  | 50feeefd (saisie)                      | ✅ par la saisie ; les leurres deviennent les erreurs prévues de F8                                 |
| TSA5-33          | Limites en 0⁺ ou +∞ : 9 cas sans forme indéterminée (ln x + axⁿ, axⁿ ln x en +∞, a ln x / xⁿ en 0⁺, axⁿ / ln x en 0⁺…), 6 par croissances comparées ; option eˣ | saisie (0, +∞, −∞)           | 2cef3442 (2 cas), a6b6db45             | 🟡 manquent les cas sans forme indéterminée, xⁿ / ln x en +∞, ln x − bxⁿ en +∞                      |
| TSA5-40          | 22 affirmations fixes à dire vraies ou fausses (domaine, règles fausses, réciprocité, limites, courbe)                                                          | vrai / faux                  | 7c8b341b, 86c59a05, 9de80159, ec4fa70f | 🟡 manquent les règles fausses classiques (ln(x²), (ln x)ⁿ, ln(1/x)) ; pas de vrai / faux au hasard |
| TSA5-41          | Étude de f(x) = ax + b + k ln x (a et k de signes contraires) : limites, f′, tableau de variations, convexité, f(x) = 0 a deux solutions (TVI)                  | rédigé                       | 7f13ca89, 723779c8 v1, 6248e597 v2     | 🟡 manque le tableau de variations complet avec un extremum en ln ; le TVI va à TSA4                |

Idées en attente reprises : uₙ₊₁ = ln(1 + uₙ) décroissante (TSA1-48, rubrique suites), limite de
ln(axⁿ + k) par composition (TSA2-35, rubrique limites).

## Décompte

✅ 1 · 🟡 7 · ❌ 4.

## Ce que leur format fait et que le nôtre ne sait pas faire

Rien pour cette rubrique : notre case « intervalles » (`answerKind: 'intervalles'`) juge déjà les
réunions, ∅, ℝ, ℝ ∖ {r} et les ensembles finis {…} (`src/lib/questions/intervals/interval-answer.ts`).
La saisie d'une inégalité sur n (TSA5-23) devient « le plus petit entier n », comme dans f1963ef2.
