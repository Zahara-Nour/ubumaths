# Chantier « questions-cm2 » — couvrir les points du CM2 en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Chantiers voisins : CE1 ([questions-ce1-progress.md](questions-ce1-progress.md)), 6e
> ([questions-6-progress.md](questions-6-progress.md)).

## Reprendre ici

_Mis à jour le 2026-10-30, après #2005._

- **État** : lots 1 et 2 publiés. Lot 3 : 5 brouillons en prod (#2005) ; migration de rangement `20261030150000` écrite et testée (§ 8.3), PR en cours.
- **Prochaine action** : `security-auditor` → PR → CI verte → merge → `db:migrate` depuis le dépôt principal → vérifier au MCP (5 nœuds + tags, 3 modèles {CM1,CM2} + 2 tags chacun) → page à cocher du lot 3.
- **En attente de David** : rien.
- **Pièges en cours** : `curriculum_points` n'a pas de colonne `label` ; relever la prod avant toute écriture ; horodatages de migration partagés → vérifier `origin/main` ; `db:migrate` pousse TOUTES les migrations en attente ; énoncé sans `?` = « Blank count mismatch » ; quotient décimal : `{{eval:…;d}}` ; specs ≥ 4 chiffres avec espaces ; `wrapDynamicImport` en CI = `gh run rerun --failed`.
- **Worktree / branche** : `ubumaths-wt-questions-cm2` · `feat/questions-cm2-lot3-rangement`.

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

## 4 bis. Décisions (David, 2026-10-28)

Recommandations suivies en bloc (« tes recos ? » puis « go ») : lot 0 d'abord et seul ; changements
de niveau (CM1 → CM2 ; hors programme CM2 → 6e ou 5e si un point les décrit, sinon dépubliés) ;
modèles CM2 propres plutôt que les jumeaux ; QCM en case « choix » ; outils : trotteuse, fractions à
colorier, courbe de données ; points D sans modèle, tracés après la case « figure » ; ordre des lots
du § 4.6.

## 5. Lot 0 : changements de niveau — phase 0 (proposée le 2026-10-28)

Relevé du 2026-10-28 : **0 donnée d'élève** sur les 23 modèles (chapter_exercises,
evaluation_attempt_questions, journal_entry_activities, skill_attempts, srs_cards, test_answers,
user_favorite_templates). Tirages relus (`question:specs --apercu 6`, specs toutes vertes). La
catégorie (thème / domaine / sous-domaine) et le niveau ne bougent pas : aucune collision de niveau.
Comme au CE1 : **deux migrations**, contenu (1 modèle, instantané md5 d'abord) puis rangement / tags /
niveaux scolaires / statut.

**Contenu réécrit** : `edc5d7d4` Trouver la moitié, `a1` 0..14 → **0..7** (impairs 1 à 15 au lieu de
1 à 29) ; sous-titre « Nombres impairs de $1$ à $15$ ».

**CM1 → CM2, tagués** (nœud gardé sauf mention) :

| Modèle                      | Exemple tiré                | Point   | Nœud                                              |
| --------------------------- | --------------------------- | ------- | ------------------------------------------------- |
| `32724446`                  | … < 3,25 < … (au dixième)   | CM2-117 | encadrement                                       |
| `6379fa20`                  | … < 3,258 < … (au centième) | CM2-117 | encadrement                                       |
| `e38d205a`, `19323604`      | 53,1 × 100 ; 0,07 × 1 000   | CM2-042 | multiplication (décimaux)                         |
| `4643ed4a`                  | 40 × 30                     | CM2-046 | calcul astucieux                                  |
| `aa788ca7`, `ac2dae38`      | 100 × ? = 7 276             | CM2-065 | **→ Premiers pas algébriques > égalités à trous** |
| `a5d5a7a0`                  | ? × 20 = 1 200              | CM2-065 | **→ égalités à trous**                            |
| `8fa3108c`, `e320755f`      | 5/7 × 2 ; 1/9 × 4           | CM2-021 | multiplication (fractions)                        |
| `edc5d7d4` (après retouche) | moitié de 9 → 4,5           | CM2-037 | division (décimaux)                               |

**CM2 → 6e, tagués** (nœud gardé, déjà celui du point) :

- `7f0fbff0` 1,2 : 6 → **6-121** (diviser un décimal par un entier < 10) ;
- `3c40e59b` 2 × 0,06, `814a46a9` 5,9 × 2 → **6-118** (produit de deux décimaux) ;
- `4b543657`, `918598f5`, `9826af8b` (produits astucieux à trois facteurs : 0,2 × 11 × 50 ;
  20 × 97,281 × 5) → **6-118**, comme le chantier de 6e tague les sommes astucieuses sur 6-114.

**CM2 → 5e, tagués** : `e81493f7` (critère par 3) → **5-010**, `9c03423a` (par 9) → **5-119**.

**Repassés en brouillon** (niveaux, nœud, catégorie gardés ; jamais supprimés) :

- `32351845` (8 × 25, 12 × 25) et `e58b1357` (5 × 18, 6 × 15, 4 × 25) : aucun point du CM2 ni de 6e ;
- `e009f9d0` (× 50) : sa variation paire (4 × 50, 16 × 50) entre dans CM2-052, l'impaire non ;
  dépublié, CM2-052 aura un modèle propre (décimaux, 50 × 12,4) au lot 4 ;
- `322f3479` (CM1, forme décimale : 2/10, 2/1 000 hors de CM2-039) : doublon de `dd7db98e`.

**Question d'accès** (avant le SQL) — qui pourra lire quoi qu'il ne lisait pas ? Les élèves et le prof
du **CM2** : 11 modèles publiés de plus ; de **6e** : 6 ; de **5e** : 2. En miroir, qui ne lira plus ce
qu'il lisait ? Ceux du **CM1** : 12 modèles (11 passés au CM2, `322f3479` en brouillon) ; ceux du
**CM2** : 11 (8 partis en 6e / 5e, 3 en brouillon). Aucune règle (policy) ne change.

### 5.1 Lot 0 : ce qui s'est passé (2026-10-28)

- Écrit : migration de contenu (`edc5d7d4`) + migration de rangement (22 modèles), tests verts / rouges sans elles, `security-auditor` sans finding bloquant (présence partielle refusée au rollback, ajouté).
- Avant le merge, message de la session `questions-cm1` : son lot 0 (#1893, joué en prod) a déjà passé au CM2 les 12 modèles venus du CM1 (dont `edc5d7d4`, même retouche, et `322f3479`, réécrit et tagué CM2-039 au lieu d'être dépublié), et a pris les mêmes horodatages de migration. Vérifié au MCP.
- #1896 réduite aux 11 modèles du CM2, horodatage `20261028120000`, migration de contenu retirée ; test 19 verts, 10 rouges sans la migration.
- 2026-10-28 : #1896 mergée (CI verte, 16/16) ; `db:migrate` refusé (`DbPushMissingRemoteError`, 20261028130000 / 130100 déjà jouées par d'autres sessions) → `db push --include-all` après `--dry-run` (seule la nôtre listée) ; vérifié au MCP ; worktree et branche retirés.

## 6. Lot 1 — entiers : phase 0 (validée par David le 2026-10-28)

Relevé MCP du 2026-10-28 : les 7 points n'ont toujours aucun modèle (#1893 n'en a pas tagué).
Bornes `cycle3.json`, CM2 : entiers d'au plus neuf chiffres (≤ 999 999 999), neuf rangs, ranger
jusqu'à cinq nombres, unités de numération jusqu'aux centaines de millions. Case seule ou case
« choix » (bloc ` ```choix `, **en prod depuis v0.54**) ; règle de l'école « espaces dès 4
chiffres » (comme le lot « nombres » de 6e). Tous `Entiers / Apprivoiser`.

Niveaux relevés parmi tous les modèles de la catégorie (publiés et brouillons) : Ecriture 1-15,
Décomposition 1-14, Comparer 1-7, Encadrer 4-8 → on prend la suite.

| #   | Point   | Sous-notion   | Modèle                                       | Variations, plages                                                                                                                                                                                                                                         | Catégorie, niveau |
| --- | ------- | ------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| 1   | CM2-001 | décomposition | Unités de numération                         | V1 « 7 millions, c'est ? milliers » (unités de mille à centaines de millions, l'une dans l'autre) ; V2 l'inverse (« 4 000 dizaines de mille, c'est ? millions ») ; V3 « 35 centaines de mille, c'est ? » en millions et centaines de mille (non canonique) | Décomposition, 15 |
| 2   | CM2-001 | décomposition | Le nombre de milliers, de dizaines de mille… | V1 « Quel est le nombre de milliers dans 12 342 320 ? » (dizaines à millions, 7 à 9 chiffres) ; V2 problème « 12 342 320 pailles, des cartons de 10 000 : combien de cartons pleins ? » (cartons de 100 à 1 000 000)                                       | Décomposition, 16 |
| 3   | CM2-004 | décomposition | La valeur d'un chiffre                       | V1 chiffre d'un rang (« chiffre des dizaines de mille de 845 273 018 ? ») ; V2 valeur du chiffre coloré (« 7 dans 4 712 305 vaut ? » → 700 000) ; V3 case « choix » : le rang du chiffre coloré (unités de mille, dizaines de mille…)                      | Décomposition, 17 |
| 4   | CM2-002 | écritures     | Le nombre qui suit, le nombre qui précède    | V1 suit, sans passage ; V2 suit, avec passage (… 999 → … 000, jusqu'à 999 999 → 1 000 000) ; V3 précède, avec passage (… 000 → … 999) ; nombres de 6 à 9 chiffres                                                                                          | Ecriture, 16      |
| 5   | CM2-005 | ordre         | Comparer deux grands nombres                 | Case « choix » `<`, `=`, `>` ; V1 même nombre de chiffres, deux chiffres échangés (3 405 270 … 3 450 207) ; V2 nombres de chiffres différents, le plus long commence par un petit chiffre (987 654 … 1 023 456) ; 6 à 9 chiffres                           | Comparer, 8       |
| 6   | CM2-006 | ordre         | Ranger cinq grands nombres                   | V1 croissant, V2 décroissant ; comme au CE1 : quatre nombres du même million dont deux aux chiffres échangés, plus un nombre d'un chiffre de moins ; 7 à 9 chiffres                                                                                        | Comparer, 9       |
| 7   | CM2-127 | ordre         | Encadrer un grand nombre                     | Deux cases « ? < 3 405 270 < ? » ; entre deux milliers, deux dizaines de mille, deux centaines de mille ou deux millions qui se suivent (rang tiré) ; 7 à 9 chiffres                                                                                       | Encadrer, 9       |
| 8   | CM2-128 | ordre         | Intercaler un grand nombre                   | Une case « 3 405 270 < ? < 3 450 207 », toute réponse strictement entre est juste ; V1 écart large ; V2 écart de 2 (une seule réponse) ; V3 à un passage (999 998 < ? < 1 000 000)                                                                         | Encadrer, 10      |

Corrigés : classes de trois chiffres, rang par rang (comme 6-101). Erreurs typiques en
`testSpecs` : rang voisin, chiffre au lieu du nombre de, zéros oubliés au passage, « plus de
chiffres donc plus petit » inversé, borne recopiée à l'intercalation.

**Question d'accès** : modèles neufs en **brouillon**, puis migration nœud + tag sur ces
brouillons → **personne** ne lit rien de plus (un brouillon n'est visible que de l'admin / du prof).

**Point d'attention** : la session `questions-cm1` prévoit son lot 2 « numération entiers » (003,
004, 005, 007…) dans les mêmes catégories → je la préviens des niveaux pris ici avant d'écrire.

### 6.1 Lot 1 : décisions (David, 2026-10-28)

Recommandations suivies (« tes recos ? » puis « go ») : le tableau tel quel, CM2-001 en deux
modèles ; `322f3479` **dépublié** (doublon exact de `dd7db98e`, CM2-039), dans la migration de
rangement du lot 1. Session `questions-cm1` prévenue : son lot 2 prend Décomposition 18+, Ecriture
17+, Comparer 10+, Encadrer 11+.

### 6.2 Lot 1 : écriture (2026-10-28)

- Script `lot-cm2-1.py` → `scripts/questions/cm2-1/` (8 fichiers). `create-questions` en simulation : tout vert du premier coup ; tirages relus à la main (accords, chiffre unique, case « choix ») : justes.
- « Le chiffre 7 de 4 712 305 » : une condition par rang (`i>=c || i==r || chiffre≠ch`) garantit que le chiffre n'apparaît qu'une fois dans le nombre.
- Aperçu admin local (port 5179) : case « choix » de Comparer jugée juste, correction lisible ; Ranger : la liste des 5 nombres était une seule formule et aurait débordé sur un téléphone → une formule par nombre.
- #1909 (fichiers seuls, revue : aucune) mergée, CI verte.

### 6.3 Lot 1 : relecture (David, 2026-10-28) et corrections (2026-10-29)

Page à cocher : 8 verdicts sur 8. OK : 0372fe18, 2953c9c0, 41e8421f, 69ea8b2a, d6466135, d9872d4f.

- **41e8421f** (nombre de milliers), OK avec une question : « que vient faire la variation 2 (division
  euclidienne) ici ? ». Réponse : les cartons font toujours 100, 1 000, 10 000… ; le nombre de cartons
  pleins **est** le nombre de centaines, de milliers…, lu dans l'écriture. David : **la garder**.
- **8e1f6003** (valeur d'un chiffre), à revoir : « que vaut le chiffre 8 » n'est pas clair (8, c'est 8,
  pas 800). David choisit « combien d'unités » : « Dans le nombre 4 712 305, le chiffre 7 représente
  combien d'unités ? Il représente ? unités. » ; correction : « il représente 7 centaines de mille,
  c'est-à-dire 700 000 unités ».
- **7d258acc** (ranger cinq nombres), à revoir : « ce modèle utilise l'outil ranger des étiquettes ? ».
  Réécrit en ``ranger (étiquettes dans le bon ordre, `signe: <` / `>`), plus de permutations `o`
ni de `x1…x5`. Specs : positions affichées au mélange de la graine 0, relevées avec le générateur
(croissant : s2 s3 s4 s5 s1 → `4 0 1 2 3`). David : réécrire maintenant, publier après le
`deploy:prod` qui livre ``ranger.
- `create-questions` en simulation (prod) : 8 `checkTemplate` verts, seuls 03 et 06 « CONTENU
  DIFFÉRENT ».
- Vu en local (copies créées dans la base locale, port 5179, `admin@local.test`, Playwright 390 px
  au toucher) : étiquettes avec espaces (96 398 029), pas de débordement, 5e place à la ligne ;
  rangement juste posé au toucher → « Juste ». Variation 2 de 03 tirée au générateur : énoncé et
  correction comme ci-dessus.
- Prod (2026-10-29) : David lance `--mettre-a-jour` (2 mis à jour), puis `publier-lot --publier` sur les 7 fichiers
  sans 06 (copiés à part) : 7/7 publiés, vérifié au MCP.

## 7. Lot 2 — divisibilité : phase 0 (validée par David le 2026-10-29)

Relevé MCP du 2026-10-29 : CM2-130, 009, 010, 011, 012 sans modèle, tous sur **Divisibilité >
multiples et diviseurs**. Bornes `cycle3.json` : CM2-130 diviseur 2 à 10 ; 009 nombre ≤ 100 ; 010
et 011 nombres ≤ 30 ; 012 deux nombres < 15, multiples communs ≤ 100. Catégorie `Entiers / Diviser /
Multiples et diviseurs`.

| #   | Point   | Modèle                                | Variations                                                                                                                                         | Niveau |
| --- | ------- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | CM2-130 | Reconnaître les multiples d'un nombre | V1 « 56 est-il un multiple de 7 ? » Oui / Non, n ≤ 100, d 3 à 9 ; V2 la même, n de 100 à 999 ; V3 « coche les multiples de 7 » parmi 5 nombres     | 4      |
| 2   | CM2-009 | Des diviseurs d'un nombre             | V1 « coche tous les diviseurs de 72 » parmi 1 à 10 ; V2 « 72 élèves en équipes égales : propose un nombre d'équipes » (tout diviseur ≠ 1, n juste) | 5      |
| 3   | CM2-010 | Tous les diviseurs d'un nombre        | une case par diviseur, ordre libre, leur nombre est donné ; V1 4 diviseurs (pq), V2 6 (p²q : 12, 18, 20, 28), V3 8 (24, 30)                        | 6      |
| 4   | CM2-011 | Diviseurs communs à deux nombres      | « coche tous les diviseurs communs à 12 et 18 » parmi 1 à 12 ; V1 l'un divise l'autre, V2 non (pgcd de 4 à 10)                                     | 7      |
| 5   | CM2-012 | Multiples communs à deux nombres      | V1 le plus petit non nul (6 et 8 → 24) ; V2 un multiple commun < 100 (tout multiple juste) ; V3 « coche les multiples communs » parmi 5 nombres    | 8      |

Corrigés : paires (28 = 1 × 28 = 2 × 14 = 4 × 7), n = d × q (+ r), listes de diviseurs puis
communs, table du plus grand jusqu'au premier multiple de l'autre. Question d'accès : brouillons,
puis nœud + tag → personne ne lit rien de plus.

### 7.1 Lot 2 : décisions (David, 2026-10-29)

Recommandations suivies (« tes recos ? » puis « go ») : le tableau tel quel ; 009 coche parmi 1 à
10 ; 010 en cases, le nombre de diviseurs donné (pousse à chercher les paires jusqu'au bout) ; 011
en choix de 1 à 12.

### 7.2 Lot 2 : écriture (2026-10-29)

- Script `lot-cm2-2.py` → `scripts/questions/cm2-2/` (5 fichiers) ; `question:specs` 300 tirages par variation, tout vert ; `create-questions` en simulation (prod) : 5 à créer.
- « Coche tous les… » : bonne réponse calculée choix par choix (`{{eval:i*floor((k-mod(x,k))/k)}}` rend i ou 0, le 0 répété compte une fois) → le choix 0 doit toujours être bon (« 1 », ou un vrai multiple dans une liste mélangée).
- Un bon choix oublié vaut **½ point** (`unoptimal_form`, règle du moteur `statusFromChoices`) : specs écrites ainsi, vu dans l'aperçu (« bonne réponse oubliée »).
- Pas de « trouve trois diviseurs » en cases libres : trois cases « n'importe quel diviseur » acceptent trois fois le même.
- Tirages : 011 V2 et 012 construits (a = g × u, b = g × v, u et v premiers entre eux), sinon trop de rejets ; 012 V3, 2m toujours parmi les choix (au hasard, un 2e multiple commun ne tombait presque jamais).
- **Collision avec le lot 2 du CM1** (écrit, pas mergé) : niveaux 2 et 3 de la même catégorie et titre « Est-ce un multiple ? » (CM1-012, jumeau de CM2-130) → niveaux 4 à 8, titre « Reconnaître les multiples d'un nombre » ; session `questions-cm1` prévenue (9 et au-delà pour elle).
- Local (port 5180, `admin@local.test`, Playwright 390 px au toucher) : 04 (20 et 30) juste → « Juste », oubli de 10 → « ½ point », 4 coché → faux ; 12 choix lisibles ; 010 : 8 cases l'une sous l'autre, lisibles.
- 2026-10-29 : #1971 mergée (CI verte après #1972, horodatage en double sur `main` venu d'autres sessions) ; David lance `--publier` : 5 brouillons créés, ids ci-dessus (« Reprendre ici »).

### 7.3 Lot 2 : rangement (2026-10-29)

- Relevé MCP : les 5 brouillons toujours sans nœud ni tag, `updated_at` de la création ; les 5 points sur « Arithmétique > Divisibilité > multiples et diviseurs », chemin unique.
- Migration `20261030004700_questions_cm2_lot2_rangement_tags.sql` sur le patron du lot 2 du CM1 (#1976) : présence tout ou rien, sans nœud ni tag avant, nœud = celui du point, `updated_at` préservé, rollback éprouvé. Test `questions-cm2-lot2-rangement-tags` : 9 verts ; migration remplacée par `select 1;` → 7 rouges (les 2 verts restants : base locale vide, tag sans nœud refusé par la base).
- #1985 mergée (CI verte après relance du plantage `wrapDynamicImport`), `security-auditor` : aucun finding bloquant (un non bloquant hérité du patron : `set local lock_timeout` sans effet hors transaction explicite). `db:migrate` (seule migration en attente) : 5 modèles rangés et tagués, vérifié au MCP. Page à cocher publiée, sans alerte.
- Relecture (David, 2026-10-29) : 5/5 OK, sans commentaire. `publier-lot` en simulation : 5 brouillons passent le contrôle.
- 2026-10-29 : David lance `publier-lot --publier` : 5/5 publiés ; vérifié au MCP (published, CM2, nœud et tag de chacun). **Lot 2 clos.**

## 8. Lot 3 — calcul mental sur les entiers : phase 0 (proposée le 2026-10-30)

Relevé MCP du 2026-10-30 : les 8 points (035, 148, 036, 149, 045, 150, 050, 151) sont sans modèle.
Nœuds : tables → « Entiers : addition et soustraction > tables » (035, 148) et « Entiers :
multiplication > tables » (036, 149) ; 045, 150 → « … > calcul astucieux » ; 050, 151 → « Entiers :
division > calcul réfléchi ». Bornes `cycle3.json` : tables, termes et facteurs **de 0 à 10**,
les **mêmes qu'au CM1** (c3-6) ; ± 8, 9, 18, 19, …, 98, 99, autre nombre de 10 à 9 999 (c3-5) ;
÷ 4 et ÷ 8 sans taille propre, quotient décimal admis (260 ÷ 8 = 32,5, c3-4).

**Tables : des modèles du CM1 font déjà exactement le point du CM2** (mêmes bornes) :
`8fee3492` Tables d'addition (a + b, 2 à 10, CM1-035), `f24bb468` Trouver le terme manquant
(8 + ? = 15, CM1-161), `50a9d91c` Tables de multiplication (a × b, 2 à 10, CM1-036). Pas de modèle
« 7 × ? = 56 » (CM1-162 porte `7caa084f`, « Décomposer un entier en produit », autre chose).

| #   | Point   | Proposition                                                                                                                                         | Catégorie, niveau        |
| --- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | CM2-035 | `8fee3492` : **CM2 ajouté à ses niveaux** + tag (rien à écrire)                                                                                     | inchangée                |
| 2   | CM2-148 | `f24bb468` : idem                                                                                                                                   | inchangée                |
| 3   | CM2-036 | `50a9d91c` : idem                                                                                                                                   | inchangée                |
| 4   | CM2-149 | **Neuf** « Compléter une multiplication à trou » : V1 7 × ? = 56, V2 ? × 8 = 56 ; facteurs 2 à 10                                                   | Multiplier / A trou, 21  |
| 5   | CM2-045 | **Neuf** « Ajouter 9, 19, …, 99 » : V1 + 9, 19, …, 99 (+ 10, 20… puis − 1) ; V2 + 8, 18, …, 98 (puis − 2) ; autre nombre de 2 à 4 chiffres          | Somme astucieuse, 12     |
| 6   | CM2-150 | **Neuf** « Soustraire 9, 19, …, 99 » : même découpage (− 10, 20… puis + 1 ou + 2) ; premier nombre de 2 à 4 chiffres, résultat positif              | Différence astucieuse, 5 |
| 7   | CM2-050 | **Neuf** « Diviser par 4 » : V1 quotient entier, 3 chiffres ; V2 quotient entier, 4 chiffres ; V3 quotient décimal (130 ÷ 4 = 32,5 ; … ,25 ; … ,75) | Diviser / Quotient, 10   |
| 8   | CM2-151 | **Neuf** « Diviser par 8 » : mêmes variations (dividende pair en V3 : quotient en ,25, ,5 ou ,75)                                                   | Diviser / Quotient, 11   |

Corrigés : + 99 = + 100 − 1 (droite numérique en mots, pas de bloc) ; ÷ 4 = moitié de la moitié ;
÷ 8 = trois moitiés successives (« Exemples de réussite CM2 2025 » p. 10). Erreurs typiques en
`testSpecs` : + 100 sans le − 1, − 1 au lieu de + 1 dans la soustraction, une moitié oubliée,
quotient décimal tronqué.

**Question d'accès** : 1 à 3 → les élèves et le prof du **CM2** lisent 3 modèles publiés de plus
(ceux du CM1 les gardent) ; 4 à 8 → brouillons, puis nœud + tag → personne ne lit rien de plus
avant la publication.

**Points d'attention** : 1 à 3 touchent des modèles du CM1 → prévenir la session `questions-cm1` ;
« Diviser / Quotient » : la session CM1 y a deux brouillons (niveaux 2 et 3), je prends 10 et 11.

### 8.1 Lot 3 : décisions (David, 2026-10-30)

Recommandations suivies (« je te suis ») : les tables (CM2-035, 148, 036) reprennent les modèles du CM1 `8fee3492`, `f24bb468`, `50a9d91c` (CM2 ajouté à leurs niveaux + tag), le reste du tableau tel quel. Session `questions-cm1` prévenue : elle ne touche ni ces trois modèles ni « Diviser / Quotient » (son lot 3a : fractions).

### 8.2 Lot 3 : écriture (2026-10-30)

- Script `lot-cm2-3.py` → `scripts/questions/cm2-3/` (5 fichiers) ; `question:specs` 300 tirages par variation, tout vert ; `create-questions` en simulation (prod) : 5 à créer.
- Pièges : énoncé sans `?` → « Blank count mismatch » (`$$… = ?$$`) ; quotient décimal → `{{eval:n/4;d}}` (sinon `bad_form`), virgule à l'affichage et dans la correction ; specs de 4 chiffres et plus écrites avec espaces (règle de l'école, sinon `unoptimal_form`).
- Local (port 5183, `admin@local.test`, Playwright iPhone 13) : 333 ÷ 4 → « 83,25 » juste, « 83 » faux ; 4 832 − 98 → « 4 734 » juste, « 4734 » ½ point (espaces) ; corrections relues dans le DOM (82,5 ; 4 832 − 100 = 4 732).

### 8.3 Lot 3 : rangement (2026-10-30)

- Relevé prod (MCP) : 5 brouillons [CM2] sans nœud ni tag ; `8fee3492`, `f24bb468`, `50a9d91c` publiés [CM1], chacun sur la sous-notion « tables » de ses deux points (CM1 et CM2), un seul tag CM1.
- Migration `20261030150000_questions_cm2_lot3_rangement_tags.sql`, écrite à la main (deux familles dans une table : `code_cm1` nul = brouillon neuf) : gardes de relevé, résolution stricte, `updated_at` préservé, rollback gardé (nœud, niveaux, tags exacts). Test `questions-cm2-lot3-rangement-tags` : 13 verts ; corps remplacé par `select 1;` → 6 rouges et le premier bloc tombe au `beforeAll` (la garde du rollback refuse l'état non migré).
