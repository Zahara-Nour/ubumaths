# Chantier « questions-cm2 » — couvrir les points du CM2 en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Chantiers voisins : CE1 ([questions-ce1-progress.md](questions-ce1-progress.md)), 6e
> ([questions-6-progress.md](../archive/wip/questions-6-progress.md)).

## Reprendre ici

_Mis à jour le 2026-11-18, après #2816 et la page à cocher du lot 10._

- **État** : lots 0 à 9 publiés. Lot 10 heures et durées (082, 083, 084, 153, 085) : 5 brouillons en prod, rangés et tagués (#2816, migration `20261118074731` jouée, relevé MCP conforme, § 16.3) ; page à cocher publiée : https://claude.ai/artifact/JTvJHxUWikfoPqdBBK4JBH (0 verdict).
- **Prochaine action** : relecture par David, lire et compter les verdicts en base, `publier-lot` en simulation, `--publier` par David.
- **En attente de David** : la relecture du lot 10. ⛔ Jamais `--mettre-a-jour` de `cm2-7b` avec des fichiers d'avant #2770 (ids CM1).
- **Pièges en cours** : `pnpm migration:horodatage` = heure réelle UTC ; `db:migrate` refuse une migration plus ancienne que la dernière jouée → `--dry-run --include-all`, liste relue, puis `--include-all`. Worktree neuf : copier `supabase/.temp/` du dépôt principal, puis `pnpm exec svelte-kit sync`. `Doc-inchangée:` dans un COMMIT. `git commit -m … -- <fichiers>`. Stash du dépôt principal « cm2-9 ids » : copie identique de ce qui est mergé, à supprimer (David).
- **Worktree / branche** : aucun (retiré après #2816).

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
