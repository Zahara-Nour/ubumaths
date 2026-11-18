# Chantier « questions-1gen » — couvrir les maths de l'enseignement scientifique de 1re

> Démarche : [couvrir-un-niveau.md](../../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Niveau : `1_GEN`, « module spécifique » de mathématiques intégré à l'enseignement scientifique de 1re générale
> (BO n° 14 du 2026-04-02). Bornes : `docs/systeme/programmes/bornes/lycee/1gen.json` → `["1_GEN"].points`,
> lecture et décisions l1g-1, l1g-2 dans `1gen.md` et `questions-2de-1gen.json`.

## Reprendre ici

_Mis à jour le 2026-11-18 : **chantier clos**._

- **État** : lots 1 à 7 publiés (lot 5 par questions-1techno) ; relevé MCP de clôture : 74 modèles publiés
  contenant `1_GEN`, **64 points actifs sur 64** avec au moins un modèle publié ; découpage du § 4 recompté contre
  les PR mergées (§ 28).
- **Durable versé** dans `docs/systeme/programmes/bornes/lycee/1gen.md`, « Couverture en modèles de questions ».
- Fichiers des lots laissés dans `scripts/questions/1gen-*` (ids des modèles, corrections futures).

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
   **Écrit par questions-1techno** (décision de David, 2026-11-17) : modèles communs `1_GEN` + `1_TECHNO`, elle pose
   les deux tags dans sa migration (branche `feat/questions-1techno-lot2`) ; rien à écrire ici, ids attendus.
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

## 12. Lot 1 : migration nœud + tags (2026-11-17)

`20261117142038_questions_1gen_lot1_rangement_tags.sql` (calquée sur `20261026210000`, lot C du CP) +
`tests/integration/questions-1gen-lot1-rangement-tags.test.ts`. Relevé MCP avant le SQL : les 5 brouillons toujours
sans nœud, 0 tag, `grades` `['1_GEN']` ; les 5 points sur les nœuds du § 11. Test rouge sans le corps (5 / 9 en
échec), 9 / 9 vert avec. `grades` non touché. Rollback à jouer avant que questions-1techno ait tagué G1, G4, G5.

`security-auditor` : aucun finding bloquant. Faibles : branche en retard sur `main` (fusionnée, test relancé, 9 / 9) ;
rollback valable seulement avant les tags 1TECHNO de G1, G4, G5 (dit dans l'en-tête).

### `db:migrate` (2026-11-17)

Avant le nôtre, le `--dry-run` montrait aussi `20261117140233` (questions-1techno, destructive) : arrêt, question à
David. Entre-temps, la session tortue-variables a lancé `db:migrate`, qui a poussé 20261117140132, 20261117140233 et
la nôtre, sans erreur. Relu en prod (MCP) : version enregistrée ; G1 → définition / 1GEN-028, G2 → Suites
géométriques / 039, G3 → idem / 057, G4 → terme général / 029, G5 → Suites géométriques / 030 ; un seul tag chacun ;
brouillons, `grades` `['1_GEN']`, `updated_at` inchangés.

## 13. Lot 1 : page à cocher et publication (2026-11-17)

`page-a-cocher.ts` sur `scripts/questions/1gen-1-suites-geometriques` : 5 fiches, 16 exemples, aucune alerte (point,
nœud et niveau lus en prod). Artefact (capacité `db`, collection `verdicts`) :
https://claude.ai/artifact/8oXNs9VrKYg9aUMvrfiMyN. Verdicts lus en base : **5/5 OK**, sans commentaire (la remarque
`a = 1` de G2 v1 et G3 v1, « u_n = 1 × 3^n », laissée telle quelle).

Simulation `publier-lot.ts` : 5 brouillons passent le contrôle. David a lancé `--publier` : « 5/5 modèles du lot
publiés (statut relu en base) ». Relu au MCP : les 5 `published`, `grades` `['1_GEN']`.

## 14. Lots 3 et 4 — phase 0 (proposée le 2026-11-17, promise à questions-ttechno)

Phase 0 des deux lots avancée devant le lot 2, parce que questions-ttechno attend nos modèles aˣ et taux moyen pour
les taguer TTECHNO et n'écrire que les compléments (x < 0, k·aˣ). L'**écriture** suit l'ordre de Q10 (lot 2, puis 3,
puis 4).

**Borne commune** (BO 1re ES p.7, `1gen.md`) : x ↦ aˣ avec **a > 0 et x ⩾ 0** ; ni logarithme, ni dérivée, ni eˣ ;
propriétés algébriques admises ; exposant **1/n** (le PDF dit « 1/n » ; la transcription
`src/lib/server/programmes/transcriptions/1_GEN.md` écrit « t/n », coquille à corriger dans la PR du lot 3).
Valeurs non entières de aˣ : à la calculatrice (approche différenciée du BO).

**Nœuds relevés en prod (2026-11-17)** : chaque point est sur une sous-notion ; chaque modèle va sur le nœud de son
point (ADR 0020) et porte un seul point 1GEN.

- 032, 033, 034, 035, 036, 042, 059 → « Fonctions > Fonction exponentielle > fonctions x ↦ aˣ » : **0 modèle
  publié** ; points TTECHNO-031 à 033, 036, 037, 039, 080, 081 sur le même nœud.
- 037, 040 → « Proportionnalité > Évolutions > taux d'évolution moyen » : 0 modèle ; TTECHNO-035, 038 sur le nœud.
- 038, 043, 056 → « Fonctions > Fonction exponentielle > croissance et décroissance exponentielles » : 3 modèles
  de 1re spé (245b4eb1, 22141fa4, ca8f40c2), tous en eˣ ou raison eᵏ : hors borne.
- 044, 060 → « Suites > Modèles d'évolution > seuil » : 4 modèles. eb9517ed (021, linéaire) et 0b686e01 (061,
  tableau de valeurs = outil numérique) déjà 1GEN ; f1963ef2 (logarithme) et 19961e67 (Python) hors 044 / 060.
- Calques possibles pour 033 : 6137a555, bd45ed7f, c24d21e1, e6b429b4 (1re spé, eˣ ; questions-ttechno les
  réécrit en aˣ pour ses 034, 078, 079 : **modèle commun à décider**, Q15).

### Lot 3 « Fonctions aˣ » (7 modèles, nœud « fonctions x ↦ aˣ »)

| Modèle                                                | Point | Niveau | Réponse                   |
| ----------------------------------------------------- | ----- | ------ | ------------------------- |
| E1 Calculer une valeur de aˣ (x non entier)           | 032   | 1      | case, décimal arrondi     |
| E2 Propriétés algébriques : une seule puissance       | 033   | 2      | case, expression `a^{…}`  |
| E3 Sens de variation de x ↦ aˣ                        | 034   | 1      | choix                     |
| E4 Associer une courbe à sa fonction aˣ               | 035   | 2      | ` ```associer ` + courbes |
| E5 Exposant 1/n                                       | 036   | 1      | case, nombre              |
| E6 Placer les points de la courbe d'une exponentielle | 042   | 1      | ` ```courbe ` + `placer:` |
| E7 Lire sur la courbe d'une exponentielle             | 059   | 1      | case, lecture (tolérance) |

