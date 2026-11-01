# Chantier « questions-ce1 » — couvrir les points du CE1 en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Chantier de référence : le CP ([questions-progress.md](questions-progress.md)).

## Reprendre ici

_Mis à jour le 2026-11-01, après #2141._

- **État** : lots 0 à 7 publiés ; lot 8 (monnaie, § 15) : 6 brouillons en prod, rangés et tagués (#2135, #2141).
- **Prochaine action** : après le `deploy:prod` qui livre #2127 (centimes) : catégories relevées, page à cocher, puis
  `publier-lot` (simulation, puis David) ; ensuite lots 9 et 10 (ex-8 et 9 du § 12).
- **En attente de David** : `deploy:prod` pour les centimes.
- **Pièges en cours** : jamais de variable `e` ni `i` ; accords au singulier quand un nombre vaut 1 ; JSON du générateur →
  `prettier --write` ; **case d'opération posée sans `expectedAnswer`** ; **`{{if:}}` à condition contenant `{{eval:}}`
  non résolu, specs vertes quand même → relire `--apercu`** ; `placer:` d'horloge : `9 h 0` ; saisie d'une opération
  posée dans Chrome : une case à la fois ; **niveaux : relever la catégorie juste avant la publication** ; **horodatage
  de migration : max de `origin/main` ET des autres worktrees + 1 min** ; commitlint : sujet sans majuscule ; aucun lien
  de session dans une PR ; migration de données → ligne `Doc-inchangée:` dans un commit (garde du pre-push).
- **Worktree / branche** : `../ubumaths-wt-questions-ce1` (retiré ; le prochain lot en repart un neuf sur `origin/main`). `!` de David :
  toujours préfixer `cd /Users/david/Coding/js/ubumaths &&` (un dossier courant supprimé fait échouer node en `uv_cwd`).

## 1. Relevé (prod, MCP lecture seule, 2026-10-26)

Points du CE1 avec au moins un modèle tagué (17) : 006 (4), 007, 010, 024, 025, 026, 090, 027 (5),
091 (4), 028 (4), 101 (2), 103, 030, 031, 033 (2), 034, 035.

58 modèles `grades ∋ CE1`, tous publiés, tous rangés sur un nœud ; 32 tagués, 26 sans tag.
Specs : toutes vertes (`question:specs --template … --apercu 3`, 5 tirages par variation ; le seul
« non importable » est le bruit des colonnes `created_at`/`updated_at`/`created_by`).

## 2. Vérification de l'existant (bornes `cycle2.json`, CE1)

### Tagués, dans les bornes

- CE1-006 Position (`17ed1fc1`) : 3 chiffres, rangs u / d / c. ✅
- CE1-007 Comparer (`d4245f88`) : nombres 1 à 999, une égalité sur six. ✅
- CE1-010 Droite graduée (`d6268317`) : 20 images fixes (de 1 en 1, 10 en 10, 100 en 100). ✅ (images non relues une à une)
- CE1-026 Somme (`713b71ab`) : a + b, chiffres, toujours avec passage de la dizaine. ✅
- CE1-090 Addition à trou (`76d8c8ee`) : chiffres 2 à 9. ✅
- CE1-027 Tables 1 à 5 (`c956b35f`, `cf28acc2`, `5e316657`, `3ba51eb3`, `9d2df894`), facteur 2 à 10. ✅
- CE1-091 Multiplications à trou, tables 2 à 5 (`b8e781f6`, `0d57cc73`, `b1c712cd`, `a0ac57ee`). ✅
- CE1-028 Doubles (`25285413` 1-9, `a3ef26ab` 10-50, `022130ca`, `47f97c9f`) : valeurs toutes dans la liste. ✅
- CE1-101 Moitiés (`89bef942` 2-20, `e4c70b53` 2-30, 40, 50, 100) : dans la liste. ✅
- CE1-030 × 10 (`4063af49`) : 1 à 99. ✅
- CE1-031 + 19 / + 29 (`869de343`) : départ 11 à 78. ✅
- CE1-033 Soustraire ≤ 8 (`83aa2196`, `acf15102`). ✅
- CE1-103 − centaines (`4d94ec28`). ✅

### Tagués, à reprendre ou à discuter

- **Décompositions** (`9827242b` 235 = 200 + 30 + 5, `495a397f` (3 × 100) + (4 × 10) + 5,
  `3eedd905` décomposition → nombre) tagués CE1-006 : les bornes rangent ces écritures sous
  **CE1-005** (« (6 × 100) + (3 × 10) + (5 × 1), 600 + 30 + 5 »). Retag en 005 ?
- **`c96ecf4d`** Trouver la moitié, tagué **CE1-034** : mêmes nombres que `e4c70b53` (≤ 100,
  faits mémorisés) ; CE1-034 vise la moitié d'un pair ≤ 1 000 par décomposition (470 → 235). À
  retagger 101, ou réécrire pour 034.
- **`9d709f5b`** Distributivité (CE1-035) : seulement 12 × a ; le point demande 11 à 19.
- **`e94c03b6`** Produit astucieux (CE1-024) : 2 × a × 5 (a de 19 à 40) relève du calcul
  astucieux (associativité) plus que de la commutativité (8 × 4 = 4 × 8).
- **`c73734a8`** Parité (CE1-025) : nombres 0 à 99 ; le point va jusqu'à 1 000 (767-778).
- Plages étroites, pas fausses : tables 6 à 10 absentes au CE1 (CE1-027/091) ; + 9 et départs > 100
  absents (CE1-031).

### Doublons (mêmes nombres)

- Seul le corrigé change, additif (« 25 + 25 ») ou multiplicatif (« 2 × 25 ») : `c96ecf4d` / `e4c70b53`
  (moitié) · `0b36b0bb` / `b760b7c0` et `bb3cb3d3` / `21df294b` (triple) · `d97a3de2` / `11a3ebb6` (tiers).
- Seul l'énoncé change : `47f97c9f` / `022130ca` (double, niveau 4 ; `47f97c9f` pose « Quel est le
  résultat de 2 × 5 ? » puis « Le double de 5 est … »).
- BO : au **CP**, doubles et moitiés sont rangés avec les tables d'addition (« Mémoriser des faits
  numériques », le « × » n'est pas encore là) ; au **CE1** et au CE2, ils deviennent des « faits
  multiplicatifs usuels » (« × » introduit en périodes 1-2). Le corrigé additif est celui du CP ;
  au CE1, le multiplicatif. Moitié d'un nombre non mémorisé (CE1-034) : par décomposition (BO).
- Triple et tiers : aucun point au cycle 2 ; « le tiers » apparaît en 6e (6-211).

### Non tagués (26)

