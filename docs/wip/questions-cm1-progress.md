# Chantier « questions-cm1 » — couvrir les points du CM1 en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Chantier de référence : le CP ([questions-progress.md](questions-progress.md)).

## Reprendre ici

_Mis à jour le 2026-10-31, après #2045._

- **État** : lots 0, 1, 2 et 3a publiés. Lot 3b (fractions décimales, 8 modèles) : 8 brouillons en prod (§ 10 quater) ; migration de rangement `20261030201100` mergée (#2045), **pas encore jouée**. #2040 et #2032 mergées, pas en prod.
- **Prochaine action** : après le `db:migrate` de David, relevé MCP (8 modèles sur leur sous-notion, un point chacun, `updated_at` inchangé) ; page à cocher, simulation `publier-lot`, publication. Ensuite lot 3c (partages, brouillons jusqu'au `deploy:prod` du bloc ```partage).
- **En attente de David** : `pnpm db:migrate` depuis le dépôt principal (seule migration en attente au 2026-10-31 : `20261030201100`).
- **Pièges en cours** : `db:migrate` pousse TOUTES les migrations en attente et le mode auto le refuse : David le lance ; horodatage = max de `origin/main` ET des worktrees + 1 min (#2017) ; `Doc-inchangée:` dans un message de COMMIT ; commitlint refuse un sujet qui commence par une majuscule (« CM1 ») ; worktree neuf : `pnpm exec svelte-kit sync` avant les scripts `tsx` (`$lib`) ; `gh pr checks` peut rester « pending » sur des 502 : suivre le run.
- **Worktree / branche** : aucun (retiré après #2045).

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

## 4 bis. Décisions (David, 2026-10-27)

« go » : les six recommandations du § 4 sont validées.

1. Les modèles hors programme changent de niveau en lot 0 (détail et cas sans point : § 5).
2. Tables (035, 161, 036) : modèles CM1 propres, tables de 0 à 10 mélangées.
3. Choix : case « choix » partout, jamais l'ancien QCM.
4. Outils : droite à placer dès son `deploy:prod`, barres, fractions à colorier ; repère plus tard ;
   107, 108, 167, 168 après `figure-et-choix`.
5. Points D sans modèle.
6. Lots : 0 corrections → 1 calcul mental → 2 numération entiers → 3 fractions → 4 décimaux →
   5 grandeurs → 6 problèmes → 7 données → 8 géométrie dessinée → probabilités, proportionnalité →
   outils neufs.

## 5. Lot 0 : corrections — phase 0 (à valider)

Relevé du 2026-10-27 : les 26 modèles n'ont que **CM1** pour niveau (le retirer les laisserait sans
niveau) ; **0 donnée d'élève** (chapter_exercises, chapter_series, chapter_worksheets,
evaluation_attempt_questions, journal_entry_activities, skill_attempts, srs_cards, test_answers,
user_favorite_templates). Le nœud de chaque point d'accueil a été lu en base.

### 5.1 Vers le CM2 (13 modèles, niveau CM1 → CM2, tag ajouté)

| Modèle     | Titre (sous-titre)                         | Point                                                     | Nœud                                                                |
| ---------- | ------------------------------------------ | --------------------------------------------------------- | ------------------------------------------------------------------- |
| `e38d205a` | Calculer un produit (× 100)                | CM2-042                                                   | inchangé                                                            |
| `19323604` | Calculer un produit (× 1 000)              | CM2-042                                                   | inchangé                                                            |
| `32724446` | Encadrer au dixième près                   | CM2-117                                                   | inchangé                                                            |
| `6379fa20` | Encadrer au centième près (9,926)          | CM2-117 (« au centième, ex. 17,995 »)                     | inchangé                                                            |
| `4643ed4a` | Multiplier deux multiples de 10            | CM2-046                                                   | inchangé                                                            |
| `e320755f` | Produit entier × 1/10                      | CM2-021                                                   | inchangé                                                            |
| `8fa3108c` | Produit entier × fraction                  | CM2-021                                                   | inchangé                                                            |
| `a0241952` | Somme de décimaux avec retenue (2,9 + 6,9) | CM2-044 (deux décimaux < 10, un chiffre après la virgule) | inchangé                                                            |
| `ff3ee576` | Somme avec retenues (9,8 + 9,5)            | CM2-044                                                   | inchangé                                                            |
| `aa788ca7` | ? × 100 = … (décimal)                      | CM2-065 (égalité à trous)                                 | → égalités à trous                                                  |
| `ac2dae38` | ? × 1 000 = … (décimal)                    | CM2-065                                                   | → égalités à trous                                                  |
| `a5d5a7a0` | 90 × ? = 8 100                             | CM2-065                                                   | → égalités à trous                                                  |
| `edc5d7d4` | Moitié des impairs                         | CM2-037                                                   | inchangé — **contenu** : impairs de 1 à **15** (aujourd'hui 1 à 29) |

### 5.2 Vers le CM2 avec réécriture (1 modèle)

- `322f3479` Forme décimale des fractions usuelles → **CM2-039** : liste ramenée à celle du point
  (1/10, 1/100, 1/1 000, 1/2, 1/4, 3/4, 3/2, 4/2, 5/2) au lieu de 1/2, 1/4, 2/10, 3/2, 5/2, 1/100,
  2/1000, 7/2, 9/2. Nœud inchangé.

### 5.3 Vers la 6e (4 modèles)

- `6a16303a` (18,9 − 9,8), `7d57fb3b` (9,8 − 2,9) : différence de deux décimaux → **6-198**
  (aucun point du CM ne soustrait deux décimaux).
- `0a93ac99`, `08bbf1c6` : additionner par regroupements (8,1 + 9,7 + 1,9) → **6-114**.
- Nœuds inchangés (déjà ceux des points). À signaler au chantier `questions-6`.

### 5.4 Aucun point du CP à la 6e (8 modèles) — à trancher

`5d4dfd32`, `fe9df9ba` (586 + 413, 439 + 459 en ligne), `08fbcd26` (982 − 594 en ligne),
`17a3c039` (complément à 10 000), `61baef92`, `09f22a2f` (300 : 5, 810 : 9), `4ee04b22` (« dans
810, combien de fois 9 ? »), `cda36cc2` (retirer les zéros à gauche).

- A. **Dépublier** (repassés en brouillon, niveau CM1 gardé, jamais supprimés), comme les doublons du
  CE1. **Reco.**
- B. Les laisser publiés en CM1 sans tag (état actuel).

### 5.5 Comment

- **Contenu** (`edc5d7d4`, `322f3479`, publiés) : `docs/wip/questions/lot-corrections-cm1.py` →
  migration de contenu générée (instantané md5 d'abord), comme au CE1.
- **Niveaux, tags, nœuds, statut** : migration à la main sur le gabarit du CE1
  (`20261027000100_questions_ce1_rangement_tags.sql`) et son test d'intégration (rouge sans la
  migration, puis vert) ; rollback qui garde l'état laissé par la migration.
- **Question d'accès** : personne ne gagne de lecture. Les 18 modèles déplacés restent publiés :
  ils apparaissent au CM2 ou en 6e au lieu du CM1. En miroir : un prof qui cherche ces modèles au
  CM1 ne les y trouve plus ; avec A, les 8 du § 5.4 disparaissent du catalogue (aucun élève ne s'en
  sert).

### 5.6 Décisions (David, 2026-10-28)

« je suis tes recos » : lot 0 validé tel quel (§ 5.1 à 5.3, 5.5) ; § 5.4 → **A**, les 8 modèles sans
point repassent en brouillon, niveau CM1 gardé, jamais supprimés.

## 6. Lot 0 : écrit (2026-10-28)

- **Relevé** `docs/wip/questions/etat-prod-2026-10-28/` (`releve-prod-cm1.ts`, lecture seule) : 26 modèles,
  md5 = MCP pour les 26, tous [CM1] publiés, 0 tag ; MCP : 0 donnée d'élève (9 tables). Nœuds des points
  d'accueil = ceux des modèles, sauf CM2-065 (« Algèbre > Premiers pas algébriques > égalités à trous »).
- **Contenu** `20261028100000_questions_cm1_contenu.sql` (généré par `lot-corrections-cm1.py`, `grades_apres`) :
  `edc5d7d4` impairs 1 à 15, `322f3479` fractions du point CM2-039 (4/2 expliqué par les demis, les 6
  explications gardées identiques à l'octet) ; tous deux [CM2] + tag CM2-037 / CM2-039. `checkTemplate`
  (`questions-2de/verifier-contenu.ts`) : specs 15/15 et 7/7, tirages 100/100.
- **Rangement** `20261028100100_questions_cm1_rangement_tags.sql` (généré par `lot-rangement-cm1.py`, repris
  de la 2de) : 24 modèles, 16 niveaux changés (12 CM2, 4 en 6e), 3 déplacés (CM2-065), 16 tags posés,
  8 brouillons (catalogue des élèves ; le prof les lit encore) ; rollback gardé. `security-auditor` : aucun bloquant.
- **Tests** `questions-cm1-contenu` et `questions-cm1-rangement-tags` : rouges les migrations vidées (19
  échecs + les 2 suites en `beforeAll`), verts avec (33 verts, 15 sautés = options de scission sans objet).
  `gardeStatut` laissé de côté : le test du helper suppose une origine en brouillon.
- **Livré** (#1893, 2026-10-28) : `security-auditor` sans bloquant (commentaire d'accès corrigé : le prof lit
  encore les brouillons) ; CI verte ; `db:migrate` ; vérification MCP conforme.

## 7. Lot 1 — calcul mental : phase 0 (à valider)

Niveaux relevés le 2026-10-28 parmi les modèles de chaque catégorie (publiés et brouillons) :
Entiers / Additionner / Tables 1-10 (10 = brouillon CE2), A trou 1-14, Somme astucieuse 1-10 ;
Entiers / Soustraire / Différence astucieuse 1-3 ; Entiers / Multiplier / Tables 1-9, Produits
astucieux 1-3 (3 = ×8 du CE2, brouillon) ; Fractions / Apprivoiser / Egalité de fractions 1-4,
Forme décimale 1-12. À relire juste avant `create-questions` (sessions CE2 et CM2 en cours).

| #   | Point   | Sous-notion (nœud du point)          | Modèle                                    | Variations et plages                                                                                                                                                                               | Catégorie, niveau                                 |
| --- | ------- | ------------------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1   | CM1-035 | addition et soustraction > tables    | Tables d'addition                         | a + b, a et b de 2 à 10, tables mêlées                                                                                                                                                             | Entiers / Additionner / Tables, 11                |
| 2   | CM1-161 | addition et soustraction > tables    | Trouver le terme manquant                 | V1 a + ? = s ; V2 ? + a = s (a et le terme de 2 à 10)                                                                                                                                              | Entiers / Additionner / A trou, 15                |
| 3   | CM1-036 | multiplication > tables              | Tables de multiplication                  | a × b, a et b de 2 à 10, tables mêlées                                                                                                                                                             | Entiers / Multiplier / Tables, 10                 |
| 4   | CM1-043 | addition et soustraction > astucieux | Ajouter 8, 9, 18, 19, 28, 29, 38 ou 39    | V1 n + 8 ou 9, n de 12 à 89 ; V2 n + 18 à 39, n de 12 à 59 ; V3 n + l'un des huit, n de 102 à 959 ; chiffre des unités de n de 2 à 9 (toujours une retenue) ; corrigé « + 30 puis − 1 »            | Entiers / Additionner / Somme astucieuse, 11      |
| 5   | CM1-163 | addition et soustraction > astucieux | Soustraire 8, 9, 18, 19, 28, 29, 38 ou 39 | V1 n − 8 ou 9, n de 20 à 97 ; V2 n − 18 à 39, n de 50 à 97 ; V3 n − l'un des huit, n de 100 à 997 ; chiffre des unités de n de 0 à 7 (toujours un emprunt) ; corrigé « − 30 puis + 1 »             | Entiers / Soustraire / Différence astucieuse, 4   |
| 6   | CM1-164 | multiplication > calcul astucieux    | Multiplier par 8                          | 8 × n : V1 n de 26 à 99, V2 n de 101 à 199 ; jamais multiple de 10, ni 25, 125 ; corrigé « le double, puis le double, puis encore le double », une étape par ligne (comme le CE2 corrigé)          | Entiers / Multiplier / Produits astucieux, 4      |
| 7   | CM1-046 | multiplication > calcul astucieux    | Multiplier par 5                          | 5 × n : V1 n pair de 12 à 98, V2 n impair de 11 à 99, V3 n de 101 à 199 ; jamais multiple de 10 ni de 25 (exclusion du livret : 5 × 20, 5 × 100, 5 × 25) ; corrigé « × 10 puis la moitié »         | Entiers / Multiplier / Produits astucieux, 5      |
| 8   | CM1-037 | fractions > égalité de fractions     | Relations entre fractions usuelles        | case = un entier, toujours : V1 égalités 1/2 = ?/4, 1 = ?/2, 1 = ?/4, 1 = ?/10, 1 = ?/100, 1/10 = ?/100 ; V2 calculs 1/2 + 1/2 = ?, 1/4 + 1/4 = ?/2, 1 − 1/4 = ?/4, 1 − 1/2 = ?/2, 1/2 + 1/4 = ?/4 | Fractions / Apprivoiser / Egalité de fractions, 5 |
| 9   | CM1-038 | fractions > forme décimale           | 1/10 et 1/100 en écriture décimale        | V1 1/10 = ? et 1/100 = ? (réponse décimale) ; V2 0,1 = 1/? et 0,01 = 1/? (case = le dénominateur)                                                                                                  | Fractions / Apprivoiser / Forme décimale, 14      |

Une case par question, aucun QCM. Tables : modèles CM1 propres (décision du 2026-10-27), plages 2
à 10 comme au CE2 (0 et 1 sont dans le point mais n'apprennent rien). Erreurs typiques en specs :

- 10 sans compenser (57 + 29 → 87), compensation à l'envers (→ 85), table voisine (7 × 8 → 54),
  somme au lieu du produit, 1/10 → 0,10 juste, 1/100 → 0,1 faux. Question d'accès (brouillons, puis
  nœud + tag par migration) : **personne** ne gagne d'accès, aucune règle ne change.

### 7 bis. Lot 1 : décisions (David, 2026-10-28)

« je suis tes recos » : phase 0 du § 7 validée telle quelle, avec les trois recommandations —
tables de 2 à 10 ; × 8 jusqu'à n = 199 (variation à 3 chiffres) ; fractions (037) : la case est
toujours un entier (« 1/4 + 1/4 = ?/2 »), jamais de simplification à faire.

### 7 ter. Lot 1 — écriture (2026-10-28)

- Script `docs/wip/questions/lot-cm1-1.py` → `scripts/questions/cm1-1/` (9 JSON). Délai 20 s pour
  les tables et les fractions, 30 s pour les quatre procédures (nombres à 3 chiffres).
- Simulation `create-questions` (prod, lecture) : 9/9 verts, 92 specs. `question:specs` : specs
  vertes, 6 000 tirages réussis, corrigés relus (corrigé du × 5 : moitié remise en formule).
- Niveau du 038 passé de 13 à 14 : le 13 a été pris en prod entre-temps (6e, `5077e030`).
- Base locale : 9 brouillons ; « Relations entre fractions » joué dans l'aperçu admin (case au
  numérateur, réponse fausse → correction 1/2 = 2/4).

### 7 quater. Lot 1 — brouillons en prod (2026-10-28)

`create-questions --publier` lancé par moi à la demande de David (« Lance le toi même »), vérifié au
MCP : 9 brouillons [CM1], sans nœud ni tag, niveaux attendus. Ids : `8fee3492` (tables +),
`f24bb468` (terme manquant), `50a9d91c` (tables ×), `01729e6e` (+ 8…39), `b6b1cae5` (− 8…39),
`9db49362` (× 8), `57cc0fca` (× 5), `2d58ce54` (relations), `f91a2d8e` (1/10, 1/100).

### 7 quinquies. Lot 1 — rangement et tags (2026-10-28)

Relevé MCP du 2026-10-28 : les 9 ids du § 7 quater sont des brouillons [CM1], sans nœud ni tag ;
leurs points vivent sur 6 sous-notions (Entiers : addition et soustraction > tables / calcul
astucieux ; Entiers : multiplication > tables / calcul astucieux ; Fractions : sens et écritures >
égalité de fractions / forme décimale). Migration `20261028180000_questions_cm1_lot1_rangement_tags`
(gabarit du lot C du CP) : nœud du point + un tag par modèle, `updated_at` préservé, garde « sans
nœud ni tag », TOUT ou RIEN. Horodatage 18:00 et non « max prod + 1 min » (14:02) : les PR CM2
(16:00) et CE1 (17:00) ne sont pas encore jouées. Test
`tests/integration/questions-cm1-lot1-rangement-tags.test.ts` : rouge contre une migration vide
(3 échecs + suite principale arrêtée au rollback absent), puis 9/9 vert.

`security-auditor` (2026-10-28) : aucun finding bloquant (identité avec le gabarit, ids et chemins
remesurés en prod, gardes, trigger, rollback symétrique, horodatage libre). PR #1913.

Mergé (#1913), `db:migrate` joué le 2026-10-28 (seule migration en attente : CM2 16:00 et CE1 17:00
déjà jouées). MCP : les 9 modèles sur leur sous-notion, un tag chacun, toujours brouillons,
`updated_at` inchangé (07:03, création). Page à cocher :
https://claude.ai/artifact/EXp2MvBstG6CaJP1UTnFKn.

## 8. Lot 2 — numération des entiers : phase 0 (validée)

Relevé MCP du 2026-10-29 : les 9 points (003, 004, 005, 007, 009, 141, 142, 012, 013) n'ont aucun
modèle. Bornes `cycle3.json`, CM1 : entiers jusqu'à 999 999, six rangs, ranger jusqu'à cinq
nombres, diviseur candidat ≤ 10. Jumeau du lot 1 du CM2 (relu et corrigé par David). Bloc

````ranger en prod (v0.56.0). Niveaux : le CE2 a pris entre-temps Décomposition 18-20, Ecriture
17-18, Comparer 10-11, Encadrer 11-12 → on prend la suite.

| #   | Point   | Sous-notion            | Modèle                                    | Variations, plages                                                                                                         | Catégorie, niveau                             |
| --- | ------- | ---------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 1   | CM1-003 | décomposition          | Unités de numération                      | V1 « 3 centaines de mille, c'est ? milliers » ; V2 l'inverse ; V3 non canonique (35 centaines = 3 milliers et 5 centaines) | Entiers / Apprivoiser / Décomposition, 21     |
| 2   | CM1-003 | décomposition          | Le nombre de centaines, de milliers…      | V1 nombre de centaines dans 342 320 ; V2 342 320 filtres en cartons de 1 000                                               | Décomposition, 22                             |
| 3   | CM1-005 | décomposition          | La valeur d'un chiffre                    | V1 chiffre d'un rang ; V2 « le chiffre 7 représente combien d'unités ? » ; V3 case « choix » : le rang ; 5 à 6 chiffres     | Décomposition, 23                             |
| 4   | CM1-004 | écritures              | Le nombre qui suit, le nombre qui précède | sans passage ; avec passage (suit, précède) ; 9 999 / 99 999 ↔ 10 000 / 100 000                                            | Ecriture, 19                                  |
| 5   | CM1-007 | ordre                  | Supérieur à, inférieur à, compris entre   | les 4 variations du CE2, 5 à 6 chiffres, toute réponse juste acceptée                                                      | Comparer, 12                                  |
| 6   | CM1-009 | ordre                  | Ranger cinq nombres                       | ```ranger, croissant / décroissant ; quatre nombres de 6 chiffres + un de 5 commençant par 9                               | Comparer, 13                                  |
| 7   | CM1-141 | ordre                  | Encadrer un nombre                        | deux cases, à la dizaine, centaine, millier ou dizaine de mille près                                                        | Encadrer, 13                                  |
| 8   | CM1-142 | ordre                  | Intercaler un nombre                      | écart large ; écart de 2 ; au passage (45 999 < ? < 46 001)                                                                 | Encadrer, 14                                  |
| 9   | CM1-012 | multiples et diviseurs | Est-ce un multiple ?                      | V1 Oui / Non (« 141 est-il un multiple de 7 ? ») ; V2 le multiple parmi quatre ; 3, 4, 6, 7, 8, 9 ; n ≤ 999                 | Entiers / Diviser / Multiples et diviseurs, 2 |
| 10  | CM1-013 | multiples et diviseurs | Est-ce un diviseur ?                      | V1 Oui / Non (« 7 est-il un diviseur de 141 ? ») ; V2 le diviseur parmi quatre                                             | Multiples et diviseurs, 3                     |

**Question d'accès** : brouillons, puis migration nœud + tag → **personne** ne gagne d'accès.

### 8 bis. Lot 2 : décisions (David, 2026-10-29)

« tes recos ? » puis « go » : le tableau tel quel, CM1-003 en deux modèles ; 012 et 013 avec une
V2 « un parmi quatre » (au hasard, une chance sur quatre au lieu de deux).

### 8 ter. Lot 2 — écriture (2026-10-29)

- Script `docs/wip/questions/lot-cm1-2.py` → `scripts/questions/cm1-2/` (10 JSON).
- **Écart à la phase 0** : V2 de « Est-ce un diviseur ? » : les trois autres choix sont d − 1,
  d + 1, d + 2 (d de 3 à 8, candidats de 2 à 10) ; tirés au hasard parmi 3, 4, 6, 7, 8, 9, ils
  faisaient échouer 10 % des tirages.
- `create-questions` en simulation (prod) : 10/10 verts, 79 specs ; `question:specs` 300 tirages
  par variation : 7 800/7 800 réussis, aperçus relus.
- Base locale : 10 brouillons créés.

````

- Aperçu admin local (port 5176) : « Est-ce un diviseur ? » (mauvais choix marqué, bon choix montré) et « Ranger cinq nombres » (étiquettes avec espaces, une ligne à 606 px). #1964 mergée (CI verte après relance du plantage `wrapDynamicImport`).

### 8 quater. Lot 2 — brouillons en prod, rangement et tags (2026-10-29)

`create-questions --publier` lancé par David ; MCP : 10 brouillons [CM1], sans nœud ni tag, niveaux
attendus. Ids : `4292d153` (unités de numération), `b4ea91fe` (nombre de centaines), `573a49b3`
(valeur d'un chiffre), `1cb66993` (suit / précède), `5291643e` (supérieur, inférieur, compris),
`d7df43c4` (ranger), `178730c2` (encadrer), `08ec7b9f` (intercaler), `5dbcc8dd` (multiple),
`6dbea912` (diviseur).

Migration `20261029235500_questions_cm1_lot2_rangement_tags` (gabarit du lot 1) et test
`tests/integration/questions-cm1-lot2-rangement-tags.test.ts` : rouge contre une migration vide (3
échecs + suite principale arrêtée), puis 9/9 vert. `security-auditor` : aucun finding bloquant (ids,
chemins et points remesurés en prod) ; non bloquant : `20261029233000_questions_3_lot2` sur `main`,
pas encore jouée en prod → ne pas lancer `db:migrate` tant qu'elle attend. PR #1976.

#1976 mergée (CI verte après merge de `main` : collision d'horodatage `20261029213000` réglée par
#1972, et `Doc-inchangée:` ajoutée dans un commit). Migration jouée le 2026-10-29 par David, avec
celle du CE2 (`20261029234500`), depuis le dépôt principal. MCP : les 10 modèles sur leur
sous-notion, un point chacun (CM1-003 ×2, 004, 005, 007, 009, 012, 013, 141, 142), toujours
brouillons, `updated_at` inchangé (09:37, création). Page à cocher :
https://claude.ai/artifact/GZT4LQD6HnDkvrmamhWQ1o (alerte attendue : ```ranger non dessiné).

### 8 quinquies. Lot 2 — publication (2026-10-29)

Page à cocher : 10/10 OK, sans commentaire. `publier-lot.ts --dir scripts/questions/cm1-2` en
simulation (10 brouillons passent le contrôle), puis `--publier` lancé par David : 10/10 publiés.
MCP : les 10 `published`. Worktree `../ubumaths-wt-questions-cm1` retiré.

## 9. Lot 3 — fractions : phase 0 (à valider)

Relevé MCP du 2026-10-30. Les points de fractions du CM1 sans modèle sont trop nombreux pour un seul
lot (≤ 10 modèles). Je propose donc trois lots :

- **3a, fractions** (ci-dessous, 10 modèles) : 014, 015, 016, 017, 148, 022, plus les droites
  graduées 019, 147, 018, 146. La droite à placer (`placer:`) est en prod depuis v0.56.0.
- **3b, fractions décimales** (8) : 023, 027, 028, 029, 152, 153, droites 151 et 025.
- **3c, partages** (4) : 145, 150 (quelle part est coloriée ?) et 144, 149 (colorier). Le bloc
  ```partage est mergé (#1958, #1974, #1988) mais **pas en prod** : brouillons jusqu'au `deploy:prod`.
- 024 (unités, dixièmes, centièmes) et 156 sont rangés sous les décimaux : lot 4.

Bornes `cycle3.json`, CM1 : dénominateurs ≤ 20, fractions éventuellement > 1 ; fraction d'une
quantité **unitaire seulement** (résultat éventuellement décimal) ; soustraction de même
dénominateur, ou l'un multiple connu de l'autre. Aucun modèle de ces points nulle part (6-fractions
couvre les points voisins de 6e, sans tag CM1).

| #   | Point   | Sous-notion              | Modèle                                  | Variations, plages                                                                                                                                                                                | Catégorie, niveau                                   |
| --- | ------- | ------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| 1   | CM1-014 | définition               | Lire et écrire une fraction             | V1 « cinq tiers » → case 5/3 ; V2 5/3 → case « choix » parmi quatre écritures en lettres (cinq tiers, trois cinquièmes, cinq troisièmes, trois tiers) ; dénominateur 2 à 20, numérateur 1 à 3 × d | Fractions / Apprivoiser / Ecriture, 6               |
| 2   | CM1-015 | décomposition            | Fraction > 1 en entier + fraction       | 7/4 = ? + ?/4 (deux cases, la fraction < 1) ; d 2 à 10 puis 12, 15, 20 ; entier 1 à 5 ; jamais un entier exact                                                                                    | Fractions / Apprivoiser / Décomposition, 4          |
| 3   | CM1-016 | décomposition            | Entier + fraction en une seule fraction | 2 + 2/3 = ?/3 (case = le numérateur) ; mêmes plages                                                                                                                                               | Décomposition, 5                                    |
| 4   | CM1-017 | ordre                    | Encadrer une fraction par deux entiers  | ? < 21/8 < ? (deux cases, entiers consécutifs) ; d 2 à 10, entier 0 à 9                                                                                                                           | Fractions / Apprivoiser / Encadrer, 2               |
| 5   | CM1-148 | addition et soustraction | Soustraire des fractions                | V1 même dénominateur (8/10 − 5/10) ; V2 l'un multiple de l'autre (5/6 − 1/12, 11/4 − 7/20) ; résultat ≥ 0 ; toute fraction égale acceptée                                                         | Fractions / Calculer / Addition et Soustraction, 18 |
| 6   | CM1-022 | fraction d'une quantité  | Fraction d'une quantité                 | V1 « un tiers de 12 billes » (résultat entier) ; V2 « un quart de 10 m » (résultat décimal : 2,5) ; fractions unitaires 1/2 à 1/10, quantités et grandeurs (billes, m, kg, €)                     | Fractions / Calculer / Fraction d'une quantité, 6   |
| 7   | CM1-019 | droite graduée           | Repérer un point par une fraction       | ```line de 0 à 3, pas 1/d (d ∈ 2, 3, 4, 5, 6, 8, 10), entiers seuls étiquetés, point A ; case fraction, toute écriture égale acceptée                                                             | Fractions / Apprivoiser / **Repérage** (neuve), 1   |
| 8   | CM1-147 | droite graduée           | Repérer un point par entier + fraction  | même droite, A au-delà de 1 ; « A repère ? + ?/4 » (deux cases, fraction < 1)                                                                                                                     | Repérage, 2                                         |
| 9   | CM1-018 | droite graduée           | Placer une fraction                     | ```line à placer (`placer: A=3/4`), de 0 à 2 ou 3, pas 1/d                                                                                                                                        | Repérage, 3                                         |
| 10  | CM1-146 | droite graduée           | Placer entier + fraction                | `placer:` « place 2 + 1/4 » ; même droite, de 0 à 4                                                                                                                                               | Repérage, 4                                         |

Questions :

1. **CM1-147** : deux cases « ? + ?/d » (la forme du point), ou une case où 2 + 1/4, 9/4 et 3 − 3/4
   sont tous acceptés (les bornes disent qu'une même abscisse s'écrit de plusieurs façons) ? Reco :
   les deux cases, sinon 147 double 019.
2. **Sous-notion « Repérage »** dans la catégorie Fractions (comme Entiers / Apprivoiser /
   Repérage) : d'accord ?
3. **Découpage 3a / 3b / 3c** et ordre : 3c (partages) écrit tout de suite en brouillons, ou après le
   `deploy:prod` du bloc ```partage ? Reco : après 3b, sans attendre le déploiement.

**Question d'accès** : brouillons, puis migration nœud + tag → **personne** ne gagne d'accès.

### 9 bis. Lot 3 : réponse de David (2026-10-30)

« je te suis », en réponse aux trois questions du § 9 et à leurs recommandations : CM1-147 en deux
cases ; sous-notion « Repérage » dans la catégorie Fractions ; découpage 3a / 3b / 3c, 3c écrit
juste après 3b en brouillons, sans attendre le `deploy:prod` du bloc ```partage.

### 9 ter. Lot 3a — écriture (2026-10-30)

- Script `docs/wip/questions/lot-cm1-3a.py` → `scripts/questions/cm1-3a/` (10 JSON),
  `reducedFractions: off` partout.
- **Écarts à la phase 0** : droites graduées à au plus 12 intervalles (`u = min(4, floor(12/d))`),
  pour viser au doigt sur un téléphone ; « Lire une fraction » : le leurre « n + 1 parts » écarté
  quand il vaut 1 (« huit huitièmes »).
- **Piège** : la variable `e` des droites (le nombre d'unités) était lue comme le nombre d'Euler
  (`nm = 2e − 1`) : 30 % des droites à placer hors de la droite. Renommée `u`.
- `create-questions` en simulation (prod) : 10/10 verts, 54 specs ; `question:specs` 300 tirages
  par variation : tout réussi.
- Base locale : 10 brouillons. Aperçu admin (port 5177) : fraction d'une quantité (3,8 L juste,
  virgule dans la case et dans la correction), repérer par entier + fraction (droite et cases
  « ? + ?/5 »), placer 6/5 (point posé sur 4/5 : faux, droite juste en vert).
- **À signaler à David** : la droite à placer écrit la phrase de correction en décimal quand le
  dénominateur le permet (« Tu as placé le point sur 0,8. » pour une question en cinquièmes ;
  `placerText`, `src/lib/ubumark/utils/number-line-placer.ts`). Hors de ce lot (contenu seul).

### 9 quater. Lot 3a — brouillons en prod, rangement et tags (2026-10-30)

`create-questions --publier` lancé par David ; MCP : 10 brouillons [CM1], sans nœud ni tag. Ids :
`a2b41659` (014), `5c5bf99a` (015), `f1a880e9` (016), `b2b5320f` (017), `884908d3` (148),
`ef1ed0ce` (022), `c2fa5767` (019), `6d94994a` (147), `0e3f82a1` (018), `00910e5b` (146).

Migration et test générés du gabarit du lot 2 : rouge sans la migration (5 échecs), 9/9 vert avec ;
`security-auditor` sans finding bloquant. #2007 mergée (après `Doc-inchangée:` dans un commit).
Datée `20261030140000`, elle tombait avant `150000` (CM2, déjà jouée) et entrait en collision avec
une migration de questions-1spe : renommée `20261030150100` (#2017). Le `db:migrate` m'a été
refusé par le mode auto ; David l'a lancé, avec 150030 (1spe), 160000 (questions-4) et 160100
(questions-2de), après accord des trois sessions. MCP : les 10 modèles sur la sous-notion de leur
point, un point chacun, toujours brouillons, `updated_at` inchangé (création, 06:03).

### 9 quinquies. Lot 3a — page à cocher et publication (2026-10-30)

- Page : https://claude.ai/artifact/FXw6NKvvTFs5ACRuaesB6P ; 10 verdicts « OK », sans commentaire
  (comptés dans `verdicts`). Simulation `publier-lot` : 10 brouillons passent ; `--publier` lancé par
  David ; 10 `published` relus au MCP. Worktree retiré puis recréé pour le § 9 sexies.

### 9 sexies. Phrase de la droite à placer (2026-10-30)

- Décidé par David : corriger avant le 3b (fractions décimales : « 0,7 » pour 7/10 aurait touché tout
  le lot). `placerText` : pas écrit en fraction (`step: 1/5`) → graduation en fraction du pas
  (`4/5`, `5/10`, `2/4`, entier `1`) ; départ hors des multiples du pas → écriture ordinaire.
  `placerAnswer` (le juge) inchangé. Test de rendu rouge sans le correctif, vert avec.

## 10. Lot 3b — fractions décimales : phase 0 (à valider)

Relevé MCP du 2026-10-30 : les 8 points ont 0 modèle ; tous rangés sous **Fractions : sens et
écritures** (sous-notions ci-dessous). Rien d'approchant ailleurs : `83450f91` (CM1-026, 345/100 =
3 + 45/100) et `160f782d` (CM1-154, 5,34 = 5 + 3/10 + 4/100) sont des points voisins, pas ceux-ci.
Bornes `cycle3.json`, CM1 : dénominateurs **10 ou 100** partout ; 027 : numérateurs de la somme
< 10 (4 + 1/10 + 7/100) ; 029 : jusqu'à quatre nombres, éventuellement un entier ; 152 : entre deux
entiers consécutifs ; 153 : réponse en centièmes (14/10 < … < 15/10).

Outils : tous en prod (case, `choix, `ranger v0.55.0, ```line avec `placer:`, phrase « 4/5 »
de #2032 pas encore en prod — sans effet sur l'énoncé, seulement la phrase de correction).

| #   | Point   | Sous-notion    | Modèle                                     | Variations, plages                                                                                                                                                                                                         | Catégorie, niveau                          |
| --- | ------- | -------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| 1   | CM1-023 | définition     | Lire et écrire une fraction décimale       | V1 « vingt-trois centièmes » → case 23/100 ; V2 23/100 → ```choix (vingt-trois centièmes ; vingt-trois dixièmes ; vingt-trois centaines ; cent vingt-troisièmes) ; d 10 (n 1 à 99) ou 100 (n 1 à 999), n non multiple de d | Fractions / Apprivoiser / Ecriture, 7      |
| 2   | CM1-027 | décomposition  | Décomposer une fraction décimale > 1       | V1 47/10 = ? + ?/10 ; V2 347/100 = ? + ?/10 + ?/100 ; entier 1 à 9, chiffres des dixièmes et centièmes 1 à 9 (jamais 0)                                                                                                    | Fractions / Apprivoiser / Décomposition, 6 |
| 3   | CM1-028 | ordre          | Comparer deux fractions décimales          | « 7/10 … 65/100 » → ```choix < = > (`melanger: non`) ; V1 < 1, V2 > 1 (67/10 … 607/100) ; un tirage sur cinq environ donne l'égalité (7/10 et 70/100)                                                                      | Fractions / Apprivoiser / Comparer, 14     |
| 4   | CM1-029 | ordre          | Ranger des fractions décimales             | ```ranger de 4 étiquettes : un entier, des dixièmes et des centièmes (2 ; 14/10 ; 120/100 ; 9/10), valeurs deux à deux différentes, entre 0 et 5 ; V1 croissant, V2 décroissant                                            | Fractions / Apprivoiser / Ordonner, 3      |
| 5   | CM1-152 | ordre          | Encadrer une fraction décimale             | ? < 237/100 < ? (deux cases, entiers consécutifs) ; V1 dixièmes (n 1 à 99), V2 centièmes (n 1 à 999), n non multiple de d                                                                                                  | Fractions / Apprivoiser / Encadrer, 3      |
| 6   | CM1-153 | ordre          | Intercaler une fraction décimale           | 14/10 < ? < 15/10 (une case) ; règle `range` stricte (comme `2e982062`, 6e) ; bornes : deux dixièmes consécutifs de 0 à 5 ; corrigé en centièmes (145/100)                                                                 | Fractions / Apprivoiser / Encadrer, 4      |
| 7   | CM1-151 | droite graduée | Repérer un point par une fraction décimale | V1 ```line de 0 à 1 en dixièmes (0 et 1 étiquetés), point A → 7/10 ; V2 morceau de droite zoomé de 23/10 à 24/10 en centièmes (étiquettes 23/10 et 24/10), A → 237/100                                                     | Fractions / Apprivoiser / Repérage, 5      |
| 8   | CM1-025 | droite graduée | Placer une fraction décimale               | `placer:` sur les mêmes droites : V1 0 à 1 (ou n à n + 1) en dixièmes ; V2 morceau zoomé en centièmes                                                                                                                      | Fractions / Apprivoiser / Repérage, 6      |

Droites : 10 intervalles au plus (vise au doigt sur téléphone, règle du lot 3a) ; donc jamais de 0
à 1 en centièmes, d'où le morceau de droite zoomé. `reducedFractions: off` partout (toute fraction
égale juste, comme au lot 3a).

Questions :

1. **Écriture à virgule** dans les cases « fraction décimale » (023 V1, 151, 153) : refusée
   (`requiredForm: 'fraction'`, « Écris-le sous la forme d'une fraction ») ou acceptée ? Reco :
   refusée, c'est le point travaillé ; 0,23 viendra au lot 4 (décimaux).
2. **153** : toute fraction strictement entre les bornes est juste (7/20 aussi, qui n'est pas
   décimale) ? Reco : oui, la règle `range` existante ; exiger un dénominateur 10/100/1000 demande
   une règle neuve.
3. **Droite zoomée** de 23/10 à 24/10 pour les centièmes (151 V2, 025 V2) : d'accord ?

**Question d'accès** : brouillons, puis migration nœud + tag → **personne** ne gagne d'accès.

### 10 bis. Lot 3b : réponse de David (2026-10-30)

« je te suis », en réponse aux trois questions du § 10 et à leurs recommandations : écriture à
virgule refusée dans les cases « fraction décimale » (`requiredForm: 'fraction'`) ; intercaler :
toute fraction strictement entre les bornes est juste (règle `range`) ; droite agrandie de 23/10 à
24/10 pour les centièmes.

### 10 ter. Lot 3b — écriture (2026-10-30)

- Script `docs/wip/questions/lot-cm1-3b.py` → `scripts/questions/cm1-3b/` (8 JSON).
- Nombres en lettres en orthographe rectifiée (règle du lot CE2 2) : « deux-cent-trente-sept
  centièmes », « soixante-et-onze dixièmes » ; numérateurs pris dans une liste.
- **Écarts à la phase 0** : ranger, toujours dans l'ordre a/10 < k < b/100 < c/10 < k + 1 (le
  centième au grand numérateur est plus petit qu'un dixième, comme 120/100 et 14/10) ; spec
  « 14,5/10 » retirée (accepté par la règle `range`, cas exotique).
- `question:specs` 300 tirages par variation : tout réussi ; `create-questions` en simulation
  (prod) : 8/8 verts, 54 specs. Base locale : 8 brouillons.
- **Défaut trouvé à l'aperçu** : sur la droite en centièmes, les étiquettes en fraction (1/10,
  2/10) sont coupées en bas (math-field de 42 px dans une zone de 30 px,
  `NumberLine.svelte`). Le lot 3a n'avait que des entiers. Corrigé par #2040 (zone portée à
  45 px, test de rendu rouge puis vert), mergée ; revérifié à l'aperçu : 1/10 et 2/10 entiers,
  placer 15/100 sur 11/100 → « Tu as placé le point sur 11/100. », droite juste en vert.

