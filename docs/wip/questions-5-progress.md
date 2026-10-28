# Chantier « questions-5 » — couvrir la 5e en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Bornes : `docs/systeme/programmes/bornes/cycle4.json` → `5.points`.

## Reprendre ici

_Mis à jour le 2026-10-28, lot 0 (niveaux) en PR._

- **État** : questions du § 4 tranchées (§ 5). Lot 0 (8 modèles changent de niveau, 7 tags) : migration `20261028193700_questions_5_niveaux` + test d'intégration (19 verts, rouge vérifié sans la migration).
- **Prochaine action** : `security-auditor`, PR, CI verte, merge, `db:migrate` depuis le dépôt principal, vérification en prod ; puis phase 0 du lot 1 (A, calcul).
- **En attente de David** : rien.
- **Pièges en cours** : droite à placer et barres à construire mergés mais **pas en prod** (modèles qui s'en servent : brouillons jusqu'au `deploy:prod`) ; relire § 9 de `couvrir-un-niveau.md` avant d'écrire un lot ; `e`/`i` interdites dans les `eval` ; horodatages de migration pris par les sessions CE1 / CM1 / CM2 le même jour : vérifier avant d'en choisir un.
- **Worktree / branche** : `../ubumaths-wt-questions-5`, `feat/questions-5-lot0-niveaux`.

## 1. Relevé (prod, 2026-10-28)

- 143 points de 5e ; **26** ont au moins un modèle, **117** aucun.
- 99 modèles `'5' = any(grades)`, tous publiés, tous rangés sur un nœud ; **79 tagués**, **20 sans point**.
- Aucun modèle tagué d'un point de 5e sans avoir `5` dans ses niveaux.
- Points tagués : 003 (2), 007 (3), 008 (3), 010, 119, 012 (2), 013, 017 (2), 018 (6), 020 (8), 022, 023,
  025 (2), 026 (5), 123 (3), 028, 031, 035 (3), 039 (2), 045 (10), 126 (9), 051, 129, 061 (5), 073 (3), 088 (2).
- Déséquilibre : calcul (relatifs, équations à trou) très couvert ; géométrie, données, fonctions, algorithmique : **rien**
  hors aires du triangle et du parallélogramme.

## 2. L'existant contre les bornes

> La passe du chantier « arbre des notions » (`docs/archive/wip/arbre-notions/analyse/cycle4.csv`, 72 modèles de 5e :
> 42 TAG, 9 MODIFIER, 21 HORS_PROGRAMME, et `cycle4-notes.md`) fait foi. 30 modèles arrivés depuis (venus de 6e au
> chantier `questions-6`, ou nés de la scission des fractions) ont été jugés par ce chantier-là.

### 2.1 Les MODIFIER de la passe : faits

- Scission addition / soustraction de fractions : faite (e100ea6c, 2af592ca, 4e1ed43e sur 5-123).
- Trous a − ? = b retirés de 24331791, 84755a7b, b1550840 (une variation chacun).
- 347eb0d0, 5b53b1be, db4f1dde : variation 1 en écriture simplifiée (−a + b).
- **À vérifier** : f92d63a6 (même dénominateur, « résultat simplifiable ») attend la fraction simplifiée ; la passe
  demandait d'accepter le résultat non simplifié (simplifier = 4e). Tirage à faire (`question:specs --apercu`).
- **Piste** : 3107454a « Calculer un carré » tire a de 1 à 15 ; avec 1..12, il couvrirait aussi 5-029 (carrés de 0 à 12) — mais un modèle = un point : plutôt un modèle neuf pour 5-029.

### 2.2 Les 20 sans point

