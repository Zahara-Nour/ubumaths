# Chantier « questions-cm2 » — couvrir les points du CM2 en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Chantiers voisins : CE1 ([questions-ce1-progress.md](questions-ce1-progress.md)), 6e
> ([questions-6-progress.md](questions-6-progress.md)).

## Reprendre ici

_Mis à jour le 2026-10-27, relevé fait._

- **État** : relevé, vérification de l'existant et classement des 144 points sans modèle écrits (§ 1-3) ; rien en base, aucun fichier de modèle.
- **Prochaine action** : réponses de David aux questions du § 4, puis phase 0 du lot 0 (changements de niveau) ou du lot 1.
- **En attente de David** : les 7 questions du § 4.
- **Pièges en cours** : la case « choix » (ADR 0033) est mergée mais pas en prod ; droite et horloge à placer mergées, pas en prod ; l'horloge n'a pas de trotteuse ; niveaux relevés parmi les publiés de la catégorie AVANT l'écriture.
- **Worktree / branche** : aucun.

## 1. Relevé (prod, MCP lecture seule, 2026-10-27)

**158 points** du CM2. **14 ont au moins un modèle tagué** : 003 (2), 008, 014, 026, 030 (6), 039,
042, 043 (3), 046, 047 (9), 054, 065 (9), 141, 142 (3). **144 points sans modèle.**

**51 modèles** dont les niveaux contiennent le CM2 : tous publiés, tous rangés sur un nœud ; 40 tagués,
11 sans tag. Deux sont partagés avec la 6e (`819df2a9` × 10 / 100 / 1 000, `d793de49` produit par
décomposition), retouchés par le chantier de 6e (#1849).

## 2. Vérification de l'existant

La passe « arbre des notions » a jugé les 44 modèles du CM2 alors en base
(`docs/archive/wip/arbre-notions/analyse/cm.csv`, décisions de David du 2026-10-20) ; ses verdicts
font foi.

- **Tagués** : conformes. Les 4 retouches qu'elle demandait sont **faites en prod** (vérifié le
  2026-10-27) : `45e06ece` et `a94ddf87` (q ≤ 3 − a, trois décimales au plus), `0dd3de90` (a = 4..9,
  neuf chiffres au plus), `dd7db98e` (liste des fractions du point CM2-039).
