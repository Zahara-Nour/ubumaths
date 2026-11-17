# Chantier « questions-1gen » — couvrir les maths de l'enseignement scientifique de 1re

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Niveau : `1_GEN`, « module spécifique » de mathématiques intégré à l'enseignement scientifique de 1re générale
> (BO n° 14 du 2026-04-02). Bornes : `docs/systeme/programmes/bornes/lycee/1gen.json` → `["1_GEN"].points`,
> lecture et décisions l1g-1, l1g-2 dans `1gen.md` et `questions-2de-1gen.json`.

## Reprendre ici

_Mis à jour le 2026-11-17, après #2750 et la création des brouillons en prod._

- **État** : lot 1 mergé (#2750) ; 5 brouillons créés en prod par David (§ 11), ids commités (1487a0f73), `grades`
  `['1_GEN']`, sans nœud ni tag (vérifié). questions-1techno a reçu les ids de G1, G4, G5 (lecture non confirmée).
- **Prochaine action** : écrire la migration nœud + tags (`pnpm migration:horodatage`, gabarit `20261026210000`,
  tableau du § 11) et son test d'intégration (vérifié rouge sans la migration) ; `security-auditor` ; PR ; au merge,
  `db:migrate` depuis le dépôt principal à jour, **puis prévenir questions-1techno** (il attend notre nœud, § 11) ; puis page à cocher, publication. En parallèle : phase 0 des lots 3
  et 4 pour questions-ttechno.
- **En attente de David** : rien (question d'accès tranchée : personne, § 11).
- **Pièges en cours** : AVANT tout tag, ADR 0020 et `couvrir-un-niveau.md` § 9 (un point par programme, point sur le
  nœud du modèle ou sa notion) ; `grades` par `array_append` / `array_remove` ciblés ; `db:migrate` seulement après
  le merge, depuis le dépôt principal à jour ; G1, G4, G5 communs avec 1TECHNO (on écrit `1_GEN` seul,
  questions-1techno ajoute `1_TECHNO` et ses tags) ; modèle 1GEN-022 commun avec 1TECHNO-057.
- **Worktree / branche** : `../ubumaths-wt-questions-1gen` · `feat/questions-1gen-lot1-tags` (ids + migration).

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

## 4. Découpage (redécoupé le 2026-11-17 après #2744, à valider : Q10)

Relevé prod du 2026-11-17 (après #2744) : **39 points 1GEN sans modèle**, les 38 du § 7 plus **022**, dont le seul
modèle (1acb6d47) a perdu son tag. Six lots, un thème chacun, groupés par nœud et par outil :

1. **Suites géométriques à termes positifs** (A) : 028, 029, 030, 039, 057 (5). Mêmes nœuds que 1TECHNO-036, 038,
   040, 049 (Q11).
2. **Représentations graphiques : suites et affines** (B, ` ```courbe ` `placer:` / `tracer:` / lecture) : 016, 019,
   041, 058 (sous-notion « représentation graphique » des suites), 020, 051 (« expression et droite ») (6). Même
   nœud que 1TECHNO-044, 117, 119, 121.
3. **Fonctions aˣ** (A + B) : 032, 033, 034, 035, 036, 042, 059 (7). Partagé avec questions-ttechno (§ 6).
4. **Taux moyen, phénomènes exponentiels, seuils** (A + B) : 037, 040, 043, 038, 056, 044, 060 (7). 037, 040
   partagés avec questions-ttechno.
5. **Second degré** (A + B) : 022 (modèle commun avec 1TECHNO-057), 024, 025, 027, 052, 053, 054 (7).
6. **Statistiques à deux caractères** (B, plus A pour 006) : 001, 002, 003, 004, 005, 006, 007 (7).

Ancien découpage (5 lots, avant le § 7) : lot 1 mêlait suites géométriques et représentations ; lots 2 et 3
séparaient aˣ et taux moyen ; 016, 027, 029, 038, 051, 056, 058 et 002 n'y étaient pas.

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

**Tranchées par David le 2026-11-17 : « je suis tes recos pour Q2 bis à Q9 »** — chaque recommandation ci-dessous
est donc une décision.

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

## 6. Coordination avec les autres chantiers (2026-11-17)

- **Règle commune des `grades`** (acceptée par les deux sessions) : chaque chantier n'ajoute ou ne retire que **son**
  niveau (`array_append` / `array_remove` ciblés, garde « absent / présent »), jamais une affectation complète.
- ⚠️ **Un seul point par programme et par modèle** : le trigger `question_template_points_check_rules` refuse un
  2e point 1GEN sur un modèle (ADR 0020). Les doubles points du § 2.2 / 2.3 se réduisent à un seul : 42bb2d66 → 011,
  f2ed0ea0 et d8c9cb60 → 010, afe51ac4 → 055, bd27e002 → 018, d2067413 → 031, d1010214 → 058, f3100c29 → 038,
  c90fa022 et 70e682f9 → 017, 98c3f740 et 103cf8d9 → 048, 27d77564 → 029, aeb1389d → 056. **La migration couvre donc
  15 points, pas 17 : 016 et 027 repassent aux lots** (32 points à écrire ; 016 au lot 1, 027 au lot 4).
- **questions-ttechno** (`ubumaths-a3`) : son lot 0 tague TTECHNO des modèles déjà tagués 1GEN (1315d326, 65e96f31,
  373fc5b4) ; il ne corrige ni ne scinde rien. **Il attend nos lots aˣ (032 à 036, 042, 059) et taux moyen
  (037, 040)** : nos modèles à x ⩾ 0 tiennent dans ses bornes, il les taguera TTECHNO et n'écrira que les compléments
  (x < 0, k·aˣ). Promis : la phase 0 de ces lots avant l'écriture, puis les ids et plages des brouillons. Seuils : les
  siens passent par le logarithme décimal → pas de doublon.
- **questions-1techno** (`ubumaths-52`) : migration T1 en `array_append` gardé. Sur les 7 modèles de Q2, il ne pose
  que des tags (95ee57c8 → 1TECHNO-127, 5397c20f → 1TECHNO-139, lot T2) sans toucher `grades`. f3100c29 et aeb1389d
  reçoivent 1TECHNO-142 (T1). **Modèle commun 1GEN-022 + 1TECHNO-057** à la place de 1acb6d47 (sommet par le milieu
  des racines ou f(x) = c, aucune formule ; bornes 1techno dans `bornes/lycee/1techno.md`) : celui qui arrive le
  premier au second degré l'écrit, l'autre pose son tag ; non tranché par David. Il prévient avant de corriger
  83b1f614 v3.

## 7. Règle du nœud : vérification du plan de tags (prod, 2026-11-17)

Le plan des § 2 à 6 ignorait les deux règles écrites dans l'ADR 0020 (« un point par programme » ; « le point est sur
le nœud du modèle ou sur sa notion », refus par `question_template_points_check_rules`) et rappelées dans
`couvrir-un-niveau.md` § 9 (Tle spé : 8 tags sur 13 refusés). Je n'avais lu ni l'ADR ni le § 9 avant de proposer.

Requête : pour chaque tag prévu, nœud du modèle, nœud du point, et points 1GEN admis sur le nœud du modèle.

- **Admis (12)** : 103cf8d9 → 048, 21f42c7f → 009, 42bb2d66 → 011, 5397c20f → 062, 70e682f9 et c90fa022 → 017,
  aab8e41c → 023, afe51ac4 → 055, bd27e002 → 018, d2067413 → 031, d8c9cb60 et f2ed0ea0 → 010.
- **Refusés (11)**, aucun point 1GEN admis sur leur nœud ne décrit le modèle : 1c86d122 (002 ; nœud « courbes et
  repères »), f5585668, 27ac630c, a55ad3b4 (051), 27d77564 (029), aeb1389d (056), f3100c29 (038), d1010214 (058),
  98c3f740 (048), 2f4f4ae0 et fe6f5606 (012).

**Bilan corrigé** : la migration couvre **9 points** (009, 010, 011, 017, 018, 023, 031, 048, 055). **38 points restent à
écrire** : les 30 du § 2.4, plus 002, 016, 027, 029, 038, 051, 056, 058. Q2 : seul 5397c20f reçoit un point ;
1c86d122 et f5585668 rejoignent les 4 dont on retire `1_GEN` (à confirmer par David).

**Décisions de David sur le § 7 (2026-11-17, « je suis tes recos »)** : retirer aussi `1_GEN` de 1c86d122 et
f5585668 (6 modèles en tout) ; question d'accès validée sur le plan réduit (11 modèles publiés gagnent `1_GEN` et un
point ; 6 modèles et le tag 1GEN-022 de 1acb6d47 retirés ; aucune table d'élèves touchée) ; les deux règles de
l'ADR 0020 ajoutées à l'étape 3 du skill `couvrir-niveau`.

## 8. Migration de tags (#2744, 2026-11-17)

`20261117124605_questions_1gen_tags.sql` + `tests/integration/questions-1gen-tags.test.ts` : rouge sans le corps,
15 / 15 vert avec. `security-auditor` : aucun finding bloquant (faibles : tout ou rien sous `db push` non prouvé par
le test ; ordre avec les autres chantiers ; rollback qui retirerait un `1_GEN` ajouté entre-temps). CI verte,
`check:migrations --pr 2744` passé, mergée. Un premier `db:migrate` lancé avant le merge n'a rien poussé (« up to
date » : le fichier n'était pas sur `main`). `--dry-run` après le merge : cette seule migration ; jouée par David.

Relu en prod (MCP) : version enregistrée ; trigger `update_question_templates_updated_at` à `O` ; les 19 modèles ont
les tags et niveaux attendus, `updated_at` et statut inchangés (c90fa022, d2067413 toujours brouillons).
questions-1techno prévenu (son T2 attendait ce `db:migrate`).

## 9. Lot 1 « suites géométriques à termes positifs » — phase 0 (proposée le 2026-11-17)

Borne commune aux cinq points : premier terme et raison **strictement positifs** (BO 1re ES p.6). Raison ≠ 1 sauf
dans le modèle « sens de variation » (suite constante). Tous les modèles de 1re spé du thème tirent u₀ ou q signés
(§ 2.2) : modèles neufs, calqués sur les modèles arithmétiques 1GEN déjà en prod (1315d326, 337d31c3, 373fc5b4,
5cb7f6ce). Nœuds relevés en prod : 028 → sous-notion « définition », 029 → « terme général », 030, 039, 057 → notion
« Suites géométriques » (des modèles y sont déjà rangés, 5cb7f6ce l'est sur la notion arithmétique).

| Modèle                                                         | Point | Nœud                | Niveau |
| -------------------------------------------------------------- | ----- | ------------------- | ------ |
| G1 Déterminer la raison d'une suite géométrique                | 028   | définition          | 1      |
| G2 Calculer un terme d'une suite géométrique (forme explicite) | 039   | Suites géométriques | 1      |
| G3 Calculer un terme d'une suite géométrique (récurrence)      | 057   | Suites géométriques | 2      |
| G4 Terme général d'une suite géométrique                       | 029   | terme général       | 2      |
| G5 Sens de variation d'une suite géométrique                   | 030   | Suites géométriques | 1      |

- **G1** (case, nombre décimal accepté) : v1 deux termes consécutifs, `u_k` ∈ 2..12, q ∈ {2, 3, 4, 5} ; v2 q ∈ {0,5 ;
  0,25 ; 0,75}, `u_k` multiple de 4 entre 8 et 80 ; v3 « augmente de t % par an », t ∈ {2, 3, 5, 10, 20} → 1 + t/100 ;
  v4 « baisse de t % », t ∈ {5, 10, 20, 25} → 1 − t/100. Erreurs typiques : la différence `u_{k+1} − u_k`, t/100,
  1 + t.
- **G2** (case) : `u_n = a × qⁿ`, calculer `u_k`. v1 a ∈ 1..9, q ∈ {2, 3}, k ∈ 2..5 ; v2 en contexte, `1000 × 1,05ⁿ`
  (population, placement), k ∈ 5..12, arrondi à l'unité (calculatrice). Erreurs : (a·q)ᵏ, a·q·k.
- **G3** (case) : `u₀ = a`, `u_{n+1} = q × u_n`, calculer `u₂`, `u₃` ou `u₄`. v1 a ∈ 1..9, q ∈ {2, 3} ; v2 a ∈ {100,
  200, 500, 1000}, q ∈ {1,1 ; 1,2 ; 0,9 ; 0,8}, rang 2 ou 3 (décimal exact). Erreurs : a + k·q (confusion
  arithmétique), qᵏ sans a, exposant k − 1.
- **G4** (case, expression) : v1 `u₀ = a`, raison q → `a × qⁿ` ; v2 `u₁ = a` → `a × q^{n−1}` ; v3 contexte « C € placés
  à t % par an » → `C × (1 + t/100)ⁿ`. a ∈ 1..9, q ∈ 2..5 ; C ∈ {500, 1000, 2000}, t ∈ {2, 3, 4, 5}. Erreurs : `a + nq`,
  `(aq)ⁿ`, exposant n au lieu de n − 1 (v2). Piège à vérifier à l'écriture : forme normalisée de `a·q^{n−1}`
  (`requiredForm`, § 9 de la démarche).
- **G5** (QCM croissante / décroissante / constante, comme 5cb7f6ce) : v1 récurrence, q > 1 ; v2 récurrence,
  0 < q < 1 ; v3 `u_n = a × qⁿ` ; v4 contexte « baisse de t % par an » ; v5 q = 1 (constante). a ∈ 1..9 ;
  q ∈ {1,2 ; 1,5 ; 2 ; 3} ou {0,2 ; 0,5 ; 0,8 ; 0,9}.

**Question d'accès** (migration nœud + tags après la création des brouillons) : personne ne lit rien de nouveau ; les
modèles sont créés en brouillon, la migration ne fait que les ranger et les taguer.

### Questions (2026-11-17)

- **Q10** — Découpage en 6 lots du § 4, dans cet ordre ? (reco : oui ; le lot 3 aˣ pourrait passer en tête pour
  débloquer questions-ttechno.)
- **Q11** — Les points 1TECHNO-036 (définition), 038 (terme général), 040 ou 049 (sens de variation) sont sur les
  mêmes nœuds, avec la même borne (premier terme et raison > 0), et forment le lot 1 de questions-1techno. Reco :
  nos modèles G1, G4, G5 sont **communs** (on écrit, `grades` 1_GEN + 1_TECHNO, questions-1techno pose ses tags par
  sa propre migration), comme le modèle 1GEN-022 + 1TECHNO-057 ; prévenir la session avant d'écrire.
- **Q12** — Phase 0 du lot 1 (modèles, variations, plages, niveaux, formes de réponse) ci-dessus : validée ?

### Décisions (David, 2026-11-17 : « je te suis tes recos »)

- **Q10** : découpage en 6 lots du § 4, dans l'ordre 1 à 6.
- **Q11** : G1, G4, G5 sont des modèles **communs** 1GEN + 1TECHNO. questions-1gen les écrit (`grades` `1_GEN`) ;
  questions-1techno ajoute `1_TECHNO` (`array_append`) et ses tags 036, 038, 040 ou 049 par sa propre migration,
  après la création des brouillons. Session prévenue le 2026-11-17 ; elle n'écrit aucun modèle de suites
  géométriques de son lot 1 (il lui reste 047).
- **Q12** : phase 0 du lot 1 validée telle quelle (modèles, variations, plages, niveaux, formes de réponse).

## 10. Lot 1 : écriture (2026-11-17)

Script `docs/wip/questions/lot-1gen-1.py` → `scripts/questions/1gen-1-suites-geometriques/` (5 fichiers, 55 specs).
Simulation `create-questions` verte ; formules des aperçus (40 tirages par modèle) passées à `validateLatex` : seul
`\unit{€}` signalé (macro du projet). Essai en base locale (copie des fichiers, ids locaux) et aperçu admin : G1 v3
(1,02 accepté, corrigé en virgule), G5 v4 (QCM, mauvaise réponse refusée), G4 v3 (`500×1,05^n` accepté).

Écarts à la phase 0, sans effet sur les décisions :

- Titres de G1 et G4 suffixés « à termes positifs » : même titre et même niveau que des modèles de 1re spé (85afd455,
  eca755e6), refusés par la garde d'homonymes de `create-questions`.
- `constraints.form: off` sur G1 (`1/4` tombait en `bad_form` pour 0,25) et G4 (un décimal dans une expression,
  `1000×1,03^n`, tombe en `bad_form` : `acceptDecimal` ne vaut que pour un nombre seul).
- `{{eval:…;d}}` partout où le résultat est décimal (sans cela, `1 + 2/100` s'affiche « 51/50 »).
- G2 v2 : « un village » (1 000 à 5 000 habitants).

## 11. Lot 1 : en prod, brouillons (2026-11-17)

Après le merge de #2750, David a lancé `pnpm tsx scripts/create-questions.ts --dir
scripts/questions/1gen-1-suites-geometriques --publier` depuis le worktree. Les 5 modèles ont été créés en brouillon,
avec les ids écrits en tête des fichiers (commit 1487a0f73). Relevé en prod : `grades` `['1_GEN']`, sans nœud, 0 tag.

| Modèle | id                                     | Point    | Nœud (chemin)                                |
| ------ | -------------------------------------- | -------- | -------------------------------------------- |
| G1     | `0b5c3db6-cb37-40fc-8247-12e3ace03a46` | 1GEN-028 | Suites > Suites géométriques > définition    |
| G2     | `f15045ec-2ecd-41b5-8196-077bf3d7b3a1` | 1GEN-039 | Suites > Suites géométriques                 |
| G3     | `e0f3ac2f-3f35-44e6-ac10-4058e12b1481` | 1GEN-057 | Suites > Suites géométriques                 |
| G4     | `c4887e49-2337-4ac7-a2c9-369434868b65` | 1GEN-029 | Suites > Suites géométriques > terme général |
| G5     | `569e0140-d5da-440f-a4c3-07bae4e6b30b` | 1GEN-030 | Suites > Suites géométriques                 |

- Ids de G1, G4 et G5 envoyés à questions-1techno le 2026-11-17 (G2 et G3 pour information). Il lui revient d'ajouter
  `1_TECHNO` et ses tags ; notre migration ne touche pas à `grades`.
- Réponse de questions-1techno (2026-11-17) : ids notés à son § 15. Son trigger exige le nœud, donc elle attend
  notre `db:migrate` en prod pour faire son `array_append('1_TECHNO')` et poser ses tags 036, 038 et 040/049 :
  **la prévenir dès notre `db:migrate` fait.** Sa PR #2753 ne touche aucun modèle 1GEN.
- **Question d'accès**, posée à David le 2026-11-17 AVANT le SQL : « qui pourra lire quoi, qu'il ne pouvait pas lire
  avant ? ». Réponse de David le 2026-11-17 : **personne**. Les modèles restent des brouillons, ils sont seulement
  rangés et tagués ; les élèves ne les voient qu'après la publication par David.