- **E1** : v1 `f(x) = aˣ`, a ∈ {1,5 ; 2 ; 3 ; 0,5 ; 0,8}, x ∈ {0,5 ; 1,5 ; 2,5 ; 3,2}, arrondi au centième ;
  v2 capital C ∈ {1 000 ; 2 000 ; 5 000} placé à t ∈ {2 ; 3 ; 4} % : valeur au bout de x ∈ {1,5 ; 2,5 ; 3,5} ans,
  `C × (1 + t/100)ˣ`, arrondi au centime (« fraction d'annuité », BO) ; v3 noyaux N₀ ∈ {1 000 ; 8 000} au bout de
  x ∈ {0,5 ; 1,5 ; 2,5} demi-vies, `N₀ × 0,5ˣ`, arrondi à l'unité. Erreurs : a × x, aˣ⁺¹, intérêts simples
  (C(1 + xt/100)).
- **E2** : écrire sous la forme d'une seule puissance aᶜ, exposants **positifs** (décimaux simples) : v1 aˣ × aʸ ;
  v2 aˣ / aʸ avec x > y ; v3 (aˣ)ᵏ, k ∈ 2..4 ; v4 aˣ × bˣ = (ab)ˣ. a ∈ {2 ; 3 ; 5 ; 1,5}, x, y ∈ {0,5 ; 1,5 ; 2 ;
  2,5 ; 3}. Erreurs : aˣʸ pour le produit, a^{x/y} pour le quotient, a^{x+k} pour la puissance, (a + b)ˣ. Forme
  attendue (une seule puissance) à vérifier à l'écriture (`requiredForm`, piège § 9 de la démarche).
- **E3** (choix croissante / décroissante / constante, comme G5) : v1 `f(x) = aˣ`, a > 1 ; v2 0 < a < 1 ; v3 a = 1 ;
  v4 comparer f(x₁) et f(x₂) sans calcul (choix <, >), x₁ < x₂ ; v5 contexte « quantité qui diminue de t % par
  heure, modélisée par … ». a ∈ {1,2 ; 1,5 ; 2 ; 3} ou {0,2 ; 0,5 ; 0,8 ; 0,9}. Parallèle avec les suites
  géométriques (BO), sans le dire dans la réponse.
- **E4** (` ```associer `, courbes dans les éléments) : trois courbes sur [0 ; 4] (deux a > 1 dont une plus
  « rapide », une 0 < a < 1) ↔ trois expressions ; v2 avec a = 1 (droite horizontale) parmi les trois. Repère
  commun, toutes passent par (0 ; 1) : on distingue par le sens et par f(1) = a.
- **E5** : v1 a^{1/n} exact : 4^{1/2}, 9^{1/2}, 8^{1/3}, 27^{1/3}, 64^{1/3}, 16^{1/4}, 81^{1/4}, 32^{1/5} ;
  v2 « le nombre positif dont la puissance n-ième vaut b » = b^{1/n}, arrondi au centième (b ∈ 2..20, n ∈ 2..5) ;
  v3 (a^{1/n})ⁿ = a. Erreurs : b/n, b × 1/n, bⁿ.
- **E6** (` ```courbe ` + `placer:` de points, décision Q5) : tableau de valeurs à x = 0..4 donné ou à calculer,
  `f(x) = 2ˣ`, `1,5ˣ`, `0,5ˣ` ou `k × aˣ` à valeurs lisibles (100 × 0,5ˣ, 10 × 2ˣ) ; placer 4 ou 5 points ; échelle
  choisie pour des ordonnées entières ou demi-entières. Le tracé de la courbe elle-même reste hors outil (aucun geste
  ne trace une courbe non affine, § 3).
- **E7** (` ```courbe `, lecture) : courbe de `f(x) = k × aˣ` sur [0 ; 6] ; v1 lire f(x₀) ; v2 lire x tel que
  f(x) = y₀ ; v3 lire a (f(1) quand k = 1, ou f(1)/f(0)). Réponse à tolérance de lecture (une demi-graduation).

### Lot 4 « Taux moyen, phénomènes exponentiels, seuils » (7 modèles)

| Modèle                                                | Point | Nœud                       | Niveau | Réponse          |
| ----------------------------------------------------- | ----- | -------------------------- | ------ | ---------------- |
| T1 Taux moyen de n évolutions successives             | 037   | taux d'évolution moyen     | 2      | case, % arrondi  |
| T2 Taux moyen entre une valeur de départ et d'arrivée | 040   | taux d'évolution moyen     | 2      | case, % arrondi  |
| T3 Reconnaître une évolution exponentielle            | 038   | croissance et décroissance | 1      | choix            |
| T4 Modéliser par une fonction exponentielle           | 056   | croissance et décroissance | 2      | case, expression |
| T5 Ordre de grandeur d'une évolution exponentielle    | 043   | croissance et décroissance | 2      | choix            |
| T6 Seuil par le calcul (sans logarithme)              | 044   | seuil                      | 2      | case, entier     |
| T7 Seuil lu sur la courbe                             | 060   | seuil                      | 1      | case, lecture    |

- **T1** (037, le **contenu**) : n ∈ {2 ; 3 ; 4} évolutions **données une à une** (+10 %, −5 %, +20 %…), taux moyen
  `((1 + t₁)…(1 + tₙ))^{1/n} − 1`, en %, arrondi à 0,01 %. Erreurs : moyenne arithmétique des taux, somme des taux / n,
  oubli du −1.
- **T2** (040, la **capacité**) : v1 valeur V₀ → Vₙ en n ans (population, prix), taux annuel moyen `(Vₙ/V₀)^{1/n} − 1` ;
  v2 taux global donné (+50 % en 5 ans) ; v3 taux annuel → taux mensuel équivalent (n = 12). Erreurs : taux global / n,
  oubli du −1, exposant n au lieu de 1/n.
- **T3** (choix) : v1 tableau de valeurs à pas constant : linéaire (différences constantes), exponentielle (quotients
  constants) ou aucune des deux ; v2 description en mots (« augmente de 3 % par an » / « de 300 habitants par an » /
  « est divisée par 2 toutes les 8 h ») ; v3 croissance ou décroissance exponentielle ; v4 discret (suite) ou continu
  (fonction) : « nombre de bactéries à chaque heure entière » / « à tout instant t ». Valeurs exactes (quotients
  simples : 2, 1,5, 0,5, 1,1).
- **T4** (expression en t ou x) : v1 substance éliminée à t % par heure, Q₀ mg → `Q₀ × (1 − t/100)ᵗ` ; v2 population
  +t % par an, à tout instant → `P₀ × (1 + t/100)ˣ` ; v3 divisée par 2 chaque heure → `N₀ × 0,5ᵗ` ; v4 rumeur
  (chaque personne prévient k autres) → `kˣ`. Q₀ ∈ {50 ; 100 ; 200}, t ∈ {10 ; 15 ; 20 ; 25}. Erreurs : baisse linéaire Q₀ − (t/100)·Q₀·t,
  (linéaire), Q₀ × (t/100)ᵗ, Q₀ × (1 + t/100)ᵗ pour une baisse. Distinct de G4 (029 : terme général discret).
  Variable de l'énoncé (t, x) acceptée telle quelle ; `constraints.form: off` comme G4 (décimal dans l'expression).
- **T5** (choix d'une puissance de 10) : v1 « double chaque année » : au bout de 10 ans ×≈ 10³, 20 ans ×≈ 10⁶
  (2¹⁰ ≈ 10³) ; v2 demi-vie : au bout de 10 demi-vies il reste ≈ 1/1 000 ; v3 rumeur ×3 par étape, 10 étapes ≈ 6 × 10⁴
  → ordre 10⁴ ou 10⁵ ; v4 R₀ = 2 ou 3 sur n générations. Choix 10, 10², 10³, 10⁴, 10⁶. Erreurs : 2 × 10 (linéaire),
  10² pour 2¹⁰.
- **T6** (entier, **sans logarithme** : essais à la calculatrice) : « à partir de quelle année / quel rang » ; v1 placement
  C × (1 + t/100)ⁿ ⩾ 2C ; v2 substance Q₀ × 0,8ⁿ < seuil ; v3 population P₀ × 1,0tⁿ > P₁. Réponse n ⩽ 20. Erreurs :
  n − 1 (dernier rang sous le seuil), n + 1. Corrigé : les deux puissances encadrantes (uₙ₋₁ et uₙ), pas de tableau
  complet (0b686e01, 061, fait le tableau).
- **T7** (` ```courbe `, lecture) : courbe de `f(x) = k × aˣ` et droite y = s tracée ; v1 croissance : « à partir de
  quel x f(x) ⩾ s » ; v2 décroissance : « à partir de quel instant la quantité passe sous s » ; v3 discret (points
  d'une suite géométrique, 058-like) : premier rang au-dessus de s. Tolérance une demi-graduation (v1, v2), entier
  exact (v3).

### Coordination questions-ttechno

Nos modèles tiennent dans ses bornes (a > 0, x ⩾ 0 est un cas de ses x réels) : candidats TTECHNO E1 (031), E2 (037 /
081), E3 (032), E4 (033), E5 et T1 / T2 (035 / 038). Comme Q11 : nous écrivons avec `grades` `['1_GEN']`, elle fait
son `array_append('T_TECHNO')` et ses tags après notre migration nœud + tags. Lui envoyer cette phase 0 dès sa
validation, puis les ids des brouillons.

**Réponse de questions-ttechno (2026-11-17)** : aucune objection. Un seul point TTECHNO par modèle : E1 → 031,
E2 → 081 seul, E3 → 032, E4 → 033, T1 → 035, T2 → 038 ; E5, E6, E7 sans point TTECHNO. Ses compléments couvrent
034, 078, 079 (exposants négatifs), 036, 080 (k < 0). Lui envoyer ids et plages de chaque lot à leur création.

**Question d'accès** (migrations nœud + tags de chaque lot) : personne ne lit rien de nouveau ; brouillons rangés et
tagués, visibles des élèves seulement après publication par David.

### Questions (2026-11-17)

- **Q13** — 037 et 040 séparés ainsi : T1 évolutions successives données (contenu), T2 valeurs de départ et
  d'arrivée, taux global, mensuel équivalent (capacité) ?
- **Q14** — E6 (042) : placer les points d'un tableau, sans tracer la courbe (rappel de Q5) ; et E2 (033) limité aux
  exposants positifs (x ⩾ 0) ?
- **Q15** — Propriétés algébriques (033) : modèle commun avec questions-ttechno (elle réécrivait les calques eˣ en aˣ
  pour ses 034, 078, 079) : nous l'écrivons à exposants positifs et elle écrit seulement le complément négatif ?
- **Q16** — Phase 0 des lots 3 et 4 (modèles, variations, plages, niveaux, formes de réponse) ci-dessus : validée ?

### Décisions (David, 2026-11-17 : « je te suis »)

- **Q13** : T1 (037) = évolutions successives données une à une ; T2 (040) = valeurs de départ et d'arrivée, taux
  global, taux mensuel équivalent.
- **Q14** : E6 place les points d'un tableau sans tracer la courbe ; E2 à exposants positifs seulement.
- **Q15** : E2 est un modèle **commun** avec questions-ttechno : nous l'écrivons (exposants positifs, `grades`
  `['1_GEN']`), elle ajoute `T_TECHNO` et son tag, et n'écrit que le complément à exposants négatifs.
- **Q16** : phase 0 des lots 3 et 4 validée telle quelle. Écriture dans l'ordre de Q10 (lot 2, puis 3, puis 4).

## 15. Lot 2 « représentations graphiques : suites et affines » — phase 0 (proposée le 2026-11-17)

**Nœuds relevés en prod (2026-11-17)** :

- 016, 019, 041, 058 → « Suites > Généralités sur les suites > représentation graphique ». Modèles déjà rangés :
  8d4e5302 (050, lire u₀ et r), a430a698 (lire un terme, partiel : var. 3 hors 016), d2067413 (031, brouillon),
  baefb288 (escalier, hors programme), 4f8f420a (réservé à la 1re spé, Q4). Aucun ne fait **placer** des termes,
  aucun ne lit une suite géométrique à termes positifs.
- 020, 051 → « Fonctions > Fonctions affines > expression et droite ». Modèles rangés : 15ddcc75, 7c07749c (3e, par le
  calcul, sans graphique), 0d43f797, 1c5bce2c (reconnaître). Les modèles de droite à tracer ou à lire (8d4bd94d,
  2cfae58d, f5585668, c64028b0, 0d0e88f5…) sont sur d'autres nœuds : refusés par la règle du nœud (§ 7).
- Points 1TECHNO sur le même nœud de suites : 044 (réaliser la représentation des termes d'une suite), 117
  (représentation d'une suite géométrique > 0), 119 (exploiter) ; prévus au lot 4 « graphiques » de
  questions-1techno.

**Contrainte de l'outil** (`ubumark.md`, repère à placer) : 6 points au plus, chacun **sur un nœud de la grille**.
Les termes placés sont donc entiers (ou demi-entiers avec une grille de 0,5).

| Modèle                                           | Point | Niveau | Réponse                    |
| ------------------------------------------------ | ----- | ------ | -------------------------- |
| R1 Reconnaître le nuage d'une suite arithmétique | 016   | 1      | ` ```associer ` + courbes  |
| R2 Placer les termes d'une suite arithmétique    | 019   | 1      | ` ```courbe ` + `placer:`  |
| R3 Placer les termes d'une suite géométrique     | 041   | 2      | ` ```courbe ` + `placer:`  |
| R4 Lire sur le nuage d'une suite géométrique     | 058   | 2      | case, nombre               |
| R5 Tracer la droite d'une fonction affine        | 020   | 1      | ` ```courbe ` + `tracer:`  |
| R6 Lire sur la droite d'une fonction affine      | 051   | 1      | case, nombre ou expression |

- **R1** (016) : trois nuages ↔ trois formules ; v1 formes explicites `u_n = u₀ + nr` ; v2 récurrences
  `u₀ = …, u_{n+1} = u_n + r`. u₀ ∈ −3..8, r ∈ {−2 ; −1 ; 1 ; 2 ; 3}, trois couples qui se distinguent par u₀ **et**
  par r (sinon deux nuages ne se départagent que d'un point). Les points sont alignés : c'est dit dans le corrigé.
- **R2** (019) : placer A, B, C, D, E = (n ; u_n) pour n = 0..4 ; v1 forme explicite ; v2 récurrence ; v3 contexte
  (« 3 € de plus chaque semaine », u₀ = économies de départ). u₀ ∈ −3..8, r ∈ ±1..3, termes dans la fenêtre, grille 1.
  Erreurs nommées par l'outil (point oublié, abscisse et ordonnée échangées) ; le corrigé calcule chaque terme.
- **R3** (041) : même geste, termes **> 0** : (u₀ ; q) ∈ {(1 ; 2), (2 ; 2), (3 ; 2), (1 ; 3)} croissante (n = 0..3 ou
  0..4, termes ⩽ 32, grille 1 ou 2 selon la parité) ou {(16 ; 0,5), (32 ; 0,5), (27 ; 1/3), (81 ; 1/3)}
  décroissante ; v1 explicite `u_n = u₀ × qⁿ`, v2 récurrence, v3 contexte (population de bactéries qui double).
- **R4** (058) : nuage de u₀..u₅ (mêmes plages que R3) ; v1 lire u₀ et q (q = u₁ / u₀) ; v2 lire u_k ; v3 sens de
  variation (choix croissante / décroissante, lu sur le nuage) ; v4 premier rang où u_n dépasse (ou passe sous) une
  valeur. Erreurs : q = u₁ − u₀ (confusion arithmétique), rang décalé de 1.
- **R5** (020) : `tracer: y = ax + b` à partir de `f(x) = ax + b` ; v1 a, b entiers (a ∈ ±1..3, b ∈ −4..4) ; v2 a
  fractionnaire (±1/2, ±1/3, ±2/3) ; v3 contexte (coût fixe + coût par unité, fenêtre en quart de plan positif).
  Erreurs nommées par l'outil (« ta droite n'est pas celle d'équation … »).
- **R6** (051, « travail succinct ») : droite tracée ; v1 lire f(x₀) ; v2 lire l'antécédent de y₀ ; v3 lire
  l'ordonnée à l'origine et le coefficient directeur, écrire `f(x) = …` (lien taux d'accroissement / coefficient
  directeur, BO) ; v4 sens de variation (choix). Valeurs sur la grille.

**Coordination questions-1techno** : R2 et R3 sont candidats à 1TECHNO-044 (ou 117 pour R3), R4 à 119 : modèles
**communs** comme Q11 (`grades` `['1_GEN']`, elle fait son `array_append('1_TECHNO')` et ses tags). La prévenir
après validation.

**Question d'accès** : personne ne lit rien de nouveau ; brouillons rangés et tagués, visibles des élèves après
publication par David.

### Questions (2026-11-17)

- **Q17** — R1 (016, contenu) par association nuages ↔ formules, plutôt qu'un deuxième modèle de lecture (050 est
  déjà couvert par 8d4e5302) ?
- **Q18** — R2, R3, R4 communs avec questions-1techno (044, 117, 119) ?
- **Q19** — Phase 0 du lot 2 (modèles, variations, plages, niveaux, formes de réponse) ci-dessus : validée ?

### Décisions (David, 2026-11-17 : « je te suis »)

- **Q17** : R1 (016) par association nuages ↔ formules.
- **Q18** : R2, R3, R4 **communs** avec questions-1techno (044, 117, 119) : nous écrivons avec `grades` `['1_GEN']`,
  elle fait son `array_append('1_TECHNO')` et ses tags après notre migration nœud + tags. Session prévenue le
  2026-11-17.
- **Q19** : phase 0 du lot 2 validée telle quelle.

**Réponse de questions-1techno (2026-11-17)** : d'accord, plages vérifiées contre ses bornes. R2 → 1TECHNO-044,
R3 → 117, R4 → 119 (même nœud). Retirés de son lot 4. Lui envoyer les ids en prod ; elle tague après notre migration,
page à cocher d'abord. Sa migration du lot G (G1, G4, G5) est en PR #2758.

## 16. Lot 2 : écriture (2026-11-17)

Script `docs/wip/questions/lot-1gen-2.py` → `scripts/questions/1gen-2-representations-graphiques/` (6 fichiers,
65 specs). `question:specs` vert pour les 6 modèles (50 tirages par variation) ; simulation `create-questions` verte
contre la prod (aucun homonyme) ; 555 formules des aperçus (40 tirages) passées à `validateLatex` avec un compte des
accolades : 0 problème ; `sonde-courbes` sur 300 tirages, 2 700 blocs ` ```courbe ` (nuages du bloc associer
compris) : 0 problème. Essai en base locale : les 6 modèles créés en brouillon (copie des fichiers, ids locaux).
Aperçu admin joué le 2026-11-17 (serveur `--host 127.0.0.1` : l'extension Chrome refuse `[::1]`, la base locale
avait été remise à zéro entre-temps, modèles recréés) : R1 relié juste ; R2 cinq points placés, juste ; R3 D placé en
(3 ; 8) → « Tu as placé D en (3 ; 8). », faux ; R5 deux points de y = ½x − 1, juste ; R6 antécédent lu, juste ; R4
q = 1 (différence) → case 2 fausse, correction affichée. Rendu des nuages lisible, petits repères du bloc associer
compris.

| Modèle | Fichier                                | Variations | Specs |
| ------ | -------------------------------------- | ---------- | ----- |
| R1     | `01-associer-nuage-suite-arithmetique` | 2          | 4     |
| R2     | `02-placer-termes-suite-arithmetique`  | 3          | 7     |
| R3     | `03-placer-termes-suite-geometrique`   | 5          | 11    |
| R4     | `04-lire-nuage-suite-geometrique`      | 6          | 14    |
| R5     | `05-tracer-droite-fonction-affine`     | 3          | 8     |
| R6     | `06-lire-droite-fonction-affine`       | 4          | 11    |

Écarts à la phase 0 (§ 15), sans effet sur les points ni sur les formes de réponse — **acceptés par David le
2026-11-17** :

- **R1** : les premiers termes sont tirés dans trois plages disjointes (−3..−1, 1..4, 5..8). Avec 15 conditions, le
  tirage échouait 4 fois sur 100. Le nuage 1 a donc toujours le plus petit u₀, mais les étiquettes sont mélangées au
  tirage : l'ordre ne révèle rien. Formules explicites écrites `u_n = rn + u₀` (`2n − 3`). Specs : le testeur tire
  avec la graine 0, d'où l'ordre affiché 2, 0, 1.
- **R3 et R4** : n = 0..3 partout (4 points). La grille verticale vaut le plus petit terme : 1, 2, 3 ou 4.
  (81 ; 1/3) se place ainsi sur une grille de 3, à côté des grilles de 1 ou 2 prévues. Les variations sont dédoublées
  croissante / décroissante, car leurs variables diffèrent. R3 a donc 5 variations : explicite ×2, récurrence ×2,
  bactéries. R4 en a 6 : u₀ et q, u_k, sens ×2, « dépasse », « passe sous ». Le sens se donne par un choix à deux
  propositions, sans « constante ».
- **R4** : nuage limité à u₀..u₃, au lieu de u₀..u₅ : avec u₅, les termes dépasseraient 32 (jusqu'à 243). Seuils à mi-chemin
  entre deux termes, toujours entiers.
- **R5 v3** : salle d'escalade, 10 à 20 € d'inscription, 5 ou 10 € la séance, grille 1 × 5.

## 17. Lot 2 : en prod, rangement et page à cocher (2026-11-17)

David a lancé `create-questions --publier` après #2762. Relu au MCP : 6 brouillons, `grades` `['1_GEN']`, sans nœud, 0
tag. Ids commités dans les fichiers.

| Modèle | id                                     | Point    | Nœud                                                           |
| ------ | -------------------------------------- | -------- | -------------------------------------------------------------- |
| R1     | `817d257f-dcc6-4c31-92ca-57b0d20665da` | 1GEN-016 | Suites > Généralités sur les suites > représentation graphique |
| R2     | `96668141-c1a7-4996-bb59-b39f6c106b45` | 1GEN-019 | idem                                                           |
| R3     | `13388e8f-e662-4f28-97b6-934afaeead31` | 1GEN-041 | idem                                                           |
| R4     | `e8f08a19-b417-4183-9cd3-fab7f3810211` | 1GEN-058 | idem                                                           |
| R5     | `216555e7-9f28-4992-b0f4-416bc418e7da` | 1GEN-020 | Fonctions > Fonctions affines > expression et droite           |
| R6     | `e17ce5be-7beb-4773-b267-7910d6c8a86b` | 1GEN-051 | idem                                                           |

- Migration `20261117174437_questions_1gen_lot2_rangement_tags.sql` (calquée sur celle du lot 1) et son test : rouge
  sans le corps, 9 / 9 vert avec. `security-auditor` : aucun finding bloquant (faible, hérité du gabarit :
  `set local lock_timeout` sans effet hors transaction). PR #2767, CI verte, `check:migrations` vert, mergée.
- `db:migrate` depuis le dépôt principal : seule notre migration en attente (`migration list --linked`). Relu au MCP :
  chaque modèle sur son nœud, un seul tag, brouillon, `updated_at` inchangé.
- Ids de R2, R3, R4 envoyés à questions-1techno (tags 1TECHNO-044, 117, 119 à poser par elle).
- Page à cocher : 6 fiches, 23 exemples ; une alerte attendue (bloc associer de R1 non dessiné, joué dans l'aperçu,
  § 16). https://claude.ai/artifact/7rNB4sGX6PJP6LaYjWLNAJ (capacité `db`, collection `verdicts` vide au départ).
- Verdicts lus en base : **6/6 OK**, sans commentaire. Simulation `publier-lot.ts` : 6 brouillons passent ; David a
  lancé `--publier` : « 6/6 modèles du lot publiés ». Relu au MCP : les 6 `published`, `grades` `['1_GEN']`.

## 18. Lot 3 « fonctions x ↦ aˣ » : écriture (2026-11-17)

Script `docs/wip/questions/lot-1gen-3.py` → `scripts/questions/1gen-3-fonctions-exponentielles/` (7 fichiers,
69 specs). `question:specs` vert pour les 7 (50 tirages par variation) ; `sonde-courbes` sur 300 tirages, 1 500
blocs ` ```courbe ` (courbes du bloc associer comprises) : 0 problème ; simulation `create-questions` verte contre la
prod (aucun homonyme). Essai en base locale (copie des fichiers, ids locaux). Aperçu admin joué le 2026-11-17 : E4
(1,5 / 2,5 / 0,6) relié juste, graduations des petits repères lisibles ; E6 (32 × 0,5ˣ) cinq points placés,
juste ; E7 (f(x) = 8 sur 10 × 0,7ˣ, attendu 0,63) 0,6 jugé juste ; E2 « 27 » pour 3³ → faux, « La réponse doit être
écrite sous forme de puissance. » Décimaux rendus en virgule (`2{,}5`).

| Modèle | Fichier                                  | Variations | Specs |
| ------ | ---------------------------------------- | ---------- | ----- |
| E1     | `01-calculer-valeur-a-puissance-x`       | 3          | 9     |
| E2     | `02-une-seule-puissance-exposants-reels` | 4          | 11    |
| E3     | `03-sens-de-variation-a-puissance-x`     | 5          | 16    |
| E4     | `04-associer-courbe-a-puissance-x`       | 2          | 4     |
| E5     | `05-exposant-un-sur-n`                   | 3          | 10    |
| E6     | `06-placer-points-courbe-exponentielle`  | 3          | 8     |
| E7     | `07-lire-courbe-exponentielle`           | 3          | 11    |

Écarts à la phase 0 (§ 14), sans effet sur les points ni sur les formes de réponse — **acceptés par David le
2026-11-17** :

- **E1** : l'énoncé donne le modèle (`V(x) = C × 1,0t^x`, `N(x) = N₀ × 0,5^x`) ; l'élève calcule. Réponses à
  `precision` décimale (2 chiffres, ou 0 pour les noyaux).
- **E2** : `requiredForm: power`. Plages élargies pour le quotient (x ∈ {2 ; 2,5 ; 3 ; 3,5 ; 4,5}, y ∈ {0,5 ; 1 ;
  1,5 ; 2}, x > y) et b ∈ {2 ; 3 ; 4} pour aˣ × bˣ ; conditions qui écartent les coïncidences avec l'erreur typique
  (x·y ≠ x + y, x/y ≠ x − y, x·k ≠ x + k).
- **E3** : v4 (comparer sans calcul) avec a ∈ {0,5 ; 0,8 ; 1,5 ; 2 ; 3}, x₁ ∈ {0,5 … 2} < x₂ ∈ {2,5 … 4} ; v5 en
  médicament (`Q(x) = Q₀ × (1 − p/100)ˣ`).
- **E4** : un petit repère par courbe dans le bloc associer (même fenêtre [0 ; 4] × [−0,5 ; 6], même échelle), le
  point A(1 ; a) marqué sur chaque courbe. v1 : a ∈ {1,2 ; 1,5}, {2 ; 2,5}, {0,5 ; 0,6 ; 0,8} ; v2 avec a = 1.
- **E5** : v1 b = rⁿ ⩽ 81, r ∈ {2 ; 3 ; 4} (16^{1/2} et 16^{1/4} en plus de la liste) ; v2 et v3 sans puissance
  parfaite ; `constraints.form: off` (8/3 jugé faux, pas refusé pour sa forme).
- **E6** : valeurs choisies pour tomber sur la grille au lieu de 100 × 0,5ˣ et 10 × 2ˣ : v1 k × 2ˣ (k ∈ {1 ; 2},
  grille k) ; v2 16g × 0,5ˣ (g ∈ {1 ; 2 ; 3 ; 5}, grille g) ; v3 bactéries 8g × 1,5ˣ, **tableau donné**, x = 0..3
  (4 points, grille g).
- **E7** : v1 croissante (k ∈ {1 ; 2}, a ∈ {1,4 ; 1,5}, k·a⁶ ⩽ 16), grille 1, tolérance 0,5 ; v2 décroissante
  (k ∈ {10 ; 12 ; 16}, a ∈ {0,5 ; 0,6 ; 0,7}), abscisses graduées de 0,5 en 0,5, tolérance 0,25, solution entre
  0,5 et 5,5 ; v3 lire a ∈ {0,5 ; 1,5 ; 2 ; 2,5} (ordonnées de 0,5 en 0,5, tolérance 0,25 ; la courbe sort du
  repère par le haut pour a ⩾ 2).
- La description accessible des courbes d'E7 écrit les décimaux avec un point (« 0.7^x ») : valeur brute de la
  variable, comme aux lots précédents.

Coquille de la transcription corrigée dans la même PR : `src/lib/server/programmes/transcriptions/1_GEN.md`, ligne
390, « exposant $\dfrac{t}{n}$ » → « $\dfrac{1}{n}$ » (le PDF du BO dit 1/n).

PR #2773 : CI verte (un test chronométré de `/demo/diaporama` rouge au premier passage, sans lien avec le
lot, vert à la relance), mergée le 2026-11-17. Worktree et branche supprimés.

## 19. Lot 3 : en prod, rangement et page à cocher (2026-11-17)

David a lancé `create-questions --publier` après #2773. Relu au MCP : 7 brouillons, `grades` `['1_GEN']`, sans nœud,
0 tag. Ids commités dans les fichiers (#2778).

| Modèle | id                                     | Point    |
| ------ | -------------------------------------- | -------- |
| E1     | `e4e65a69-2710-45d1-9592-1edd100d9067` | 1GEN-032 |
| E2     | `60971c9a-82e7-4ed5-a18a-7520b40c38b2` | 1GEN-033 |
| E3     | `2a9c316a-ee3d-44dc-89be-8b3b5c00ac2c` | 1GEN-034 |
| E4     | `065eea60-1d6d-4404-9015-f4624e661ab2` | 1GEN-035 |
| E5     | `3a8ef5f7-402f-48a3-9ddc-aca94723bf56` | 1GEN-036 |
| E6     | `9ead685c-6032-4b2b-982d-0cadfcdf40b4` | 1GEN-042 |
| E7     | `fc27769e-ad53-4b35-8b97-b0d86acef03a` | 1GEN-059 |

Tous sur « Fonctions > Fonction exponentielle > fonctions x ↦ aˣ ».

- Migration `20261117191427_questions_1gen_lot3_rangement_tags.sql` (calquée sur celle du lot 2) et son test : rouge
  sans le corps (5 échecs), 9 / 9 vert avec. `security-auditor` : aucun finding bloquant (faible, hérité :
  `lock_timeout` sans effet hors transaction). PR #2778, CI verte, `check:migrations` vert, mergée.
- `db:migrate` depuis le dépôt principal : seule notre migration en attente. Relu au MCP : chaque modèle sur son
  nœud, un seul tag, brouillon, `updated_at` inchangé.
- Ids et plages de E1 à E4 envoyés à questions-ttechno (TTECHNO-031, 081, 032, 033 après la publication) ; R1 du lot
  2 (817d257f) : questions-1techno y pose 1TECHNO-041, accord donné.
- Page à cocher : 7 fiches, 23 exemples ; une alerte attendue (bloc associer d'E4 non dessiné, joué dans l'aperçu,
  § 18). https://claude.ai/artifact/3XEaFxSbGcryky6bLtYeZG (capacité `db`). Verdicts lus en base : **7/7 OK**, sans
  commentaire. Simulation `publier-lot.ts` : 7 brouillons passent.

**Publication (2026-11-17)** : David a lancé `publier-lot.ts --publier` ; 7/7 modèles relus `published` (script et
MCP). questions-ttechno prévenue (tags TTECHNO d'E1 à E4).

## 20. Lot 4 « taux moyen, phénomènes exponentiels, seuils » : écriture (2026-11-17)

Script `docs/wip/questions/lot-1gen-4.py` → `scripts/questions/1gen-4-taux-moyen-seuils/` (7 fichiers, 77 specs).
`question:specs` vert pour les 7 (50 tirages par variation, `\textcolor` toujours dans `$…$`) ; `sonde-courbes`
sur 300 tirages, 300 blocs ` ```courbe ` : 0 problème ; `validateLatex` + compte des accolades sur 2 903 formules
(40 aperçus par modèle) : 0 problème ; simulation `create-questions` verte contre la prod (aucun homonyme). Essai en
base locale : 7 brouillons créés (copie des fichiers, ids locaux). Aperçu admin (serveur `--host 127.0.0.1`, première compilation
lente) : T7 v1 « 4 » pour 4,12 → juste, nuage de la v3 et droite y = 9 lisibles ; T4 « 5000·1,02ˣ » → juste ; T1 v3
(+30, −20, +40, −10) « 10 » (moyenne des taux) → faux, tableau rendu. T2, T3, T5, T6 restent à jouer : la base
locale a été remise à zéro par une autre session (brouillons recréés une fois), puis le serveur a été arrêté.

Aperçu repris le 2026-11-17 (brouillons recréés en base locale depuis une copie des fichiers, serveur `--host ::`),
une réponse juste et une fausse par variation, corrections lues : **T2** v1 (25 000 → 30 000 en 5 ans) « 3,71 »
juste, « 4 » (taux global ÷ n) faux, v1 en baisse « −1,05 » juste, v2 « 4,61 » juste, v3 « 0,797 » juste, « 0,833 »
(10/12) et « 0,8 » faux ; **T3** 8/8 variations juste et faux, option « t ↦ k × aᵗ » rendue, correction « ni l'une
ni l'autre » (différences 1, 2, 3, 4 ; quotients 10/9 ≠ 12/10) juste ; **T5** 3/3 (2³⁰ → 10⁹, 20 demi-vies → 10⁶,
vidéo 18 min sur 6 h → 2²⁰ → 10⁶), correction rendue ; **T6** 3/3 (1,1ⁿ ⩾ 2 → 8, 200 × 0,7ⁿ < 10 → 9,
1,03ⁿ ⩾ 1,5 → 14), n − 1 faux, correction rendue (200 × 0,7⁸ ≈ 11,53, 200 × 0,7⁹ ≈ 8,07). Rien à corriger.

| Modèle | Fichier                                  | Variations | Specs |
| ------ | ---------------------------------------- | ---------- | ----- |
| T1     | `01-taux-moyen-evolutions-successives`   | 3          | 8     |
| T2     | `02-taux-moyen-entre-deux-valeurs`       | 3          | 9     |
| T3     | `03-reconnaitre-evolution-exponentielle` | 8          | 18    |
| T4     | `04-modeliser-fonction-exponentielle`    | 4          | 15    |
| T5     | `05-ordre-de-grandeur-exponentielle`     | 3          | 9     |
| T6     | `06-seuil-par-le-calcul`                 | 3          | 9     |
| T7     | `07-seuil-sur-un-graphique`              | 3          | 9     |

Écarts à la phase 0 (§ 14), sans effet sur les points ni sur les formes de réponse — **acceptés par David le
2026-11-17** :

- **T1** : v1 « hausse de a %, puis baisse de b % » (n = 2), v2 deux hausses puis une baisse (n = 3), v3 tableau de
  quatre évolutions alternées (n = 4). Une condition écarte les tirages où la moyenne des taux, arrondie au
  centième, donnerait la bonne réponse (petits taux : écart de quelques millièmes).
- **T2** : v3 (taux mensuel équivalent) arrondi **au millième** de pourcent, et non au centième : à 3 %,
  1,03^(1/12) − 1 ≈ 0,247 % et 3/12 = 0,25 % tombent tous deux sur 0,25 au centième. v1 : rapports 1,2 ; 1,25 ;
  1,5 ; 0,8 ; 0,9 (baisses comprises, taux négatif).
- **T3** : 8 variations au lieu de 4, une réponse par variation : tableau linéaire, exponentiel (×2, ×1,5, ×0,5),
  ni l'un ni l'autre (a + b·n(n+1)/2) ; phrase « +p % », « +p habitants », « divisée par 2 » ; croissance ou
  décroissance (×q) ; discret ou continu.
- **T4** : v4 (rumeur) dit « le nombre est multiplié par k à chaque étape », sans donner la forme.
- **T5** : le ×3 de la v3 est retiré : 3¹⁰ ≈ 6 × 10⁴ n'a pas d'ordre de grandeur sans ambiguïté (10⁴ ou 10⁵).
  Trois variations, toutes par 2¹⁰ ≈ 10³ : doublements (10, 20, 30 h), demi-vies (10, 20, 30), vidéo qui double
  toutes les m minutes. Choix 10, 10², 10³, 10⁶, 10⁹.
- **T6** : v1 seuil 1,5 ou 2 fois le capital, t ∈ {4 ; 5 ; 6 ; 8 ; 10} ; v2 p ∈ {10 ; 20 ; 25 ; 30}, seuil 5, 10 ou
  20 mg ; v3 seuil 1,2, 1,3 ou 1,5 fois la population, t ∈ {2 ; 3 ; 5}. n ⩽ 20 partout.
- **T7** : v1 et v2 abscisses graduées de 0,5 en 0,5, tolérance 0,25 (comme E7) ; v3 nuage u₀ × qⁿ (u₀ ∈ {1 ; 1,5},
  q ∈ {1,5 ; 1,6}, n = 0..6), seuil entier à 0,4 au moins de chaque terme.

## 21. Lot 4 : en prod, rangement (2026-11-17)

David a lancé `create-questions --publier` après #2788. Relu au MCP : 7 brouillons, `grades` `['1_GEN']`, sans nœud,
0 tag. Ids copiés du dépôt principal dans le worktree puis `git restore` là-bas.

| Modèle | id                                     | Point    | Nœud                                                                 |
| ------ | -------------------------------------- | -------- | -------------------------------------------------------------------- |
| T1     | `a439df84-9d32-4138-bbc1-cf846616e0ca` | 1GEN-037 | Proportionnalité > Évolutions > taux d'évolution moyen               |
| T2     | `f84e23a3-36c0-4cb0-801f-3807134f307d` | 1GEN-040 | Proportionnalité > Évolutions > taux d'évolution moyen               |
| T3     | `6c83bcee-0c52-4879-bc80-355d0af6ad7f` | 1GEN-038 | Fonctions > Fonction exponentielle > croissance et décroissance exp. |
| T4     | `4de7638a-64c5-4e4e-9809-6a222bb903bb` | 1GEN-056 | Fonctions > Fonction exponentielle > croissance et décroissance exp. |
| T5     | `33098914-4128-4c9d-8ef8-36b2eef5c61e` | 1GEN-043 | Fonctions > Fonction exponentielle > croissance et décroissance exp. |
| T6     | `7314d829-b61a-4bf8-8a6a-0df9770bb60c` | 1GEN-044 | Suites > Modèles d'évolution > seuil                                 |
| T7     | `1a82af47-4609-4627-b1fb-295afa41d32b` | 1GEN-060 | Suites > Modèles d'évolution > seuil                                 |

- Migration `20261117222809_questions_1gen_lot4_rangement_tags.sql` (calquée sur celle du lot 3, trois nœuds) et son
  test : rouge sans le corps (5 échecs), 9 / 9 vert avec.
- **Lot 5 écrit par questions-1techno** (lot 2 de son chantier, #2787) : 7 brouillons communs `{1_GEN,1_TECHNO}`, elle
  pose nœud + tags 1GEN et 1TECHNO par sa migration (accord donné le 2026-11-17). M1 allure 1GEN-022
  `129067e4-e97c-458c-9bd7-540383a5dac6` ; M2 associer 1GEN-024 `7efa9e79-e985-407d-bdec-73dce30ef283` ; M3 axe
  1GEN-052 `f81b8735-9b8f-41aa-ada0-08b7415a6076` ; M4 sommet 1GEN-053 `493adeb4-7eb9-4156-bd1b-79996f54c5e4` ; M5
  f(x) = c 1GEN-025 `f95f05a0-4c66-409f-9ea3-0f9fcdd98759` ; M6 tableau de variation 1GEN-054
  `e539088a-1eee-4259-8e61-b0f6fa514eaf` ; M7 signe 1GEN-027 `82e40d16-6069-4bea-b7e6-df3344d26bd3`.
- PR #2793 (ids + migration + test), `security-auditor` : aucun finding bloquant (faible hérité : `lock_timeout` hors
  transaction). CI verte, `check:migrations` vert, mergée. `db:migrate` depuis le dépôt principal : seule notre
  migration en attente. Relu au MCP : chaque modèle sur son nœud, un seul tag, brouillon, `updated_at` inchangé.
- Ids de T1 (→ TTECHNO-035) et T2 (→ TTECHNO-038) envoyés à questions-ttechno.
- Page à cocher : 7 fiches, 27 exemples, aucune alerte. https://claude.ai/artifact/4zbYF42f9MapzqfF4VTw7k (capacité
  `db`, 0 verdict à la publication ; rendu 390 px non revu, même gabarit que le lot 3).

## 22. Lot 4 : publication (2026-11-18)

- Page à cocher : 7 verdicts « ok », sans commentaire (David, 2026-11-18) ; ids identiques à ceux du dossier.
- `publier-lot.ts --dir scripts/questions/1gen-4-taux-moyen-seuils` lancé par David (`!`) : simulation 7/7 sans
  refus ni alerte de tag, puis `--publier` : **7/7 publiés, statut relu en base**. (Ma simulation a été refusée
  par le classifieur : elle vise la prod.)
- questions-ttechno prévenue : T1 `a439df84` (→ TTECHNO-035) et T2 `f84e23a3` (→ TTECHNO-038) sont publiés ; elle
  n'ajoute que ses tags.
- Lot 5 : questions-1techno l'a clos (#2796), modèles communs du second degré publiés.

## 23. Lot 6 « statistiques à deux variables » — phase 0 (proposée le 2026-11-18)

**Relevé prod (2026-11-18)** : 001 à 007 n'ont **aucun modèle**. 008 (calculer le point moyen, 1c65d58e) et 045
(interpoler avec une droite donnée, a573d517) sont couverts. Nœuds : 001 → « Statistiques > Tableaux croisés » (aucun
modèle rangé dessus) ; 002 → « Statistique à deux variables > nuage de points » ; 003, 005, 007 → « … > ajustement
affine » ; 004 → « … > point moyen » ; 006 → « Statistiques > Représenter des données ». Modèles déjà rangés sur ces
nœuds : 49fac266 (interpréter a et b d'un ajustement, 1TECHNO-083 + TCOMP), a573d517, 1c65d58e, deux modèles de
corrélation (r, TCOMP seul, hors 1GEN), et des modèles CE2 à 2de sans rapport.

**Tag sans écrire** : **49fac266 → 1GEN-003** (« ajustement affine », contenu). Même nœud que 003, aucun point 1GEN
dessus. Il interprète le coefficient directeur et l'ordonnée à l'origine d'une droite des moindres carrés donnée par
la calculatrice, sans aucune théorie : dans la borne. Il gagne `1_GEN` par `array_append` gardé (§ 6).

**Outils, sondés (parseur, 2026-11-18)** : barres à deux séries `données Filles: Bus ; Vélo ; …` / `données Garçons: …`
(catégories acceptées, `afficher: fréquences` aussi ; données brutes, donc jeux fixés écrits par le script) ;
circulaire ; tableau croisé `afficher: fréquences par ligne` ; ` ```nuage ` (ne dessine que la droite des moindres
carrés) ; ` ```courbe ` avec `points:` donnés + droites `d(x) = …`, `placer:` (6 points au plus, sur la grille).
**Correction du § 3** : 007 « au jugé » n'est **pas** `tracer:` sur `données:` (combinaison refusée, et `tracer:`
attend une droite exacte, pas une droite au jugé) ; il passe par un choix entre droites dessinées.

| Modèle                                  | Point | Commun avec | Niveau | Réponse                   |
| --------------------------------------- | ----- | ----------- | ------ | ------------------------- |
| S1 Comparer deux groupes sur diagrammes | 001   | —           | 1-2    | case (%) ou choix         |
| S2 Représenter un nuage de points       | 002   | 1TECHNO-085 | 1      | ` ```courbe ` + `placer:` |
| S3 Lire un nuage de points              | 002   | 1TECHNO-082 | 1      | case, choix               |
| S4 Le point moyen dans le nuage         | 004   | 1TECHNO-084 | 1-2    | `placer:` G, case         |
| S5 Interpoler ou extrapoler ?           | 005   | —           | 1      | choix, case               |
| S6 Déterminer un ajustement affine      | 007   | 1TECHNO-087 | 2      | case (a et b), choix      |
| S7 Formules du tableur (tableau croisé) | 006   | —           | 1-2    | choix (Q22)               |

- **S1** (001, croisement de deux caractères qualitatifs) : v1 deux diagrammes circulaires (Filles / Garçons, mode
  de transport), groupes de tailles différentes, « quelle part des filles vient à vélo ? » (%) ; v2 barres groupées
  en **effectifs** (jeux fixés) : « les garçons viennent-ils plus souvent à vélo que les filles ? », où l'effectif le
  plus grand n'est pas la proportion la plus grande (piège voulu, corrigé par les fréquences) ; v3 les mêmes barres
  en `afficher: fréquences`, lire et comparer ; v4 tableau croisé en fréquences par ligne, choisir le diagramme qui
  le représente. Effectifs 5..40 par case, pourcentages arrondis à l'unité.
- **S2** (002) : tableau (rang de l'année × valeur, 5 ou 6 couples) → placer A..F. v1 x = 1..6, y = 0..12, grille 1 ;
  v2 y multiples de 5 jusqu'à 60, grille 5 ; v3 axe des x qui ne part pas de 0 (années 2018..2023 en rang).
  Erreurs nommées par l'outil (point oublié, abscisse et ordonnée échangées).
- **S3** (002) : ` ```nuage ` sans ajustement. v1 lire la valeur de y d'un point ; v2 tendance (choix : y augmente
  quand x augmente / diminue / pas de tendance nette) ; v3 « un ajustement affine semble-t-il adapté ? » (nuage
  presque aligné ou nettement courbé, choix).
- **S4** (004, point moyen comme contenu ; le calcul seul est 008) : v1 nuage de 4 à 6 points donnés, **placer G**
  (moyennes entières, ou demi-entières avec une grille de 0,5) ; v2 « la droite d'ajustement passe par G » : G et
  le coefficient a donnés, trouver b (b = ȳ − a x̄) ; v3 choisir G parmi quatre points marqués (pièges : point
  médian, milieu des extrêmes, point du nuage le plus central).
- **S5** (005, contenu) : v1 série observée de 2016 à 2023, estimation en 2020,5 ou en 2030 : interpolation ou
  extrapolation ? (choix) ; v2 nuage + droite d'ajustement affichée (` ```nuage ` `ajustement: affine`, sans
  `prévoir:`), lire une estimation dans le domaine observé ; v3 « l'estimation pour dans 50 ans est-elle fiable ? »
  (choix : extrapolation lointaine, le modèle peut cesser de valoir).
- **S6** (007) : v1 **droite de Mayer** : 6 points, deux groupes de 3, calculer G₁, G₂ puis a et b de (G₁G₂)
  (données choisies pour que a et b soient décimaux à 2 chiffres au plus) ; v2 la même avec 8 points (deux groupes
  de 4) ; v3 **au jugé** : nuage + trois droites dessinées (` ```courbe `, `points:` + `d₁, d₂, d₃`), laquelle est
  un ajustement acceptable (choix ; pièges : droite qui passe par deux points extrêmes en laissant tout le nuage
  d'un côté, pente de signe contraire) ; v4 **moindres carrés** : écran de calculatrice a = 2,3417, b = 15,082 →
  équation avec coefficients arrondis au centième (case). Aucune formule des moindres carrés (« aucune connaissance
  théorique »).
- **S7** (006, tableur) : tableau croisé dans une feuille (colonnes A..D, lignes 1..4). v1 formule du total d'une
  ligne (`=SOMME(B2:C2)` ; pièges `=SOMME(B2:B4)`, la colonne au lieu de la ligne, et `=B2+C2/2`) ; v2 fréquence à
  recopier vers le bas,
  `=B2/B$5` (piège : `=B2/B5`, faux après recopie) ; v3 pourcentage par ligne `=B2/D2` ; v4 quel diagramme le
  tableur doit produire pour comparer deux groupes (barres groupées en fréquences / circulaire de l'effectif total /
  courbe). Corrigé : la règle des références ($), comme 4-lot-3 « formules du tableur ».

**Coordination questions-1techno (2026-11-18)** : rien en cours chez elle sur 082, 084, 085, 087 (son lot 5 vient
après la dérivation et l'algorithmique). D'accord sur le principe des modèles communs comme au lot 2 : nous écrivons
avec `grades` `['1_GEN']`, elle pose son `array_append('1_TECHNO')` et ses tags ; David tranchera chez elle à son
lot 5. Lui envoyer la phase 0 validée puis les ids.

**Question d'accès** : personne ne lit rien de nouveau. Brouillons rangés et tagués, visibles des élèves après
publication par David ; 49fac266 (publié) gagne le niveau `1_GEN` et le tag 1GEN-003, ce qui l'ajoute aux parcours
de 1re générale ; aucune table d'élèves touchée.

### Questions (2026-11-18)

- **Q20** — Taguer 49fac266 en 1GEN-003 plutôt qu'écrire un modèle « ajustement affine » de plus ?
- **Q21** — S2, S3, S4, S6 communs avec questions-1techno (085, 082, 084, 087) ?
- **Q22** — S7 (tableur) : la décision Q6 disait « formule écrite en texte, comme 3-032 », mais 3-032 (5c092e43) et
  4-lot-3 font **choisir** la formule (` ```choix `). Je n'ai trouvé aucune case qui compare une formule écrite.
  Choix parmi quatre formules (recommandé), ou outil neuf « formule de tableur » (classe C, chantier à part) ?
- **Q23** — Phase 0 du lot 6 (modèles, variations, plages, niveaux, formes de réponse) ci-dessus : validée ?

### Décisions (David, 2026-11-18 : « Je valide »)

- **Q20** : 49fac266 tagué 1GEN-003 (avec `array_append('1_GEN')` gardé), pas de modèle « ajustement affine » de plus.
- **Q21** : S2, S3, S4, S6 **communs** avec questions-1techno (085, 082, 084, 087) : `grades` `['1_GEN']` chez nous,
  son `array_append('1_TECHNO')` et ses tags après notre migration.
- **Q22** : S7 en ` ```choix ` parmi quatre formules (comme 5c092e43 et 4-lot-3), pas d'outil neuf.
- **Q23** : phase 0 du lot 6 validée telle quelle.

## 24. Lot 6 : écriture (2026-11-18)

Script `docs/wip/questions/lot-1gen-6.py` → `scripts/questions/1gen-6-statistiques-deux-variables/` (7 fichiers,
60 specs). `question:specs` vert pour les 7 (50 tirages par variation) ; `sonde-courbes` sur 300 tirages : 0
problème ; 579 formules distinctes des aperçus (40 tirages) passées à `validateLatex` avec compte des accolades : 0
problème ; simulation `create-questions` verte contre la prod (7 à créer, aucun homonyme, vérifié aussi au MCP).
Essai en base locale (copie des fichiers, ids locaux) et aperçu admin joué le 2026-11-18 (serveur du worktree,
`127.0.0.1:5176`) : S1 piège des effectifs (garçons 7/20 contre filles 9/40) juste ; S2 cinq pommes placées, juste ;
S4 G placé, juste ; S6 au jugé (d₂) juste ; S7 `=B2/B4` → faux, correction lisible avec `B$4` (le `\$` s'affiche
bien, énoncé, choix et formule colorée) ; nuages de S3 (droite, U) lisibles.

| Modèle | Fichier                               | Point    | Variations | Specs |
| ------ | ------------------------------------- | -------- | ---------- | ----- |
| S1     | `01-comparer-deux-groupes-diagrammes` | 1GEN-001 | 4          | 9     |
| S2     | `02-representer-nuage-de-points`      | 1GEN-002 | 3          | 6     |
| S3     | `03-lire-nuage-de-points`             | 1GEN-002 | 4          | 9     |
| S4     | `04-point-moyen-du-nuage`             | 1GEN-004 | 3          | 8     |
| S5     | `05-interpolation-extrapolation`      | 1GEN-005 | 4          | 8     |
| S6     | `06-determiner-ajustement-affine`     | 1GEN-007 | 6          | 12    |
| S7     | `07-formules-tableur-tableau-croise`  | 1GEN-006 | 4          | 8     |

Écarts à la phase 0 (§ 23), sans effet sur les points ni sur les formes de réponse :

- **S1** : deux diagrammes **séparés** (un par groupe) au lieu de barres groupées. Le bloc à deux séries ne prend
  que des données brutes (une valeur par élève), qu'un tirage ne sait pas écrire. Le piège des effectifs est
  décliné dans les deux sens (petit groupe = filles, puis garçons), pour que la bonne réponse ne soit pas toujours la
  même. La v4 « choisir le diagramme d'un tableau croisé » est passée à S7 (v4, diagramme que le tableur doit tracer).
- **S2** : plages resserrées après l'aperçu, pour des crans d'au moins ~23 px au doigt (pommes : masses de 20 en
  20 g, de 80 à 280 g ; adhérents de 5 en 5, jusqu'à 60).
- **S3** : v1 lit la note d'un élève sur un repère ` ```courbe ` à points nommés (lecture exacte sur la grille ; le
  ` ```nuage ` ne gradue pas assez finement) ; « ajustement adapté ? » en deux variations (presque aligné, en U).
- **S4** : v3 choisit G parmi quatre **coordonnées** (pièges : coordonnées échangées, colonne du milieu du
  tableau, division par 4 au lieu de 5) plutôt que quatre points marqués.
- **S5** : la lecture d'une estimation sur la droite du ` ```nuage ` est retirée (la droite des moindres carrés
  calculée par le bloc n'est pas maîtrisée par le modèle, et 045 couvre déjà l'estimation) ; à la place, « laquelle
  de ces estimations est une interpolation ? ».
- **S6** : la droite au jugé est déclinée en trois variations (bonne droite en d₁, d₂, d₃) ; a et b de Mayer
  entiers ou à une décimale (b = ȳ₁ − 2,5a à 8 points).

## 25. Lot 6 : en prod, rangement et tags (2026-11-18)

David a lancé `create-questions --publier` après #2802 : 7 brouillons, `grades` `['1_GEN']`, sans nœud, 0 tag (relu
au MCP). Ids en tête des fichiers.

| Modèle | id                                     | Point    | Nœud                                                            |
| ------ | -------------------------------------- | -------- | --------------------------------------------------------------- |
| S1     | `9bedbaf4-d5d1-4464-947d-19b8946452ab` | 1GEN-001 | Statistiques > Tableaux croisés                                 |
| S2     | `f3cb0c7a-5fa9-4578-ba55-769581dcc64b` | 1GEN-002 | Statistiques > Statistique à deux variables > nuage de points   |
| S3     | `7461bb44-6811-4f56-9397-6fb3ff82c1b9` | 1GEN-002 | Statistiques > Statistique à deux variables > nuage de points   |
| S4     | `4f328c8c-16c8-40b0-b192-bc2eaa94a867` | 1GEN-004 | Statistiques > Statistique à deux variables > point moyen       |
| S5     | `ef8ade24-f79c-4bd8-b51c-77852ed0496c` | 1GEN-005 | Statistiques > Statistique à deux variables > ajustement affine |
| S6     | `3fec6b41-b401-430b-b602-017bd51e5f10` | 1GEN-007 | Statistiques > Statistique à deux variables > ajustement affine |
| S7     | `2e898e54-bad7-4a92-b5ca-5d40561ca24d` | 1GEN-006 | Statistiques > Représenter des données                          |

- Migration `20261118054706_questions_1gen_lot6_rangement_tags.sql` : les 7 sur leur nœud, un point 1GEN chacun ;
  49fac266 (publié) gagne `1_GEN` (`array_append` gardé) et 1GEN-003. Tout ou rien des 7 neufs ; sans eux (base
  locale, qui a une copie de 49fac266), elle ne touche rien. Test : 14 / 14 vert, 9 rouges sans le corps.
- `security-auditor` : aucun finding bloquant ni important. Faible 1 corrigé (la garde refuse un 49fac266 qui
  porterait déjà `1_GEN`, sinon le rollback l'effacerait). Faible 2 : le tout ou rien repose sur la transaction
  implicite de `db push` (gabarit éprouvé) ; revérifier `tgenabled = 'O'` après `db:migrate`.

- **db push** (2026-11-18) : le premier `pnpm db:migrate` lancé par `!` n'a rien appliqué (confirmation `[Y/n]` sans
  réponse) ; relancé en `supabase db push --linked --yes`. Trois migrations parties ensemble, toutes prêtes et
  annoncées : la nôtre, `20261118055440` (questions-1techno lot 3), `20261118060323` (navadra, accord de sa session).
  Relu au MCP : 7 brouillons sur leur nœud, un point 1GEN chacun, `updated_at` inchangé ; 49fac266
  `{T_COMP,1_TECHNO,1_GEN}`, tags 1GEN-003, 1TECHNO-083, TCOMP-321, `updated_at` inchangé ; trigger `O`.
- Ids des communs envoyés à questions-1techno (S2 → 085, S3 → 082, S4 → 084, S6 → 087), à prévenir à la publication.
- ⚠ questions-ttechno a tagué E1-E4, T1-T2 (#2800, `20261118052320`) : ne plus jouer les rollbacks commentés des lots
  3 et 4 (`20261117191427`, `20261117222809`) sans jouer d'abord le sien.
- Page à cocher : 7 fiches, 28 exemples ; deux alertes attendues (circulaire et barres de S1, nuage de S3 non dessinés
  par la page, joués dans l'aperçu local). https://claude.ai/artifact/MiyPAFTTg13ydC3EJLTn52 (capacité `db`, 0
  verdict à la publication).

## 26. Lot 6 : publication et bilan du niveau (2026-11-18)

- Page à cocher : 7 verdicts « ok », sans commentaire (David) ; ids identiques à ceux du dossier.
- `publier-lot.ts` : simulation 7/7 sans refus ni alerte de tag ; `--publier` lancé par David ; **7/7 `published`**,
  relu au MCP.
- questions-1techno prévenue : elle posera 085, 082, 084, 087 et `1_TECHNO` sur S2, S3, S4, S6 à son lot 5 (après
  sa phase 0), et préviendra avant sa migration.
- **Bilan du niveau** (MCP, points 1GEN actifs sans aucun modèle publié) : **un seul**, **1GEN-031** (représenter
  une suite géométrique à termes positifs). Son seul modèle, d2067413 « Reconnaître une suite arithmétique ou
  géométrique sur un nuage de points » (tagué par #2744), est un **brouillon** partagé 1re spé / 1re techno / 1re
  générale, créé le 2026-10-28 hors de ce chantier (Q24).
- Worktree retiré ; branche `feat/questions-1gen-lot6-tags` supprimée. `feat/questions-1gen-lot6` reste en local :
  `git branch -d` la refuse (commits de main tirés dedans, absents de sa copie distante), `-D` est dans la liste `ask`.

### Question (2026-11-18)

- **Q24** — 1GEN-031 : publier d2067413 tel quel (il est déjà dans la borne, § 2.3), ou écrire un modèle 1GEN
  propre, ou laisser le point sans modèle publié ?

## 27. Lot 7 : publier le brouillon d2067413 (2026-11-18)

**Q24 tranchée (David, 2026-11-18)** : publier d2067413 tel quel, après relecture (ma recommandation : déjà rangé sur
1GEN-031, complet, 18 specs ; il fait _reconnaître_ sur le graphique plus que _représenter_ — couverture partielle
assumée).

- Export : `scripts/questions/1gen-7-suite-nuage/d2067413.json` (`export-question-templates.ts`, lecture prod).
  Six variations : b + rn (croissante, décroissante), a·2ⁿ, a·0,5ⁿ, (n − c)² + d, n² + c.
- Contrôles : `question:specs` 18/18, 300/300 tirages, « importable » ; `sonde-courbes` 300 blocs, 0 problème ;
  quotients du corrigé (V4, V5) rendus en fractions (6/11, 4/3), jamais égaux entre eux sur toutes les valeurs
  tirées (le « mais » du corrigé est toujours vrai).
- Aperçu admin local (copie déjà en base locale sous le même id, serveur `--host 127.0.0.1`) : V4 jouée, nuage
  lisible, « arithmétique » refusé, bonne réponse montrée, corrigé juste.
- Page à cocher : 1 fiche, 6 exemples, 6 nuages dessinés, aucune alerte. Points en base : 1GEN-031 et 1TECHNO-045
  (aucun point 1SPE malgré `1_SPE` dans `grades` : hors chantier, non bloquant). https://claude.ai/artifact/QANSq7PUZ11zjrXru8fmYj
  (capacité `db`, 0 verdict à la publication).
- `publier-lot.ts` (simulation) : 1 brouillon passe ; `garde-niveaux-tags` : aucun niveau manquant.
- **Publication (2026-11-18)** : verdict « ok » de David sur la page à cocher ; `publier-lot.ts --publier` lancé par
  David ; d2067413 relu `published` au MCP. questions-1techno prévenue (il n'est plus parmi ses brouillons).

## 28. Clôture (2026-11-18)

- Découpage du § 4 recompté contre les PR : lots 1 (#2750, #2754), 2 (#2762, #2767), 3 (#2773, #2778), 4 (#2788,
  #2793), 6 (#2802, #2804) mergés ; lot 5 écrit par questions-1techno ; lot 7 (#2813). Tags de l'existant : #2744.
- Relevé MCP : les 40 points des lots 1 à 7 ont chacun un modèle publié ; sur tout le niveau, 64 points actifs,
  0 sans modèle publié. 74 modèles publiés contenant `1_GEN` (19 de 1re générale seule), 1 brouillon hors chantier
  (c90fa022).
- Branche `feat/questions-1gen-lot6` supprimée (go de David).
