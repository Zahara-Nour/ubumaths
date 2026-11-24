# Fiches de la phase 0 « logarithme népérien » de Terminale (2026-11-24)

Chantier [`idees-tle-ln`](idees-tle-ln-progress.md), relevé : [idees-tle-ln-releve.md](idees-tle-ln-releve.md).
Copie des fiches de la page à cocher https://claude.ai/artifact/7dV8FPpr8qsv2uthq67dGT. Validées par David le 2026-11-24 (« je suis tes recos » : toutes oui, Q1 TSPE-438, Q2 nouveau modèle, Q3 oui).

Toutes les variations ont leurs `testSpecs` (réponses justes sous plusieurs écritures, erreurs
typiques refusées), trois erreurs prévues par case et un coup de pouce qui ne donne pas la réponse.

## Modèles neufs

### F6 — Ensemble de définition d'une fonction avec ln

- **Recommandation** : nouveau modèle, 4 variations
- **Chez eux** : TSA5-30 : ensemble de définition de ln(ax + b), ln((ax + b)/(cx + d)), ln(trinôme), réponses intervalle, réunion, ℝ, ∅, ℝ ∖ {r}.
- **Chez nous** : case « intervalles » (réunions, ℝ, ℝ ∖ {r} jugés). Aucun modèle n'a d'ensemble de définition avec ln.
- **Modèle** : « Ensemble de définition d'une fonction avec ln »
- **Point** : TSPE-438 (ln réciproque de exp, défini sur ]0 ; +∞[), à trancher (Q1)
- **Variations** :
  - ln(ax + b), a de −9 à 9 non nul, b de −9 à 9 → ]−b/a ; +∞[ ou ]−∞ ; −b/a[
  - ln((x − p)(x − q)) développé, racines entières p < q de −6 à 6 → ]−∞ ; p[ ∪ ]q ; +∞[ ; avec −(x − p)(x − q) → ]p ; q[
  - ln((ax + b)/(cx + d)), a, c de 1 à 3 → réunion ou intervalle borné (tableau de signes)
  - ln((x − r)²) → ℝ ∖ {r} ; ln(x² + c), c > 0 → ℝ
- **Réponse** : ensemble en intervalles. Erreurs prévues : crochet fermé en −b/a, sens oublié quand a < 0, intervalle entre les racines au lieu de l'extérieur.

### F9 — Limite d'une fonction avec ln, sans forme indéterminée

- **Recommandation** : nouveau modèle, 5 variations
- **Chez eux** : TSA5-33, famille « opérations » (9 cas sans forme indéterminée) ; idée en attente TSA2-35 (ln(axⁿ + k) par composition).
- **Chez nous** : saisie d'une limite (0, +∞, −∞). a6b6db45 n'a qu'un cas (b + a ln x en 0) ; 2cef3442 ne fait que les croissances comparées. Le modèle apprend à voir qu'il n'y a **pas** de forme indéterminée.
- **Modèle** : « Limite d'une fonction avec ln, sans forme indéterminée » (ou variations de a6b6db45 en élargissant son titre, Q2)
- **Point** : TSPE-441 (limites de ln en 0 et en +∞)
- **Variations** :
  - ln x + a xⁿ en +∞, a de 1 à 5, n de 1 à 4 → +∞
  - ln x + a xⁿ en 0, a de −5 à 5 non nul → −∞
  - a xⁿ ln x en +∞, a de −5 à 5 non nul → ±∞ selon a
  - a ln x / xⁿ en 0 → −∞ si a > 0, +∞ si a < 0
  - ln(a xⁿ + k) en +∞ par composition, a de 1 à 5, k de −5 à 5 → +∞ ; en −∞ quand n est pair
- **Réponse** : limite. Erreurs prévues : 0 (croissance comparée appliquée à tort), signe de a oublié, « forme indéterminée ».

## Variations de modèles publiés

### F1 — ffd5c051 : ln d'un quotient en fonction de ln a et ln b

- **Chez eux** : TSA5-10 : ln(aⁿ/bᵐ), a, b ∈ {2, 3, 5}.
- **Chez nous** : même forme que v1 (« ? ln 2 + ? ln 5 »), le nombre donné en fraction : ln(8/25) = 3 ln 2 − 2 ln 5.
- **Variation** : couples (2, 3), (2, 5), (3, 5), exposants de 1 à 4 ; point TSPE-444
- **Erreurs prévues** : signe du second coefficient oublié, coefficients inversés, ln 8 − ln 25 laissé.

### F2 — ffd5c051 : exprimer en fonction de ln x

- **Chez eux** : TSA5-11 : a ln(xᵏ) + b ln(1/xʲ) + c ln(xᵐ) = ? ln x.
- **Chez nous** : une case « ? ln x », x > 0 ; trois termes, coefficients de −5 à 5 non nuls, exposants 2, 3, et 1/x, 1/x².
- **Erreurs prévues** : ln(1/x) compté +ln x, exposant oublié, coefficient multiplié au lieu d'additionné.

### F3 — d3301f2d : résoudre aˣ = b (deux variations)

- **Chez eux** : TSA5-20 : aˣ = b, solution entière, rationnelle ou ln b / ln a.
- **Chez nous** : saisie de x, valeur exacte.
  - a) a ∈ {2, 3, 5, 10}, b non puissance de a (de 3 à 50) → x = ln b / ln a
  - b) sans calculatrice : 4ˣ = 8, 9ˣ = 27, 8ˣ = 4, 25ˣ = 125… → fraction (3/2, 2/3)
