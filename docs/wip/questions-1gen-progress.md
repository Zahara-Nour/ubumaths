# Chantier « questions-1gen » — couvrir les maths de l'enseignement scientifique de 1re

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Niveau : `1_GEN`, « module spécifique » de mathématiques intégré à l'enseignement scientifique de 1re générale
> (BO n° 14 du 2026-04-02). Bornes : `docs/systeme/programmes/bornes/lycee/1gen.json` → `["1_GEN"].points`,
> lecture et décisions l1g-1, l1g-2 dans `1gen.md` et `questions-2de-1gen.json`.

## Reprendre ici

_Mis à jour le 2026-11-17, après la deuxième passe anti-doublons (§ 2.3)._

- **État** : relevé (§ 1), existant vérifié en deux passes sur tous les niveaux (§ 2.1 à 2.4) : une migration de
  tags couvrirait 17 points, 30 restent à écrire. Q1, Q2 répondues. Aucun code, aucune écriture en base.
- **Prochaine action** : réponses de David à Q2 bis à Q9 (§ 5, « Questions reposées »), puis question d'accès de la
  migration de tags.
- **En attente de David** : Q2 bis, Q3 à Q9.
- **Pièges en cours** : les suites géométriques de 1re spé tirent des termes négatifs → jamais taguables 1GEN ;
  chercher les doublons sur **tous** les niveaux, pas par mots-clés (§ 2.3).
- **Worktree / branche** : aucun (journal seul, sur `main`).

## 1. Relevé (prod, 2026-11-17)

- **64 points** `1_GEN` actifs ; **17** ont au moins un modèle, **47** aucun (corrigé : la première version disait
  22 / 42, erreur de compte).
- **31 modèles** `'1_GEN' = any(grades)`, tous publiés, tous rangés sur un nœud. Tous sont partagés avec la 1re spé
  et/ou la 1re techno (un point par programme, ADR 0020), sauf 7 qui ne portent aucun point 1GEN :
  9852d62c (5-113), 5397c20f (1SPE-432), 7f82d15a (2-349), f5585668 (2-314), 1c86d122 (5-135), 95ee57c8 (2-448),
  0f673c27 (2-328) — niveau `1_GEN` sans point du niveau (Q2).

Points couverts (nombre de modèles) : 062, 063, 064, 045, 008, 046, 012, 047, 013 (3), 014 (5), 015, 049, 050,
021, 022, 026 (2), 061.

## 2. L'existant contre les bornes

Vérifié le 2026-11-17 (lecture seule, prod) : plages des variables, énoncés et corrigés des 24 modèles tagués 1GEN et
de 28 modèles de 1re spé candidats à un tag 1GEN.

### 2.1 Modèles tagués 1GEN

- **OK** (23) : a8b51d16, 7247dbb0, 8ed02829, 337d31c3, 1315d326, c23840b6, 1b1a6d7b, 18e26873, 1c65d58e, d5780995,
  0af4bf32, a573d517, 8d4e5302, 7d6cf480, 36010981 et ebe7e788 (indépendance par le produit, admise par l1g-1),
  5cb7f6ce, eb9517ed, 0b686e01, 33dffa7a, 65e96f31, 373fc5b4, dc5d7cb6.
  - Remarque 1b1a6d7b / 18e26873 (026) : le corrigé conclut « du signe de a à l'extérieur des racines » sans
    tableau de signes des facteurs ; admissible.