### 10 quater. Lot 3b — brouillons en prod (2026-10-31)

`create-questions --publier` lancé par David (premier essai mort : son shell était dans le worktree
retiré, relancé avec `cd` devant). MCP : 8 brouillons [CM1], sans nœud ni tag, créés à 08:57 UTC.
Ids : `36507fc9-df87-46a4-865d-aec7935580c3` (lire et écrire), `6faa64d0-6b77-41f6-930d-f12549e69e2c`
(décomposer), `53031438-c180-484b-834c-a29913b25a0f` (comparer), `85e4d251-8685-461e-9dff-255580999725`
(ranger), `34c58018-b588-4c93-85fb-40eb94879cfb` (encadrer), `7ed61c5f-dd82-4a78-8251-621e01138ebb`
(intercaler), `6de4ad5b-49a4-44a5-9b3f-062797fbefab` (repérer), `5b038fc8-226f-4307-8609-27d87e5f7608`
(placer).

### 10 quinquies. Lot 3b — rangement et tags (2026-10-31)

- Relevé MCP du 2026-10-31 : les 8 brouillons toujours sans nœud ni tag ; les 8 points sous
  « Nombres et calculs > Fractions : sens et écritures » (sous-notions du § 10).
- Migration `20261030201100_questions_cm1_lot3b_rangement_tags` et son test générés du gabarit du
  lot 3a (script en scratchpad, remplacements vérifiés) ; horodatage = max des worktrees et
  branches distantes (`20261030201000`, 1spe) + 1 min.
- Test d'intégration : rouge sans le corps de la migration (5 échecs), 9/9 vert avec.
- `security-auditor` : aucun finding (diff au gabarit 3a : seuls ids, codes, comptes et commentaires changent).
- #2045 mergée (CI relancée une fois : tests navigateur en échec sur `wrapDynamicImport`, sans lien avec la migration). Prod au 2026-10-31 : aucune autre migration de `main` en attente.