- **Erreurs prévues** : ln(b/a), b/a, ln b − ln a.

### F4 — 14036c68 : résoudre aˣ < b (deux variations)

- **Chez eux** : TSA5-21 : aˣ ⋚ b, le sens change si a < 1.
- **Chez nous** : saisie d'un intervalle.
  - a) a ∈ {2, 3, 5}, b de 3 à 50 → ]−∞ ; ln b / ln a[ (ou ≥ → [ … ; +∞[)
  - b) a ∈ {0,2 ; 0,5 ; 0,8}, le piège : diviser par ln a < 0 change le sens
- **Erreurs prévues** : sens non changé (a < 1), crochet fermé / ouvert inversé, ln(b/a).

### F5 — d3301f2d : ln(ax + b) = ln(cx + d), solution parfois hors du domaine

- **Chez eux** : TSA5-22 : domaine puis ensemble des solutions, ∅ possible.
- **Chez nous** : une case « S = » jugée comme ensemble ({x₀} ou ∅). Tirages réglés pour qu'environ un sur trois donne ∅ (x₀ hors du domaine).
- **Variation** : a, c de 1 à 5 distincts, b, d de −9 à 9 ; point TSPE-446
- **Erreurs prévues** : {x₀} quand x₀ est hors du domaine, (b − d)/(a − c) au signe faux, ∅ sans raison.

### F7 — f1963ef2 : seuil avec un premier terme négatif

- **Chez eux** : TSA5-23 : u₀qⁿ ⋚ s, u₀ de ±110 à ±990, q de 1,02 à 1,95.
- **Chez nous** : « plus petit entier n tel que uₙ < s » avec uₙ = −u₀ × qⁿ (u₀ de 100 à 900, q de 1,05 à 1,95) : le sens change en divisant par un nombre négatif.
- **Erreurs prévues** : N − 1 (arrondi par défaut), le quotient non arrondi, sens non changé.

### F8 — 50feeefd : dériver ln(trinôme) et ln(xⁿ) (deux variations)

- **Chez eux** : TSA5-31 (ln(ax² + bx + c), ln(xⁿ)) et TSA5-32 (leurres 1/u′, 1/u, ln(u′)).
- **Chez nous** : saisie de f′(x).
  - a) ln(x² + bx + c) avec Δ < 0, défini sur ℝ, b de −6 à 6, c choisi
  - b) ln(xⁿ), n de 2 à 9 → n/x (ou n x^(n−1)/xⁿ, accepté)