| Modèles                                | Ce qu'ils font                                     | Où les ranger (proposition)                                   |
| -------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------- |
| 4f4a5c94, 90dca27a, acbd2280, d14fe0cf | simplifier une fraction                            | 4e, tag 4-005                                                 |
| 635bbc32, c6fe3cbf, d568cedb           | compléter une égalité de fractions                 | 6e, tag 6-132                                                 |
| 077c01e0, 33b1b496, 6fbf1ab2, 7410800b | conventions d'écriture (9 × a = 9a, 1a = a, a × a) | aucun point au collège : laisser en 5e sans tag ?             |
| 08a3f943                               | réduire un produit (a × 5 × 2 ; a × 9 × a)         | aucun point de 5e                                             |
| 8af22815                               | réduire une somme à deux lettres                   | aucun point de 5e (5-039 : une lettre)                        |
| 554496dd                               | substitution avec produits de relatifs             | 4e (produit de relatifs)                                      |
| a73f55ba, c0c8920a, 3af94d7d, 7d12a172 | trous a − x = b en fractions, a ÷ x = b, −x = a    | décisions de David du 2026-10-17 / 20 : sans tag              |
| 8a3191ce, ae7a332e                     | coefficient de proportionnalité sur nombres nus    | décidé au chantier 6e : **habiller en grandeurs** ici → 5-088 |

## 3. Les 117 points sans modèle

Outils : la case choix (QCM) est en prod ; la **droite à placer** et les **barres à construire** sont mergées, pas
en prod ; la figure à compléter ne sait tracer que `droite` / `segment` et vérifier `droite_par`, `carre`, `rectangle`.

- **A. Texte / formule seuls (environ 55)** :
  - calcul : 001, 002, 004, 005, 116, 117, 006, 118, 009, 021 ;
  - relatifs : 120, 014, 015, 019, 024 ; 122 (ranger : réponse en liste, à trancher) ;
  - fractions, puissances : 027, 029, 030, 032, 033 ;
  - calcul littéral : 034, 124, 036, 037, 038, 107, 041 (contre-exemple en case choix), 044, 125 ;
  - grandeurs : 050, 108, 052, 053, 056, 058, 074 ;
  - données, probabilités : 134, 080, 139, 079, 082, 083 ;
  - proportionnalité, fonctions : 085, 086, 140, 087, 092, 098.
