# Relevé « probabilités » de Terminale spécialité (2026-11-24)

Chantier [`idees-tle-probas`](idees-tle-probas-progress.md). 11 exercices des rubriques TSP1 à TSP4 d'une
autre plateforme (TSP1-10, TSP1-11, TSP2-10 à 14, TSP3-01, TSP3-10, TSP4-10, TSP4-20), lus dans leur code
source (copie locale, sans les anciennes versions), comparés à nos modèles publiés en prod (MCP en
lecture seule, énoncés des variations lus). Les ids sont ceux de la plateforme.

**Leur forme** : 7 exercices se saisissent (nombres, fraction, arrondi au millième ou au centième,
expression en n, entier), TSP1-10, TSP1-11 et TSP3-10 se cochent (QCM de bac), TSP2-14 fait compléter une
fonction Python exécutée, TSP3-01 est un sujet rédigé sans saisie.

**Ce qui nous sépare** : nos modèles de loi binomiale ne demandent **jamais la calculatrice**. Ils
calculent à la main (a95a9c0d, n ⩽ 5) ou lisent une table de P(X ⩽ k) donnée (4943ca05, f0c8c1fc,
7a58b19e, 6c80b4ec). Leurs exercices binomiaux (TSP2-10, 12, 13) prennent n de 5 à 40 et une réponse
arrondie au millième, « à la calculatrice ». Le BO dit « calculer numériquement […] en s'aidant au besoin
d'un algorithme » (TSPE-510, 619, 620), et nous avons déjà des réponses arrondies à la calculatrice
ailleurs (Al-Kashi, 721324f9). C'est la question Q1 de la phase 0.

## Nos modèles (prod, publiés, Tle spé)

| Id court | Titre                                                          | Var. | Point    |
| -------- | -------------------------------------------------------------- | ---- | -------- |
| ea48f760 | Calculer avec des probabilités conditionnelles                 | 3    | TSPE-616 |
| ecf4d46b | Probabilités totales                                           | 2    | TSPE-617 |
| e82450c7 | Calculer en utilisant l'indépendance                           | 3    | TSPE-507 |
| 4ff9d049 | Loi binomiale : identifier les paramètres n et p               | 4    | TSPE-508 |
| 30b597c3 | Loi binomiale ou non : identifier la loi                       | 2    | TSPE-618 |
| 4ee9a359 | Seuil par la loi binomiale                                     | 3    | TSPE-509 |
| a95a9c0d | Loi binomiale : P(X = k), P(X = 0), P(X ⩾ 1) à la main (n ⩽ 5) | 4    | TSPE-510 |
| 4943ca05 | Loi binomiale : P(X = k) avec une table                        | 1    | TSPE-510 |
| f0c8c1fc | Loi binomiale : P(X > k) avec une table                        | 1    | TSPE-619 |
| 7a58b19e | Loi binomiale : P(a ⩽ X ⩽ b) avec une table                    | 1    | TSPE-620 |
| 6c80b4ec | Loi binomiale : seuil et intervalle avec une table             | 2    | TSPE-511 |
| dbee4649 | Loi binomiale : espérance                                      | 2    | TSPE-522 |
| 7974722d | Espérance de aX + bY : linéarité                               | 1    | TSPE-526 |
| 7a8a67fa | Linéarité de l'espérance (QCM)                                 | 3    | TSPE-519 |
| 71cb8ab7 | Somme de variables aléatoires indépendantes : variance         | 4    | TSPE-527 |
| aced2e6c | Échantillon de taille n : variance et écart type de Sₙ et Mₙ   | 3    | TSPE-622 |
| 0943e867 | Inégalité de Bienaymé-Tchebychev                               | 4    | TSPE-530 |
| 95f73515 | Inégalité de concentration : majorant                          | 1    | TSPE-531 |
| 91db0034 | Inégalité de concentration : taille d'échantillon              | 2    | TSPE-533 |