- **Erreurs prévues** (TSA5-32) : 1/u, 1/u′, ln(u′).

### F10 — 2cef3442 : croissances comparées, deux cas de plus

- **Chez eux** : TSA5-33, famille « croissances comparées ».
- **Chez nous** : saisie d'une limite.
  - a) a xⁿ / ln x en +∞ (sur ]1 ; +∞[) → ±∞ selon a
  - b) ln x − b xⁿ en +∞, b de 1 à 6 → −∞ (factoriser par xⁿ)
- **Erreurs prévues** : 0, +∞ au lieu de −∞, « forme indéterminée ».

### F11 — 7c8b341b : règles fausses classiques (deux QCM)

- **Chez eux** : TSA5-40 : 22 affirmations vraies ou fausses.
- **Chez nous** : pas de vrai / faux au hasard ; un QCM « laquelle est vraie pour tout x > 0 », dont les leurres sont leurs affirmations fausses.
  - a) ln(x²) = 2 ln x ✓ ; (ln x)² = 2 ln x ; ln(x²) = (ln x)² ; ln(2x) = 2 ln x
  - b) ln(1/x) = −ln x ✓ ; 1/ln x ; ln(−x) ; −1/ln x
- **Point** : TSPE-439.

### F12 — 7f13ca89 : tableau de variations de ax + b + k ln x

- **Chez eux** : TSA5-41 (étude complète, f(x) = 2x − 1 − 6 ln x).
- **Chez nous** : tableau de variations à compléter : x₀ = −k/a entier, signes de f′, extremum exact (5 − 6 ln 3), limites en 0 et en +∞.
- **Variation** : a de 1 à 3 (et l'opposé), k = −a·x₀, x₀ de 2 à 4 ; point TSPE-416.
- **Erreurs prévues** : x₀ = k/a, extremum calculé sans ln, flèches inversées.

### F13 — e814175b : la suite vₙ₊₁ = ln(1 + vₙ) (idée en attente TSA1-48)

- **Recommandation** : variation, ou rien (au choix de David, Q3)
- **Chez nous** : QCM : « on sait que ln(1 + x) ≤ x pour x > −1 et vₙ > 0 ; que peut-on dire de (vₙ) ? » → décroissante.
- **Point** : TSPE-417.

## Rien

- TSA5-32 : absorbé par F8 (ses leurres deviennent les erreurs prévues).
- TSA5-33 et TSA5-41 avec l'exponentielle (eˣ / ln x, ln x − b eˣ) : rares, non repris.
- TSA5-40, affirmations sur les limites et la courbe : déjà couvertes (86c59a05, ec4fa70f, 74b103a8, 9de80159).
- TSA5-41, « f(x) = 0 a deux solutions » (TVI) : idée en attente pour la rubrique continuité (TSA4).

## Questions

- **Q1** : F6 (ensemble de définition) sur TSPE-438 (ln défini sur ]0 ; +∞[), ou sur TSPE-446 (résoudre une équation, dont le domaine est la première étape) ?
- **Q2** : F9 en nouveau modèle, ou en variations de a6b6db45 en élargissant son titre ?
- **Q3** : F13 (suite vₙ₊₁ = ln(1 + vₙ)) : variation de e814175b, ou rien ?
- **Question d'accès** de la migration de rangement : personne ne gagne d'accès (on range des modèles).

## Décompte

2 modèles neufs (9 variations) et 15 variations de 8 modèles publiés (ffd5c051 +2, d3301f2d +3,
14036c68 +2, f1963ef2 +1, 50feeefd +2, 2cef3442 +2, 7c8b341b +2, 7f13ca89 +1), plus F13 si oui (e814175b +1).
