# Chantier « questions-ce1 » — couvrir les points du CE1 en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Chantier de référence : le CP ([questions-progress.md](questions-progress.md)).

## Reprendre ici

_Mis à jour le 2026-10-26, après #1843._

- **État** : lot 0 (corrections) MERGÉ (#1843) et migrations JOUÉES en prod (`db:migrate`), vérifié : 3 modèles réécrits (md5 = contenu de la migration), décompositions sur « écritures » + CE1-005, CE1-024 retiré, `47f97c9f` en brouillon, 4 modèles en CE2. Vérification manuelle notée (`verifications-manuelles.md`, #1843).
- **Prochaine action** : phase 0 du lot 1 (calcul mental : 029, 102, 084, 032, 083, 024), comportements en français, à faire valider avant d'écrire ; nouveau worktree.
- **En attente de David** : rien.
- **Pièges en cours** : modèle publié → deux migrations (gabarits CE1 lot 0, `couvrir-un-niveau.md` § 7), rollback qui garde l'état laissé ; copies de test publiées → un niveau chacune ; tag = point du nœud ou de sa notion ; QCM en réécriture (case « choix ») → demander la forme au premier lot qui en a besoin ; `collection` n'a pas `centaines:`.
- **Worktree / branche** : aucun (retiré après #1843).

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
