# Chantier « questions-cm1 » — couvrir les points du CM1 en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Chantier de référence : le CP ([questions-progress.md](questions-progress.md)).

## Reprendre ici

_Mis à jour le 2026-10-27, relevé fait._

- **État** : relevé et état des lieux faits (§ 1-3) ; rien d'écrit en base ni dans le code.
- **Prochaine action** : réponses de David aux questions du § 4, puis phase 0 du lot 0 (corrections) ou du lot 1.
- **En attente de David** : les 6 questions du § 4.
- **Pièges en cours** : niveaux relevés parmi les publiés de la catégorie AVANT l'écriture ; case « choix » en prod (v0.51.0) mais QCM pas encore migrés ; droite à placer mergée, pas en prod.
- **Worktree / branche** : aucun.

## 1. Relevé (prod, MCP lecture seule, 2026-10-27)

- **171 points** au CM1 ; **22** ont au moins un modèle tagué : 006 (5), 008, 011 (3), 020 (2),
  021, 026, 030 (7), 154, 155 (3), 034, 132 (2), 162, 039 (2), 133 (2), 040, 041, 042, 044 (2),
  045 (2), 047 (7), 049, 061 (12).
- **84 modèles** `grades ∋ CM1`, tous publiés, tous rangés sur un nœud ; **58 tagués, 26 sans tag**.
- Thèmes couverts : Entiers, Décimaux, Fractions (calcul et numération) ; **aucun modèle** en
  grandeurs, géométrie, données, probabilités, proportionnalité, problèmes.

## 2. Vérification de l'existant

La passe « arbre des notions » a jugé les 84 modèles CM1 le 2026-10-18
(`docs/archive/wip/arbre-notions/analyse/cm.csv`, `cm-notes.md`) : 49 TAG, 9 MODIFIER, 26 HORS_PROGRAMME.
Ses verdicts font foi.

- **Les 9 MODIFIER sont faits en prod** (mises à jour du 2026-10-20 au 23, vérifiées au MCP) :
  `3bbe92f2`, `f1a392f5`, `b100ddb2`, `b9a9048a` (un seul rang ajouté / soustrait), `9c0c47ef`,
  `0021eee7` (comparer avec <, =, >), `bd760867` (4 à 6 chiffres), `59b781cc` (V2 × 25 retirée),
  `0d4765d8` (dénominateurs ≤ 20).
