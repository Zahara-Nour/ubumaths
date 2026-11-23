# Relevé « suites numériques » de Terminale spécialité (2026-11-22)

Chantier [`idees-tle-suites`](idees-tle-suites-progress.md). 26 exercices de la rubrique TSA1 d'une
autre plateforme, lus dans leur code source (copie locale, sans les `_old`), comparés à nos modèles
publiés en prod (MCP en lecture seule, variations lues). Relevé par deux agents, verdicts « à
vérifier » relus dans nos variations en base. Les ids sont ceux de la plateforme.

**Leur forme** : 17 exercices sur 26 sont des sujets rédigés « type bac » (démonstration, sans
saisie : correction affichée seulement). Chez nous, on en reprend les **étapes questionnables**
(une valeur, une expression, une rédaction à choisir), jamais la rédaction libre.

## Nos modèles (prod, publiés)

| Id court                                             | Titre                                                                                                  | Var.      | Point               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------- | ------------------- |
| c0f49b76 / edb636bf / ddaa7529                       | Définitions de la limite (+∞, −∞, ℓ) : un rang à partir duquel…                                        | 1 chacun  | TSPE-378 à 380      |
| 747d627a                                             | Théorèmes de comparaison pour les suites                                                               | 3         | TSPE-381            |
| 07bce646                                             | Opérations sur les limites                                                                             | 42        | TSPE-382            |
| 708f8a08                                             | Limite d'une somme de termes d'une suite géométrique (0 < q < 1 seulement)                             | 4         | TSPE-383            |
| 1ebd1c86                                             | Limite de a × qⁿ + b, raison positive                                                                  | 4         | TSPE-383            |
| ea9d2de8                                             | Limite de qⁿ pour une raison négative (dont (−1)ⁿ, (−q)ⁿ : pas de limite)                              | 4         | TSPE-383            |
| b59fe450                                             | Suite majorée, minorée ou bornée                                                                       | 5         | TSPE-384            |
| 7063979e                                             | Limite infinie par comparaison (dont n + a(−1)ⁿ)                                                       | 5         | TSPE-385            |
| 2bf6edc7                                             | Suite monotone et bornée : que peut-on conclure ?                                                      | 5         | TSPE-385            |
| 618d795c                                             | Raisonnement par récurrence : hypothèse, hérédité, initialisation                                      | 4         | TSPE-304            |
| d1aee0b9                                             | Récurrence sur une suite définie par une fonction croissante (dont hérédité d'une forme explicite an²) | 3         | TSPE-386            |
| 651907b3                                             | Évolution en pourcentage avec apport constant                                                          | 3         | TSPE-387            |
| f1963ef2                                             | Seuil par logarithme                                                                                   | 3         | TSPE-392            |
| 667a3618 / 57063ada                                  | uₙ₊₁ = f(uₙ) : escalier, limite par f(ℓ) = ℓ                                                           | 4 / 4     | TSPE-432            |
| 3d7d1d25                                             | Limites usuelles d'une suite (nᵖ, 1/nᵖ, √n, eⁿ)                                                        | 4         | TSPE-402            |
| 0fb97bb9 / 94e4d691 / 98ba277c / c611f92b / f6415cb9 | Croissances comparées, opérations sans FI, gendarmes (avec (−1)ⁿ), lever une FI, FI                    | 4/5/4/5/3 | TSPE-576 à 579, 401 |
| 9f14d672                                             | Arithmético-géométrique : uₙ en fonction de n (raison a = k/10 ou 1/2)                                 | 3         | TCOMP-214           |
| 81ff485d                                             | Arithmético-géométrique : solution constante et limite                                                 | 5         | TCOMP-208           |
| bcc687bb / 19961e67 / 0b686e01                       | Python de seuil (qⁿ, condition du `while` comprise), suite géométrique avec tableau                    | 3/3/7     | 2-283, 1SPE-237     |

Autres : 1b7b322a, 9ca26a84, 0a9babf6, 2a86b496 (démonstrations), 5dea92fa (adjacentes), 261a1341
(ordre 2), f64ab8f3 (Newton), b7fd4743 (valeurs approchées en Python).

## Relevé

| Id      | Ce qu'on demande                                                                                                                | Forme chez eux                  | Nos modèles                                        | Verdict                                                                                            |
| ------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| TSA1-10 | Récurrence : encadrement ou monotonie de uₙ₊₁ = f(uₙ) (a + 1/uₙ ; au + b croissante ou décroissante, uₙ ⩽ uₙ₊₁ ⩽ ℓ ; √(au + b)) | rédigée                         | d1aee0b9 (f croissante, √(u + c)), 618d795c        | 🟡 manque le double encadrement uₙ ⩽ uₙ₊₁ ⩽ ℓ (affine)                                             |
| TSA1-11 | uₙ₊₁ = f(uₙ), f trinôme : variations de f, 1 ⩽ uₙ ⩽ 3, décroissance                                                             | rédigée                         | d1aee0b9                                           | ✅ même savoir-faire (f croissante sur l'intervalle)                                               |
| TSA1-12 | Récurrence : forme explicite 1/(bn + a) de uₙ₊₁ = uₙ/(buₙ + 1)                                                                  | rédigée                         | d1aee0b9 v3 (forme an² seulement)                  | 🟡 manque la forme explicite d'une suite homographique                                             |
| TSA1-13 | Récurrence : forme explicite n/(kn + 1) d'une suite homographique                                                               | rédigée                         | idem                                               | 🟡 idem (calcul plus lourd)                                                                        |
| TSA1-14 | Récurrence : forme explicite α + c·rⁿ d'une suite arithmético-géométrique                                                       | rédigée                         | 9f14d672 (trouver la forme, pas la prouver)        | 🟡 manque l'hérédité de la forme donnée                                                            |
| TSA1-20 | Limites de référence k·nᵖ, k/nᵖ, qⁿ, (−1)ⁿ, cos n, sin n (« n'existe pas »)                                                     | saisie, clavier de limites      | 3d7d1d25, ea9d2de8                                 | 🟡 manquent cos n et sin n (pas de limite)                                                         |
| TSA1-21 | Opérations sur les limites (14 cas, FI comprises)                                                                               | QCM                             | 07bce646 (42 var.), f6415cb9                       | ✅                                                                                                 |
| TSA1-22 | Limite de sommes et quotients simples                                                                                           | saisie                          | 94e4d691                                           | ✅                                                                                                 |
| TSA1-23 | Limite d'un produit simple                                                                                                      | saisie                          | 94e4d691, 07bce646                                 | ✅                                                                                                 |
| TSA1-24 | Lever une FI : polynôme, quotient de polynômes                                                                                  | saisie                          | c611f92b                                           | ✅                                                                                                 |
| TSA1-25 | Comparaison (n² + …, racine) ou gendarmes (a cos n, a sin n, a(−1)ⁿ sur n)                                                      | saisie                          | 7063979e, 98ba277c (seulement (−1)ⁿ)               | 🟡 manquent cos n et sin n dans les gendarmes                                                      |
| TSA1-26 | Limite d'une suite géométrique u₀qⁿ (5 types de raison)                                                                         | QCM                             | 1ebd1c86, ea9d2de8                                 | ✅                                                                                                 |
| TSA1-27 | Limite de 1 + q + … + qⁿ (q ∈ ]−1 ; 1[, q ⩾ 2, q = −1, q ⩽ −2)                                                                  | QCM                             | 708f8a08 (0 < q < 1)                               | 🟡 manquent q ⩾ 2, q = −1, q ⩽ −2                                                                  |
| TSA1-30 | Limite de qⁿ, a·qⁿ, a + b·qⁿ (10 sous-types)                                                                                    | QCM                             | 1ebd1c86, ea9d2de8                                 | ✅                                                                                                 |
| TSA1-32 | Population, arithmético-géométrique : modéliser, suite auxiliaire, uₙ, rang 12, limite et interprétation                        | rédigée                         | 651907b3, 9f14d672, 81ff485d                       | 🟡 manque la limite **en contexte** (interprétée)                                                  |
| TSA1-33 | Construire u₁ à u₄ sur le graphique (escalier ou spirale), conjecturer la limite                                                | figure à construire (non notée) | 667a3618 (escalier tout tracé, f croissante)       | 🟡 manque la pente négative (spirale) ; la construction active = **outil manquant**                |
| TSA1-34 | uₙ en fonction de n, uₙ₊₁ = auₙ + b avec a ∈ {2 ; 3 ; 4 ; 5 ; −2 ; −3}                                                          | saisie                          | 9f14d672 (a = k/10 ou 1/2)                         | 🟡 manque \|a\| > 1 et a < 0                                                                       |
| TSA1-35 | Écrire en Python une fonction seuil (tests cachés), puis le rang                                                                | éditeur Python exécuté          | 19961e67, bcc687bb (lire, compléter)               | ❌ écriture libre : nos exercices Python sont hors modèles de questions → **outil manquant**       |
| TSA1-40 | Arithmético-géométrique : minoration par récurrence, décroissance par uₙ₊₁ − uₙ, convergence                                    | rédigée                         | d1aee0b9, 2bf6edc7                                 | 🟡 manque le signe de uₙ₊₁ − uₙ = (a − 1)(uₙ − ℓ)                                                  |
| TSA1-42 | Médicament : arithmético-géométrique, seuil par logarithme ; B : moyenne Sₙ/n, fonction Python « mystère »                      | rédigée                         | 651907b3, f1963ef2, 19961e67                       | 🟡 manque la moyenne Sₙ/n (rare)                                                                   |
| TSA1-43 | Compléter la condition du `while` pour une suite uₙ₊₁ = auₙ + b                                                                 | QCM                             | bcc687bb v2 (qⁿ seulement)                         | 🟡 manque la boucle sur une suite récurrente                                                       |
| TSA1-44 | Suite homographique (sujet du bac) : variations de f, 0 ⩽ uₙ ⩽ uₙ₊₁ ⩽ 1, limite, forme explicite pn/(pn + 1)                    | rédigée                         | d1aee0b9, 57063ada                                 | 🟡 même manque que TSA1-12                                                                         |
| TSA1-45 | Perte en % et apport : récurrence uₙ ⩽ uₙ₊₁ ⩽ ℓ, suite auxiliaire, seuil à la calculatrice                                      | rédigée                         | 651907b3, 9f14d672, 0b686e01                       | 🟡 même manque que TSA1-10                                                                         |
| TSA1-46 | Arithmético-géométrique décroissante : uₙ > uₙ₊₁ > ℓ, seuil descendant                                                          | rédigée                         | idem                                               | 🟡 idem, sens décroissant                                                                          |
| TSA1-47 | Espèce menacée : limite, puis juger « elle ne s'éteint pas mais perd plus de la moitié »                                        | rédigée                         | 651907b3, 81ff485d                                 | 🟡 même manque que TSA1-32                                                                         |
| TSA1-48 | 36 affirmations vrai / faux à justifier (contre-exemples, gendarmes, croissances comparées, Python…)                            | texte libre                     | 7063979e, 2bf6edc7, b59fe450… (techniques isolées) | 🟡 manquent les contre-exemples de cours (bornée non convergente, croissante ne tend pas vers +∞…) |

## Décompte

26 relevés : ✅ 8 · 🟡 17 · ❌ 1.

## Manques

- Double encadrement par récurrence uₙ ⩽ uₙ₊₁ ⩽ ℓ (ou ℓ < uₙ₊₁ < uₙ) pour une suite arithmético-géométrique (TSA1-10, 45, 46).
- Hérédité d'une forme explicite donnée : arithmético-géométrique α + c·rⁿ, homographique 1/(bn + a) (TSA1-12, 13, 14, 44).
- Pas de limite pour cos n, sin n ; gendarmes avec cos n et sin n (TSA1-20, 25 ; TSA1-48 en partie).
- Somme 1 + q + … + qⁿ pour q ⩾ 2, q = −1, q ⩽ −2 (TSA1-27).
- uₙ explicite quand |a| > 1 ou a < 0 (TSA1-34).
- Sens de variation d'une suite arithmético-géométrique par uₙ₊₁ − uₙ = (a − 1)(uₙ − ℓ) (TSA1-40).
- Limite interprétée en contexte (TSA1-32, 47).
- Condition du `while` pour une suite récurrente (TSA1-43).
- Escalier en spirale (pente négative) (TSA1-33).
- Contre-exemples de cours en vrai / faux (TSA1-48).
- Rare, non repris : moyenne Sₙ/n (TSA1-42), étude d'une fonction homographique (TSA1-44, rubrique fonctions), suites avec ln (TSA1-48, rubrique logarithme).

## Ce que leur format fait et pas le nôtre

- **Construire l'escalier** des termes u₁ à u₄ sur la courbe de f et la droite y = x (TSA1-33). Nos
  gestes `placer:` / `tracer:` du bloc `courbe` ne posent pas un escalier.
- **Écrire un programme Python exécuté** et jugé par des tests (TSA1-35). Nos exercices Python
  existent, mais pas comme case d'un modèle de question.