- **Hors bornes du CE1 (nombres > 1 000)** : `810f1824` et `7d2d412b` (4 chiffres − 3 chiffres) ;
  `579d0b00` et `de71495c` (abc + f × 10^d : jusqu'à 999 + 900).
- **Un point CE1 possible** :
  - `579d0b00` / `de71495c` une fois bornés : leur cas « + centaines » = CE1-084, « + dizaines » = CE1-029 (mélangés dans une seule variation : un modèle = un point).
  - `3d6def48` (abc − ? = …, centaines) → CE1-103 (forme à trou).
  - `27bf3101` (ab − ? = …, ≤ 8) → CE1-033 (forme à trou).
- **Aucun point CE1** : Additionner par regroupements 4 à 8 (5) ; Calculer une somme 9, 10 ;
  Calculer une différence 6 et 8 ; Compléter une addition à trou 8, 9 ; soustraction à trou 4, 6 ;
  Trouver le complément 2 à 5 (4) ; Trouver le triple (4), le tiers (2) — à chercher au CE2, sinon à dire.

## 3. Les 90 points sans modèle

- **A. Texte / formule seuls (48)** :
  nombres 003, 004, 005, 008 (cases), 009, 011-015, 093, 094 ;
  fractions 016-021, 099 ;
  calcul 023, 029, 032, 083, 084, 102 ;
  problèmes 036-040 ;
  longueurs 041-043, 045-047 ; masses 049-052, 085 ;
  monnaie 053, 058 ; durées 061, 062 ; solides 066, 067 ; figures 071.
- **B. Outil existant (32)** :
  - `collection` : 001, 002 (`construire:`) — ⚠️ groupes de **cent** demandés, `centaines:` pas encore disponible (→ C partiel, ci-dessous) ;
  - `operation` : 022 (addition posée), 100 (soustraction, `méthode: cassage | compensation`) ;
  - `monnaie` : 054, 055, 056 et 057 (`construire:`), 086 ;
  - `horloge` (minutes déjà disponibles) : 059, 063, 104 ;
  - `figure` : 069, 070, 105, 073 (alignés ?), 075, 087 (droit / aigu / obtus) ; fractions 096, 098 (polygones remplis, secteurs) ; 044 (segment sur une règle graduée, à vérifier) ;
  - `barres` : 082, 106 ; `tableau-croise` : 089, 107 ; 081 (tableau à compléter) ;
  - images fixes : 064, 065 (solides), 076 (positions), 077 (plan) ;
  - `figure` + flèches, comme CP-067 (« Le robot sur le quadrillage », `f7167af7`, QCM « où arrive
    le robot ? ») : 080 lu (jusqu'à 15 instructions, 4 virages) ; le BO du CE1 code aussi en
    « avancer de / pivoter d'un quart de tour » (codage relatif), pas seulement en flèches ;
  - `horloge` en QCM de cadrans (comme au CP) : 060 « positionner les aiguilles ».
- **C. Outil neuf (3 points + 001-003 en partie)** :
  1. `collection` : **`centaines:`** (plaques de cent) → 001, 002, 003 ; sert aussi au CE2.
  2. **Fractions à colorier** (l'élève touche les parts d'une figure partagée) → 095, 097 ; puis CE2.
  3. **Barres à monter** (hauteur de barres, manque connu) → 088.
  4. Plus tard, gestes plus justes que le QCM : **aiguilles à placer** (060), **suite de flèches à
     produire** (080 « produire » ; glisser-déposer `StructureField`, pas Blockly : le BO ne parle
     que d'un robot « si un robot est disponible », d'aucun logiciel).
- **D. Non évaluables sans manipulation (7)** : 092 (suite orale), 048 (soupeser), 068 (construire un
  solide), 079 (assemblages de cubes), 072 et 074 (tracer : case « figure » de `figure-et-choix`), 078.

## 4. Questions à David

1. **Corrections de l'existant** (§ 2) : retag des trois décompositions en CE1-005 ? `c96ecf4d` →
   101 ou réécrit pour 034 ? élargir `9d709f5b` (11 à 19) et la parité (≤ 1 000) ?
2. **Hors bornes** : `810f1824`, `7d2d412b`, `579d0b00`, `de71495c` : retirer CE1 de leurs niveaux,
   ou les borner à 1 000 ?
3. **Doublons** (corrigé additif / multiplicatif) : garder les deux, ou un seul par paire ?
4. **Outils (C)** : lesquels, dans quel ordre ? Recommandation : `centaines:` de `collection`
   (petit, prolonge un bloc), puis fractions à colorier, puis aiguilles à placer.
5. **Points D** : laissés sans modèle ?
6. **Premier lot** : recommandation, calcul mental en texte (029, 102, 084, 032, 083 : 5 modèles,
   aucun QCM).

## 4 bis. Décisions (David, 2026-10-26)

Recommandations validées en bloc (« ok, je valide ») :

1. Corrections de l'existant **d'abord** (lot 0), avant tout lot neuf.
2. Les 4 modèles hors bornes passent en **CE2** (≤ 10 000 au CE2), sans réécriture ; 029 et 084 auront
   des modèles propres.
3. Doublons : au CE1, le corrigé **multiplicatif** ; l'autre est dépublié (repassé en brouillon,
   jamais supprimé). Triple et tiers : laissés de côté (aucun point au cycle 2).
4. Outils neufs, chacun en chantier à part : `centaines:` de `collection`, puis fractions à
   colorier, puis barres à monter ; aiguilles et flèches à produire plus tard (QCM d'abord).
5. Points D sans modèle ; 072 et 074 après la case « figure ».
6. Lots : 1 calcul mental (029, 102, 084, 032, 083, 024) → 2 numération → 3 fractions → 4 problèmes
   → 5 grandeurs → lots à outils existants → lots à QCM une fois la case « choix » en prod.

## 5. Lot 0 : corrections — phase 0 (validée le 2026-10-26)

Relevé du 2026-10-26 : **0 donnée d'élève** sur les 12 modèles touchés (chapter_exercises,
evaluation_attempt_questions, journal_entry_activities, skill_attempts, srs_cards, test_answers,
user_favorite_templates). Tous publiés : `create-questions --mettre-a-jour` ne touche pas un modèle
publié → comme pour les corrections du CP, **deux migrations** : contenu (générée par
`lot-corrections-ce1.py`, instantané md5 d'abord), puis rangement / tags / niveaux / statut (à la main).

**Contenu réécrit** (même titre, même niveau, même nœud) :

- `c96ecf4d` Trouver la moitié (CE1-034, sous-notion « double et moitié » de l'addition) : moitié par
  décomposition, corrigé « 74 = 70 + 4 ; moitié de 70 = 35, moitié de 4 = 2 ; 35 + 2 = 37 ».
  - V1 : 2 chiffres, dizaines paires (22 à 88, ex. 46 → 23) ;
  - V2 : 2 chiffres, dizaines impaires, unités paires non nulles (ex. 74 → 37 ; 52 → 26) ;
  - V3 : 3 chiffres, centaines 2 à 6, unités paires (ex. 470 → 235 ; 648 → 324).
  - Erreurs typiques en spec : moitié chiffre par chiffre (74 → 32), le double au lieu de la moitié.
- `9d709f5b` Utiliser la distributivité (CE1-035) : premier facteur **11 à 19** (au lieu de 12), autre
  facteur 2 à 9 ; corrigé « 13 × 7 = 10 × 7 + 3 × 7 = 70 + 21 = 91 ».
- `c73734a8` Parité (CE1-025) : nombres **0 à 999** (au lieu de 0 à 99), deux variations pair / impair
  gardées.

**Rangement, tags, niveaux scolaires, statut** :

- `9827242b`, `495a397f`, `3eedd905` (décompositions) : tag CE1-006 → **CE1-005**, nœud
  « décomposition » → « écritures » (sous-notion de CE1-005).
- `e94c03b6` (produit astucieux) : tag CE1-024 **retiré**, nœud « calcul astucieux » gardé.
- `47f97c9f` (double, doublon de `022130ca`, énoncé « résultat de 2 × 5 » + « le double de 5 ») :
  **repassé en brouillon** ; nœud et tag gardés.
- `810f1824`, `7d2d412b`, `579d0b00`, `de71495c` : niveau scolaire CE1 → **CE2** (aucun tag).

**Question d'accès** (avant le SQL) : qui pourra lire quoi qu'il ne pouvait pas lire avant ? — les
élèves et le prof du **CE2** voient 4 modèles publiés de plus. En miroir, qui ne pourra plus lire ce
qu'il lisait ? — les élèves et le prof du **CE1** ne voient plus ces 4 modèles ni `47f97c9f`
(brouillon : admin seul). Aucune règle (policy) ne change.

**Écrit (2026-10-26)** : sous-titres changés avec le contenu (moitié : « Nombres pairs jusqu'à $700$, par
décomposition » ; distributivité : « … d'un nombre de $11$ à $19$ par un nombre à $1$ chiffre »).
Moitié V1 = 22 à 88 (unités 2 à 8), V2 = 12 à 98, V3 = 210 à 698 (dizaines non nulles), corrigé en
trois étapes (coupe en deux parts paires, moitié de chacune, somme). Parité : specs aux bornes 998 et 999. Contenu relu par `pnpm question:specs` (le fichier ligne de base → clés camelCase d'abord).

- 2026-10-26 : #1843 mergée (CI verte, `security-auditor` sans finding bloquant ; garde d'état ajoutée au rollback du rangement), `db:migrate` (go de David : la migration retire 4 tags), vérifiée en prod.

## 6. Lot 1 : calcul mental — décisions (David, 2026-10-26)

Phase 0 proposée en six modèles, case seule, aucun QCM ; trois questions, recommandations suivies
(« je suis tes recos ») : départ à 2 chiffres pour 084 (46 + 300) mais pas pour 029 ; 032 garde la
variation qui passe sous la centaine (305 − 9) ; 024 garde la variation « produit donné » à côté des
deux trous.

| Fichier                         | Point   | Sous-notion                | Niveau | Variations                                                          |
| ------------------------------- | ------- | -------------------------- | ------ | ------------------------------------------------------------------- |
| `01-ajouter-des-centaines`      | CE1-084 | calcul astucieux           | 7      | 3 chiffres + c centaines (≤ 999) ; 2 chiffres + 100 à 900           |
| `02-ajouter-des-dizaines`       | CE1-029 | calcul astucieux           | 8      | sans retenue (234 + 60) ; avec retenue (746 + 80), centaines 1 à 8  |
| `03-soustraire-des-dizaines`    | CE1-102 | calcul astucieux           | 8      | 3 chiffres − 10 à 90, sans retenue                                  |
| `04-soustraire-9`               | CE1-032 | calcul astucieux           | 3      | 2 chiffres ; 3 chiffres ; 3 chiffres à dizaine 0 (305 − 9, 100 − 9) |
| `05-multiples-de-25`            | CE1-083 | produits particuliers      | 1      | k × 25 ; 25 × k ; ? × 25 (k de 1 à 4)                               |
| `06-multiplication-commutative` | CE1-024 | multiplication des entiers | 3      | produit donné ; g × p = p × ? ; ? × g = g × p (p 2 à 5, g 6 à 9)    |

Corrigés : nombre de dizaines (« 74 dizaines + 8 dizaines = 82 dizaines ») pour 029 / 102 ; chiffre
des centaines pour 084 ; − 10 + 1 pour 032 ; multiplicatif pour 083 (« 3 × 25 = 2 × 25 + 25 »).
Consigne « Calcule. » (pas « astucieuse ») pour les faits à connaître (083, 024).

**Question d'accès** : personne ne lit rien de plus — modèles neufs en brouillon (admin seul) ; la
migration nœud + tag ne change aucune règle.

- 2026-10-26 : écrit, `create-questions` en simulation 6/6 (40 specs), `question:specs` 2 800 tirages
  verts, essai en base locale (6 brouillons), énoncés et corrigés relus dans l'aperçu admin.
- 2026-10-26 : #1847 mergée (CI verte, revue : aucune, contenu).
- 2026-10-27 : 6 brouillons créés en prod par David (identifiants dans « Reprendre ici »).
- 2026-10-27 : #1856 mergée (migration nœud + tag, test 9/9 rouge sans elle, `security-auditor` sans finding), `db:migrate`, vérifiée en prod ; page à cocher publiée.
- 2026-10-27 : relecture, 084 « À revoir » (« pourquoi de manière astucieuse ? ») → consigne « Calcule. » pour 084, 029, 102 et 032 (décision de David : « tu changes ») ; fichiers d'avant = prod (simulation : 6/6 identiques), tirages verts ; David lance ensuite `create-questions --publier --mettre-a-jour`.
- 2026-10-27 : `--mettre-a-jour` lancé par David (après un premier essai avant le merge, sans effet), vérifié en base ; relecture 6/6 « OK ».
- 2026-10-27 : `publier-lot` (simulation) refuse 084, 029, 083, 024 : niveaux 7, 8, 1, 3 déjà pris par des publiés de la même catégorie (choisis en phase 0 sans relever la catégorie). Décision de David (« je suis tes recos ») : premier niveau libre (11, 12 ; 10, 11), aucun publié renuméroté ; `create-questions` cherche par le niveau et `--mettre-a-jour` ne le change pas → migration des niveaux + fichiers dans la même PR ; question d'accès : personne.
- 2026-10-27 : #1870 mergée (CI verte, `security-auditor` sans finding bloquant), `db:migrate`, vérifiée en prod ; `publier-lot` (simulation) : 6/6.
- 2026-10-27 : lot 1 publié par David, vérifié (6/6 `published`).
- 2026-10-27 : catégories (David : « go », accès : personne) — 084, 029 → Additionner / Somme (à côté de « Ajouter 10 »), 102 → Soustraire / Différence (à côté de « Soustraire 10 ») ; 032 reste (− 10 + 1 est une astuce) ; migration sur 3 publiés + fichiers.
- 2026-10-27 : #1874 mergée (CI verte, `security-auditor` sans finding bloquant) ; `db:migrate` refusé (`DbPushMissingRemoteError` : 20261027180000 de `6EME` non jouée) ; pas de `--include-all` (migration d'une autre session) ; David : option 1, `6EME` la joue, elle est prévenue.
- 2026-10-27 : `6EME` a joué `db push --include-all` (accord de David) : 20261027180000 puis 20261027200000 ; vérifié au MCP (catégories, `updated_at`, trigger `O`) ; `create-questions` 6/6 « = ». Lot 1 clos.

## 7. Lot 2 : numération — décisions (David, 2026-10-27)

Relevé MCP du 2026-10-27 : CE1-003, 004, 008, 009, 011-015, 093, 094 sans modèle ; 005 (3, les décompositions)
et 006, 007, 010 (1 chacun). Le CP a des modèles proches (ranger, encadrer, intercaler, ordinaux) : même forme,
nombres du CE1. Recommandations suivies (« je te suis ») :

1. **Ordinaux (011-015) en lot 2 bis**, juste après : ce lot reste sous 10 modèles ; la forme des deux QCM du CP
   (rang en lettres, suites de formes) se tranchera alors.
2. **CE1-004 sans l'écriture en lettres** (aucune borne au CE1 ; aucun outil n'écrit un nombre en lettres jusqu'à 999) : **reportée, pas abandonnée** — à reprendre si un outil « nombre en lettres » naît (servirait au CE2).
3. **CE1-009 en forme ouverte** : l'élève écrit un nombre qui respecte la phrase (validation par intervalle,
   comme « Intercaler » du CP) ; le choix d'un symbole relève de 007, déjà couvert.

| Fichier                          | Point   | Sous-notion   | Catégorie · niveau | Variations                                                                          |
| -------------------------------- | ------- | ------------- | ------------------ | ----------------------------------------------------------------------------------- |
| `01-unites-dizaines-centaines`   | CE1-003 | décomposition | Décomposition · 13 | c → d ; d → c ; c → u ; dizaines en tout dans 347 (34)                              |
| `02-unites-non-canoniques`       | CE1-005 | écritures     | Décomposition · 14 | 63 d et 5 u ; 5 u, 5 c et 13 d (ordre mélangé) ; 2 c, 27 d et 14 u                  |
| `03-suite-jusqu-a-1000`          | CE1-004 | écritures     | Ecriture · 3       | suit (sans passage) ; suit (…9, …99, 999 → 1 000) ; précède (…0, …00, 1 000)        |
| `04-ranger-cinq-nombres`         | CE1-008 | ordre         | Comparer · 6       | comme 229, 234, 239, 243, 300 : croissant ; décroissant                             |
| `05-superieur-inferieur-compris` | CE1-009 | ordre         | Comparer · 7       | supérieur à ; inférieur à ; compris entre a et a + 10 ; supérieur et inférieur      |
| `06-encadrer-dizaine-centaine`   | CE1-093 | ordre         | Encadrer · 7       | juste avant / après ; dizaines entières ; centaines entières                        |
| `07-intercaler-jusqu-a-1000`     | CE1-094 | ordre         | Encadrer · 8       | a < ? < b (toute réponse juste) ; suite à trous avec passage de dizaine ou centaine |

Case seule, aucun QCM. Niveaux : places libres des catégories relevées en prod avant l'écriture.

**Question d'accès** : personne ne lit rien de plus — modèles neufs en brouillon (admin seul) ; la migration nœud

- tag ne change aucune règle.

* 2026-10-27 : écrit (`lot-ce1-2.py`), `create-questions` en simulation 7/7 (63 specs), `question:specs` 4 200
  tirages verts (accord « 1 centaine » corrigé), essai en base locale (7 brouillons), énoncés et corrigés relus
  dans l'aperçu admin.

- 2026-10-27 : #1884 mergée (CI verte, revue : aucune, contenu).
- 2026-10-28 : 7 brouillons créés en prod par David ; #1886 (nœud + tag, test rouge 5/9 sans, vert 9/9, `security-auditor` sans finding) mergée, `db:migrate`, vérifiée ; page à cocher : 2 titres « absents » (antislash, bug `titresDuLot`) → #1891 ; relue 7/7 OK ; `publier-lot` refuse c4d4bf70 (Ecriture 3 occupé).

## 8. Lot 2 bis : ordinaux — décisions (David, 2026-10-28)

Relevé MCP du 2026-10-28 : CE1-011 à 015 sans modèle ; au CP, 6 modèles « Ordinaux » (niveaux 1 à 6, rangs ≤ 20e,
deux QCM). Case « choix » : code en prod (lots 1-4 de `figure-et-choix` dans `production`), base pas encore
convertie (178 QCM, `migrer-qcm-en-cases --ecrire` pas lancé). Recommandations suivies (« je te suis ») :

1. Choix écrits directement en **case « choix »** (bloc ```choix).
2. Mots jusqu'à cent écrits par le script, rangs des modèles 1 et 2 tirés dans une liste de cas qui piègent
   (21, 30, 31, 41, 48, 52, 60, 61, 67, 70, 71, 72, 77, 80, 81, 85, 89, 90, 91, 97, 99, 100) ; orthographe
   rectifiée du BO (« vingt-et-unième », « soixante-et-onzième »).
3. Rangs des énoncés des modèles 3 à 7 en chiffres (89e).
4. « 1, 3, 5, 7, 9… » avec les suites évolutives (modèle 7), jusqu'au 50e.

| Fichier                              | Point   | Niveau | Variations                                                                    |
| ------------------------------------ | ------- | ------ | ----------------------------------------------------------------------------- |
| `01-rang-en-lettres-jusqu-a-cent`    | CE1-011 | 7      | 48e → quarante-huitième (choix ; leurres : rangs voisins, le nombre)          |
| `02-rang-en-chiffres-jusqu-a-cent`   | CE1-011 | 8      | quatre-vingt-unième → 81                                                      |
| `03-place-dans-une-liste`            | CE1-012 | 9      | listes de 5 en 5, 2 en 2, 10 en 10 (depuis 100), l'alphabet : place de …      |
| `04-reperer-un-rang-jusqu-a-cent`    | CE1-013 | 10     | le k-ième nombre ; le k-ième depuis la fin ; file retournée (n − k + 1)       |
| `05-rang-et-nombre-avant`            | CE1-014 | 11     | 167 cyclistes, avant le 48e (BO) ; d avant Lina → rang ; après Noé            |
| `06-suites-repetitives-jusqu-a-cent` | CE1-015 | 12     | A B (89e), △ ▢ ○ (60e), △ ✕ ▢ ○ (80e), A B G F (17e), jusqu'à la 100e (choix) |
| `07-suites-evolutives`               | CE1-015 | 13     | 1, 2, 4, 7, 11… ; 1, 2, 4, 8… (≤ 10e) ; 1, 3, 5… (≤ 50e) ; △ ✕ △ ✕✕… (choix)  |

**Question d'accès** : personne ne lit rien de plus — modèles neufs en brouillon (admin seul) ; la migration nœud

- tag ne change aucune règle.

* 2026-10-28 : écrit (`lot-ce1-2bis.py`), `create-questions` en simulation 7/7 (79 specs), `question:specs`
  3 000 tirages verts ; deux défauts vus à la relecture des tirages, specs vertes : rang toujours 100 (variable
  `i` = unité imaginaire → liste `21|30|…`) et « on fait 4 pas » de 100 à 130 (→ « on compte 4 nombres ») ;
  7 brouillons en base locale, case choix jouée dans l'aperçu admin (juste, coché à tort).
* 2026-10-28 : #1910 mergée (CI verte, `security-auditor` sans finding bloquant) ; `db:migrate` refusé par le
  classifieur du mode auto → lancé par David avec `!`.
* 2026-10-28 : migration de #1910 déjà jouée en prod (le `db:migrate` de David : « up to date »), vérifiée
  (7/7 sur « ordinaux et rangs », points justes) ; page à cocher publiée (3 alertes : case choix non dessinée).
* 2026-10-28 : relecture 7/7 OK ; `publier-lot` (simulation 7/7) puis `--publier` par David : 7/7 publiés,
  vérifié en base ; worktree retiré.

## 9. Lot 3 : fractions — décisions (David, 2026-10-28)

Relevé MCP du 2026-10-28 : aucun modèle sur les 11 points de fractions du CE1 ; thème « Fractions » du CM1 à la
3e ; « Apprivoiser · Comparer » prend 1 à 5, « Calculer · Addition et Soustraction » 1 à 12. Recommandations
suivies (« je valide ») :

1. **Texte seul.** 096 et 098 (quelle part de la figure est coloriée ?) passent au lot « outils existants », après
   vérification que le bloc `figure` dessine les partages du BO (bandes, carrés, disques en secteurs, hexagones) ;
   à défaut des disques, bandes et carrés d'abord. 095 et 097 attendent l'outil « fractions à colorier ».
2. **Nouvelle catégorie « Fractions · Apprivoiser · Ecriture »** (niveaux 1 à 5), comme « Ecriture » des entiers et
   des décimaux.
3. **Simplification = CE2** : `reducedFractions` coupé ; 4/8 juste sans ambre, 1/2 aussi (même valeur) ; une somme
   qui fait 1 accepte « 1 » et « 5/5 ».
4. 05 sans « écrire la fraction de numérateur 2 et de dénominateur 5 » (doublon de 03) ; 06 et 07 avec une égalité
   de temps en temps (tirages indépendants), comme « Comparer » des entiers.

| Fichier                            | Point   | Catégorie · niveau            | Variations                                                                   |
| ---------------------------------- | ------- | ----------------------------- | ---------------------------------------------------------------------------- |
| `01-ecrire-une-fraction-unitaire`  | CE1-016 | Ecriture · 1                  | un quart → 1/4 (demi … dixième)                                              |
| `02-lire-une-fraction-unitaire`    | CE1-016 | Ecriture · 2                  | 1/4 → un quart (choix ; leurres « un quatre », autre part, « un quatrième ») |
| `03-ecrire-une-fraction`           | CE1-017 | Ecriture · 3                  | trois huitièmes → 3/8 ; un huitième plus un huitième plus un huitième        |
| `04-lire-une-fraction`             | CE1-017 | Ecriture · 4                  | 3/8 → trois huitièmes (choix ; « huit tiers », « trois huit », voisin)       |
| `05-numerateur-et-denominateur`    | CE1-018 | Ecriture · 5                  | numérateur ; dénominateur ; bande en d parts dont n coloriées                |
| `06-comparer-meme-denominateur`    | CE1-019 | Comparer · 6                  | 2/5 … 3/5 (choix < = >)                                                      |
| `07-comparer-numerateur-un`        | CE1-020 | Comparer · 7                  | 1/5 … 1/3 (choix < = >)                                                      |
| `08-additionner-meme-denominateur` | CE1-021 | Addition et Soustraction · 13 | a/d + b/d ; somme = 1 ; 1/d + 1/d + 1/d                                      |
| `09-soustraire-meme-denominateur`  | CE1-099 | Addition et Soustraction · 14 | a/d − b/d ; 1 − a/d ; Lucie (3/10 en bleu, le reste en rouge)                |

**Question d'accès** : personne ne lit rien de plus — modèles neufs en brouillon (admin seul) ; la migration nœud +
tag ne change aucune règle.

- 2026-10-28 : écrit (`lot-ce1-3.py`), `create-questions` en simulation 9/9 (77 specs), `question:specs` 3 200
  tirages verts ; relecture des tirages : accords au singulier corrigés (« $1$ demis », « les 1/4 »), specs vertes
  avant comme après ; 9 brouillons en base locale ; aperçu admin : choix juste (02), 3/8 juste et 3/24 faux (08).
  Vu en passant (pas du lot) : dans la carte de correction, le cadre vert de la réponse attendue coupe le bas d'une
  fraction.
- 2026-10-28 : #1936 mergée ; 9 brouillons créés en prod par David ; #1939 (nœud + tag, test rouge 5/9 sans, vert 9/9, `security-auditor` sans finding bloquant) mergée, `db:migrate` joué, vérifié (9/9 sur leur nœud, un point chacun) ; page à cocher publiée, aucune alerte.
- 2026-11-01 : page à cocher relue, 9/9 OK (verdicts comptés en base) ; `publier-lot` simulé (9 passent), `--publier`
  par David ; vérifié au MCP : 9/9 publiés et rangés.
- 2026-10-29 : relecture tranchée par David (ses réponses aux deux questions : les deux recommandations) : 03 sans la variation 2, 09 sans Lucie (gardée pour le lot 4) ; `question:specs` 200 tirages verts sur 03 et 09 ; simulation en prod : 7 « = », 03 et 09 « CONTENU DIFFÉRENT ».
- 2026-10-29 : #1953 mergée ; `create-questions --publier --mettre-a-jour` par David : 03 et 09 mis à jour, 7 « = » ; vérifié au MCP (03 : 1 variation, 7 specs ; 09 : 2 variations, 10 specs) ; page à cocher régénérée et republiée, verdicts de 03 et 09 remis à zéro.
- 2026-10-29 : relecture 9/9 OK ; `publier-lot` (simulation) refuse 06, 07, 08 : Comparer 6 et 7, Addition et Soustraction 13 pris le jour même par des modèles 6e publiés. David : « le résultat le plus propre » → 06 → 9, 07 → 10, 08 → 15, 09 → 16 (la soustraction suit l'addition), aucun publié touché ; question d'accès : personne. Migration `20261029233100_questions_ce1_lot3_niveaux` + fichiers, test rouge sans (3 échecs, rollback refusé), vert 7/7. PR #1963 ; `security-auditor` : aucun finding bloquant ; niveaux visés libres en prod, brouillons compris (MCP).
- 2026-10-29 : #1963 mergée (CI verte) ; `db:migrate` refusé (`DbPushMissingRemoteError`) : collision d'horodatage, `20261029213000` déjà joué en prod par `questions_5_lot3_rangement_tags` ; rien d'appliqué (niveaux 6, 7, 13, 14 relus au MCP) ; migration renommée `20261029233100` (max des worktrees + 1 min).
- 2026-10-29 : #1972 mergée (CI verte après relance d'un job navigateur instable) ; `db:migrate` lancé par David : 233000 (questions-3) puis 233100 ; vérifié au MCP (9, 10, 15, 16, brouillons, `updated_at` inchangé) ; `publier-lot` en simulation : 9/9 ; `create-questions` en simulation : 9 « = ».
- 2026-10-29 : `publier-lot --publier` par David : 9/9 publiés, vérifié au MCP. Lot 3 clos.

## 10. Lot 4 : problèmes — décisions (David, 2026-10-29)

Exemples du BO CE1 p.17-19 ; données entières ≤ 1 000, prix à virgule en euros seulement (c2-1). Rangement sur
les sous-notions existantes de « Problèmes arithmétiques » (parties-tout, comparaison, en deux étapes ou plus,
multiplicatifs) ; aucun nœud à créer. Catégories `Entiers · Problèmes` : niveaux libres après ceux du CP (relevé
MCP du 2026-10-29 : Parties-tout 1, 3 ; Deux étapes 4 ; Multiplicatifs 5 ; Comparaison neuve). Recommandations
suivies (« ok, je valide ») :

1. **Lucie** (3/10 en bleu, le reste en rouge) : modèle à part « La part qui reste », CE1-099, Fractions · Calculer ·
   Addition et Soustraction · 17.
2. **« Est-ce que ça tient ? »** (album de 350 photos) : modèle à part en case choix oui / non.
3. **Partages avec reste** : les deux sens d'arrondi (189 photos → 19 pages ; 75 œufs → 12 boîtes).

| Fichier                  | Point   | Catégorie · niveau            | Variations                                                                                       |
| ------------------------ | ------- | ----------------------------- | ------------------------------------------------------------------------------------------------ |
| `01-parties-tout`        | CE1-036 | Parties-tout · 4              | une partie (coffres), tout à 2 et 3 parties, départ inconnu, retrait, « de plus » → soustraction |
| `02-parties-tout-prix`   | CE1-036 | Parties-tout · 5              | 3 achats (1,20 € + 90 centimes + 12 €), prix manquant, achats en euros entiers                   |
| `03-est-ce-que-ca-tient` | CE1-036 | Parties-tout · 6              | album, car : oui / non (case choix)                                                              |
| `04-comparaison`         | CE1-037 | Comparaison · 1               | le plus grand, l'écart, le plus petit (« de plus »), « de moins », en euros                      |
| `05-deux-etapes`         | CE1-038 | Deux étapes · 5               | 83 + 18 − 27 ; deux achats et un billet (euros, puis centimes)                                   |
| `06-multiplicatifs-tout` | CE1-039 | Multiplicatifs · 6            | n paquets de p (tables 2 à 5), × 10, dizaines entières (7 × 20)                                  |
| `07-nombre-de-parts`     | CE1-039 | Multiplicatifs · 7            | sans reste ; reste → arrondi au-dessus (pages), en dessous (boîtes)                              |
| `08-valeur-d-une-part`   | CE1-039 | Multiplicatifs · 8            | 18 images pour 3 ; 200 élèves en 40 équipes ; 9,60 € pour 3                                      |
| `09-problemes-mixtes`    | CE1-040 | Deux étapes · 6               | litres et billet ; cahiers et protège-cahiers ; places libres du car                             |
| `10-la-part-qui-reste`   | CE1-099 | Addition et Soustraction · 17 | Lucie                                                                                            |

**Question d'accès** : personne ne lit rien de plus — modèles neufs en brouillon (admin seul) ; la migration nœud +
tag ne change aucune règle.

- 2026-10-29 : écrit (`lot-ce1-4.py`), `create-questions` en simulation 10/10 (87 specs) ; `question:specs` 200 tirages par variation, verts ; relecture des tirages : « deux gâteaux » → « deux achats », nombre hors formule, « tout le monde tient » pour l'album, monnaie rendue sur 5 € par complément (de 1,95 € à 2 €, puis à 5 €) au lieu de « 5 − 1,95 ». 10 brouillons en base locale ; aperçu admin : prix affichés « 1,10 € », 6,65 juste, corrigé lisible ; case choix oui / non juste.
- 2026-10-29 : #1987 mergée (CI verte) ; brouillons en prod à créer par David.
- 2026-10-29 : 10 brouillons créés en prod par David (`dfc324b1`, `c43bd203`, `23b13821`, `612eeb31`, `93d318d1`, `f9eeeffe`, `bc521c99`, `5e469f6f`, `e4815e7f`, `584dc8b3`), vérifiés au MCP (brouillons, sans nœud ni tag, niveaux voulus). Migration `20261030004800_questions_ce1_lot4_rangement_tags` (max des worktrees + 1 min) et test : rouge sans (5 échecs sur 9), vert 9/9.
- 2026-10-30 : #1992 mergée (CI verte, `security-auditor` sans finding bloquant) ; `db:migrate` refusé (`DbPushMissingRemoteError` : 002300 du 3e lot 3 pas joué en prod) ; rien d'appliqué (MCP : dernière jouée 004700).

## 11. Lot 5 : grandeurs — décisions (David, 2026-10-30)

Relevé MCP du 2026-10-30 : aucun modèle CE1 en grandeurs ; le CP en a 22 (`Grandeurs · Longueurs | Masses | Monnaie |
Durées`). Sous-notions toutes présentes (« Longueurs | Masses › unités et conversions | comparaison et mesure »,
« Monnaie › euros et centimes », « Durées › lecture de l'heure | conversions ») : aucun nœud à créer. Bornes
`cycle2.json` et BO CE1 p.27-29 : **pas d'écriture à virgule en longueurs et masses**, nombres écrits ≤ 1 000 ;
virgule en monnaie seulement ; heures jusqu'à 24 (« 14 : 15 »).

15 points, un par modèle → **deux lots** : 5 (longueurs, 6) puis 5 bis (masses, monnaie, durées, 9). Texte et case
choix (déjà en prod au lot 4), aucun outil neuf.

### Lot 5 — longueurs

| Fichier                     | Point   | Sous-notion           | Catégorie · niveau                    | Variations                                                                                                                                 |
| --------------------------- | ------- | --------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `01-unites-de-longueur`     | CE1-041 | unités et conversions | Longueurs · Unités · 5                | symbole d'une unité (km → choix km, m, cm, kg) ; sens d'un symbole ; la plus grande / petite des trois                                     |
| `02-choisir-l-unite`        | CE1-042 | unités et conversions | Longueurs · Unités · 6                | « Un crayon mesure 15 … » : choix cm, m, km (objets, pièces, trajets : école-piscine 2 km)                                                 |
| `03-relations-m-cm-km`      | CE1-043 | unités et conversions | Longueurs · Unités · 7                | 1 m = ? cm ; 1 km = ? m ; 3 m = ? cm ; 1 m 46 cm = ? cm ; 146 cm = ? m ? cm ; 650 m + ? m = 1 km                                           |
| `04-comparer-des-longueurs` | CE1-045 | comparaison et mesure | Longueurs · Comparaison et mesure · 3 | choix < = > : 2 m et 150 cm ; 1 m 20 cm et 125 cm ; 1 km et 900 m ; 3 m et 300 cm (égalité)                                                |
| `05-longueurs-de-reference` | CE1-046 | comparaison et mesure | Longueurs · Ordres de grandeur · 4    | « Qu'est-ce qui mesure environ 1 m ? » : objet ou distance → choix (doigt 1 cm, porte 2 m, terrain 100 m, 1 km à pied en un quart d'heure) |
| `06-estimer-une-longueur`   | CE1-047 | comparaison et mesure | Longueurs · Ordres de grandeur · 5    | « Une trousse mesure plutôt… » : 2 cm, 20 cm ou 2 m (même chiffre, ×10 et autre unité)                                                     |

### Lot 5 bis — masses, monnaie, durées

| Fichier                    | Point   | Sous-notion           | Catégorie · niveau                      | Variations                                                                                                                                    |
| -------------------------- | ------- | --------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `07-unites-de-masse`       | CE1-049 | unités et conversions | Masses · Unités · 1 (neuve)             | symbole (g, kg ; leurre km) ; « On pèse une pomme en … » : g ou kg                                                                            |
| `08-un-kilo-mille-grammes` | CE1-050 | unités et conversions | Masses · Unités · 2                     | 1 kg = ? g ; 1 000 g = ? kg ; 400 g + ? g = 1 kg ; 250 g + 250 g + 500 g = ? kg                                                               |
| `09-comparer-des-masses`   | CE1-051 | comparaison et mesure | Masses · Comparaison · 2                | choix < = > (1 kg et 900 g ; 1 kg et 1 000 g ; 2 kg et 100 g contre 950 g) ; quatre masses du BO : la plus lourde, la plus légère             |
| `10-masses-de-reference`   | CE1-052 | comparaison et mesure | Masses · Ordres de grandeur · 1 (neuve) | « Qu'est-ce qui pèse environ 1 kg ? » (paquet de sucre) ; « … environ 10 g ? » (sachet de levure)                                             |
| `11-estimer-une-masse`     | CE1-085 | comparaison et mesure | Masses · Ordres de grandeur · 2         | « Une pomme pèse plutôt… » : 15 g, 150 g ou 15 kg                                                                                             |
| `12-euros-et-centimes`     | CE1-053 | euros et centimes     | Monnaie · Euros et centimes · 1 (neuve) | 1 € = ? c ; 3 € = ? c ; 300 c = ? € ; 345 c = ? € ? c ; 65 c + ? c = 1 €                                                                      |
| `13-ecriture-a-virgule`    | CE1-058 | euros et centimes     | Monnaie · Euros et centimes · 2         | 2 € et 17 c → 2,17 € ; 2 € et 5 c → 2,05 € (et 2 € et 50 c) ; 85 c → 0,85 € ; 1 € et 120 c → 2,20 € ; 3,45 € → ? € ? c                        |
| `14-matin-et-apres-midi`   | CE1-061 | lecture de l'heure    | Durées · Moments de la journée · 2      | « 3 heures de l'après-midi » → ? h (15) ; 14 h 15 → choix matin / après-midi ; 20 h → ? heures du soir                                        |
| `15-heure-et-minute`       | CE1-062 | conversions           | Durées · Unités · 1 (neuve)             | 1 h = ? min ; demi-heure, quart d'heure ; 3 quarts d'heure ; 2 h = ? min ; 1 h 15 min = ? min ; h ou min (« Je suis resté 2 … à la piscine ») |

Erreurs typiques dans les `testSpecs` : 1 m = 10 cm ; 1 m 46 cm = 1 046 ou 47 ; 2 € et 5 c = 2,5 € ; 85 c = 85 € ;
1 h = 100 min ; 1 h 15 min = 115 min.

**Question d'accès** : personne ne lit rien de plus — modèles neufs en brouillon (admin seul) ; la migration nœud +
tag ne change aucune règle.

### Questions à David

Réponse de David : les quatre recommandations (« je valide »).

1. **Deux lots** (5 longueurs, 5 bis le reste) plutôt qu'un lot de 15 ? Recommandation : oui (plafond de 10).
2. **Ordonner quatre masses (051)** : la plus lourde et la plus légère en case choix, plutôt que quatre cases où
   recopier « 1 kg et 300 g » ? Recommandation : choix ; le rangement complet reste au BO, pas au modèle.
3. **Catégories neuves** : « Masses · Unités », « Masses · Ordres de grandeur », « Monnaie · Euros et centimes »,
   « Durées · Unités » (calquées sur les longueurs du CP), plutôt que « Durées · Convertir · 13 » après les 12 de 6e ?
   Recommandation : catégories neuves.
4. **2,20 € tapé « 2,2 »** (058) : juste comme au lot 4 (`zeros: off`), ou ambre puisque le point porte justement sur
   l'écriture à virgule ? Recommandation : juste (même règle qu'au lot 4), le corrigé écrit toujours 2,20 €.

- 2026-10-30 : lot 5 écrit (`lot-ce1-5.py`, `scripts/questions/ce1-5/`), `create-questions` en simulation 6/6 (50 specs),
  `question:specs` 200 tirages par variation, verts ; 6 brouillons en base locale ; aperçu admin : 300 m + 700 m = 1 km
  juste, corrigé lisible ; comparer 7 m et 720 cm : « > » faux, bonne réponse « < » montrée, corrigé en cm.
- 2026-10-30 : #2022 mergée (CI verte après relance d'un job navigateur instable) ; brouillons en prod à créer par David.
- 2026-10-30 : 6 brouillons créés en prod par David (`ee4e61b6`, `48d19e46`, `28c90fa4`, `76908c5f`, `a709b222`,
  `1bd819dd`), vérifiés au MCP (brouillons, sans nœud ni tag, niveaux voulus, 50 specs). Migration
  `20261030162100_questions_ce1_lot5_rangement_tags` (max des worktrees + 1 min) et test : rouge sans (5 échecs sur 9),
  vert 9/9.
- 2026-10-30 : #2025 mergée (`security-auditor` sans finding bloquant, CI verte) ; `db:migrate` par David (161000 de
  questions-ce2 avec) ; vérifié au MCP : 6/6 sur le nœud de leur point, un point chacun, `updated_at` inchangé. Page à
  cocher publiée, aucune alerte.
- 2026-10-30 : relecture 6/6 OK (verdicts comptés) ; `publier-lot` en simulation 6/6, puis `--publier` par David ;
  6 `published` vérifiés au MCP.
- 2026-10-30 : lot 5 bis écrit (`lot-ce1-5bis.py`, `scripts/questions/ce1-5bis/`), niveaux re-relevés au MCP
  (Masses · Comparaison 1, Durées · Moments de la journée 1, les quatre autres catégories vides) ;
  `create-questions` en simulation 9/9 (87 specs), `question:specs` 200 tirages par variation, verts ; 9
  brouillons en base locale ; aperçu admin : 8,16 € = 816 € et 0 centime refusé, corrigé 8 € et 16 centimes.
- 2026-10-30 : #2028 mergée (CI verte, revue : aucune, contenu) ; `create-questions --publier` par David (depuis le
  dépôt principal, `--dir ../ubumaths-wt-questions-ce1/…`) ; 9 brouillons vérifiés au MCP (`27903489`, `6db56239`,
  `c38c9152`, `3ed2e7d0`, `f98ca134`, `5248cab0`, `70fc062a`, `200b1e9f`, `10ec8633`), sans nœud ni tag, 87 specs.
- 2026-10-30 : migration `20261030162200_questions_ce1_lot5bis_rangement_tags` (max des worktrees + 1 min) et test :
  rouge sans (5 échecs sur 9), vert 9/9 ; `security-auditor` sans finding ; #2030 mergée (CI verte).
- 2026-10-30 : `db:migrate` par David (avec les migrations 3e lot 4b et 6e lot 6b d'autres sessions) ; vérifié au MCP :
  9/9 sur le nœud de leur point, un tag chacun, `updated_at` = `created_at` ; page à cocher publiée, aucune alerte.

## 12. Lots à outils existants — découpage (David, 2026-11-01)

Relevé des outils le 2026-11-01 (`ubumark.md`, en-tête « Vérifié contre le code ») : depuis le § 3, plusieurs outils C
existent — horloge à placer (060), `barres` à construire (088), ` ```partage ` + `colorier:` (095, 097), ` ```cubes `
avec `dessiner:` / `retrouver:` (079), ` ```solide `, ` ```patron `. Seul manque `centaines:` de `collection` (001-003).

Recommandations suivies (« je suis tes recos ») :

1. Lots à outils existants, 10 points au plus : **6** calcul posé et monnaie → **7** heure et données → **8** fractions
   dessinées et géométrie → **9** espace et mesure.
2. 079 (assemblages de cubes, classé D) repris au lot 9 avec ` ```cubes `.
3. `centaines:` de `collection` (001, 002) : petit chantier à part, plus tard.

⚠️ **Monnaie : centimes indisponibles.** ` ```monnaie ` n'a ni centimes (`50c` : « pas encore disponible (CE1, plus
tard) », `monnaie-parser.ts`) ni billets de 200 / 500 € ; `construire:` va de 1 à 100 € entiers. Or 054, 055, 056,
057 et 086 ont tous pour borne « euros et centimes, ou écriture à virgule » (BO c2 p.28 ; 056 : « pas de pièce de
1 € »). Ils passent en **C** (outil à prolonger) ; le lot 6 tel quel ne se fait pas → question à David.

| Lot | Thème                            | Points                                              |
| --- | -------------------------------- | --------------------------------------------------- |
| 6   | calcul posé (+ monnaie ?)        | 022, 100 ; 054, 055, 056, 057, 086 si centimes      |
| 7   | heure et données                 | 059, 060, 063, 104 ; 082, 106, 088 ; 089, 107, 081  |
| 8   | fractions dessinées et géométrie | 096, 098, 095, 097 ; 069, 070, 105 ; 075, 087 ; 073 |
| 9   | espace et mesure                 | 044 ; 064, 065 ; 079 ; 076, 077 ; 080               |

David (2026-11-01, « tes recos ? » puis « go ») : **A** — lot 6 resserré sur le calcul posé et l'heure, lot 7 les
données (082, 106, 088, 089, 107, 081), chantier `monnaie-centimes` à part puis lot monnaie (054, 055, 056, 057, 086),
puis lots 8 et 9.

## 13. Lot 6 : calcul posé et heure — phase 0 (2026-11-01)

Relevé MCP du 2026-11-01 : `Addition · Calcul posé · 1` (CP, `0f7381e6`) ; aucune soustraction posée ; `Durées · Lire
l'heure · 1, 2` (CP) ; `Durées · Calculer · 1-8` (6e). Nœuds des 6 points présents : « Entiers : addition et
soustraction › calcul posé » (022, 100), « Durées › lecture de l'heure » (059, 060), « Durées › calcul de durées »
(063, 104). Outils : ` ```operation ` (cases du résultat, `retenues:`, `méthode: cassage | compensation`),
` ```horloge ` (`heure:` 1 à 4 cadrans avec `légendes:`, `placer:` = aiguilles à poser, déjà prévu pour CE1-060).
Bornes : somme ≤ 1 000, 2 ou 3 termes (245 + 437 ; 218 + 48 ; 76 + 7 + 568) ; soustraction ≤ 1 000 ; heures entières,
demies, quarts, < 24 (« 2 heures et quart » = 14 h 15) ; durées dans la même journée (8 h 30 → 8 h 45 ; 15 h 45 →
16 h 15 ; midi → 20 h ; 2 heures et 130 minutes).

| Fichier                              | Point   | Catégorie · niveau                     | Variations                                                                                                                                                          |
| ------------------------------------ | ------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-addition-posee`                  | CE1-022 | Addition · Calcul posé · 2             | 3 + 3 chiffres (245 + 437) ; 3 + 2 (218 + 48) ; 3 termes (76 + 7 + 568) ; retenue aux centaines (somme 1 000 au plus) ; `retenues: oui`                             |
| `02-soustraction-posee-cassage`      | CE1-100 | Soustraction · Calcul posé · 1 (neuve) | 3 − 2 chiffres, un échange (352 − 27) ; 3 − 3, deux échanges (532 − 178) ; zéro au milieu (504 − 37) ; `méthode: cassage`                                           |
| `03-soustraction-posee-compensation` | CE1-100 | Soustraction · Calcul posé · 2         | mêmes nombres, `méthode: compensation`                                                                                                                              |
| `04-lire-l-heure`                    | CE1-059 | Durées · Lire l'heure · 3              | « Il est [_] h [_]. » : et demie (8 h 30), et quart (3 h 15), moins le quart (8 h 45, petite aiguille presque sur le 9) ; « C'est l'après-midi » → 14 h 15, 16 h 30 |
| `05-placer-les-aiguilles`            | CE1-060 | Durées · Lire l'heure · 4              | `placer:` : heure juste, et demie, et quart, moins le quart (« 9 h moins le quart » → 8 h 45), après-midi (15 h 30 se place sur le 3)                               |
| `06-duree-ecoulee`                   | CE1-063 | Durées · Durée écoulée · 1 (neuve)     | deux cadrans `Début ; Fin` : 8 h 30 → 8 h 45 ([_] min) ; 15 h 45 → 16 h 15 (passage de l'heure) ; midi → 20 h ([_] h) ; 9 h 15 → 11 h 45 ([_] h [_] min)            |
| `07-comparer-des-durees`             | CE1-104 | Durées · Durée écoulée · 2             | quatre cadrans (film, match) → choix « le film / le match / autant » ; 2 heures ou 130 minutes : la plus longue ; 1 h 30 ou 90 min (égalité)                        |

Erreurs typiques dans les `testSpecs` : retenue oubliée (245 + 437 = 672) ; plus petit chiffre ôté du plus grand
(352 − 27 = 335) ; zéro mal échangé (504 − 37 = 577) ; 8 h 45 lu 9 h 45 ; aiguilles inversées (3 h 15 lu 3 h) ;
14 h 15 répondu 2 h 15 ; 15 h 45 → 16 h 15 = 70 min (soustraction décimale) ; 2 h = 200 min.

**Question d'accès** : personne ne lit rien de plus — modèles neufs en brouillon (admin seul) ; la migration nœud +
tag ne change aucune règle.

### Questions à David

1. **Soustraction : deux modèles** (cassage, compensation), le prof choisit la méthode de sa classe, plutôt qu'un seul
   qui mêlerait les deux ? Recommandation : deux (sept modèles au lot).
2. **Après-midi sur un cadran de 12** : l'énoncé dit « c'est l'après-midi », la réponse est 14 h 15 (exemple du BO),
   et 2 h 15 est ambre avec le message « l'après-midi, on compte après 12 » ? Recommandation : oui ; le cadran
   `cadran: 24` reste pour plus tard.
3. **Catégorie neuve « Durées · Durée écoulée »** plutôt que `Durées · Calculer · 9-10` après la 6e ? Recommandation :
   neuve (même règle qu'au lot 5 bis).
4. **Durée : unité de la réponse selon la variation** ([_] min sous l'heure, [_] h [_] min au-delà) plutôt que toujours
   en minutes ? Recommandation : selon la variation, comme on le dit à l'oral.

Réponse de David (« tes recos ? » puis « go », 2026-11-01) : les quatre recommandations.

⚠️ Question 2, écart à la décision : le juge n'a **pas d'ambre pour une valeur fausse** (une règle de validation ne peut
que refuser, avec son message). 2 h 15 l'après-midi est donc **faux, avec le message** « L'après-midi, on compte après
midi : 2 heures de l'après-midi, c'est 14 h » (règle `custom` `answer != {{h}}` sur la case des heures). À confirmer par
David ; un vrai ambre demanderait du code.

- 2026-11-01 : lot 6 écrit (`lot-ce1-6.py`, `scripts/questions/ce1-6/`), simulation 7/7 (66 specs), `question:specs`
  verts (30 à 40 tirages par variation) ; 7 brouillons en base locale. Pièges trouvés : une case d'opération posée n'a
  **pas** d'`expectedAnswer` (le bloc la calcule) ; un `{{if:}}` dont la condition contient un `{{eval:}}` n'est **pas
  résolu** (« heure: if:0==0 ») et les specs restent vertes → relire les blocs rendus (`--apercu`) ; dans `placer:`,
  écrire `9 h 0`. Aperçu admin : aiguilles 11 h 45 jugées justes ; 710 − 246 = 464 juste, cases d'échange au-dessus ;
  quatre cadrans du film et du match lisibles.
- 2026-11-01 : #2071 mergée (CI verte après deux relances du shard navigateur 2/2 : installation de Chromium
  bloquée, puis `page-demo-lexique` en échec, sans lien avec le lot) ; brouillons en prod à créer par David.
- 2026-11-01 : `create-questions --publier` par David : 7 brouillons vérifiés au MCP (`c26cc664`, `1e66bb1f`,
  `92caa903`, `e3d11972`, `d478935f`, `24a86a39`, `739d58e3`), sans nœud ni tag, `updated_at` intact.
- 2026-11-01 : migration `20261101141600_questions_ce1_lot6_rangement_tags` (max des worktrees + 1 min) et test :
  rouge sans (5 échecs sur 9), vert 9/9.
- 2026-11-01 : David valide « 2 h 15 l'après-midi = **faux avec message** » (pas d'ambre : toucherait au juge commun,
  chantier à part si un jour on veut l'ambre pour les erreurs typiques). Remarque non bloquante de `security-auditor`
  (le rollback retirerait un même tag posé à la main entre-temps) acceptée, comme au lot 5 bis.
- 2026-11-01 : #2083 mergée (CI verte 16/16) ; `db:migrate --include-all` par David (une migration 1re spé plus
  récente déjà jouée, la nôtre seule appliquée) ; vérifié au MCP : 7/7 sur le nœud de leur point, un tag chacun,
  `updated_at` = `created_at`. Page à cocher publiée (https://claude.ai/artifact/NtdykbdR6MZfDfChmD2woM) ; alertes :
  les 3 opérations posées non dessinées (à jouer dans l'aperçu), homonyme CP `0f7381e6` écarté pour l'addition (juste).
- 2026-11-01 : relecture 7/7 OK (verdicts comptés en base, aucun commentaire) ; `publier-lot` simulé (7 passent), puis
  `--publier` par David : 7/7 publiés, vérifié au MCP (publiés, rangés, tagués). Lot 6 clos.

## 14. Lot 7 : données — phase 0 (2026-11-01)

Relevé MCP du 2026-11-01 : **aucun** diagramme en barres en base, à aucun niveau (CP-072 et CE2-082 sans modèle) ;
`Représenter des données · Tableaux · 1` (CP-068, `7752c23e`), `Représenter des données · Tableau à double entrée · 1, 2`
(CP-069, CP-084). Nœuds des 6 points présents : « Représenter des données › diagrammes en barres » (082, 106, 088),
« › tableaux » (081), « › tableau à double entrée » (089, 107). Outils : ` ```barres ` (lecture ; `axe: 0 à 15` gradue
de un en un ; `placer:` = barres à monter, `données:` = série brute que l'élève compte), ` ```tableau-croise `
(`lignes:`, `colonnes:`, `totaux: oui`, `masquer: Ligne/Colonne` = case `?`), tableau markdown à cases `$?$` (CP-068),
case `choix`. Bornes (BO c2 p.38) : caractère à 2 à 5 valeurs, moins de 100 individus, axe gradué de un en un ;
tableau à double entrée avec totaux (filles / garçons × 4 modes de transport, total 282).

| Fichier                            | Point   | Catégorie · niveau                                         | Variations                                                                                                                                                                  |
| ---------------------------------- | ------- | ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-lire-un-diagramme-en-barres`   | CE1-082 | Représenter des données · Diagrammes en barres · 1 (neuve) | « Combien d'élèves ont choisi le foot ? » [_] : 3 barres (sports, 2 à 12) ; 4 barres (fruits, jusqu'à 15) ; 5 barres (animaux, axe 0 à 20) ; valeurs non écrites            |
| `02-interpreter-un-diagramme`      | CE1-106 | Représenter des données · Diagrammes en barres · 2         | le plus choisi (case choix des noms) ; le moins choisi ; « combien de plus que » [_] ; « combien d'élèves en tout » [_] (total < 100) ; effectifs tous différents           |
| `03-construire-un-diagramme`       | CE1-088 | Représenter des données · Diagrammes en barres · 3         | tableau d'effectifs donné, 2 barres à monter (les autres dessinées) ; toutes les barres (3 à 4) ; série brute (`données:`, 12 à 20 réponses) à compter puis construire      |
| `04-ranger-dans-un-tableau`        | CE1-081 | Représenter des données · Tableaux · 2                     | liste de réponses (« Léa : chat, Tom : chien… », 12 à 25) → colonne « Nombre d'élèves » du tableau [_] par ligne ; 3, 4 puis 5 valeurs ; avec une ligne Total               |
| `05-lire-un-tableau-double-entree` | CE1-089 | Représenter des données · Tableau à double entrée · 3      | filles / garçons × lundi… jeudi (cantine) : « combien de filles le mardi ? » [_] ; transport × filles / garçons avec totaux : lire une case, puis un total                  |
| `06-interpreter-un-tableau`        | CE1-107 | Représenter des données · Tableau à double entrée · 4      | quel jour le plus d'élèves (totaux affichés, case choix) ; sans totaux (il faut additionner) ; case masquée retrouvée par le total [_] ; « combien de garçons de plus » [_] |

Erreurs typiques dans les `testSpecs` : trait voisin lu (±1) ; catégorie voisine lue ; le plus grand nombre de
l'énoncé plutôt que la plus haute barre ; total qui oublie une barre ; écart répondu par une des deux valeurs ; ligne et
colonne inversées (garçons du mardi au lieu des filles) ; total de la ligne au lieu de la colonne ; case masquée = total.

**Question d'accès** : personne ne lit rien de plus — modèles neufs en brouillon (admin seul) ; la migration nœud +
tag ne change aucune règle.

### Questions à David

1. **081 « produire un tableau »** : l'élève compte une liste de réponses et remplit la colonne des effectifs d'un
   tableau déjà tracé (noms écrits), comme CP-068 en plus grand ; tracer le tableau lui-même n'a pas d'outil.
   Recommandation : oui.
2. **Axe gradué de un en un** (borne BO) : les barres vont au plus à 20 (au-delà l'axe devient illisible au doigt),
   même si la population peut aller jusqu'à 99 au total. Recommandation : 20 au plus par barre, total < 100.
3. **Tableau à double entrée** : cases de 5 à 99, totaux jusqu'à 1 000 (l'exemple du BO a 282, le CE1 va à 1 000) ?
   Recommandation : oui, sommes à deux chiffres d'abord (cases ≤ 60), puis le tableau du BO (total ~ 300).
4. **Catégories** : neuve « Représenter des données · Diagrammes en barres · 1 à 3 » ; les tableaux continuent le CP
   (« Tableaux · 2 », « Tableau à double entrée · 3, 4 »). Recommandation : oui (même règle qu'aux lots 5 bis et 6).

Réponse de David (« tes recos ? » puis « go », 2026-11-01) : les quatre recommandations.

- 2026-11-01 : lot 7 écrit (`lot-ce1-7.py`, `scripts/questions/ce1-7/`), `question:specs` 56/56 (800 tirages), simulation
  6/6 ; 6 brouillons en base locale, joués dans l'aperçu admin (barres montées justes, case choix du tableau juste).
  Valeur choisie par un indice : polynôme de Lagrange en `{{eval:}}` ; série brute : indicatrices (CP-068). Trouvé :
  une barre **non construite** parmi d'autres est jugée « forme non optimale », pas « faux » (juge commun) — spec
  remplacée par une barre fausse ; à signaler, pas corrigé ici. `totaux: oui` ajoute la ligne ET la colonne Total.
  PR #2102 ouverte.
- 2026-11-01 : #2102 mergée (CI verte 15/15) ; brouillons en prod à créer par David.
- 2026-11-01 : `create-questions --publier` par David : 6 brouillons vérifiés au MCP (`f756fc4b`, `cb5a6a89`,
  `b4527dd3`, `bded0f4a`, `7369d049`, `29edb833`), catégories attendues, sans nœud ni tag, `updated_at` intact.
- 2026-11-01 : migration `20261101190100_questions_ce1_lot7_rangement_tags` (max des worktrees + 1 min) et test :
  rouge sans (3 échecs, 4 non joués sur 9), vert 9/9 ; PR #2105.
- 2026-11-01 : `security-auditor` sans finding (SQL exécuté identique au lot 6) ; #2105 mergée (CI verte 16/16).
  `db:migrate` NON lancé : `20261101170000_questions_4_lot7` et `20261101183000_questions_3_lot6`, plus anciennes, pas
  jouées en prod ; `db push` les jouerait aussi (`--include-all`). Attendre qu'elles le soient, puis `db:migrate`.
- 2026-11-01 : accord des sessions questions-3 et questions-4 ; `db:migrate --include-all` par David depuis main : 170000,
  183000, 190000 (1re spé, signalée à sa session) et la nôtre 190100 appliquées. Vérifié au MCP : 6/6 sur le nœud de leur
  point, un tag chacun, brouillons, `updated_at` intact. Page à cocher publiée
  (https://claude.ai/artifact/C4GhFJ83yChjuhs9KCYu64) ; alertes : 5 modèles à blocs `barres` / `tableau-croise` non
  dessinés par le script → liens vers l'aperçu admin en prod dans l'intro.
- 2026-11-01 : relecture 6/6 OK (verdicts comptés en base, aucun commentaire) ; catégories relevées avant publication,
  sans collision ; `publier-lot` simulé (6 passent), puis `--publier` par David : 6/6 publiés, vérifié au MCP (publiés,
  rangés, tagués). Lot 7 clos. Reste signalé : une barre non construite parmi d'autres jugée « forme non optimale ».

## 15. Lot 8 : monnaie — phase 0 (2026-11-01)

Relevé MCP du 2026-11-01 : aucun modèle sur 054, 055, 056, 057, 086. Catégories du CP à continuer :
« Monnaie · Pièces et billets · 1 à 7 » (CP-042 à 045, `construire:` aux niveaux 6 et 7) et « Monnaie · Rendre la
monnaie · 1, 2 » (CP-071 : en case, puis `construire:`). « Monnaie · Euros et centimes · 1, 2 » = 053, 058 (lot 5 bis).
Outil : ` ```monnaie ` avec centimes (`pièces: 2×50c 1×20c`), billets de 200 / 500 €, `montant: 3,45`,
`construire: 3,45` + `réserve:` (#2127, **pas en prod** : les modèles restent en brouillon jusqu'au `deploy:prod` qui
la livre). Construction jugée sur la somme : toute construction juste est « juste », pas seulement le moins d'objets.
Bornes (BO c2 p.28) : euros et centimes, centimes < 100, ou écriture à virgule ; 054 : ordonner quatre prix quelles
que soient leurs écritures (12 € > 60 centimes) ; 056 : contrainte possible « pas de pièce de 1 € » (10, 20, 50 c).

| Fichier                       | Point   | Catégorie · niveau               | Variations                                                                                                                                                                                                                |
| ----------------------------- | ------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-combien-d-argent`         | CE1-055 | Monnaie · Pièces et billets · 8  | pièces de centimes seules (< 1 €) → [_] c ; euros et centimes (< 10 €) → [_] € [_] c ; billets, pièces et centimes (< 100 €) → [_] € à virgule ; une variation avec 1, 2, 5 c                                             |
| `02-qui-a-le-plus`            | CE1-054 | Monnaie · Pièces et billets · 9  | Léa / Tom, euros et centimes, écart ≤ 50 c, case choix (Léa, Tom, autant) ; beaucoup de petites pièces contre peu de grosses ; quatre prix écrits (2,50 € ; 250 c ; 2 € 5 c ; 60 c ; 12 €…) : le plus cher, le moins cher |
| `03-pose-la-somme`            | CE1-056 | Monnaie · Pièces et billets · 10 | `construire:` 0,35 à 0,95 € ; 1,05 à 9,95 € (somme écrite « 3,45 € » ou « 3 € et 45 c ») ; sans pièce de 1 € (réserve 10, 20, 50 c, somme 0,60 à 1,90 €)                                                                  |
| `04-paie-tes-achats`          | CE1-057 | Monnaie · Pièces et billets · 11 | un article à 1,20 à 9,80 € → `construire:` ; deux articles (2,30 € + 1,45 €) → `construire:` de la somme ; « Léa a ceci, peut-elle acheter … à 4,80 € ? » (oui / non, écart ≤ 50 c)                                       |
| `05-combien-le-marchand-rend` | CE1-086 | Monnaie · Rendre la monnaie · 3  | prix 0,10 à 0,90 € payé avec 1 € → [_] c ; prix 1,10 à 4,90 € payé avec 5 € → [_] € à virgule ; 5,50 à 9,50 € payé avec 10 € ; billet de 20 € (prix 12,30 à 19,70 €)                                                      |
| `06-rends-la-monnaie`         | CE1-086 | Monnaie · Rendre la monnaie · 4  | mêmes situations, l'élève pose le rendu (`construire:`, réserve 1, 2, 5, 10 € et 10, 20, 50 c)                                                                                                                            |

Prix au multiple de 10 c dans les gestes (`construire:`) et dans le rendu ; multiples de 5 c dans les cases ; 1, 2,
5 c seulement dans `01` (compter). Corrigé : rendu par complément (« de 3,45 € à 4 €, puis à 5 € »), comme au lot 4.

Erreurs typiques dans les `testSpecs` : nombre d'objets compté au lieu des valeurs ; 2 € et 5 c = 2,5 € ; centimes
comptés en euros (50 c lus 50 €) ; 345 c écrit 345 € ; rendu = prix ; rendu calculé sur le mauvais billet ; « le plus
de pièces » choisi au lieu du plus d'argent ; 60 c > 12 € (le plus grand nombre écrit).

**Question d'accès** : personne ne lit rien de plus — modèles neufs en brouillon (admin seul) ; la migration nœud +
tag ne change aucune règle.

### Questions à David

1. **Deux modèles pour 086** (en case, puis le geste), comme au CP (CP-071, niveaux 1 et 2) ? Recommandation : oui.
2. **Prix au multiple de 10 c dans les gestes** : poser 3,47 € demande des pièces de 2 c et 5 c (jusqu'à 8 objets de
   plus), le geste devient long sans rien apprendre de plus ; les cases gardent le multiple de 5 c. Recommandation : oui.
3. **Réponse à virgule** : « 2,2 » juste pour 2,20 € (règle du lot 5 bis), corrigé « 2,20 € » ? Recommandation : oui.
4. **Publication** : les brouillons peuvent être créés tout de suite, mais la page à cocher et la publication attendent
   le `deploy:prod` qui livre #2127 (sans lui, les centimes affichent une erreur chez l'élève). Recommandation : écrire
   et ranger le lot maintenant, publier après ton prochain `deploy:prod`.
5. **Numéro du lot** : « lot 8 » pour la monnaie, les lots « 8 » et « 9 » du § 12 deviennent 9 et 10. Recommandation :
   oui (les fichiers suivent : `lot-ce1-8.py`, `scripts/questions/ce1-8/`).

Réponse de David (« tes recos ? » puis « go », 2026-11-01) : les cinq recommandations.

- 2026-11-01 : lot 8 écrit (`lot-ce1-8.py`, `scripts/questions/ce1-8/`), `question:specs` 51/51 (4 400 tirages),
  simulation 6/6 ; 6 brouillons en base locale. Aperçu admin : rendu de 2,20 € posé (2 € + 20 c) jugé juste ; deux
  porte-monnaie de centimes lisibles, mais petits quand l'un a 11 pièces (même échelle que CP-042). `construire: {{p}}c`
  (le bloc lit `345c`). Corrigé du rendu en une seule étape (une étape `{{if:}}` vide restait affichée) ; objets à la
  mesure du billet (sucette pour 1 €, cahier pour 5 €).
- 2026-11-01 : #2135 mergée (CI verte 14/14, revue : aucune, contenu) ; brouillons en prod à créer par David.
- 2026-11-01 : `create-questions --publier` par David : 6 brouillons vérifiés au MCP (`3fa7e2b5`, `0942f96a`, `463d8266`,
  `4cd0d93f`, `3c9711f9`, `19d80fc9`), catégories attendues (Pièces et billets 8 à 11, Rendre la monnaie 3, 4), sans nœud
  ni tag, `updated_at` intact. Migration `20261101215100_questions_ce1_lot8_rangement_tags` (max des worktrees + 1 min)
  et test : rouge sans (5 échecs sur 9), vert 9/9.
- 2026-11-01 : `security-auditor` sans finding (SQL identique au lot 7) ; #2141 mergée (CI verte 16/16). `db:migrate` NON
  lancé : `20261101213600_questions_2de_fonctions_rangement_tags` (#2134), plus ancienne, pas jouée en prod ; `db push`
  la jouerait aussi (`--include-all`). Attendre qu'elle le soit, puis `db:migrate`.
- 2026-11-01 : `20261101215100` jouée en prod avec la migration 2de (`db push --include-all` par David, session
  questions-2de) ; vérifié au MCP : 6/6 brouillons, sur le nœud de leur point, un tag chacun, `updated_at` intact.
