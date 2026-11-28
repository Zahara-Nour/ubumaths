# Chantier « questions-cm2 » — couvrir les points du CM2 en modèles de questions

> Démarche : [couvrir-un-niveau.md](../../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Chantiers voisins : CE1 ([questions-ce1-progress.md](questions-ce1-progress.md)), 6e
> ([questions-6-progress.md](questions-6-progress.md)).

## Reprendre ici

_Mis à jour le 2026-11-20 : chantier CLOS, journal archivé._

- **État** : CM2 couvert, 152 points sur 158 (5 hors appli, 095 attend l'outil n° 45) ; couverture versée dans
  `docs/systeme/programmes/bornes/cycle3.md` (§ CM2), pièges dans `docs/pratiques/couvrir-un-niveau.md`.
- **Reste ailleurs** : figure composée (`outils-manquants.md`, n° 45, 095) ; fractions sur les secteurs (n° 44) ;
  gras dans une cellule de tableau (#2914, `verifications-manuelles.md`, après `deploy:prod`).

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
- Migration `20261030150000_questions_cm2_lot3_rangement_tags.sql`, écrite à la main (deux familles dans une table : `code_cm1` nul = brouillon neuf) : gardes de relevé, résolution stricte, `updated_at` préservé, rollback gardé (nœud, niveaux, tags exacts). Test `questions-cm2-lot3-rangement-tags` : 14 verts ; corps remplacé par `select 1;` → 6 rouges et le premier bloc tombe au `beforeAll` (la garde du rollback refuse l'état non migré).
- `security-auditor` : aucun finding bloquant. Pris en compte : la garde du rollback vérifie aussi le statut (un brouillon publié depuis ne serait pas laissé publié sans nœud), test ajouté. À vérifier après `db:migrate` : `tgenabled = 'O'` pour `update_question_templates_updated_at`.
- Mergée (#2010), `db:migrate` (seule migration en attente) joué, vérifié au MCP. Page à cocher publiée (5 fiches).

### 8.4 Lot 3 : relecture (David, 2026-10-30)

- Page à cocher : 5 verdicts sur 5. OK : `a4cf5fc5`, `116f68ad`, `da5fdca4`. À revoir : `1f2d5097` (÷ 4) et `3b691903` (÷ 8), « les variations 2 et 3 sont trop compliquées pour faire mentalement ».
- Décision de David (recommandation suivie) : garder 3 variations, calculables de tête. V2 : dividende à 4 chiffres multiple de 40 (÷ 4, 1 000 à 9 960) ou de 80 (÷ 8, 1 040 à 9 920), quotient multiple de 10. V3 : quotient décimal sur petit dividende (4q + r, q ≤ 12 : ≤ 51 ; 8q + r, q ≤ 11 : ≤ 94). V1 inchangée.
- `question:specs` 300 tirages par variation : 900/900 pour chacun, specs vertes.
- #2016 mergée ; David : `create-questions --publier --mettre-a-jour` → 2 mis à jour, 3 déjà en base ; contenu et rangement relus au MCP. Page republiée, 2 verdicts remis à zéro.

### 8.5 Lot 3 : publication (2026-11-01)

- Seconde relecture : 5 verdicts OK sur 5. Simulation `publier-lot` : 5 brouillons passent le contrôle. David : `--publier` ; 5 `published` relus au MCP.

## 9. Lot 4 — calcul mental sur les décimaux : phase 0 (proposée le 2026-11-01)

Relevé MCP du 2026-11-01 sur les 9 points prévus (§ 4.6) : **CM2-037** a déjà `edc5d7d4` (moitié des
impairs, lot 0) et **CM2-044** a `a0241952` et `ff3ee576` (deux décimaux < 10, une décimale, avec
retenue ; dans les bornes) → rien à faire. Restent **7 points sans modèle** : 040, 118, 041, 048, 049,
051, 052. Nœuds (ceux des points) : « Décimaux : calculs » > addition (040, 041), soustraction (118),
multiplication (048, 051, 052), division (049).

Existant voisin, non repris : `3bbe92f2`, `f1a392f5` (CM1-039) et `b100ddb2`, `b9a9048a` (CM1-133)
ajoutent ou retirent des unités, dixièmes, centièmes à un nombre de 1 à 9 ; les bornes du CM2
(c3-2) vont jusqu'aux **millièmes** et aux milliers (0,457 + 7/1 000 ; 47 530 + 6 000) → modèles
CM2 propres (décision 4 bis). « Produit particulier » (6e) : × 0,5, × 1,5, × 2,5 ; rien pour × 2,
× 5, × 50.

Bornes `cycle3.json` : 040, 118, 041 → nombre ajouté ou retiré = k unités d'**un seul rang** (k de 1
à 9, des millièmes aux milliers), sans retenue (040, 118) ou avec **une** retenue (041) ; 048 → une
ou deux décimales (13,6 → 27,2 ; 4,35 → 8,7) ; 049 → résultat à trois décimales au plus (13,6 → 6,8 ;
1,22 → 0,61) ; 051 → décimal d'au plus trois chiffres (5 × 1,46) ; 052 → nombre < 20, au plus trois
chiffres, dernier chiffre pair (50 × 12,4).

| #   | Point   | Modèle                                                                                                                                                                                                | Catégorie, niveau                                         |
| --- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1   | CM2-040 | « Ajouter des unités d'un rang » : V1 dixièmes, centièmes ou millièmes à un décimal à 3 décimales (4,452 + 0,03) ; V2 unités à milliers à un décimal (1 462,5 + 3 000) ; aucune retenue               | Décimaux > Additionner > Somme, 6                         |
| 2   | CM2-118 | « Retirer des unités d'un rang » : mêmes variations, sans retenue (0,457 − 0,003 ; 5 846,3 − 400)                                                                                                     | Décimaux > Soustraire > Différence, 6                     |
| 3   | CM2-041 | « Ajouter avec une retenue » : V1 rangs décimaux (4,45 + 0,8 = 5,25 ; 0,457 + 0,007) ; V2 rangs entiers (7 530,4 + 600) ; une seule retenue (rang suivant ≤ 8)                                        | Décimaux > Additionner > Somme, 7                         |
| 4   | CM2-048 | « Calculer le double » : V1 une décimale, de 1 à 49 (13,6 → 27,2) ; V2 deux décimales, partie entière 1 à 9 (4,35 → 8,7)                                                                              | Décimaux > Multiplier > Produit particulier, 5            |
| 5   | CM2-049 | « Calculer la moitié » : V1 une décimale paire (13,6 → 6,8) ; V2 deux décimales, centièmes pairs (1,22 → 0,61) ; V3 dernier chiffre impair, résultat à une décimale de plus (2,5 → 1,25 ; 0,7 → 0,35) | Décimaux > Additionner > Moitié, 2 (à côté de `edc5d7d4`) |
| 6   | CM2-051 | « Multiplier par 5 » : V1 deux chiffres (5 × 3,4 = 17) ; V2 trois chiffres (5 × 1,46 = 7,3 ; 5 × 24,8 = 124)                                                                                          | Produit particulier, 6                                    |
| 7   | CM2-052 | « Multiplier par 50 » : V1 une décimale (50 × 12,4 = 620) ; V2 deux décimales (50 × 1,24 = 62) ; < 20, trois chiffres au plus, dernier chiffre pair                                                   | Produit particulier, 7                                    |

Corrigés : 1-3 → on repère le rang du nombre ajouté, seul ce chiffre change (plus la retenue au 3) ;
4 → double des unités + double des dixièmes ; 5 → moitié de la partie entière + moitié de la partie
décimale (13,6 = 12 + 1,6) ; 6 → × 10 puis moitié ; 7 → × 100 puis moitié (« Exemples de réussite
CM2 2025 » p. 8-10). Erreurs typiques en `testSpecs` : mauvais rang (4,452 + 0,03 = 4,455), retenue
oubliée (4,45 + 0,8 = 4,125), double sans retenue des dixièmes (26,12), × 10 sans la moitié (146 au lieu
de 7,3), virgule oubliée.

**Question d'accès** : 7 brouillons neufs, puis nœud + tag → personne ne lit rien de plus avant la
publication.

**Points d'attention** : niveaux 6 et 7 de « Somme », 6 de « Différence » viennent après le niveau 5
de 6e (comme au lot 3) ; la session `questions-cm1` prépare son lot 4 (décimaux) : la prévenir des
niveaux pris ici.

### 9.1 Lot 4 : décisions (David, 2026-11-01)

Recommandations suivies (« tes recos ? » puis « je te suis ») : tableau du § 9 tel quel ; V3 de la moitié gardée (dernier chiffre impair, deux chiffres au plus : 2,5 ; 0,7 ; 3,9) ; double, × 5, × 50 dans « Décimaux > Multiplier > Produit particulier » (5, 6, 7), moitié dans « Décimaux > Additionner > Moitié » (2).

### 9.2 Lot 4 : écriture (2026-11-01)

- Script `lot-cm2-4.py` → `scripts/questions/cm2-4/` (7 fichiers) ; `question:specs` 1 000 tirages par variation, tout vert ; `create-questions` en simulation (prod) : 7 à créer.
- Pièges : variable **`e` = Euler** (partie entière renommée `w`) ; nom à deux lettres (`nc`) évité ; nombres tirés en entiers (millièmes, centièmes) et affichés par `{{eval:…;d}}` ; rang nommé par `{{if:}}` imbriqués ; « 2, c'est 2 unités » retiré du corrigé quand on ajoute des unités ; condition `N>=10^j` (pas « le chiffre des milliers de 12,3 est 0 »).
- Local (port 5183, `admin@local.test`, Playwright iPhone 13) : énoncés à virgule, espaces dès 4 chiffres (9 820,9 − 5 000) ; corrigés relus dans le rendu (retenue 6 865,7 + 200 ; moitié 7,9 = 7,8 + 0,1).
- #2056 mergée (CI verte).

### 9.3 Lot 4 : rangement (2026-11-01)

- David : `create-questions --dir scripts/questions/cm2-4 --publier` ; relevé MCP : 7 brouillons [CM2] sans nœud ni tag — `f73f7bba` (040), `eca617ae` (118), `8f2aff1d` (041), `7b0b17fd` (048), `3437286f` (049), `0fad085e` (051), `6721b7cc` (052).
- Migration `20261101141500_questions_cm2_lot4_rangement_tags.sql` (12:00, 12:01 et 13:00 pris par d'autres sessions), copie du lot 3b du CM1 (brouillons neufs seuls) ; nœuds « Nombres et calculs > Décimaux : calculs > addition / soustraction / multiplication / division ». Test `questions-cm2-lot4-rangement-tags` : 9 verts ; corps remplacé par `select 1;` → 5 rouges.
- #2060 mergée **avec la garde « doc à jour » rouge** (ma faute : `gh pr view … && gh pr merge` enchaînés ; `Doc-inchangée:` mis dans la description de la PR au lieu d'un message de commit). Seule cette garde était rouge ; la migration n'est pas en cause. Signalé à David.
- `db:migrate` : `DbPushMissingRemoteError` (20261101120000 de `questions-4` mergée, pas jouée) ; David a lancé `db push --include-all` (120000 + 141500). Vérifié au MCP : 7 brouillons, chacun sur sa sous-notion avec son point, `updated_at` inchangé, trigger `updated_at` actif (`O`).
- Page à cocher publiée (7 fiches, aucune alerte), rendu vérifié à 390 px : https://claude.ai/artifact/GbuqmaxXKnTHhZSdy3ppbL ; `verdicts` vide au départ.

### 9.4 Lot 4 : premiers commentaires (David, 2026-11-01)

- `f73f7bba` (040) À revoir : « il n'y a pas de nombre entier dans la variation 1 » ; `eca617ae` (118) : « même remarque » (sans verdict). `8f2aff1d` (041) a la même V1.
- Origine : bornes c3-2 (décision de David du 2026-10-18) — « nombre entier » lu comme k unités de numération, d'après les exemples de réussite CM2 2025 p. 8 (4,452 + 0,03 ; 0,457 − 3/1 000 ; 4,45 + 0,8).
- Question posée, **sans réponse** : 1. garder cette lecture et la rendre visible (titre « Ajouter un nombre entier d'unités, de dixièmes, de centièmes… », corrigé « 0,03, c'est un nombre entier de centièmes : 3 ») — **ma recommandation** ; 2. lecture littérale : V1 retirée des trois modèles (seulement unités à milliers) ; 3. séparer : 040 / 118 / 041 sur les entiers seuls, un modèle à part pour dixièmes / centièmes / millièmes.

### 9.5 Lot 4 : 040 / 118 / 041, un nombre entier (David, 2026-11-01)

- David : « que dit la consigne ? il faut qu'il y ait une cohérence entre la consigne et les questions ». Le BO de CM2 dit « ajouter ou soustraire **un nombre entier** à un nombre décimal » ; celui de CM1 écrit en toutes lettres « un nombre entier … d'unités, de dizaines, de centaines, **de dixièmes ou de centièmes** ». Lecture littérale retenue (« ok ») : la décision c3-2 du 2026-10-18 est remplacée.
- Variation 1 refaite : k unités (k de 1 à 9) ajoutées à / retirées d'un décimal à 2 ou 3 décimales (4,452 + 3 ; 0,45 + 2 ; 8,694 − 6 ; retenue : 8,45 + 3 = 11,45). Variation 2 : dizaines à milliers seulement (les unités sont en V1). Aux unités, 0 est un vrai chiffre (condition `j==3||N>=10^j`).
- Titres gardés (« Ajouter / Retirer des unités d'un seul rang », justes) : `create-questions` retrouve le modèle par son titre, un nouveau titre aurait créé un doublon sur un niveau pris.
- Bornes CM2-040 / 041 / 118 de `cycle3.json` corrigées. `question:specs` : 1 000 tirages par variation, 8 specs par modèle, tout vert ; simulation prod : 3 à mettre à jour, 4 inchangés.
- David : `create-questions --publier --mettre-a-jour` → 3 mis à jour, 4 inchangés ; simulation suivante : 7 identiques. MCP : contenu neuf (conditions `j==3||N>=10^j`, `mod(N,100)!=0`), statut brouillon, nœud et point inchangés. Verdicts de `f73f7bba` et `eca617ae` supprimés (aucun pour `8f2aff1d`) ; page régénérée (7 fiches, aucune alerte) et republiée à la même adresse.

### 9.6 Lot 4 : publication (2026-11-01)

- Relecture de David : 7 OK sur 7, sans commentaire (`verdicts` lu et compté). `publier-lot` en simulation : 7 passent ; David lance `--publier` : 7/7 publiés. MCP : 7 `published`, 7 rangés, 7 tagués.

## 10. Lot 5 — fractions : phase 0 (proposée le 2026-11-01)

Relevé MCP du 2026-11-01 sur les 8 points prévus (§ 3) : **CM2-021** a déjà `e320755f` (entier × 1/b)
et `8fa3108c` (entier × c/b), venus du CM1 au lot 0 ; leurs lettres a, b, c ne sont pas déclarées
(plages implicites) et leur corrigé est « a × c / b », pas l'addition itérée des exemples de réussite.
Les **7 autres** n'ont aucun modèle : 013, 015, 016, 019, 020, 135, 022. Le lot 3a du CM1 (fractions)
est publié : rien en cours chez `questions-cm1` sur ces sous-notions.

Le BO du CM2 (`CM2-nombres.md`) : dénominateurs **≤ 60** (CM1 : ≤ 20) ; fraction d'une quantité
avec **n'importe quel numérateur** (CM1 : fractions unitaires seules) ; multiples communs (< 15) au
service de la comparaison et de l'addition. Exemples de réussite CM2 2025 p. 4-5 (lus dans le PDF) :
58/7 = 8 + 2/7 ; 43/8 entre 5 et 6 ; 17/12 et 17/8 ; 7/4 et 17/10, 13/2 et 20/3 (multiple commun
≤ 60, cas simples) ; 3/2 + 7/8, 5/6 − 1/12, 11/40 − 1/8 (l'un multiple de l'autre, tables) ;
3 × 5/4 = 5/4 + 5/4 + 5/4 ; 2/3 de 12 œufs, 3/10 de 500 g, 2/5 de 60 kg.

Modèles CM2 voisins (CM1) relus : `a2b41659` (lire / écrire, d ≤ 20), `f1a880e9` (q + r/d, d ≤ 20),
`b2b5320f` (encadrer, d ≤ 10), `9089828a` / `0d4765d8` (comparer, même num. ou dén., QCM),
`acfdddb3` / `884908d3` (addition, soustraction, d ≤ 20), `ef1ed0ce` (fraction unitaire d'une
quantité). Forme « signe » des comparaisons de 6e (`afebbb91`, `228b1620`, `259a0b26`) : case
« choix » `<` / `=` / `>`, `melanger: non`.

| #   | Point   | Modèle                                                                                                                                                                                      | Sous-notion, niveau (thème Fractions)       |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 1   | CM2-013 | « Lire et écrire une fraction » : V1 écrire en chiffres « cinquante-trois douzièmes » (d 2..60, n 1..99, n ≠ d) ; V2 « Comment lit-on 5/3 ? » en case « choix » (inversée, cardinal, n + 1) | définition — Apprivoiser/Ecriture 8         |
| 2   | CM2-015 | « Écrire un entier plus une fraction comme une fraction » : V1 q + r/d = ?/d (d 2..10, q 2..9) ; V2 fraction entière à écrire (d jusqu'à 60 : 12, 15, 20, 25, 30, 40, 50, 60 ; q 1..4)      | décomposition — Apprivoiser/Décomposition 7 |
| 3   | CM2-016 | « Encadrer une fraction entre deux entiers consécutifs » : V1 d 2..10, a jusqu'à 99 (43/8) ; V2 d 11..60 « de table » (12, 15, 20, 25, 50, 60 ; q 1..5)                                     | ordre — Apprivoiser/Encadrer 5              |
| 4   | CM2-019 | « Comparer deux fractions de même numérateur ou de même dénominateur » : 17/12 … 17/8 ; 23/40 … 31/40 ; signe en case « choix »                                                             | ordre — Apprivoiser/Comparer 15             |
| 5   | CM2-019 | « Comparer deux fractions de dénominateurs différents » : V1 l'un multiple de l'autre (7/4 … 17/12) ; V2 multiple commun ≤ 60, cas simples (7/4 … 17/10 ; 13/2 … 20/3) ; « = » possible     | ordre — Apprivoiser/Comparer 16             |
| 6   | CM2-020 | « Additionner des fractions de même dénominateur » : V1 deux termes (d ≤ 60) ; V2 trois termes                                                                                              | add./soustr. — Calculer/Add. et Soustr. 23  |
| 7   | CM2-020 | « Additionner des fractions de dénominateurs multiples » : V1 3/2 + 7/8 (tables) ; V2 trois termes liés (1/12 + 1/6 + 1/3)                                                                  | add./soustr. — 24                           |
| 8   | CM2-135 | « Soustraire des fractions de même dénominateur » (d ≤ 60)                                                                                                                                  | add./soustr. — 25                           |
| 9   | CM2-135 | « Soustraire des fractions de dénominateurs multiples » : 5/6 − 1/12 ; 11/40 − 1/8                                                                                                          | add./soustr. — 26                           |
| 10  | CM2-021 | « Multiplier une fraction par un entier » : 3 × 5/4 (entier 2..9, d ≤ 60), corrigé par l'addition itérée                                                                                    | multiplication — Calculer/Multiplication 10 |
| 11  | CM2-022 | « Calculer une fraction d'une quantité » : V1 quantité (2/3 de 12 œufs ; numérateur ≥ 2) ; V2 grandeur (3/10 de 500 g ; 2/5 de 60 kg)                                                       | fraction d'une quantité — 7                 |

Corrigés : 2, 3 → q = q × d / d (58/7 = 56/7 + 2/7) ; 4 → parts de même taille / même nombre de
parts ; 5, 7, 9 → on change de dénominateur en le disant (7/4 = 35/20) ; 10 → « trois fois cinq
quarts, c'est quinze quarts » ; 11 → un tiers de 12, c'est 4 ; deux tiers, c'est 2 × 4. Erreurs
typiques en `testSpecs` : num. et dén. additionnés (3/4 + 1/4 = 4/8), q + r au lieu de q × d + r
(5 + 3/4 = 8/4), encadrement décalé d'un, numérateur seul multiplié oublié (3 × 5/4 = 15/12),
fraction unitaire seule (2/3 de 12 = 4).

Niveaux : les plus hauts pris dans chaque sous-notion (anciennes colonnes) + 1 ; « Add. et Soustr. »
22 est un brouillon de CE2 → 23 à 26.

**Question d'accès** : brouillons neufs, puis nœud + tag → personne ne lit rien de plus avant la
publication.

**À trancher** : (a) 021 : modèle neuf (#10) à côté des deux existants, ou rien ? (b) réponses
des sommes / différences : toute fraction égale acceptée (6/4 pour 3/2), ou forme imposée ?
(c) découpage : 11 modèles en un lot, ou 5a (sens : 1-5) et 5b (calculs : 6-11) ?

### 10.1 Lot 5 : décisions (David, 2026-11-01)

Recommandations suivies (« tes recos ? » puis « go ») : (a) CM2-021 → modèle neuf (#10), corrigé
par l'addition itérée, à côté de `e320755f` / `8fa3108c` ; (b) toute fraction égale acceptée
(`reducedFractions: off`) ; (c) deux lots : **5a** (sens, modèles 1-5) puis **5b** (calculs,
modèles 6-11). Tableau du § 10 gardé.

### 10.2 Lot 5a : écriture (2026-11-01)

- Script `lot-cm2-5a.py` → `scripts/questions/cm2-5a/` (5 fichiers), jumeau de `lot-cm1-3a.py`
  (nombres en lettres jusqu'à 60, parts jusqu'aux soixantièmes, tirés par Python) et des
  comparaisons de `lot-6-fractions.py`. `question:specs` : 1 000 tirages par variation, 36 specs,
  tout vert ; `create-questions` en simulation (prod) : 5 à créer.
- Mesuré : `reducedFractions: off` accepte 9/2 pour « cinquante-quatre douzièmes » → « écrire en
  chiffres » tire des fractions irréductibles ; « 3 + 7/25 » recopiée et « 3,28 » → `bad_form`
  (message de forme), 164/50 accepté. Comparaison à multiple commun : partie entière w tirée
  d'abord (sinon 48 tirages sur 2 000 échouaient).
- Local (port 5183, `admin@local.test`, Playwright iPhone 13) : lecture en lettres sur deux lignes
  lisible (« cinquante-sept vingt-neuvièmes ») ; comparer : bon signe → « Juste », mauvais →
  « Faux » ; encadrer 137/25 : 4 et 5 → « Faux », corrigé 5 < 137/25 < 6.

### 10.3 Lot 5a : rangement (2026-11-01)

- Relevé MCP : 5 brouillons [CM2] sans nœud ni tag (ids du « Reprendre ici ») ; points 013 → définition, 015 → décomposition, 016 et 019 → ordre (notion « Fractions : sens et écritures »).
- Migration `20261101191500_questions_cm2_lot5a_rangement_tags.sql` (190000-190200, 193000 et 200700 pris par d'autres sessions), copie du lot 4. Test `questions-cm2-lot5a-rangement-tags` : 9 verts ; corps remplacé par `select 1;` → 5 rouges.
- `security-auditor` : aucun finding. CI d'abord rouge (collision 190200 sur `main`, réglée par #2114 d'une autre session), verte après fusion de `main` ; #2117 mergée.
- `db:migrate` : `DbPushMissingRemoteError` (la prod a des migrations plus récentes) ; `db push --include-all --dry-run` → la nôtre seule, puis jouée. MCP : 5 brouillons, chacun sur sa sous-notion avec son point, `updated_at` inchangé (14:06, création).
- Page à cocher publiée (5 fiches ; alertes « homonyme » sur 01 et 02 : modèles du CM1 de même titre écartés, ids justes), rendu vérifié à 390 px : https://claude.ai/artifact/R6LqP4SYrAFf1Keor4Xdxo ; `verdicts` vide au départ.

### 10.4 Lot 5b : écriture (2026-11-01)

- Script `lot-cm2-5b.py` → `scripts/questions/cm2-5b/` (6 fichiers), jumeau du 5a. Niveaux relevés en prod : Addition et Soustraction 23 à 26, Multiplication 10, Fraction d'une quantité 7.
- Choix d'écriture : additions à deux termes (d ≤ 60, somme des numérateurs ≤ 99) et à trois termes ; dénominateurs multiples : 3/2 + 7/8 (ordre d'affichage tiré) et 1/12 + 1/6 + 1/3 (chaîne dp | dp × m | dp × m × n, jamais `e`) ; soustraction multiple : on convertit le premier (5/6 − 1/12) ou le second (11/40 − 1/8) ; n × a/d (n 2..9) corrigé par l'addition itérée, accolade « n fois » au-delà de 5 termes ; fraction d'une quantité : objets (k 3..10) ou grandeurs g, kg, L, m, € (k 3, 4, 5, 10).
- `question:specs` : 1 000 tirages par variation, 40 specs, tout vert ; `create-questions` en simulation (prod) : 6 à créer.
- Local (port 5183, `admin@local.test`, Playwright iPhone 13) : pour chacun des 6, juste → « Juste », numérateur + 1 → « Faux ».

### 10.5 Lot 5a : relecture (David, 2026-11-01)

- 5 OK sur 5, sans commentaire (`verdicts` lu et compté). `publier-lot` en simulation : 5 brouillons passent le contrôle.

### 10.6 Lot 5a : publication (2026-11-01)

- David lance `publier-lot --publier` : 5/5 publiés. MCP : 5 `published`, 5 rangés, 5 tagués.

### 10.7 Lot 5b : rangement (2026-11-01)

- David : `create-questions --dir scripts/questions/cm2-5b --publier` ; relevé MCP : 6 brouillons [CM2] sans nœud ni tag — `13ccf7b1` (020, même dén.), `1170d061` (020, multiples), `a14767bc` (135, même dén.), `edb7fca8` (135, multiples), `c257a672` (021), `cf85bd1b` (022).
- Migration `20261101210500_questions_cm2_lot5b_rangement_tags.sql`, copie du 5a ; nœuds « Nombres et calculs > Fractions : calculs > addition et soustraction / multiplication / fraction d'une quantité ». Test `questions-cm2-lot5b-rangement-tags` : 9 verts ; corps remplacé par `select 1;` → 5 rouges.
- `security-auditor` : aucun finding ; CI verte, #2125 mergée. `db push --include-all` (dry-run d'abord : la nôtre seule), depuis le worktree (index du dépôt principal occupé par une autre session). MCP : 6 brouillons rangés et tagués, `updated_at` inchangé (15:41, création).
- Page à cocher publiée (6 fiches ; alertes « homonyme » sur 4 : modèles de CM1 ou de 6e de même titre écartés, ids justes), rendu vérifié à 390 px : https://claude.ai/artifact/EBRtiBKNCcbaQynwCYUXKx ; `verdicts` vide au départ.

### 10.8 Lot 5b : relecture (David, 2026-11-01)

- 6 OK sur 6, sans commentaire (`verdicts` lu et compté). `publier-lot` en simulation : **refus** de `cf85bd1b` — niveau 7 de Fractions / Calculer / Fraction d'une quantité pris par `a635df43` « Fraction d'une fraction » (4e, passé de 5 à 7 puis publié le 2026-11-01 par `questions-4`, migration `20261101193000`, après mon relevé). Rien publié. Correction : niveau 8 (libre), migration + fichier.
- Question d'accès posée avant le SQL ; David : « je te suis » (personne). Migration `20261101213500_questions_cm2_lot5b_niveau.sql` (copie de `20261101193000_questions_4_lot1_niveau`) : `cf85bd1b` 7 → 8 ; fichier `06-…json` et script à 8. Test `questions-cm2-lot5b-niveau` : 6 verts ; corps remplacé par `select 1;` → suite rouge (2 échecs, bloc principal arrêté par la garde du rollback).
- `security-auditor` : aucun bloquant (2 mineurs hérités de la migration de référence). CI verte, #2129 mergée ; `db push --include-all` (dry-run : la nôtre seule). MCP : `cf85bd1b` niveau 8, brouillon, `updated_at` inchangé. `publier-lot` en simulation : 6 brouillons passent.

### 10.9 Lot 5b : publication (2026-11-01)

- David lance `publier-lot --publier` : 6/6 publiés. MCP : 6 `published` (niveaux 23, 24, 25, 26, 10, 8), 6 rangés, 6 tagués. **Lot 5 clos.**

## 11. Lot 6 — fractions décimales et décimaux : phase 0 (proposée le 2026-11-01)

Relevé MCP du 2026-11-01 : les 13 points prévus (§ 3) n'ont **aucun** modèle CM2 : 023, 024, 027,
028, 139, 140, 029 (fractions décimales) ; 031, 033, 145, 034, 146, 147 (décimaux). 026, 030, 141, 142
et 117 en ont déjà (1 à 6), écartés. Jumeaux du CM1 publiés (`cm1-3b`, `cm1-4`, même titre, nombres
du CM1 : dixièmes et centièmes) : `36507fc9`, `6faa64d0`, `53031438`, `34c58018`, `7ed61c5f`,
`85e4d251`, `2cff4ef5`, `10aae729`, `ca08432a`, `9c0c47ef`, `2af5f9fe`, `2cb242e0` ; de 6e :
`2c5bae8f` (liens entre unités), `a1b46489`, `92db5823`, `2e982062`. Décision du § 4 bis : modèles
CM2 propres. Bornes CM2 (`cycle3.json`) : dénominateurs 10, 100, 1 000 ; **millièmes** ; au plus
trois décimales ; ranger jusqu'à 4 fractions décimales, jusqu'à 5 décimaux.

Niveaux relevés (tous statuts) : Fractions/Ecriture 8, Décomposition 7, Comparer 16, Encadrer 5,
Ordonner 3 ; Décimaux/Décomposition 7, Ecriture 12, Arrondir 5, Comparer 5, Encadrer 6 → la suite.

**6a — fractions décimales** (thème Fractions, sauf #2)

| #   | Point   | Modèle                                                                                                                                                                                                    | Sous-notion — catégorie, niveau                                 |
| --- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| 1   | CM2-023 | Lire et écrire une fraction décimale : V1 écrire en chiffres « deux cent sept millièmes » (d 10, 100, 1 000 ; n ≤ 9 999) ; V2 lire en case « choix » (dixièmes / centièmes / millièmes échangés)          | définition — Apprivoiser/Ecriture 9                             |
| 2   | CM2-024 | Unités, dixièmes, centièmes, millièmes : V1 « 1 unité = ? millièmes » ; V2 « 4 dixièmes = ? centièmes » ; V3 l'inverse (« 300 millièmes = ? dixièmes ») ; V4 « 35 centièmes = ? dixièmes et ? centièmes » | décomposition (Décimaux) — Décimaux/Apprivoiser/Décomposition 8 |
| 3   | CM2-027 | Décomposer une fraction décimale : V1 4 107/1 000 = ? + ?/10 + ?/100 + ?/1 000 (un chiffre 0 possible) ; V2 l'inverse, 4 + 1/10 + 7/1 000 = ?/1 000 (rang manquant)                                       | décomposition — Apprivoiser/Décomposition 8                     |
| 4   | CM2-028 | Comparer deux fractions décimales de dénominateurs différents : 7/10 … 65/100 ; 67/100 … 607/1 000 ; « = » possible (70/100 = 7/10) ; signe en case « choix »                                             | ordre — Apprivoiser/Comparer 17                                 |
| 5   | CM2-139 | Encadrer une fraction décimale entre deux entiers consécutifs : d 100 ou 1 000, jusqu'à 7 103/1 000                                                                                                       | ordre — Apprivoiser/Encadrer 6                                  |
| 6   | CM2-140 | Intercaler une fraction décimale : V1 3/10 < ? < 4/10 ; V2 43/100 < ? < 44/100 (réponse en millièmes) ; toute fraction strictement entre est juste                                                        | ordre — Apprivoiser/Encadrer 7                                  |
| 7   | CM2-029 | Ranger quatre nombres (2 ; 140/100 ; 1 200/1 000 ; 9/10) : V1 croissant, V2 décroissant (bloc ` ```ranger `)                                                                                              | ordre — Apprivoiser/Ordonner 4                                  |

**6b — décimaux** (thème Décimaux, Apprivoiser)

| #   | Point   | Modèle                                                                                                                                                                      | Sous-notion — catégorie, niveau             |
| --- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 8   | CM2-031 | Lire et écrire un nombre décimal : V1 « quatre unités et cent sept millièmes » → 4,107 ; V2 « 3 unités, 2 dixièmes et 5 millièmes » (rang vide) ; V3 lire en case « choix » | écritures — Ecriture 13                     |
| 9   | CM2-033 | Partie entière : 105,78 ; 3,7 ; au plus trois décimales, partie entière jusqu'à 999                                                                                         | arrondis et ordres de grandeur — Arrondir 6 |
| 10  | CM2-145 | Arrondi à l'unité : V1 cas francs ; V2 cas pièges (3,5 → 4 ; 3,49 → 3 ; 9,7 → 10)                                                                                           | arrondis et ordres de grandeur — Arrondir 7 |
| 11  | CM2-034 | Comparer deux nombres décimaux : 4,592 … 4,71 (plus de chiffres ≠ plus grand) ; 3,7 … 3,70 (« = ») ; signe en case « choix »                                                | ordre — Comparer 6                          |
| 12  | CM2-146 | Ranger cinq nombres (12,082 ; 12 324/1 000 ; 14 ; 12,09 ; 12,6) : V1 croissant, V2 décroissant                                                                              | ordre — Comparer 7                          |
| 13  | CM2-147 | Intercaler un nombre décimal : V1 3,4 < ? < 3,5 ; V2 1,99 < ? < 2 ; toute réponse strictement entre, au plus trois décimales                                                | encadrement — Encadrer 7                    |

Corrigés : rang par rang (1 dixième = 10 centièmes = 100 millièmes) ; comparer → même dénominateur
(7/10 = 70/100) ou même nombre de décimales (4,71 = 4,710) ; arrondi → chiffre des dixièmes.
Erreurs typiques en `testSpecs` : rang voisin (dixièmes ↔ centièmes), « plus de chiffres donc plus
grand » (4,592 > 4,71), zéro oublié (4 + 1/10 + 7/1 000 = 417/1 000), arrondi tronqué (3,7 → 3),
borne recopiée à l'intercalation.

**Question d'accès** : brouillons neufs, puis nœud + tag → personne ne lit rien de plus avant la
publication.

**À trancher** : (a) découpage 6a puis 6b (comme 5a / 5b) ? (b) #12 : garder une fraction décimale
parmi les cinq décimaux, comme l'exemple du BO ? (c) #6 et #13 : accepter aussi l'autre écriture
(0,435 pour 435/1 000 ; 3 456/1 000 pour 3,456) ?

### 11.1 Lot 6 : décisions (David, 2026-11-01)

Recommandations suivies (« tes recos ? » puis « je valide ») : (a) deux lots, **6a** (fractions
décimales, modèles 1-7) puis **6b** (décimaux, modèles 8-13) ; (b) #12 garde une fraction décimale
parmi les cinq nombres ; (c) #13 accepte aussi l'écriture fractionnaire, #6 exige une fraction
décimale (0,435 → message de forme, à vérifier en local). Tableau du § 11 gardé.

### 11.2 Lot 6a : écriture (2026-11-01)

- Script `lot-cm2-6a.py` → `scripts/questions/cm2-6a/` (7 fichiers), jumeau de `lot-cm1-3b.py` (millièmes en plus, nombres en lettres jusqu'à 9 999, « mille » invariable). `question:specs` : 1 000 tirages par variation, 54 specs, tout vert ; `create-questions` en simulation (prod) : 7 à créer.
- Pièges mesurés : `spacesFromFourDigits` → réponses des specs écrites `1\,000`, `\frac{207}{1\,000}` (sinon `unoptimal_form`) ; l'affichage met les espaces seul. Comparer : numérateur tiré entre 70 % et 130 % de a × m (au-delà, 53/10 contre 785/100 ne piège plus). Ranger : positions affichées retrouvées en essayant les 24 permutations.
- Local (port 5183, `admin@local.test`, 390 px) : ranger lisible (1 381/1 000 espacé) ; intercaler, 0,985 → « Faux » + « La réponse doit être écrite sous forme de fraction » (décision c) ; lire en case « choix » : une seule option juste sur 6 tirages.
- Jeu local, suite (2026-11-01, après le `/clear`) : **02** V4 (regrouper, deux cases) : la ligne « 21 millièmes = ? centièmes et ? millièmes » débordait du champ à 390 px (le « 21 » coupé) → le nombre passe dans la phrase (« Complète : 21 millièmes, c'est… »), le champ garde « ? centièmes et ? millièmes » (340 px) ; (2, 1) juste, (1, 2) faux ; V1 à V3 entre 269 et 304 px. **03** : V1 (quatre cases, 358 px) juste / chiffres échangés faux / 0 + 19/10 faux ; V2 : « 1\,509 » juste, « 1509 » → ½ point « Les chiffres sont mal espacés » (le « 1501 → Juste » d'avant le `/clear` venait du script : `setValue` au lieu de `setPromptValue`). « 1\ 509 » → faux « forme demandée », mais l'élève ne peut pas le taper (la barre d'espace donne `\,`). À noter pour plus tard : dans « Ta réponse », 1509 s'affiche espacé « 1 509 », donc l'élève ne voit pas ce qui a coûté le demi-point. **05** : V1 (297/100) 2 et 3 juste, 29 et 30 faux ; V2 3 et 4 juste, 32 et 33 / 4 et 3 / 2 et 3 faux, 0 < 527/1 000 < 1 juste.
- CI de #2156 : 1er passage annulé (pause CI demandée par David via la session `migrations-collision`) ; après le « go », `origin/main` fusionné (79f556cd7), Client Tests shard 1 rouge (`wrapDynamicImport`, 56 fichiers sur 207 non chargés : incident du runner, PR de JSON seuls) ; relance des jobs en échec → vert ; **#2156 mergée** (2026-11-01).
- Simulation `create-questions` (prod) après le merge : 7 à créer, 0 en base. Niveaux au MCP : les 7 places libres, chacune juste après le dernier niveau pris de sa rubrique.

### 11.3 Lot 6a : brouillons, rangement (2026-11-01)

- David : `create-questions --dir scripts/questions/cm2-6a --publier` → 7 brouillons [CM2] sans nœud ni tag (MCP) : `bd735bc4` (023), `25b269de` (024), `f316dfa7` (027), `d74e675a` (028), `99bcc284` (139), `dd558ada` (140), `169b9eaf` (029) ; niveaux 9, 8, 8, 17, 6, 7, 4.
- Migration `20261101224702_questions_cm2_lot6a_rangement_tags.sql` (horodatage `pnpm migration:horodatage`), copie du lot 5b. Test `questions-cm2-lot6a-rangement-tags` : 9 verts ; corps remplacé par `select 1;` → 5 rouges. `check:migrations --pr 2174` : sortie 0.
- `security-auditor` : aucun bloquant (2 mineurs hérités du gabarit). PR #2174 ; 1re CI rouge sur la garde de doc : la ligne `Doc-inchangée:` doit être dans un **commit**, pas dans la description de la PR.
- Push refusé par le `pre-push` : `20261101224701` pris entre-temps sur `main` par `questions_1spe_probas_rangement_tags` (même seconde donnée par `migration:horodatage` à deux sessions). `git merge origin/main`, renommée en `20261101224702`, test rejoué.
- 2e collision : `20261101224702` pris par `questions_tspe_lot2_rangement_tags` pendant la CI ; renommée en `20261101224703`. `migration:horodatage` = max de `main` + 1 s : deux sessions proches reçoivent le même numéro.
- 3e collision : `20261101224703` pris par `questions_2de_signes_variations_rangement_tags` (ancien outil). Après #2181 : renommée en `20261101222238` (heure réelle).
- 2026-11-01 soir : #2181 (horodatage à l'heure réelle, garde allégée) mergée ; `deploy:prod` lancé à la demande de David : v0.62.0 en prod. #2174 renommée une 3e fois (`…224703` pris par `questions_2de_signes_variations`), puis `20261101222238` (heure réelle) ; CI verte, mergée. `db:migrate` : refus « inserted before the last migration » attendu, `--dry-run --include-all` → la nôtre seule, jouée. MCP : 7 brouillons rangés et tagués, `updated_at` = création. Page à cocher publiée (7 fiches ; 5 alertes « homonyme » CM1 écartés, ids justes ; « Ranger » non dessiné).

### 11.4 Lot 6a : relecture (David, 2026-11-02)

- 7 OK sur 7, sans commentaire (`verdicts` lu et compté). `publier-lot` en simulation : 7 brouillons passent le contrôle.

### 11.5 Lot 6a : publication (2026-11-02)

- David lance `publier-lot --publier` : 7/7 publiés. MCP : 7 `published` (niveaux 9, 8, 8, 17, 6, 7, 4), 7 rangés, 7 tagués (CM2-023, 024, 027, 028, 139, 140, 029). **Lot 6a clos.**

### 11.6 Lot 6b : écriture (2026-11-02)

- Script `lot-cm2-6b.py` → `scripts/questions/cm2-6b/` (6 fichiers), jumeau de `lot-cm1-4.py` (millièmes en plus). Niveaux revérifiés au MCP le 2026-11-02 (toutes catégories Décimaux / Apprivoiser) : Ecriture 12, Arrondir 5, Comparer 5, Encadrer 6 → 13, 6 et 7, 6 et 7, 7 libres.
- `question:specs` : 1 000 tirages par variation, 59 specs, tout vert.
- Pièges mesurés : intercaler, 3 456/1 000 → `unoptimal_form` (non simplifiée) → `reducedFractions: off` pour ce modèle seul (décision c). Nombres construits en millièmes entiers (`xm/1000`) pour éviter les flottants. Ranger : positions affichées relevées avec `generateInstanceWithFixedVariables` (sonde tsx hors dépôt) : croissant x2 x3 x4 x5 x1, décroissant x4 x3 x2 x1 x5. Comparer « = » : la droite s'écrit `{{x}}0` (3,70), le zéro survit dans l'énoncé généré.
- Local (port 5183, base locale, `set -a; . ./.env.local`) : 6 brouillons créés ; comparer « 92,5 … 92,50 » garde son zéro ; ranger lisible (15 143/1 000 espacé, 5 étiquettes), réponse attendue juste. ⚠️ `create-questions` sans `.env.local` chargé vise la **prod** (simulation seulement).
- #2186 mergée (CI verte du premier coup). Simulation `create-questions` (prod, dépôt principal) : 6 à créer, 0 en base. Un premier `--publier` de David, lancé avant le merge, s'est arrêté sur `ENOENT` (dossier absent de `main`) : rien d'écrit.

### 11.7 Lot 6b : brouillons, rangement (2026-11-02)

- David : `create-questions --dir scripts/questions/cm2-6b --publier` → 6 brouillons [CM2] sans nœud ni tag (MCP) : `bc2cc245` (031), `ffd1e67f` (033), `e28629a0` (145), `fdf0418e` (034), `de29bf83` (146), `a733232c` (147) ; niveaux 13, 6, 7, 6, 7, 7.
- Migration `20261102051111_questions_cm2_lot6b_rangement_tags.sql` (`pnpm migration:horodatage`), copie du lot 6a ; nœuds des points relevés au MCP (Décimaux : numération > écritures, arrondis et ordres de grandeur, ordre, encadrement). Test `questions-cm2-lot6b-rangement-tags` : 9 verts ; corps remplacé par `select 1;` → 5 rouges ; fichier restauré depuis sa copie.
- #2193 : `security-auditor` sans finding ; CI verte ; `check:migrations --pr 2193` sortie 0 ; mergée. `migration list --linked` : seule la nôtre en attente ; `db:migrate --dry-run` puis `db:migrate` : jouée. MCP : 6 `draft`, nœud et point attendus, `updated_at` = création.
- Page à cocher publiée (6 fiches ; alertes « homonyme » des modèles CM1 / 6e de même titre écartés, ids justes ; « Ranger » non dessiné, à jouer dans l'aperçu) : https://claude.ai/artifact/1r1VKqXyLZKDJU3jrpuLhC

### 11.8 Lot 6b : relecture (David, 2026-11-02)

- 6 OK sur 6, sans commentaire (`verdicts` lu et compté). `publier-lot` en simulation : 6 brouillons passent le contrôle.

### 11.9 Lot 6b : publication (2026-11-02)

- David lance `publier-lot --publier` : 6/6 publiés. MCP : 6 `published` (niveaux 13, 6, 7, 6, 7, 7), 6 rangés, 6 tagués (CM2-031, 033, 145, 034, 146, 147). **Lot 6b clos, lot 6 clos.**

## 12. Lot 7 — droites graduées : phase 0 (proposée le 2026-11-02)

Relevé MCP du 2026-11-02 : les 10 points de droite graduée n'ont **aucun** modèle CM2 : 129, 007
(entiers) ; 018, 134, 017, 133 (fractions) ; 138, 025 (fractions décimales) ; 144, 032 (décimaux). Le
geste « placer » (` ```line ` + `placer:`, un ou plusieurs points) est **en prod** : plus besoin de
garder les modèles en brouillon. Jumeaux du CM1 publiés (`cm1-3a`, `cm1-3b`, `cm1-4`) : `c2fa5767`,
`6d94994a`, `0e3f82a1`, `00910e5b`, `6de4ad5b`, `5b038fc8`, `06f246e4`, `3560dded` ; de 6e : `8adac6d1`,
`0ce253ea`, `5f9ba34d` ; entiers : `d6268317` (CE1) seulement. Décision du § 4 bis : modèles CM2
propres. Bornes CM2 (`cycle3.json`) : entiers gradués de 1 en 1, 10 en 10, 100 en 100, etc. ;
fractions supérieures à 1 (5/3, 7/3), dénominateur ≤ 60, écritures 3 + 2/10 et **4 − 2/3** ;
dénominateurs 10, 100, 1 000 ; décimaux en millièmes ou par **agrandissement** (2,812 ; 33,916).

Nœuds : sous-notion « droite graduée » de « Entiers : numération » (129, 007), « Fractions : sens et
écritures » (018, 134, 017, 133, 025, 138), « Décimaux : numération » (144, 032). Niveaux relevés
(catégorie Apprivoiser/Repérage, tous statuts) : Entiers 1, Fractions 1-7, Décimaux 1-4 → la suite.

**7a — entiers et fractions**

| #   | Point   | Modèle                                                                                                                                                                                          | Catégorie, niveau     |
| --- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 1   | CM2-129 | Lire un entier : V1 morceau de droite gradué de 1 en 1, 10 en 10 ou 100 en 100 (≤ 100 000) ; V2 de 1 000 en 1 000 ou 10 000 en 10 000, grands nombres (3 450 000) ; deux graduations étiquetées | Entiers/Repérage 2    |
| 2   | CM2-007 | Placer un entier : mêmes droites ; V3 deux points sur la même droite                                                                                                                            | Entiers/Repérage 3    |
| 3   | CM2-018 | Lire une fraction : V1 unité en 2 à 12 parts, point **au-delà de 1** (7/3) ; V2 morceau de droite qui commence à un entier (2 à 5)                                                              | Fractions/Repérage 8  |
| 4   | CM2-134 | Repérer par un entier et une fraction : V1 ? + ?/d (comme le CM1, d jusqu'à 12) ; V2 ? − ?/d, point juste avant un entier (4 − 1/3)                                                             | Fractions/Repérage 9  |
| 5   | CM2-017 | Placer une fraction supérieure à 1 (5/3, 7/3) : V1 un point ; V2 deux points (A = 5/3 ; B = 7/3)                                                                                                | Fractions/Repérage 10 |
| 6   | CM2-133 | Placer un entier plus une fraction : V1 un point (d jusqu'à 12) ; V2 deux points                                                                                                                | Fractions/Repérage 11 |

**7b — fractions décimales et décimaux**

| #   | Point   | Modèle                                                                                                                                   | Catégorie, niveau     |
| --- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| 7   | CM2-138 | Lire une fraction décimale : V1 dixièmes (23/10) ; V2 morceau en centièmes (237/100) ; V3 morceau agrandi en **millièmes** (2 812/1 000) | Fractions/Repérage 12 |
| 8   | CM2-025 | Placer une fraction décimale : les mêmes trois droites                                                                                   | Fractions/Repérage 13 |
| 9   | CM2-144 | Lire un nombre décimal : V1 dixièmes ; V2 centièmes ; V3 morceau agrandi en millièmes (2,812 ; 33,916), partie entière jusqu'à 99        | Décimaux/Repérage 5   |
| 10  | CM2-032 | Placer un nombre décimal : les mêmes trois droites ; V4 deux points                                                                      | Décimaux/Repérage 6   |

Corrigés : valeur d'un petit intervalle (l'unité partagée en d parts ; 10 graduations entre 2,81 et
2,82 → un millième) puis compter depuis la graduation étiquetée. Erreurs typiques en `testSpecs` :
graduation voisine, intervalle compté pour 1 (au lieu de 10, 100…), fraction comptée depuis le mauvais
entier, millième pris pour un centième (2,82 au lieu de 2,812), 4 + 1/3 au lieu de 4 − 1/3.

À vérifier en local : étiquettes des grands nombres (espaces, largeur sur téléphone), pas `0.001`
sur un morceau agrandi, `placer:` à deux points avec des fractions.

**Question d'accès** : brouillons neufs, puis nœud + tag → personne ne lit rien de plus avant la
publication.

**À trancher** : (a) découpage 7a (6 modèles) puis 7b (4) ? (b) #4 V2 « entier moins une fraction »
(exemple du BO, 4 − 2/3) : à garder ? (c) les restes sans modèle des lots précédents (038 relations
entre fractions usuelles, 053 estimation, 055-057 opérations posées) : un petit lot après le 7, ou à
leur place dans « problèmes » ? (d) après le lot 7, reclasser le § 3 : plusieurs outils de la classe C
sont maintenant en prod (figure à colorier → 131, 136, 143 ; barres à construire → 121 ; repère à
placer → 122 ; cubes, patrons → 100, 102, 105 ; horloge à placer → 083 sans secondes, toujours pas de
trotteuse).

### 12.1 Lot 7 : décisions (David, 2026-11-02)

Recommandations suivies (« je suis tes recos ») : (a) deux lots, **7a** (entiers et fractions, modèles
1-6) puis **7b** (fractions décimales et décimaux, modèles 7-10) ; (b) #4 garde la V2 « entier moins
une fraction » ; (c) 038, 053, 055-057 en **petit lot 8** juste après le lot 7 ; (d) après le lot 7,
reclasser le § 3 (outils de la classe C maintenant en prod). Tableau du § 12 gardé.

### 12.2 Lot 7a : écriture (2026-11-02)

- `docs/wip/questions/lot-cm2-7a.py` → `scripts/questions/cm2-7a/` (6 modèles) ; `question:specs` : 40 specs vertes, 600 tirages réussis.
- Entiers : 10 intervalles, étiquettes sur la graduation de départ et la 5e (`labels:` remplace les étiquettes calculées), le pas est à trouver. Fractions : au plus 12 intervalles ; morceaux de droite (de k à k + 1, ou de m à m + 2) pour les dénominateurs 7 à 12.
- Piège : la réponse d'une droite à placer passe par le juge de forme, écrite sans espaces (`placerAnswer`) → dès 5 chiffres, « forme à améliorer » (contrôle `spaces` en `warn` par défaut). `spaces: off` sur « Placer un entier ». **Tout futur modèle à placer avec des grands nombres** : même réglage.
- Essai en base locale (David : `create-questions --publier` avec `.env.local`, le classifieur refuse même en local) ; aperçu à 390 px : **étiquettes de 7 chiffres coupées** (« 6 700 0 », cadre de 60 px dans `NumberLine.svelte`). Correctif dans la même PR : cadre de 100 px, centré ; test `NumberLine-etiquettes-longues` rouge (64 > 60) puis vert ; `ubumark.md` mis à jour. Ensuite : 30 tirages, rien de coupé, aucun avertissement « téléphone ».
- #2212 (fichiers + correctif) : CI verte, mergée. ⚠️ Les modèles #1 et #2 ne se publient qu'après le `deploy:prod` qui livre le correctif.

### 12.3 Lot 7a : brouillons, rangement (2026-11-02)

- David : `create-questions --dir scripts/questions/cm2-7a --publier` → 6 brouillons [CM2] sans nœud ni tag (MCP, `updated_at` = création) : `c20b687f` (129), `7df1aadd` (007), `de02429a` (018), `daf8a942` (134), `826f6971` (017), `c0eef6ff` (133).
- Migration `20261102081228_questions_cm2_lot7a_rangement_tags.sql` (`pnpm migration:horodatage`), copie du lot 6b ; nœuds relevés au MCP : sous-notion « droite graduée » de « Entiers : numération » (129, 007) et de « Fractions : sens et écritures » (018, 134, 017, 133). Test `questions-cm2-lot7a-rangement-tags` : 9 verts ; corps remplacé par `select 1;` → 3 rouges et le premier bloc tombe au `beforeAll` (4 sautés) ; fichier restauré depuis sa copie.
- #2218 : `security-auditor` sans finding bloquant ; CI verte ; `check:migrations --pr 2218` sortie 0 ; mergée. Worktree non lié au projet (`ProjectRefNotLinkedError`) : `supabase/.temp/{project-ref,linked-project.json,pooler-url,postgres-version}` copiés du dépôt principal. `db:migrate --dry-run` : la nôtre seule ; `db:migrate` : jouée. MCP : 6 `draft`, nœud et point attendus, `updated_at` = création, trigger `tgenabled = 'O'`.
- Page à cocher publiée (6 fiches ; « bloc line non dessiné » sur les 6 : à jouer dans l'aperçu ; homonymes CM1 `c2fa5767`, `0e3f82a1`, `00910e5b` écartés, ids justes) : https://claude.ai/artifact/6SVfmVU1t4cgHjjRsuRCwZ ; `verdicts` vide au départ.
- Relecture de David : 6 OK sur 6, sans commentaire (`verdicts` lu et compté). `publier-lot` en simulation : 6 passent.
- `deploy:prod` : la CI de la v0.63.0 a planté (`wrapDynamicImport`), verrou relâché, 4 merges ont annulé sa relance → chantier `verrou-deploy` (#2232). v0.64.0 en prod (11:48), correctif des étiquettes (#2212) compris, Vercel vert.
- David lance `publier-lot --publier` : 6/6 publiés. MCP : 6 `published` (niveaux 2, 3, 8, 9, 10, 11), 6 rangés, 6 tagués (CM2-129, 007, 018, 134, 017, 133). **Lot 7a clos.**

### 12.4 Lot 7b : écriture (2026-11-02)

- `docs/wip/questions/lot-cm2-7b.py` → `scripts/questions/cm2-7b/` (4 modèles), jumeau de `lot-cm1-3b.py` #7-8 et `lot-cm1-4.py` #3-4, avec une 3e droite : morceau agrandi en **millièmes** (de 281/100 à 282/100 ; de 33,91 à 33,92). Niveaux revérifiés au MCP : Fractions/Repérage 1-11, Décimaux/Repérage 1-4 → 12, 13, 5, 6.
- `question:specs` : 41 specs vertes, 13 000 tirages réussis. Fractions : `requiredForm: 'fraction'`, `reducedFractions: off`, `spacesFromFourDigits` (réponse `\frac{2\,812}{1\,000}`, comme le lot 6a).
- Sonde tsx hors dépôt (parseur + `number-line-placer`), 3 000 tirages par modèle : toujours 11 graduations, chaque point à placer sur une graduation, `placerAnswer` = réponse attendue (pas `0.001` sans erreur d'arrondi), aucun `phoneGapWarning`.
- Base locale (`create-questions --publier` avec `.env.local`, passé cette fois) ; aperçu (port 5183, fenêtre de 606 px, Chrome ne descend pas plus bas) : deux points en millièmes (35,501 ; 35,507) placés → « Juste » ; étiquettes 108/100 et 109/100 lisibles.
- CI de #2236 : Client Tests shard 1 rouge deux fois (`wrapDynamicImport` dans `get_hooks`, 112 fichiers sur 210 chargés ; PR de JSON seuls) ; après fusion de `origin/main` (nouveau commit), verte ; **#2236 mergée**. Simulation `create-questions` (prod, dépôt principal) : 4 à créer, 0 en base.

### 12.5 Lot 7b : ids erronés, brouillons, rangement (2026-11-17)

- `--publier` (dépôt principal) : 4 « déjà en base, CONTENU DIFFÉRENT ». Cause : `ed0cd5caf6` (2026-11-04, id écrit dans 1 806 fichiers de lot par titre et catégorie) avait mis dans les 4 fichiers `cm2-7b` les ids des jumeaux **CM1** (`6de4ad5b`, `5b038fc8`, `06f246e4`, `3560dded`), créés entre-temps. Aucun autre dossier CM2 touché (ids en double relevés). Ids retirés ; titres CM2 gardés identiques au CM1 (David). Simulation : 4 à créer.
- David : `--publier` depuis le worktree → `b432b38e` (138, niv. 12), `521c3f16` (025, 13), `4a2edffb` (144, 5), `03c5df14` (032, 6) ; MCP : 4 brouillons [CM2] sans nœud ni tag, `updated_at` = création ; jumeaux CM1 intacts (publiés, [CM1], rangés).
- Migration `20261117181922_questions_cm2_lot7b_rangement_tags.sql`, copie du lot 7a ; nœuds : « droite graduée » de « Fractions : sens et écritures » (138, 025) et de « Décimaux : numération » (144, 032). Test `questions-cm2-lot7b-rangement-tags` : 9 verts ; corps remplacé par `select 1;` → 5 rouges ; fichier restauré depuis sa copie (`cmp`).
- #2770 : `security-auditor` sans finding bloquant (non bloquant : aucun test n'asserte les jumeaux CM1 intacts, écritures filtrées par uuid) ; test relancé après le pre-commit : 9 verts ; CI verte ; `check:migrations --pr 2770` sortie 0 ; mergée. `migration list --linked` : la nôtre seule en attente ; `db:migrate` joué. MCP : 4 `draft` [CM2], nœud et point attendus, `updated_at` = création, trigger `O` ; jumeaux CM1 inchangés.
- Page à cocher (4 fiches, aucune alerte) : https://claude.ai/artifact/EPw29tzZFXVERGzBottWAT.
- Relecture de David : 4 OK sur 4, sans commentaire (`verdicts` lu et compté). `publier-lot` en simulation : 4 passent ; `garde-niveaux-tags` : aucun niveau manquant (2 378 modèles tagués).
- David lance `publier-lot --dir scripts/questions/cm2-7b --publier` : 4/4 publiés, statut relu en base par le script. **Lot 7b clos, lot 7 clos.**

## 13. Lot 8 — restes du calcul (038, 053, 055-057) : phase 0 (proposée le 2026-11-17)

Décision § 12.1 c. Relevé MCP du 2026-11-17 : **aucun modèle** sur CM2-038, 053, 055, 056, 057. Jumeaux
CM1, chacun sur le nœud du point CM2 : `2d58ce54` (CM1-037, relations 1/2, 1/4, 1, 1/10, 1/100 ;
complète `1/2 = ?/4`, `1 − 1/4 = ?/4`…), `c08f689b` (CM1-048, estimation en case « choix » : somme de
trois centaines, 2 ch. × 2 ch., division), `c3246792` (CM1-052, décimal × entier < 10, bloc
` ```operation `), `4b666c28` (CM1-053, division euclidienne posée). En 6e, `26aceb03` (décimal ÷
entier) fait poser la division **sur le brouillon** et saisir le quotient : pas le geste du CM2.

Outil : le bloc ` ```operation ` (en prod) suffit, classe B confirmée. La réserve du § 3 (« saisie
jusqu'aux centièmes ? ») est levée : `quotient: décimal` ouvre des carreaux jusqu'au **millième**,
l'élève pose sa virgule, quotient jugé à la valeur ; multiplication : 6 chiffres en haut, 3 en bas,
virgule du résultat posée par l'élève (`ubumark.md` § Opération posée).

Bornes `cycle3.json` : 038 → 1/4, 1/2, 3/4, 1 ; 1/1 000, 1/100, 1/10, 1 ; 1/4, 1/2, 3/4 en …/10,
…/100, …/1 000. 053 → cas simples, arrondis, `≈`, meilleure estimation parmi des puissances de 10
(1 212 − 496 ≈ 700 ; 724 × 68 ≈ 50 000 ; 59 437 ÷ 6 ≈ 10 000). 055 → décimal × entier quelconque
(876 × 20,8 ; 8,76 × 208). 056 → dividende entier ≤ 5 chiffres, diviseur 2..9, quotient au plus au
centième, reste nul (785 ÷ 4 ; 9 855 ÷ 6). 057 → dividende décimal ≤ 5 chiffres, diviseur 2..9,
arrêt au plus au centième, reste nul (148,2 ÷ 5 ; 986,3 ÷ 5).

| #   | Point   | Modèle                                                                                                                                                                                                                                                                                                                                                         | Nœud, niveau                                               |
| --- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| 1   | CM2-038 | « Relations entre fractions usuelles » : V1 1/4, 1/2, 3/4 en fractions décimales (`3/4 = ?/100` → 75 ; `1/2 = ?/1000` → 500 ; `1/4 = ?/1000` → 250) ; V2 1/1 000, 1/100, 1/10, 1 (`1/10 = ?/1000` ; `1 = ?/1000` ; `1/100 = ?/1000`) ; V3 1/4, 1/2, 3/4, 1 (`3/4 + 1/4 = ?` ; `1 − 3/4 = ?/4` ; `3/4 = 1/2 + ?/4` ; `3 × 1/4 = ?/4`) ; un nombre dans une case | Fractions : sens et écritures > égalité de fractions, 9    |
| 2   | CM2-053 | « Estimer le résultat d'une opération », case « choix », 4 propositions : V1 4 ch. − 3 ch., arrondis à la centaine (1 212 − 496 ≈ 700 ; leurres ×10, ÷10, ±100) ; V2 3 ch. × 2 ch. (724 × 68 ≈ 700 × 70) ; V3 5 ch. ÷ 1 ch. (59 437 ÷ 6 ≈ 60 000 ÷ 6) ; V2 et V3 : leurres = la bonne × 10, ÷ 10, × 100 (puissances de 10)                                     | Décimaux : numération > arrondis et ordres de grandeur, 10 |
| 3   | CM2-055 | « Poser la multiplication d'un nombre décimal par un entier » (` ```operation `) : V1 entier de 2-3 chiffres × décimal à une décimale (876 × 20,8) ; V2 décimal à deux décimales × entier de 2-3 chiffres (8,76 × 208) ; dernier chiffre du produit ≠ 0                                                                                                        | Décimaux : calculs > multiplication, 10                    |
| 4   | CM2-056 | « Poser une division décimale : dividende entier » (`quotient: décimal`) : V1 quotient au dixième (9 855 ÷ 6 = 1 642,5) ; V2 au centième (785 ÷ 4 = 196,25) ; dividende de 3 à 5 chiffres, reste nul, quotient non entier                                                                                                                                      | Décimaux : calculs > division, 9                           |
| 5   | CM2-057 | « Poser une division décimale : dividende décimal » : V1 quotient au rang du dividende (45,36 ÷ 4 = 11,34 ; 2,45 ÷ 7 = 0,35) ; V2 un zéro à ajouter (148,2 ÷ 5 = 29,64) ; ≤ 5 chiffres, diviseur 2..9, reste nul                                                                                                                                               | Décimaux : calculs > division, 10                          |

Corrigés : 1 → « un quart, c'est 25 centièmes », « un dixième, c'est 100 millièmes » (V3 comme
`2d58ce54`) ; 2 → on arrondit chaque nombre, on calcule, on garde la puissance de 10 la plus
proche ; 3 → comme `c3246792` (poser sans la virgule, compter les décimales) ; 4, 5 → potence
résolue par le bloc, plus « on ajoute un zéro après la virgule pour continuer », « la virgule du
quotient se pose quand on abaisse le premier chiffre après la virgule ». Erreurs typiques en
`testSpecs` : 1/4 = 25/1 000, 1/2 = 5/100 ; leurre « × 10 » choisi ; virgule mal placée (87,6 ×
20,8 compté une décimale de trop), décimales des deux facteurs non réunies ; division arrêtée au
reste (1 642 au lieu de 1 642,5), virgule oubliée (19 625).

Niveaux : max + 1 sur chaque nœud (égalité de fractions 8 → 9 ; arrondis 9 → 10 ; multiplication
9 → 10 ; division 8 → 9, 10).

**Question d'accès** : 5 brouillons neufs, puis nœud + tag → personne ne lit rien de plus avant la
publication.

**À trancher** : (a) 056 : seuls 2, 4, 5, 6, 8 donnent un quotient décimal non entier avec un
dividende entier (3, 7, 9 ne s'arrêtent jamais au centième) ; 6 n'a que des quotients en ,5 → V1.
D'accord pour tirer le diviseur dans {2, 4, 5, 6, 8} ? (b) 038 V3 reprend en partie le CM1 (`1 −
1/4`) : la garder (révision) ou la limiter aux relations avec 3/4 ? (c) 053 V1 (soustraction) :
leurres ×10, ÷10, ±100 comme au CM1, ou puissances de 10 seules comme V2-V3 ? (d) un seul lot de 5
modèles (reco), ou 038 + 053 d'un côté, opérations posées de l'autre ?

### 13.1 Lot 8 : décisions (David, 2026-11-17)

Recommandations suivies (« je te suis ») : (a) 056, diviseur dans {2, 4, 5, 6, 8} (6 en V1 seulement) ;
(b) 038 V3 gardée, avec 3/4 ; (c) 053 V1, leurres du CM1 (× 10, ÷ 10, ± 100) ; (d) un seul lot de 5
modèles. Tableau du § 13 gardé.

### 13.2 Lot 8 : écriture (2026-11-17)

- `docs/wip/questions/lot-cm2-8.py` → `scripts/questions/cm2-8/` (5 modèles) ; `create-questions` en simulation : 5 à créer, 37 specs vertes ; `question:specs --instances 200` : 2 600 tirages réussis, aucun `\textcolor` hors `$`.
- Variable `e` refusée (constante d'Euler) : `f` pour l'écart de l'estimation par division.
- Base locale : 5 brouillons créés, joués dans l'aperçu admin (division 43 713 ÷ 6 saisie 7285,5 → juste, correction lisible ; 1 − 1/2 = ?/4 ; estimation 4 980 − 293 en case « choix » ; 212 × 60,8 posé). Fichiers réécrits par le script ensuite (ids locaux retirés).
- Aperçu : le serveur de dev doit écouter sur `127.0.0.1` (`--host 127.0.0.1`) ; l'extension Chrome refuse `[::1]`.
- #2777 (fichiers) : CI verte, mergée.

- 2026-11-17 : `db:migrate` joué par David (lot 8 + 1re techno lot 1) ; 5 modèles rangés et tagués, `updated_at` inchangé (MCP). Page à cocher publiée (5 fiches ; « bloc operation non dessiné » sur 055, 056, 057 : à jouer dans l'aperçu) : https://claude.ai/artifact/71F7ncJkoVsfEqzNCpsJSr ; 5 verdicts « OK » écrits à 20:49 (base relue). `publier-lot` en simulation : 5 brouillons passent.

- 2026-11-17 : lot 8 publié par David (`publier-lot --publier`), 5/5 `published` relus au MCP.

## 14. Reclassement du § 3 après le lot 8 (2026-11-17)

Décision § 12.1 d. Relevé MCP du 2026-11-17 : **76 points du CM2 sans modèle CM2** (144 − 68 couverts
par les lots 1 à 8 et le lot 0) ; aucun n'a de modèle d'un autre niveau tagué. Prod = v0.93.0 : tous les
outils de l'ancienne classe C y sont (vérifié sur `origin/production`) : ` ```partage colorier:` (grille
10×10 = centièmes, `unites:`), trotteuse de ` ```horloge ` (#2179), courbe de données (#2491), repère à
placer (` ```courbe placer:`), barres à construire, ` ```cubes `, ` ```patron ` (`designer:`,
`completer:`), ` ```robot `, case « figure » (perpendiculaire, parallèle, carré, rectangle, triangle,
cercle, symétrique). **Plus aucun point en classe C.**

- **A. Texte / formule (29)** : problèmes 058, 119, 059, 060, 061, 062, 063, 064, 066 ; suite de nombres
  068 ; aires 073, 074, 075, 120 ; angle droit 081 ; durées 085 ; géométrie 091, 093 ; solides 099 ;
  déplacements 103 ; tableaux 107, 156 ; probabilités 109, 110, 111, 112, 113 ; proportionnalité 115, 116.
- **B. Outil en prod (40)** :
  - partages : 132, 137 (`gris:`, lire) ; 131, 136, 143 (`colorier:`) ;
  - horloge : 082 (lire, secondes), 083 (placer), 084, 153 (durées entre deux cadrans) ;
  - motifs 069, 070 et aires sur quadrillage 071, 072 (` ```figure `) ;
  - angles 076, 077, 078 ; codes 088 ; perpendiculaires, parallèles 089, 090 ; figures usuelles 092 ;
  - tracés (case « figure ») : 154, 155, 094, 095, 097 ;
  - solides 098, patrons 100, 102, assemblages de cubes 105, robot 104 ;
  - données : 123, 157 (`barres`), 124, 158 (`circulaire`), 125, 159 (courbe `données:`), 108 (mélange),
    114 (`probtree` / `tableau-croise`), 121 (barres à construire : échelle 1, 2, 5, 10 et données
    ≤ 100, `outils-manquants.md` n° 36 reporté par David), 122 (repère à placer).
- **D. Hors appli (7, tranché le 2026-11-04)** : 126, 087, 079, 080, 096, 101, 106.

**Lots proposés** (thème, 3 à 10 modèles) : 9 partages (131, 132, 136, 137, 143) ; 10 heures et
durées (082, 083, 084, 153, 085) ; 11a problèmes en une étape (058, 059, 061, 066, 115, 116) ; 11b en
plusieurs étapes (119, 060, 062, 063, 064) ; 12 suites et motifs (068, 069, 070) ; 13 aires (071, 072,
073, 074, 075, 120) ; 14a données lues (107, 156, 123, 157, 124, 158) ; 14b courbes, construire,
problèmes (125, 159, 121, 122, 108) ; 15 probabilités (109 à 114) ; 16 angles (076, 077, 078, 081) ;
17 géométrie (088, 089, 090, 091, 092, 093) ; 18 tracés (154, 155, 094, 095, 097) ; 19 solides et
déplacements (098, 099, 100, 102, 105, 103, 104).

**À trancher** : (a) l'ordre du § 4.6 (problèmes → grandeurs → données → probabilités → géométrie) ne
place pas les partages ni l'horloge, qui attendaient leurs outils. Reco : **lot 9 partages d'abord**
(clôt les nombres, outil et modèles CM1 jumeaux déjà relus), puis le lot 10 (horloge) avec les
grandeurs, puis l'ordre du § 4.6. (b) 101 (construire un patron du cube) reste en D, ou passe en B
avec ` ```patron completer:` (compléter un patron à qui manque une face) ? Reco : B, un modèle.
(c) 121 : écrit dans les limites actuelles (≤ 100, comme le lot 7 du CM1) ? Reco : oui.

### 14.1 Reclassement : décisions (David, 2026-11-17)

Recommandations suivies (« je te suis ») : (a) **lot 9 partages d'abord**, puis le lot 10 (horloge) avec les
grandeurs, puis l'ordre du § 4.6 ; (b) 101 passe en **B** (` ```patron completer:`, un modèle, au lot 19) ;
(c) 121 écrit dans les limites actuelles (échelle 1, 2, 5, 10 ; données ≤ 100).

## 15. Lot 9 — partages (131, 132, 136, 137, 143) : phase 0 (proposée le 2026-11-17)

Relevé MCP du 2026-11-17 : aucun modèle sur les 5 points. Nœuds : « Fractions : sens et écritures >
définition » (131, 132, 136, 137 ; niveaux 1 à 11 pris) et « Décimaux : numération > écritures » (143 ;
niveaux 1 à 13 pris). Jumeaux publiés : CM1 `092b310c` (145, lire), `14a2d26f` (144, colorier),
`60ce79bb` (150, lire décimale), `fe91cbd9` (149, colorier décimale), `b832dfdf` (156, colorier un
décimal) ; CE1 `6bee2313`, `435eb33c`, `191eee18`, `2d051cdc`. Décision § 4 bis : modèles CM2 propres.

Bornes `cycle3.json` : 131, 132 → dénominateur **≤ 60** (5/8) ; 136, 137 → dixièmes ou centièmes ;
143 → figure en dixièmes ou centièmes. Ce qui distingue le CM2 du CM1 : grandes grilles (jusqu'à 60
parts), fractions plus grandes que 1 jusqu'à 3 unités, centièmes au-delà de 1.

Outil (en prod) : ` ```partage ` : bande, disque (2 à 12 parts), grille L×C (≤ 10×10), `gris:` (lire, parts
d'affilée ou rangs tirés), `colorier:` (juge = NOMBRE de parts), `unites:` (1 à 5 figures).

| #   | Point   | Modèle                                               | Variations, plages                                                                                                                                                                                                                                                               | Nœud, niveau   |
| --- | ------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1   | CM2-132 | Quelle fraction de la figure est coloriée ?          | case fraction, toute fraction égale juste, `requiredForm: 'fraction'` ; V1 grille de 13 à 60 parts (3×5, 4×6, 5×8, 6×10…), parts d'affilée ; V2 même grille, parts éparpillées ; V3 > 1 : 2 ou 3 bandes ou disques de d parts (d 3 à 12), « chaque figure est une unité » (11/4) | définition, 12 |
| 2   | CM2-131 | Colorier une fraction d'une figure                   | `colorier:` ; V1 figure de k × d parts, d ≤ 12 (3/4 sur une grille 4×6) ; V2 grille, dénominateur de 13 à 60 (17/24, 23/40) ; V3 > 1 : `unites:` 2 ou 3, juste ce qu'il faut (11/4 sur 3 bandes de 4)                                                                            | définition, 13 |
| 3   | CM2-137 | Quelle fraction décimale de la figure est coloriée ? | case fraction, `requiredForm: 'fraction'` (virgule refusée) ; V1 grille 10×10, g/100 (non multiple de 10) ; V2 > 1 : 2 ou 3 bandes de 10, g/10 (14/10, 23/10) ; V3 > 1 : 2 grilles 10×10, 1xx/100 (137/100)                                                                      | définition, 14 |
| 4   | CM2-136 | Colorier une fraction décimale d'une figure          | `colorier:` ; V1 grille 10×10, n/100 ; V2 grille 10×10, n/10 (dixièmes = 10 cases chacun) ; V3 > 1 : bandes de 10, `unites:` 2 ou 3 (17/10) ; V4 > 1 : 2 grilles 10×10 (124/100)                                                                                                 | définition, 15 |
| 5   | CM2-143 | Colorier un nombre décimal                           | `colorier:` (énoncé « Colorie 0,37 de la figure… chaque grille est une unité ») ; V1 grille 10×10, 0,nn ; V2 grille 10×10, 0,n (0,4 = 40 cases) ; V3 deux grilles, 1,nn (1,37 du BO) ; V4 trois bandes de 10, 2,n                                                                | écritures, 14  |

Corrigés : « la figure est partagée en d parts égales, g sont coloriées : g/d » ; au-delà de 1, « chaque
figure est une unité : 2 unités et 3 quarts, soit 11/4 » ; décimal : « 0,4 = 4/10 = 40/100 : 40 cases ».
`reducedFractions: off` partout (1/2 juste sur une grille de 24 à moitié coloriée). Erreurs typiques en
`testSpecs` : parts non coloriées comptées (9/24 au lieu de 15/24), total des parts de toutes les figures
au dénominateur (11/12 au lieu de 11/4), 4 cases pour 0,4, « 1 + 3/4 » refusé (forme).

Pièges repris du CM1 (lot 3c) : specs de coloriage d'une grille ≤ 34 rangs (garde `answer-complexity-corpus`) ;
énoncé « Colorie 3/8 de la figure », pas « les 3/8 » ; éparpillées sans outil neuf (rangs (s + i × p) mod N + 1, p
premier avec N).

**Question d'accès** : 5 brouillons neufs, puis nœud + tag → personne ne lit rien de plus avant la
publication.

**À trancher** : (a) lire une grille de 60 parts (#1 V1, V2) : jusqu'à 60 comme la borne, ou plafonner à
40 pour que le comptage reste faisable sur téléphone ? Reco : **jusqu'à 60**, grilles à colonnes de 10
(6×10, 5×10 : on compte par lignes de 10). (b) un seul lot de 5 modèles ? Reco : oui.

### 15.1 Lot 9 : décisions (David, 2026-11-17)

Recommandations suivies (« je te suis ») : (a) grilles à lire jusqu'à 60 parts, en lignes de 10 au-delà
de 30 ; (b) un seul lot de 5 modèles. Tableau du § 15 gardé.

### 15.2 Lot 9 : écriture (2026-11-17)

- `docs/wip/questions/lot-cm2-9.py` → `scripts/questions/cm2-9/` (5 modèles, sans `theme` / `domain` /
  `subdomain`) ; `question:specs --instances 300` : 43 specs vertes, 5 100 tirages réussis, aucun
  `\textcolor` hors `$`. `create-questions` en simulation (prod) : 5 à créer, 0 en base.
- **Écart à la phase 0** : #1 V2 (parts éparpillées) au plus **12 parts coloriées** (on ne compte pas
  40 parts éparpillées une à une) ; grilles de 15 à 60 parts (13 et 14 n'ont pas de grille utile).
- Sonde des blocs ` ```partage ` (copie de `sonde-collections.ts` passée à `parsePartageContent`, hors
  dépôt) : 5 000 blocs lus, 0 problème.
- Worktree neuf : `pnpm exec svelte-kit sync` avant `question:specs` (sinon `Cannot find package '$lib'`).
- Base locale : 5 brouillons ; aperçu admin (port 5176, `--host 127.0.0.1`) : « Colorie 1/25 » sur une
  grille 5×5, 2 parts → « Faux », « Tu as colorié 2 parts sur 25 ; il fallait en colorier 1 (1/25) »,
  figure juste dessinée ; grille 5×10 à lire (47/50) lisible ; « Colorie 0,1 », une ligne glissée →
  « Juste ». La saisie MathLive ne se fait pas par l'extension Chrome : réponses tapées couvertes par les
  specs. Fichiers réécrits par le script ensuite (ids locaux retirés, identiques à la copie d'avant).
- #2789 (fichiers) : CI verte ; merge retenu par la garde pendant un `deploy:prod` (v0.94.0), puis mergée.

### 15.3 Lot 9 : brouillons, rangement (2026-11-17)

- David : `create-questions --dir scripts/questions/cm2-9 --publier` (dépôt principal) → `46b9aa11` (132,
  niv. 12), `549c7f1c` (131, 13), `137195bd` (137, 14), `5cc4ef1a` (136, 15), `b9ff4834` (143, 14) ; MCP :
  5 brouillons [CM2] sans nœud ni tag, `updated_at` = création. Fichiers à ids reportés sur
  `feat/questions-cm2-lot9-tags` (copie identique, `cmp`) ; ceux du dépôt principal mis en stash
  « cm2-9 ids (copie, reportée sur feat/questions-cm2-lot9-tags) ».
- Migration `20261117222938_questions_cm2_lot9_rangement_tags.sql`, copie du lot 8 (script, aucun reste
  du lot 8 au grep) ; nœuds : « Fractions : sens et écritures > définition » (131, 132, 136, 137),
  « Décimaux : numération > écritures » (143). Test `questions-cm2-lot9-rangement-tags` : 9 verts ;
  corps remplacé par `select 1;` → 5 rouges ; fichier restauré depuis sa copie (`cmp`).
- `security-auditor` : aucun finding (diff au gabarit du lot 8 : ids, codes, chemins, table temporaire et
  commentaires seuls ; 5 ids concordants partout ; relevé MCP : 5 points résolus sur leur sous-notion).
  Prod : dernière migration jouée `20261117215645`, la nôtre seule en attente.
- #2794 : CI verte au 3e passage (runner arrêté, puis job coupé à 20 min, sans lien avec la PR) ;
  `check:migrations --pr 2794` sortie 0 ; mergée. `db:migrate --dry-run` : refusé, `20261117222600` (carnet-heatmap)
  en attente avant la dernière jouée → stop, pas de `--include-all`.
- 2026-11-18 : migration `20261117222938` jouée hors de cette session (`migration list --linked` : plus rien en
  attente). MCP : 5 brouillons rangés (4 sur « définition », 143 sur « écritures »), un tag chacun (CM2-131, 132,
  136, 137, 143), `updated_at` = création. Page à cocher publiée (5 fiches, aucune alerte, figures dessinées) :
  https://claude.ai/artifact/6zsvpGYUozHpvSfTcTUhKx ; `verdicts` vide au départ.
- 2026-11-18 : 5 verdicts « OK » sur 5 (base relue) ; `publier-lot` en simulation : 5 brouillons passent ;
  `--publier` lancé par David ; MCP : 5 `published`. **Lot 9 clos.**

## 16. Lot 10 — heures et durées (082, 083, 084, 153, 085) : phase 0 (proposée le 2026-11-18)

Relevé MCP du 2026-11-18 : aucun modèle sur les 5 points. Nœuds (« Grandeurs et mesures > Durées ») : **lecture de
l'heure** (082, 083 ; niveaux 1 à 8 pris) et **calcul de durées** (084, 153, 085 ; niveaux 1 à 8 pris). Jumeaux CM1
publiés (lot 8a du CM1, `scripts/questions/cm1-8a/`) : `9e655e1a` (lire, cadran nu, niv. 6), `dd81eefb` (placer, 8),
`f3f00294` (durée entre deux horloges, 6), `cdec9199` (comparer, 8), `68134013` (problèmes, 5). Décision § 4 bis :
modèles CM2 propres.

Bornes `cycle3.json` : 082 « heures, minutes, secondes ; cadran ou affichage digital » ; 083 heure, minute et
seconde ; 084 « de 8 h 52 min 27 s à 11 h 37 min 18 s » ; 153 heures, minutes, secondes ; 085 une ou plusieurs étapes
(trois admises), calcul mental, pas d'algorithme posé en base soixante, unités jour, h, min, s.

**Ce qui distingue le CM2 du CM1** : les **secondes** partout (trotteuse lue et posée, durées en h, min, s), et des
problèmes à **plusieurs étapes** (trois admises) avec l'unité jour. Outil (en prod, v0.93.0) : trotteuse de
` ```horloge ` (`heure: 9 h 25 min 40 s` la dessine, la grande aiguille reste pile sur sa minute) et à placer
(`placer: 9 h 25 min 40 s` : trois aiguilles, trotteuse jugée à la seconde).

| #    | Point   | Sous-notion        | Modèle                                           | Variations, plages                                                                                                                                                                                                                                                                                                                                 |
| ---- | ------- | ------------------ | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10-1 | CM2-082 | lecture de l'heure | Quelle heure est-il ? (avec les secondes)        | trois cases `$?~\text{h}~?~\text{min}~?~\text{s}$` ; V1 cadran à 12 chiffres, trotteuse, à la seconde ; V2 `chiffres: quarts` ; V3 « c'est l'après-midi », réponse 13 h à 23 h 59 min 59 s                                                                                                                                                         |
| 10-2 | CM2-083 | lecture de l'heure | Place les aiguilles (avec les secondes)          | `placer: h h m min s s` ; V1 cadran à 12 chiffres ; V2 `chiffres: quarts` ; V3 heure de l'après-midi écrite 13 h à 23 h (« 15 h 37 min 20 s »)                                                                                                                                                                                                     |
| 10-3 | CM2-084 | calcul de durées   | Durée entre deux horloges (h, min, s)            | V1 moins d'une heure, à cheval sur la minute et l'heure (9 h 52 min 40 s → 10 h 07 min 15 s : 14 min 35 s) ; V2 de 1 h à 3 h 59 min 59 s, l'exemple du BO (8 h 52 min 27 s → 11 h 37 min 18 s : 2 h 44 min 51 s) ; V3 l'après-midi, `cadran: 24`                                                                                                   |
| 10-4 | CM2-153 | calcul de durées   | Quelle durée est la plus longue ? (à la seconde) | deux activités, quatre horloges à trotteuse ; V1 mêmes heures et minutes de durée, écart de 1 à 59 s ; V2 « elles durent autant » possible. Case « choix » à trois issues (comme `cdec9199`)                                                                                                                                                       |
| 10-5 | CM2-085 | calcul de durées   | Problèmes de durées (h, min, s, jours)           | V1 une étape, chronomètre : départ + durée en min et s, heure d'arrivée à la seconde ; V2 conversion dans un problème (une course de 135 s : 2 min 15 s ; 50 h : 2 jours 2 h) ; V3 trois étapes (trajet, arrêt, trajet), heure d'arrivée ; V4 voyage sur plusieurs jours (départ lundi 21 h 40, 27 h 35 min de trajet : quel jour, quelle heure ?) |

Forme commune (CM1, lot 8a) : une case par nombre, l'unité après la case ; minutes et secondes écrites sur deux
chiffres (`8 h 04 min 07 s`), donc `options.constraints.zeros: off` (sinon « 07 » tapé = ½ point). Corrigé par
instants intermédiaires, jamais de soustraction posée en base soixante : « de 8 h 52 min 27 s à 8 h 53 : 33 s ; à 9 h :
7 min ; à 11 h : 2 h ; à 11 h 37 : 37 min ; à 11 h 37 min 18 s : 18 s ; 7 + 37 = 44 min, 33 + 18 = 51 s ». Erreurs
typiques en `testSpecs` : secondes lues sur la grande aiguille (ou l'inverse), 100 s dans une minute (« 2 min 85 s »),
soustraction chiffre à chiffre (11 h 37 min 18 s − 8 h 52 min 27 s → 3 h −15 min −9 s, ou 2 h 85 min 91 s), minute
suivante comptée trop tôt (trotteuse sur 50 lue une minute de plus), 12 h ajoutée à tort.

**Question d'accès** : 5 brouillons neufs, puis nœud + tag → personne ne lit rien de plus avant la publication.

**À trancher** :

(a) Lire la trotteuse : cadran à 12 chiffres puis `chiffres: quarts`, **sans** cadran nu (`aucun`) — trois aiguilles
sur un cadran sans chiffre, à 4 cm sur téléphone, ce serait lire l'aiguille plus que l'heure ? Reco : **oui, pas de
cadran nu au CM2** (le CM1 l'a déjà).

(b) « Affichage digital » (082) : une variation « 08:52:27 » à écrire en h, min, s ? Reco : **non**, elle ne mesure
rien que le CM2 ne sache (lire des chiffres) ; le cadran suffit.

(c) 085 avec la conversion (V2 : 135 s = 2 min 15 s ; 50 h = 2 jours 2 h) : le BO cite les unités jour, h, min, s
sans dire « convertir ». Reco : **oui**, dans un problème, jamais en exercice nu.

(d) Niveaux : au lot 9 du CM2, les modèles neufs passent **après** les niveaux pris (12 à 15) ; ici, lire 9, placer 10
(lecture de l'heure) ; durée 9, comparer 10, problèmes 11 (calcul de durées). Les secondes rendent chacun plus dur que
son jumeau CM1. Relevés de nouveau juste avant la création. Reco : **oui**.

(e) Un seul lot de 5 modèles. Reco : **oui**.

### 16.1 Lot 10 : décisions (David, 2026-11-18)

Recommandations suivies (« je te suis ») : (a) trotteuse lue sur un cadran à 12 chiffres puis `chiffres: quarts`, pas de
cadran nu ; (b) pas de variation « affichage digital » ; (c) conversions dans les problèmes seulement ; (d) niveaux après
ceux pris : lire 9, placer 10 ; durée 9, comparer 10, problèmes 11 ; (e) un seul lot de 5 modèles. Tableau du § 16 gardé.

### 16.2 Lot 10 : écriture (2026-11-18)

- `docs/wip/questions/lot-cm2-10.py` → `scripts/questions/cm2-10/` (5 modèles, 16 variations, sans `theme` / `domain` /
  `subdomain`) ; niveaux 9, 10 (lecture de l'heure), 9, 10, 11 (calcul de durées). Instants comptés en secondes depuis
  0 h ; corrigé de 084 par instants intermédiaires (minute pleine, heure pleine, heures, minutes, secondes), retenues
  dites (« 15 + 55 = 70 s, soit 1 min 10 s »).
- `question:specs --instances 300` : 56 specs vertes, 4 800 tirages réussis, aucun `\textcolor` hors `$` ;
  `sonde-horloges` : 1 200 blocs, 0 problème ; `create-questions` en simulation (prod) : 5 à créer, 0 en base.
- Base locale (copie du dossier dans le scratchpad, `.env.local`, sous `with-db-lock.sh`) : 5 brouillons ; aperçu admin
  à 390 px (Playwright, port 5178) : trotteuse dessinée (lire), trois aiguilles à poser avec l'étiquette « trotteuse »
  (placer), deux et quatre horloges légendées, cases h / min / s.

### 16.3 Lot 10 : brouillons, rangement (2026-11-18)

- David : `create-questions --dir scripts/questions/cm2-10 --publier` (dépôt principal) → `16d78592` (082, niv. 9),
  `35ba6a94` (083, 10), `99f80f5e` (084, 9), `57846784` (153, 10), `2fda6db8` (085, 11) ; ids commités sur
  `feat/questions-cm2-lot10-rangement`. MCP : 5 brouillons [CM2] sans nœud ni tag, `updated_at` = création ; les 5
  points sur « Grandeurs et mesures > Durées » (082, 083 : « lecture de l'heure » ; 084, 153, 085 : « calcul de durées »).
- Migration `20261118074731_questions_cm2_lot10_rangement_tags.sql`, copie du lot 9 (script, aucun reste du lot 9 au
  grep). Test `questions-cm2-lot10-rangement-tags` : 9 verts ; corps remplacé par `select 1;` → 5 rouges ; fichier
  restauré depuis sa copie (`cmp`).
- `security-auditor` : aucun finding (diff au gabarit du lot 9 : ids, codes, chemins, table temporaire et commentaires
  seuls ; 5 ids concordants partout ; apostrophe doublée ; aucun changement d'accès).
- #2816 : CI verte au premier passage ; `check:migrations --pr 2816` sortie 0 ; mergée. `migration list --linked` : la nôtre
  seule en attente, plus récente que la dernière jouée (`20261118071439`) ; `db:migrate` depuis le worktree (dépôt
  principal bloqué par des fichiers non commités d'une autre session). MCP : 5 brouillons rangés (082, 083 sur « lecture
  de l'heure » ; 084, 153, 085 sur « calcul de durées »), un tag chacun, `updated_at` = création.
- Page à cocher publiée (5 fiches, aucune alerte, trotteuse et figures dessinées) :
  https://claude.ai/artifact/JTvJHxUWikfoPqdBBK4JBH ; `verdicts` vide au départ.

### 16.4 Lot 10 : relecture, publication (2026-11-18)

- 5 verdicts « OK » sur 5 (base relue) ; `publier-lot` en simulation : 5 brouillons passent ; `--publier` lancé par
  David ; MCP : 5 `published`. **Lot 10 clos.**

## 17. Lot 11a — problèmes en une étape (058, 059, 061, 066, 115, 116) : phase 0 (proposée le 2026-11-18)

Relevé MCP du 2026-11-18 : aucun modèle sur les 6 points. Sous-notions et niveaux pris :

- 058 (additifs, une étape) : point sur la notion « Problèmes arithmétiques » ; ses sous-notions **parties-tout**
  (niveaux 1 à 24, CP → CM1 ; CM1 `8a1d9a4a` entiers, `559aa5fc` décimaux et fractions) et **comparaison** (1 à 5 ;
  CM1 `24db415b` additive, `edb36f84` multiplicative) ;
- 059 (multiplicatifs parties-tout) : **multiplicatifs** (5 à 13 ; CM1 `e55366fc` partage exact, `b3771f79` avec reste) ;
- 061 (comparaison multiplicative) : **comparaison** (1 à 5) ;
- 066 (algébriques) : **nombre inconnu** (1 et 2 : CM1 `98f558e4`, `b28c7f78` balance, `c4011427` schéma en barres ;
  6e : 6 modèles `schema-barres`) ;
- 115 (identifier) : **caractérisation** (1 à 7, **que des modèles de 6e, 5e, 3e**) ;
- 116 (résoudre) : point sur la notion « Situations de proportionnalité » ; sous-notion **quatrième proportionnelle**
  (1 à 3 : 6e, 4e). Les points jumeaux du CM1 (CM1-129, CM1-130) n'ont **aucun** modèle.

Le niveau d'un modèle ne sert plus qu'à l'ordre et au badge (plus d'index unique sur l'arbre des notions,
`questions-bulk-status.ts`).

Bornes (`cycle3.json`, exemples de réussite CM2 p. 10-15 et 24) : champ du CM2 (entiers jusqu'à 9 chiffres,
décimaux aux millièmes, fractions de dénominateur ≤ 60) ; 059 : nombre de parts seulement si une part vaut un
**entier ≤ 10** (2 611 € à 7 €), valeur d'une part : 73,20 € ÷ 6 ; 061 : **plusieurs étapes** (trottinette quatre
fois plus chère que le casque, 161,25 € en tout) ; 066 : symboles, deux pesées (ciseaux, crayons), schéma en
barres (179 billes, quatre fois plus de rouges que de vertes, 17 vertes de moins que de bleues) ; 115 : dire si deux
grandeurs sont proportionnelles et le justifier (âge et taille : non ; masse d'une pile de manuels identiques :
oui) ; 116 : linéarité × une ou deux fois, ou × puis + (200 feuilles = 24 mm → 250 feuilles), **jamais le retour à
l'unité** (3 plaques → 5 plaques relève de la 6e), ni tableau, ni coefficient.

| #     | Point   | Sous-notion, niveau                 | Modèle                                       | Variations, plages                                                                                                                                                                                                                                                                                                                                     |
| ----- | ------- | ----------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 11a-1 | CM2-058 | parties-tout, 25                    | Problèmes additifs : parties-tout            | V1 le tout, entiers de 7 à 9 chiffres (budgets, populations) ; V2 une partie, décimaux aux millièmes (2,375 kg) ou prix ; V3 l'état de départ (« il a dépensé…, il lui reste… ») ; V4 fractions, l'un des dénominateurs multiple de l'autre (3/8 + 1/4 : 5/8, toute fraction égale juste)                                                              |
| 11a-2 | CM2-058 | comparaison, 6                      | Problèmes de comparaison additive            | V1 « … de plus que », chercher le plus grand (entiers à 7 chiffres) ; V2 l'écart (« combien de plus ? ») ; V3 « A a … de plus que B », chercher B (le piège : il faut soustraire) ; V4 décimaux, unités mêlées (1,48 m, 7 cm de plus)                                                                                                                  |
| 11a-3 | CM2-059 | multiplicatifs, 14                  | Problèmes multiplicatifs : le tout, une part | V1 le tout, décimal × entier (6 × 12,20 €) ; V2 la valeur d'une part, dividende décimal ÷ entier à un chiffre, reste nul aux centièmes (73,20 € ÷ 6) ; V3 le nombre de parts, une part entière de 2 à 10, dividende à 4 ou 5 chiffres (2 611 € ÷ 7 €)                                                                                                  |
| 11a-4 | CM2-061 | comparaison, 7                      | Comparaison multiplicative en deux étapes    | V1 « k fois plus cher », le total connu, chercher le plus grand (161,25 € pour k = 4 : 32,25 × 4 = 129 €) ; V2 « k fois plus », l'écart connu (k − 1 parts) ; V3 « k fois moins », le total connu, chercher le plus petit ; V4 « k fois plus » puis « … de plus » (Léa a 24 billes, Tom 3 fois plus, Inès 5 de plus que Tom : Inès ?) ; k de 2 à 9     |
| 11a-5 | CM2-066 | nombre inconnu, voir (e)            | Problèmes algébriques : symboles et schémas  | V1 deux balances (`figure`, comme `b28c7f78`) : 2 ciseaux + 1 crayon, 1 ciseaux + 1 crayon → deux cases ; V2 symboles : ■ + ■ + ▲ = 23 et ■ + ▲ = 15 ; V3 trois parts liées (`schema-barres`) : « k fois plus » et « … de moins » pour un total (179 billes : 27, 108, 44), trois cases                                                                |
| 11a-6 | CM2-115 | caractérisation, voir (e)           | Est-ce une situation de proportionnalité ?   | case « choix » Oui / Non ; V1 situation en mots, banque fermée (prix d'objets identiques, recette, pile de manuels, pas réguliers : oui ; âge et taille, pointure et âge, taxi avec prise en charge, aire et côté du carré : non) ; V2 deux mesures chiffrées qui contredisent ou non « k fois plus » dans un contexte donné (2 kg → 7 €, 6 kg → 18 €) |
| 11a-7 | CM2-116 | quatrième proportionnelle, voir (e) | Problèmes de proportionnalité (linéarité)    | V1 × une fois (4 croissants 3,60 € → 12 croissants) ; V2 ÷ puis × (200 feuilles 24 mm → 50 → 250 feuilles) ; V3 × puis + (12 œufs 300 g de farine → 18 œufs = 12 + 6) ; rapports simples seulement (2, 3, 4, 5, 10 et leurs inverses), jamais un passage par l'unité                                                                                   |

Forme commune (lot 6 du CM1) : une case par nombre, l'unité après la case (`$?~\text{€}$`) ; prix toujours à deux
décimales dans l'énoncé (`12,20 €`). Corrigés : la phrase de l'opération et son sens (« on cherche une partie : on
retire ») ; 116 en langage naturel (« 50 feuilles, c'est 4 fois moins que 200 : 24 ÷ 4 = 6 mm ; 250 = 5 × 50 :
5 × 6 = 30 mm »), jamais de tableau. Erreurs typiques en `testSpecs` : addition au lieu de soustraction sur « de plus
que, chercher B » ; total ÷ k au lieu de ÷ (k + 1) (161,25 ÷ 4) ; 24 + 50 = 74 mm (feuilles ajoutées aux
millimètres) ; ▲ = 23 − 15 (■ et ▲ confondus) ; « oui » au taxi (prix qui augmente ≠ proportionnel).

**Question d'accès** : 7 brouillons neufs, puis nœud + tag → personne ne lit rien de plus avant la publication.

**À trancher** :

(a) 058 en **deux modèles** (parties-tout et comparaison additive, deux sous-notions, comme les deux points du CM1
054 et 134) ? Reco : **oui**.

(b) 061 sans variation en une étape (le CM1 `edb36f84` la couvre ; la borne du CM2 dit « plusieurs étapes ») ?
Reco : **oui**, la distinction « fois plus / de plus » passe par V4.

(c) 115 V2 (deux mesures chiffrées) : le « oui » ne se prouve pas par deux nombres ; il vient du contexte écrit
(« prix au kilo affiché »), les nombres ne servent qu'à repérer le « non ». Garder V2 ainsi, ou V1 seule ? Reco :
**garder V2**, corrigé « 3 fois plus de kilos mais pas 3 fois plus cher : non ».

(d) 116 V3 (× puis +) : même réponse que V2 possible ; tirer des nombres où l'addition est la voie naturelle (12 → 18
= 12 + 6) plutôt que les mêmes que V2 ? Reco : **oui**, nombres propres à chaque variation.

(e) Niveaux. Au lot 10, les neufs passaient après les niveaux pris (des niveaux inférieurs). Ici trois sous-notions
ne portent que des modèles de **6e à 3e** (caractérisation 1 à 7, quatrième proportionnelle 1 à 3) ou mêlés
(nombre inconnu : CM1 et 6e au 1, 6e au 2). Après eux (8, 4, 3), le CM2 passerait derrière la 5e. Reco : **niveau 1**
dans ces trois-là (plusieurs modèles y partagent déjà le 1), et « après les pris » pour les trois autres (25, 6, 7,
14).

(f) Un seul lot de **7 modèles** ? Reco : **oui**.

### 17.1 Lot 11a : décisions (David, 2026-11-18)

Recommandations suivies (« je suis tes recos ») : (a) 058 en deux modèles (parties-tout, comparaison additive) ;
(b) 061 sans variation en une étape ; (c) 115 V2 chiffrée gardée (le « oui » vient du contexte écrit) ; (d) 116 :
nombres propres à chaque variation ; (e) niveau 1 dans « caractérisation », « quatrième proportionnelle » et
« nombre inconnu », après les pris ailleurs (parties-tout 25, comparaison 6 et 7, multiplicatifs 14) ; (f) un seul lot
de 7 modèles. Tableau du § 17 gardé.

### 17.2 Lot 11a : écriture (2026-11-18)

- `docs/wip/questions/lot-cm2-11a.py` → `scripts/questions/cm2-11a/` (7 modèles, 23 variations, sans `theme` / `domain` /
  `subdomain`) ; niveaux 25 (parties-tout), 6 et 7 (comparaison), 14 (multiplicatifs), 1 (nombre inconnu, caractérisation,
  quatrième proportionnelle).
- `question:specs --instances 300` : 81 specs vertes, 7 500 tirages réussis, aucun `\textcolor` hors `$` ; specs relues
  contre les conditions et les plages de leur variation (script, 0 écart) ; `sonde-figures` : 0 problème (balances) ;
  sonde des ` ```schema-barres ` des corrigés (copie de `sonde-horloges.ts` hors dépôt) : 556 blocs, 0 problème ;
  `create-questions` en simulation (prod) : 7 à créer, 0 en base.
- **Écarts à la phase 0** : 11a-5 V1, les deux pesées sont dessinées avec des boîtes étiquetées C (ciseaux) et K (crayon),
  structure fixe (2 C + K, puis C + K) ; 11a-5 V3, le schéma en barres est dans le **corrigé**, pas dans l'énoncé ; 11a-7
  V2, épaisseur d'un paquet de g feuilles bornée (g/20 ≤ w ≤ g/5 mm) et V3, 30 à 80 g de farine par œuf (nombres
  vraisemblables) ; 11a-4 V3, sonnette de 4 à 25 €.
- Base locale (copie du dossier dans le scratchpad, `.env.local`, sous `with-db-lock.sh`) : 7 brouillons ; aperçu admin à
  390 px (Playwright, port 5179) : deux balances lisibles, □ et △ rendus, case « choix » Oui / Non, grands nombres
  groupés (7 224 286), fractions.
- #2837 (fichiers) : CI verte au premier passage, mergée.

### 17.3 Lot 11a : brouillons, rangement (2026-11-18)

- David : `create-questions --dir scripts/questions/cm2-11a --publier`, lancé **depuis le worktree
  `ubumaths-wt-questions-cm1`** (ids écrits là, pas dans le dépôt principal) → `f0f354c8` (058, parties-tout, niv. 25),
  `fd017309` (058, comparaison, 6), `454c54ac` (059, 14), `ac39b933` (061, 7), `d962df2c` (066, 1), `90d6612d` (115, 1),
  `5343077e` (116, 1). Fichiers copiés sur `feat/questions-cm2-lot11a-tags` (identiques à `main` à la ligne `id` près).
  MCP : 7 brouillons [CM2] sans nœud ni tag, `updated_at` = création.
- CM2-058 est posé sur la notion « Problèmes arithmétiques », CM2-116 sur la notion « Situations de proportionnalité » :
  la règle des tags accepte un point sur le nœud du modèle **ou sur sa notion** ; la résolution de la migration suit la
  même règle (seul écart au gabarit du lot 10).
- Migration `20261118194448_questions_cm2_lot11a_rangement_tags.sql`, copie du lot 10 (script, aucun reste du lot 10).
  Test `questions-cm2-lot11a-rangement-tags` : 9 verts ; corps remplacé par `select 1;` → 5 rouges ; fichier restauré
  depuis sa copie (`cmp`).
- `security-auditor` : aucun finding bloquant (diff au gabarit du lot 10 : ids, codes, chemins, compteurs, table temporaire,
  commentaires et résolution nœud-ou-notion ; 7 ids concordants partout ; codes de points uniques). Cosmétique corrigé :
  titre du test. #2841 : CI non déclenchée au premier push (relancée par la fusion de `origin/main`) ; garde « doc à jour »
  rouge faute de `Doc-inchangée:` dans un commit (mise dans la description de la PR seulement).
- #2841 mergée ; `db:migrate` d'abord retenu (`20261118192953`, lot 8d du CM1, en attente avant la nôtre), puis lancé
  une fois celle-ci jouée par sa session : la nôtre seule appliquée. MCP : 7 brouillons rangés sur leur sous-notion, un tag
  chacun (058 ×2, 059, 061, 066, 115, 116), `updated_at` = création.
- Page à cocher publiée (7 fiches, aucune alerte) : https://claude.ai/artifact/JpVRrBTdn3tXrGPfDU4nLW ; `verdicts` vide au
  départ. Rendu à 390 px non revérifié (même gabarit que les lots 9 et 10).

### 17.4 Lot 11a : relecture, publication (2026-11-18)

- Page à cocher : 7 verdicts « OK », sans commentaire ; les 7 ids concordent avec `scripts/questions/cm2-11a/*.json`.
- `publier-lot --dir scripts/questions/cm2-11a` en simulation (prod) : 7 brouillons passent le contrôle ; David
  `--publier` ; simulation rejouée : les 7 « publié ».

## 18. Lot 11b — problèmes en plusieurs étapes (119, 060, 062, 063, 064) : phase 0 (proposée le 2026-11-18)

Relevé MCP du 2026-11-18 : aucun modèle sur les 5 points. Sous-notions et niveaux pris :

- 119 (additifs en plusieurs étapes), 060 (mixtes) : **en deux étapes ou plus** (niveaux 4 à 11, CP → CM1 ; CM1
  `9666ca34` additifs en deux ou trois étapes, `30c6f9d4` mixtes, les quatre opérations) ;
- 062 (dénombrement) : **produits cartésiens** (1 CE2, 2 CM1 `67cb8e74` : 6 × 3 tenues, menus, deux dés, dominos de 0
  à n ≤ 6) ;
- 063 (optimisation) : **optimisation** (1 CM1 `03bd034d` : bracelets, payer en pièces de 2 € et 5 €) ;
- 064 (préparer les algorithmes) : notion « Algorithmique », sous-notion **Préalgorithmique** (5 modèles de 6e, tous
  au niveau 1, sur les programmes : aucun sur la recherche exhaustive).

Bornes (`cycle3.json`, Exemples de réussite CM2 2025 p. 11-14) : champ du CM2, « plus la structure est complexe, plus
le champ numérique est réduit » (BO) ; 119 : Qassim (9 € + 13,85 € + camembert, billet de 50 €, 21,45 € rendus), Côme
(retire 40 €, rôti 17,80 €, il reste 31,40 € : au départ ?), Yseult (5/12 et 1/4 de pizza donnés : part gardée ?),
Léo et Lucie (43,40 € à deux, 7,80 € de plus : chacun ?) ; 060 : Romy (3 pains à 1,35 €, 7 chaussons, billet de 20 €,
7,90 € rendus : un chausson ?) ; 062 : tableau, arbre ou liste (trois lancers de pièce ; dominos de 0 à 6) ; 063 :
plusieurs contraintes (étagères : planches de 5 m coupées en 2 m, équerres, vis ; torchons 80 × 50 cm dans un tissu de
3 m × 2,40 m, 50 m de ruban) ; 064 : recherche exhaustive (rectangles d'aire 60 cm² à côtés entiers ; 100 œufs en
boîtes de 6 et de 10 ; groupes d'un nombre impair d'élèves dans une classe de 30).

Outil (en prod) : la case « choix » à **plusieurs bonnes réponses** (` ```choix ` + `plusieurs: oui`, note 1 / ½ / 0).

| #     | Point   | Sous-notion, niveau        | Modèle                                   | Variations, plages                                                                                                                                                                                                                                                                                                                                                          |
| ----- | ------- | -------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 11b-1 | CM2-119 | en deux étapes ou plus, 12 | Problèmes additifs en plusieurs étapes   | V1 un prix manquant (Qassim : deux prix connus, un billet, la monnaie rendue) ; V2 l'état de départ après deux ou trois actions (Côme) ; V3 fractions : la part qui reste (1 − 5/12 − 1/4 = 1/3, dénominateurs ≤ 60, l'un multiple de l'autre) ; V4 la somme et l'écart connus (Léo et Lucie) → deux cases                                                                  |
| 11b-2 | CM2-060 | en deux étapes ou plus, 13 | Problèmes mixtes en plusieurs étapes     | V1 un prix à l'unité inconnu (Romy : a objets à p €, b objets inconnus, billet, monnaie rendue ; division exacte au centime) ; V2 un achat puis un partage (k paquets à p €, partagés entre m amis) ; V3 recette et dépenses (n objets vendus à p €, des frais fixes, le bénéfice) ; entiers ≤ 10 000, prix à deux décimales                                                |
| 11b-3 | CM2-062 | produits cartésiens, 3     | Problèmes de dénombrement : arbre, liste | V1 trois ou quatre lancers d'une pièce : combien de résultats possibles ? (8, 16 ; corrigé en arbre) ; V2 nombres de trois chiffres écrits avec trois chiffres donnés, chacun une fois (6) ou répétés (27) ; V3 un tournoi, chaque équipe joue une fois contre chaque autre (n de 4 à 10 : n × (n − 1) ÷ 2)                                                                 |
| 11b-4 | CM2-063 | optimisation, 2            | Problèmes d'optimisation : contraintes   | V1 étagères : trois fournitures, les planches coupées (planche de L m → L ÷ l morceaux, sans reste utile), le plus petit des trois nombres ; V2 torchons : combien de rectangles dans le tissu (deux sens possibles, nombres où les deux sens diffèrent) et combien de tours de ruban, le plus petit des deux                                                               |
| 11b-5 | CM2-064 | Préalgorithmique, voir (c) | Trouver toutes les solutions             | case choix, `plusieurs: oui` : V1 rectangles d'aire A à côtés entiers (A parmi 24, 36, 48, 60…) : cocher toutes les dimensions possibles parmi 6 à 8 (pièges : 7 × 9 pour 60) ; V2 N œufs en boîtes pleines de 6 et de 10 (N pair de 40 à 100) : cocher toutes les façons ; V3 groupes de même taille, un nombre impair d'élèves (n de 20 à 36) : cocher toutes les tailles |

Forme commune (lot 11a) : une case par nombre, l'unité après la case ; prix à deux décimales ; corrigés en phrases
(schéma en barres pour 119 V1, V4 et 060 V1 ; arbre ou liste pour 062 ; liste organisée pour 064). Erreurs typiques en
`testSpecs` : 119 V2, 40 − 17,80 + 31,40 (sens de l'action) ; 119 V4, 43,40 ÷ 2 ; 062 V3, n × (n − 1) sans diviser
par 2 ; 063, le plus grand des nombres au lieu du plus petit ; 064, une seule solution cochée.

**Question d'accès** : 5 brouillons neufs, puis nœud + tag → personne ne lit rien de plus avant la publication.

**À trancher** :

(a) 064 : l'élève **coche toutes les bonnes réponses** dans une liste (« 1 × 60, 2 × 30, 7 × 9… : coche toutes les
dimensions possibles »), plutôt que de répondre « combien de solutions ? ». Reco : **cocher** ; le nombre seul ne
montre pas qu'il a trouvé les bonnes.

(b) 062 sans les dominos (le modèle du CM1 les a déjà, de 0 à 6) ? Reco : **oui**.

(c) 064 au **niveau 1** de « Préalgorithmique », où sont déjà les 5 modèles de 6e (même choix qu'au lot 11a, § 17.1
e) ? Reco : **oui**.

(d) 063 V2 : les torchons peuvent être posés dans les deux sens (en long : 12 torchons ; en large : 18). Garder ce
choix, qui est le cœur du problème ? Reco : **oui**, et le dire dans le corrigé.

(e) Un seul lot de **5 modèles** ? Reco : **oui**.

### 18.1 Lot 11b : décisions (David, 2026-11-18)

Recommandations suivies : (a) 064 en case choix `plusieurs: oui` (cocher toutes les solutions) ; (b) 062 sans les
dominos ; (c) 064 au niveau 1 de « Préalgorithmique » ; (d) 063 V2, les deux sens de pose des torchons, dit au
corrigé ; (e) un seul lot de 5 modèles. Tableau du § 18 gardé.

### 18.2 Lot 11b : écriture (2026-11-18)

- `docs/wip/questions/lot-cm2-11b.py` → `scripts/questions/cm2-11b/` (5 modèles, 15 variations, sans `theme` / `domain` /
  `subdomain`) ; niveaux 12, 13 (en deux étapes ou plus), 3 (produits cartésiens), 2 (optimisation), 1 (Préalgorithmique).
- `question:specs --instances 300` : 49 specs vertes, 4 500 tirages réussis, aucun `\textcolor` hors `$` ; sonde des
  ` ```schema-barres ` des corrigés : 171 blocs, 0 problème ; `create-questions` en simulation (prod) : 5 à créer, 0 en base.
- Case choix `plusieurs: oui` (064) : attendu calculé, un choix faux rend l'indice du premier choix vrai (`f`), un indice
  répété compte une fois ; un oubli = ½ point (`unoptimal_form`), un choix faux coché = faux.
- **Écarts à la phase 0** : 119 V1, le billet est toujours de 50 € ; 060 V1, toujours 20 € ; 062 V1, le corrigé liste les 8
  suites (et les prolonge pour 4 lancers) ; 064 V1, aire de 80 à 99 cm², 9 largeurs proposées (1 à 9 cm, au moins 4
  rectangles) ; V2, 90 à 98 œufs, 0 à 9 boîtes de 10 ; V3, 20 à 45 élèves, groupes de 3 à 15 (au moins 2 tailles,
  34, 38, 42 exclus). Lettres `e` (Euler) remplacées : `g` (écart), `q` (équerres).
- Base locale (copie du dossier dans le scratchpad, `.env.local`, sous `with-db-lock.sh`) : 5 brouillons ; aperçu admin à
  390 px (Playwright, port 5179) : 9 choix lisibles (A à I), fractions et énoncés corrects.
- #2848 (fichiers) : CI verte au premier passage, mergée.

### 18.3 Lot 11b : création en prod (2026-11-18)

- David : `create-questions --dir scripts/questions/cm2-11b --publier`, depuis le dépôt principal → `960e6a84` (119,
  niv. 12), `da63ec7b` (060, 13), `3d2219c0` (062, 3), `ea559f53` (063, 2), `66a1a4ee` (064, 1). Fichiers (ids) copiés
  sur `feat/questions-cm2-lot11b-tags` (identiques, `cmp`), puis remis à l'état de `main` dans le dépôt principal.

### 18.4 Lot 11b : rangement (2026-11-18)

- MCP : 5 brouillons [CM2] sans nœud ni tag, `updated_at` = création.
- CM2-064 est posé sur la **notion** « Algorithmique > Préalgorithmique », qui n'a aucune sous-notion (les 5 modèles de 6e
  y sont rangés directement) : le modèle va sur cette notion (`sous_notion` nulle, cas déjà prévu par le gabarit).
- Migration `20261118215227_questions_cm2_lot11b_rangement_tags.sql`, générée depuis celle du lot 11a par un script de
  substitution (aucun reste du lot 11a). Test `questions-cm2-lot11b-rangement-tags` : 9 verts ; corps remplacé par
  `select 1;` → 5 rouges ; fichier restauré depuis sa copie (`cmp`).
- `security-auditor` : aucun finding bloquant (diff au gabarit du lot 11a : ids, codes, chemins, compteurs, table
  temporaire, commentaires ; ligne `sous_notion` nulle résolue sur la notion sans être écrasée ; 5 ids concordants
  partout ; relevé MCP refait).
- #2852 : CI verte, mergée ; `migration list --linked` : seule la nôtre en attente ; `db:migrate` depuis le worktree
  (lien Supabase copié dans `supabase/.temp`, ignoré par git). MCP : 5 brouillons rangés (« en deux étapes ou plus » ×2,
  « produits cartésiens », « optimisation », « Préalgorithmique »), un tag chacun, `updated_at` = création.
- Page à cocher (5 fiches, aucune alerte, base prod) : https://claude.ai/artifact/9x1xabePSJzcA2CKK6ehYr ; `verdicts` vide au
  départ. Rendu à 390 px non revérifié (même gabarit que le lot 11a).

### 18.5 Lot 11b : relecture, publication (2026-11-18)

- Page à cocher : 5 verdicts « OK », sans commentaire ; les 5 ids concordent avec `scripts/questions/cm2-11b/*.json`.
- `publier-lot` en simulation refusé par le classifieur : David lance simulation et `--publier`. MCP : 5/5 `published`,
  [CM2], rangés, un tag chacun (119, 060, 062, 063, 064). **Lot 11b clos.**

## 19. Lot 12 — suites et motifs (068, 069, 070) : phase 0 (proposée le 2026-11-19)

Relevé MCP du 2026-11-19 : aucun modèle CM2 sur les 3 points. Les 3 sont posés sur la sous-notion **suites de
motifs** (Algèbre > Premiers pas algébriques), où sont déjà 5 modèles, tous au niveau 1 : 4 du CM1 (`b47f2699` suite,
trois termes suivants ; `e59976bf` suite, choisir la règle ; `37dd213b` motif, trois étapes suivantes ; `ac5fcd5c`
motif, choisir la règle) et 1 de 6e (`39bafe0e` motif : étape suivante, ce qu'on ajoute, étape lointaine, quelle étape).

Bornes (`cycle3.json`, Exemples de réussite CM2 2025 p. 15-16) : 068, trois termes suivants et **terme de rang
éloigné** pour une suite à pas constant (« 100e terme de 5 ; 8 ; 11 ») ; 069, aucune borne propre ; 070, relation avec
l'étape précédente **ou directement avec le rang**. BO (Algèbre) : exprimer « la relation entre deux éléments
consécutifs ou entre le rang d'un élément et la valeur associée » ; nombre générique, « (N × 12) + 5 ».

Outils (en prod) : ` ```figure ` (motifs dessinés en trois étapes, comme le CM1 et la 6e), case « choix ».

| #    | Point   | Sous-notion, niveau        | Modèle                                       | Variations, plages                                                                                                                                                                                                                                                                                                |
| ---- | ------- | -------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 12-1 | CM2-068 | suites de motifs, voir (a) | Suite de nombres : les trois termes suivants | Cinq termes donnés, trois cases. V1 − a (suite qui descend, a de 3 à 25, termes ≥ 0) ; V2 + a décimal (0,5 ; 0,25 ; 1,5 ; 2,5…), voir (b) ; V3 × k puis + c en alternance, ou + a, + 2a, + 3a… (écart qui grandit de 1 à chaque fois) ; V4 deux opérations en alternance sur des nombres jusqu'à 10 000           |
| 12-2 | CM2-068 | suites de motifs, (a)      | Suite à pas constant : un terme éloigné      | V1 le 100e terme (départ de 1 à 20, pas de 2 à 12 : u + 99 × a) ; V2 le 20e, 30e ou 50e terme ; V3 à quel rang trouve-t-on le nombre N ? (N dans la suite) ; corrigé : « du 1er au 100e, on avance de 99 pas »                                                                                                    |
| 12-3 | CM2-069 | suites de motifs, (a)      | Motif évolutif : les étapes suivantes        | Trois étapes dessinées, motifs qui grandissent dans plusieurs sens : V1 croix de jetons (5, 9, 13 : + 4, un par bras) ; V2 L de carreaux (3, 5, 7) ; V3 rectangle de jetons 1 × 2, 2 × 3, 3 × 4 (+ 4, + 6, + 8 : l'ajout grandit) ; V4 carrés d'allumettes en ligne de deux étages ; trois cases (étapes 4, 5, 6) |
| 12-4 | CM2-070 | suites de motifs, (a)      | Motif évolutif : une étape lointaine         | Trois étapes dessinées ; nombre d'éléments à l'étape 10, 20 ou 50 : V1 carrés d'allumettes accolés (3 × n + 1) ; V2 croix de jetons (4 × n + 1) ; V3 triangles d'allumettes (2 × n + 1) ; V4 inverse : à quelle étape y a-t-il N éléments ? ; corrigé par le rang (« 1 jeton au centre, puis 4 par étape »)       |
| 12-5 | CM2-070 | suites de motifs, (a)      | Motif évolutif : le calcul pour l'étape n    | Case « choix » : quel calcul donne le nombre d'éléments à l'étape 50 ? (« 3 × 50 + 1 », « 4 × 50 », « 50 + 3 », « 3 × 49 + 4 » vrai aussi → une seule juste par variation, voir (c)) ; mêmes motifs que 12-4                                                                                                      |

Forme commune (lot 6 ter du CM1) : une case par nombre, l'unité après la case (« jetons », « allumettes ») ; corrigés
avec les flèches de la règle (« + 4 ») entre les termes, puis le calcul par le rang. Erreurs typiques en `testSpecs` :
12-2, u + 100 × a (100 pas au lieu de 99) ; 12-4, 3 × n sans le premier côté (+ 1 oublié) ; 12-3 V3, + 4 à chaque fois
au lieu d'un ajout qui grandit ; 12-1 V2, 2,5 + 0,25 = 2,30.

**Question d'accès** : 5 brouillons neufs, puis nœud + tag → personne ne lit rien de plus avant la publication.

**À trancher** :

(a) Les 5 modèles au **niveau 1** de « suites de motifs », comme les 4 du CM1 et celui de 6e (personne n'est
renuméroté) ? Reco : **oui**.

(b) 12-1 V2 avec des **décimaux** (pas de 0,25 ou 2,5), au programme du CM2 ? Reco : **oui**, au plus deux chiffres
après la virgule.

(c) 12-5 : le calcul est choisi dans une liste, plutôt que tapé par l'élève (« écris le calcul ») ? Reco : **liste**
(le correcteur n'a pas à juger « 1 + 3 × 50 » contre « 3 × 50 + 1 ») ; les mauvais choix sont les erreurs typiques
(oublier le + 1, multiplier par le mauvais nombre), jamais un deuxième calcul juste.

(d) Un seul lot de **5 modèles** ? Reco : **oui**.

(e) Trouvé en passant : 2 modèles **publiés** du CM1 (`37dd213b`, `ac5fcd5c`) écrivent « un motif **de allumettes** »
(2 variations chacun). Corriger en « d'allumettes » à part, par `--mettre-a-jour` (instantané d'abord, § 7 de la
doc) ? Reco : **oui**, dans ce chantier, avant l'écriture du lot 12.

### 19.1 Lot 12 : décisions (David, 2026-11-19)

Recommandations suivies (« je te suis ») : (a) les 5 modèles au niveau 1 de « suites de motifs » ; (b) 12-1 V2 avec
des décimaux, deux chiffres après la virgule au plus ; (c) 12-5 en case « choix », une seule réponse juste ; (d) un
seul lot de 5 modèles ; (e) « de allumettes » des 2 modèles du CM1 corrigé dans ce chantier, avant l'écriture du lot.
Tableau du § 19 gardé.

### 19.2 Lot 12 : correction « d'allumettes », écriture (2026-11-19)

- (e) Les modèles publiés ne passent pas par `create-questions --mettre-a-jour` : lot `motifs-allumettes` de
  `update-published-questions.ts` (comme `horloges-ce-zeros`), sans migration. Même faute trouvée en base dans 3 modèles
  publiés de 1re spé (`89594aa7`, `05edc72b`, `41100a51`, « le nombre de allumettes ») : ajoutés au lot (5 cibles).
  Instantané de prod au premier commit ; scripts `lot-cm1-6ter.py` et `lot-1spe-suites.py` corrigés (`de()` élide),
  régénérés à part : identiques aux fichiers corrigés. Simulation en prod : `variations` seules, specs vertes (8, 8, 6,
  13, 9). #2860 : CI verte, mergée. Écriture en prod : à lancer par David (`--publier`), puis vérification au MCP.
- `docs/wip/questions/lot-cm2-12.py` → `scripts/questions/cm2-12/` (5 modèles, 19 variations, niveau 1, sans `theme` /
  `domain` / `subdomain`). `question:specs --instances 300` : 40 specs vertes, 5 700 tirages réussis, aucun `\textcolor`
  hors `$` ; `sonde-figures` : 900 blocs, 0 problème ; `create-questions` en simulation (prod) : 5 à créer, 0 en base.
- **Écarts à la phase 0** : 12-1 renommé « Suite de nombres : trouver la règle et continuer » (le CM1 `b47f2699` porte
  déjà « les trois termes suivants », même nœud, même niveau) ; 12-1 V1 de 1 000 à 9 999, pas de 11 à 99 ; V3 écart
  - a, + 2a, + 3a (a de 1 à 3) ; V4 × 2 puis + c (départ de 5 à 20, c de 1 à 9, c ≠ départ). 12-2 en 3 variations
    (100e ; 20e, 30e ou 50e ; quel rang). 12-3 V2 L de carreaux (3, 5, 7), V4 deux étages de carrés d'allumettes (7, 12,
    17 : 5 × n + 2). 12-4, étapes 10 à 60 ; V4 inverse sur les carrés. 12-5, étapes 20 à 60 ; calculs écrits « 3 × n + 1 »
    partout (choix et corrigés).
- Base locale (copie du dossier dans le scratchpad, `.env.local`, sous `with-db-lock.sh`) : 5 brouillons ; aperçu admin à
  390 px (Playwright, port 5186) : croix de jetons d'abord collées entre étapes (bras bout à bout) → étapes écartées ; les
  6 motifs lisibles, case « choix » A à D, nombres groupés (9 519), aucun débordement, 0 erreur console.

### 19.3 Lot 12 : prod, rangement, page à cocher (2026-11-19)

- David lance `update-published-questions --lot motifs-allumettes --publier` : MCP, les 5 modèles sans « de allumettes »,
  toujours `published`. Puis `create-questions --dir scripts/questions/cm2-12 --publier` : 5 brouillons [CM2], niveau 1,
  sans nœud ni tag (`4d75350c`, `1b122322`, `4baa1364`, `6223743f`, `3ffa86cd`), ids commités.
- Migration `20261119054950_questions_cm2_lot12_rangement_tags.sql`, dérivée de celle du lot 11b par substitution (aucun
  reste). Test `questions-cm2-lot12-rangement-tags` : 9 verts ; corps remplacé par `select 1;` → 5 rouges ; fichier
  restauré (`cmp`). `security-auditor` : aucun finding bloquant (non bloquant : aucun test ne contrôle les 5 modèles
  CM1 / 6e du même nœud, intouchés par construction).
- #2865 : CI verte, `check:migrations` vert, mergée. Prod portait `20261119052352` (lot 6 de `questions-1techno`, sur
  `main`) : worktree remis sur `origin/main`, `migration list --linked` → seule la nôtre en attente ; `db:migrate`. MCP :
  5 brouillons sur « suites de motifs », un tag chacun (068 ×2, 069, 070 ×2), `updated_at` = création.
- `garde-niveaux-tags` : aucun niveau manquant. Page à cocher (5 fiches, aucune alerte, base prod) :
  https://claude.ai/artifact/1v98tpiPCLMLkMkA9nQeS8 ; `verdicts` vide au départ.

### 19.4 Lot 19 réduit par le chantier `questions-cm1` (2026-11-19)

Message de la session `questions-cm1` : son lot 8e a tagué CM2-098 et 099 (vérifié au MCP : 1 modèle publié chacun) ; son
lot 8f (décidé par David le 2026-11-18, § 25 bis de `questions-cm1-progress.md`, `scripts/questions/cm1-8f/`, branche
`feat/questions-cm1-lot8f`) écrit 7 modèles CM1 et CM2, tagués aussi CM2-100, 101, 103, 104, 105 (0 modèle en prod au
2026-11-19). **Notre lot 19 se réduit à CM2-102 (patron du pavé)** ; ne pas écrire les autres en double. À la phase 0 du
lot 19 : revérifier au MCP que le lot 8f est bien tagué.

### 19.5 Lot 12 : relecture, publication (2026-11-19)

- Page à cocher : 5 verdicts « OK », sans commentaire ; les 5 ids concordent avec `scripts/questions/cm2-12/*.json`.
- David lance `publier-lot --dir scripts/questions/cm2-12` (simulation puis `--publier`). MCP : 5/5 `published`, [CM2],
  sur « suites de motifs », un tag chacun (068 ×2, 069, 070 ×2). **Lot 12 clos.**

## 20. Lot 13 — aires (071, 072, 073, 074, 075, 120) : phase 0 (proposée le 2026-11-19)

Relevé MCP du 2026-11-19 (sous-notions de Grandeurs et mesures > Aires) :

- **CM2-071 et CM2-072 sont déjà couverts** depuis le § 14 par deux modèles publiés **CM1 + CM2** (chantier
  `questions-cm1`), sur « aires sur quadrillage » : `d623374d` « Comparer les aires de deux figures » (niveau 1, 3
  variations, dont « le plus long tour a-t-il la plus grande aire ? ») et `31d64c00` « Aire en carreaux » (niveau 2,
  3 variations, demi-carreaux et autre unité « u »). **Aucun n'encadre une aire**, alors que la borne de 072 le demande
  (« carreaux entiers et demi-carreaux ; encadrement », Exemples de réussite CM2 p. 16).
- 073, 074, 075, 120 : aucun modèle CM2. Voisins : « unités et conversions », `614048c9` CM1 (aire en cm² sur
  quadrillage, niveau 1), `82748db8` 6e (conversions m² ↔ dm² ↔ cm², niveau 1, corrigé par tableau à deux colonnes par
  unité), `f628c809` 5e (niveau 1) ; « carré », `01e205ed` 6e (aire, niveau 1), `9f33998e` 6e (côté, niveau 2) ;
  « rectangle », `fdd849f5` 6e (aire, niveau 1), `059e3fc9` 6e (largeur, niveau 2). Les modèles de 6e tirent aussi mm²,
  dam², hm², hors CM2.

Bornes (`cycle3.json`) : 073, cm², dm², m² seulement (BO) ; 074, conversions entre m², dm², cm² (« 3,7 dm² en cm² ») ;
075 et 120, côtés entiers en cm, formule connue.

| #    | Point   | Sous-notion, niveau             | Modèle                              | Variations, plages                                                                                                                                                                                                                                                            |
| ---- | ------- | ------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 13-1 | CM2-073 | unités et conversions, voir (a) | Choisir l'unité d'aire              | Case « choix » cm² / dm² / m² : V1 « l'aire d'un timbre / d'une feuille de cahier / d'une salle de classe se mesure en… » ; V2 « l'aire de ce terrain est 420 … » (nombre donné, l'unité à choisir) ; V3 inverse, la mesure plausible parmi « 6 cm² », « 6 dm² », « 6 m² »    |
| 13-2 | CM2-074 | unités et conversions, (a)      | Convertir des aires                 | V1 m² → dm² ou dm² → cm² (× 100, entiers) ; V2 cm² → dm² ou dm² → m² (: 100, résultat entier ou décimal) ; V3 décimal vers l'unité plus petite (« 3,7 dm² = ? cm² ») ; V4 deux sauts m² ↔ cm², voir (c) ; corrigé par le tableau à deux colonnes par unité (comme `82748db8`) |
| 13-3 | CM2-075 | carré, (a)                      | Aire d'un carré                     | V1 côté donné en texte, de 2 à 12 cm ; V2 carré dessiné sur fond blanc, côté coté ; V3 petit problème (« un carreau carré de 9 cm de côté »), voir (d) ; réponse en cm², l'unité après la case                                                                                |
| 13-4 | CM2-120 | rectangle, (a)                  | Aire d'un rectangle                 | V1 longueur de 3 à 15 cm, largeur de 2 à 9 cm (L > l) ; V2 rectangle dessiné, côtés cotés ; V3 petit problème (« une étiquette de 8 cm sur 5 cm ») ; réponse en cm²                                                                                                           |
| 13-5 | CM2-072 | aires sur quadrillage, (b)      | Encadrer l'aire d'une figure courbe | Figure à bord courbe (disque, ovale, tache) sur quadrillage : deux cases, « au moins … carreaux » (carreaux entièrement dedans) et « au plus … carreaux » (carreaux touchés) ; comptes calculés par le générateur                                                             |

Erreurs typiques en `testSpecs` : 13-3, 4 × c (le périmètre) ou c + c ; 13-4, 2 × (L + l) ou L + l ; 13-2, × 10 au lieu
de × 100 (« 3,7 dm² = 37 cm² ») ; 13-5, cases inversées.

**Question d'accès** : 4 ou 5 brouillons neufs, puis nœud + tag → personne ne lit rien de plus avant la publication.

**À trancher** :

(a) Les modèles au **niveau 1** de leur sous-notion, comme les voisins de CM1 et de 6e (personne n'est renuméroté) ?
Reco : **oui** (même règle qu'au lot 12).

(b) 071 et 072 sont déjà couverts : on n'écrit **rien de plus pour 071**, et **un seul modèle pour 072**, l'encadrement
(13-5), seul morceau de la borne que les modèles CM1 + CM2 ne tirent pas ? Reco : **oui**.

(c) 13-2 V4 : les **deux sauts** m² ↔ cm² (« 2 m² = 20 000 cm² ») ? La 6e les a exclus (décision c3-12 du 2026-10-18,
« seulement m² ↔ dm² et dm² ↔ cm² ») ; la borne du CM2 ne tranche pas. Reco : **non**, comme la 6e (un saut à la fois,
le CM2 n'en fait pas plus que la 6e) ; 13-2 garde 3 variations.

(d) 13-3 et 13-4 : côtés **en cm seulement**, comme la borne, ou aussi en m et en dm dans les problèmes (« une pièce
carrée de 4 m de côté », réponse en m², ce qui sert aussi 073) ? Reco : **cm en V1 et V2, m ou dm en V3** (le BO du
CM2 nomme les trois unités d'aire ; les nombres restent entiers).

(e) Un seul lot de **5 modèles** ? Reco : **oui**.

### 20.1 Lot 13 : décisions (David, 2026-11-19)

Recommandations suivies (« je suis tes recos ») : (a) les 5 modèles au niveau 1 de leur sous-notion ; (b) rien de plus
pour 071, un seul modèle pour 072 (encadrement, 13-5) ; (c) pas de deux sauts m² ↔ cm², 13-2 en 3 variations ; (d) côtés
en cm en V1 et V2, en m ou dm dans le problème (V3), nombres entiers ; (e) un seul lot de 5 modèles. Le stash « cm2-9 ids »
du dépôt principal (5 fichiers identiques à `origin/main`) est supprimé.

### 20.2 Lot 13 : écriture (2026-11-19)

- `docs/wip/questions/lot-cm2-13.py` → `scripts/questions/cm2-13/` (5 modèles, 20 variations, niveau 1, sans `theme` /
  `domain` / `subdomain`). `question:specs --instances 300` : 43 specs vertes, 6 000 tirages réussis, aucun
  `\textcolor` hors `$` ; `sonde-figures` : 508 blocs, 0 problème ; `create-questions` en simulation (prod) : 5 à créer,
  0 en base.
- **Écarts à la phase 0** : 13-1 en 4 variations (objets en cm², en dm², en m², puis la mesure plausible parmi
  « 6 cm² / 6 dm² / 6 m² ») ; compléments écrits élidés (« d'une salle », « du sol ») : `de` + `{{if}}` ne s'élide
  pas. 13-2 V2 de 120 à 9 999 (unités ≠ 0 : deux chiffres après la virgule). 13-3 V2 côté de 2 à 9 cm, 13-4 V2 jusqu'à
  14 cm sur 8 cm : dessinés à l'échelle, fenêtre à la taille de la figure, côtés cotés par `milieu()` (un milieu
  calculé s'écrivait `\dfrac` pour un côté impair, refusé par le bloc). 13-5 titré « figure arrondie », une variation
  par figure (4 disques, 3 ovales en polygones de 48 côtés), comptes calculés sur la figure dessinée, sans tangence
  aux lignes (marge 0,12) et stables à l'échantillonnage ; lignes du quadrillage tracées **par-dessus** le remplissage
  (la grille de fond se perdait dessous).
- Base locale (copie du dossier dans le scratchpad, `.env.local`, sous `with-db-lock.sh`) : 5 brouillons ; aperçu admin à
  390 px (Playwright, port 5186), les 20 variations vues : aucun débordement, 0 erreur console ; décimaux groupés,
  case « choix » A à C, carreaux comptables.

### 20.3 Lot 13 : prod, rangement (2026-11-19)

- #2877 (fichiers) : CI verte, mergée. David lance `create-questions --dir scripts/questions/cm2-13 --publier` : MCP,
  5 brouillons [CM2], niveau 1, sans nœud ni tag (`087df1a4`, `302c7dcd`, `6243c462`, `d2e2f75d`, `678a72a7`), ids
  commités.
- Points vérifiés au MCP : 073, 074 sur « unités et conversions », 075 sur « carré », 120 sur « rectangle » ; 072 sur
  la **notion** « Aires » → modèle rangé sur sa sous-notion « aires sur quadrillage » (comme `31d64c00`).
- Migration `20261119104838_questions_cm2_lot13_rangement_tags.sql`, dérivée de celle du lot 12 par substitution (aucun
  reste). Test `questions-cm2-lot13-rangement-tags` : 9 verts ; corps remplacé par `select 1;` → 5 rouges ; fichier
  restauré (`cmp`).
- `security-auditor` : aucun finding bloquant (non bloquant : l'état de la prod vaut à l'instant de l'audit ; les
  gardes arrêtent la migration si un modèle a été rangé à la main entre-temps).
- #2878 : CI verte, `check:migrations` vert, mergée. Worktree remis sur `origin/main`, `migration list --linked` → seule
  la nôtre en attente ; `db:migrate`. MCP : 5 brouillons rangés (« unités et conversions » ×2, « carré », « rectangle »,
  « aires sur quadrillage »), un tag chacun (073, 074, 075, 120, 072), `updated_at` = création.
- `garde-niveaux-tags` : aucun niveau manquant. Page à cocher (5 fiches, aucune alerte, base prod) :
  https://claude.ai/artifact/6G45jabTk2DLAXfhojXQcb ; `verdicts` vide au départ.

### 20.4 Lot 13 : relecture, publication (2026-11-19)

- Page à cocher : 5 verdicts « OK », sans commentaire ; les 5 ids concordent avec `scripts/questions/cm2-13/*.json`.
- `publier-lot` en simulation : 5 brouillons passent le contrôle. David lance `--publier`. MCP : 5/5 `published`, [CM2],
  rangés et tagués (073, 074, 075, 120, 072). **Lot 13 clos.**

## 21. Lot 14a — données lues (107, 156, 123, 157, 124, 158) : phase 0 (proposée le 2026-11-19)

Relevé MCP du 2026-11-19 : aucun modèle CM2 sur les 6 points. Nœuds : « tableaux » (107, 156 ; niveaux 1 à 5 pris),
« diagrammes en barres » (123, 157 ; 1 à 7 pris), « diagrammes circulaires » (124, 158 ; 1 et 2 pris par la 5e et la
1re). Jumeaux CM1 publiés (lot 7 du CM1) : `f5742b78` (121, lire un tableau, populations à 6 chiffres), `40dcbbcc` (169,
la ville la plus peuplée), `cc52549c` (138, axes de 10, 20, 25, 50, jusqu'à 500), `c245f0cc` (171, combien de plus,
mois le plus fort, total). **Aucun diagramme circulaire au CM1.** Décision § 4 bis : modèles CM2 propres.

Bornes : générales du CM2 (entiers jusqu'à 999 999 999, décimaux jusqu'aux millièmes, **pas de pourcentages au cours
moyen**) ; 124, « diagramme circulaire avec légende ; parts simples (1/5, 3/10, 2/5) ». L'exemple de réussite du CM2
(cocktail) écrit **les fractions sur les secteurs** ; le bloc ` ```circulaire ` ne sait afficher que des pourcentages,
des effectifs, des angles ou rien (`étiquettes:`), et ne trace pas de parts égales : voir (b).

Ce qui distingue le CM2 du CM1 : grands nombres (millions) et décimaux dans les tableaux, tableau à double entrée
dans le même point, axes de 100 à 1 000 en barres, diagramme circulaire.

| #     | Point   | Sous-notion, niveau       | Modèle                                | Variations, plages                                                                                                                                                                                                                                                                                   |
| ----- | ------- | ------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14a-1 | CM2-107 | tableaux, 6               | Lire un tableau                       | V1 populations de 5 pays fictifs, 1 000 000 à 999 999 999, case nombre ; V2 l'inverse, « quel pays a … habitants ? » (case « choix », nombres de même longueur) ; V3 masses de 5 animaux en kg, millièmes (0,125 à 9,875) ; V4 double entrée, 5 villes × 3 années, pluie en mm                       |
| 14a-2 | CM2-156 | tableaux, 7               | Que dit le tableau ?                  | V1 le pays le plus peuplé (7 à 9 chiffres, trois de même longueur et même premier chiffre) ; V2 l'animal le plus léger, décimaux de longueurs différentes (2,5 et 2,375) ; V3 double entrée, l'année la plus pluvieuse d'une ville (choix) ; V4 combien de kg de plus (décimaux)                     |
| 14a-3 | CM2-123 | diagrammes en barres, 8   | Lis le diagramme (axe de 100 à 1 000) | V1 axe de 100 en 100, jusqu'à 1 000, barres sur une graduation ; V2 axe de 500 en 500 ou de 1 000 en 1 000, jusqu'à 10 000 (visiteurs d'un musée) ; V3 axe de 200 en 200, barres à mi-graduation ; V4 l'inverse, « quel mois … ? » (choix)                                                           |
| 14a-4 | CM2-157 | diagrammes en barres, 9   | Que dit le diagramme en barres ?      | V1 combien de plus en mars qu'en février (axe de 100 ou de 250) ; V2 le mois le plus fort ou le plus faible (choix) ; V3 combien de mois dépassent un seuil (une graduation de l'axe)                                                                                                                |
| 14a-5 | CM2-124 | diagrammes circulaires, 1 | Lis le diagramme circulaire           | Case fraction. V1 sans étiquettes, secteurs d'une moitié et de quarts (1/2, 1/4, 3/4) ; V2 `étiquettes: effectifs`, total de 10, 20, 30, 40 ou 50 élèves donné dans l'énoncé, parts en cinquièmes ou dixièmes (6 sur 30 → 1/5) ; V3 l'inverse, « quel moyen concerne le quart des élèves ? » (choix) |
| 14a-6 | CM2-158 | diagrammes circulaires, 2 | Que dit le diagramme circulaire ?     | V1 le moyen le plus utilisé (choix, sans étiquettes, secteurs bien distincts) ; V2 le moins utilisé ; V3 avec effectifs, combien d'élèves de plus en bus qu'à pied ; V4 « plus de la moitié des élèves viennent-ils en bus ? » (oui / non)                                                           |

Erreurs typiques en `testSpecs` : 14a-2 V2, le décimal le plus long pris pour le plus grand ; 14a-3 V3, la graduation du
dessous ; 14a-5 V2, l'effectif au lieu de la part (6 au lieu de 6/30), la part sur le mauvais total ; 14a-4 V1, la
somme au lieu de l'écart.

**Question d'accès** : 6 brouillons neufs, puis nœud + tag → personne ne lit rien de plus avant la publication.

**À trancher** :

(a) Niveaux : tableaux 6 et 7, barres 8 et 9 (à la suite du CM1), circulaires 1 et 2 (à côté de la 5e, qui commence
aussi ces niveaux) ? Reco : **oui**.

(b) Fractions écrites sur les secteurs (exemple du CM2) : le bloc ne le sait pas. Reco : **écrire 124 et 158 sans elles**
(moitiés et quarts reconnaissables à l'œil, puis parts calculées à partir des effectifs), et inscrire une option
`étiquettes: fractions` dans `outils-manquants.md` : petite, elle servirait aussi le problème du cocktail (108, lot 14b).
La faire avant le lot = un chantier à part.

(c) 14a-5 : toute fraction égale est juste (6/30 comme 1/5), le corrigé simplifie ? Reco : **oui**, comme au lot 9.

(d) Un seul lot de **6 modèles** ? Reco : **oui**.

### 21.1 Lots 15 et 18 réduits par le chantier `questions-cm1` (2026-11-19)

Message de la session `questions-cm1` (décision de David, § 26 bis de son journal) : ses modèles jumeaux CM1 + CM2
couvrent **CM2-109** (« Toutes les issues possibles », lot 9ab, #2881, migration qui tague les deux points),
**CM2-087** et **CM2-094** (constructions, lot 9c, pas encore écrit). Le lot 15 perd 109 ; le lot 18 perd 094, et 087
(classé D au § 14) est couvert. À vérifier au MCP avant la phase 0 de ces lots. 129 et 130 (proportionnalité) restent
CM1 seulement.

### 21.2 Lot 14a : décisions (David, 2026-11-19)

Recommandations suivies (« je te suis ») : (a) niveaux 6 et 7 (tableaux), 8 et 9 (barres), 1 et 2 (circulaires) ;
(b) 124 et 158 écrits sans fractions sur les secteurs (moitiés et quarts à l'œil, parts calculées sur les effectifs),
option `étiquettes: fractions` inscrite au n° 44 de `outils-manquants.md`, pour plus tard ; (c) toute fraction égale
juste, corrigé simplifié ; (d) un seul lot de 6 modèles.

### 21.3 Lot 14a : écriture (2026-11-19)

- `docs/wip/questions/lot-cm2-14a.py` → `scripts/questions/cm2-14a/` (6 modèles, 22 variations, sans `theme` / `domain` /
  `subdomain`). `question:specs --instances 300` : 50 specs vertes, 6 600 tirages réussis, aucun `\textcolor` hors `$` ;
  `create-questions` en simulation (prod) : 6 à créer, 0 en base.
- **Sonde des blocs de statistiques** (aucune dans `scripts/questions/`) : script du scratchpad, chaque bloc ` ```barres `,
  ` ```circulaire `, ` ```tableau-croise ` de 300 tirages par modèle passé à `parseStatChartContent` puis
  `buildStatChartScene` → 0 problème (témoin : `étiquettes: fractions` et une barre au-dessus de l'axe signalés).
- **Bug trouvé à l'aperçu, pas par les specs** : `posee()` n'entourait pas sa base de parenthèses ; avec une base
  composée (`2000+100*u1`, colis de 156 V2), les masses sortaient de leur plage (3,305 kg) et le plus léger n'était pas
  toujours le colis attendu. Les specs calculent avec la même expression : vertes. Corrigé (parenthèses) ; contrôle des
  extrêmes sur les 10 variations à choix (réponse = l'unique plus grand, plus petit, la moitié…) : 3 000 tirages justes,
  300 faux sur l'ancienne version. **Piège** : une spec qui recalcule la donnée par la formule du modèle ne la vérifie
  pas ; contrôler l'invariant (l'extrême est unique et au bon rang).
- **Écarts à la phase 0** : 156 V2 et V4 sur des colis (plus léger, combien de kg de plus), pas des animaux : plages
  libres pour le piège 2,1xx contre 2,2…2,9 ; 156 V1 tout en neuf chiffres (950 à 999 millions contre 800 à 949) ; 123 V2
  de 500 en 500 jusqu'à 5 000 (pas de 1 000 en 1 000) ; 157 V3 sur six mois.
- Base locale (copie du dossier dans le scratchpad, `.env.local`, sous `with-db-lock.sh`) : 6 brouillons ; aperçu admin
  à 390 px (Playwright, port 5186), les 22 variations vues : aucun débordement, 0 erreur console.

### 21.4 Lot 14a : prod, rangement, page à cocher (2026-11-19)

- #2883 (fichiers) : CI verte, mergée. David lance `create-questions --dir scripts/questions/cm2-14a --publier` (depuis le
  worktree) : MCP, 6 brouillons [CM2], niveaux 6, 7, 8, 9, 1, 2, sans nœud ni tag (`c382e240`, `e1f02c23`, `9d601156`,
  `aff8498b`, `d8a1484c`, `ebd55761`), ids commités.
- Migration `20261119144118_questions_cm2_lot14a_rangement_tags.sql`, dérivée de celle du lot 13 par substitution.
  Test `questions-cm2-lot14a-rangement-tags` : 9 verts ; corps remplacé par `select 1;` → 5 rouges ; fichier restauré
  (`cmp`). `security-auditor` : aucun finding bloquant ; un reste du gabarit (« les 5 brouillons » dans un commentaire)
  corrigé.
- #2885 : CI verte, `check:migrations` vert, mergée. Worktree remis sur `origin/main`, `migration list --linked` → seule
  la nôtre en attente ; `db:migrate`. MCP : 6 brouillons rangés (« tableaux » ×2, « diagrammes en barres » ×2,
  « diagrammes circulaires » ×2), un tag chacun (107, 156, 123, 157, 124, 158), `updated_at` = création.
- `garde-niveaux-tags` : aucun niveau manquant. Page à cocher (6 fiches, base prod) :
  https://claude.ai/artifact/UueCSUdzRztFPHQS6V3h6g ; `verdicts` vide au départ. `page-a-cocher.ts` ne dessine pas
  ` ```circulaire ` (alerte sur 2 fiches) : les 7 diagrammes de la page ont été dessinés après coup depuis
  `buildStatChartScene` (script du scratchpad, y de la scène vers le haut), alertes retirées. À ajouter à
  `page-a-cocher.ts` un jour (comme le n° 43 de `outils-manquants.md`).

### 21.5 Lot 14a : relecture, publication (2026-11-19)

- Page à cocher : 6 verdicts « OK », sans commentaire ; les 6 ids concordent avec `scripts/questions/cm2-14a/*.json`.
- `publier-lot` en simulation : 6 brouillons passent le contrôle. David lance `--publier`. MCP : 6/6 `published`, [CM2],
  rangés et tagués (107, 156, 123, 157, 124, 158). **Lot 14a clos.**

## 22. Lot 14b — courbes, construire, problèmes (125, 159, 121, 122, 108) : phase 0 (proposée le 2026-11-19)

Relevé MCP du 2026-11-19 : aucun modèle sur les 5 points. Nœuds : 125, 159, 122 sur « courbes et repères » (niveaux 1 à
3 pris : CM1, 5e) ; 121 sur « diagrammes en barres » (1 à 9 pris, 8 et 9 par le lot 14a) ; 108 sur la notion
« Représenter des données » (1 à 3 pris ; CM1-122 au niveau 3). Jumeaux CM1 publiés (lot 7 du CM1) : `5291dc9f` (139,
température toutes les deux heures, axe de 2 en 2), `da976537` (172 : plus haute, plus basse, écart, « entre quelles
heures elle baisse »), `a434bd68` (136, 5 points, axes donnés, grille de 1 sur 2), `01b73ca2` (135, tableau donné,
`axe: à choisir`), `ae74fe73` et `f1f7b2d1` (122, problèmes : tableau ; barres et courbe). Décision § 4 bis : modèles
CM2 propres.

Bornes : générales du CM2 ; 108, une ou deux étapes, tableau, barres, **circulaire**, courbe ; 121, échelle adaptée
(limites actuelles de `axe: à choisir` : 1, 2, 5, 10, données ≤ 100, § 14.1 c) ; 122, points éventuellement reliés,
échelle adaptée. Outils : ` ```courbe ` + `données:` (lire), ` ```courbe ` + `placer:` (au plus 6 points, sur un nœud
de la grille, virgule permise), ` ```barres ` + `placer: toutes` (`données:` = série brute que l'élève compte).

Ce qui distingue le CM2 du CM1 : relevés heure par heure et valeurs entre deux traits, courbes d'autres grandeurs
(masse en kg avec dixièmes, distance parcourue), la courbe « à plat » qui veut dire « rien ne change » ; un relevé brut
à compter avant de construire ; des repères de 100 en 100 ou de 0,5 en 0,5 ; le diagramme circulaire dans les problèmes.

| #     | Point   | Sous-notion, niveau        | Modèle                                                        | Variations, plages                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----- | ------- | -------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14b-1 | CM2-125 | courbes et repères, 4      | Lis la courbe                                                 | V1 température **heure par heure** (8 h à 18 h), axe de 2 en 2 °C, valeur parfois à mi-chemin entre deux traits (17 °C) ; V2 l'inverse, « à quelle heure faisait-il N °C ? » (une seule heure) ; V3 masse d'un bébé mois par mois (0 à 8 mois), axe de 0,5 en 0,5 kg, réponse décimale ; V4 distance parcourue par un randonneur heure par heure, axe de 2 en 2 km                                                        |
| 14b-2 | CM2-159 | courbes et repères, 5      | Que dit la courbe ?                                           | V1 « entre quelles heures la température augmente-t-elle ? » (une montée puis une descente, deux cases « de … h à … h ») ; V2 la plus forte hausse en une heure (entre quelles heures ?) ; V3 randonneur : « pendant combien de temps s'est-il arrêté ? » (un palier) ; V4 bébé : « combien de kg a-t-il pris entre N et M mois ? »                                                                                       |
| 14b-3 | CM2-121 | diagrammes en barres, 10   | Compte, puis construis le diagramme                           | V1 **relevé brut** : le nombre de frères et sœurs de 20 à 24 élèves (0 à 4), en liste dans l'énoncé, axe donné de 1 en 1, `données:` puis `placer: toutes` ; V2 tableau donné, effectifs jusqu'à 100, `axe: à choisir` (échelle 5 ou 10) ; V3 relevé brut de 30 à 40 élèves, `axe: à choisir` (échelle 2)                                                                                                                 |
| 14b-4 | CM2-122 | courbes et repères, 6      | Place les points du relevé                                    | Axes donnés, 5 ou 6 points. V1 visiteurs d'un parc jour par jour, axe de 100 en 100 (jusqu'à 1 000) ; V2 hauteur d'une plante semaine par semaine, axe de 0,5 en 0,5 cm ; V3 température toutes les deux heures (abscisses 8, 10, … 18), axe de 5 en 5 °C                                                                                                                                                                 |
| 14b-5 | CM2-108 | Représenter des données, 4 | Résous un problème avec un tableau ou des barres              | V1 tableau des prix de la cantine (décimaux : 3,85 €…), le coût d'une semaine pour deux enfants (deux étapes) ; V2 tableau à double entrée (élèves par classe et par sport), une différence puis un total ; V3 barres de 100 en 100, visiteurs d'un musée : total de deux mois, puis l'écart à un objectif                                                                                                                |
| 14b-6 | CM2-108 | Représenter des données, 4 | Résous un problème avec un diagramme circulaire ou une courbe | V1 **cocktail** : diagramme circulaire sans étiquettes (moitié, quart, quart), « pour N L de cocktail, combien de cL de jus d'ananas ? » ; V2 circulaire avec effectifs, combien d'élèves de plus en car qu'à vélo, puis la part du total ; V3 courbe de température : la hausse entre deux heures, puis la prévision « si elle monte encore de … » ; V4 randonneur : distance avant la pause, puis ce qui reste sur N km |

Forme commune : une case par réponse, l'unité après la case ; « lequel » en case « choix » ; corrigé : où lire (le
point de la courbe, le haut de la barre, la part), puis le calcul. Erreurs typiques en `testSpecs` : 125 V1, la
graduation du dessous au lieu de la moitié ; 125 V3, un carreau compté pour 1 kg ; 159 V1, l'heure du sommet prise pour
le début ; 159 V2, la plus haute valeur au lieu de la plus forte hausse ; 159 V3, la durée de marche au lieu de la
pause ; 108-5 V1, un seul enfant ou un seul jour ; 108-6 V1, la part de 1 L au lieu de N L, le quart pris pour 1/3.
121 : barre fausse jugée par le bloc, pas par les specs.

**Question d'accès** : 6 brouillons neufs, puis nœud + tag → personne ne lit rien de plus avant la publication.

**À trancher** :

(a) Niveaux : courbes 4, 5, 6 (à la suite du CM1 et de la 5e), barres 10, notion 4 et 4 ? Reco : **oui**.

(b) 108 en **deux modèles** (tableau ou barres ; circulaire ou courbe), comme les deux du CM1 ? Reco : **oui**, lot de
6 modèles.

(c) 121 : le **relevé brut à compter** (l'élève compte chaque valeur, puis construit), dans les limites actuelles de
l'échelle à choisir ? Reco : **oui** ; c'est ce que dit « recueillir des données ».

(d) Cocktail (108-6 V1) : parts lues à l'œil (moitié, quart), le bloc n'écrivant pas les fractions sur les secteurs
(n° 44 de `outils-manquants.md`) ? Reco : **oui**, comme au lot 14a.

### 22.1 Lot 14b : décisions (David, 2026-11-19)

Recommandations suivies (« je te suis ») : (a) niveaux 4, 5, 6 (courbes et repères), 10 (barres), 4 et 4 (notion
« Représenter des données ») ; (b) 108 en deux modèles, lot de 6 ; (c) 121 avec un relevé brut à compter, échelles 1,
2, 5, 10 et effectifs ≤ 100 ; (d) cocktail : parts lues à l'œil (moitié, quart).

### 22.2 Lot 14b : écriture (2026-11-19)

- `docs/wip/questions/lot-cm2-14b.py` → `scripts/questions/cm2-14b/` (6 modèles, 21 variations, sans `theme` / `domain` /
  `subdomain`). `question:specs --instances 300` : 45 specs vertes, 6 300 tirages réussis, aucun `\textcolor` hors `$` ;
  `create-questions` en simulation (prod) : 6 à créer, 0 en base.
- **Contrôle des invariants à part** (script du scratchpad, 3 000 tirages par variation, comme le § 21.3) : réponse
  unique et au bon rang (heure d'une température, montée, plus forte hausse, arrêt du randonneur), comptages du relevé
  brut, points dans la fenêtre. Il a trouvé un défaut que les specs ne voyaient pas : 159 V1, la fin de journée pouvait
  descendre sous le minimum du matin, ou le départ égaler le sommet (corrigé faux : « le point le plus bas ») ;
  conditions ajoutées. `question:specs` a trouvé une température négative (122 V3) : condition ajoutée. Puis 0 défaut.
- Base locale (copie du dossier dans le scratchpad, `.env.local`, sous `with-db-lock.sh`) : 6 brouillons ; aperçu admin
  à 390 px (Playwright, port 5186), les 21 variations vues, 0 erreur console, aucun débordement de page. Corrigés : le
  tableau du relevé (6 points) débordait à 390 px → une ligne par point ; l'axe vertical numérote de 4 en 4 quand un
  carreau vaut 2 → corrigés en « un carreau vaut 2 km » (température, cuve de même).
- Écarts à la phase 0 : 121 V2 en échelle 10 seulement (voix de 15 à 100) ; 108-5 V2, tableau des distances entre
  quatre villes (le détour par une ville), pas un tableau élèves × sports (déjà au CM1, `ae74fe73`) ; 108-6 V2, car et
  vélo ensemble contre à pied (une réponse) ; 108-6 V3, cuve d'eau et arrosoirs (la prévision de température est déjà
  au CM1, `f1f7b2d1`).

### 22.3 Lot 14b : prod, rangement, page à cocher (2026-11-19)

- #2893 (fichiers) : CI verte, mergée. David lance `create-questions --dir scripts/questions/cm2-14b --publier` (depuis le
  worktree) : MCP, 6 brouillons [CM2], sans nœud ni tag (`4e196673`, `d88cabf0`, `cad4418d`, `76e184e8`, `dd7065d9`,
  `837b6cfb`), ids commités.
- Migration `20261119165705_questions_cm2_lot14b_rangement_tags.sql`, dérivée de celle du lot 14a par substitution
  (deux modèles sur la notion « Représenter des données », CM2-108). Test `questions-cm2-lot14b-rangement-tags` :
  9 verts ; corps remplacé par `select 1;` → 5 rouges ; fichier restauré (`cmp`). `security-auditor` : aucun finding
  bloquant (non bloquant : la résolution par nom ne détecte pas un doublon de nœud ; aucun en prod).
- #2895 : CI verte, `check:migrations` vert, mergée. Worktree remis sur `origin/main`, `migration list --linked` → seule
  la nôtre en attente ; `db:migrate`. MCP : 6 brouillons rangés (« courbes et repères » ×3, « diagrammes en barres »,
  notion « Représenter des données » ×2), un tag chacun (125, 159, 122, 121, 108 ×2), `updated_at` = création.
- `garde-niveaux-tags` : aucun niveau manquant. Page à cocher (6 fiches, base prod) :
  https://claude.ai/artifact/VzSotRtECKkdN5SSpSUNMF ; `verdicts` vide au départ. Les 2 diagrammes circulaires
  (108-6) dessinés après coup par le script du lot 14a (`buildStatChartScene`), alerte retirée. Rendu à 390 px
  (Playwright, fichier local) : pas de débordement, 0 erreur.

### 22.4 Lot 14b : relecture, publication (2026-11-19)

- Page à cocher : 6 verdicts « OK », sans commentaire ; les 6 ids concordent avec `scripts/questions/cm2-14b/*.json`.
- `publier-lot` en simulation : 6 brouillons passent le contrôle. David lance `--publier`. MCP : 6/6 `published`, [CM2],
  rangés et tagués (125, 159, 122, 121, 108 ×2). **Lot 14b clos.**

## 23. Lot 15 — probabilités (110, 111, 112, 113, 114) : phase 0 (proposée le 2026-11-19)

Relevé MCP du 2026-11-19 : CM2-109 couvert par le jumeau CM1 + CM2 `5081e180` (§ 21.1) ; aucun modèle sur 110 à 114.
Nœuds : 110 et 114 sur « événements » (niveaux 1 et 2 pris : CM1/CM2, 5e, 4e, 3e) ; 111 et 112 sur « probabilité
simple » (1 et 2 pris : CM1, 6e, 4e) ; 113 sur « Expériences aléatoires » (1 et 2 pris : CM1, 4e). Aucun modèle d'un
autre niveau à taguer : ceux de 6e et 5e donnent la probabilité en fraction (`101cd4bd` : 1/a), hors CM2.

Bornes : 110, « tirer un roi », « obtenir un multiple de 3 » ; 111, forme « a chances sur b », équiprobabilité, **pas de
fraction** ; 112, comparer à « une chance sur deux » par la moitié de b, cas simples ; 113, générales ; 114, deux étapes,
tableau à double entrée ou arbre (deux lancers de pièce ; roue à 4 secteurs deux fois → 16 issues). Expériences de
109 : dé à six faces, pièce, jeu de 52 cartes, roue. Outils : case « choix » (`plusieurs: oui`), ` ```partage forme:
disque n ` (la roue, comme `63675a23`), ` ```probtree `, ` ```tableau-croise ` (affichés, rien à compléter dedans).

| #    | Point   | Sous-notion, niveau       | Modèle                               | Variations, plages                                                                                                                                                                                                                                                                                                                                                                           |
| ---- | ------- | ------------------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 15-1 | CM2-110 | événements, 3             | Les issues qui réalisent l'évènement | V1 dé à 6 faces, « obtenir un nombre pair / un multiple de 3 / plus grand que N » : coche toutes les issues (case « choix » `plusieurs`) ; V2 jeu de 52 cartes, « tirer un roi / un cœur / une figure / un as rouge » : combien de cartes ? ; V3 roue de 8 secteurs numérotés dessinée : coche les secteurs ; V4 sac de boules numérotées 1 à 12 ou 20, « un multiple de 4 / 5 » : combien ? |
| 15-2 | CM2-111 | probabilité simple, 3     | … chances sur …                      | Deux cases : « $?$ chances sur $?$ ». V1 dé à 6 faces (pair, multiple de 3, plus grand que N) ; V2 sac de r rouges et b bleues (total ≤ 20), « tirer une rouge » ; V3 roue de 8 parts, g grises dessinées ; V4 jeu de 52 cartes (un roi : 4 sur 52, un cœur : 13 sur 52)                                                                                                                     |
| 15-3 | CM2-112 | probabilité simple, 4     | Qu'est-ce qui est le plus probable ? | Case « choix ». V1 deux sacs de même total (3 rouges sur 8 contre 5 sur 8) : dans lequel a-t-on le plus de chances ? ; V2 « plus d'une chance sur deux, moins, ou exactement » (a comparé à la moitié de b, b pair ≤ 20) ; V3 deux roues, l'une de 4 parts, l'autre de 8 (1 grise sur 4 contre 3 sur 8 : on double) ; V4 dé : « pair » ou « plus grand que 4 » ?                             |
| 15-4 | CM2-113 | Expériences aléatoires, 3 | Le hasard n'a pas de mémoire         | V1 une pièce est tombée N fois de suite sur pile (N = 3 à 6) ; au lancer suivant : plus de chances pile, face, ou autant ? (choix) ; V2 le 6 n'est pas sorti depuis N lancers : a-t-il plus de chances de sortir ? (choix) ; V3 tirage d'une boule **remise** dans le sac après trois rouges : « $?$ chances sur $?$ » de tirer une rouge, inchangé                                          |
| 15-5 | CM2-114 | événements, 4             | Deux étapes : tableau ou arbre       | V1 deux lancers de pièce, arbre (` ```probtree `) : combien d'issues (4), chances de deux fois pile (1 sur 4), d'un pile et d'un face (2 sur 4) ; V2 roue de 4 secteurs (1 à 4) tournée deux fois, tableau à double entrée des sommes : combien d'issues (16), chances d'une somme donnée ; V3 une pièce puis un dé, arbre ou tableau (12 issues) : chances de « face et un nombre pair »    |

Forme commune : une case par nombre, « chances sur » écrit entre les deux cases ; « lequel » en case « choix » ;
corrigé : la liste des issues (toutes, puis celles qui réalisent l'évènement), puis le compte. Erreurs typiques en
`testSpecs` : 110, l'oubli du 6 dans « multiple de 3 » ; 111, les issues défavorables à la place des favorables
(« 2 sur 6 » pour « 4 sur 6 »), le nombre de couleurs pris pour le total (V2) ; 112, le plus grand nombre de boules
au lieu de la part ; 113, « face, c'est son tour » ; 114, 3 issues pour deux pièces (pile-face et face-pile confondus),
8 issues au lieu de 16.

**Question d'accès** : 5 brouillons neufs, puis nœud + tag → personne ne lit rien de plus avant la publication.

**À trancher** :

(a) Niveaux : événements 3 et 4, probabilité simple 3 et 4, Expériences aléatoires 3 ? Reco : **oui**.

(b) 111 : la réponse attendue est **le compte** (a = issues qui réalisent l'évènement, b = toutes les issues) ; « 1 chance
sur 3 » pour « 2 chances sur 6 » est-il juste ? Reco : **refusé, avec un message** (« compte les issues : combien en
tout ? ») ; simplifier, c'est la fraction égale, qui n'est pas au programme de CM2 pour les probabilités.

(c) 114 : les issues **affichées** (arbre ou tableau donné, l'élève compte), pas un arbre à compléter ? Reco : **oui** ;
un arbre à compléter n'existe pas en ` ```probtree ` (à inscrire dans `outils-manquants.md` si tu le veux).

(d) Un seul lot de **5 modèles** ? Reco : **oui**.

### 23.1 Lot 15 : décisions (David, 2026-11-19)

Recommandations suivies (« je valide ») : (a) niveaux 3 et 4 (événements : 110, 114), 3 et 4 (probabilité simple :
111, 112), 3 (Expériences aléatoires : 113) ; (b) 111 : « 1 chance sur 3 » pour « 2 chances sur 6 » refusé, avec un
message (« compte toutes les issues ») ; (c) 114 : arbre ou tableau donné, l'élève compte (rien à inscrire dans
`outils-manquants.md`) ; (d) un seul lot de 5 modèles.

### 23.2 Lot 15 : écriture (2026-11-19)

- **114 tout en tableau** (David, 2026-11-19, question posée pendant l'écriture) : ` ```probtree ` impose un nombre sur
  chaque branche (fraction, décimal, ou « … » qui fait case à remplir), sans option pour le cacher ; or le CM2 n'écrit
  pas de fractions en probabilités. Les 3 variations donnent les issues dans un tableau **markdown** (` ```tableau-croise `
  refuse une case en texte, « PF » : « n'est pas un nombre »). Arbre sans nombres : non inscrit (décision c).
- `docs/wip/questions/lot-cm2-15.py` → `scripts/questions/cm2-15/` (5 modèles, 19 variations, sans `theme` / `domain` /
  `subdomain`). `question:specs --instances 300` : 59 specs vertes, 5 700 tirages réussis, aucun `\textcolor` hors `$` ;
  `create-questions` en simulation (prod) : 5 à créer, 0 en base.
- **Contrôle des invariants à part** (script du scratchpad) : les 1 727 tirages possibles énumérés, réponse recalculée
  par comptage direct (faces, jeu de 52 cartes construit, boules, issues des deux étapes par produit cartésien,
  comparaisons en fractions exactes) : 0 défaut.
- Écart à la décision (b) : un message attaché à une réponse fausse n'existe pas (`correction.feedback.incorrect` n'est
  affiché nulle part) ; « 1 sur 3 » est jugé faux (deux cases, 1 ≠ 2 et 3 ≠ 6), et le corrigé dit pourquoi (« on ne
  simplifie pas : “1 chance sur 3” ne dit pas combien il y a d'issues »).
- Écart à la phase 0 : 112 en 5 variations (deux sacs de même total ; à « une chance sur deux » ; deux sacs de même
  nombre de rouges, l'erreur « le sac le plus plein » ; deux roues de 4 et 8 parts ; deux évènements d'un dé) ; 110 V3
  (roue numérotée) remplacée par le jeu de 52 cartes (le bloc ` ```partage ` ne numérote pas ses parts).
- **Captures à 390 px lues** (19 variations, 0 erreur console). 114 corrigé : (1) les `**Pile**` des en-têtes de ligne
  s'affichaient avec leurs astérisques, car une cellule de tableau SANS trou ne rend que texte et formules
  (`TableNode.svelte`, `cellContent`) ; gras retiré des 3 variations. (2) V3, pièce puis dé : 7 colonnes, le tableau
  défilait dans son cadre et les colonnes 5 et 6 étaient cachées (le défilement de la PAGE restait à 0) ; tableau
  retourné (dé en lignes, pièce en colonnes), « $6 \times 2$ » dans le corrigé. Specs revertes, brouillon local mis à
  jour, captures relues.
- **Même défaut en prod, lot 14b** : CM2 « Problèmes avec un tableau ou des barres » V2 (tableau des distances, sans
  trou) affiche `**Brumeval**`, etc. Les lots CE1-7, CE2-7c et CM1-7 ne l'ont pas (leurs tableaux ont des trous, rendu
  par `tableCellInlineNodes`, qui lit le gras). Question posée à David.

### 23.3 Lot 15 : prod, rangement, page à cocher (2026-11-19)

- #2905 (fichiers) : CI verte, mergée. David lance `create-questions --dir scripts/questions/cm2-15 --publier` (depuis le
  dépôt principal : ids écrits dans les fichiers de `main`, déplacés sur la branche du rangement, `main` restauré). MCP :
  5 brouillons [CM2], niveaux 3, 3, 4, 3, 4, sans nœud ni tag, `updated_at` = création (`c8ea1f9a`, `07fdaf1b`,
  `0f60db1a`, `400f5c43`, `bf378626`).
- Migration `20261119191121_questions_cm2_lot15_rangement_tags.sql`, dérivée de celle du lot 14b par substitution
  (110 et 114 sur « événements », 111 et 112 sur « probabilité simple », 113 sur la notion « Expériences aléatoires »).
  Test `questions-cm2-lot15-rangement-tags` : 9 verts ; corps remplacé par `select 1;` → 3 rouges (4 sautés) ; fichier
  restauré (`cmp`).
- `security-auditor` : aucun finding bloquant. #2907 : CI verte, `check:migrations` vert, mergée. Worktree remis sur
  `origin/main`, `migration list --linked` → seule la nôtre en attente ; `db:migrate`. MCP : 5 brouillons rangés
  (« événements » ×2, « probabilité simple » ×2, notion « Expériences aléatoires »), un tag chacun (110 à 114),
  `updated_at` = création.
- `garde-niveaux-tags` : aucun niveau manquant. Page à cocher (5 fiches, base prod, aucune alerte) :
  https://claude.ai/artifact/FcxbrRRwWXPKeit927pogK ; `verdicts` vide au départ. Rendu à 390 px (Playwright, fichier
  local) : pas de débordement, 0 erreur.

### 23.4 Lot 15 : relecture, publication (2026-11-19)

- Page à cocher : 5 verdicts « OK », sans commentaire ; les 5 ids concordent avec `scripts/questions/cm2-15/*.json`.
- `publier-lot` en simulation : 5 brouillons passent le contrôle. David lance `--publier`. MCP : 5/5 `published`, [CM2],
  rangés et tagués (110 à 114). **Lot 15 clos.**

## 24. Lot 16 — angle droit et figures (081, 088, 092, 093) : phase 0 (proposée le 2026-11-19)

Relevé MCP du 2026-11-19, avant la phase 0 du lot 16 : le chantier `questions-cm1` (lots 8 et 9, clos, journal
archivé) a écrit des jumeaux **CM1 + CM2**, publiés et tagués, sur la plupart des points des lots 16 à 19 :

- angles : 076 (`8da9f669`), 077 (`4c1ce174`), 078 (`97f2374b`) ;
- géométrie : 089 (`54c0f87f`), 090 (`265ed3cc`), 091 (`f988f07a`) ; constructions 087 (`7d048525`), 094 (×3), tracés
  154 (`66b4d4ed`), 155 (`6452c31c`) ;
- solides et déplacements : 098, 099, 100, 101 (×2), 103, 104 (×2), 105.

Même règle qu'au § 21.1 (un jumeau CM1 + CM2 couvre le point). **Restent 7 points sans modèle** : 081 (angle droit),
088 (codes), 092 (nommer les figures), 093 (propriétés), 095 (figure composée), 097 (symétrique), 102 (patron du
pavé). Le CM1 n'a pas tagué 088, 092, 093 : le CM2 y ajoute les angles égaux et ⊥, //, ∈, ∉ (088) ; le trapèze, le
trapèze rectangle, le pentagone et l'hexagone (092, 093). Ses modèles `6108cc4c`, `273dce6f`, `20907b18` (CM1-098, 102, 103) servent de gabarit (` ```figure ` codée + case « choix », `lot-cm1-8c.py`).

Nœuds : 081 sur « mesure en degrés » (niveau 1 pris : 6e) ; 088, 092, 093 sur « propriétés » (niveaux 1 à 10 pris :
CP à CE2, CM1). Aucun modèle d'un autre niveau à taguer (6e : rapporteur, hors CM2).

Bornes : 081, angle droit = 90°, sa moitié 45° par pliage, **pas de rapporteur**, angles saillants seulement ; 088,
codes des angles droits, des angles égaux, des longueurs égales, symboles ⊥, //, ∈, ∉ ; 092 et 093, la liste du BO
(triangles rectangle, isocèle, équilatéral, quadrilatère, carré, rectangle, losange, trapèze, trapèze rectangle,
pentagone, hexagone pour 092).

| #    | Point   | Sous-notion, niveau | Modèle                                | Variations, plages                                                                                                                                                                                                                                                                                                    |
| ---- | ------- | ------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16-1 | CM2-081 | mesure en degrés, 2 | L'angle droit mesure 90°              | V1 figure codée (un angle droit parmi 3 ou 4) : « quel angle mesure 90° ? » (choix) ; V2 un angle droit plié en deux : chaque moitié mesure ? (45) ; V3 un angle de N° (N de 10 à 170, ≠ 90) : plus petit qu'un angle droit, droit, plus grand ? (choix) ; V4 combien d'angles de 45° pour faire un angle droit ? (2) |
| 16-2 | CM2-088 | propriétés, 11      | Les codes : angles et longueurs égaux | V1 quadrilatère ou triangle, deux angles codés du même arc (`arc`, `arcs2`) : quel angle a la même mesure que $\widehat{ABC}$ ? (choix) ; V2 figure codée (carrés, traits, arcs) : quelle phrase est vraie ? (choix) ; V3 que disent les codes ? cocher toutes les phrases vraies (`plusieurs: oui`)                  |
| 16-3 | CM2-088 | propriétés, 12      | Les symboles ⊥, //, ∈, ∉              | V1 deux droites dessinées (d) et (d') : quelle écriture est vraie, $(d) \perp (d')$ ou $(d) \parallel (d')$ ? ; V2 lire $(d) \perp (d')$ en phrase (choix) ; V3 droite (d) et points A, B, C (deux sur la droite) : cocher les écritures vraies parmi $A \in (d)$, $B \notin (d)$… (`plusieurs: oui`)                 |
| 16-4 | CM2-092 | propriétés, 13      | Nommer une figure (CM2)               | V1 figure codée → nom le plus précis, trapèze et trapèze rectangle compris (parallélisme donné par $(AB) \parallel (CD)$ sous la figure, faute de code) ; V2 définition → nom (choix parmi les 12) ; V3 polygone quelconque dessiné, 5 ou 6 côtés : pentagone, hexagone ?                                             |
| 16-5 | CM2-093 | propriétés, 14      | Propriétés des figures usuelles (CM2) | V1 quelle phrase est vraie ? (trapèze, trapèze rectangle compris) ; V2 $ABCD$ trapèze de bases $[AB]$ et $[CD]$ : quel côté est parallèle à $[AB]$ ? ; V3 cocher les figures dont les côtés opposés sont parallèles deux à deux (pas le trapèze) ; V4 combien d'angles droits a un trapèze rectangle ? (2)            |

Erreurs typiques en `testSpecs` : 081, 180 pour l'angle droit ; 90 pour la moitié ; 088, l'angle voisin pris pour
l'angle de même arc, ⊥ et // confondus, $\in$ pour un point hors de la droite ; 092, « rectangle » pour un carré,
« quadrilatère » pour un trapèze, « hexagone » pour 5 côtés ; 093, le trapèze parmi les figures à côtés opposés
parallèles deux à deux, 1 angle droit pour le trapèze rectangle.

**Question d'accès** : 5 brouillons neufs, puis nœud + tag → personne ne lit rien de plus avant la publication.

**À trancher** :

(a) Les jumeaux CM1 + CM2 couvrent 076, 077, 078 et 13 points des lots 17 à 19 : acceptés comme couverture (règle du
§ 21.1), sans modèle CM2 propre ? Reco : **oui**.

(b) Lot 16 élargi aux points restants du lot 17 (088, 092, 093) : **5 modèles**, deux pour 088 (codes ; symboles) ?
Puis un dernier lot 17 pour 095, 097, 102 (case « figure », ` ```patron `), et le chantier est fini. Reco : **oui**.

(c) Niveaux : mesure en degrés 2 ; propriétés 11, 12, 13, 14 ? Reco : **oui**.

(d) 092, le trapèze : son parallélisme écrit sous la figure ($(AB) \parallel (CD)$), puisqu'il n'y a pas de code du
parallélisme ; et « nom le plus précis » (un rectangle est aussi un trapèze : on attend « rectangle ») ? Reco : **oui**.

### 24.1 Lot 16 : décisions (David, 2026-11-19)

Recommandations suivies (« je te suis ») : (a) les jumeaux CM1 + CM2 couvrent 076, 077, 078 et les 13 points des lots
17 à 19 ; (b) lot 16 élargi à **5 modèles** (081, 088 ×2, 092, 093), puis un **dernier lot 17** (095, 097, 102) ;
(c) niveaux : mesure en degrés 2, propriétés 11 à 14 ; (d) trapèze : `(AB) // (CD)` écrit sous la figure, et le nom
le plus précis attendu.

### 24.2 Lot 16 : écriture (2026-11-19)

- `docs/wip/questions/lot-cm2-16.py` → `scripts/questions/cm2-16/` (5 modèles, 17 variations, gabarits de
  `lot-cm1-8c.py`). `question:specs --instances 300` : 59 specs vertes, 5 100 tirages réussis, aucun `\textcolor`
  hors `$` ; `sonde-figures` : 0 problème ; `create-questions` en simulation (prod) : 5 à créer, 0 en base.
- Formes revues par le script (assertions) : le quadrilatère, le pentagone et l'hexagone n'ont ni angle presque droit
  (à moins de 16°), ni côtés presque égaux, ni côtés presque parallèles ; les trapèzes n'ont que `[AB] // [CD]`.
- Choix multiple (088 codes V3, symboles V3 ; 093 V3) : des bonnes cases seulement, mais pas toutes = **en partie juste**
  (`unoptimal_form`, ½ point, `choices.ts`), pas faux : specs écrites ainsi.
- `sonde-figures` ne lit pas les figures placées DANS les options d'une case « choix » (081 V1 : « 0 blocs ») : vues à
  l'écran.
- Base locale (copie dans le scratchpad, `.env.local`, `with-db-lock.sh`) : 5 brouillons ; aperçu admin à 390 px
  (Playwright, port 5186), les 17 variations, plus trapèze, trapèze rectangle et droites perpendiculaires ciblés : aucun
  débordement, 0 erreur. Corrigé : étiquettes `(d)` / `(d')` collées au bout des droites → écartées.
- #2915 (fichiers) ouverte.

### 24.3 Lot 16 : prod, rangement, page à cocher (2026-11-19)

- #2915 (fichiers) : CI verte, mergée. David lance `create-questions --dir scripts/questions/cm2-16 --publier` depuis le
  worktree (branche du rangement : ids écrits là). MCP : 5 brouillons [CM2], niveaux 2, 11, 12, 13, 14, sans nœud ni
  tag, `updated_at` = création (`a741e3dd`, `5834743b`, `464b1661`, `5f2c283f`, `5c13d53e`).
- Migration `20261119205908_questions_cm2_lot16_rangement_tags.sql`, dérivée de celle du lot 15 par substitution
  (081 sur « Grandeurs et mesures > Angles > mesure en degrés » ; 088 ×2, 092, 093 sur « Géométrie > Figures planes >
  propriétés »). Test `questions-cm2-lot16-rangement-tags` : 9 verts ; corps remplacé par `select 1;` → 5 rouges ;
  fichier restauré (`cmp`). `security-auditor` : aucun finding (9/9 rejoué après le commit).
- #2917 : CI verte, `check:migrations` sortie 0, mergée. `migration list --linked` : la nôtre **déjà en prod**, poussée
  par le `db:migrate` d'une autre session juste après le merge ; rien relancé. MCP : 5 brouillons rangés (« mesure en
  degrés », « propriétés » ×4), un tag chacun (081, 088, 088, 092, 093), `updated_at` = création.
- `garde-niveaux-tags` : aucun niveau manquant. Page à cocher (5 fiches, base prod, aucune alerte) :
  https://claude.ai/artifact/6jPfzF3pMvofQUiKBdTkUq ; `verdicts` vide au départ. Rendu à 390 px (Playwright, fichier
  local) : pas de débordement, 0 erreur.

### 24.4 Lot 16 : relecture, publication (2026-11-19)

- Page à cocher : 5 verdicts « OK », sans commentaire ; les 5 ids concordent avec `scripts/questions/cm2-16/*.json`.
- `publier-lot` en simulation : 5 brouillons passent le contrôle. David lance `--publier`. MCP : 5/5 `published`, [CM2],
  rangés et tagués (081, 088 ×2, 092, 093). **Lot 16 clos.**

## 25. Lot 17 — symétrique et patron du pavé (097, 102) : phase 0 (proposée le 2026-11-19)

Relevé MCP du 2026-11-19 : 095, 097, 102 toujours sans modèle, ni brouillon. Les autres points CM2 sans modèle
sont les D tranchés le 2026-11-04 (126, 079, 080, 096, 106). Les jumeaux du chantier `questions-cm1` couvrent 100,
101, 103, 104, 105 (vérifié : 1 ou 2 modèles publiés chacun).

**095 (figure composée)** : même cas que CM1-105, laissé sans modèle par David le 2026-11-19. Une figure à
compléter ne vérifie qu'une construction à la fois, et la perpendiculaire / parallèle à l'équerre sur papier uni
manque. Les deux outils sont déjà notés (`outils-manquants.md`, n° 45 et n° 40, CM2-095 cité). Reco : **D**.

**Outils** (aucun neuf) :

- 097 : ` ```figure-a-completer ` sur quadrillage, `verifier: symetrique par d` ou `point A' = symetrie(A, axe=d)`
  (gabarit CM1-108 `452b9a91`, `cm1-8d/02`). Le contrôle accepte un axe quelconque (6-180 sur papier uni) ; une
  diagonale du quadrillage envoie un nœud sur un nœud.
- 102 : ` ```patron solide: pave l p h ` (formes 1 à 11, `faux 1` à `faux 8`, `cotes: cm`, `designer: opposee`),
  options ` ```patron ` dans une case « choix », ` ```solide ` pour la perspective (gabarit CM1-100 `0da1780b`,
  `cm1-8f/08`, `09`).

Nœuds : 097 sur « Symétrie axiale » (niveaux 1 à 3 pris : CE2, CM1, 6e) ; 102 sur « patrons » (1 à 6 pris : CE2,
CM1 + CM2, 5e).

Bornes : 097, papier quadrillé, axe vertical, horizontal ou diagonale du quadrillage, axe qui ne coupe pas la figure
(accompagnement CM2 p. 20) ; 102, aucune borne propre.

| #    | Point   | Nœud, niveau       | Modèle                               | Variations, plages                                                                                                                                                                                                                                                                                                                                                                                                        |
| ---- | ------- | ------------------ | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 17-1 | CM2-097 | Symétrie axiale, 4 | Le symétrique, axe sur une diagonale | V1 placer $A'$, axe sur une diagonale du quadrillage (↗ ou ↘) ; V2 symétrique d'un segment, axe diagonal ; V3 symétrique d'un triangle, axe diagonal ; V4 symétrique d'un quadrilatère, axe vertical, horizontal ou diagonal. 6 figures tirées par variation, axe qui ne touche pas la figure, image dans la fenêtre                                                                                                      |
| 17-2 | CM2-102 | patrons, 7         | Reconnaître le patron d'un pavé      | V1 se plie-t-il en pavé ? oui / non (pavé l × p × h, de 1 à 5, trois mesures différentes ; formes 1 à 11 ou faux 1 à 8, tourné) ; V2 pavé dessiné en perspective, cotes : lequel de ces 3 assemblages est son patron ? (son patron, celui d'un autre pavé, un faux) ; V3 patron coté : combien de faces mesurent l cm sur h cm ? (2) ; V4 la face marquée est le dessus : touche la face du dessous (`designer: opposee`) |

Erreurs typiques en `testSpecs` : 097, le point recopié du même côté (translation), l'image prise par rapport à une
droite verticale au lieu de la diagonale ; 102, « oui » pour un faux patron, le patron du pavé voisin, 1 ou 4 faces
au lieu de 2, une face voisine au lieu de l'opposée.

**Question d'accès** : 2 brouillons neufs, puis nœud + tag → personne ne lit rien de plus avant la publication.

**À trancher** :

(a) 095 reste sans modèle (D), comme CM1-105, l'outil étant déjà noté (n° 45) ? Lot 17 = **2 modèles**, et le
chantier est fini. Reco : **oui**.

(b) 097 V4 garde aussi les axes vertical et horizontal (le point les cite, le CM1 n'a que des triangles), les V1 à V3
ne prenant que les diagonales ? Reco : **oui**.

(c) Niveaux : Symétrie axiale 4, patrons 7 ? Reco : **oui**.

(d) 102 V1 : un « faux » est un des 8 faux patrons du cube, dessiné en rectangles (deux faces l'une sur l'autre, ou
un trou). Le faux « les bonnes formes, mais des faces de tailles qui ne vont pas ensemble » n'existe pas dans le bloc :
on s'en passe ? Reco : **oui** (la V2 « patron d'un autre pavé » couvre ce raisonnement).

### 25.1 Lot 17 : décisions (David, 2026-11-19)

Recommandations suivies (« je te suis ») : (a) 095 reste D (outils manquants n° 45), lot 17 = **2 modèles** ;
(b) 097 V1 à V3 sur une diagonale du quadrillage, V4 tous axes ; (c) niveaux : Symétrie axiale 4, patrons 7 ;
(d) faux patrons du pavé = les 8 faux du cube en rectangles.

### 25.2 Lot 17 : écriture (2026-11-19)

- `docs/wip/questions/lot-cm2-17.py` → `scripts/questions/cm2-17/` (2 modèles, 8 variations, gabarits `lot-cm1-8d.py`
  et `lot-cm1-8f.py`). `question:specs --instances 300` : 32 + 31 specs vertes, 2 400 tirages réussis, aucun
  `\textcolor` hors `$` ; `sonde-figures` : 0 problème ; `create-questions` en simulation (prod) : 2 à créer.
- 097 : fenêtre 12 × 12 ; axes `y = x + c` et `x + y = c` ; figure à 2 carreaux en biais au moins de l'axe (un seul
  laisserait un demi-carreau). Erreur typique en specs : carreaux comptés à l'horizontale jusqu'à l'axe en biais.
- 102 : les 11 patrons et les 8 faux de chaque pavé passent le parseur (`patron-sonde.ts`) ; V3 avec des pavés à base
  carrée (4 faces de même forme) pour que la réponse ne soit pas toujours 2.
- Base locale (copie dans le scratchpad, `.env.local`, `with-db-lock.sh`) : 2 brouillons ; aperçu admin à 390 px
  (Playwright, port 5186), les 8 variations : aucun débordement, 0 erreur. Corrigé : en V2 du pavé, les patrons cotés
  des options étaient réduits et le faux, sans cotes, restait grand (il se repérait à sa taille) → plus de cotes dans
  les options, le pavé de l'énoncé garde les siennes.

### 25.3 Lot 17 : prod, rangement (2026-11-19)

- #2925 (fichiers) : CI verte, mergée. David lance `create-questions --dir scripts/questions/cm2-17 --publier` depuis le
  worktree. MCP : 2 brouillons [CM2], niveaux 4 et 7, sans nœud ni tag, `updated_at` = création (`0cb5aa4f`,
  `0a155341`).
- Migration `20261119222623_questions_cm2_lot17_rangement_tags.sql`, dérivée de celle du lot 16 par substitution
  (097 sur la **notion** « Géométrie > Symétrie axiale », le point y est posé ; 102 sur « Géométrie > Solides >
  patrons »). Test `questions-cm2-lot17-rangement-tags` : 9 verts ; corps remplacé par `select 1;` → 3 rouges, 4
  sautés ; fichier restauré (`cmp`) ; 9/9 rejoué après le commit. `security-auditor` : aucun finding (chemin
  « notion seule » vérifié strict).
- #2927 : CI verte, `check:migrations` sortie 0, mergée. `migration list --linked` : seule la nôtre en attente →
  `db:migrate` depuis le dépôt principal. MCP : 2 brouillons rangés (« Symétrie axiale », « patrons »), un tag chacun
  (097, 102), `updated_at` = création.
- `garde-niveaux-tags` : aucun niveau manquant. Page à cocher (2 fiches, base prod ; alerte attendue : ` ```patron `
  non dessiné) : https://claude.ai/artifact/BCLEK25ZYEb5QALukL4zRq ; `verdicts` vide au départ. Rendu à 390 px
  (Playwright, fichier local) : pas de débordement, 0 erreur.

### 25.4 Lot 17 : relecture, publication (2026-11-20)

- Page à cocher : 2 fiches « ok », sans commentaire. David lance `publier-lot --dir scripts/questions/cm2-17
--publier` (la simulation, qui lit la prod, a été refusée par le contrôle des permissions). MCP : `0cb5aa4f`,
  `0a155341` `published`.

## 26. Clôture (2026-11-20)

Recompte MCP : **202 modèles publiés** au CM2 (168 CM2 seul, 27 CM1 + CM2, 7 CM2 + 6e), tous rangés, aucun publié sans
tag CM2 ; 4 brouillons, tous voulus (lot 0 : `32351845`, `e58b1357`, `e009f9d0`, `322f3479`). **152 points sur 158**
ont un modèle publié ; les 6 sans modèle sont ceux décidés : 126, 079, 080, 096, 106 (D) et 095 (outil n° 45). 087 et
101 (anciens D) sont couverts par les jumeaux CM1 + CM2 `7d048525`, `9fe0fee6`, `ebc05cbb`. Découpage (§ 14, § 24.1,
§ 25.1) contre les PR mergées : lots 0 à 17 tous mergés et publiés (liste des PR dans `cycle3.md`).

Versement : couverture dans `docs/systeme/programmes/bornes/cycle3.md` (§ CM2), pièges dans
`docs/pratiques/couvrir-un-niveau.md`, journal archivé. Le commentaire de
`NumberLine-etiquettes-longues.svelte.test.ts` cite encore l'ancien chemin du journal (code : à corriger dans une PR).