- **Hors borne** : **1acb6d47** (022, « nature de l'extremum ») — var. 1 : corrigé « α = −b/(2a), β = f(α) »
  (formule du sommet, exclue) ; var. 3 : forme canonique (hors des trois formes du BO). Var. 2, 4, 5 conformes (Q3).

### 2.2 Modèles de 1re spé candidats

- **Taguables tels quels** : d1010214 (058, 038), f3100c29 (038, 056 ; corrigé par u₁² = u₀u₂, élémentaire),
  aeb1389d (056, 029), afe51ac4 (055, 027), 42bb2d66 (011, 046), f2ed0ea0 (010, 046), 70e682f9 (017),
  bd27e002 (018, 050, 016).
- **Avec réserve** : 21f42c7f (009 ; var. 1 pose la définition par le produit, celle du BO vient en second) ;
  2f4f4ae0, fe6f5606 (012 ; deux épreuves indépendantes mais pas identiques, donc pas 046).
- **À reprendre** : 4f8f420a (distracteurs a·(−2)ⁿ, raison négative) ; b535b8fd (var. 3 : dé, pièce, urne → pas
  046).
- **Hors borne** : toutes les suites géométriques « calculer / raison / terme général / reconnaître »
  (279cf28f, ab4d55f7, cf51cb93, 727fb88a, 85afd455, 349e1be5, e67b1cbd, eca755e6, 5042401b, fcf1057e, 84114cb2,
  cea65372 : raison ou premier terme tirés négatifs) ; 22141fa4 (eˣ) ; 8a7e39b7 (dérivée, forme développée) ;
  8cbfcf4b (discriminant, forme canonique).

### 2.3 Deuxième passe : tous les niveaux (anti-doublons, 2026-11-17)

La passe 2.2 avait choisi ses candidats par mots-clés dans les titres de 1re spé. Reprise sur **tous** les modèles
publiés (1re spé, 1re techno, 2de, 3e, 4e, Tle spé), 49 candidats lus en entier (plages, conditions, corrigés).

- **Taguables tels quels** : 103cf8d9 (048), 27d77564 (056, 029), 98c3f740 (017, 048), c90fa022 (017, 038),
  d2067413 (016, 031 ; brouillon), d8c9cb60 (010), 27ac630c (051 ; brouillon), a55ad3b4 (051).
- **À trancher** : aab8e41c (023) — construit P à partir des racines, sens réciproque du libellé.
- **Partiels** (une variation dans la borne, les autres non) : 82e6baff et 22332630 (009, var. 2), 7407f328 et
  602bd8d7 (024, var. 1), 56b1803f (053, var. 3), 7703e625 (018, var. 1), a430a698 (016, sauf var. 3), 6670b161
  (051, var. 2), 05edc72b, 41100a51, 89594aa7 (048, var. 1-2), b6753dff (038/056, var. 1-2).
- **Hors borne** : 9f00da01 et 56b1803f (α = −b/(2a)), 0113c53d (dérivée), f40e8a4a (eˣ), 303aeac2 (n jusqu'à 10),
  95c38330 et fc921674 (termes négatifs), 45da9678 (arithmético-géométrique).
- **Pas de point** : récurrences générales (0495289a, 1239554b, 79d69593, f36ce3ff, 158ecaa4) ; formes canoniques
  (45e47034, 64e53490, 2871990c) ; 5c092e43 (tableur : calcule des indicateurs, ne représente pas — 006 dit
  « représenter ») ; tableaux croisés de 2de eb0dcd85, 89e928a4, 23ceafb0, b6ab5599 (001 exige un **diagramme**) ;
  77d6fedc, 38fe4cd5, e82450c7, eb12ac14 (conditionnelles, épreuves non identiques) ; 36abc642, 8b59ca4b (taux
  global, pas de taux moyen) ; 7c0ee046 (algébrique).

### 2.4 Bilan après les deux passes

Une migration de tags (2.2 OK et réserves, 2.3 OK, les 3 de Q2) couvrirait **17 points** de plus : 002, 009 (réserve),
010, 011, 016, 017, 018, 027, 029, 031, 038, 048, 051, 055, 056, 058 ; 023 si aab8e41c est retenu.

**Restent sans aucun modèle : 30 points** — 001, 003, 004, 005, 006, 007, 019, 020, 024, 025, 028, 030, 032, 033, 034,
035, 036, 037, 039, 040, 041, 042, 043, 044, 052, 053, 054, 057, 059, 060.

## 3. Points sans modèle (47) — classement

Outils vérifiés au catalogue (`couvrir-un-niveau.md` § 3 bis, `ubumark.md`) : ` ```nuage ` (ajustement, point moyen,
prévoir), ` ```tableau-croise `, barres, circulaire, ` ```probtree ` (à compléter), ` ```variation ` (à compléter),
` ```courbe ` (lecture, `données:`, `placer:` de points, `tracer:` d'une **droite** seulement), ` ```associer ` avec
courbes, case choix (en prod). **Aucun geste ne trace une courbe non affine** (Q5).

| Thème                          | Points                                                                                                                                                         | Classe                                                           |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Statistiques à deux caractères | 001 (croisement, tableau croisé, barres, circulaire), 002 (nuage), 003, 004, 005, 007 (au jugé = `tracer:` sur `données:` ; Mayer et moindres carrés = calcul) | B                                                                |
| Tableur                        | 006                                                                                                                                                            | A (formule en texte, comme 3-032) — Q6                           |
| Probabilités                   | 009 (contenu indépendance), 010 (répétition)                                                                                                                   | A ; 011 (arbre n ⩽ 4) : B (`probtree` à compléter)               |
| Croissance linéaire            | 017, 048, 018                                                                                                                                                  | A                                                                |
|                                | 016, 019 (placer les termes), 020 (`tracer:`), 051 (lecture)                                                                                                   | B                                                                |
| Second degré                   | 023, 025, 052, 053 (axe par f(x) = c, sommet par symétrie)                                                                                                     | A                                                                |
|                                | 054 (tableau de variations), 055, 027 (tableau de signes), 024 (`associer` parabole ↔ expression)                                                              | B                                                                |
| Suites géométriques > 0        | 028, 029, 030, 039, 057                                                                                                                                        | A                                                                |
|                                | 031, 041 (placer les termes), 058 (lecture)                                                                                                                    | B                                                                |
| Fonctions aˣ, taux moyen       | 032, 033, 034, 036, 037, 040, 043                                                                                                                              | A                                                                |
|                                | 035 (associer, lecture)                                                                                                                                        | B                                                                |
| Phénomènes exponentiels        | 038, 056, 044 (seuil par le calcul, sans logarithme : essais successifs)                                                                                       | A                                                                |
|                                | 059, 060 (lecture, seuil sur la courbe)                                                                                                                        | B                                                                |
|                                | 042 (réaliser la courbe d'une exponentielle)                                                                                                                   | B (placer les points d'un tableau) ou C (tracer une courbe) — Q5 |

Aucun point en D.

## 4. Découpage proposé (révisé après § 2.3, à valider, Q7)

0. **Migration de tags** (Q2, Q3, Q4) : une PR, 17 points couverts sans écrire de modèle.
1. **Suites géométriques et représentations** : 028, 030, 039, 057, 019, 041, 020 (7).
2. **Fonctions aˣ et seuils exponentiels** : 032 à 036, 042, 059, 044, 060 (9).
3. **Taux moyen et ordres de grandeur** : 037, 040, 043 (3).
4. **Second degré** : 022 (remplace 1acb6d47), 024, 025, 052, 053, 054 (6).
5. **Statistiques à deux caractères** : 001, 003, 004, 005, 006, 007 (6).

Les variations « partielles » du § 2.3 servent de point de départ (texte repris dans un modèle 1GEN) plutôt que de
découper les modèles de 1re spé en prod (Q8).

## 5. Questions à David

- **Q1** — « Première spécifique » = `1_GEN` (module spécifique de l'enseignement scientifique) : confirmé ?
- **Q2** — 7 modèles portent le niveau `1_GEN` sans aucun point 1GEN (liste § 1) : retirer `1_GEN` de leurs niveaux,
  ou leur trouver un point (5397c20f → 062 ? 95ee57c8 → 060 ?) ?
- **Q3** — 1acb6d47 (var. 1 et 3 hors borne) : retirer son tag 1GEN-022 et écrire un modèle 1GEN propre
  (recommandé), ou scinder ses variations ?
- **Q4** — Taguer 1GEN les 8 modèles de 1re spé « tels quels » et les 3 « avec réserve » (§ 2.2) par une migration ?
  4f8f420a et b535b8fd : laissés à la 1re spé (recommandé) ou corrigés ?
- **Q5** — 042 « réaliser la courbe d'une exponentielle » : placer les points d'un tableau de valeurs dans un repère
  (outil existant, recommandé), ou un geste neuf « tracer une courbe » (chantier à part, servirait aussi aux
  paraboles) ?
- **Q6** — 006 (tableur) : formule écrite en texte, comparée après normalisation, comme 3-032 ?
- **Q7** — Ordre des lots du § 4 ?

### Réponses (David, 2026-11-17)

- **Q1** : oui, `1_GEN`.
- **Q2** : « on les vérifie et on leur trouve un point ». Vérification (prod, énoncés et corrigés lus) :

  | Modèle   | Contenu                                                           | Point 1GEN                                                                 | Verdict              |
  | -------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------- |
  | 5397c20f | tableau de signes lu sur une courbe (cubique, parabole)           | **062** (lecture graphique)                                                | dans la borne        |
  | f5585668 | équation réduite d'une droite lue sur le repère                   | **051** (exploiter la courbe d'une affine)                                 | dans la borne        |
  | 1c86d122 | nuage année × abonnés, axe qui ne part pas de 0, taux d'évolution | **002** (nuage de points)                                                  | dans la borne        |
  | 9852d62c | angle d'un secteur, **un seul** caractère                         | 001 parle de **croisement** de deux caractères                             | pas de point honnête |
  | 7f82d15a | tableau de variations lu sur une **cubique**                      | 054 = parabole seulement                                                   | pas de point         |
  | 95ee57c8 | f(x) < k sur une **cubique**                                      | 060 = seuil exponentiel seulement                                          | pas de point         |
  | 0f673c27 | tableau de signes de ax + b                                       | 027 = degré 2 factorisé ; le signe d'un affine n'est pas au programme 1GEN | pas de point         |

  Recommandation : taguer les 3 premiers ; retirer `1_GEN` des niveaux des 4 autres (ils restent en 2de / 5e / 1re
  spé) — en attente de David (Q2 bis).

### Questions reposées après la deuxième passe (2026-11-17)

- **Q2 bis** — retirer `1_GEN` de 9852d62c, 7f82d15a, 95ee57c8, 0f673c27 (recommandé).
- **Q3** — 1acb6d47 : retirer son tag 1GEN-022, modèle 1GEN propre au lot 4 (recommandé).
- **Q4** — une migration : tags 1GEN sur les OK des § 2.2 et 2.3, les 3 de Q2 ; réserves 21f42c7f (009) et aab8e41c
  (023, sens réciproque) incluses (recommandé) ; 4f8f420a, b535b8fd laissés à la 1re spé.
- **Q5** — 042 : placer les points d'un tableau de valeurs (recommandé).
- **Q6** — 006 : formule de tableur écrite en texte (ex. `=B2/B$10` pour une colonne de fréquences), comme 3-032
  (recommandé).
- **Q7** — ordre : migration, puis lots 1 à 5 du § 4 (recommandé).
- **Q8** — variations partielles : reprises dans des modèles 1GEN neufs (doublon partiel assumé, recommandé) ou
  modèles de 1re spé scindés en prod (instantané, ids nouveaux) ?
- **Q9** — 001 : les tableaux croisés de 2de écartés car 001 demande un diagramme (recommandé : un modèle neuf,
  diagramme en barres groupées ou circulaires à comparer).
