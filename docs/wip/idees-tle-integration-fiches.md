# Fiches de la phase 0 « primitives, équations différentielles, intégration » de Terminale (2026-11-25)

Chantier [`idees-tle-integration`](idees-tle-integration-progress.md), relevé :
[idees-tle-integration-releve.md](idees-tle-integration-releve.md). Copie des fiches de la page à cocher https://claude.ai/artifact/Tw3TtUfAWtsn6CPudQcxot. En attente de David.

Toutes les variations auront leurs `testSpecs` (réponses justes sous plusieurs écritures, erreurs
typiques refusées), trois erreurs prévues par case et un coup de pouce qui ne donne pas la réponse.
Toutes les plages restent dans les bornes de leur point (`docs/systeme/programmes/bornes/lycee/tspe.md`).

## Modèles neufs

### F1 — Lien entre une fonction et ses primitives (lecture de courbe)

- **Recommandation** : nouveau modèle, 2 variations
- **Chez eux** : TSA7-10, affirmations vrai / faux « f ≥ 0 ⇔ F croissante », « f croissante ⇔ F convexe ».
- **Chez nous** : on donne la courbe de f (bloc `courbe`), et l'élève saisit un intervalle (case
  « intervalles »). Il lit la courbe au lieu de cocher vrai ou faux. 5e702745 ne fait que le signe de
  l'intégrande d'une fonction intégrale, à partir de la formule.
- **Point** : TSPE-462 (notion de primitive), nœud « primitives : notion », niveau T_SPE
- **Variations** :
  - courbe d'un trinôme f(x) = k(x − p)(x − q), racines entières p < q de −4 à 4, k = ±1 → « plus grand intervalle où F est croissante » (extérieur ou intérieur des racines, selon k), sur [−5 ; 5]
  - courbe d'un trinôme de sommet entier (α de −3 à 3) → « plus grand intervalle où F est convexe » (là où f est croissante)
- **Réponse** : intervalle. Erreurs prévues : intervalle où f est croissante au lieu de f ≥ 0 (v1), intervalle où f ≥ 0 au lieu de f croissante (v2), intervalle complémentaire.
- **Question Q1** : lecture de courbe (recommandé) ou QCM sur les mêmes affirmations ?

### F7 — Intégrale de cos et de sin

- **Recommandation** : nouveau modèle, 3 variations
- **Chez eux** : TSA8-10, affirmations ∫ de cos sur [−π ; π], de sin sur [−π/2 ; π/2], de cos sur [0 ; π/2].
- **Chez nous** : saisie de la valeur exacte. Aucun modèle ne calcule l'intégrale de cos ou de sin.
  Modèle neuf et pas une variation de b52c53d8, parce que b52c53d8 sert aussi en maths
  complémentaires, où sin et cos ne sont pas au programme.
- **Point** : TSPE-487, nœud « par une primitive », niveau T_SPE
- **Variations** :
  - ∫ k cos x, k de ±1 à ±5, bornes tirées dans {0, π/6, π/2, π} → valeurs exactes (k/2, k, 0…)
  - ∫ k sin x, mêmes bornes → (k, 2k, k(1 − √3/2)…), bornes choisies pour des valeurs simples
  - ∫₀^(π/(2ω)) cos(ωx), ω de 2 à 4 → 1/ω
- **Réponse** : nombre exact. Erreurs prévues : signe de la primitive de sin (−cos oublié), ordre des bornes, facteur 1/ω oublié (ω à la place).
- **Question Q2** : modèle neuf (recommandé) ou variation de b52c53d8 malgré les maths complémentaires ?

## Variations de modèles publiés

### F2 — Une primitive écrite sous une autre forme (3dbc5a7b, +1)

- **Chez eux** : TSA7-11, QCM : la primitive de c/(x + a)² s'écrit (dx + da − c)/(x + a), qui diffère de −c/(x + a) d'une constante.
- **Chez nous** : saisie du réel k tel que F(x) = (dx + k)/(x + a) soit une primitive de f(x) = c/(x + a)². Réponse k = da − c.
- **Point** : celui de 3dbc5a7b (TSPE-602). Plages : a de ±1 à ±5, c de ±1 à ±5, d de ±2 à ±5.
- **Erreurs prévues** : k = −c (la primitive de cours recopiée), k = c, k = da + c.

### F3 — Primitive de e^(ax + b) vérifiant une condition (2d480f3d, +1)