- **Sans tag au CM2 (11, HORS_PROGRAMME)**, leur changement de niveau n'a jamais été fait :
  - `9c03423a`, `e81493f7` (critères de divisibilité par 9 et par 3) : place en 5e (5-010 / 5-119), selon la
    décision de David du 2026-10-20 ;
  - `7f0fbff0` (1,8 : 9), `3c40e59b` (9 × 0,07), `814a46a9` (9 × 9,3) : calcul réfléchi décimal × ou ÷
    entier, aucun point de calcul mental CM2 ;
  - `4b543657`, `918598f5`, `9826af8b` (produits astucieux à trois facteurs) ;
  - `32351845` (× 25), `e009f9d0` (× 50 d'un entier ≥ 20), `e58b1357` (produits « par cœur » hors tables).
- **Modèles de CM1 jugés « relève du CM2 » (12)**, toujours en CM1 sans tag :
  - CM2-117 encadrer au dixième / au centième : `32724446`, `6379fa20` ;
  - CM2-042 × 100, × 1 000 d'un décimal : `e38d205a`, `19323604` ;
  - CM2-046 dizaines × dizaines : `4643ed4a` ;
  - CM2-065 à trou : `aa788ca7` (? × 100), `ac2dae38` (? × 1 000), `a5d5a7a0` (90 × ? = 8 100) ;
  - CM2-021 entier × fraction : `8fa3108c` (9 × 9/4), `e320755f` (9 × 1/10) ;
  - CM2-039 : `322f3479`, à retoucher (liste du point), et alors doublon de `dd7db98e` ;
  - CM2-037 moitié des impairs : `edc5d7d4`, tire 1 à 29 (le point s'arrête à 15).
- **Modèles d'un autre niveau tagués sur un point jumeau** (même libellé) : CM2-005 (`0021eee7` CM1,
  QCM « le plus petit », `68775a97` CE2), CM2-019 (`0d4765d8`, `9089828a` CM1), CM2-020 (`acfdddb3`
  CM1, `58bbee5d` 6e), CM2-034 (`9c0c47ef` CM1, QCM), CM2-117 (`b26e8a84`, `fac5225d` CM1), CM2-147
  (`2e982062` 6e), CM2-149 (`7caa084f` CM1). Leurs nombres sont ceux de leur niveau, pas les exemples du
  CM2 (neuf chiffres, millièmes, dénominateurs ≤ 60).

## 3. Les 144 points sans modèle

Outils relus (doc § 3 bis, `ubumark.md`) : droite à placer (`placer:`, entiers, décimaux, fractions)
et horloge à placer **mergées, pas en prod** ; barres à placer en cours (`reponses-a-placer`) ; case
« choix » mergée, pas en prod ; **pas de trotteuse** sur ` ```horloge ` ; ` ```nuage ` ne relie pas
ses points ; fractions à colorier : décidées au CE1, chantier pas ouvert.

- **A. Texte / formule seuls (84)** :
  - entiers : 001, 002, 004, 005, 127, 128, 006 ;
  - divisibilité : 130, 009, 010, 011, 012 ;
  - fractions : 013, 015, 016, 019, 020, 135, 021, 022 ;
  - fractions décimales : 023, 024, 027, 028, 139, 140, 029 ;
  - décimaux : 031, 033, 145, 034, 146, 117, 147 ;
  - calcul mental : 035, 148, 036, 149, 037, 038, 040, 118, 041, 044, 045, 150, 048, 049, 050, 151, 051,
    052, 053 (estimation, case « choix ») ;
  - problèmes : 058, 119, 059, 060, 061, 062, 063, 064, 066 ;
  - algèbre : 067, 152 (case « choix » entre programmes), 068 ;
  - aires : 073, 074, 075, 120 ; angle droit 081 ; durées 085 ;
  - géométrie (vocabulaire, propriétés) : 091, 093 ; solides : 099 ; déplacements : 103 ;
  - données : 107, 156 (tableau markdown) ;
  - probabilités : 109, 110, 111, 112, 113 ;
  - proportionnalité : 115, 116.
- **B. Outil existant (37)** :
  - droite **à placer** (brouillons jusqu'au `deploy:prod`) : 007, 017, 133, 025, 032 ; droite **lue** :
    129, 018, 134, 138, 144 ;
  - `figure` (parts coloriées à lire) : 132, 137 ; motifs : 069, 070 ; aires sur quadrillage : 071, 072 ;
    angles : 076, 077, 078 ; codes : 088 ; perpendiculaires / parallèles reconnues : 089, 090 ; figures
    usuelles : 092 ; robot sur quadrillage (comme CP-067) : 104 ;
  - `operation` : 055, 056, 057 (division décimale : à vérifier que la saisie va jusqu'aux centièmes) ;
  - `barres` : 123, 157 ; `circulaire` : 124, 158 ; mélange : 108 (sauf courbe, ci-dessous) ;
  - `probtree` / `tableau-croise` : 114 ;
  - images fixes : 098, 100, 102 (solides, patrons), 105 (assemblages de cubes, vues).
- **C. Outil neuf (16, dont 5 tracés en attente de la case « figure »)** :
  1. **Trotteuse** sur ` ```horloge ` (lire et placer des secondes) → 082, 083, 084, 153. Petit,
     prolonge un bloc.
  2. **Fractions à colorier** (déjà décidées au CE1, chantier pas ouvert) → 131, 136, 143 ; d'ici là,
     possible en case « choix » entre figures.
  3. **Barres à placer** (en cours dans `reponses-a-placer`) → 121.
  4. **Courbe de données** (points reliés : option `relier:` de ` ```nuage `, ou ` ```courbe ` à
     vérifier) → 125, 159.
  5. **Points à placer dans un repère** → 122.
  6. Tracés (perpendiculaire, parallèle, figures, symétrique) → 154, 155, 094, 095, 097 : **case
     « figure »** du chantier `figure-et-choix`, pas un outil neuf ; après sa mise en prod.
- **D. Non évaluables dans l’appli (7)** : 126 (suite orale), 087 (manier les instruments), 079 et
  080 (gabarit, pliage), 096 (rédiger un programme de construction), 101 (construire un patron), 106
  (recueillir des données).

## 4. Questions à David

1. **Lot 0, changements de niveau.** Les 12 modèles de CM1 « relève du CM2 » passent au CM2 et sont
   tagués (`edc5d7d4` borné à 1..15, `322f3479` dépublié comme doublon de `dd7db98e`) ? Les 11
   modèles du CM2 hors programme : `9c03423a` / `e81493f7` en 5e ; les 9 autres en 6e si un point de 6e les
   décrit (je cherche en phase 0), sinon dépubliés (jamais supprimés) ?
   **Reco : oui aux deux.**
2. **Modèles jumeaux** (§ 2, dernier point) : ajouter le CM2 à leurs niveaux, ou écrire des modèles
   CM2 dans les bornes du CM2 ? **Reco : modèles CM2 propres** (les nombres du CM2 sont plus grands).
3. **Forme des QCM** : case « choix » (mergée, en brouillon jusqu'au `deploy:prod`) ? **Reco : oui**.
4. **Outils (C)** : lesquels, dans quel ordre ? **Reco** : trotteuse (petit), puis fractions à
   colorier (sert CE1 → CM2), puis courbe de données ; barres à placer finit dans son chantier ;
   points dans un repère plus tard.
5. **Points D** : laissés sans modèle ? Tracés (154, 155, 094, 095, 097) après la case « figure » ?
6. **Ordre des lots.** **Reco** : 0 changements de niveau → 1 entiers (001, 002, 004, 005, 127, 128, 006) → 2 divisibilité (130, 009-012) → 3 calcul mental entiers (035, 148, 036, 149, 045, 150, 050, 151) → 4 calcul mental décimaux (037, 040, 118, 041, 044, 048, 049, 051, 052) → 5 fractions → 6
   fractions décimales et décimaux (deux lots) → 7 droites graduées (brouillons) → problèmes →
   grandeurs → données → probabilités → géométrie.
7. **Premier lot** : le lot 0 (corrections avant lots neufs, comme au CE1), ou le lot 1 en même temps
   (fichiers différents, deux worktrees) ?
