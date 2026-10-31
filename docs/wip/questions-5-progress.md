# Chantier « questions-5 » — couvrir la 5e en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Bornes : `docs/systeme/programmes/bornes/cycle4.json` → `5.points`.

## Reprendre ici

_Mis à jour le 2026-10-30, après #2021._

- **État** : lots 1 à 3 et **4b publiés** (2f556139, 1e68327e, 1cd9dc60, d4668b2d) ; **4a** mergé (#1977), pas créé
  en prod ; correctif `virgule-forme-exigee` **mergé (#2021)**, pas en prod (`0,5n` nu accepté en forme exigée).
- **Prochaine action** : lot 5 (reste des lots A du § 3 : grandeurs, données / probabilités, proportionnalité),
  phase 0 à proposer à David ; 4a (création → migration → page à cocher → publication) après le `deploy:prod`
  qui livre #2021.
- **En attente de David** : le choix du lot 5 ; le `deploy:prod` (pour 4a).
- **Pièges en cours** : horodatages : `schema_migrations` ET worktrees ET `main` (doublon 20261030140000 vu le
  2026-10-30) ; le classifieur refuse `create-questions --mettre-a-jour` **et même `publier-lot.ts` en simulation**
  (David le lance avec `!`) ; worktree neuf : `pnpm exec svelte-kit sync` avant `create-questions` ;
  `Doc-inchangée:` dans un **message de commit** ; **jamais de variable `e` ni `i`** ; saisie MathLive de
  l'aperçu non pilotable à l'automate ; Chrome refuse parfois le redimensionnement à 390 px.
- **Worktree / branche** : aucun.

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

## 7. Lot 1 « Calcul » : décisions (David, 2026-10-28, « je valide »)

| #   | Point | Modèle                                                                  | Réponse               | Catégorie, niveau                                   |
| --- | ----- | ----------------------------------------------------------------------- | --------------------- | --------------------------------------------------- |
| 01  | 5-004 | Enchaîner des opérations (v1-v2 entiers, v3-v4 décimaux à une décimale) | case                  | Décimaux › Priorités opératoires › Enchaînements, 1 |
| 02  | 5-006 | Nommer un calcul                                                        | choix somme / produit | Entiers › Priorités opératoires › Vocabulaire, 1    |
| 03  | 5-118 | Termes et facteurs                                                      | choix parmi 4         | Entiers › Priorités opératoires › Vocabulaire, 2    |
| 04  | 5-009 | Multiples et diviseurs                                                  | choix                 | Entiers › Diviser › Multiples et diviseurs, 1       |
| 05  | 5-029 | Connaître les carrés (0 à 12)                                           | case                  | Entiers › Multiplier › Carrés, 2                    |
| 06  | 5-030 | Le cube de 10                                                           | case                  | Entiers › Multiplier › Cubes, 1                     |
| 07  | 5-032 | Calculer avec des carrés et des cubes                                   | case                  | Puissances › Calculer › Avec carrés et cubes, 1     |

Accès : brouillons (admin seul) jusqu'à la publication. Script `docs/wip/questions/lot-5-calcul.py`,
fichiers `scripts/questions/5-calcul/` ; simulation prod : 7 à créer, 59 specs vertes.

## Note de la session 3e (2026-10-28)

Le lot 0 de la 3e (PR #1921) passe **ac5d0413** (« Réduire une somme », qa + ra) de la 3e à la **5e**, tag
5-039, nœud gardé. 90dca27a et acbd2280 ne sont pas touchés par la 3e (laissés en 4e, 4-005).

## 8. Lot 1 en prod (2026-10-28)

- David a lancé `create-questions --publier` : 8e571049 (01), 2f1657b0 (02), 8df8ba2b (03), faf57d3b (04),
  be35cd63 (05), 7b08589b (06), 9d9b2301 (07), brouillons [5], sans nœud ni tag (vérifié MCP).
- Migration `20261028214500_questions_5_lot1_rangement_tags` (#1922, gabarit CM1 lot 1) : test 9/9, rouge sans
  elle, `security-auditor` sans finding ; jouée en prod par une autre session (`db push --include-all` avec les
  migrations 2de et 3e en attente) ; vérifiée : nœud du point (notion pour 5-004 et 5-032), un tag chacun.
- Page à cocher : https://claude.ai/artifact/6PS8PZmgzaniDhkr8sThzh (capacité `db`, collection `verdicts`).

## 9. Lot 1 : relecture de David (2026-10-28)

Page à cocher, 7 verdicts : 5 OK (02, 03, 04, 05, 06), 2 à revoir. Corrections validées par David (« je valide ») :

- **01** (8e571049) : « pourquoi augmenter la difficulté avec des décimaux ? L'important est de vérifier les
  priorités » → variations à entiers seulement ; les deux variations décimales passent dans un modèle neuf
  **08** (5007877e, « Enchaîner des opérations », niveau 2, 5-004).
- **07** (9d9b2301) : « la variation 4 risque d'être compliquée de tête » → v4 b ≤ 4, c ≤ 5 (≤ 120) ; v1 aussi
  resserrée (a, b ≤ 5, ≤ 125). v2 était déjà bornée (a × b ≤ 12).
- #1925 (fichiers), David : `create-questions --publier --mettre-a-jour` (01, 07 mis à jour ; 08 créé) ;
  #1927 migration `20261028233000_questions_5_lot1_08_rangement_tags` (test 8/8, rouge sans elle, audit sans
  finding), jouée par moi (seule en attente), vérifiée. Verdicts de 01 et 07 supprimés ; page republiée (v2).
- Seconde relecture (page v2) : 01, 07, 08 OK → **8/8 verdicts OK** comptés en base. `publier-lot.ts` en
  simulation : 8 brouillons passent le contrôle ; publication à lancer par David (`--publier`).

- **Publication** (2026-10-28) : David a lancé `publier-lot.ts --publier` ; 8/8 `published`, vérifié au MCP
  (8e571049, 2f1657b0, 8df8ba2b, faf57d3b, be35cd63, 7b08589b, 9d9b2301, 5007877e). **Lot 1 clos.**

## 10. Lot 2 « Relatifs » : décisions (David, 2026-10-28, « je te suis »)

| #   | Point | Modèle                                       | Réponse                        | Catégorie (Relatifs ›), niveau                             |
| --- | ----- | -------------------------------------------- | ------------------------------ | ---------------------------------------------------------- |
| 01  | 5-120 | Donner la valeur absolue d'un nombre         | case                           | Apprivoiser › Valeur absolue, 1                            |
| 02  | 5-014 | Positif, négatif, strictement ?              | choix à plusieurs réponses (½) | Apprivoiser › La définition d'un nombre négatif, 4         |
| 03  | 5-015 | Traduire une situation par un nombre relatif | case                           | Apprivoiser › Grandeurs négatives, 1                       |
| 04  | 5-019 | Additionner plusieurs nombres relatifs       | case                           | Additionner et soustraire › Sommes de plusieurs nombres, 1 |
| 05  | 5-019 | idem, décimaux                               | case                           | idem, 2                                                    |
| 06  | 5-024 | Variation de température ou d'altitude       | case, unité après la case      | Additionner et soustraire › Problèmes, 1                   |
| 07  | 5-024 | Calculer un écart                            | case, unité après la case      | idem, 2                                                    |
| 08  | 5-021 | Les parenthèses sont-elles indispensables ?  | choix Oui / Non                | Additionner et soustraire › Sommes algébriques, 5          |

- Décimaux séparés des entiers au niveau 2 (leçon du lot 1), sauf la valeur absolue (même idée) ; 5-120 dit
  « (sa distance à zéro) » ; 5-021 : on vérifie « indispensable ou non », pas la justification.
- Niveaux relevés en prod avant d'écrire : « La définition d'un nombre négatif » a 1 à 3, « Sommes
  algébriques » 1 à 4 → 02 au niveau 4, 08 au niveau 5 ; les autres catégories sont neuves.
- Accès : brouillons (admin seul) jusqu'à la publication ; la migration de rangement n'ouvre rien.
- Script `docs/wip/questions/lot-5-relatifs.py`, fichiers `scripts/questions/5-relatifs/` ; simulation prod :
  8 à créer, 62 specs vertes. Base locale : 8 créés, joués dans l'aperçu (rendu des unités °C / m après la case,
  choix à plusieurs réponses, Oui / Non, correction à `{{if:…}}` imbriqués ; « −29 » refusé pour |−29|).
  Corrigé en route : sous-marin tiré en dizaines (44 tirages sur 200 en échec), 08 avec a ≠ b (« −(9 + 9) »).
- #1935 mergé ; David : `create-questions --publier` → 0b491d0e (07), 3b9d3ec2 (01), 469f1c9d (06), 7f9d7df5 (08),
  b92b4b51 (04), c52836ad (03), d5d1f676 (05), fc8fb430 (02), brouillons [5] sans nœud ni tag (vérifié MCP).
- Migration `20261029170000_questions_5_lot2_rangement_tags` (#1941, gabarit lot 1) : horodatage choisi après les
  migrations des autres worktrees (jusqu'à `20261029150000`) ; test 9/9, rouge sans elle (5/9) ; audit sans
  finding bloquant. La ligne `Doc-inchangée:` va dans un **message de commit** (la garde ne lit pas la PR).
- #1941 mergé (CI verte, intégration comprise) ; `pnpm db:migrate` depuis le dépôt principal : la migration seule
  appliquée ; vérifié en prod : 8 brouillons sur le nœud de leur point, un tag chacun (5-014, 5-015, 5-019 ×2,
  5-021, 5-024 ×2, 5-120).
- Page à cocher : https://claude.ai/artifact/HA76Zw57mgk7o3B73GBN7A (capacité `db`, collection `verdicts`) ; une
  alerte attendue (04 / 05 homonymes). Rendu vérifié à 606 px (largeur minimale de la fenêtre), pas de défilement
  horizontal.

## 11. Lot 2 : relecture et publication (2026-10-29)

- Page à cocher : 8 verdicts « OK », aucun commentaire (compté en base).
- `publier-lot.ts` en simulation : 8 brouillons passent ; David : `--publier` → 8/8 publiés ; vérifié au MCP
  (`published` pour 3b9d3ec2, fc8fb430, c52836ad, b92b4b51, d5d1f676, 469f1c9d, 0b491d0e, 7f9d7df5). Lot 2 clos.

## 12. Lot 3 « Fractions et puissances » : décisions (David, 2026-10-29, « je te suis »)

| #   | Point | Modèle                                           | Réponse | Catégorie, niveau                                    |
| --- | ----- | ------------------------------------------------ | ------- | ---------------------------------------------------- |
| 01  | 5-027 | Problèmes : ajouter ou retrancher des fractions  | case    | Fractions › Problèmes › Additionner et soustraire, 1 |
| 02  | 5-027 | idem, dénominateurs quelconques                  | case    | idem, 2                                              |
| 03  | 5-033 | Calculer une expression avec un carré ou un cube | case    | Calcul littéral › Calculs › Avec des puissances, 1   |
| 04  | 5-033 | idem, valeur décimale                            | case    | idem, 2                                              |

- 5-027 : v1 total (a/n + b/m), v2 ce qui reste d'une quantité (a/n − b/m), v3 le reste d'un tout
  (1 − (a/n + b/m)). 01 : m = k × n ≤ 12 ; 02 : dénominateurs ≤ 6 quelconques, dénominateur commun ≤ 30 ; total
  < 1, différence > 0. Fraction non simplifiée acceptée (simplifier = 4e, comme f92d63a6). Erreur typique
  refusée : numérateurs et dénominateurs additionnés (2/3 + 1/4 → 3/7).
- 5-033 : 03 x entier (v1 a·x², v2 a·x² − b, v3 (a·x)² − b, v4 x³ + b ; x ≤ 10, cube x ≤ 5, a ≤ 5, résultat
  positif) ; 04 x décimal à une décimale (0,1-0,9 et 1,1-1,5), carré seulement (v1 x², v2 a·x², v3 x² + b).
  Erreurs refusées : 3x² ↔ (3x)², 0,3² → 0,6. Catégorie neuve (reco) plutôt que « Par substitution » 5-6, après
  un niveau 4 de 4e.
- Accès : brouillons (admin seul) jusqu'à la publication ; la migration de rangement n'ouvre rien.
- Script `docs/wip/questions/lot-5-fractions-puissances.py`, fichiers `scripts/questions/5-fractions-puissances/` ;
  simulation prod : 4 à créer, 32 specs vertes (1/2 et 10/24 acceptés, 3/7, 4/12, (3x)², 0,9 refusés). Plages de
  5-027 tirées sous le dénominateur (`1..{{eval:n-1}}`) : 3 tirages sur 150 échouaient avec des plages fixes.
  Base locale : 4 créés, joués dans l'aperçu (énoncés, réponses, corrections) ; corrigé en route : le carré coloré
  écrit `\textcolor{…}{3}^3` s'affichait « 3 ³ », toute la puissance est colorée.

## 13. Lot 3 en prod (2026-10-29)

- #1952 mergé ; David : `create-questions --publier` → a6e5acf2 (01), b30d199c (02), 027d1e21 (03), e1f18ff5 (04),
  brouillons [5] sans nœud ni tag (vérifié MCP).
- Migration `20261029213000_questions_5_lot3_rangement_tags` (#1960, gabarit lot 2) : test 9/9, rouge sans elle
  (3 échecs, 4 ignorés faute de rollback) ; audit sans finding bloquant (en-tête du test corrigé) ; CI verte,
  intégration comprise ; `db:migrate` (seule en attente) ; vérifié : nœud du point, un tag chacun.
- Page à cocher : https://claude.ai/artifact/Qqoan7rLmzYvi94SdFbbdy (capacité `db`, collection `verdicts`) ; alertes
  attendues (homonymes 01/02, 03/04). À 390 px la page débordait (colonne de grille élargie par une formule) :
  corrigé sur la page (v3) et dans le gabarit `scripts/questions/page-a-cocher.html` (PR à part).
- Relecture : **4/4 OK**, aucun commentaire (compté en base). `publier-lot.ts` : simulation verte, puis David
  `--publier` → 4/4 `published`, vérifié au MCP. **Lot 3 clos.**

## 14. Lot 4 « Calcul littéral » : décisions (David, 2026-10-29, « je te suis »)

Relevé : aucun modèle sur les 9 points ; trois modèles de 4e dans les bornes de la 5e (d4679e2d « Développer »
niv. 1, 4-022 ; e66089e0 « Trouver un facteur commun » niv. 3 et 9231b54b « Factoriser » niv. 4, 4-070).
Juge : forme exacte (`form` strict par défaut) → une valeur est refusée là où une écriture est attendue
(spec en prod de 2de1b93d : « 91 » refusé pour « 7(9 + 4) ») ; § 5 point 6 levé.

Deux lots :

- **4a** (écrire, raisonner ; catégories neuves) :

| #   | Point | Modèle                                        | Réponse         | Catégorie, niveau                                   |
| --- | ----- | --------------------------------------------- | --------------- | --------------------------------------------------- |
| 01  | 5-034 | Écrire une formule (double… prédécesseur)     | case            | Calcul littéral › Écrire › Formules, 1              |
| 02  | 5-034 | Que représente cette formule ?                | choix parmi 4   | idem, 2                                             |
| 03  | 5-124 | Formule de périmètre ou d'aire                | case            | idem, 3                                             |
| 04  | 5-037 | Somme ou produit ?                            | choix           | Calcul littéral › Reconnaître › Somme ou produit, 1 |
| 05  | 5-036 | L'égalité est-elle vraie pour x = … ?         | choix Oui / Non | Calcul littéral › Calculs › Tester une égalité, 1   |
| 06  | 5-036 | Pour quelle valeur l'égalité est-elle vraie ? | choix parmi 4   | idem, 2                                             |
| 07  | 5-041 | Quelle valeur est un contre-exemple ?         | choix parmi 4   | Calcul littéral › Raisonner › Contre-exemple, 1     |

- **4b** : 08 développer à facteur décimal (5-107), 09 factoriser ax + bx et facteur 1 (5-038), 10 et 11
  « quelle équation traduit le problème ? » (5-044 x + b = c, 5-125 ax = c ; modéliser seulement, résoudre est
  couvert par 5-045 / 5-126) ; **reclassement** de d4679e2d (→ 5e, 5-107), e66089e0 et 9231b54b (→ 5e, 5-038),
  données d'élèves vérifiées avant la migration (accès : la 4e perd ces 3 modèles, la 5e les gagne).
- Périmètre du rectangle : toute écriture équivalente acceptée (forme libre pour cette variation seulement).
- Accès : brouillons (admin seul) jusqu'à la publication.

### 14.1 Lot 4a écrit (2026-10-29)

- Script `docs/wip/questions/lot-5-litteral-a.py`, fichiers `scripts/questions/5-litteral-a/` ; simulation prod :
  7 à créer, 74 specs vertes (n + n et c + c + c + c refusés en forme ; 2(L + l), 2L + 2l, L + l + L + l acceptés ;
  n² / 2n, L + l pour l'aire refusés).
- Forme libre = `requiredForm: { pattern: 'u' }` sur la case. Aire du rectangle : `products: off` (L × l est la
  formule du programme ; sinon ½).
- Base locale : 7 créés, page à cocher locale relue. Corrigé en route : variable `e` (constante d'Euler !) dans
  « 2x + 8 + e » → `h` ; gras contenant une formule (`**le double de $n$**`) affiché avec ses astérisques ;
  énoncé du contre-exemple « double » sans `n`.
- ⚠️ **Défaut du juge, à proposer à David (PR à part)** : dans une case à forme exigée, une virgule tapée nue
  (`0,5n`) est refusée (`bad_form`) ; `checkRequiredForm` (`required-form-validator.ts`) relit la réponse sans la
  règle de la virgule nue (#520). Sans forme exigée, `0,5n` passe. Spec du lot écrite avec `0{,}5n`.

### 14.2 Lot 4a en prod, migration de rangement (2026-10-30)

- `deploy:prod` v0.58.0 (livre #2021) vérifié : déploiement Vercel `8fcd5e4f7` en succès.
- Simulation prod verte (7 à créer, 74 specs), puis David : `create-questions --publier` → 9815bed5 (01),
  eca43ba8 (02), 61ffb696 (03), ee9256c0 (04), 13d31ece (05), 8263693b (06), c18da717 (07), brouillons [5] sans
  nœud ni tag (vérifié MCP).
- Relevé `questions-5/etat-prod-2026-10-30-lot4a/` ; générateur `questions-5/lot-4a-rangement.py` (gabarit
  `lot-rangement-3-4a.py`) → migration `20261030180500_questions_5_lot4a_rangement_tags` + fixture. Nœuds : notion
  « Algèbre > Calcul littéral » (5-034, 5-124, 5-037, 5-041), sous-notion « substitution » (5-036).
- Test `questions-5-lot4a-rangement-tags.test.ts` : 19/19, rouge sans la migration (8 échecs).

## 15. Lot 4b « Calcul littéral : transformer, mettre en équation » : décisions (David, 2026-10-29, « je te suis »)

| #   | Point | Modèle                                            | Réponse       | Catégorie, niveau                         |
| --- | ----- | ------------------------------------------------- | ------------- | ----------------------------------------- |
| 08  | 5-107 | Développer avec un facteur décimal                | case          | Transformation › Développement, 2         |
| 09  | 5-038 | Factoriser ax + bx (et le coefficient 1)          | 3 cases       | Transformation › Factorisation, 3         |
| 10  | 5-044 | Quelle équation traduit le problème ? (x + b = c) | choix parmi 4 | Equations › Mettre en équation, 1 (neuve) |
| 11  | 5-125 | idem (ax = c)                                     | choix parmi 4 | idem, 2                                   |

- **Niveaux** (reco acceptée) : insérer 08 et 09, **décaler de +1** les niveaux qui suivent, dans la migration de
  rangement : Développement 32a81f6f, 54107079, 1703620c, 9fefb94c (2-5 → 3-6) ; Factorisation e66089e0, 9231b54b,
  3abfcd7b, d7f2568a, 39c5bcfa, 11607586, dac2e771, 2120ce5f, dcaabf69 (3-11 → 4-12). Garde : niveaux relevés le
  2026-10-29.
- **Reclassement** : d4679e2d (4e → 5e, 4-022 → 5-107, niveau 1), e66089e0 et 9231b54b (4e → 5e, 4-070 → 5-038).
  Mêmes nœuds (`développement`, `factorisation` = nœuds des points de 5e) : rien ne bouge dans l'arbre.
- **Données d'élèves** (MCP, 2026-10-29) : 0 carte SRS, 0 tentative, 0 question d'évaluation, 0 activité de journal,
  0 relecture, sur les 3 reclassés et sur les 13 décalés.
- **Accès** (tranché par David) : la 4e ne voit plus les 3 modèles reclassés, la 5e les voit ; le décalage ne change
  que l'ordre ; les 4 neufs restent en brouillon ; aucune règle ne change. Rectifié par l'audit : un brouillon
  est lisible par l'admin ET le prof, et ses tags (pas son contenu) par tout compte connecté — déjà vrai avant.

### 15.1 Lot 4b écrit (2026-10-29)

- Script `docs/wip/questions/lot-5-litteral-b.py`, fichiers `scripts/questions/5-litteral-b/` ; simulation prod :
  4 à créer, 37 specs vertes (0,5x + 2 accepté virgule nue ou `{,}`, 2 + 0,5x accepté ; 0,5x + 4, 0,5x + 0,2 refusés ;
  0,5x + 0,5 × 4 en `bad_form` ; coefficient 0 pour « x » seul refusé ; x = c + b et x = a × c refusés).
- 08 sans forme exigée : la virgule nue passe, **pas de dépendance** à `virgule-forme-exigee`.
- Base locale : 4 créés (535e78b2, c5e8bacc, ab5056b0, b0832fdb), page à cocher locale relue (virgules, cases de
  09, corrigés). Corrigé en route : énoncé de 08 sans `= ?` (« 0 case dans l'énoncé »).

### 15.2 Lot 4b en prod, migration de rangement (2026-10-29)

- David : `create-questions --publier` → 2f556139 (08), 1e68327e (09), 1cd9dc60 (10), d4668b2d (11), brouillons [5]
  sans nœud ni tag (vérifié MCP).
- Relevé `questions-5/etat-prod-2026-10-29-lot4b/` (18 modèles) ; générateur `questions-5/lot-4b-rangement.py`
  (copie étendue de `lot-niveaux-5.py` : nœud d'avant vide, rang dans la catégorie) → migration
  `20261030010500_questions_5_lot4b_rangement` + fixture. Rangs posés un modèle à la fois, décroissant (index « un
  publié par catégorie et par niveau ») ; garde : aucun publié hors du lot au rang visé.
- dcaabf69 (3e, `scripts/questions/3-lot-2/02-…`) : fichier et `lot-3-2.py` passés au niveau 12 (clé de
  `create-questions`) ; entre le merge et le `db:migrate`, `create-questions` sur `3-lot-2` le verrait « à créer ».
- Test `questions-5-lot4b-rangement.test.ts` : 21/21, rouge sans la migration (15 échecs). `security-auditor` :
  aucun bloquant (gardes vérifiées sur la prod réelle ; seule rectification, la phrase d'accès ci-dessus).

### 15.3 Lot 4b publié (2026-10-30)

- Page à cocher https://claude.ai/artifact/C1ka72wJ4FC41UxmK4Rrhg : alertes = homonymes attendus seulement
  (10 → 1cd9dc60 niv. 1, 11 → d4668b2d niv. 2) ; verdicts 4/4 OK, sans commentaire.
- `publier-lot.ts` (simulation puis `--publier`) lancé par David ; MCP : les 4 en `published`. Lot 4b clos.

### 15.4 Correctif de la virgule nue (2026-10-30, #2021)

- `checkRequiredForm` relit la virgule nue en décimal (`mathAST/decimal-comma`, règle de #520), sauf écriture à
  virgule séparatrice jugée sur la réponse. Revue Opus : aucun finding bloquant ; test du couple rendu discriminant.
