# Relevé « statistiques » de 3e (2026-11-26)

Chantier [`idees-3e-statistiques`](idees-3e-statistiques-progress.md). Les 3 exercices de la rubrique
« statistiques » de 3e de l'autre plateforme (3S12, 3S14-0, 3S14-1 ; 3S15 est un second code de 3S14-0),
lus dans leur code source (copie locale), comparés à nos modèles de statistiques de tous les niveaux en
prod (MCP en lecture seule, 2026-11-26). Aucun brouillon ni modèle sans point sur le sujet.

## Points et modèles

| Point | Énoncé (court)                               | Modèles en prod                                              |
| ----- | -------------------------------------------- | ------------------------------------------------------------ |
| 3-028 | Effectifs cumulés croissants                 | 6acde723 (3 variations)                                      |
| 3-029 | Quartiles d'une série à effectifs            | acaa7317 (3)                                                 |
| 3-030 | Construire une boîte à moustaches            | 9a9026fc (3)                                                 |
| 3-032 | Tableur : moyenne, médiane, étendue          | 5c092e43 (4, 4e + 3e)                                        |
| 3-056 | Médiane d'une série à effectifs ou en barres | 96992ea8 (3 : notes /10, buts en barres, âges)               |
| 3-062 | Lire une boîte à moustaches                  | 1bd7378d (5)                                                 |
| 4-039 | Moyenne pondérée, petits effectifs           | c2497d96 (4 : tableau, barres, brutes, coefficients)         |
| 4-040 | Médiane en données brutes                    | b2908d52 (3, dont effectif pair « une médiane »)             |
| 4-041 | Étendue                                      | 4604b429 (3 : températures avec négatifs, pointures, barres) |
| 4-042 | Valeur extrême, moyenne et médiane           | 410c104b (3)                                                 |
| 4-044 | Comparer deux séries                         | 3afa8d97 (3)                                                 |
| 5-080 | Moyenne simple                               | c73289f0, 087c7c9c                                           |
| 5-110 | Lire un diagramme en barres                  | eeba38c7 (2)                                                 |
| 5-134 | Calculer une fréquence                       | 21ebfb57 (3 : tableau avec total, fraction / décimal / %)    |

Bornes ([cycle4.md](../systeme/programmes/bornes/cycle4.md)) : moyenne simple en 5e ; moyenne pondérée
(petits effectifs), médiane en données brutes (effectif ≤ 30) et étendue en 4e ; médiane et quartiles
d'une série **à effectifs** (tableau ou barres, sans borne sur l'effectif) en 3e. Médiane d'effectif
pair : toute valeur entre les deux valeurs centrales, ou bien le modèle ne tire que des cas où la
médiane est unique (décision c4-3).

Constats sur nos modèles : 96992ea8 n'a que des effectifs de 1 à 9 par valeur (total ≤ 54) ; c2497d96
ne tire que des moyennes décimales exactes (`mod(100·somme, effectif) == 0`), jamais « arrondie au
dixième » ; 21ebfb57 donne toujours l'effectif total dans le tableau, et ne pose qu'une catégorie
seule.

## Exercices

| Id     | Ce qu'on demande                                                                                                                                                                                                                                                                                                                                                                                                                        | Forme de réponse                     | Nos modèles                                                                                               | Verdict                                                                                                                                                      |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 3S12   | Diagramme en barres des 5 à 7 espèces d'un parc (3 quadrupèdes, 2 à 4 oiseaux, effectifs 2 à 10 distincts) : a) effectif d'une espèce ; b) fréquence d'une espèce en %, arrondie à 0,1 % ; c) effectif des quadrupèdes (somme) ; d) fréquence des oiseaux en %, arrondie à 0,1 %                                                                                                                                                        | 4 cases numériques, `%` après b et d | eeba38c7 (lire une barre, 5e), 21ebfb57 (fréquence avec total donné, 5e)                                  | 🟡 a) et c) ✅ ; b) et d) : fréquence lue sur un diagramme (total à calculer), arrondie, et fréquence d'un regroupement → variations de 21ebfb57             |
| 3S14-0 | Étendue de 8 à 12 notes brutes (0 à 20), ou des températures d'un mois (28 à 31 valeurs)                                                                                                                                                                                                                                                                                                                                                | une case                             | 4604b429 (semaine de températures avec négatifs, pointures en tableau, barres)                            | ✅ ; le mois entier (30 valeurs) n'apporte rien et déborde sur téléphone                                                                                     |
| 3S14-1 | Moyenne arrondie au dixième, médiane, étendue d'une série parmi six : lancers d'un ou deux dés (4 à 10 faces, 49 à 2 000 lancers, tableau d'effectifs) ; notes brutes (7 à 12) ; températures d'un mois ; salaires d'une entreprise (5 catégories, 80 à 99 salariés, un dirigeant à plus de 8 000 €) ; pointures (tableau d'effectifs) ; notes avec effectifs. Médiane d'effectif pair : toute valeur entre les deux centrales acceptée | 1 à 3 cases                          | 96992ea8 (médiane à effectifs, petits effectifs), c2497d96 (moyenne exacte), b2908d52, 4604b429, 410c104b | 🟡 médiane à **grands effectifs** (lancers de dé, salaires) → variations de 96992ea8 ; moyenne **arrondie au dixième** → variation de c2497d96 ; le reste ✅ |

## Ce que leur format fait et pas le nôtre

- Rien de neuf. Leurs questions a) à d) sur une même figure deviennent chez nous une variation par
  question (ou plusieurs cases), le coup de pouce joue le rôle des étapes.