- **B. Outil existant (environ 40)** :
  - ` ```line ` (lire) : 016, 046 ; **droite à placer** (pas en prod) : 121, 127 ;
  - ` ```figure ` avec repère (lire des coordonnées) : 047 ;
  - ` ```figure ` + case ou case choix : 054, 055 (demi-tour), 057 (angles alternes-internes / correspondants),
    060, 062, 064, 066, 063, 067, 069, 070, 071, 072, 115 (aires de figures composées) ;
  - figure à compléter (`droite_par`) : 131 (hauteur), 132 (médiane) — à condition que le pied / le milieu soit
    nommé, sinon la tâche se vide (voir C3) ;
  - statistiques (` ```barres `, `circulaire`, `nuage`, tableau markdown) : 076, 077, 135, 109, 136, 110, 137, 111,
    138 ; tableau à trous : 078, 093, 097 ; **barres à construire** (pas en prod) : 112 ;
  - proportionnalité, fonctions : 089, 090, 094, 142 (tableau) ; 141, 091, 099, 096, 143 (` ```courbe ` / `nuage`).
- **C. Outil neuf** :
  1. **Placer un point dans un repère** (geste « placer » du plan, suite de la droite à placer) → 128, 095, 114
     (et 089 en graphique). Couvre aussi la 4e / 3e (fonctions).
  2. **Solides en perspective cavalière et patrons** (affichage : cube, pavé, prisme droit, cylindre ; patron) →
     144, 048, 049 ; aide 050, 108, 053. Déjà manquant en 6e (assemblages de cubes). Rien n'existe en 3D au collège.
  3. **Figure à compléter : vérifications neuves** — `perpendiculaire_par` (hauteur sans pied donné), point à
     placer (4e sommet d'un parallélogramme, symétrique d'un point) → 131, 132 vrais, 068, 133, 054/055 en tracé.
  4. **Programme Scratch affiché** (blocs en lecture seule, comme le bloc `python` mais en blocs) → 101, 103, 104,
     105, 106 ; 100 et 102 (écrire) attendent Blockly comme vraie fonctionnalité.
  5. Diagramme circulaire à construire → 113 (ou A : calculer l'angle d'un secteur).
- **D. Non évaluable dans l'appli (à trancher)** : 011 (mobiliser un algorithme), 040, 130, 065 (démontrer),
  042 (conjecturer au tableur), 043 (statut de la lettre), 059 (construire un triangle : compas), 075 (recueillir
  des données), 084 (répéter une expérience).

## 4. Questions à David

1. **Les 20 sans point** (§ 2.2) : changer leur niveau comme proposé (fractions simplifiées → 4e + 4-005 ; égalités
   de fractions → 6e + 6-132 ; 554496dd → 4e) ? Les conventions d'écriture et réductions de produits : 5e sans tag
   ou 4e ? Question d'accès : élèves de 5e perdent ces modèles, élèves de 4e / 6e les gagnent.
2. **f92d63a6** : accepter la fraction non simplifiée (simplifier = 4e) ?
3. **Ordre** : je propose d'abord les lots A (calcul, relatifs, littéral, grandeurs, pourcentages), puis B
   (statistiques et lectures de graphiques, droite graduée), les modèles à « placer » en brouillon jusqu'au
   prochain `deploy:prod`. Les outils C ensuite — lequel en premier ? (reco : C1 « placer dans un repère », il sert
   aussi la 4e et la 3e).
4. **Ranger des relatifs** (122) : étiquettes à ranger (outil manquant) ou case « plus petit / plus grand » ?
5. **Points D** : hors appli, ou outil à inventer ?
6. **Traduire en une expression** (005, 116, 117, 034, 124) : la réponse attendue est une écriture, pas sa valeur
   (« 3 × 2 + 1 » et pas « 7 ») ; je vérifierai que le juge exige la forme avant d'écrire le lot.

## 5. Décisions de David (2026-10-28)

« Je te suis » sur les propositions du § 4, puis réponses aux questions restées sans proposition :

1. Les 20 sans point : simplifier une fraction → 4e + 4-005 ; égalités de fractions → 6e + 6-132 ;
   554496dd → 4e **sans tag** (aucun point de 4e ne porte la substitution avec relatifs). Conventions
   d'écriture et réductions de produits (077c01e0, 33b1b496, 6fbf1ab2, 7410800b, 08a3f943, 8af22815) :
   David a demandé ma reco → **restent en 5e sans point** (aucun point de 4e / 3e, prérequis de 5-039 et
   5-034, rien ne change pour les élèves). Les 4 trous (a73f55ba, c0c8920a, 3af94d7d, 7d12a172) restent
   sans tag (décisions du 2026-10-17 / 20). Question d'accès : élèves de 5e perdent les 8 modèles,
   4e en gagne 5, 6e en gagne 3.
2. f92d63a6 : **déjà corrigé** (`reducedFractions: off`, specs « 15/12 » et « 45/36 » acceptées) ; rien à faire.
3. Ordre : lots A, puis B (modèles « placer » / « barres à construire » en brouillon jusqu'au `deploy:prod`),
   puis outil C1 « placer dans un repère ».
4. Ranger des relatifs (5-122) : **étiquettes à ranger** (outil neuf, chantier à part ; sert aussi CP, 6-110).
5. Points D : **hors appli**.
6. Traduire en une expression : vérifier que le juge exige l'écriture avant d'écrire le lot.

## 6. Lot 0 : niveaux (2026-10-28)

- Relevé : `questions-5/etat-prod-2026-10-28/` (`releve-prod.ts`, lecture seule) ; nœuds déjà ceux des
  points (aucun déplacement). Données d'élèves : 0 partout (SRS, tentatives, évaluations, journal, tests,
  chapitres, favoris).
- `questions-5/lot-niveaux-5.py` (copie de `lot-rangement-6.py`) écrit la migration et la fixture
  `tests/integration/fixtures/questions-5-niveaux.json` ; test `tests/integration/questions-5-niveaux.test.ts`.