- **Chez eux** : TSA7-13, QCM : primitive de e^(ax + b) telle que F(0) = c.
- **Chez nous** : saisie de F(x), jugée par équivalence. Réponse (1/a)e^(ax + b) + c − e^b/a.
- **Point** : celui de 2d480f3d (TSPE-468, aussi en maths complémentaires, où l'exponentielle est au programme). Plages : a de ±2 à ±4, b de ±1 à ±3, c de −5 à 5.
- **Erreurs prévues** : constante c oubliée en e^b (C = c), a à la place de 1/a, signe de e^b/a.

### F4 — Primitive d'un polynôme à coefficients fractionnaires (fe25be0a, +2)

- **Chez eux** : TSA7-14 (et TSA7-20) : primitive de ax² + bx + c avec b impair, coefficients a/3 et b/2.
- **Chez nous** : saisie de F(x). Nos variations prennent toujours f = 3ax² + 2bx + c : les coefficients de F sont entiers.
- **Variations** : « donne une primitive » et « la primitive telle que F(0) = y₀ », avec a de ±1 à ±5 non multiple de 3 et b impair de −7 à 7.
- **Point** : celui de fe25be0a (TSPE-467). **Erreurs prévues** : a à la place de a/3, b à la place de b/2, dérivée au lieu de primitive.

### F5 — Intégrale d'un polynôme du second degré (b52c53d8, +1)

- **Chez eux** : TSA8-21, ∫ de 3ax² + 2bx + c entre −2 ou −1 et une borne proche.
- **Chez nous** : saisie de la valeur exacte (entier).
- **Plages** : a, b, c de ±1 à ±4, borne inférieure −2 ou −1, borne supérieure de 1 à 2.
- **Point** : celui de b52c53d8 (TSPE-487). **Erreurs prévues** : F(a) − F(b), F(b) seul, signe de (−1)³.

### F6 — Intégrale de u′/u avec u affine (b52c53d8, +1)

- **Chez eux** : TSA8-22, ∫ₐᵇ c/(cx + d) dx, avec cx + d > 0 sur [a ; b], résultat ln((cb + d)/(ca + d)).
- **Chez nous** : saisie de la valeur exacte. ln p − ln q, ln(p/q) et la fraction simplifiée sont
  acceptés, par l'équivalence (même valeur).
- **Plages** : c de 1 à 4, d de −5 à 5, bornes entières telles que cx + d > 0 sur [a ; b] (le logarithme ne porte que sur des nombres positifs, décision lts-9).
- **Point** : celui de b52c53d8 (TSPE-487). **Erreurs prévues** : ln(ca + d) − ln(cb + d), facteur c oublié, ln(cb + d) seul.

### F8 — La réciproque de la positivité est fausse (74da1cd6, +1)

- **Chez eux** : TSA8-10, « si ∫ₐᵇ f ≤ 0, alors f ≤ 0 sur [a ; b] » (faux).
- **Chez nous** : QCM justifié, sans Oui / Non au hasard. Pour f(x) = x − p sur [0 ; 3p], ∫ > 0 :
  « f est positive sur [0 ; 3p] » / « f n'est pas positive sur [0 ; 3p], bien que son intégrale soit
  positive » / « l'intégrale devrait être négative » / « f est négative sur [0 ; 3p] ». p de 1 à 3.
- **Point** : celui de 74da1cd6 (TSPE-481).

### F9 — Intégration par parties avec un facteur affine (fc2ea212, +3)

- **Chez eux** : TSA8-41, (ax + b)e^(kx) sur [0 ; 1], (ax + b)cos(kx) ou sin(kx) sur [0 ; π/(2k)], (ax + b)ln x sur [1 ; e].
- **Chez nous** : saisie de la valeur exacte. fc2ea212 n'a que xeˣ, ln x, x ln x et xe^(−x).
- **Variations** :
  - ∫₀¹ (ax + b)e^(kx), a de ±1 à ±3, b de −3 à 3, k = ±1 ou ±2
  - ∫₀^(π/2) (ax + b)cos x, a de ±1 à ±3, b de −3 à 3 → (aπ/2 + b) − a
  - ∫₁ᵉ (ax + b)ln x, a pair de ±2 à ±4, b de −3 à 3 → a(e² + 1)/4 + b
- **Point** : celui de fc2ea212 (TSPE-488). **Erreurs prévues** : signe du crochet moins l'intégrale, terme ∫u v′ oublié, primitive de e^(kx) sans 1/k.

### F10 — Sens de variation de Iₙ = ∫₁ᵉ (ln x)ⁿ dx (6035aa61, +1)

- **Chez eux** : idée en attente TSA1-48 (rubrique suites), Iₙ = ∫₁ᵉ (ln x)ⁿ dx.
- **Chez nous** : QCM du sens de variation, comme 6035aa61 v2 : 0 ≤ ln x ≤ 1 sur [1 ; e], donc (ln x)ⁿ⁺¹ ≤ (ln x)ⁿ et la suite décroît.
- **Point** : celui de 6035aa61 (TSPE-491).

## Rien à faire

- TSA7-12 (primitive de c/(x + a)) : 194a7c10, d0930e8c.
- TSA7-20 (y′ = ax² + bx) : b822359e ; les coefficients fractionnaires viennent avec F4.
- TSA7-21 (y′ = ay + b avec condition) : 968f4295, 2a1413ff, e02fb162.
- TSA8-20 (intégrale d'une fonction affine) : b52c53d8 v1.

## Bilan si tout est oui

2 modèles neufs (F1, 2 variations ; F7, 3 variations) et 11 variations de 7 modèles publiés :
3dbc5a7b +1, 2d480f3d +1, fe25be0a +2, b52c53d8 +2, 74da1cd6 +1, fc2ea212 +3, 6035aa61 +1.
Aucun outil manquant. **Question d'accès** de la migration : personne ne lit rien de neuf, on range
des modèles.