Aussi, en 1re spé : eafd17a1 (gain algébrique moyen, mise comprise), 69a05f98 (probabilité « inverse »
sur un arbre), 5ba712bc (probabilités totales), a3f92832 (interpréter une espérance). Python : aa3cb8e7
(seuil d'une suite récurrente, condition de la boucle à choisir). Aucun brouillon, aucun de ces modèles
réservé par une autre session (2026-11-24).

## Relevé

| Id      | Ce qu'on demande                                                                                                                                                                                                           | Forme chez eux                              | Nos modèles                                         | Verdict                                                                                                      |
| ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| TSP1-10 | P(A ∩ G) = P(A) × P_A(G) ; P(A) ∈ {1/5, 2/5}, P_A(G) de 0,3 à 0,9 ; leurres P_A(G), P(A) × P(Ḡ sachant A), P(A) × P(G)                                                                                                     | QCM 4 choix (bac)                           | ea48f760 v1, v3                                     | ✅ par la saisie                                                                                             |
| TSP1-11 | P_B(G) quand on donne P(A), P_A(G) **et P(G)** : P(B ∩ G) = P(G) − P(A ∩ G), puis divisé par P(B) ; leurres P(B ∩ G), P(A ∩ G)/P(B), P(B ∩ G)/P(G)                                                                         | QCM 4 choix (bac)                           | ecf4d46b (P(D) dans le sens direct), 69a05f98 (1re) | ❌ la formule des probabilités totales lue « à l'envers » : variation de ecf4d46b (F1)                       |
| TSP2-10 | X ~ B(n ; p), n de 5 à 20, p de 0,05 à 0,95 : P(X = k), P(X < n) = 1 − pⁿ, P(X ⩾ 1) = 1 − (1 − p)ⁿ, E(X) ; arrondi au millième                                                                                             | saisie, 1 à 4 cases                         | a95a9c0d (n ⩽ 5, exact), 4943ca05 (table), dbee4649 | 🟡 manque le calcul à la calculatrice pour n grand : nouveau modèle (F2), selon Q1                           |
| TSP2-11 | Urne avec remise : n, p (fraction), P(X = 0), P(X > 0), P(X = k), E(X) ; arrondi au centième                                                                                                                               | saisie, 4 à 6 cases                         | 4ff9d049 v2, dbee4649, a95a9c0d                     | ✅ (paramètres, espérance) ; P(X = k) arrondi : avec F2                                                      |
| TSP2-12 | Situation (tirs, graines, QCM, clients, ampoules) : justifier la loi binomiale, n et p, puis P(X = k), P(X < n), P(X ⩾ 1), E(X), interprétés                                                                               | saisie + justification rédigée              | 4ff9d049 (4 contextes), 30b597c3, dbee4649 v2       | ✅ ; la justification rédigée ne se saisit pas, 30b597c3 la remplace par le choix de la loi                  |
| TSP2-13 | Même contextes, n de 20 à 40 : traduire « moins de k », « au moins k », « plus de k », « au plus k », « entre a et b » (inclus ou exclus) en P(X ⩽ …), calculer ; « en moyenne » = E(X)                                    | saisie, arrondi au millième                 | f0c8c1fc (X > k), 7a58b19e (a ⩽ X ⩽ b), table       | ❌ la traduction du vocabulaire, cœur de l'exercice : nouveau modèle avec une table (F3)                     |
| TSP2-14 | pₙ = P(au moins un succès en n épreuves) : a) exprimer pₙ = 1 − qⁿ ; b) compléter une fonction Python `while 1 - q**n < seuil` ; c) plus petit n tel que pₙ ⩾ s (calculatrice, ln ou Python)                               | saisie d'expression, éditeur Python, entier | 4ee9a359 v1, v2 (c), f1963ef2 (ln), aa3cb8e7        | 🟡 manquent a) et b) : deux variations de 4ee9a359 (F4)                                                      |
| TSP3-01 | Sujet de bac : arbre de deux questions Q₁, Q₂ notées 0 ou 1, P(A ∩ B), P(B), A et B indépendants ?, X = X₁ + X₂, E(X₁), E(X₂), E(X), interprétation                                                                        | rédigé, sans saisie                         | ecf4d46b, e82450c7, 7974722d, 7a8a67fa              | 🟡 l'idée neuve : la linéarité **sans** indépendance (X₁, X₂ liées par l'arbre) : variation de 7974722d (F5) |
| TSP3-10 | Jeu : mise de 2 à 8 €, dé, gain si 1, gain si pair ; espérance du gain algébrique, leurres −E, E ± 1, E + 2                                                                                                                | QCM 4 choix (bac)                           | eafd17a1 (1re spé, saisie)                          | ✅ en 1re spé ; rien à ajouter                                                                               |
| TSP4-10 | Bienaymé-Tchebychev : majorer P(X ∈ ]−∞ ; μ − a] ∪ [μ + a ; +∞[), minorer P(X ∈ ]μ − a ; μ + a[), majorer P(\|Z − 100μ\| ⩾ a) pour Z = X₁ + … + X₁₀₀, plus petit n pour Mₙ ; μ de −10 à 10, V de 0,1 à 0,8, a de 1,5 à 2,5 | saisie d'une fraction                       | 0943e867 v1 à v4, 91db0034                          | 🟡 manquent la réunion d'intervalles à traduire en \|X − μ\| ⩾ a et la somme Z : variations de 0943e867 (F6) |
| TSP4-20 | Inégalité de concentration : majorer P(Mₙ ∈ ]−∞ ; μ − a] ∪ [μ + a ; +∞[), minorer P(Mₙ ∈ ]μ − a ; μ + a[), plus petit n ; n de 100 à 1 000                                                                                 | saisie d'une fraction                       | 95f73515 v1 (majorant), 91db0034                    | 🟡 manquent le minorant et la réunion d'intervalles : variations de 95f73515 (F7)                            |

## Ce que leur format fait et pas le nôtre

- **Éditeur Python exécuté** (TSP2-14 b) : l'élève écrit le code, des tests cachés le jugent. Chez nous,
  on choisit la condition de la boucle (aa3cb8e7). Déjà dans `outils-manquants.md` (n° 49).
- Rien d'autre : leurs QCM deviennent des saisies, leurs justifications rédigées un choix de la loi.