- **Les 26 HORS_PROGRAMME** sont restés au niveau CM1, sans tag : leur changement de niveau (« à
  part ») n'a jamais été fait. Deux groupes :
  - **relèvent du CM2** (point existant) : × 100 / × 1 000 d'un décimal `e38d205a`, `19323604`,
    `aa788ca7`, `ac2dae38` (CM2-042) ; encadrer au dixième `32724446` (CM2-117) ; dizaines ×
    dizaines `4643ed4a`, `a5d5a7a0` (CM2-046) ; entier × fraction `e320755f`, `8fa3108c` (CM2-021) ;
    moitié des impairs `edc5d7d4` (CM2-037, mais tire jusqu'à 29) ; formes décimales usuelles
    `322f3479` (CM2-039 sans 2/1000) ;
  - **aucun point au cycle 3** (calcul en ligne avec retenue, hors calcul mental du BO) : sommes et
    différences de décimaux avec retenue `a0241952`, `ff3ee576`, `6a16303a`, `7d57fb3b` ;
    regroupements `0a93ac99`, `08bbf1c6` ; encadrer au centième `6379fa20` (3 décimales) ; entiers
    à 3 chiffres en ligne `5d4dfd32`, `fe9df9ba`, `08fbcd26` ; complément à 10 000 `17a3c039` ;
    quotients en ligne `61baef92`, `09f22a2f`, `4ee04b22` ; zéros inutiles `cda36cc2`.

## 3. Les 149 points sans modèle

- **A. Texte / formule seuls (84)** :
  - entiers 001, 002, 131 (unités de numération en texte : « 17 unités, 8 dizaines, 31 centaines et
    2 milliers », la `collection` ne monte pas au millier), 003, 004, 005, 007, 009, 012, 013, 141, 142 ;
  - fractions 014, 015, 016, 017, 022, 023, 024, 027, 028, 029, 148, 152, 153 ;
  - décimaux 031, 033, 158, 159, 160 ;
  - calcul mental 035, 161, 036 (tables), 037, 038 (1/10 et 1/100 seulement), 043, 163, 046, 164,
    048 (estimer : choix) ;
  - problèmes 054, 134, 055, 056, 057, 058, 059, 060 ; algèbre 062, 063, 064, 065 ;
  - longueurs 067, 068, 069, 070, 071, 072, 075 ; masses 076-081 ; contenances 082-085 ;
    durées 095 ; figures 103 ; solides 110-113 ; déplacements 117 ;
  - probabilités 123-128 ; proportionnalité 129, 130.
- **B. Outil existant (45)** :
  - `line` (lire un point) : 143, 019, 147, 151, 157 ;
  - `figure` (partage, quelle part ?) : 145, 150, 156 ;
  - `operation` : 050, 165 (décimaux en colonnes), 051, 052, 053 (division euclidienne) ;
  - `horloge` : 092, 094, 166 ; 093 en choix de cadrans (puis horloge à placer, ci-dessous) ;
  - `figure` : périmètre 073, 074 (règle graduée dessinée, à vérifier) ; aires sur quadrillage
    086, 087, 088 ; angles 089, 090, 091 (sans degré) ; codes 098 ; cercle 099 ; reconnaître
    perpendiculaires / parallèles 100, 101 ; figures usuelles 102 ; axes de symétrie 106 ;
    motifs 066 ; robot sur quadrillage 118 (comme CP-067) ;
  - images fixes : solides 109, patrons du cube 115 ;
  - tableaux et graphiques : 120 (`tableau-croise` à trous), 121, 169, 137, 170 (tableaux),
    138, 171 (`barres`), 139, 172 (`courbe`), 122.
- **C. Outil neuf ou pas encore en prod (13)** :
  1. **Droite à placer** (chantier `reponses-a-placer`, mergée #1846→#1860, **pas en prod**) →
     010, 018, 146, 025, 032. Rien à créer : lots en brouillon jusqu'au `deploy:prod`.
  2. **Horloge à placer** (#1872, pas en prod) → 093 en vrai geste.
  3. **Barres à monter** (`reponses-a-placer`, phase 0 validée, pas codé) → 135.
  4. **Fractions à colorier** (décidé au CE1, pas commencé) → 144, 149.
  5. **Points à placer dans un repère** → 136 (patron de la droite à placer, en 2D) : outil à proposer.
  6. **Figure à compléter / tracer** (chantier `figure-et-choix`) → 107, 108 (symétrique sur
     quadrillage), 167, 168 (perpendiculaire, parallèle par un point).
- **D. Non évaluables sans manipulation (7)** : 140 (suite orale), 097 (outils), 104, 105
  (construire aux instruments), 114, 116 (construire un solide, un patron), 119 (assemblages de cubes).

## 4. Questions à David

1. **Les 26 hors programme** (§ 2) : les 11 qui relèvent du CM2 passent en **CM2** (niveau changé,
   tag du point CM2 ; `edc5d7d4` et `322f3479` bornés d'abord) ; les 15 sans point : **retirer CM1
   de leurs niveaux** et les laisser sans tag (jamais supprimés) ? Reco : oui aux deux, en lot 0.
2. **Tables** (035, 161, 036) : les modèles de tables existent au CE1 / CE2, mais un modèle = un
   point. Écrire des modèles CM1 (tables mélangées 0 à 10, révision) ou laisser ces points sans
   modèle propre ? Reco : modèles CM1, tables mélangées.
3. **Forme des choix** : la case « choix » est en prod (v0.51.0) ; je l'écris partout où il y a un
   choix (comme la 6e), jamais l'ancien QCM. D'accord ?
4. **Outils (C)** : ordre proposé — lots « droite à placer » dès son `deploy:prod` ; barres
   (déjà en cours) ; puis fractions à colorier (sert CE1, CE2, CM1) ; points dans un repère plus
   tard ; 107, 108, 167, 168 après `figure-et-choix`.
5. **Points D** : laissés sans modèle ?
6. **Ordre des lots** : 0 corrections → 1 calcul mental (043, 163, 046, 164, 037, 038) → 2 numération
   entiers (003, 004, 005, 007, 009, 141, 142, 012, 013) → 3 fractions → 4 décimaux → 5 grandeurs
   (unités et conversions) → 6 problèmes → 7 données (tableaux, barres, courbes) → 8 géométrie
   dessinée → probabilités, proportionnalité → lots à outils neufs.
