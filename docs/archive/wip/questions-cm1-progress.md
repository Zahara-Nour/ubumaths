# Chantier « questions-cm1 » — couvrir les points du CM1 en modèles de questions

> Démarche : [couvrir-un-niveau.md](../../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Chantier de référence : le CP ([questions-progress.md](../../wip/questions-progress.md)).

## Reprendre ici

_Mis à jour le 2026-11-19 : **chantier clos** (§ 26 octies, nonies)._

- **État** : chantier terminé, **168 points du CM1 sur 171** (recompte MCP du 2026-11-19) ; 105, 114, 140 sans
  modèle (D, décidé) ; 105 noté aux outils manquants (n° 45). Aucune PR ouverte, aucun brouillon en attente
  hors les 8 du lot 0 (§ 5.6, voulus).
- **Prochaine action** : clôture, si David dit go : versement du durable dans `docs/systeme/`, archive du
  journal, ménage des branches `*questions-cm1*` (locales et distantes, toutes mergées).
- **En attente de David** : go de clôture ; facultatif, 08 (`1dd68bdd`, CM1-130) sur « quatrième
  proportionnelle » plutôt que sur la notion Situations de proportionnalité ?
- **Pièges en cours** : `--mettre-a-jour` ne touche JAMAIS un publié ; David lance `publier-lot --publier`.
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

### 10 sexies. Lot 3b — rangement vérifié, page à cocher (2026-10-31)

- `db:migrate` lancé par David. MCP : les 8 modèles sur la sous-notion de leur point, un point CM1
  chacun, toujours brouillons, `updated_at` inchangé (création, 08:57).
- Page : https://claude.ai/artifact/TuwevKXLAmaT9Qs837E7Xe (alertes attendues : `ranger et `line
  non dessinés, à jouer dans l’aperçu) ; `verdicts` vide à la publication.

### 10 septies. Lot 3b — publication (2026-11-01)

- Page à cocher : 8 verdicts « OK », sans commentaire (comptés dans `verdicts`). Simulation
  `publier-lot` : 8 brouillons passent ; `--publier` lancé par David ; 8 `published` relus au MCP.

## 11. Lot 3c — partages : phase 0 (à valider)

Relevé MCP du 2026-11-01 : les 4 points ont 0 modèle ; tous sous « Nombres et calculs > Fractions :
sens et écritures > définition ». Aucun modèle de la prod n'utilise ```partage (bloc pas encore en
prod) ; la session CE1 prévoit le sien (lot 8, CE1-095 et 097). Bornes `cycle3.json` : 144, 145
dénominateur ≤ 20 ; 149, 150 dixièmes ou centièmes.

Outil : ```partage (`gris:` pour lire, `colorier:` pour représenter, `unites:` pour les fractions
plus grandes que 1), variables permises dans `forme:` et `colorier:`. Juge de `colorier:` : le
NOMBRE de parts coloriées, quelles qu'elles soient (décidé au chantier fractions-a-colorier). Bande
et disque : 2 à 12 parts ; grille : au plus 20 parts ici (2×5, 3×4, 4×5…), 10×10 pour les centièmes.

| #   | Point   | Modèle                                               | Variations, plages                                                                                                                                                                                                                         | Catégorie, niveau                                |
| --- | ------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| 1   | CM1-145 | Quelle fraction de la figure est coloriée ?          | case fraction ; V1 bande ou disque de d parts (2 à 12), g coloriées (1 à d − 1) ; V2 grille (6 à 20 parts) ; V3 > 1 : 2 ou 3 bandes de d parts, « chaque bande est une unité », g > d non multiple de d (7/4) ; toute fraction égale juste | Fractions / Apprivoiser / **Partage** (neuve), 1 |
| 2   | CM1-144 | Colorier une fraction                                | ```partage `colorier:` ; V1 figure de d parts, n/d (n < d) ; V2 figure de k × d parts (3/4 sur une bande de 8, 2/5 sur une grille 2×5) ; V3 > 1 : `unites:` = juste ce qu'il faut (7/4 sur 2 bandes de 4)                                  | Partage, 2                                       |
| 3   | CM1-150 | Quelle fraction décimale de la figure est coloriée ? | case fraction, `requiredForm: 'fraction'` (virgule refusée, comme au 3b) ; V1 bande ou disque de 10, g/10 ; V2 grille 10×10, g/100 (g 1 à 99)                                                                                              | Partage, 3                                       |
| 4   | CM1-149 | Colorier une fraction décimale                       | `colorier:` ; V1 bande de 10, n/10 ; V2 grille 10×10, n/100 (n 1 à 99, glisser pour colorier) ; V3 grille 10×10, n/10 (3/10 = 30 cases : dixièmes et centièmes)                                                                            | Partage, 4                                       |

`reducedFractions: off` partout (4/8 ou 1/2 sur une bande de 8 à moitié coloriée : juste).

Questions :

1. **Sous-domaine neuf « Partage »** (Fractions / Apprivoiser, niveaux 1 à 4) : d'accord ? Reco :
   oui, et le signaler à la session CE1 pour son lot 8.
2. **Parts coloriées à lire (145, 150)** : d'affilée (`gris: g`, les g premières) ou éparpillées
   (rangs tirés au hasard) ? Reco : d'affilée ; éparpillées dans une variation de plus seulement si
   le tirage de rangs distincts se fait sans outil neuf (vérifié à l'écriture, signalé sinon).
3. **145 V3 (> 1)** : « 1 + 3/4 » accepté à côté de 7/4, ou refusé (`requiredForm: 'fraction'`,
   « Écris-le sous la forme d'une fraction ») ? Reco : refusé ; entier + fraction est le point 147.

**Question d'accès** : brouillons, puis migration nœud + tag → **personne** ne gagne d'accès.

### 11 bis. Lot 3c : réponse de David (2026-11-01)

« je te suis », en réponse aux trois questions du § 11 et à leurs recommandations : sous-domaine
neuf « Partage » ; parts d'affilée, éparpillées dans une variation de plus si le tirage se fait
sans outil neuf ; « 1 + 3/4 » refusé (`requiredForm: 'fraction'`).

### 11 ter. Lot 3c — écriture (2026-11-01)

- Script `docs/wip/questions/lot-cm1-3c.py` → `scripts/questions/cm1-3c/` (4 JSON),
  `reducedFractions: off` partout.
- **Éparpillées faites sans outil neuf** (145 V4) : rangs (s + i × p) mod N + 1, p premier avec N
  (condition `gcd(p,N)==1`), sur des bandes et grilles de 5 à 12 parts.
- **Écarts à la phase 0** : `requiredForm: 'fraction'` sur toutes les cases du 145, pas seulement
  la V3 (0,5 refusé comme au 3b) ; énoncés « Colorie 3/8 de la figure » (et non « les 3/8 », faux
  pour 1/100) ; 150 V2 sans multiple de 10 (ligne entière : déjà la V1 en dixièmes).
- `question:specs` 300 tirages par variation : tout réussi (33 specs) ; « rien colorié » rend
  `empty`, pas `incorrect`. `create-questions` en simulation (prod) : 4/4 verts.
- Base locale : 4 brouillons. Aperçu admin (port 5178, largeur téléphone) : 145 éparpillées sur une
  grille 3×4 (11/12) ; 144 « 6/5 » colorié en glissant sur deux bandes → juste ; 149 « 26/100 »,
  une ligne coloriée → « Tu as colorié 10 parts sur 100 ; il fallait en colorier 26 (26/100). »,
  figure juste dessinée.
- **CI rouge, corrigée** : le test `answer-complexity-corpus` mesure aussi les réponses des specs de
  coloriage (« 1, 2, …, 73 » : 281 caractères, marge ×3 sur 400 dépassée), alors que la garde Q58 ne
  s'applique pas aux figures à colorier. Specs de grille ramenées à 23 et 32 cases (≤ 34 rangs).

### 11 quater. Lot 3c — brouillons en prod, rangement et tags (2026-11-01)

- `--publier` lancé par David : 4 brouillons créés — `092b310c` (CM1-145), `14a2d26f` (CM1-144),
  `60ce79bb` (CM1-150), `fe91cbd9` (CM1-149). Relevé MCP : `draft`, [CM1], sans nœud ni point ;
  les 4 points sur le nœud de CM1-023 (« définition »), sans aucun modèle.
- Migration (d'abord `20261101141600_…`) et son test générés du gabarit du lot 3b (script en
  scratchpad, remplacements comptés) ; horodatage = max (`20261101141500`, cm2 lot 4) + 1 min.
- Test d'intégration : rouge sans le corps de la migration (5 échecs), 9/9 vert avec.
- `security-auditor` : aucun finding bloquant (diff au gabarit 3b : seuls ids, codes, sous-notions, comptes
  et commentaires changent) ; l'en-tête du test qui disait « 8 modèles » est corrigé.
- #2082, CI 1 : garde de doc rouge (`Doc-inchangée:` mise dans la PR au lieu d'un commit, corrigé) ;
  tests navigateur en échec sur `wrapDynamicImport` (comme au 3b, sans lien), relancés.
- #2082 mergée (CI verte au 2e passage). **Collision d'horodatage vue juste après** :
  `20261101141600` pris aussi par `questions_ce1_lot6_rangement_tags`, mergée et déjà jouée en
  prod pendant que #2082 tournait → `db:migrate` aurait tenu la mienne pour jouée. Renommée
  `20261101160400` (max de `main`, des worktrees et des branches distantes : `160300`, ce2 lot 5,
  - 1 min) dans une PR de correction, AVANT tout `db:migrate`. Leçon : refaire le relevé des
    horodatages juste avant de merger, pas seulement à l'écriture.
- #2093 mergée (CI verte) : plus aucun doublon de version sur `main`.

### 11 quinquies. Lot 3c — rangement vérifié, page à cocher (2026-11-01)

- `db:migrate` lancé par David (joue aussi `20261101160100`, 2de droites). MCP : les 4 modèles sur
  « Fractions : sens et écritures > définition », un point CM1 chacun (145, 144, 150, 149),
  toujours brouillons, `updated_at` inchangé (création, 11:25).
- Page : https://claude.ai/artifact/DzyRsxgghCRtKQBQcgNZ5w (4 alertes attendues : ```partage non
  dessiné, à jouer dans l'aperçu) ; `verdicts` vide à la publication.
- Sessions prévenues : questions-2de (collision levée, sa migration jouée) ; questions-ce2 (sa
  `20261101160300`, pas mergée, passera sous `160400` : à renuméroter).

### 11 sexies. Lot 3c — publication (2026-11-01)

- Le bloc ```partage était déjà en prod (v0.58.0, 2026-10-30) : relecture faite dans l'aperçu de la prod.
- Page à cocher : 4 verdicts « ok », sans commentaire (comptés dans `verdicts`). Simulation
  `publier-lot --dir scripts/questions/cm1-3c` : 4 brouillons passent ; `--publier` lancé par David ;
  4 `published` relus au MCP (`092b310c`, `14a2d26f`, `60ce79bb`, `fe91cbd9`). Lot 3 fini.

## 12. Lot 4 — décimaux : phase 0 (à valider)

Relevé MCP du 2026-11-01 : les 8 points ci-dessous ont 0 modèle ; tous sous « Nombres et calculs >
Décimaux : numération » (sous-notion de chaque ligne). Points voisins déjà couverts : 030 (7), 154,
155 (3), 034, 132 (2). Bornes `cycle3.json`, CM1 : **au plus deux décimales** partout ; 032 :
dixièmes, ou zooms pour les centièmes (2,8 ; 339,16) ; 158 : 3,5 s'arrondit à 4 ; 159 : jusqu'à
**trois** nombres, l'un éventuellement en fraction décimale (2,12 ; 209/100 ; 2,6) ; 160 : 1,9 < … < 2,
2,9 < … < 3.

Outils : tous en prod (case, `choix, `ranger, ``line avec `placer:`, ``partage avec
`colorier:` et `unites:`). Patrons : `6-droite-ordre` (repérer, placer, ranger des décimaux, 6e),
lots 3b et 3c.

Niveaux : ajoutés après ceux qui existent ou qui sont écrits (la 6e attend la création de
`6-droite-ordre` : Repérage 1-2, Comparer 4 ; aucun autre lot en cours n'écrit dans Décimaux /
Apprivoiser).

| #   | Point   | Sous-notion                    | Modèle                                 | Variations, plages                                                                                                                                                                                                                                                                                                                                                     | Catégorie, niveau                     |
| --- | ------- | ------------------------------ | -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| 1   | CM1-031 | écritures                      | Lire et écrire un nombre décimal       | V1 lettres → case : « trois unités et vingt-cinq centièmes », « quatre et dix-sept centièmes », « quatre unités, un dixième et sept centièmes » → 3,25 ; V2 3,25 → ```choix (trois unités et vingt-cinq centièmes ; trois unités et vingt-cinq dixièmes ; trois-cent-vingt-cinq ; vingt-cinq unités et trois centièmes) ; partie entière 1 à 99, une ou deux décimales | Décimaux / Apprivoiser / Ecriture, 12 |
| 2   | CM1-156 | écritures                      | Colorier un nombre décimal             | ```partage `colorier:` ; V1 bande de 10, 0,n (n 1 à 9) ; V2 grille 10×10, 0,nn (11 à 99, non multiple de 10) ; V3 > 1 : `unites: 2`, deux grilles, 1,nn (1,37 du BO). Juge : le nombre de parts coloriées                                                                                                                                                              | Décimaux / Apprivoiser / Partage, 1   |
| 3   | CM1-157 | droite graduée                 | Repérer un point par un nombre décimal | V1 ```line de n à n + 1 en dixièmes (n 0 à 99, étiquettes n et n + 1), A → n,k ; V2 morceau agrandi de a,b à a,(b+1) en centièmes (a 1 à 999), A → a,bk                                                                                                                                                                                                                | Décimaux / Apprivoiser / Repérage, 3  |
| 4   | CM1-032 | droite graduée                 | Placer un nombre décimal               | `placer:` sur les mêmes droites : V1 dixièmes (2,8) ; V2 morceau agrandi en centièmes (339,16)                                                                                                                                                                                                                                                                         | Décimaux / Apprivoiser / Repérage, 4  |
| 5   | CM1-033 | arrondis et ordres de grandeur | Donner la partie entière               | case ; V1 une décimale (3,7), V2 deux décimales (135,78) ; partie entière 0 à 999 ; erreur typique en spec : l'arrondi (4 pour 3,7)                                                                                                                                                                                                                                    | Décimaux / Apprivoiser / Arrondir, 4  |
| 6   | CM1-158 | arrondis et ordres de grandeur | Arrondir à l'unité                     | case ; V1 une décimale (3,2 → 3 ; 3,7 → 4 ; 3,5 → 4) ; V2 deux décimales (5,78 → 6 ; 5,49 → 5) ; erreurs typiques en spec : la partie entière, l'arrondi au dixième                                                                                                                                                                                                    | Décimaux / Apprivoiser / Arrondir, 5  |
| 7   | CM1-159 | ordre                          | Ranger des nombres décimaux            | ```ranger de 3 étiquettes, même partie entière, nombres de décimales différents (2,12 ; 2,6 ; 2,09 : piège « plus de chiffres, plus grand ») ; V1 croissant, V2 décroissant, V3 une étiquette en fraction décimale (209/100)                                                                                                                                           | Décimaux / Apprivoiser / Comparer, 5  |
| 8   | CM1-160 | encadrement                    | Intercaler un nombre décimal           | 3,4 < ? < 3,5 (une case) ; règle `range` stricte (comme `2e982062`, 6e) ; V1 deux dixièmes consécutifs (corrigé en centièmes : 3,45) ; V2 un dixième et l'entier suivant (1,9 < ? < 2) ; partie entière 0 à 20                                                                                                                                                         | Décimaux / Apprivoiser / Encadrer, 6  |

Droites : 10 intervalles au plus (règle des lots 3a, 3b), d'où le morceau agrandi pour les centièmes.

Questions :

1. **031 V1 : 325/100 ou « 3 + 25/100 »** dans la case : refusés (« Écris-le avec une virgule ») ou
   acceptés ? Reco : refusés, l'écriture à virgule est le point. Il n'existe pas de forme exigée
   « décimal » toute faite : je l'écris par un motif, vérifié à l'écriture, et je le signale si le
   motif ne suffit pas.
2. **156 : un seul modèle, « colorier »** (représenter), sans « quel nombre la figure montre-t-elle ? »
   (aucun point du CM1 ne le demande, le 150 le fait en fraction) ? Reco : oui.
3. **Droites (157, 032) : modèles CM1 propres** (10 intervalles, bornes CM1) plutôt que d'ajouter le
   CM1 aux modèles 6e de `6-droite-ordre` (15 intervalles, pas encore créés en prod) ? Reco : propres.
4. **160 : toute réponse strictement entre les bornes est juste**, 3,456 compris (trois décimales,
   au-delà des bornes du CM1) ? Reco : oui, la règle `range` existante, comme au 3b.
5. **Calcul posé des décimaux** (165, 052), avec 050, 051, 053 (entiers, division euclidienne), tous
   au bloc ```operation : ils ne sont dans aucun lot de l'ordre du § 4 bis. Reco : un **lot 4b
   « calcul posé »** juste après celui-ci.

**Question d'accès** : brouillons, puis migration nœud + tag → **personne** ne gagne d'accès.

### 12 bis. Lot 4 : réponse de David (2026-11-01)

« go », après mes recommandations sur les cinq questions du § 12 : 031, virgule exigée (325/100 et
« 3 + 25/100 » refusés, par un motif, signalé s'il ne suffit pas) ; 156, un seul modèle
« colorier » ; 157 et 032, modèles CM1 propres (10 intervalles) ; 160, toute réponse strictement
entre les bornes est juste (règle `range`) ; **lot 4b « calcul posé »** (165, 052, 050, 051, 053)
juste après le lot 4.

### 12 ter. Lot 4 — écriture (2026-11-01)

- Script `docs/wip/questions/lot-cm1-4.py` → `scripts/questions/cm1-4/` (8 JSON), patrons
  `6-droite-ordre`, `6-nombres`, lots 3b et 3c.
- 031 : virgule exigée par `requiredForm: { pattern: 'a:number' }`, sondé avant d'écrire : 3,25
  passe ; 325/100, 3 + 25/100, 3 + 0,25 refusés (`bad_form`).
- **Écart à la phase 0** : 156 a une variation de plus, « deux bandes » (1,3), à côté des deux
  grilles (1,37).
- **Test du corpus aligné sur la prod** : `answer-complexity-corpus` mesurait aussi les specs de
  coloriage (d'où l'ancienne règle « 34 rangs au plus »), alors qu'en prod `validateSingleBlank` juge
  un coloriage AVANT la garde de complexité. 1,37 (137 rangs) ne pouvait donc pas avoir de spec
  juste, et `question:specs` en exige une par variation. Le test saute désormais les specs des
  variations à colorier.
- `question:specs` 300 tirages par variation : tout réussi ; `create-questions` en simulation
  (prod) : 8/8 verts, 68 specs ; test du corpus vert.
- Base locale : 8 brouillons, aperçus vus à 390 px (Playwright, port 5178) : énoncés à virgule,
  droites de 10 intervalles aux étiquettes à virgule (532,5 à 532,6 ; 804,9 à 805), `ranger` de
  trois étiquettes, deux grilles 10 × 10 l'une sous l'autre.

### 12 quater. Lot 4 — PR (2026-11-01)

- #2115 mergée. Premier passage de la CI rouge sans lien avec le lot : collision d'horodatage
  `20261101190200` sur `main`, réparée par #2114 ; `origin/main` fusionnée, CI 100 % verte.
- Revue du test du corpus (code-reviewer, Sonnet) : aucun finding bloquant. Limite notée : un
  modèle à colorier qui activerait `orderIndependent` passerait par la garde de complexité avant le
  jugement (`validateBlanksOrderIndependent`) ; aucun ne le fait.

### 12 quinquies. Lot 4 — brouillons en prod, rangement et tags (2026-11-01)

- `create-questions --publier` lancé par David. MCP : 8 brouillons [CM1], sans nœud ni tag, créés à
  15:40 UTC ; les 8 points sous « Nombres et calculs > Décimaux : numération », sans modèle.
  Ids : `2cff4ef5-a463-4bce-85ff-b0fec81dce08` (lire et écrire), `b832dfdf-f1eb-4f4c-8469-66d89a9db899`
  (colorier), `06f246e4-eda1-44f5-a65f-9f55c360833d` (repérer), `3560dded-0565-4f15-a6e0-44e7e2adc834`
  (placer), `10aae729-4a29-4dac-9578-21ef655d60d1` (partie entière), `ca08432a-cfcc-4372-809e-f5d0d9895eff`
  (arrondir), `2af5f9fe-de36-4b1c-adf9-dec60f759910` (ranger), `2cb242e0-fa40-458b-abb0-819e4720c731`
  (intercaler).
- Migration `20261101212100_questions_cm1_lot4_rangement_tags` et son test générés du gabarit du lot
  3c (script, remplacements vérifiés au `diff`) ; horodatage d'abord `20261101200800`, pris aussi par
  `questions_5_lot6_niveau` (branche `fix/questions-5-lot6-niveau`), vu au contrôle d'avant merge :
  renuméroté `20261101212100` (max `20261101212000`, 1spe, + 1 min).
- Test d'intégration : rouge sans le corps de la migration (5 échecs), 9/9 vert avec.
- `security-auditor` : aucun finding. #2124 mergée (CI verte, horodatage revérifié juste avant).
- `db:migrate` refusé : `20261101200800_questions_5_lot6_niveau` (#2116), mergée APRÈS que la prod
  eut joué `20261101212000`, tombait « avant la dernière ». David a lancé
  `supabase db push --include-all` : les deux migrations jouées (5e puis CM1).
- MCP : les 8 modèles sur la sous-notion de leur point, un point CM1 chacun, toujours brouillons,
  `updated_at` = création (15:40).

### 12 sexies. Lot 4 — page à cocher (2026-11-01)

- Page : https://claude.ai/artifact/PQr3Cp4yAANDfJxAyTBFuN (capacité `db`), rendu vu à 390 px
  (8 fiches, pas de défilement horizontal) ; `verdicts` vide à la publication. Alertes attendues :
  `partage, `line et ```ranger non dessinés (à jouer dans l'aperçu) ; homonymes 6e
  `92db5823` (ranger) et `2e982062` (intercaler) écartés, les ids retenus sont bien ceux du lot.

### 12 septies. Lot 4 — publication (2026-11-01)

- Page à cocher : 8 verdicts « OK », sans commentaire (comptés dans `verdicts`). Simulation
  `publier-lot --dir scripts/questions/cm1-4` : 8 brouillons passent ; `--publier` lancé par David ;
  8 `published` relus au MCP, toujours rangés et tagués. Lot 4 fini.

## 13. Lot 4b — calcul posé : phase 0 (à valider)

Relevé MCP du 2026-11-01 : les 5 points ont 0 modèle. Nœuds des points : 050 et 165 sur la **notion**
« Nombres et calculs > Décimaux : calculs » ; 052 sur « Décimaux : calculs › multiplication » (26 modèles,
niveaux 1 à 9) ; 051 sur « Entiers : multiplication › calcul posé » (vide) ; 053 sur « Entiers : division ›
calcul posé » (vide ; la division posée de 6e `3c9284c5` est rangée sous « division euclidienne »). Modèles
posés en prod : CP-016, CE1-022, CE1-100 (deux méthodes), 6-123 ; aucune multiplication posée nulle part.
Le CE2 (019, multiplication posée) n'est pas encore écrit.

Bornes `cycle3.json`, CM1 : 050 décimaux à deux décimales au plus, entiers mêlés, trois termes au plus
(56,75 + 234 + 0,8) ; 165 deux décimales au plus (34,5 − 2,58) ; 051 trois chiffres × trois chiffres
(876 × 208), produit ≤ 999 999 ; 052 facteur entier 2 à 9, décimal à deux décimales au plus (7 × 46,55 ;
8 × 17,3) ; 053 diviseur 2 à 9, dividende entier de cinq chiffres au plus (9 456 ÷ 7).

Outil : ` ```operation ` (en prod), tout ce qu'il faut y est : trois termes et virgules alignées
(addition), `méthode: compensation | cassage` (soustraction), virgule du produit posée par l'élève et
« virgule oubliée » signalée (multiplication), potence à deux cases quotient + reste (division
euclidienne). Retenues à remplir par défaut (aide, jamais jugée). Réponse = cases du résultat seules ;
énoncé « Pose et calcule. » (CE1) ou « Pose et effectue la division euclidienne. » (6e).

| #   | Point   | Nœud (sous-notion)                     | Modèle                                                | Variations, plages                                                                                                                                                                                                                                                                                    | Niveau |
| --- | ------- | -------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 1   | CM1-050 | Décimaux : calculs › addition          | Poser une addition de nombres décimaux                | V1 deux termes à deux décimales, retenues (45,78 + 26,57) ; V2 décimales en nombre différent (34,5 + 2,58) ; V3 entier + décimal (234 + 5,68) ; V4 trois termes, entier mêlé (56,75 + 234 + 0,8) ; parties entières ≤ 999. Specs : retenue oubliée, chiffres alignés à droite (6,03 pour 34,5 + 2,58) | 8      |
| 2   | CM1-165 | Décimaux : calculs › soustraction      | Poser une soustraction de décimaux (par compensation) | V1 mêmes décimales, une ou deux retenues (52,34 − 17,58) ; V2 le premier a moins de décimales (34,5 − 2,58) ; V3 entier − décimal (25 − 3,46) ; premier ≤ 999,99. Specs : plus petit chiffre ôté du plus grand (32,08 pour 34,5 − 2,58)                                                               | 7      |
| 3   | CM1-165 | Décimaux : calculs › soustraction      | Poser une soustraction de décimaux (par cassage)      | mêmes variations, `méthode: cassage`                                                                                                                                                                                                                                                                  | 8      |
| 4   | CM1-051 | Entiers : multiplication › calcul posé | Poser une multiplication de deux entiers              | V1 2 chiffres × 2 chiffres (48 × 37) ; V2 3 × 2 (347 × 26) ; V3 3 × 3 avec un 0 au milieu du multiplicateur (876 × 208 : ligne du 0 sautée). Specs : décalage oublié (2 776 pour 347 × 26), retenue oubliée                                                                                           | 1      |
| 5   | CM1-052 | Décimaux : calculs › multiplication    | Poser la multiplication d'un décimal par un entier    | V1 une décimale (8 × 17,3) ; V2 deux décimales (7 × 46,55) ; V3 produit terminé par 0 (4 × 12,35 = 49,40, « 49,4 » juste) ; entier 2 à 9, partie entière 1 à 99. Specs : virgule oubliée (32 585), virgule mal placée (3 258,5)                                                                       | 10     |
| 6   | CM1-053 | Entiers : division › calcul posé       | Poser une division euclidienne                        | V1 3 chiffres, quotient à 2 chiffres (157 ÷ 6) ; V2 4 chiffres (9 456 ÷ 7) ; V3 un 0 au quotient (2 418 ÷ 4 = 604 reste 2) ; V4 5 chiffres (23 875 ÷ 6) ; diviseur 2 à 9. Specs : reste ≥ diviseur, 0 oublié au quotient (64)                                                                         | 1      |

Corrigés : étapes colonne par colonne (retenues, compensation ou cassage), produits partiels écrits pour
la multiplication, « on compte les décimales » pour 052, égalité `N = (d × q) + r` pour 053.

Questions :

1. **« Poser »** : le bloc pose l'opération lui-même (virgules alignées) ; l'élève effectue. Aligner les
   virgules, la vraie difficulté de 050 et 165, n'est donc pas évalué (même limite qu'au CE1 et en 6e).
   Reco : l'accepter, le corrigé commence par « on aligne les virgules ». Un geste « poser soi-même »
   serait un outil neuf (classe C, chantier à part).
2. **Soustraction : un modèle par méthode** (compensation, cassage), comme au CE1, le prof choisit celle de
   sa classe ? Ou un seul (compensation, défaut du bloc) ? Reco : deux, comme au CE1.
3. **050 et 165 rangés sous « addition » / « soustraction »** de « Décimaux : calculs » plutôt que sur la
   notion nue : leur point est sur la notion, la règle des tags l'admet (point sur le nœud du modèle ou sa
   notion, vérifié dans `question_template_points_check_rules` en prod). Reco : sous-notions.

À noter : « Entiers : multiplication › calcul posé » est vide ; le CM1 y prend le niveau 1, la
multiplication posée du CE2 (019) devra s'insérer avant (renumérotation par sa propre migration).

**Question d'accès** : brouillons, puis migration nœud + tag → **personne** ne gagne d'accès.

### 13 bis. Lot 4b : réponse de David (2026-11-01)

« tes recos ? », puis « go » après mes trois recommandations : 1. le bloc pose l'opération, limite acceptée
(corrigé « on aligne les virgules ») ; 2. soustraction : deux modèles, compensation et cassage, comme au
CE1 ; 3. 050 et 165 rangés sous « Décimaux : calculs › addition » et « › soustraction ».

### 13 ter. Lot 4b — écriture (2026-11-01)

- Script `docs/wip/questions/lot-cm1-4b.py` → `scripts/questions/cm1-4b/` (6 JSON), patrons `lot-ce1-6.py`
  (posées, une soustraction par méthode) et `lot-6-calcul-decimal.py` (division euclidienne posée).
- **Écart à la phase 0, les niveaux** : la phase 0 les comptait dans le nœud, à tort ; le niveau se compte
  dans la catégorie (thème, domaine, sous-domaine). Catégories neuves « Décimaux / Additionner | Soustraire |
  Multiplier / Calcul posé », « Entiers / Multiplier | Diviser / Calcul posé » (aucun modèle en prod ni dans
  les lots écrits) → niveau 1 partout, 2 pour la soustraction par cassage.
- Décimaux tirés en entiers (centièmes, dixièmes), affichés par `{{eval:…;d}}` (virgule `{,}` au rendu) ;
  virgules écrites à la main dans les formules du corrigé remplacées par `{,}` (sinon « 0, 4 »).
- Specs : réponses telles que la grille les lit (espaces de milliers : « 182 208 », sinon `unoptimal_form`) ;
  pas de spec « 49,40 » ni « reste vide » : la lecture des cases retire le 0 de fin et rend vide un reste
  vide, le juge ne reçoit jamais ces textes.
- `question:specs` 300 tirages par variation : tout réussi ; `create-questions` en simulation (prod) : 6/6
  verts, 42 specs.
- Base locale : 6 brouillons, joués dans l'aperçu à 390 px (Playwright, port 5178), réponse fausse et
  corrigé : virgules alignées et carreaux vides (34,5 ; 13 − 4,43), produits partiels en cases d'aide
  (605 × 303), potence à 4 chiffres qui défile dans son cadre (page sans défilement horizontal), corrigés à
  virgule.

### 13 quater. Lot 4b — brouillons en prod, rangement et tags (2026-11-01)

- `create-questions --publier` lancé par David. MCP : 6 brouillons [CM1], sans nœud ni tag, créés à
  18:11 UTC, niveaux 1 (cassage 2) dans les catégories « Calcul posé ». Ids : `39e7d0a5-c605-4e1c-b0db-91a67f53f117`
  (addition), `613817ea-58af-4c94-b82a-a2dba19e687a` (soustraction, compensation), `1ed5202f-d031-4964-8f4b-a8dc0ade21c5`
  (soustraction, cassage), `e8086f21-13e4-4adf-8691-347c65f88258` (multiplication d'entiers),
  `c3246792-8dbf-4afb-8ad5-33c6f37feeb0` (décimal × entier), `4b666c28-0357-41b6-ae08-daae13ac0642` (division).
- Migration `20261101224741_questions_cm1_lot4b_rangement_tags` et son test, générés du gabarit du lot 4
  (remplacements vérifiés au `diff`). **Seul écart de logique** : le point est cherché sur le nœud du
  modèle OU sur sa notion (050 et 165 sont posés sur la notion « Décimaux : calculs », leurs modèles sous
  « addition » / « soustraction »), comme la règle des tags l'admet ; test ajouté : un point posé ailleurs
  fait échouer la migration. Horodatage : d’abord `20261101223100`, pris aussi par `questions_ce2_lot6a` (#2158) → `20261101224100` (max des PR ouvertes + 1 min) → refusé par `check:migrations --pr 2159` (plus ancien que `20261101224700`, 6e lot 8, entré sur main pendant la CI) → `20261101224701` (`pnpm migration:horodatage`), pris au même moment par la 1re spé probas → `20261101224702`, pris par la terminale spé lot 2 (#2173) → `20261101224741`, tiré par le script de #2177 (aléa de 1 à 59 s).
- Test d'intégration : rouge sans le corps de la migration (6 échecs), 10/10 vert avec.

### 13 quinquies. Lot 4b — rangement vérifié, page à cocher (2026-11-01)

- #2159 mergée. David a lancé `pnpm db:migrate --include-all` (dry-run relu : 3 migrations, toutes
  sur main — 2de lot 7, CM1 lot 4b, CE2 lot 6b).
- MCP : les 6 modèles sur le bon nœud (addition, soustraction ×2, multiplication sous « Décimaux :
  calculs » ; « calcul posé » sous « Entiers : multiplication » et « Entiers : division »), un tag
  chacun (CM1-050, 165, 165, 052, 051, 053), toujours brouillons.
- Page : https://claude.ai/artifact/QwvVUKnuztGXrZ7ermrd6F (capacité `db`), rendu vu à 390 px
  (6 fiches, pas de défilement horizontal) ; `verdicts` vide à la publication. Alertes attendues :
  bloc `operation` non dessiné (6), à jouer dans l'aperçu.

### 14 sexies. Lot 5a — publication (2026-11-02)

- Page à cocher : 7 verdicts « OK », sans commentaire (comptés dans `verdicts`, ids = les 7 brouillons). Simulation
  `publier-lot --dir scripts/questions/cm1-5a` : 7 brouillons passent ; `--publier` lancé par David ;
  7 `published` relus au MCP. Lot 5a fini.

### 14 septies. Lot 5b — écriture (2026-11-02)

- Script `docs/wip/questions/lot-cm1-5b.py` → `scripts/questions/cm1-5b/` (10 JSON), patron `lot-cm1-5a.py`
  rendu générique (classe `Grandeur` : unités, relations, choisir). Niveaux relevés au MCP : Masses / Unités 6
  (unités), 7 (choisir), 8 (relations) ; Comparaison 4 ; Ordres de grandeur 3 (références), 4 (estimer) ;
  Contenances / Unités 3, 4, 5 ; Comparaison 1 (catégorie neuve, nom « Comparaison » comme les masses).
- Relations de masse : 9 variations (un cran, retour, deux crans, 3 g + 5 cg, t → kg, kg → t décimal,
  fractions de kg et de t, kg décimal → g) ; contenances : 6 (un cran, retour, deux crans, dL → L, cL → L,
  L décimal → cL). Comparer : signe, `ranger` (3 masses g / kg / hg, 4 contenances cL / L / mL / dL), somme
  et différence.
- `ranger` à trois étiquettes : positions lues par essai des 6 permutations (b = 2, 3, 9), stables : 2, 0, 1 ;
  à quatre : 3, 0, 1, 2 (comme au 5a).
- **Écarts à la phase 0, à confirmer par David** : repère du milligramme « une petite fourmi » (un grain de sel
  pèse bien moins de 1 mg) ; titres suffixés « du milligramme à la tonne » pour ne pas doublonner les modèles
  CE1 « Estimer une masse » et « Des masses de référence ».
- Corrigés relus dans l'aperçu à 390 px (Playwright, port 5179, verso « En classe », chaque variation vue) :
  parenthèse « (1 hg = 100 g) » qui se coupait → « car 1 hg = 100 g » ; repère « 1 hL, une demi-baignoire »
  contredisait la baignoire de 150 L → « cent litres (une baignoire en contient environ 150 L) ». Pas de
  défilement horizontal.
- `question:specs` 300 tirages par variation : tout réussi, 131 specs vertes ; `create-questions` en
  simulation (prod) : 10/10 verts ; tests `student-answer-safety.render` et `answer-complexity-corpus` verts ;
  base locale : 10 brouillons.

### 14 octies. Lot 5b — brouillons en prod, rangement et tags (2026-11-02)

- Écarts du § 14 septies confirmés par David : repère du milligramme « une petite fourmi » ; titres suffixés
  « du milligramme à la tonne ». #2216 mergée (CI verte).
- `create-questions --publier` (`pnpm tsx scripts/create-questions.ts`, demandé par David). MCP : 10 brouillons
  [CM1], sans nœud ni tag, créés à 08:35 UTC. Ids : `8f48ef70-8e7a-444b-9a23-0e4418762332` (unités, 076),
  `1be3eee7-337c-4ffb-b848-ee06bee78def` (relations, 077), `97781d22-6653-4f45-af32-e861bf0206a5` (choisir, 078),
  `dceea553-c857-4f51-8246-5eadf2ae2e05` (comparer, 079), `db4e32ba-5c83-43ec-b6b9-0bcb8fdf65f0` (références, 080),
  `5ecdc120-01b2-401b-b729-f5f628cadd35` (estimer, 081), `4b628efa-0b6d-42b7-bbc1-3bf2aafcf897` (unités de
  contenance, 082), `e297293d-41fd-4c8d-94de-be0e4e377756` (relations, 083), `64a2c3f6-ea43-4219-b71e-66be169c20b7`
  (choisir, 084), `5a476fc4-e9ce-4b9b-9626-4f31ee7ab1ee` (comparer, 085).
- Migration `20261102083604_questions_cm1_lot5b_rangement_tags` et son test, générés du gabarit du lot 5a
  (script `gen5b.py` jetable). Test « rangé à la main » : sur « Longueurs » ; « point hors du nœud » : 076 posé
  sur la notion « Masses » ; « point archivé » : 085.
- Test d'intégration : rouge sans le corps de la migration (6 échecs), 10/10 vert avec.

### 14 nonies. Lot 5b — rangement vérifié, page à cocher (2026-11-02)

- #2222 mergée (CI verte après une relance : job client en échec `wrapDynamicImport`, outillage Vitest ;
  `check:migrations --pr 2222` passé). `security-auditor` : aucun finding. `pnpm db:migrate` lancé par David (avec
  `tspe_lot4` d'une autre session).
- MCP : les 10 modèles sur le bon nœud (Masses › unités et conversions : 076-078 ; › comparaison et mesure :
  079-081 ; Contenances › unités et conversions : 082-084 ; › comparaison et mesure : 085), un tag chacun,
  `updated_at` inchangé, toujours brouillons ; trigger `updated_at` actif (`O`).
- Page : https://claude.ai/artifact/AbSGVphXpE4a34gWngHjmK (capacité `db`), rendu vu à 390 px (10 fiches, pas de
  défilement horizontal) ; `verdicts` vide à la publication. Alertes attendues : bloc `ranger` non dessiné (04 et
  10, à jouer dans l'aperçu).

### 13 sexies. Lot 4b — publication (2026-11-02)

- Page à cocher : 6 verdicts « OK », sans commentaire (comptés dans `verdicts`). Simulation
  `publier-lot --dir scripts/questions/cm1-4b` : 6 brouillons passent ; `--publier` lancé par David ;
  6 `published` relus au MCP. Lot 4b fini.

## 14. Lot 5 — grandeurs (unités, conversions, comparaisons) : phase 0 (à valider)

Relevé MCP du 2026-11-02 : les 19 points 067 à 085 ont 0 modèle. Nœuds des points (existants, aucun à créer) :
Longueurs, Masses, Contenances › « unités et conversions » (067-069, 076-078, 082-084) et › « comparaison et
mesure » (070-072, 079-081, 085) ; 073-075 sur la notion « Périmètres ». Modèles voisins en prod (CP, CE1, CE2,
tous publiés) : patrons `ce1-5` (références, estimer : case choix), `ce2-6a` (unités, relations, comparer :
signe + `ranger`), `ce2-6b` (contenances).

Bornes `cycle3.json`, CM1 : longueurs mm à km ; masses mg à kg et la tonne (pas de quintal) ; contenances mL à hL ;
relations **sans tableau** (1 cm = 1/10 dm = 0,1 dm ; 215 cm = 2,15 m ; 1/2 km = 500 m ; 3/4 m = 75 cm ;
3 g + 5 cg = 305 cg ; 6,2 t = 6 200 kg ; 1/4 kg = 250 g ; 23 dL en L ; 6,4 L en cL) ; ranger jusqu'à 4
longueurs, 3 masses, 4 contenances ; somme ou différence de deux grandeurs d'unités différentes (8,2 kg + 840 g ;
1 L − 25 cL). Décimaux : deux décimales au plus (lot 4).

Niveaux : à la suite de ceux des catégories en prod (Longueurs / Unités ≤ 11, Comparaison et mesure ≤ 4, Ordres
de grandeur ≤ 5 ; Masses / Unités ≤ 5, Comparaison ≤ 3, Ordres de grandeur ≤ 2 ; Contenances / Unités ≤ 2,
Comparaison : vide), relevés à nouveau juste avant la création.

Forme commune : réponse numérique en case, l'unité écrite après la case (« 215 cm = … m ») ; décimaux à virgule
exigée (motif `a:number`, comme 031) ; choix en case « choix ». Corrigés par les relations entre unités
successives (« 1 m = 100 cm, donc… »), jamais par le tableau de conversion.

| #    | Point   | Sous-notion           | Modèle                                       | Variations, plages                                                                                                                                                                           |
| ---- | ------- | --------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5a-1 | CM1-067 | unités et conversions | Les unités de longueur, du mm au km          | V1 symbole → nom (choix : hm → hectomètre…) ; V2 nom → symbole ; V3 la plus grande / la plus petite de 3 unités (choix) ; les 7 unités                                                       |
| 5a-2 | CM1-068 | unités et conversions | Relations entre unités de longueur (entiers) | V1 unités successives (7 dam = … m ; 340 mm = … cm) ; V2 deux crans (5 hm = … m ; 4 m = … mm) ; V3 mélange (3 km 250 m = … m)                                                                |
| 5a-3 | CM1-068 | unités et conversions | Longueurs : décimaux et fractions            | V1 vers le décimal (215 cm = … m ; 1 cm = … dm → 0,1) ; V2 depuis le décimal (2,15 m = … cm ; 3,7 km = … m) ; V3 fraction (1/2 km = … m ; 3/4 m = … cm ; 1/4 m, 1/10 m)                      |
| 5a-4 | CM1-069 | unités et conversions | Quelle unité pour mesurer… ?                 | choix parmi mm, cm, m, km (+ dm, hm en distracteurs) ; objets et distances du quotidien (épaisseur d'une pièce, longueur d'une piscine, trajet Paris–Lyon)                                   |
| 5a-5 | CM1-070 | comparaison et mesure | Comparer des longueurs                       | V1 signe <, =, > entre deux unités (3,5 m … 340 cm) ; V2 `ranger` 3 ou 4 longueurs d'unités différentes ; V3 somme ou différence de deux longueurs (2 m + 45 cm = … cm ; 1 km − 350 m = … m) |
| 5a-6 | CM1-071 | comparaison et mesure | Des longueurs de référence                   | choix : « qu'est-ce qui mesure environ 1 mm / 1 cm / 1 dm / 1 m / 1 km ? » (épaisseur d'une carte, largeur d'un doigt, largeur d'une main, …)                                                |
| 5a-7 | CM1-072 | comparaison et mesure | Estimer une longueur                         | choix d'ordre de grandeur, trois valeurs à unités différentes (une salle de classe : 8 m / 8 dm / 8 km ; un trajet en voiture d'une heure : 80 km / 80 m / 800 m)                            |
| 5b-1 | CM1-076 | unités et conversions | Les unités de masse, du mg à la tonne        | comme 5a-1, 8 unités (mg à kg, t)                                                                                                                                                            |
| 5b-2 | CM1-077 | unités et conversions | Relations entre unités de masse              | V1 unités successives (3 g + 5 cg = … cg ; 40 dg = … g) ; V2 tonne ↔ kg (6,2 t = … kg ; 3 500 kg = … t) ; V3 fraction (1/4 kg = … g ; 1/2 t = … kg) ; V4 décimal (1,25 kg = … g)             |
| 5b-3 | CM1-078 | unités et conversions | Quelle unité pour peser… ?                   | choix parmi mg, g, kg, t (comprimé, pomme, enfant, camion)                                                                                                                                   |
| 5b-4 | CM1-079 | comparaison et mesure | Comparer des masses                          | V1 signe (1,5 kg … 1 200 g) ; V2 `ranger` 3 masses d'unités différentes ; V3 somme ou différence (8,2 kg + 840 g = … g)                                                                      |
| 5b-5 | CM1-080 | comparaison et mesure | Des masses de référence                      | choix : environ 1 g (un trombone), 1 kg (un litre d'eau), 1 t (une voiture), 1 mg (un grain de sel)…                                                                                         |
| 5b-6 | CM1-081 | comparaison et mesure | Estimer une masse                            | choix d'ordre de grandeur (une pomme : 150 g / 150 kg / 15 mg ; un éléphant : 5 t / 5 kg / 500 g)                                                                                            |
| 5c-1 | CM1-082 | unités et conversions | Les unités de contenance, du mL à l'hL       | comme 5a-1, 6 unités (mL, cL, dL, L, daL, hL)                                                                                                                                                |
| 5c-2 | CM1-083 | unités et conversions | Relations entre unités de contenance         | V1 successives (1 cL = … mL ; 4 hL = … daL) ; V2 vers le décimal (23 dL = … L) ; V3 depuis le décimal (6,4 L = … cL ; 0,75 L = … cL) ; V4 deux crans (3 L = … mL ; 2 hL = … L)               |
| 5c-3 | CM1-084 | unités et conversions | Quelle unité pour mesurer une contenance ?   | choix parmi mL, cL, L, hL (cuillère, verre, seau, citerne)                                                                                                                                   |
| 5c-4 | CM1-085 | comparaison et mesure | Comparer des contenances                     | V1 signe (75 cL … 0,8 L) ; V2 `ranger` 3 ou 4 contenances ; V3 somme ou différence dans une seule unité (1 L − 25 cL = … cL)                                                                 |

Specs d'erreurs typiques : facteur 10 au lieu de 100 (215 cm = 21,5 m), sens de la conversion inversé
(2,15 m = 0,0215 cm), virgule déplacée d'un cran de trop, 3 g + 5 cg lu 35 cg, unité choisie trop petite ou
trop grande d'un cran.

Questions :

1. **Découpage** : trois lots, 5a longueurs (7 modèles), 5b masses (6), 5c contenances (4), une PR de fichiers et
   une migration chacun ; ou 5b + 5c en un seul lot (10) ? Reco : 5a, puis 5b + 5c ensemble (10 modèles).
2. **Périmètres (073, 074, 075)** hors de ce lot : 073 et 074 demandent une figure (`figure`, classe B, longueurs
   écrites sur les côtés puisque la règle graduée ne se manipule pas), 075 est un problème en texte. Reco : un
   **lot 5d « périmètres »** juste après, les trois ensemble, au même nœud.
3. **Réponses décimales** (2,15 m) : virgule exigée, 215/100 refusé (« Écris-le avec une virgule »), comme 031 ?
   Reco : oui. Les fractions restent dans l'énoncé seulement (1/2 km = … m, réponse entière).
4. **Références et estimations (071, 072, 080, 081)** : modèles CM1 propres (unités mm, dm, mg, t que le CE1 n'a
   pas), case « choix », plutôt que d'ajouter le CM1 aux modèles CE1 ? Reco : propres.

**Question d'accès** : brouillons, puis migration nœud + tag → **personne** ne gagne d'accès.

### 14 bis. Lot 5 : réponse de David (2026-11-02)

« je te suis », en réponse aux quatre recommandations du § 14 : 1. lot **5a** longueurs (7 modèles), puis **5b**
masses + contenances ensemble (10 modèles) ; 2. périmètres (073, 074, 075) en **lot 5d** juste après ; 3. réponses
décimales à virgule exigée (215/100 refusé), fractions dans l'énoncé seulement ; 4. références et estimations :
modèles CM1 propres, case « choix ».

### 14 ter. Lot 5a — écriture (2026-11-02)

- Script `docs/wip/questions/lot-cm1-5a.py` → `scripts/questions/cm1-5a/` (7 JSON), patrons `lot-ce2-6a.py` et
  `lot-cm1-4.py` (virgule exigée). Catégories `Grandeurs · Longueurs` : Unités 12 (unités), 13 (choisir), 14
  (relations, entiers), 15 (décimaux et fractions) ; Comparaison et mesure 5 ; Ordres de grandeur 6, 7.
- `ranger` de quatre longueurs (cm, m, mm, dm) : positions affichées lues par essai des 24 permutations
  (b = 2, 3, 9), stables : bonne réponse 3, 0, 1, 2.
- Corrigés relus dans l'aperçu à 390 px (Playwright, port 5178) : accords « 1 mètre », « 1 dixième » ajoutés ;
  « l'hectomètre » (h muet) ; facteur en formule (« 1\,000 » sortait brut dans le texte) ; chaîne des unités
  écrite en texte (la suite d'égalités se coupait sur une virgule en début de ligne).
- **CI rouge** (`student-answer-safety.render`, liste blanche) : la réponse de la fraction (1/2 km = … m) était un
  `{{if:…}}` imbriqué ; elle est désormais calculée (`n × base / d`, variables `n`, `d`), en deux variations
  (km → m, m → cm). Piège déjà au § 9 de la doc : jamais de `{{if}}` dans une réponse attendue.
- `question:specs` 300 tirages par variation : tout réussi ; `create-questions` en simulation (prod) : 7/7
  verts, 88 specs ; test du corpus vert ; base locale : 7 brouillons, pas de défilement horizontal.

### 14 quater. Lot 5a — brouillons en prod, rangement et tags (2026-11-02)

- `create-questions --publier` lancé par David. MCP : 7 brouillons [CM1], sans nœud ni tag, créés à 06:22 UTC,
  niveaux 12 à 15 (Unités), 5 (Comparaison et mesure), 6 et 7 (Ordres de grandeur). Ids :
  `0720f9de-4387-4bd4-ad5c-3e6526f27dc1` (unités, 067), `da2e705f-ca7b-4715-b0fc-992d440f02b5` (relations, 068),
  `e22cff99-529a-49c9-8ef9-0c48b7dae6ea` (décimaux et fractions, 068), `2a08a490-7ee7-45c6-8b17-9c7abd3a3bf9`
  (choisir, 069), `8aa2821f-d852-464b-9ff6-c7a8c373a6e9` (comparer, 070), `89283903-974d-44b3-8350-99f62f56e3ce`
  (références, 071), `1e01404d-5400-4a39-b465-7e86b5b7bd6e` (estimer, 072).
- Migration `20261102062309_questions_cm1_lot5a_rangement_tags` et son test, générés du gabarit du lot 4b. Écart :
  le point est cherché sur le nœud du modèle **seulement** (aucun point du lot n'est sur une notion) ; le test
  « point hors du nœud » le pose sur la notion « Longueurs » et la migration échoue.
- Test d'intégration : rouge sans le corps de la migration (6 échecs), 10/10 vert avec.

### 14 quinquies. Lot 5a — rangement vérifié, page à cocher (2026-11-02)

- #2207 mergée (CI verte, `check:migrations --pr 2207` passé). `security-auditor` : aucun finding bloquant
  (contrôler après coup que `update_question_templates_updated_at` est actif). `pnpm db:migrate` lancé par David :
  « up to date », la migration avait déjà été poussée par une autre session (avec celle du lot 8 de 2de).
- MCP : les 7 modèles sur le bon nœud (Longueurs › unités et conversions : 067, 068 ×2, 069 ; › comparaison et
  mesure : 070, 071, 072), un tag chacun, toujours brouillons ; trigger `updated_at` actif (`O`).
- Page : https://claude.ai/artifact/GQ9MJAnZJSn9grR3CAJTYk (capacité `db`), rendu vu à 390 px (7 fiches, pas de
  défilement horizontal) ; `verdicts` vide à la publication. Alertes attendues : bloc `ranger` non dessiné (05, à
  jouer dans l'aperçu) ; homonyme « Estimer une longueur » du CE1 (`1bd819dd`, niveau 5) écarté, le bon modèle est
  `1e01404d`.

## 15. Lot 5d — périmètres : phase 0 (à valider)

Relevé MCP du 2026-11-02 : CM1-073, 074, 075 ont 0 modèle, posés sur la **notion** « Périmètres » (sous-notions
carré, rectangle, disque : celles de la 6e, aucune ne convient à un polygone quelconque). Modèles voisins en prod :
6e seulement (`Grandeurs · Périmètres` : carré, rectangle, disque, avec formules). Rien au CE2 : **CE2-042, 043,
044 ont aussi 0 modèle** (aucun journal ne les traite).

Bornes : aucune formule (BO c3 p.17) ; « longueurs mesurées à la règle graduée **ou fournies** » (074) ; ex. de
réussite « rectangle de côté 8 cm et de périmètre 27 cm » (075). Le BO permet que l'élève établisse lui-même « le
périmètre d'un carré est le quadruple du côté ». Décimaux : deux décimales au plus (lot 4).

Outils : bloc `figure` (polygone, `texte()` pour les longueurs, en-tête `grille:`), case « choix » de figures, et la
**règle graduée dessinée** du CE1 (`ce1-10/01`, `cp-b2/09`) — pas de règle à manipuler. Classe B pour les trois.

Catégorie : `Grandeurs · Périmètres · Périmètre d'un polygone` (neuve, à côté des sous-catégories de 6e), niveaux
1 à 4. Nœud : la notion « Périmètres » (le point est sur le nœud du modèle, comme au lot 5a).

| #    | Point   | Modèle                              | Variations, plages                                                                                                                                                                                                                                                                                                                                                                     | Réponse        |
| ---- | ------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 5d-1 | CM1-073 | Qu'est-ce que le périmètre ?        | V1 définition (« la longueur de son contour » / l'intérieur / le nombre de côtés / le plus grand côté) ; V2 quatre dessins d'un même polygone : lequel montre son périmètre (contour en couleur, intérieur colorié, un seul côté, une diagonale) ; V3 deux figures sur quadrillage, même nombre de carreaux, contours différents : laquelle a le plus grand périmètre ? (A, B, autant) | choix          |
| 5d-2 | CM1-074 | Calculer le périmètre d'un polygone | V1 longueurs écrites sur les côtés, entiers en cm, triangle à hexagone ; V2 polygone à côtés droits sur un quadrillage de 1 cm (compter les côtés de carreaux) ; V3 longueurs écrites en cm et mm mêlés, réponse en cm (virgule) ; V4 les côtés posés bout à bout au-dessus de la règle dessinée (lire le bout)                                                                        | nombre + cm    |
| 5d-3 | CM1-075 | Problèmes : calculer un périmètre   | V1 tour d'un jardin rectangulaire (m, entiers ≤ 100) ; V2 clôture d'un champ à 5 côtés (m) ; V3 carré : côté donné, « combien de ruban pour faire le tour ? » (décimal possible)                                                                                                                                                                                                       | nombre + unité |
| 5d-4 | CM1-075 | Problèmes : retrouver un côté       | V1 triangle ou quadrilatère : périmètre et tous les côtés sauf un ; V2 rectangle : un côté et le périmètre (8 cm et 27 cm → 5,5 cm) ; V3 carré : périmètre → côté (division par 4, entier ou une décimale)                                                                                                                                                                             | nombre + unité |

Corrigés : toujours « on fait le tour » (somme des côtés, écrite en entier), jamais une formule ; rectangle : « les
deux côtés de 8 cm font 16 cm ; il reste 27 − 16 = 11 cm pour les deux autres, chacun 11 : 2 = 5,5 cm ».

Specs d'erreurs typiques : aire au lieu du périmètre (carreaux de l'intérieur comptés), un côté oublié, unités non
converties (4 cm + 35 mm = 39), rectangle : 27 − 8 = 19, demi-périmètre non partagé (11 au lieu de 5,5), carré :
côté × 2.

Questions :

1. **Quatre modèles** (075 coupé en « calculer » et « retrouver un côté ») plutôt que trois ? Reco : quatre, les
   deux tâches n'ont pas la même difficulté (niveaux 3 et 4).
2. **La règle graduée (074, V4)** : côtés posés bout à bout au-dessus de la règle du CE1, l'élève lit le bout du
   dernier — c'est la seule façon de faire jouer la règle sans geste ; à garder ? Reco : oui, en plus des longueurs
   fournies et du quadrillage.
3. **073, V3 (aire ≠ périmètre)** : deux figures de même aire sur quadrillage ; garder cette variation, qui pointe la
   confusion la plus fréquente ? Reco : oui.
4. **CE2-042, 043, 044** (0 modèle) : ajouter `CE2` aux grades de 5d-1 et 5d-2 (et le tag CE2-042, 044), ou les
   laisser au chantier `questions-ce2` ? Reco : les laisser (CE2-043 demande le compas, et les plages du CE2 sont
   plus petites).

**Question d'accès** : brouillons, puis migration nœud + tag → **personne** ne gagne d'accès.

### 15 bis. Lot 5d : réponse de David (2026-11-02)

« je suis tes recos », en réponse aux quatre questions du § 15 : 1. **quatre modèles** (075 coupé en « calculer » et
« retrouver un côté ») ; 2. variation **règle** (côtés bout à bout au-dessus de la règle dessinée) gardée ; 3.
variation **aire ≠ périmètre** gardée ; 4. CE2-042, 043, 044 laissés au chantier `questions-ce2`.

### 15 ter. Lot 5d — écriture (2026-11-02)

- Script `docs/wip/questions/lot-cm1-5d.py` → `scripts/questions/cm1-5d/` (4 JSON), patrons `lot-cm1-5a.py`
  (virgule exigée) et `lot-ce1-10.py` (règle dessinée, choix de dessins). Catégorie `Grandeurs · Périmètres ·
Périmètre d'un polygone`, niveaux 1 à 4 (catégorie neuve).
- **Premières figures dans les options d'une case « choix »** (073, quatre dessins du même polygone) : rendu vu dans
  l'aperçu à 390 px, correct. `sonde-figures` ne passe pas ces figures-là (121 blocs pour 300 tirages) : à voir à
  l'œil sur la page à cocher.
- Piège : dans un bloc `figure`, `{{eval:a/2}}` sort une fraction (`\dfrac{27}{5}`), refusée par le moteur → toujours
  `;d` (`evd`) pour une coordonnée qui divise. Fenêtre de la règle : `-0.5 ; 3.9` en hauteur (3.4 : « fenêtre trop
  allongée », rapport < 1/4).
- Aperçu Playwright : ne pas injecter de CSS `div{height:auto}` pour dérouler la page, il efface les formules ;
  fenêtre de 2 600 px de haut à la place (script dans le scratchpad).
- `question:specs` 300 tirages par variation : tout réussi, 49 specs vertes ; `sonde-figures` : 0 problème ;
  `create-questions` en simulation (prod) : 4/4 verts ; base locale : 4 brouillons, variations vues à 390 px (pas de
  défilement horizontal).

### 15 quater. Lot 5d — création en prod refusée, puis 5d-1 abandonné (2026-11-15)

- `create-questions --publier` (après #2694) n'a rien écrit : depuis l'ADR 0035, le script refuse les champs
  `theme` / `domain` / `subdomain` (ancien quadruplet). Retirés du générateur `lot-cm1-5d.py`, fichiers régénérés.
- Puis homonyme : « Qu'est-ce que le périmètre ? », niveau 1, existe déjà au CE2 (a43667e9, publié le 2026-11-06,
  tagué CE2-042, mêmes trois variations). **David, 2026-11-15 : réutiliser le modèle CE2** → 5d-1 n'est pas créé ;
  a43667e9 reçoit le niveau `CM1` et le tag CM1-073. Le lot 5d compte donc **3 modèles neufs** (5d-2, 5d-3, 5d-4).
- Simulation prod : 3/3 « à créer ».

### 15 quinquies. Lot 5d — création et migration nœud + tags (2026-11-15)

- `create-questions --publier` (David, 2026-11-15) : 3 brouillons, 3a6017c8 (5d-2, CM1-074), 396c543f (5d-3,
  CM1-075), d6633d24 (5d-4, CM1-075) ; ids écrits dans les fichiers.
- **Accès** (David, 2026-11-15, « je suis tes recos ») : a43667e9 reçoit le niveau CM1 → les élèves de CM1 le voient
  tout de suite (déjà relu et publié pour le CE2, même point) ; les 3 neufs restent des brouillons.
- Migration `20261115192344_questions_cm1_lot5d_rangement_tags`, générée par `lot-cm1-5d-rangement.py` (gabarit :
  `questions-5/lot-13-rangement.py`, qui gère niveaux et tags gardés), depuis l'instantané
  `etat-prod-2026-11-15-cm1-5d/` (`releve-prod-cm1.ts`, aligné : sans quadruplet, CE2 ajouté aux points). Test
  `questions-cm1-lot5d-rangement-tags.test.ts` : 20 verts, rouges avec une migration vide.

### 15 sexies. Lot 5d — migration passée, page à cocher (2026-11-15)

- #2698 mergée ; `db:migrate` lancé par David depuis le worktree (lien Supabase copié de `../ubumaths/supabase/.temp/`,
  ignoré par git ; une seule migration en attente, la nôtre). Vérifié au MCP : 3 brouillons sur « Périmètres »
  (CM1-074, CM1-075 ×2), a43667e9 publié en `{CE2,CM1}` avec CE2-042 et CM1-073, `updated_at` préservés.
- Page à cocher des 3 brouillons : https://claude.ai/artifact/Y8BhbpCTG5hs4GK7JJ2Lnu (`verdicts`, capacité `db`).

### 15 septies. Lots 5b et 5d — publication (2026-11-15)

- Pages à cocher : lot 5b 10 « OK » sur 10, lot 5d 3 sur 3, aucun commentaire. `publier-lot` en simulation : 13/13 ;
  `--publier` lancé par David ; vérifié au MCP : 13 publiés. Vérification manuelle notée (périmètres au CM1, #2698).
- **Lots 5b et 5d clos.** Le découpage du lot 5 (§ 14) est entièrement livré.

## 16. Recompte et lot 6 — problèmes : phase 0 (à valider)

Relevé MCP du 2026-11-15 : **94 points du CM1 sur 171 ont au moins un modèle** (tous publiés). Restent sans modèle :

- **Lot 6, problèmes (prochain dans l'ordre du § 4 bis)** : 054, 134, 055, 056, 057, 058, 059, 060.
- **Oubliés des lots 2 et 4** (classés A ou B au § 3, jamais mis dans un lot) : 001, 002, 131 (collections
  organisées, unités de numération), 010, 143 (droite graduée des entiers), 024 (unités, dixièmes, centièmes, annoncé
  au lot 4 au § 9 mais absent de son tableau), 048 (estimer).
- **Plus loin dans l'ordre** : algèbre 062-066 ; aires 086-088, angles 089-091, heures 092-095, 166 ; géométrie
  097-119 ; données 120-139, 169-172 ; probabilités 123-128 ; proportionnalité 129, 130.
- **D, sans modèle (décidé)** : 140, 097, 104, 105, 114, 116, 119.

Patrons : `scripts/questions/ce2-5/` (12 modèles, tous publiés, nœuds « Problèmes arithmétiques › parties-tout,
comparaison, multiplicatifs, en deux étapes ou plus, produits cartésiens »). « Problèmes arithmétiques › optimisation »
existe déjà et ne contient aucun modèle. Pour le CM2, aucun modèle de problème n'est tagué. Niveaux : à la suite de
ceux en place (parties-tout ≤ 22, comparaison ≤ 3, multiplicatifs ≤ 11, en deux étapes ≤ 9, produits cartésiens 1),
relevés une nouvelle fois juste avant la création.

Bornes `cycle3.json`, CM1 : entiers jusqu'à 999 999, décimaux, fractions du CM1 ; « plus la structure est complexe,
plus le champ numérique est réduit » (BO) ; 056 s'appuie sur les tables ; 057 : « fois plus », « fois moins », en une
ou deux étapes ; 058 : deux ou trois étapes, les quatre opérations ; 059 : tableau, arbre ou liste (6 × 3 tenues,
sommes de deux dés, dominos de 0 à 4) ; 060 : optimisation sous plusieurs contraintes (bracelets). Le BO demande aussi
des énoncés où « plus » appelle une soustraction : une variation par modèle de comparaison.

| #    | Point   | Sous-notion            | Modèle                                       | Variations, plages                                                                                                                                                                                                                         |
| ---- | ------- | ---------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 6-1  | CM1-054 | parties-tout           | Problèmes parties-tout (jusqu'à 999 999)     | V1 le tout (deux ou trois parties) ; V2 une partie (le tout et l'autre partie) ; V3 l'état de départ (« j'en ai vendu a, il m'en reste b ») ; entiers de 1 000 à 999 999                                                                   |
| 6-2  | CM1-054 | parties-tout           | Problèmes parties-tout : décimaux, fractions | V1 le tout, prix ou longueurs à deux décimales ; V2 une partie, décimale ; V3 fractions de même dénominateur (≤ 20), le tout ou une partie                                                                                                 |
| 6-3  | CM1-134 | comparaison            | Problèmes de comparaison                     | V1 « a de plus que » → le plus grand ; V2 l'écart (« combien de plus ? ») ; V3 « a de plus que » → le plus petit (le « plus » qui demande une soustraction) ; V4 décimaux et deux unités (Alix 1,61 m, 13 cm de plus que Bruno)            |
| 6-4  | CM1-055 | en deux étapes ou plus | Problèmes additifs en deux ou trois étapes   | V1 stock + arrivée − départ ; V2 comparaison puis total (« combien en tout ? ») ; V3 deux achats à virgule et un billet, la monnaie rendue ; V4 trois étapes (quatre données) ; grands entiers, ou décimaux à deux décimales               |
| 6-5  | CM1-056 | multiplicatifs         | Problèmes multiplicatifs : partage exact     | V1 le tout (n paquets de p) ; V2 la valeur d'une part ; V3 le nombre de parts ; produits des tables de 2 à 10, éventuellement × 10 ou × 100 (7 × 80)                                                                                       |
| 6-6  | CM1-056 | multiplicatifs         | Problèmes de partage avec un reste           | V1 « combien de boîtes pleines ? » (le quotient) ; V2 « combien de boîtes pour **tout** ranger ? » (le quotient + 1) ; V3 « combien en reste-t-il ? » (le reste) ; diviseur de 2 à 9, dividende ≤ 99                                       |
| 6-7  | CM1-057 | comparaison            | Comparaison multiplicative                   | V1 « k fois plus » → le plus grand ; V2 « k fois moins » → le plus petit ; V3 « k fois plus que » → le plus petit (piège) ; V4 deux étapes (« combien en tout ? », « combien de plus ? ») ; k de 2 à 10                                    |
| 6-8  | CM1-058 | en deux étapes ou plus | Problèmes mixtes en deux ou trois étapes     | V1 groupes de deux tailles (g tables de n, h tables de m) ; V2 achats identiques à virgule (× un entier < 10), puis la monnaie rendue ; V3 trois étapes (places, réservations) ; V4 un partage puis une addition ou une soustraction       |
| 6-9  | CM1-059 | produits cartésiens    | Problèmes de dénombrement                    | V1 deux choix (6 hauts × 3 bas) ; V2 trois choix (menus) ; V3 deux dés, un rouge et un bleu : combien de façons d'obtenir la somme s ? (s de 3 à 11) ; V4 dominos de 0 à n (n de 3 à 6) : combien de dominos différents ?                  |
| 6-10 | CM1-060 | optimisation           | Problèmes d'optimisation                     | V1 bracelets de a perles rouges et b bleues, avec R rouges et B bleues : combien de bracelets au plus ? (le plus petit des deux quotients, jamais égaux) ; V2 payer S € exactement en pièces de 2 € et de 5 €, le moins de pièces possible |

Forme commune : une case, la réponse suivie de son unité (« Il y a ? billes ») ; décimaux à virgule exigée, comme aux
lots 4 et 5 ; fractions : toute fraction égale acceptée, comme dans le patron CE2 `4f47f8d6`. Le corrigé suit les
quatre phases (comprendre, calculer, répondre, vérifier) : une ligne qui dit l'opération, une phrase réponse, une
vérification de vraisemblance. Specs d'erreurs typiques : la mauvaise opération (a + d à la place de a − d en V3),
l'écart pris pour une valeur, l'oubli du + 1 dans « tout ranger », le quotient à la place du reste, le produit des
choix additionné, la somme 7 comptée une seule fois, les dominos doubles oubliés ou comptés deux fois.

Questions :

1. **Découpage** : un lot de 10 modèles (ci-dessus), une PR de fichiers et une migration ; ou deux lots, 6a additifs
   (6-1 à 6-4) et 6b multiplicatifs, dénombrement, optimisation (6-5 à 6-10) ? Reco : **un seul lot**, puisque les
   patrons CE2 sont tous là.
2. **Schéma en barres dans le corrigé** (` ```schema-barres `, en prod depuis #2597) pour 6-1, 6-3, 6-7 : le corrigé
   dessine le schéma, et l'énoncé n'en montre pas ? Reco : **oui**, c'est la façon dont le BO fait modéliser.
3. **Les oubliés** (001, 002, 131, 010, 143, 024, 048) : en faire un **lot 6 bis « rattrapage »** juste après le lot 6
   (7 points, outils en prod : case, `collection`, `line` avec `placer:`, case « choix » pour estimer), plutôt que de
   les laisser jusqu'à la fin ? Reco : oui, juste après.
4. **Algèbre (062-066)**, absente de l'ordre du § 4 bis : en faire un lot 6 ter, entre les problèmes et les données ?
   Reco : oui (063 profite du schéma en barres, comme 6-142).

**Question d'accès** : brouillons, puis migration nœud + tag → **personne** ne gagne d'accès.

### 16 bis. Lot 6 : réponse de David (2026-11-15)

« je te suis », en réponse aux quatre recommandations du § 16 : 1. **un seul lot** de 10 modèles ; 2. schéma en barres
(` ```schema-barres `) dans le **corrigé** de 6-1, 6-3 et 6-7, aucun dans l'énoncé ; 3. **lot 6 bis « rattrapage »**
(001, 002, 131, 010, 143, 024, 048) juste après ; 4. **lot 6 ter « algèbre »** (062-066) entre les problèmes et les
données.

### 16 ter. Lot 6 — écriture (2026-11-15)

- Script `docs/wip/questions/lot-cm1-6.py` → `scripts/questions/cm1-6/` (10 JSON, 34 variations), patron
  `lot-ce2-5.py`. Niveaux : parties-tout 23, 24 ; comparaison 4 (6-3), 5 (6-7) ; multiplicatifs 12, 13 ; en deux étapes
  ou plus 10 (6-4), 11 (6-8) ; produits cartésiens 2 ; optimisation 1. À relever une nouvelle fois avant la création en prod.
- Schéma en barres au corrigé de 6-1, 6-3, 6-7 ; inconnue marquée « ? ». Prix à deux décimales (`zeros: off` sur 6-2,
  6-4, 6-8 : 12,6 accepté pour 12,60). 6-2 V3 et 6-7 V4 tirent l'une de deux questions (variable `t`).
  6-9 V3 précise que 1 rouge + 2 bleu ≠ 2 rouge + 1 bleu ; 6-10 V2 : S de 11 à 49, jamais multiple de 5.
- `question:specs` 300 tirages par variation : 10 200 / 10 200, 121 specs vertes ; `create-questions` en simulation
  (prod) : 10 « à créer » ; sonde jetable des ` ```schema-barres ` (`parseSchemaBarresContent`) : 3 600 blocs, 0 problème.
- Base locale (copie du dossier, pour ne pas écrire d'id local dans les fichiers ; `DOTENV_CONFIG_PATH=.env.local`) :
  10 brouillons, aperçu admin à 390 px, réponse fausse puis corrigé : rendu correct, schémas lisibles. Le défilement
  horizontal de la page (≈ 525 px) vient du badge « Template ID » de l'admin, pas des questions.
- Titre de 6-8 : même titre que le modèle CE2 `43b40fc7` ; **David, 2026-11-15** : renommé « Problèmes mixtes : les
  quatre opérations » (ses nombres restent petits, « jusqu'à 999 999 » aurait été faux).

- #2701 mergée (CI verte), branche supprimée. Titre de 6-8 changé avant le merge.

### 16 quater. Lot 6 — création en prod et rangement (2026-11-15)

- David a lancé `create-questions --dir scripts/questions/cm1-6 --publier` depuis le dépôt principal : 10 brouillons
  CM1, sans nœud ni tag ; ids copiés dans le worktree et commités. Niveaux (`level`) revérifiés au MCP : 23, 24
  (parties-tout, en place ≤ 22), 4, 5 (comparaison, ≤ 3), 10, 11 (en deux étapes, ≤ 9), 12, 13 (multiplicatifs, ≤ 11),
  2 (produits cartésiens, 1), 1 (optimisation, vide) : aucun chevauchement.
- Relevé `etat-prod-2026-11-15-cm1-6/` (`releve-prod-cm1.ts`), script `lot-cm1-6-rangement.py` (gabarit 5d) →
  migration `20261115213402_questions_cm1_lot6_rangement_tags` + fixture : 10 rangés sur la sous-notion de leur point,
  10 tags posés (CM1-054 ×2, 055, 056 ×2, 057, 058, 059, 060, 134), aucun niveau ni statut changé.
- Test `questions-cm1-lot6-rangement-tags.test.ts` : 20/20 vert ; corps neutralisé (`select 1;`) : 9 échecs + suite
  principale sautée. Le cas « tag posé à la main sur un brouillon » du gabarit est impossible (trigger : pas de tag
  sans nœud) : remplacé par « rangé ET tagué à la main ».
- #2706 mergée (CI verte, `check:migrations --pr 2706` passé, `security-auditor` : aucun finding), branche supprimée ;
  `db:migrate` lancé par David ; vérifié au MCP le 2026-11-16 : migration enregistrée, 10 nœuds, 10 tags.

### 16 quinquies. Lot 6 — page à cocher (2026-11-16)

- `page-a-cocher.ts --dir scripts/questions/cm1-6` : 10 fiches (34 exemples), aucune alerte (10 brouillons, nœud et
  point lus en base). Page : https://claude.ai/artifact/HWS96WKixXmh7KdmsDf1Qv (`verdicts`, capacité `db`, vide).

### 16 sexies. Lot 6 — publication (2026-11-16)

- Page à cocher : 10 « OK » sur 10, aucun commentaire. `publier-lot` en simulation : 10/10 ; `garde-niveaux-tags` :
  aucun niveau manquant ; `--publier` lancé par David ; vérifié au MCP : 10 publiés. Vérification manuelle notée
  (problèmes au CM1, schéma en barres du corrigé, #2706).
- **Lot 6 clos.** Recompte : 102 points couverts sur 171 (94 + 054, 134, 055 à 060).

## 17. Lot 6 bis — rattrapage : phase 0 (à valider, 2026-11-16)

Sept points, un modèle chacun, tous en outils déjà en prod. Bornes : `cycle3.json` (CM1). Le bloc `collection`
s'arrête à 9 999 (milliers ≤ 9, centaines ≤ 40, dizaines ≤ 30, unités ≤ 100) : au-delà, les unités de numération
s'écrivent en texte, comme l'exemple du BO. Niveaux : à la suite de ceux en place dans chaque sous-notion.

| #    | Point   | Sous-notion (niveau)                          | Titre                                        | Variations                                                                                                                                                                                                                                                                                                                              | Patron              |
| ---- | ------- | --------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| 6b-1 | CM1-001 | dénombrement (15)                             | Dénombrer des groupements                    | V1 `collection` à gros cubes, un rang à plus de dix (12 plaques, 23 barres…), total ≤ 9 999 ; V2 en texte, comme le BO : « 17 unités, 8 dizaines, 31 centaines et 2 milliers » → 5 197 ; V3 en texte avec dizaines et centaines de milliers (« 4 centaines de milliers, 15 milliers et 32 dizaines »), ≤ 999 999                        | CE2 `4df6c483`      |
| 6b-2 | CM1-002 | dénombrement (16)                             | Construire une quantité avec des paquets     | V1 `construire:` au matériel, 1 000 à 9 999 avec un zéro intercalé ; V2 « 34 560 timbres en carnets de 1 000, de 100 et de 10, le moins de carnets possible » → trois cases ; V3 un seul type de paquet : « combien de carnets de 100 pour 34 500 timbres ? » → 345                                                                     | CE2 `156dc0bd`      |
| 6b-3 | CM1-131 | ordre (15)                                    | Comparer deux collections                    | V1 `collection` double (`milliers: 2 ; 1`…), une collection a plus de dix plaques et l'autre plus de milliers ; V2 en texte (« A : 3 milliers et 15 centaines ; B : 4 milliers, 2 centaines et 8 dizaines ») ; réponse en case « choix » : A, B, autant (le cas « autant » tiré une fois sur cinq)                                      | `collection` à deux |
| 6b-4 | CM1-143 | droite graduée (4)                            | Lire un nombre sur une demi-droite graduée   | V1 pas de 1, 10 ou 100 ; V2 pas de 1 000 ou 10 000 ; V3 pas de 100 000, origine 0 ; deux graduations écrites, cinq intervalles entre elles, le pas à déduire ; tout ≤ 999 999                                                                                                                                                           | CM2 `c20b687f`      |
| 6b-5 | CM1-010 | droite graduée (5)                            | Placer un nombre sur une demi-droite graduée | mêmes trois variations, geste `placer:`                                                                                                                                                                                                                                                                                                 | CM2 `7df1aadd`      |
| 6b-6 | CM1-024 | Décimaux › décomposition (9)                  | Unités, dixièmes, centièmes                  | V1 1 unité = ? dixièmes / ? centièmes, 1 dixième = ? centièmes ; V2 k unités ou k dixièmes = ? (plus petite unité) ; V3 en sens inverse : 40 dixièmes = ? unités, 300 centièmes = ? unités, 70 centièmes = ? dixièmes ; V4 utiliser : 3 unités et 4 dixièmes = ? centièmes, 2,35 = ? centièmes. Pas de millièmes                        | CM2 `25b269de`      |
| 6b-7 | CM1-048 | Décimaux › arrondis et ordres de grandeur (9) | Estimer le résultat d'une opération          | V1 somme de trois nombres proches de centaines (212 + 298 + 496) ; V2 produit de deux nombres à deux chiffres proches de dizaines (52 × 37) ; V3 quotient par 2, 3, 4 ou 5 d'un nombre proche d'une centaine (597 ÷ 2) ; case « choix » de quatre valeurs (≈ 1 000, 10 fois plus, 10 fois moins, une erreur d'arrondi) ; corrigé avec ≈ | BO, exemples p.10   |

Forme commune : réponses entières en case ; corrigé qui dit l'unité de numération (« 31 centaines, c'est 3 milliers et
1 centaine »). Specs d'erreurs typiques : chiffres juxtaposés sans retenue (« 2 31 8 17 »), rang oublié, pas lu comme
1, intervalle compté pour une graduation, 1 unité = 10 centièmes, l'estimation pour le calcul exact.

Questions :

1. **Sous-notion de 6b-7** : le point CM1-048 est rangé sous « Décimaux › arrondis et ordres de grandeur », mais
   estimer porte ici sur des entiers. Je le laisse là (c'est le rangement du point, le tag en dépend) ? Reco : oui.
2. **6b-2 V1** : la construction au matériel existe déjà au CE2 (`156dc0bd`, jusqu'à 9 999). La garder au CM1 pour
   le zéro intercalé, ou n'écrire que V2 et V3 en texte ? Reco : la garder, une variation sur trois.
3. **Niveaux de la droite graduée** : les modèles CM2 sont aux niveaux 2 et 3, comme ceux du CE2 ; je mets le CM1 à
   4 et 5 (à la suite), sans toucher au CM2. D'accord ?

**Question d'accès** : brouillons, puis migration nœud + tag → **personne** ne gagne d'accès.

### 17 bis. Lot 6 bis : réponse de David (2026-11-16)

« go » après mes trois recommandations : 1. 6b-7 rangé sous « Décimaux › arrondis et ordres de grandeur » (rangement
du point) ; 2. 6b-2 V1 (matériel, zéro intercalé) gardée, une variation sur trois ; 3. droite graduée du CM1 aux
niveaux 4 et 5, le CM2 laissé à 2 et 3 (écart connu, pas corrigé).

### 17 ter. Lot 6 bis — écriture (2026-11-16)

- Script `docs/wip/questions/lot-cm1-6bis.py` → `scripts/questions/cm1-6bis/` (7 JSON, 22 variations). Patrons
  relevés en lecture seule : `etat-prod-2026-11-16-cm1-6bis-patrons/` (CE2 `4df6c483`, `156dc0bd`, `86f0ca3b` ; CM2
  `c20b687f`, `7df1aadd`, `25b269de` ; CM1 `1e01404d`).
- Niveaux : dénombrement 15 (6b-1), 16 (6b-2) ; ordre 15 (6b-3) ; droite graduée 4 (6b-4), 5 (6b-5) ; décomposition 9
  (6b-6) ; arrondis et ordres de grandeur 9 (6b-7).
- 6b-3 : A / autant / B en `melanger: non`, attendu `sign(vB-vA)+1` ; écart tiré de −2 à 2 (« autant » une fois sur
  cinq), `s` échange les collections. 6b-7 : la bonne valeur en premier (indice 0), mélangée à l'affichage ; leurres
  10 fois plus, 10 fois moins, une erreur (S + 200, arrondi d'un seul facteur, quotient oublié). 6b-4/5 V2 : `b`
  borné selon le pas pour que la fin de la droite reste ≤ 990 000.
- Pièges vus : **une plage négative (`-12..12`) ne se tire pas**, passer par `x0` puis `eval:x0-12` ; **`i` est lu
  comme l'imaginaire** (« Complex numbers not supported ») ; `e` évité (Euler) ; une couleur hors `$` est refusée
  (`$\textcolor{…}{\text{A}}$`).
- `question:specs` 300 tirages par variation : 6 600 / 6 600, 52 specs vertes ; `sonde-collections` 365 blocs et
  `sonde-horloges` (droites) : 0 problème ; `create-questions` en simulation (prod) : 7 « à créer ».
- Base locale (copie du dossier, `DOTENV_CONFIG_PATH=.env.local`) : 7 brouillons ; aperçu admin à 390 px (Playwright),
  énoncés et corrigés : collections, droites graduées, choix et nombres groupés rendus correctement.
- #2726 mergée (CI verte), branche supprimée.

### 17 quater. Lot 6 bis — création en prod et rangement (2026-11-16)

- David a lancé `create-questions --dir scripts/questions/cm1-6bis --publier` depuis le dépôt principal : 7 brouillons
  CM1, sans nœud ni tag ; ids copiés dans le worktree et commités. Niveaux revérifiés au MCP, à la suite de ceux en
  place (tous niveaux scolaires) : dénombrement 15, 16 (≤ 14) ; ordre 15 (≤ 14) ; droite graduée 4, 5 (≤ 3) ;
  Décimaux › décomposition 9 (≤ 8) ; arrondis et ordres de grandeur 9 (≤ 8) : aucun chevauchement.
- Relevé `etat-prod-2026-11-16-cm1-6bis/` (`releve-prod-cm1.ts`), script `lot-cm1-6bis-rangement.py` (gabarit 6) →
  migration `20261116193751_questions_cm1_lot6bis_rangement_tags` + fixture : 7 rangés sur la sous-notion de leur
  point, 7 tags posés (CM1-001, 002, 131, 143, 010, 024, 048), aucun niveau ni statut changé.
- Test `questions-cm1-lot6bis-rangement-tags.test.ts` : 20/20 vert ; corps neutralisé (`select 1;`) : 9 échecs + suite
  principale sautée.
- `types:cliquet` tenu ; `security-auditor` : aucun finding (diff avec la migration du lot 6 : préfixe des tables
  temporaires, comptes, données ; état « avant » remesuré au MCP).
- #2729 mergée (CI verte, `check:migrations --pr 2729` passé ; merge retardé par un `deploy:prod` en cours), branche
  supprimée. `db:migrate` : à lancer par David.

### 17 quinquies. Lot 6 bis — migration passée, page à cocher (2026-11-16)

- `20261116193751_questions_cm1_lot6bis_rangement_tags` trouvée dans `schema_migrations` en prod (passée par une
  autre session). Vérifié au MCP : 7 brouillons CM1, chacun avec un nœud et son tag (CM1-001, 002, 010, 024, 048, 131,
  143).
- `page-a-cocher.ts --dir scripts/questions/cm1-6bis` : 7 fiches (22 exemples), aucune alerte. Page :
  https://claude.ai/artifact/WZXanUL8XBoMJYNvJZPcFm (`verdicts`, capacité `db`, vide).

### 17 sexies. Lot 6 bis — publication (2026-11-16)

- Page à cocher : 7 « OK » sur 7, aucun commentaire. `publier-lot` en simulation : 7/7 ; `garde-niveaux-tags` :
  aucun niveau manquant ; `--publier` lancé par David ; vérifié au MCP : 7 publiés. Vérification manuelle notée
  (numération au CM1, #2726, #2729).
- **Lot 6 bis clos.** Recompte : 109 points couverts sur 171 (102 + 001, 002, 010, 024, 048, 131, 143).

## 18. Lot 6 ter — algèbre : phase 0 (à valider, 2026-11-16)

Relevé MCP du 2026-11-16 : 062, 063, 064, 065, 066 n'ont aucun modèle. Leurs nœuds, sous « Algèbre › Premiers pas
algébriques » : 062 et 063 → **nombre inconnu** (6 modèles de 6e, 6-142, schémas en barres, niveaux 1 et 2) ;
064 → **programmes de calcul** (2 modèles de CM2, niveau 1 : `98f54315` exécuter, trois étapes, mots ou Scratch ;
`42881663` le nombre de départ) ; 065 et 066 → **suites de motifs** (1 modèle de 6e, `39bafe0e`, motif d'allumettes
dessiné en ` ```figure `). Aucun nœud à créer.

Bornes (`cycle3.json`, exemples de réussite CM1 2025 p.13-14, relus dans le PDF) : 062, balances (k crayons
identiques = 250 g ; 3 paires de ciseaux + 140 g = 500 g) et « Rose a choisi N, 3 × (2 + N) = 27 » ; 063, « en
ajoutant 7 au triple du nombre de Mia, on trouve 100 », appuyé sur un schéma en barres ; 064, **au plus deux étapes**,
nombre de départ entier, en mots (ajouter 2, puis multiplier par 4) ou en Scratch ; 065, **les trois termes
suivants** de 3 ; 7 ; 11 (+4), 4 ; 12 ; 36 (×3), 80 ; 85 ; 83 ; 88 (+5 −2), 1 ; 2 ; 6 ; 7 (+1 +4), et formuler la
règle ; 066, nombre d'éléments aux **trois étapes suivantes** (cœurs : 3, 6, 9 ; ronds : + le numéro de l'étape),
règle dite à partir de l'étape précédente.

Outils, tous en prod : balance dessinée en ` ```figure ` (patron CP `5592a129`, `cp-b3/07-balance.json`, à
l'équilibre ici), ` ```schema-barres `, ` ```scratch ` (CM2 `98f54315`), case « choix » (lot 6 bis, 048), motifs en
` ```figure ` (patron 6e `39bafe0e`). Classe A ou B pour les cinq points : rien à créer.

| #    | Point   | Sous-notion          | Modèle                                        | Variations, plages                                                                                                                                                                                                               |
| ---- | ------- | -------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 6t-1 | CM1-062 | nombre inconnu       | Balance : la masse d'un objet                 | Balance à l'équilibre dessinée. V1 k objets identiques = M g (k de 2 à 6, un objet de 5 à 60 g) ; V2 k objets + a g = M g (k de 2 à 4, comme les ciseaux) ; V3 k objets = deux masses (a g et b g) ; une case, en g              |
| 6t-2 | CM1-062 | nombre inconnu       | Trouver le nombre choisi                      | V1 « Rose a choisi N ; k × (a + N) = r » (k de 2 à 5) ; V2 « N × k + a = r » ; V3 symboles : ▲ + ▲ + ▲ = s, puis ▲ + ● = t, valeur de ● ; N, ▲, ● entiers de 1 à 50 ; une case                                                   |
| 6t-3 | CM1-063 | nombre inconnu       | Schéma en barres : le nombre choisi           | V1 le triple (k de 2 à 5) plus b donne r (r ≤ 200) ; V2 k fois le nombre moins b donne r ; V3 deux enfants ont T billes, l'un k fois plus que l'autre ; V4 somme et écart (T ≤ 200) ; schéma en barres dessiné (voir question 2) |
| 6t-4 | CM1-064 | programmes de calcul | Exécuter un programme de calcul (deux étapes) | V1 ajouter a, puis multiplier par b (l'exemple du BO) ; V2 multiplier par a, puis ajouter b ; V3 multiplier par a, puis retirer b ; V4 le même en Scratch (deux instructions) ; départ de 2 à 20 ; une case                      |
| 6t-5 | CM1-065 | suites de motifs     | Suite de nombres : les trois termes suivants  | Cinq termes donnés (quatre pour ×). V1 + a (a de 2 à 12) ; V2 × k (k = 2 ou 3, départ de 1 à 5) ; V3 + a − b en alternance (a > b) ; V4 + a + b en alternance ; termes ≤ 999 999 ; trois cases                                   |
| 6t-6 | CM1-065 | suites de motifs     | Suite de nombres : choisir la règle           | Les mêmes quatre suites ; case « choix », quatre règles en phrases (« on ajoute 4 à chaque fois », « on multiplie par 3 », « on ajoute 5, puis on retire 2 », « on ajoute 4, puis on retire 1 »…), une seule juste               |
| 6t-7 | CM1-066 | suites de motifs     | Motif évolutif : les trois étapes suivantes   | Trois étapes dessinées. V1 colonnes de k jetons (+ k, comme les cœurs, k de 2 à 4) ; V2 escalier de ronds (1, 3, 6 : + le numéro de l'étape) ; V3 carrés d'allumettes accolés (4, 7, 10) ; trois cases (étapes 4, 5, 6)          |
| 6t-8 | CM1-066 | suites de motifs     | Motif évolutif : choisir la règle             | Les mêmes motifs ; case « choix » : « à chaque étape, on ajoute k », « on ajoute le numéro de l'étape », « on double »…, une seule juste                                                                                         |

Forme commune : réponses entières, une case par nombre. Corrigé : l'opération inverse pas à pas (on retire, puis on
partage), une vérification qui remet le nombre trouvé dans l'énoncé ; pour les suites et les motifs, les flèches de
la règle écrites en ligne (« 15 + 4 = 19 »). Specs d'erreurs typiques : M ÷ k sans retirer a ; 27 ÷ 3 = 9 rendu pour N
(le 2 oublié) ; 100 ÷ 3 ; une seule des deux règles d'une suite alternée appliquée à chaque fois ; + 2 au lieu de

- le numéro de l'étape ; dans un programme, les étapes faites dans l'autre ordre.

Questions :

1. **Découpage** : un lot de 8 modèles (ci-dessus), une PR de fichiers et une migration ? Reco : **oui**.
2. **Schéma en barres de 6t-3 dans l'énoncé** (avec « ? »), et pas seulement dans le corrigé comme au lot 6 : ici le
   point est de « s'appuyer sur un schéma », et l'exemple du BO le dessine. Reco : **dans l'énoncé et dans le
   corrigé**, comme les patrons de 6e.
3. **« Formuler la règle » en case « choix »** (6t-6, 6t-8), puisqu'une phrase libre ne se corrige pas : reco **oui**.
   Sinon, la règle reste dans le seul corrigé, et 6t-6 et 6t-8 disparaissent.
4. **Niveaux** : les modèles du CM1 prennent le **niveau 1** de leur nœud, à côté des modèles de 6e et de CM2 qui y
   sont déjà (plusieurs modèles partagent déjà le niveau 1), sans renuméroter personne. Reco : **oui**.
5. **065 (suites de nombres) sous « suites de motifs »**, le nœud de son point, sans créer de sous-notion « suites de
   nombres ». Reco : **oui** (le nom du nœud se discute à part, s'il le faut).

**Question d'accès** : brouillons, puis migration nœud + tag → **personne** ne gagne d'accès.

### 18 bis. Lot 6 ter : réponse de David (2026-11-16)

« je te suis », en réponse aux cinq recommandations du § 18 : 1. **un seul lot** de 8 modèles ; 2. schéma en barres
de 6t-3 **dans l'énoncé et dans le corrigé** ; 3. « formuler la règle » en **case « choix »** (6t-6, 6t-8) ; 4. **niveau 1** dans chaque nœud, sans renuméroter personne ; 5. 065 rangé sous **« suites de motifs »**, aucun nœud
créé.

### 18 ter. Lot 6 ter — écriture (2026-11-16)

- Script `docs/wip/questions/lot-cm1-6ter.py` → `scripts/questions/cm1-6ter/` (8 JSON, 30 variations, niveau 1
  partout). Patrons : balance CP `5592a129` (refaite à l'équilibre, fléau horizontal, billes bleues, masses en
  rectangles jaunes ; la masse de gauche posée juste après les billes), schémas en barres de 6e `399342ff` et
  `d79ea0bc`, Scratch du CM2 `98f54315`, motifs de 6e `39bafe0e`.
- 6t-3 V2 (« k fois, moins b ») : deux barres, les k parts au-dessus, en dessous r puis b en pointillés (`-b`),
  longueurs `2k` et `2k − 1 ; 1`. 6t-5 : une case par nombre, avec son rang (« 7e nombre »), parce que trois cases sur
  une ligne passent à la ligne avec un « ; » seul à 390 px. 6t-2 V3 : symboles `{\square}`, `{\triangle}`.
- Leurres des « choix » : une règle vraie au premier pas seulement (× k : « on ajoute u(k − 1) », escalier : « on
  ajoute 2 »), l'alternance à l'envers, la somme des deux pas « à chaque fois », 4 allumettes par carré, 3 par
  triangle.
- `question:specs` 300 tirages par variation : 9 000 / 9 000, 62 specs vertes ; `sonde-figures` : 0 problème ;
  schémas en barres passés à `parseSchemaBarresContent` et formules à `validateLatex` (sonde jetable) : 0 problème ;
  `create-questions` en simulation (prod) : 8 « à créer ».
- Base locale (copie du dossier, `.env.local`), **sous le verrou `supabase`** (`scripts/with-db-lock.sh`) : une autre
  session a remis la base à zéro juste après ma première création, mes 8 brouillons ont disparu sans un mot. Aperçu
  admin à 390 px (Playwright, onglet « Flash-card » puis « Voir la correction ») : balances, schémas, Scratch, suites,
  motifs et choix rendus correctement. Piège zsh : `$ids` ne se découpe pas, écrire `${=ids}`.

### 18 quater. Lot 6 ter — création en prod et rangement (2026-11-17)

- #2734 mergée. `create-questions --dir scripts/questions/cm1-6ter --publier` lancé par David : 8 brouillons CM1
  (vérifiés au MCP : draft, niveau 1, sans nœud ni tag) ; ids commités sur `feat/questions-cm1-lot6ter-rangement`.
- Relevé `etat-prod-2026-11-17-cm1-6ter/` (`releve-prod-cm1.ts`), script `lot-cm1-6ter-rangement.py` (gabarit 6 bis)
  → migration `20261117113333_questions_cm1_lot6ter_rangement_tags` + fixture : 8 rangés sous « Algèbre › Premiers pas
  algébriques » (nombre inconnu : b28c7f78, 98f558e4 → 062, c4011427 → 063 ; programmes de calcul : 2d7d0e63 → 064 ;
  suites de motifs : b47f2699, e59976bf → 065, 37dd213b, ac5fcd5c → 066), 8 tags posés, aucun niveau ni statut
  changé.
- Test `questions-cm1-lot6ter-rangement-tags.test.ts` : 20/20 vert ; corps neutralisé (`select 1;`) : 9 échecs + suite
  principale sautée. `types:cliquet` tenu ; `security-auditor` : aucun finding (diff avec la 6 bis : données,
  compteurs, préfixe `_qcm1l6t_` ; état « avant » remesuré au MCP).
- #2740 mergée (CI verte, `check:migrations --pr 2740` passé ; conflit sur « Reprendre ici » seulement), branche
  supprimée.

### 18 quinquies. Lot 6 ter — migration passée, page à cocher (2026-11-17)

- `db:migrate` lancé par David. Vérifié au MCP : `20261117113333` dans `schema_migrations` ; 8 brouillons CM1, chacun
  sur son nœud avec son tag (062 ×2, 063, 064, 065 ×2, 066 ×2).
- `page-a-cocher.ts --dir scripts/questions/cm1-6ter` : 8 fiches (30 exemples), une alerte (bloc `scratch` de
  2d7d0e63 non dessiné : déjà vu dans l'aperçu admin à 390 px, § 18 ter). Page :
  https://claude.ai/artifact/XiA4snkC73LZt3Ktvsny5Q (`verdicts`, capacité `db`, vide).

### 18 sexies. Lot 6 ter — publié (2026-11-17)

- Page à cocher : 8 « OK » sur 8, aucun commentaire. `publier-lot --dir scripts/questions/cm1-6ter` (simulation),
  `garde-niveaux-tags` et `--publier` lancés par David (le mode auto refuse ces scripts). Vérifié au MCP : 8 modèles
  `published`.

## 19. Lot 7 — données : phase 0 (à valider, 2026-11-17)

Recompte MCP du 2026-11-17 : **114 points sur 171**, tous publiés (109 + 062 à 066).

Points du lot (12) : 120, 121, 169 (tableau simple), 137, 170 (double entrée), 138, 171, 135 (diagramme en barres),
139, 172, 136 (courbe, repère), 122 (problèmes). **135 et 136 passent de C à B** : barres à construire et
`axe: à choisir` sont en prod (#1846 et suivantes, patron CE2 `3a8899e8`), le repère à points à placer aussi
(` ```courbe placer:`, #2096, patron 5e `324e90e2`) ; la courbe de données se dessine par ` ```courbe données:`.
Aucun modèle du CM2 sur ces points.

Nœuds (« Statistiques › Représenter des données »), tous existants : **tableaux** (120, 121, 169), **tableau à
double entrée** (137, 170), **diagrammes en barres** (135, 138, 171), **courbes et repères** (136, 139, 172) ; 122
est sur la notion elle-même, comme les deux modèles CE2-076. Aucun nœud à créer.

Patrons : `scripts/questions/ce2-7c/` (8 modèles CE2, tous publiés), `5-statistiques/09` et `10` (lire, interpréter
un graphique), `5-reperage/08` (placer des points). Bornes `cycle3.json` : 122, supports tableau simple ou double,
barres, courbe, **pas de diagramme circulaire** ; 135, échelle adaptée aux données ; 136, points éventuellement
reliés, échelle adaptée ; champ numérique du CM1 (entiers jusqu'à 999 999, décimaux).

| #    | Point   | Sous-notion             | Modèle                                       | Variations, plages                                                                                                                                                                                     |
| ---- | ------- | ----------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 7-1  | CM1-120 | tableaux                | Ranger un relevé dans un tableau             | V1 liste de 24 à 30 réponses, 4 ou 5 modalités, colonne des effectifs + Total ; V2 relevé de deux caractères (fille / garçon × sport) → tableau à double entrée à remplir                              |
| 7-2  | CM1-121 | tableaux                | Lire un tableau à simple entrée              | V1 la population d'une ville (5 villes, 10 000 à 999 999) ; V2 la ville qui a N habitants (choix) ; V3 longueurs de fleuves ou altitudes (km, m)                                                       |
| 7-3  | CM1-169 | tableaux                | Interpréter un tableau à simple entrée       | V1 la ville la plus, la moins peuplée (choix) ; V2 combien d'habitants de plus ; V3 combien de villes dépassent N ; mêmes tableaux qu'en 7-2                                                           |
| 7-4  | CM1-137 | tableau à double entrée | Lire un tableau à double entrée              | Sports × filles / garçons (4 ou 5 lignes) ; V1 une case (« combien de garçons font de la natation ? ») ; V2 la case d'un total ; nombres ≤ 999                                                         |
| 7-5  | CM1-170 | tableau à double entrée | Interpréter un tableau à double entrée       | V1 le sport qui attire le plus de filles (choix) ; V2 combien de garçons de plus que de filles dans un sport ; V3 le total d'un sport ; V4 le total général                                            |
| 7-6  | CM1-138 | diagrammes en barres    | Lire un diagramme en barres                  | Livres prêtés par mois ; V1 axe de 10 en 10 ; V2 de 20 en 20 ou de 25 en 25 ; V3 de 50 en 50 ; V4 une barre entre deux traits (la moitié d'une graduation)                                             |
| 7-7  | CM1-171 | diagrammes en barres    | Interpréter un diagramme en barres           | V1 combien de livres de plus en mars qu'en février ; V2 le mois où l'on a le plus prêté (choix) ; V3 combien en tout sur trois mois ; V4 combien de mois au-dessus de N                                |
| 7-8  | CM1-135 | diagrammes en barres    | Construire un diagramme en barres            | Tableau des effectifs donné, `axe: à choisir` puis `placer: toutes` ; données jusqu'à 100 (voir question 3) ; V1 échelle 2, V2 échelle 5, V3 échelle 10                                                |
| 7-9  | CM1-139 | courbes et repères      | Lire une courbe                              | Température heure par heure (8 h à 18 h), axe de 2 en 2 °C ; V1 « quelle température à 14 h ? » ; V2 « à quelle heure faisait-il N °C ? » (une seule heure possible)                                   |
| 7-10 | CM1-172 | courbes et repères      | Interpréter une courbe                       | Même courbe ; V1 à quelle heure la température est la plus haute ; V2 la plus basse ; V3 l'écart entre la plus haute et la plus basse ; V4 entre quelles heures elle baisse                            |
| 7-11 | CM1-136 | courbes et repères      | Placer les points d'un relevé dans un repère | Relevé de 5 valeurs, axes donnés ; V1 taille d'une plante semaine par semaine (cm, axe de 2 en 2) ; V2 température heure par heure (axe de 1 en 1) ; V3 poids d'un chiot mois par mois (axe de 5 en 5) |
| 7-12 | CM1-122 | Représenter des données | Problèmes : tableaux                         | V1 tableau de prix (entrées de cinéma, adulte / enfant), le coût d'une famille, deux étapes ; V2 double entrée, une différence puis un total ; V3 la ligne cachée par le total                         |
| 7-13 | CM1-122 | Représenter des données | Problèmes : diagramme en barres et courbe    | V1 barres, le total puis le partage en parts égales ; V2 barres, le mois manquant par le total de l'année ; V3 courbe, la hausse entre deux heures puis la prévision « si elle monte encore de… »      |

Forme commune : une case par réponse, l'unité après la case ; les questions « lequel » en case « choix », comme au
CE2 ; aucun nombre lu entre deux traits sauf la moitié (7-6 V4). Corrigé : où lire (ligne, colonne ; le haut de la
barre ; le point de la courbe), puis le calcul s'il y en a un. Specs d'erreurs typiques : ligne et colonne
inversées, le total pris pour une case, la graduation comptée pour 1, l'écart lu au lieu de la valeur, l'heure et la
température échangées, la plus grande hausse confondue avec la valeur la plus haute.

Questions :

1. **Découpage** : un lot de 13 modèles, une PR de fichiers et une migration ; ou deux lots, 7a tableaux (7-1 à 7-5,
   7-12) et 7b graphiques (7-6 à 7-11, 7-13) ? Reco : **un seul lot**, tous les patrons sont là.
2. **Villes de 7-2 et 7-3** : le BO cite Lyon. Des populations tirées au hasard sur de vraies villes donneraient des
   faits faux. Reco : **des villes inventées** (noms de villes du Royaume, ou « Alphaville », « Bétaville », comme au
   CE2) ; sinon de vraies villes avec leurs populations réelles, figées, sans variable.
3. **Échelle adaptée de 7-8** : `axe: à choisir` ne propose que 1, 2, 5 et 10 par graduation, avec des données
   jusqu'à 100 : c'est déjà l'échelle du CE2 (`3a8899e8`). Reco : **écrire 7-8 dans ces limites maintenant**, et
   noter dans `outils-manquants.md` les échelles 20, 25, 50, 100 (données jusqu'à 1 000) pour un modèle CM1 plus
   tard ; sinon créer l'outil d'abord.
4. **Repère de 7-11** : axes et graduations **donnés** (l'élève place les points), l'échelle n'est pas à choisir ;
   choisir l'échelle d'un repère n'existe pas comme geste. Reco : **oui, axes donnés**.
5. **Niveaux** : chaque modèle CM1 prend le niveau qui suit celui du modèle CE2 de même geste dans son nœud,
   partagé s'il le faut, sans renuméroter personne ; relevés une nouvelle fois juste avant la création. Reco : **oui**.

**Question d'accès** : brouillons, puis migration nœud + tag → **personne** ne gagne d'accès.

### 19 bis. Lot 7 : réponse de David (2026-11-17)

Les cinq recommandations du § 19 : 1. **un seul lot** de 13 modèles ; 2. **villes inventées** (7-2, 7-3) ; 3. 7-8
écrit **dans les limites de `axe: à choisir`** (1, 2, 5, 10, données ≤ 100), échelles 20 à 100 notées au n° 36 de
`outils-manquants.md` ; 4. repère de 7-11 à **axes donnés** ; 5. **niveaux** : celui qui suit le modèle CE2 de même
geste dans le nœud, partagé, sans renuméroter.

### 19 ter. Lot 7 — écriture (2026-11-17)

- Script `docs/wip/questions/lot-cm1-7.py` → `scripts/questions/cm1-7/` (13 JSON, 40 variations). Niveaux : tableaux
  4, 4, 5 ; double entrée 6, 7 ; barres 5, 6, 7 ; courbes 1, 2, 3 (comme les modèles de 5e, pas de CE2) ; problèmes
  3, 3 (notion « Représenter des données »). Villes inventées (Brumeval, Castelroc, Pontaval, Mirelande,
  Sablonnière), sommets inventés.
- « Le plus », « le moins » : la donnée gagnante est posée au rang k par un polynôme de Lagrange (`posee`), la réponse
  attendue est `{{k}}` (ni `{{if}}`, ni condition d'unicité). Courbes : montée puis baisse (09 V2), montée continue
  (09 V3 : une température = une heure), un seul sommet ou creux en `2*(w ∓ s*abs(j-k))` (10 V1, V2) — les premiers
  tirages au hasard dessinaient des pics invraisemblables (vu dans l'aperçu).
- ⚠️ **` ```tableau-croise ` affiche ses totaux par défaut** (`showTotals: true`, depuis `238ec6bc6a`) : `totaux: non`
  écrit partout où le total donnerait la réponse (04 V1, V3 ; 05 ; 12 V2, V3). **En prod**, le total donne la réponse
  dans 4 variations publiées : CE2 `f0f681c4` V1 (le jour où il y a le plus de personnes), V2 (le moins), V3 (combien
  en tout un jour) ; CE1 `29edb833` V2 (le jour où il y a le plus d'élèves). Non corrigé ici : signalé à David.
- `question:specs` 300 tirages par variation : 12 000 / 12 000, 75 specs vertes ; sonde jetable (parseurs
  ` ```barres `, ` ```tableau-croise `, ` ```courbe ` sur chaque tirage, témoin rouge vérifié) : 9 291 blocs, 0 problème ;
  `create-questions` en simulation (prod) : 13 « à créer ».
- Base locale (copie du dossier), aperçu admin à 390 px (Playwright, port 5178), les 40 variations vues. Une autre
  session a remis la base locale à zéro pendant les captures : créer **et** capturer dans une seule commande sous
  `scripts/with-db-lock.sh`.
- #2751 mergée (CI verte), branche supprimée.

### 19 quater. Lot 7 — création en prod et rangement (2026-11-17)

- `create-questions --dir scripts/questions/cm1-7 --publier` lancé par David (un premier « publié » ne l'avait pas
  créé : rien au MCP) : 13 brouillons CM1 (vérifiés au MCP : draft, niveau 1, sans nœud ni tag). Ids écrits dans le
  dépôt principal, reportés et commités sur `feat/questions-cm1-lot7-rangement`.
- Relevé `etat-prod-2026-11-17-cm1-7/` (`releve-prod-cm1.ts`), script `lot-cm1-7-rangement.py` (gabarit 6 ter) →
  migration `20261117165426_questions_cm1_lot7_rangement_tags` + fixture : 13 rangés sous « Statistiques ›
  Représenter des données » (tableaux : 1e1e0342 → 120, f5742b78 → 121, 40dcbbcc → 169 ; double entrée : 62389b29 →
  137, e1d59914 → 170 ; barres : cc52549c → 138, c245f0cc → 171, 01b73ca2 → 135 ; courbes et repères : 5291dc9f →
  139, da976537 → 172, a434bd68 → 136 ; la notion elle-même : ae74fe73, f1f7b2d1 → 122), 13 tags posés, aucun niveau
  ni statut changé.
- Test `questions-cm1-lot7-rangement-tags.test.ts` : 20/20 vert (relancé après le commit) ; corps neutralisé
  (`select 1;`) : 9 échecs + suite principale sautée. `types:cliquet` tenu ; `security-auditor` : aucun finding
  (diff avec la 6 ter : données, compteurs, préfixe `_qcm1l7_` ; rangement sur la notion pour CM1-122 vérifié ;
  état « avant » remesuré au MCP).
- PR #2759 ouverte.
- #2759 mergée (CI verte après `Doc-inchangée:` dans un commit, `check:migrations --pr 2759` passé), branche
  supprimée.

### 19 quinquies. Lot 7 — migration passée, page à cocher (2026-11-17)

- `db:migrate` lancé par David. Vérifié au MCP : `20261117165426` dans `schema_migrations` ; 13 brouillons CM1,
  chacun sur son nœud avec son tag (tableaux 120, 121, 169 ; double entrée 137, 170 ; barres 138, 171, 135 ; courbes
  et repères 139, 172, 136 ; notion « Représenter des données » 122 ×2).
- `page-a-cocher.ts --dir scripts/questions/cm1-7` : 13 fiches (38 exemples), aucune alerte. Page :
  https://claude.ai/artifact/94MF9SuHHDq8Jaa9hkBSLq (`verdicts`, capacité `db`, vide).

### 19 sexies. Totaux masqués dans 4 variations CE1 / CE2 publiées (2026-11-17)

- Décision de David (« je te suis ») : `totaux: non` dans les 4 variations où la ligne Total, affichée par défaut
  depuis `238ec6bc6a`, donnait la réponse : CE2 `f0f681c4` V1 (le jour où il y en a le plus), V2 (le moins), V3
  (combien un jour) ; CE1 `29edb833` V2 (le jour où il y en a le plus). Rien d'autre ne change : les corrigés
  additionnaient déjà eux-mêmes ; la V1 de `29edb833` garde `totaux: oui` (écrit exprès, même question à lire).
- Modèles publiés : `update-published-questions.ts`, lot `totaux-ce` (instantané
  `scripts/questions/ce-totaux-existants/`). Simulation : variations seules, specs 10/10 et 9/9, 400 tirages.
- #2769 mergée (CI verte), branche supprimée. Écriture en prod : à lancer par David.

### 19 septies. Lot 7 — publié (2026-11-17)

- Page à cocher : 13 « OK » sur 13, aucun commentaire. `publier-lot --dir scripts/questions/cm1-7` (simulation),
  `garde-niveaux-tags` et `--publier` lancés par David. Vérifié au MCP : 13 modèles `published`.
- Recompte MCP : **126 points du CM1 sur 171** ont un modèle publié (114 + les 12 du lot).

### 19 octies. Totaux masqués — écrits en prod (2026-11-17)

- `update-published-questions.ts --lot totaux-ce --publier` lancé par David. Vérifié au MCP : CE2 `f0f681c4`
  V1 à V3 en `totaux: non` ; CE1 `29edb833` V2 en `totaux: non`, V1 et V3 en `totaux: oui` (comme l'instantané
  `scripts/questions/ce-totaux-existants/`). Les deux modèles restent `published`.

## 20. Relevé des 45 points restants (MCP, 2026-11-17)

Recompte MCP : **45 points sans modèle publié** (126 sur 171 couverts), aucun brouillon en attente. Deux outils
classés C au § 3 sont désormais en prod, ce qui fait passer 5 points en B :

- **horloge à placer** (` ```horloge ` + `placer`, CE1 `d478935f`, CE2 `c06fe751`) → 093 en vrai geste ;
- **figure à compléter** avec les contrôles symétrique (CE2 `49b8dc0b`, 6e `59694d66`), perpendiculaire (6e
  `59694d66`, 5e `9dc37ad2`), parallèle (CE2 `5d869c65`, 5e `fbe65ad1`) → 107, 108, 167, 168.

Découpage proposé (38 points évaluables + 7 D) :

| Lot | Thème                          | Points                                                    | Patrons en prod                    |
| --- | ------------------------------ | --------------------------------------------------------- | ---------------------------------- |
| 8a  | heures et durées               | 092, 093, 094, 166, 095                                   | 7 modèles CE2 à horloge            |
| 8b  | aires et angles                | 086, 087, 088 ; 089, 090, 091 (sans degré)                | angles CE1 / CE2, aires 6e         |
| 8c  | géométrie plane                | 098 (codes), 099 (cercle), 100, 101, 102, 103, 106 (axes) | axes CE2 `b307a9f9`, `79e8e279`    |
| 8d  | figures à compléter            | 107, 108, 167, 168                                        | ci-dessus                          |
| 8e  | solides, déplacements          | 109, 110-113, 115 (patrons du cube), 117, 118 (robot)     | patrons CE2 `11ebf9fe`, `c8c9746a` |
| 9   | probabilités, proportionnalité | 123-128 ; 129, 130                                        | 6e, 5e                             |

**D (sans modèle, décidé au § 4 bis)** : 140, 097, 104, 105, 114, 116, 119.

Questions à David : découpage et ordre (reco : 8a d'abord, patrons CE2 prêts) ; 093 en horloge à placer et 107,
108, 167, 168 en figure à compléter (B), plus en C.

### 20 bis. Découpage : réponse de David (2026-11-17)

« oui » : découpage du § 20 (8a heures et durées → 8b aires et angles → 8c géométrie plane → 8d figures à compléter →
8e solides, déplacements → 9 probabilités, proportionnalité) ; 093 en horloge à placer ; 107, 108, 167, 168 en figure
à compléter.

## 21. Lot 8a — heures et durées : phase 0 (à valider, 2026-11-17)

Points : 092, 093, 094, 166, 095. Aucun modèle CM1 ni CM2 sur ces points. Nœuds existants (« Durées ») : **lecture
de l'heure** (092, 093) et **calcul de durées** (094, 166, 095), comme les modèles CE2. Patrons : `scripts/questions/
ce2-7b/` (01, 03, 05, 07 : lire, placer, durée entre deux horloges, comparer) et `ce2-6b/` (12, 13 : problèmes à une
et deux étapes), tous publiés. Bornes `cycle3.json` : heures et minutes, pas de secondes ; 094 « de 8 h 52 min à
11 h 37 min » ; 095 une ou deux étapes, instants intermédiaires, pas de calcul posé en base soixante, unités jour,
heure, minute.

**Ce qui distingue le CM1 du CE2** : le CE2 lit déjà à la minute près sur un cadran à 12 chiffres, et ses durées
restent à 5 min près, dans 2 h 20 (`ce2-7b/05`). Le CM1 lit un **cadran moins aidé** (`chiffres: quarts`, puis
`aucun`), et ses durées sont **à la minute près, en heures et minutes, avec passage d'une ou plusieurs heures**.

| #    | Point   | Sous-notion        | Modèle                               | Variations, plages                                                                                                                                                                                                          |
| ---- | ------- | ------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 8a-1 | CM1-092 | lecture de l'heure | Quelle heure est-il ? (cadran nu)    | V1 `chiffres: quarts`, à la minute ; V2 `chiffres: aucun`, à la minute ; V3 « c'est l'après-midi », `chiffres: quarts`, réponse 13 h à 23 h 59                                                                              |
| 8a-2 | CM1-093 | lecture de l'heure | Place les aiguilles (cadran nu)      | V1 `placer:` à la minute, `chiffres: quarts` ; V2 heure de l'après-midi écrite 13 h à 23 h (« 15 h 37 ») ; V3 `chiffres: aucun`                                                                                             |
| 8a-3 | CM1-094 | calcul de durées   | Durée entre deux horloges (h et min) | V1 moins d'une heure, à cheval sur l'heure, à la minute (8 h 52 → 9 h 17) : réponse en min ; V2 de 1 h à 3 h 59 (8 h 52 → 11 h 37) : h et min ; V3 l'après-midi, `cadran: 24`                                               |
| 8a-4 | CM1-166 | calcul de durées   | Quelle durée est la plus longue ?    | Deux activités, deux paires d'horloges, durées en h et min à la minute ; V1 écart de 1 à 9 min ; V2 « elles durent autant » possible. Case « choix » à trois issues                                                         |
| 8a-5 | CM1-095 | calcul de durées   | Problèmes de durées                  | V1 heure d'arrivée (départ + durée h min, à la minute) ; V2 heure de départ (arrivée − durée) ; V3 deux étapes (trajet, arrêt, trajet) ; V4 jours et heures (départ lundi 21 h, 14 h de trajet : quel jour, quelle heure ?) |

Forme commune : une case par nombre, l'unité après la case (`$?~\text{h}~?~\text{min}$`), comme au CE2 ; 166 en case
« choix » (« le film », « le match », « ils durent autant »). Corrigé : l'axe des instants intermédiaires (« de 8 h 52
à 9 h : 8 min ; de 9 h à 11 h : 2 h ; de 11 h à 11 h 37 : 37 min »), jamais une soustraction posée en base soixante.
Specs d'erreurs typiques : aiguilles échangées (lire la petite comme la grande), l'heure suivante lue trop tôt (8 h 55
lu 9 h 55), soustraction décimale (11,37 − 8,52 → 2 h 85), minutes au-delà de 59, 12 h ajoutée à tort.

Questions :

1. **Cadran nu** (8a-1, 8a-2) : `chiffres: quarts` puis `aucun` pour distinguer le CM1 du CE2, qui lit déjà à la
   minute près. Reco : **oui**.
2. **Jours et heures** (8a-5 V4) : le BO cite l'unité « jour » ; une variation qui passe minuit (jour de la semaine
   - heure). Reco : **oui**, une variation.
3. **166** : case « choix » à trois issues, dont « ils durent autant ». Reco : **oui**.
4. **Niveaux** : même règle qu'au lot 7, le niveau qui suit le modèle CE2 de même geste dans le nœud, partagé, sans
   renuméroter ; relevés de nouveau juste avant la création. Reco : **oui**.

**Question d'accès** : brouillons, puis migration nœud + tag → **personne** ne gagne d'accès.

### 21 bis. Lot 8a : réponse de David (2026-11-17)

« je te suis » : les quatre recommandations du § 21. 1. **cadran nu** (`chiffres: quarts`, puis `aucun`) pour lire et
placer ; 2. une variation **jours et heures** (8a-5 V4) ; 3. 166 en case « choix » à **trois issues** ; 4. **niveaux** :
celui qui suit le modèle CE2 de même geste dans le nœud, partagé, sans renuméroter.

### 21 ter. Lot 8a — écriture (2026-11-17)

- Script `docs/wip/questions/lot-cm1-8a.py` → `scripts/questions/cm1-8a/` (5 JSON, 15 variations). Niveaux : lecture
  de l'heure 6 (lire, après CE2 `0d41a45e` 5) et 8 (placer, après CE2 `c06fe751` 7) ; calcul de durées 6 (durée entre
  deux horloges, après CE2 `4c75f053` 5), 8 (comparer, après CE2 `19c370bd` 7), 5 (problèmes, après CE2 `ba8f2f75`
  4). À relever de nouveau avant la création en prod.
- Minutes écrites sur deux chiffres (`8 h 04`, forme `{{if:m<10|0{{m}}|{{m}}}}` du modèle 6e `6-grandeurs/12`) ;
  ⚠️ **« 04 » tapé dans une case était jugé « forme non optimale » (½ point)** par la règle de superflu `zeros`, même
  avec une réponse attendue `04` : `options.constraints.zeros: off` sur les 5 modèles (comme `ce1-4/02`), spec « 04 »
  verte. Les modèles CE2 d'horloge écrivent « 9 h 5 » et gardent la règle : un élève qui tape « 05 » y a ½ point.
- Corrigés par instants intermédiaires (heure pleine, heures entières, minutes), jamais de soustraction en base
  soixante ; la V3 des problèmes signale chaque passage d'heure pleine (`passe`). V4 : le car passe minuit ou non
  (`jr` = 0 ou 1) ; le 3e jour proposé n'est jamais le bon (leurre).
- `question:specs` 300 tirages par variation : 4 500 / 4 500, 56 specs vertes ; `sonde-horloges` : 1 200 blocs,
  0 problème ; `create-questions` en simulation (prod) : 5 « à créer ».
- Base locale (copie du dossier, `.env.local`, sous `scripts/with-db-lock.sh`), aperçu admin à 390 px (Playwright,
  port 5178) : les 15 variations vues, cadrans nus, horloge à placer, quatre horloges légendées, cases + choix du jour.

### 21 quater. Lot 8a — fichiers mergés (2026-11-17)

- #2782 mergée (CI verte), branche supprimée ; worktree détaché sur `main`.

### 21 quinquies. Lot 8a — création en prod et rangement (2026-11-17)

- #2782 mergée. `create-questions --dir scripts/questions/cm1-8a --publier` lancé (ids écrits dans le worktree) : 5 brouillons CM1
  (relevé : draft, niveaux 6, 8, 6, 8, 5 comme écrits, sans nœud ni tag). Ids commités sur
  `feat/questions-cm1-lot8a-rangement`.
- Relevé `etat-prod-2026-11-17-cm1-8a/` (`releve-prod-cm1.ts`), script `lot-cm1-8a-rangement.py` (gabarit 7) →
  migration `20261117210204_questions_cm1_lot8a_rangement_tags` + fixture : 5 rangés sous « Grandeurs et mesures ›
  Durées » (lecture de l'heure : 9e655e1a → 092, dd81eefb → 093 ; calcul de durées : f3f00294 → 094, cdec9199 →
  166, 68134013 → 095), 5 tags posés, aucun niveau ni statut changé.
- Test `questions-cm1-lot8a-rangement-tags.test.ts` : 20/20 vert ; corps neutralisé (`select 1;`) : 9 échecs + suite
  principale sautée. `types:cliquet` tenu ; `security-auditor` : aucun finding (diff avec le lot 7 : données,
  compteurs, préfixe `_qcm1l8a_` ; état « avant » remesuré au MCP).

### 21 sexies. Lot 8a — rangement mergé (2026-11-17)

- #2785 mergée (CI verte, `check:migrations --pr 2785` passé), branche supprimée ; worktree détaché sur `main`.
- MCP : `20261117210204` est la seule migration en attente (les 72 depuis le 2026-11-11 sont passées).

### 21 septies. Lot 8a — migration passée, page à cocher (2026-11-17)

- Vérifié au MCP : `20261117210204` dans `schema_migrations` ; 5 brouillons CM1 sous « Durées », chacun avec son tag
  (lecture de l'heure : 9e655e1a → 092, dd81eefb → 093 ; calcul de durées : f3f00294 → 094, cdec9199 → 166,
  68134013 → 095).
- `page-a-cocher.ts --dir scripts/questions/cm1-8a` : 5 fiches (15 exemples), aucune alerte. Page :
  https://claude.ai/artifact/XV275GWdRMSihZBrJKzUw1 (`verdicts`, capacité `db`, vide).

### 21 octies. Lot 8a — publié (2026-11-17)

- Page à cocher : 5 « OK » sur 5, aucun commentaire. `garde-niveaux-tags`, `publier-lot --dir scripts/questions/cm1-8a`
  (simulation) et `--publier` lancés par David. Vérifié au MCP : 5 modèles `published`.
- Recompte MCP : **131 points du CM1 sur 171** ont un modèle publié (126 + les 5 du lot).
- Reco proposée à David (sans réponse) : corriger `zeros` dans les modèles CE1 / CE2 publiés où l'élève TAPE des
  minutes (12 modèles à horloge, aucun en `zeros: off` ; trier : pas « Place les aiguilles » ni les QCM), lot
  `update-published-questions` comme `totaux-ce`, spec « 05 » = point entier ; ne pas réécrire l'affichage « 9 h 5 ».
  Puis 8b.

### 21 neuvies. Horloges CE : « 05 » au point entier (2026-11-17)

- Go de David (« oui ») sur la reco du § 21 octies. Tri par sonde (600 tirages par modèle, réponse attendue préfixée
  d'un 0) des 12 modèles CE1 / CE2 publiés à horloge : seuls **2** ont une case où l'élève écrit une HEURE et où
  « 05 » valait ½ point (`zeros`) : CE2 `0d41a45e` « Quelle heure est-il ? (heures et minutes) » V1 à V3, CE2
  `71741618` « Dire l'heure et l'écrire en chiffres » V2, V3. Hors champ : cases de choix, heure seule, durées en
  minutes (« 05 min » reste ½ point) ; durées « ? h ? min » (`4c75f053` V4, `2370bc8d` V2) laissées telles quelles.
- `options.constraints.zeros: off` sur les 2 modèles (l'heure « 07 » a aussi le point entier) ; 8 specs (« 05 »,
  « 04 », « 00 », « 07 », « 08 » au point entier ; « 5 » juste aussi). Preuve rouge : sans l'option, 6 specs en
  `unoptimal_form zeros` ; avec, 18/18 et 18/18.
- Lot `horloges-ce-zeros` de `update-published-questions.ts` (instantané `scripts/questions/ce-horloges-zeros/`,
  commit à part). Simulation en prod : `options` et `testSpecs` seuls. Écriture en prod : à lancer par David.
- #2792 mergée (CI verte), branche supprimée ; worktree détaché sur `main`. `--publier` lancé par David ; vérifié au
  MCP : `0d41a45e` et `71741618` `published`, `options.constraints.zeros: off`, 18 specs chacun.

## 22. Lot 8b — aires et angles : phase 0 (à valider, 2026-11-17)

Relevé MCP : aucun modèle sur 086 à 091, **ni sur leurs jumeaux CM2** (071, 072, 076, 077, 078, mêmes intitulés),
aucun brouillon. **Aucun modèle d'aire sur quadrillage, à aucun niveau** : les « aires 6e » du § 20 sont des calculs
par formule, interdits au CM1 (bornes). Patrons réels : CE1 `bbb43bf4` « Angle droit, aigu ou obtus ? »
(`ce1-9/09`, bloc `figure` + `grille: oui` + `angle()` + `choix`) ; polygones coloriés (`polygone(…, remplissage=…)`)
déjà en prod. Les 6 points sont en **B** (bloc `figure` seul, rien à créer).

Rangement : 086, 087, 089, 090 sont sur les notions **Aires** et **Angles** ; 088 sur la sous-notion **unités et
conversions** (d'Aires) ; 091 sur **comparaison** (d'Angles). Les sous-notions d'Aires sont toutes « par formule »
(carré, rectangle, disque…) : aucune ne va aux aires sur quadrillage.

Bornes (cycle3) : 086 sans mesure (superposition, découpage-recollement) ; 087 unité fournie, carreaux entiers et
demi-carreaux ; 088 le cm² seul ; 089 sommet, côtés, angle droit, aigu, obtus ; 090 notations â, ABC chapeau, Â ;
091 sans mesure, pas de degré.

| #   | Point | Modèle (titre)                     | Variations                                                                                                                                                         | Réponse                 | Rangement             |
| --- | ----- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------- | --------------------- |
| 1   | 086   | Comparer les aires de deux figures | V1 aires nettement différentes ; V2 même aire, formes différentes (l'une est l'autre découpée et recollée) ; V3 la figure au plus grand tour a la plus petite aire | choix : A, B, égales    | Aires                 |
| 2   | 087   | Aire en carreaux                   | V1 polygone en carreaux entiers (6 à 20) ; V2 avec des demi-carreaux ; V3 unité fournie = un domino de 2 carreaux                                                  | nombre d'unités         | Aires                 |
| 3   | 088   | Aire en centimètres carrés         | V1 carreaux de 1 cm entiers ; V2 avec des demi-carreaux ; V3 deux figures, « combien de cm² de plus ? »                                                            | nombre, « cm² » affiché | unités et conversions |
| 4   | 089   | Sommet, côtés et nature d'un angle | V1 nommer le sommet ; V2 nommer les deux côtés ; V3 droit, aigu ou obtus (sans quadrillage, côtés de longueurs différentes)                                        | lettre ; choix          | Angles                |
| 5   | 090   | Noter un angle                     | V1 angle marqué → sa notation parmi 3 ($\widehat{ABC}$, $\widehat{BAC}$, $\widehat{ACB}$) ; V2 notation → sommet ; V3 notation → quel angle marqué (couleurs)      | choix ; lettre          | Angles                |
| 6   | 091   | Comparer deux angles               | V1 deux angles, côtés courts au plus grand (piège) ; V2 comparer à l'angle droit ; V3 ranger trois angles                                                          | choix                   | comparaison           |

Corrigés : 086 superposition / découpage-recollement, puis compte des carreaux pour vérifier ; 087-088 compte par
lignes, deux demi-carreaux font un carreau ; 089-091 avec le coin de l'équerre comme gabarit.

**Question d'accès** (migration nœud + tag) : personne ne pourra lire quelque chose qu'il ne pouvait pas lire
avant. Les modèles publiés sont lus comme les autres ; la migration ne fait que les ranger et les taguer.

**Questions à David** :

1. Les 6 modèles et leurs variations : OK ?
2. Aires sur quadrillage (modèles 1 et 2) : les ranger directement sous **Aires**, ou créer une sous-notion
   « aires sur quadrillage » (pour CM1, CM2, et plus tard le CE2 s'il en a) ? Reco : la sous-notion, sinon les
   modèles « par formule » et « par comptage » se mélangent sous Aires.
3. Jumeaux CM2 (mêmes intitulés, aucun modèle) : niveaux « CM1 et CM2 » et tags sur les deux points ? Reco :
   oui pour 086, 087, 089, 090, 091 (c'est le même attendu au CM2) ; non pour 088 (le CM2 ajoute dm² et m²).

### 22 bis. Lot 8b : décisions (David, 2026-11-18)

- « go » sur les 6 modèles du § 22.
- Rangement : **nouvelle sous-notion « aires sur quadrillage »** sous Aires (modèles 1 et 2) ; créée par la
  migration nœud + tag.
- Jumeaux CM2 : niveaux **CM1 et CM2**, tag sur les deux points pour 086/071, 087/072, 089/076, 090/077, 091/078 ;
  le 088 (cm²) reste CM1 seul.

### 22 ter. Lot 8b — écrit (2026-11-18)

- Script `docs/wip/questions/lot-cm1-8b.py` → `scripts/questions/cm1-8b/` (6 modèles, niveaux 1, 2, 1, 1, 2, 1 ;
  grades CM1 + CM2 sauf 03, CM1 seul). Formes sur quadrillage en catalogue (aire et carreaux entiers / demi-carreaux
  calculés et vérifiés par le script) ; angles par `point(S, longueur=…, angle=…)`, marques `angle()` saillantes.
- `question:specs` : 6/6 importables, 48 specs ; `sonde-figures` 300 tirages par modèle, 0 problème.
- Pièges vus : une `validationRules` custom dont l'expression contient un `{{if:}}` imbriqué rend la bonne réponse
  fausse (retirée) ; couleur d'un corrigé hors `$` refusée par `question:specs` ; deux figures côte à côte
  (fenêtre 19 × 7) donnent des carreaux de 13 px à 390 px → **figures empilées** (A en haut, B en bas ; angles
  l'un au-dessus de l'autre).
- Base locale (copies à une variation par modèle, 18 brouillons d'essai) : les 18 variations vues à 390 px
  (Playwright, port 5177), sans défilement horizontal, réponses attendues justes. Reste : noms des points petits
  (8 px), sans option de taille → `outils-manquants.md` n° 37.
- PR #2803 (fichiers seuls, revue : aucune, contenu). 1re CI rouge : `student-answer-safety` abîmait deux réponses
  attendues en `{{if:}}` imbriqué sur 8 et 10 niveaux → variable calculée `n` (indicatrices, helper `table`) ; CI
  verte, mergée le 2026-11-18.
- `--publier` (2026-11-18) refusé : homonyme « Le vocabulaire des angles », niveau 1, déjà en base pour la **6e**
  (`c8741112`, lot 11a : angle plat, adjacents, opposés, supplémentaire — autre contenu). **David : renommer le
  modèle CM1** → « Sommet, côtés et nature d'un angle » (JSON, générateur, tableau du découpage).

### 22 quater. Lot 8b — création en prod et rangement (2026-11-18)

- #2806 mergée (renommage). `create-questions --dir scripts/questions/cm1-8b --publier` lancé depuis le worktree :
  6 brouillons (d623374d, 31d64c00, 614048c9, 8da9f669, 4c1ce174, 97f2374b), ids commités sur
  `feat/questions-cm1-lot8b-rangement`.
- Relevé `etat-prod-2026-11-18-cm1-8b/` (6 draft, sans nœud ni tag ; « aires sur quadrillage » absente), script
  `lot-cm1-8b-rangement.py` (gabarit 8a + sous-notion neuve façon TSPE 11) → migration
  `20261118071618_questions_cm1_lot8b_rangement_tags` + fixture : sous-notion « aires sur quadrillage » créée en fin
  d'Aires (d623374d, 31d64c00) ; 614048c9 → unités et conversions ; 8da9f669, 4c1ce174 → Angles ; 97f2374b →
  comparaison ; 11 tags posés (CM1-086 à 091, CM2-071, 072, 076, 077, 078), aucun niveau ni statut changé.
- Test `questions-cm1-lot8b-rangement-tags.test.ts` : 23/23 vert ; corps neutralisé (`select 1;`) : 14 échecs,
  8 sautés. `types:cliquet` tenu.
- `security-auditor` : aucun finding bloquant (état « avant » remesuré au MCP). Non bloquant : la garde du rollback ne
  regarde pas `exercise_classifications`, `student_mathoux`, `student_combat_moves` (clés RESTRICT : échec net, rien
  perdu) → à ajouter au générateur pour les prochains lots à sous-notion neuve.
- 1re CI rouge : la sous-notion neuve change l'arbre → `arbre-notions-seed.json`, `seed-classification-nodes` (484),
  `later-migrations.ts` (`QUESTIONS_CM1_LOT8B`), comme la TSPE 15. CI verte, #2812 mergée, `check:migrations` passé.
- Base locale en retard (10 migrations ; `5_lot11_blockly` d'une autre session refuse de s'y rejouer) : non touchée.

### 22 quinquies. Lot 8b — migration passée, page à cocher (2026-11-18)

- `db:migrate --include-all` lancé par David depuis le worktree (`074731` du CM2 lot 10 déjà jouée avant). Vérifié
  au MCP : `20261118071618` jouée ; « aires sur quadrillage » position 7 sous Aires ; 6 brouillons sur leur nœud,
  11 tags, `updated_at` inchangé.
- `page-a-cocher.ts --dir scripts/questions/cm1-8b` : 6 fiches (18 exemples), aucune alerte. Page :
  https://claude.ai/artifact/W1USbwFanqqcyE3o9t4afJ (`verdicts`, capacité `db`, vide).

### 22 sexies. Lot 8b — publié (2026-11-18)

- Page à cocher : 6 « OK » sur 6, aucun commentaire. `garde-niveaux-tags`, `publier-lot --dir scripts/questions/cm1-8b`
  (simulation) et `--publier` lancés par David. Vérifié au MCP : 6 modèles `published`.
- Recompte MCP : **137 points du CM1 sur 171** ont un modèle publié (131 + 6) ; CM2 : 92 sur 158.

## 23. Lot 8c — géométrie plane : phase 0 (à valider, 2026-11-18)

Relevé MCP : aucun modèle, ni brouillon, sur 098, 099, 100, 101, 102, 103, 106, **ni sur leurs jumeaux CM2**
(088 codes, 089 perpendiculaires, 090 parallèles, 091 cercle, 092 figures, 093 propriétés ; le CM2 n'a pas de point
« axes de symétrie »). Les 7 points sont en **B** : le bloc `figure` a tout ce qu'il faut (`arc`, `angle(…,
marque="carre")`, `marque_segment(…, traits=2)`, `perpendiculaire`, `parallele`, figures dans un ` ```choix `).

Chaque point est déjà posé sur un nœud ; le modèle se range sur ce nœud (règles de l'ADR 0020 tenues) :
098, 102, 103 → **propriétés** (Figures planes) ; 099 → **cercle** ; 100, 101 → **perpendiculaires et parallèles** ;
106 → **Symétrie axiale** (notion).

Patrons en prod : CE2 `77728742` (code des longueurs), `29c06264` (code de l'angle droit), `c2eb20cb` (quelle est
cette figure ?), `949dd113` (propriétés carré, rectangle, losange), `79e8e279` et `b307a9f9` (axes) ; 6e `b8939937`
(cercle, disque, rayon, diamètre, corde).

Bornes (cycle3) : 098 codes de l'angle droit et des longueurs égales (pas d'angles égaux ni ⊥, //, qui sont CM2) ;
099 disque, cercle, centre, rayon, diamètre, corde, arc ; 100, 101 sans borne propre ; 102 triangle, triangle
rectangle, isocèle, équilatéral, quadrilatère, carré, rectangle, losange (**pas** de trapèze, pentagone, hexagone) ;
103 mêmes figures, côtés opposés parallèles, longueurs et angles égaux ; 106 sans borne propre.

| #   | Point | Modèle (titre)                                 | Variations                                                                                                                                                                                                                                        | Réponse        | Rangement                      | Niv. |
| --- | ----- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------------ | ---- |
| 1   | 098   | Lire les codes d'une figure                    | V1 figure à 4 côtés, un angle droit codé → quel angle est droit ? ; V2 deux paires de côtés codées (un trait, deux traits), [AB] = 5 cm → combien mesure [CD] ? (piège : l'autre paire) ; V3 quelle phrase disent les codes ?                     | choix ; nombre | propriétés                     | 3    |
| 2   | 099   | Cercle, disque, rayon, diamètre, corde, arc    | V1 un trait coloré sur un cercle de centre O → son nom (rayon, diamètre, corde, arc) ; V2 cercle ou disque ? ; V3 cercle de centre O, rayon 3 cm, et OA, OB, OC donnés → quel point est sur le cercle ? ; V4 rayon ↔ diamètre (entiers, 2 à 9 cm) | choix ; nombre | cercle                         | 1    |
| 3   | 100   | Ces droites sont-elles perpendiculaires ?      | V1 deux droites qui se coupent : perpendiculaires ou non (non : au moins 15° d'écart avec l'angle droit) ; V2 trois dessins → lequel montre des perpendiculaires ? ; V3 quatre droites (d1)…(d4) → laquelle est perpendiculaire à (d1) ?          | choix          | perpendiculaires et parallèles | 1    |
| 4   | 101   | Ces droites sont-elles parallèles ?            | V1 deux droites : parallèles ou non (non : écart qui se resserre nettement) ; V2 trois dessins → lequel ? ; V3 quatre droites → laquelle est parallèle à (d1) ? (piège : une presque parallèle)                                                   | choix          | perpendiculaires et parallèles | 2    |
| 5   | 102   | Quelle est cette figure ? (avec sa définition) | V1 figure codée (pas en vraie grandeur) → son nom le plus précis ; V2 une définition (« un quadrilatère qui a 4 angles droits ») → son nom ; V3 pièges : carré posé sur la pointe, triangle équilatéral pointe en bas                             | choix          | propriétés                     | 1    |
| 6   | 103   | Propriétés des figures usuelles                | V1 quelle phrase est vraie ? (côtés opposés parallèles, côtés égaux, angles droits) ; V2 rectangle ou losange ABCD nommé → quel côté est parallèle à [AB] ? ; V3 triangle isocèle en A ou équilatéral → quel côté a la même longueur que [AB] ?   | choix          | propriétés                     | 2    |
| 7   | 106   | Les axes de symétrie des figures usuelles      | V1 combien d'axes ? (carré 4, rectangle 2, losange 2, équilatéral 3, isocèle 1, quadrilatère quelconque 0) ; V2 quelle figure n'a aucun axe ? ; V3 la diagonale d'un rectangle est-elle un axe ? (piège classique ; le carré pour le « oui »)     | nombre ; choix | Symétrie axiale                | 3    |

Corrigés : 098 « un petit carré = angle droit ; même nombre de traits = même longueur » ; 099 le centre, le rayon
du centre au cercle, le diamètre = deux rayons, la corde relie deux points du cercle, l'arc est un morceau du cercle ;
100-101 avec l'équerre (le coin) ou en mesurant l'écart à deux endroits ; 102-103 par la définition (côtés, angles) ;
106 par pliage (les deux moitiés se superposent). Le cercle (une infinité d'axes) est laissé de côté au 106.

**Question d'accès** (migration nœud + tag) : personne ne pourra lire quelque chose qu'il ne pouvait pas lire
avant. Les modèles publiés sont lus comme les autres ; la migration ne fait que les ranger et les taguer, sur des
nœuds qui existent déjà (pas de sous-notion neuve).

**Questions à David** :

1. Les 7 modèles et leurs variations : OK ?
2. Jumeaux CM2 : niveaux « CM1 et CM2 » et tag sur les deux points pour 099/091, 100/089, 101/090 (mêmes intitulés) ?
   Et CM1 seul pour 098, 102, 103 (le CM2 ajoute angles égaux, ⊥, // ; trapèze, pentagone, hexagone) ? Reco : oui
   (même règle qu'au 8b pour le cm²).
3. Écrire des modèles CM1 plutôt que d'ajouter le CM1 aux modèles CE2 (codes, axes) et 6e (cercle) qui existent ?
   Reco : écrire. Les CE2 ne voient qu'un code à la fois et pas les triangles ; le 6e prend des rayons à virgule et
   n'a pas l'arc.

### 23 bis. Lot 8c : décisions (David, 2026-11-18)

« ok » sur les trois questions du § 23 :

- les 7 modèles et leurs variations ;
- niveaux **CM1 et CM2**, tag sur les deux points pour 099/091, 100/089, 101/090 ; **CM1 seul** pour 098, 102, 103, 106 ;
- modèles CM1 écrits (pas de CM1 ajouté aux modèles CE2 et 6e existants).

### 23 ter. Lot 8c — écrit (2026-11-18)

- Script `docs/wip/questions/lot-cm1-8c.py` → `scripts/questions/cm1-8c/` (7 modèles, niveaux 3, 1, 1, 2, 1, 2, 3 ;
  grades CM1 + CM2 pour 02, 03, 04, CM1 seul sinon). Figures en catalogue, vérifiées par le script (angles droits
  codés exacts, autres angles à plus de 14° de l'angle droit, côtés codés égaux, côtés non codés nettement
  différents).
- `question:specs` : 7/7 importables, 56 specs ; `sonde-figures` 300 tirages par modèle, 0 problème (elle ne sonde
  pas les dessins d'une case choix : vus dans l'aperçu). Simulation `create-questions` contre la prod : 7 « à
  créer », aucun homonyme.
- Base locale (copies à une variation par modèle, 22 brouillons d'essai) : les 22 variations vues à 390 px
  (Playwright, port 5178), sans défilement horizontal ni erreur de console.

### 23 quater. Lot 8c — création en prod et rangement (2026-11-18)

- #2823 mergée. `create-questions --dir scripts/questions/cm1-8c --publier` lancé par David depuis le worktree :
  7 brouillons (6108cc4c, f988f07a, 54c0f87f, 265ed3cc, 273dce6f, 20907b18, f521ccf8), ids commités sur
  `feat/questions-cm1-lot8c-rangement`.
- Relevé `etat-prod-2026-11-18-cm1-8c/` (7 draft, sans nœud ni tag), script `lot-cm1-8c-rangement.py` (gabarit 8a) →
  migration `20261118115830_questions_cm1_lot8c_rangement_tags` + fixture : 6108cc4c, 273dce6f, 20907b18 →
  propriétés ; f988f07a → cercle ; 54c0f87f, 265ed3cc → perpendiculaires et parallèles ; f521ccf8 → Symétrie
  axiale ; 10 tags posés (CM1-098 à 103, 106 ; CM2-091, 089, 090), aucun niveau ni statut changé, aucun nœud créé.
- Test `questions-cm1-lot8c-rangement-tags.test.ts` : 20/20 vert ; corps neutralisé (`select 1;`) : 9 échecs,
  7 sautés. `types:cliquet` tenu.
- `security-auditor` : aucun finding bloquant (état « avant » remesuré au MCP : 7 draft, nœud null, 0 tag ; seule
  migration en attente). Non bloquant : verrou bref du `disable trigger` (comme au 8a).

### 23 quinquies. Lot 8c — migration passée, page à cocher (2026-11-18)

- `db:migrate` lancé par David depuis le worktree (seule migration en attente). Vérifié au MCP : `20261118115830`
  jouée ; 7 brouillons sur leur nœud, 10 tags, `updated_at` inchangé.
- `page-a-cocher.ts --dir scripts/questions/cm1-8c` : 7 fiches (21 exemples), aucune alerte. Page :
  https://claude.ai/artifact/Snbe4QU13vJmw7qSfzQzS9 (`verdicts`, capacité `db`, vide).

### 23 sexies. Lot 8c — publication (2026-11-18)

- Verdicts lus (`ArtifactData list verdicts`) : 7 « OK », aucun commentaire.
- `publier-lot --dir scripts/questions/cm1-8c` en simulation : 7 brouillons passent ; David a lancé `--publier` et
  `garde-niveaux-tags`.
- Vérifié au MCP : les 7 modèles `published`. Couverture (points non archivés ayant un modèle publié) : CM1 144/171,
  CM2 100/158 (95 attendus d'après le compte du 8b : d'autres modèles CM2 ont été publiés entre-temps).

## 24. Lot 8d — figures à compléter : phase 0 (à valider, 2026-11-18)

Relevé MCP : aucun modèle, ni brouillon, sur 107, 108, 167, 168, ni sur leurs jumeaux CM2 (097 symétrique, 154
perpendiculaire, 155 parallèle ; prévus au lot 18 « tracés » de `questions-cm2`). Les 4 points sont en **B** :
case « figure » (` ```figure-a-completer `), contrôles `symetrique par d`, `point A' = symetrie(A, axe=d)` et
`droite p = perpendiculaire(A, d)` / `parallele(A, d)` (`perpendiculaire(P, d)` et `parallele(P, d)` du langage
des figures).

Rangement : 107, 108 → **Symétrie axiale** ; 167, 168 → **perpendiculaires et parallèles** (nœuds des points,
règles de l'ADR 0020 tenues).

Patrons en prod : CE2 `49b8dc0b` (compléter par symétrie, quadrillage, axe H / V, figure collée à l'axe) ; 6e
`59694d66` (symétrique, axe en diagonale, puis papier uni à l'équerre et au compas) ; 5e `9dc37ad2` (hauteur à
l'équerre sur quadrillage, `outils: droite, equerre`).

Bornes (cycle3) : 107 axe horizontal ou vertical, quadrillé (ou pointé) ; 108 quadrillé, axe H ou V **qui ne coupe
pas la figure** (point, segment, triangle) ; 167, 168 « à l'équerre » (accomp. CM1 p. 19-20).

⚠️ **Limite du juge** (`assertLines`, `construction/line.ts`) : sur papier uni, une droite à construire ne peut être
qu'une médiatrice ou une bissectrice. Une perpendiculaire ou une parallèle par un point n'est jugée **que sur
quadrillage**. L'élève y a la règle (droite par deux nœuds) **et** l'équerre, mais l'équerre n'est pas exigée :
compter les carreaux suffit.

| #   | Point | Modèle (titre)                                      | Variations                                                                                                                                                                         | Réponse | Rangement                      | Niv. |
| --- | ----- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------ | ---- |
| 1   | 107   | Compléter une figure pour la rendre symétrique      | Figure collée à l'axe, 5 à 7 sommets, côtés obliques (pas seulement en diagonale des carreaux) : V1 axe vertical ; V2 axe horizontal ; V3 axe décalé (pas au milieu de la fenêtre) | figure  | Symétrie axiale                | 1    |
| 2   | 108   | Construire le symétrique d'une figure               | Axe H ou V qui ne touche pas la figure, à 1 à 4 carreaux : V1 un point (A') ; V2 un segment ; V3 un triangle (piège : la figure glissée au lieu de retournée)                      | figure  | Symétrie axiale                | 2    |
| 3   | 167   | Tracer la perpendiculaire à une droite par un point | Quadrillage, `outils: droite, equerre` : V1 d horizontale ou verticale ; V2 d en diagonale des carreaux ; V3 d oblique (pente 2 ; 1 ou 1 ; 2, 3 ; 1) ; V4 le point A sur d         | figure  | perpendiculaires et parallèles | 1    |
| 4   | 168   | Tracer la parallèle à une droite par un point       | Même cadre : V1 d horizontale ou verticale ; V2 d en diagonale ; V3 d oblique (2 ; 1, 1 ; 2, 3 ; 1)                                                                                | figure  | perpendiculaires et parallèles | 2    |

Corrigés : 107-108 « chaque sommet a son symétrique de l'autre côté de l'axe, à la même distance : on compte les
carreaux jusqu'à l'axe, puis autant de l'autre côté ; la figure est retournée, pas glissée » ; 167 « on pose l'équerre
le long de d et on la fait glisser jusqu'à A ; sur le quadrillage : si d avance de p carreaux et monte de q, la
perpendiculaire avance de q et descend de p » ; 168 « la parallèle fait le même chemin de carreaux que d ; à
l'équerre : une perpendiculaire à d, puis la perpendiculaire à celle-ci par A ».

**Question d'accès** (migration nœud + tag) : personne ne pourra lire quelque chose qu'il ne pouvait pas lire
avant. La migration ne fait que ranger et taguer les modèles, sur des nœuds qui existent déjà.

**Questions à David** :

1. Les 4 modèles et leurs variations : OK ?
2. 167, 168 sur **quadrillage seulement** (limite du juge), avec l'équerre proposée mais pas exigée ; le tracé à
   l'équerre sur papier uni (« la droite doit être construite », comme la médiatrice) va dans
   `outils-manquants.md`, à faire plus tard ? Reco : oui. L'équerre est déjà reconnue comme construction exacte,
   c'est surtout la garde de l'auteur qui manque. Mais c'est un outil, donc un chantier à part.
3. Jumeaux CM2 : niveaux **CM1 et CM2** et tag sur les deux points pour 167/154 et 168/155 (mêmes intitulés) ;
   **CM1 seul** pour 107, 108 (le CM2-097 ajoute l'axe en diagonale) ? Reco : oui (même règle qu'au 8c).
4. 107 : écrire un modèle CM1 plutôt que d'ajouter le CM1 au modèle CE2 `49b8dc0b`, qui fait presque la même chose
   (axe H / V, figure collée à l'axe) ? Reco : écrire, avec des figures plus grandes et un axe décalé (même choix
   qu'au 8c). Sinon : ajouter le CM1 au modèle CE2 et le taguer CM1-107, ce qui fait un modèle de moins.

### 24 bis. Lot 8d : décisions (David, 2026-11-18)

« je suis tes recos » sur les quatre questions du § 24 :

- les 4 modèles et leurs variations ;
- 167, 168 sur quadrillage seulement, équerre proposée mais non exigée ; le tracé à l'équerre sur papier uni est
  la ligne n° 40 de `outils-manquants.md`, pour plus tard ;
- niveaux **CM1 et CM2**, tag sur les deux points pour 167/154 et 168/155 ; **CM1 seul** pour 107, 108 ;
- 107 : modèle CM1 écrit (pas de CM1 ajouté au modèle CE2 `49b8dc0b`).

### 24 ter. Lot 8d — écrit (2026-11-18)

- Script `docs/wip/questions/lot-cm1-8d.py` → `scripts/questions/cm1-8d/` (4 modèles, niveaux 1, 2, 1, 2 ; grades
  CM1 pour 01, 02, CM1 + CM2 pour 03, 04). Figures en catalogue, vérifiées par le script : nœuds de la fenêtre,
  figure d'un seul côté de l'axe (collée au 107, à 1 à 4 carreaux au 108), symétrique dans la fenêtre, droite
  attendue par au moins 3 nœuds.
- 107 : 3 variations × 5 demi-figures (fusée, vase, papillon, château, feuille) ; axe vertical au milieu, horizontal,
  décalé (fenêtre 16 × 10, axe à 6). 108 : point (`point A' = symetrie(A, axe=d)`), segment, triangle, 6 tirages
  chacun. 167 : 4 variations × 4 (H / V, diagonale, oblique, A sur d) ; 168 : 3 × 4.
- Simulation `create-questions` contre la prod : 4 « à créer », 86 specs (justes, et erreurs : figure glissée,
  symétrique incomplet, point décalé ou trop près de l'axe, parallèle au lieu de perpendiculaire et l'inverse,
  droite qui ne passe pas par A, nombres échangés sans changer le sens) ; `sonde-figures` 300 tirages par modèle,
  0 problème.
- Base locale (13 copies, une variation chacune) : les 13 aperçus vus à 390 px (Playwright, port 5181), sans
  défilement horizontal ni erreur de console. Détail mineur : le point final après « $A$ » peut passer seul à la
  ligne.

### 24 quater. Lot 8d — fichiers mergés (2026-11-18)

- #2838 mergée (CI verte). Conflit avec `main` sur `outils-manquants.md` : le n° 39 pris entre-temps (logarithme au
  clavier), la ligne du tracé à l'équerre sur papier uni devient le **n° 40**.

### 24 quinquies. Lot 8d — création en prod et rangement (2026-11-18)

- `create-questions --dir scripts/questions/cm1-8d --publier` lancé par David depuis le worktree : 4 brouillons
  (74e6d19d, 452b9a91, 66b4d4ed, 6452c31c), vérifiés au MCP (draft), ids commités sur
  `feat/questions-cm1-lot8d-rangement`.
- Relevé `etat-prod-2026-11-18-cm1-8d/` (4 draft, sans nœud ni tag), script `lot-cm1-8d-rangement.py` (gabarit 8c) →
  migration `20261118192953_questions_cm1_lot8d_rangement_tags` + fixture : 74e6d19d, 452b9a91 → Symétrie axiale ;
  66b4d4ed, 6452c31c → perpendiculaires et parallèles ; 6 tags posés (CM1-107, 108, 167, 168 ; CM2-154, 155), aucun
  niveau ni statut changé, aucun nœud créé.
- Test `questions-cm1-lot8d-rangement-tags.test.ts` : 20/20 vert ; corps neutralisé (`select 1;`) : 9 échecs,
  7 sautés. `types:cliquet` tenu.
- `security-auditor` : aucun finding, ni bloquant ni non bloquant. Diff avec le 8c limité aux données du lot ;
  l'état « avant » remesuré au MCP (4 draft, nœud null, 0 tag) ; c'est la seule migration en attente. PR #2840.

### 24 sexies. Lot 8d — migration passée, outil, page à cocher (2026-11-18)

- #2840 mergée ; `db:migrate` lancé par David depuis le worktree (seule migration en attente). Vérifié au MCP :
  `20261118192953` jouée ; 4 brouillons sur leur nœud, 6 tags, `updated_at` inchangé (heure de création).
- La page à cocher ne dessinait pas les blocs `figure-a-completer` (source seule). David : « oui » à la reco →
  **#2846** : la figure de départ, et à part la construction juste en vert (`solutionLines`, `solutionPoints`
  de la correction de l'appli) pour droite à construire, `symetrique par d`, `point A' = …` ; autre vérification :
  figure seule et alerte. Au passage, les specs sans espace (`segment(…)|segment(…)`) débordaient à 390 px : coupées.
  `code-reviewer` : aucun bug ; assertions renforcées (solution placée par rapport à A et à l'axe).
- Page `page-a-cocher.ts --dir scripts/questions/cm1-8d` : 4 fiches (13 exemples), aucune alerte ; vue à 390 et
  1200 px, sans défilement horizontal ni erreur de console. Publiée :
  https://claude.ai/artifact/3DT2a4R51Ef71YbezaxTcR (`verdicts`, capacité `db`, vide).

### 24 septies. Lot 8d — publié (2026-11-18)

- Page à cocher : 4 « OK » sur 4, aucun commentaire. `publier-lot --dir scripts/questions/cm1-8d` (simulation, puis
  `--publier`) et `garde-niveaux-tags` lancés par David (le mode auto refuse même la simulation). Vérifié au MCP :
  4 modèles `published`.
- Recompte MCP (points non archivés ayant un modèle publié) : **CM1 148/171** (144 + 4) ; CM2 108/158.

## 25. Lot 8e — solides, patrons, déplacements : phase 0 (à valider, 2026-11-18)

Relevé MCP : aucun modèle, ni brouillon, sur 109 à 119, **ni sur leurs jumeaux CM2** (098 nommer, 099 décrire,
100 reconnaître un patron, 101 construire un patron, 103 vocabulaire, 104 instructions, 105 assemblages : lot 19 de
`questions-cm2`, pas commencé). Nœuds : 109 à 113 → Solides › propriétés ; 115 (et 116) → Solides › patrons ;
117, 118 → Repérage et déplacements › coder un déplacement ; 119 → nœud du CE1-079 / 6-209 (à relever).

Outils, tous en prod : ` ```solide ` (cube, pavé, **prisme triangle / triangle-rectangle**, pyramide carrée /
rectangle / triangle, cylindre, cône, boule ; `marquer: face …`, `cotes:`), ` ```patron ` (cube, faux patrons,
grille `X` jusqu'à 10 cases, **`designer: opposee`**, **`completer:`**), ` ```robot ` (flèches, avance-pivote,
cases grises, `produire: oui`), ` ```cubes ` (assemblages), ` ```choix ` qui peut contenir des solides dessinés
(5e `b4c9a2a1`). Patrons : CE2 `b9c77a83`, `c9d9d6d4`, `7ed6c420`, `964711ea`, `11ebf9fe`, `c8c9746a` ;
CE1 `856f400e`, `c8da0674`, `e3bacfdc`, `10dcf449` ; 6e `ce3c4e11`.

Bornes (exemples de mise en œuvre CM1, p. 20-21) : faces d'un prisme droit = 2 bases superposables + faces
latérales rectangles ; pyramide = triangles qui se touchent au sommet + une base ; décrire = nombre et nature des
faces, sommets, arêtes ; patron : dire oui / non **et justifier un non** ; **faces opposées** d'un patron ;
**compléter une amorce** ; vocabulaire : avancer, reculer, quart de tour à gauche / à droite, **demi-tour** ;
« combien de petits cubes ? ». Pas de plan de ville (pas d'outil, exotique).

Fait nouveau : au § 4 bis, 116 (construire un patron) et 119 (assemblages de cubes) sont en **D**. Depuis,
`completer:` et ` ```cubes ` sont en prod, et le CM2 a passé son jumeau 101 en B (§ 14.1 de `questions-cm2`).

**Lot 8e — solides** (5 modèles) :

| #   | Point | Modèle                                 | Variations                                                                                                                                                                                                                                                     | Réponse       | Niv. |
| --- | ----- | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ---- |
| 1   | 109   | Nommer un solide, prisme droit compris | 7 noms : V1 prisme à base triangulaire ; V2 prisme couché (triangle rectangle) ; V3 pyramide à base triangulaire (piège : pas un prisme) ; V4 les six autres ; V5 « lequel est un prisme droit ? » parmi 4 solides dessinés (pyramide, cône, cylindre, prisme) | choix         | 1    |
| 2   | 110   | Le portrait d'un solide                | V1 « 5 faces : 2 triangles pareils et 3 rectangles » → prisme ; V2 « 1 carré et 4 triangles qui se touchent en un sommet » → pyramide ; V3 cube / pavé ; V4 sommets et arêtes d'un prisme dessiné (6, 9)                                                       | choix, nombre | 2    |
| 3   | 111   | Les faces d'un cube et d'un pavé (CM1) | V1 combien de faces pareilles à la face grisée (2) ; V2 mesures de la face grisée (cotes) ; V3 pavé à 2 faces carrées : combien de carrés, de rectangles (2, 4)                                                                                                | nombre        | 1    |
| 4   | 112   | Les faces d'une pyramide (CM1)         | V1 combien de faces, de triangles (base carrée 5 / 4 ; triangle 4 / 4) ; V2 sans dessin : base à 6 côtés → 6 faces latérales, 7 faces ; V3 forme de la base grisée                                                                                             | nombre, choix | 2    |
| 5   | 113   | Les faces d'un prisme droit            | V1 forme d'une face latérale grisée (rectangle) ; V2 forme d'une base grisée ; V3 combien de faces (2 + 3 = 5) ; V4 sans dessin : base à 5 côtés → 5 faces latérales, 7 faces                                                                                  | choix, nombre | 2    |

**Lot 8f — patrons, déplacements, assemblages** (7 modèles ; 8, 9, 10 si 116 sort du D, 14 si 119 sort du D) :

| #   | Point | Modèle                                | Variations                                                                                                                                                                               | Réponse | Niv. |
| --- | ----- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---- |
| 8   | 115   | Est-ce un patron de cube ? Pourquoi ? | V1 oui / non (11 vrais, 8 faux, tournés, retournés) ; V2 « pourquoi non ? » : 2 faces l'une sur l'autre (6 carrés) / il manque une face (5) / une face de trop (7)                       | choix   | 1    |
| 9   | 116   | La face opposée                       | Patron dessiné, une face grise : l'élève touche celle qui sera en face (`designer: opposee`) ; croix, puis patrons moins familiers                                                       | toucher | 2    |
| 10  | 116   | Compléter un patron de cube           | `completer:` 1 face (V1), puis 2 faces (V2) ; toute pose qui se plie en cube est juste                                                                                                   | poser   | 3    |
| 11  | 117   | Où regarde le robot ?                 | Robot dessiné, son nez montre où il regarde : V1 un quart de tour à droite / à gauche ; V2 demi-tour ; V3 deux ou trois pivots de suite ; V4 « il recule d'une case : où arrive-t-il ? » | choix   | 1    |
| 12  | 118   | Où arrive le robot ? (CM1)            | Code « avance de… / pivote… / demi-tour » écrit en mots, 4 à 7 instructions, quadrillage 8 × 6 (patron CE1 `e3bacfdc`)                                                                   | choix   | 1    |
| 13  | 118   | Écrire le code du robot (CM1)         | `produire: oui`, 10 × 7, murs gris : V1 flèches ; V2 avance-pivote, sens de départ tiré                                                                                                  | code    | 2    |
| 14  | 119   | Combien de petits cubes ?             | ` ```cubes ` : V1 une rangée de piles ; V2 deux rangées, cubes cachés ; V3 escalier (≤ 20 cubes ; patron 6e `ce3c4e11`)                                                                  | nombre  | 1    |

**Question d'accès** (migration nœud + tag, comme aux 8c, 8d) : personne ne pourra lire quelque chose qu'il ne
pouvait pas lire avant.

**Questions à David** :

1. Les modèles et leurs variations : OK ?
2. 116 (construire un patron) et 119 (assemblages de cubes) sortent du D, avec les outils qui sont en prod depuis
   (`completer:`, ` ```cubes `), comme le CM2 l'a fait pour 101 ? Reco : oui (modèles 9, 10, 14). 114 (construire
   un solide en vrai) reste en D.
3. Jumeaux CM2 : niveaux **CM1 et CM2**, tag des deux points (109/098, 110/099, 115/100, 116/101, 117/103,
   118/104, 119/105), même règle qu'aux 8c, 8d ? Reco : oui. Le lot 19 du CM2 n'aurait plus que 102 (patron du
   pavé) : je le signale dans le journal du CM2.
4. 111, 112 : écrire des modèles CM1 plutôt que d'ajouter le CM1 aux modèles CE2 `7ed6c420`, `964711ea` ? Reco :
   écrire (même choix qu'aux 8c, 8d : le CM1 ajoute les mesures, la base à 6 côtés).

### 25 bis. Lots 8e, 8f : décisions (David, 2026-11-18)

« je valide » : les 14 modèles du § 25 et leurs variations ; 116 et 119 sortent du D (modèles 9, 10, 14), 114
reste en D ; niveaux **CM1 et CM2** et tag des deux points (109/098, 110/099, 115/100, 116/101, 117/103,
118/104, 119/105) ; 111, 112 : modèles CM1 écrits (pas de CM1 ajouté aux modèles CE2).

### 25 ter. Lot 8e — écrit (2026-11-18)

- Script `docs/wip/questions/lot-cm1-8e.py` → `scripts/questions/cm1-8e/` (5 modèles, 17 variations, 70 specs) ;
  grades CM1 + CM2 pour 01, 02 ; CM1 pour 03, 04, 05.
- **Niveaux corrigés** : ceux de la phase 0 (1, 2…) étaient faux. Le niveau suit le nœud Solides › propriétés, où
  le CE2 s'arrête à 13 → **14 à 18**.
- Règle ajoutée en écrivant (dans le script) : un cube et un pavé **sont** des prismes droits, donc jamais un cube
  ni un pavé à nommer quand « prisme droit » est parmi les choix. Le modèle 01 dessine boule, cône, pyramides,
  cylindre ; le 02 garde cube et pavé dans une variation à 4 choix, sans prisme droit.
- `create-questions` en simulation contre la prod : 5 « à créer » ; `sonde-cubes` : 1 492 blocs, 0 problème.
- Base locale (17 copies, une variation chacune), aperçus à 390 px (Playwright, port 5182) : aucun défilement
  horizontal, aucune erreur de console. Corrigés après l'aperçu : (1) face latérale grisée d'un prisme seulement si
  ses deux côtés sont cotés (le côté oblique ne l'est jamais ; 4 2 3 donnait 2,8 cm sur 3 cm, indécidable) ;
  (2) « La base est un polygone à 7 côtés : elle a 7 côtés » → « La base a 7 côtés (un pentagone) ».

### 25 quater. Lot 8e — fichiers mergés (2026-11-18)

- #2855 mergée. Premier passage de la CI rouge : `scripts/__tests__/ci-lint-fichiers.test.ts` hors délai (9,7 s pour
  5 s), sans rapport avec le lot ; vert à la relance du job.

### 25 quinquies. Lot 8e — création en prod et rangement (2026-11-18)

- `create-questions.ts --dir scripts/questions/cm1-8e --publier` lancé par David depuis le worktree : 5 brouillons
  (b80d1619, af2d7e03, 281ad02d, b423785d, f83c0424), vérifiés au MCP (draft, sans nœud, 0 tag), ids commités.
- Relevé `etat-prod-2026-11-18-cm1-8e/` (5 modèles, 0 tag ; les 7 points sur Géométrie > Solides > propriétés),
  script `lot-cm1-8e-rangement.py` (gabarit 8d) → migration `20261118223150_questions_cm1_lot8e_rangement_tags`
  et fixture : 5 modèles rangés sur Solides > propriétés, 7 tags posés (CM1-109 à 113 ; CM2-098, 099), aucun
  niveau ni statut changé, aucun nœud créé. Diff avec le 8d limité aux données du lot.
- Test `questions-cm1-lot8e-rangement-tags.test.ts` : 20/20 vert ; corps neutralisé (`select 1;`) : 9 échecs,
  7 sautés. `types:cliquet` tenu. Seule migration en attente (`migration list --linked`).
- `security-auditor` : aucun finding, ni bloquant ni non bloquant (diff avec le 8d limité aux données ; état
  « avant » remesuré au MCP : 5 draft, nœud null, 0 tag ; 7 points et le nœud Solides > propriétés actifs).

### 25 sexies. Lot 8e — migration passée, page à cocher (2026-11-19)

- #2857 mergée ; `db:migrate` lancé par David depuis le worktree. Vérifié au MCP : `20261118223150` jouée ;
  5 brouillons sur Solides > propriétés, 7 tags (CM1-109 à 113 ; CM2-098, 099), toujours draft.
- Page `page-a-cocher.ts --dir scripts/questions/cm1-8e` : 5 fiches (17 exemples), aucune alerte ; vue à 1200 px
  sans défilement ni erreur de console. À 390 px, **un débordement** : correction du modèle 04 (pyramide),
  `$\textcolor{…}{\text{ses faces latérales sont des triangles qui se rejoignent au sommet}}$` (66 caractères
  dans une formule, KaTeX ne coupe pas) : la ligne sort de la carte, et sortirait de l'écran d'un téléphone dans
  l'appli. Reco : ne colorer que le mot-clé (« ses faces latérales sont des $\textcolor{…}{\text{triangles}}$
  qui se rejoignent au sommet »), à corriger dans `lot-cm1-8e.py` puis re-créer (mise à jour par id).
  Publiée : https://claude.ai/artifact/J4kWSo45dx1hDoQZh1UXV8 (`verdicts`, capacité `db`, vide).
- Verdicts (2026-11-19) : 5 « OK » sur 5, aucun commentaire. La correction du modèle 04 (débordement à 390 px)
  reste à trancher.
- Correction du modèle 04 (go de David, 2026-11-19) : seul « triangles » reste coloré (`lot-cm1-8e.py`, fichier
  régénéré, id gardé ; diff d'une ligne). Simulation `create-questions` : 04 « CONTENU DIFFÉRENT », les 4 autres
  identiques. Page régénérée : 390 px sans défilement horizontal, aucune erreur de console. À la mise en prod :
  `create-questions.ts --dir scripts/questions/cm1-8e --publier --mettre-a-jour`, puis `publier-lot`.

### 25 septies. Lot 8e — publié, correction du 04 manquée (2026-11-19)

- #2863 mergée. David a lancé `create-questions … --publier --mettre-a-jour` et `publier-lot … --publier`.
  Vérifié au MCP : 5 modèles `published` ; recompte **CM1 153/171** (148 + 5), CM2 115/158.
- Le modèle 04 (b423785d) porte encore l'ancienne phrase (`strpos` au MCP : ancienne vraie, nouvelle fausse) ;
  la simulation dit toujours « CONTENU DIFFÉRENT ». Cause probable : modèle déjà publié au passage de
  `--mettre-a-jour`, qui laisse les modèles publiés. Je n'ai pas vérifié au MCP entre les deux commandes.
- David : « je ne veux rien faire manuellement » (pas d'édition dans l'appli). Voies (a) migration de données,
  (b) option de `create-questions` sur modèle publié : à trancher (Reprendre ici).
- David : « je te suis » → voie (a), migration de données qui remplace la phrase du modèle 04 publié.

### 25 octies. Migration de contenu du modèle 04 (2026-11-19)

- Relevé MCP : b423785d `published`, `{CM1}`, md5(variations) `3dda5f67…`, md5(test_specs) `954a7dcc…`, ancienne
  phrase présente. « Avant » reconstruit depuis le fichier du lot (ancienne phrase remise) : même md5 que la
  prod, donc aucun contenu recopié à la main.
- Générateur `docs/wip/questions/cm1-8e-04-contenu.py` (gabarit `questions-1techno/83b1f614-contenu.py`) →
  migration `20261119060346_questions_cm1_lot8e_04_contenu.sql` et fixture
  `tests/integration/fixtures/questions-cm1-lot8e-04-contenu.json`. Garde : variations EXACTEMENT celles de la
  prod, sinon refus ; modèle absent (base locale) : rien. Rollback écrit, gardé.
- Test `tests/integration/questions-cm1-lot8e-04-contenu.test.ts` : rouge migration vidée (2 échecs + bloc
  principal en échec au `beforeAll`), 9/9 vert avec elle.
- Accès : aucune policy ne change ; seule une phrase de corrigé change.
- Outil manquant noté : `outils-manquants.md` n° 41 (corriger un publié sans migration écrite par modèle).
- #2869 mergée ; `db:migrate` (seule migration en attente, vérifié par `migration list --linked`) ; MCP :
  nouvelle phrase présente, ancienne absente, md5(variations) `c120baed…` = fichier du dépôt, specs inchangées.

### 25 nonies. Lot 8f — écrit (2026-11-19)

- Script `docs/wip/questions/lot-cm1-8f.py` → `scripts/questions/cm1-8f/` (7 modèles, 17 variations, 89 specs),
  grades **CM1 + CM2** pour les 7. Sonde `docs/wip/questions/patron-sonde.ts` (pliage de l'appli) : réponses
  attendues des gestes `designer:` / `completer:`, combinaisons (patron, faces retirées) qui laissent des faces
  reliées (31 à une face, 47 à deux), poses fausses des specs jugées par `isPatronAnswerCorrect`.
- **Niveaux** (relevé MCP du 2026-11-19), à la suite de ceux de chaque nœud : Solides › patrons a 1, 2 (CE2) et
  3 (5e) → 08, 09, 10 en 4, 5, 6 (le modèle de 5e reste au 3, plus bas que le CM1 : à revoir au rangement si
  David le veut) ; Repérage et déplacements › coder un déplacement a 1 à 5 → 11, 12, 13 en 6, 7, 8.
- **Rangement prévu du 14** : sur Solides › constructions (CE1 en 4, 5) au niveau 6, pas sur la notion Solides
  où sont les points CM1-119, CM2-105 et les modèles de 6e (1 à 3) ; la règle de l'ADR 0020 (point sur le nœud
  du modèle ou sur sa notion) l'autorise.
- Écarts à la phase 0, d'écriture seulement : 08 V2 coupé en trois variations (6, 5, 7 carrés) ; 12 dessiné en
  ` ```figure ` comme le CE1 `e3bacfdc` (le bloc robot ne numérote pas de points), 12 scènes tirées une fois
  (graine fixe), une sur deux avec un demi-tour, jamais « avance de n, demi-tour, avance de n » ; pièges : droite
  et gauche échangées, demi-tour oublié ou une case de trop ; 13 : mur gris d'une colonne à une seule ouverture,
  chemin de 15 cases au plus (conditions) ; 11 V4 « recule » : choix « la case juste au-dessus… ».
- `create-questions` en simulation contre la prod : 7 « à créer » ; `question:specs` 300 tirages par variation,
  tous réussis ; `sonde-cubes` 1 200 blocs, `sonde-figures` 300 tirages : 0 problème.
- `questions-cm2` prévenue par message : CM2-100, 101, 103, 104, 105 pris ici, son lot 19 garde 102.
- Base locale (18 copies, une variation chacune), aperçus à 390 px (Playwright, port 5183) : aucun défilement
  horizontal, aucune erreur de console ; vus : patrons, face grise, cases en pointillés, robot, mur gris.
- #2872 mergée (CI verte du premier coup).

### 25 decies. Lot 8f — création en prod et rangement (2026-11-19)

- `create-questions.ts --dir scripts/questions/cm1-8f --publier` lancé par David : 7 brouillons (0da1780b,
  ebc05cbb, 9fe0fee6, a36679be, 10f2e60e, 7714c08c, 08337d34), vérifiés au MCP (draft, CM1 + CM2, sans nœud,
  0 tag), ids commités.
- Relevé `etat-prod-2026-11-19-cm1-8f/`, script `lot-cm1-8f-rangement.py` (gabarit 8e) → migration
  `20261119085732_questions_cm1_lot8f_rangement_tags` et fixture : 08, 09, 10 sur Solides > patrons ; 11, 12, 13
  sur Repérage et déplacements > coder un déplacement ; 14 sur Solides > constructions (CM1-119 et CM2-105 sont
  sur la notion Solides) ; 14 tags posés (CM1-115 à 119 ; CM2-100, 101, 103, 104, 105), aucun niveau ni statut
  changé, aucun nœud créé.
- Test `questions-cm1-lot8f-rangement-tags.test.ts` : 20/20 vert ; corps neutralisé (`select 1;`) : 9 échecs,
  7 sautés. `types:cliquet` tenu. Seule migration en attente (`migration list --linked`).
- `security-auditor` : aucun finding bloquant (diff avec le 8e limité aux données ; état « avant » remesuré au
  MCP). Non bloquant, déjà connu : les tags (pas le contenu) des brouillons sont lisibles par tout compte connecté.
- #2873 mergée (premier passage rouge : garde « doc à jour », `Doc-inchangée:` ajouté). `db:migrate` lancé par
  David (au second essai : le premier n'avait rien joué). Vérifié au MCP : `20261119085732` jouée ; 7 brouillons
  sur leur nœud, 14 tags, `updated_at` préservé.

### 25 undecies. Lot 8f — page à cocher et publication (2026-11-19)

- Page `page-a-cocher.ts --dir scripts/questions/cm1-8f` : 7 fiches (18 exemples) ; 5 alertes « bloc non
  dessiné » (` ```patron ` : 08, 09, 10 ; ` ```robot ` : 11, 13), jouées dans l'aperçu. 1200 px sans défilement ni
  erreur de console ; à 390 px, la source d'un patron (`000 000/…`) déborde (page seulement). Outils-manquants
  n° 43. Publiée : https://claude.ai/artifact/3tRyJQfLE7fJiNcb2S2toG (`verdicts`, capacité `db`).
- Verdicts : 7 « OK » sur 7, aucun commentaire. `publier-lot` en simulation : 7/7 ; `--publier` et
  `garde-niveaux-tags` lancés par David. Vérifié au MCP : 7 modèles `published`.
- Recompte MCP (points non archivés ayant un modèle publié) : **CM1 158/171** (153 + 5) ; CM2 120/158 (115 + 5).

## 26. Lot 9 — les 13 derniers points : phase 0 (à valider, 2026-11-19)

Relevé MCP : aucun modèle, ni brouillon, sur les 13 points. Jumeaux CM2 **sans modèle** : CM2-087 (= CM1-097),
094 (= 104), 095 (= 105), 109 (= 124) ; CM2-115 et 116 (= 129, 130) ont chacun un modèle CM2 (`90d6612d`,
`5343077e`), trop larges pour le CM1 (aire du carré ; deux étapes, linéarité additive). Le lot 15 du CM2
(probabilités 109 à 114) n'est pas commencé.

**Changement depuis le § 4 bis** : 097 et 104 peuvent sortir du D. La figure à compléter construit maintenant
sur papier uni, à la règle graduée : segment de longueur donnée (`segment AB = 6 cm`), rectangle et carré cotés,
triangle rectangle en cm, cercle de rayon donné (`cercle(O, rayon=4 cm)`). Aucun modèle de CE2 à 6e ne s'en
sert en cm. 105 (figure composée) reste hors d'atteinte : une figure à compléter ne vérifie qu'une construction
à la fois, et la perpendiculaire / parallèle à l'équerre sur papier uni manque (outils-manquants n° 40).

Trois lots, tout en cases et case « choix » (`plusieurs:` quand il y a plusieurs bonnes réponses), roues dessinées
en ` ```partage ` (`disque N`, parts grisées), rangement en ` ```ranger `.

### 9a — probabilités (6 modèles, sans aucun calcul de probabilité : borne de 123)

| #   | Point           | Titre                                     | Variations                                                                                                                                                                                                      |
| --- | --------------- | ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | 123             | Est-ce une expérience aléatoire ?         | V1 une situation, Oui / Non (dé, pièce, carte, boule tirée sans regarder, roue : oui ; 3 + 4, balle lâchée, jour après lundi : non) ; V2 quatre situations, cocher celles où le hasard décide (`plusieurs:`)    |
| 2   | 124 (+ CM2-109) | Toutes les issues possibles               | V1 dé à 6 faces ou pièce : combien d'issues ? (case) ; V2 sac de boules de 3 couleurs : cocher les issues (une couleur absente en piège) ; V3 jeu de 32 cartes : cocher les couleurs possibles (pique, cœur…)   |
| 3   | 125             | Impossible, possible ou certain ?         | V1 dé : « obtenir 7 », « obtenir un nombre plus petit que 7 », « obtenir 3 » → impossible / certain / possible ; V2 sac (9 rouges, 1 bleue ; 5 et 5) : probable / peu probable / une chance sur deux            |
| 4   | 126             | Du moins probable au plus probable        | V1 sac de 3 couleurs aux nombres nettement différents (2, 5, 9) : ranger les trois tirages ; V2 roue de 8 parts : quelle zone a le plus de chances ? (choix)                                                    |
| 5   | 127             | Deux issues, mais pas une chance sur deux | roue de 4 parts dont 1 grise, sac de 1 rouge et 3 bleues : « deux issues ; une chance sur deux chacune ? » → plus / moins / une chance sur deux ; une variation sur trois où c'est vraiment une chance sur deux |
| 6   | 128             | Chaque issue a-t-elle autant de chances ? | Oui / Non : dé ordinaire, pièce, sac 4 et 4, roue moitié grise → oui ; sac 6 et 2, roue 1 part sur 4, dé truqué « deux faces 6 » → non                                                                          |

### 9b — proportionnalité (2 modèles, CM1 seul)

| #   | Point | Titre                                      | Variations                                                                                                                                                                                                                                                 |
| --- | ----- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7   | 129   | Est-ce une situation de proportionnalité ? | V1 banque en contexte, Oui / Non (cahiers identiques, pile de manuels, recette, prix au kilo : oui ; taille et âge, taxi avec prise en charge, lot promotionnel, forfait : non) ; V2 deux achats chiffrés, entiers (3 cahiers 6 €, 6 cahiers 12 € ou 11 €) |
| 8   | 130   | Résoudre un problème de proportionnalité   | une seule étape, rapport entier 2 à 5 ou 10 (borne) : V1 entiers (5 manuels 4 kg → 15 manuels) ; V2 prix décimal (2,40 € → × 3) ; V3 dans l'autre sens, ÷ (12 crêpes, 3 œufs → 4 crêpes) — voir question 3                                                 |

### 9c — constructions à la règle graduée (4 modèles, CM1 + CM2)

| #   | Point           | Titre                                                     | Variations                                                                                                          |
| --- | --------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| 9   | 097 (+ CM2-087) | Tracer un segment de longueur donnée                      | papier uni, Règle graduée · Segment : V1 cm entiers (3 à 12) ; V2 cm et mm (5,3 cm) ; V3 sur une demi-droite donnée |
| 10  | 104 (+ CM2-094) | Construire un rectangle ou un carré de dimensions données | [AB] tracé, Segment · Équerre · Règle graduée : V1 rectangle (7 × 3 cm) ; V2 carré (8 cm)                           |
| 11  | 104 (+ CM2-094) | Construire un triangle rectangle de côtés donnés          | [AB] tracé, angle droit en A, [AC] en cm (10 et 6 cm), Segment · Équerre · Règle graduée                            |
| 12  | 104 (+ CM2-094) | Tracer un cercle de rayon donné                           | centre O donné, rayon 2 à 6 cm (V2 en mm : 3,5 cm), Règle graduée · Compas                                          |

**Restent sans modèle (D)** : 105 (figure composée, ci-dessus), 114 (construire un solide en vrai, § 25 bis),
140 (suite orale). Fin du chantier : **168 points sur 171**.

**Nœuds** : ceux des points (Expériences aléatoires, événements, probabilité simple, équiprobabilité,
caractérisation, Situations de proportionnalité, constructions) ; sous-notions à relever au moment de la
migration, comme aux lots précédents.

**Question d'accès** (migration nœud + tag, comme aux 8c à 8f) : personne ne pourra lire quelque chose qu'il ne
pouvait pas lire avant.

**Questions à David** :

1. Les 12 modèles et leurs variations : OK ?
2. 097 et 104 sortent du D (outil de la règle graduée en prod) ; 105, 114, 140 y restent ? Reco : oui. 105 s'ajoute
   aux outils manquants (« figure composée : plusieurs constructions vérifiées dans une même figure ») ?
3. 130 : la V3 (÷, revenir de 12 crêpes à 4) est-elle encore « une seule utilisation de la linéarité » ? Reco : oui.
4. Jumeaux CM2 (124/109, 097/087, 104/094) : niveaux CM1 + CM2 et tag des deux points, comme aux 8c à 8f, et le
   CM2 prévenu (son lot 15 perd 109, son lot 18 perd 087 et 094) ? Reco : oui. 129, 130 : modèles CM1 seuls
   (ceux du CM2 dépassent le CM1).
5. Ordre : 9a → 9b → 9c, une PR de fichiers et une migration par lot, ou 9a + 9b ensemble (8 modèles, sans
   géométrie) ? Reco : 9a + 9b ensemble, puis 9c.

### 26 bis. Lot 9 : décisions (David, 2026-11-19)

« go » sur les cinq recommandations du § 26 : les 12 modèles et leurs variations ; 097 et 104 sortent du D,
105, 114, 140 y restent (105 à ajouter aux outils manquants : plusieurs constructions vérifiées dans une même
figure) ; 130 V3 (÷ une fois) = une seule utilisation de la linéarité ; jumeaux CM1 + CM2 et tag des deux points
(124/109, 097/087, 104/094), le CM2 prévenu ; 129, 130 CM1 seuls ; ordre 9a + 9b ensemble, puis 9c.

### 26 ter. Lots 9a + 9b — écrits (2026-11-19)

- Script `docs/wip/questions/lot-cm1-9ab.py` → `scripts/questions/cm1-9ab/` (8 modèles, 19 variations, 67 specs) ;
  grades CM1 + CM2 pour 02 (CM1-124, CM2-109), CM1 pour les autres. Niveaux : 1, sauf 04 et 05 (2).
- Écarts au § 26 : 07 s'appelle « Proportionnel ou pas ? » (titre du CM2 `90d6612d` déjà pris au même niveau,
  `create-questions` bloque) ; sa V2 parle de cahiers, pas de pains au chocolat (prix trop hauts) ; 08 V2, prix
  d'un croissant de 1,10 à 1,90 € (1,00 € rendait le calcul trivial).
- Rangement (04 V1) : positions affichées relevées par `ranger-attendus.ts` (`['2', '0', '1']` aux deux tirages).
- `create-questions` en simulation contre la prod : 8 « à créer » ; `question:specs` 300 tirages par variation,
  tous réussis, aucun `\textcolor` hors `$`.
- Base locale (19 copies, une variation chacune), aperçus à 390 px (Playwright, port 5184) : aucun défilement
  horizontal, aucune erreur de console ; vus : rangement (attendu juste), roue à 4 parts, prix « 2,00 € ».
- #2881 ouverte, CI verte, mergée (aucune revue : contenu). `questions-cm2` prévenue par message : CM2-109 (lot 15),
  CM2-087 et CM2-094 (lot 18) pris ici ; noté au § 21.1 de son journal.

### 26 quater. Lot 9ab — création en prod et rangement (2026-11-19)

- `create-questions.ts --dir scripts/questions/cm1-9ab --publier` lancé : 8 brouillons (19b2b250, 5081e180,
  ae90499d, 63675a23, 41e84aa6, 78940a45, 833b120a, 1dd68bdd), vérifiés au MCP (draft, sans nœud, 0 tag ;
  5081e180 en CM1 + CM2, les autres CM1), ids commités. (PR #2887, ouverte par erreur sur la branche déjà
  mergée, fermée : les ids partent avec le rangement.)
- Relevé `etat-prod-2026-11-19-cm1-9ab/`, script `lot-cm1-9ab-rangement.py` (gabarit 8f) → migration
  `20261119145503_questions_cm1_lot9ab_rangement_tags` et fixture : chacun sur le nœud de son point (règle des
  lots précédents) : 01 sur Probabilités > Expériences aléatoires ; 02 > événements ; 03, 04 > probabilité
  simple ; 05, 06 > équiprobabilité ; 07 sur Proportionnalité > Situations de proportionnalité >
  caractérisation ; 08 sur la notion Situations de proportionnalité (le modèle CM2 voisin `5343077e` est sur
  la sous-notion « quatrième proportionnelle » : déplaçable à la main si David le préfère). 9 tags posés
  (CM1-123 à 130, CM2-109), aucun niveau ni statut changé, aucun nœud créé.
- Test `questions-cm1-lot9ab-rangement-tags.test.ts` : 20/20 vert ; corps neutralisé (`select 1;`) : 9 échecs,
  7 sautés. `types:cliquet` tenu. Seule migration en attente (`migration list --linked`).
- `security-auditor` : aucun finding bloquant (diff avec le 8f limité aux données ; état « avant » vérifié au MCP).
- #2888 mergée (CI verte du premier coup). `db:migrate` : « à jour » (migration déjà poussée, sans doute par une
  autre session) ; vérifié au MCP : `20261119145503` jouée, 8 brouillons sur leur nœud, 9 tags, `updated_at`
  préservé.

### 26 quinquies. Lot 9ab — page à cocher (2026-11-19)

- Page `page-a-cocher.ts --dir scripts/questions/cm1-9ab` : 8 fiches (19 exemples) ; 1 alerte « bloc non dessiné »
  (` ```ranger ` : 04), vu juste dans l'aperçu local (§ 26 ter). Publiée :
  https://claude.ai/artifact/T3W2rVufrWynVffhQfQeyk (`verdicts`, capacité `db`), base vide à la publication.
- Verdicts : 8 « OK » sur 8, aucun commentaire. `publier-lot` en simulation : 8/8 ; `--publier` et
  `garde-niveaux-tags` lancés par David. Vérifié au MCP : 8 modèles `published`.
- Recompte MCP (points non archivés ayant un modèle publié) : **CM1 166/171** ; CM2 134/158.

### 26 sexies. Lot 9c — écrit (2026-11-19)

- Script `docs/wip/questions/lot-cm1-9c.py` → `scripts/questions/cm1-9c/` (4 modèles, 8 variations, 38 specs) ;
  grades CM1 + CM2 pour les quatre (jumeaux CM2-087, 094). Niveaux : 1 (09, 12), 2 (10, 11). Figures à
  compléter sur papier uni, palettes par défaut (syntaxe : `block-catalog/figure-a-completer.ts`).
  - 09 segment : V1 3 à 12 cm ; V2 cm et mm (3,1 à 9,9 cm) ; V3 sur [Ax) (3 à 10 cm, 6 directions).
  - 10 : V1 rectangle ([AB] 6 à 9 cm, BC 2 à 5 cm) ; V2 carré (4 à 7 cm).
  - 11 triangle rectangle en A : [AB] 5 à 10 cm, AC 3 à 7 cm.
  - 12 cercle de centre O : V1 rayon 2 à 6 cm ; V2 2,1 à 5,9 cm.
- Écart au § 26 : V3 du 09, étiquette « x » ajoutée au bout de la demi-droite (`texte(…)`), absente du rendu
  sans elle alors que l'énoncé dit $[Ax)$.
- Specs : justes et erreurs typiques (longueur à 2-5 mm près, mm oubliés, tracé sans règle ni équerre,
  pas sur la demi-droite, angle droit en B, rayon = moitié du diamètre, figure non fermée) ; `question:specs`
  300 tirages par variation, tous réussis ; `sonde-figures` 0 problème ; `create-questions` en simulation contre
  la prod : 4 « à créer ».
- #2894 ouverte, CI verte, mergée (aucune revue : contenu).
- Base locale (9 copies, une variation chacune), aperçus à 390 px (Playwright, port 5184) : aucun défilement
  horizontal, aucune erreur de console ; vus : les 8 figures et leurs palettes (Règle graduée · Segment ;
  Segment · Équerre · Règle graduée ; Règle graduée · Compas).

### 26 septies. Lot 9c — création en prod et rangement (2026-11-19)

- `create-questions.ts --dir scripts/questions/cm1-9c --publier` lancé par David : 4 brouillons (7d048525,
  82351474, 3a888b08, 2e15c33a), vérifiés au MCP (draft, sans nœud, 0 tag, CM1 + CM2), ids commités.
- Relevé `etat-prod-2026-11-19-cm1-9c/`, script `lot-cm1-9c-rangement.py` (gabarit 9ab) → migration
  `20261119165723_questions_cm1_lot9c_rangement_tags` et fixture : les 4 sur Géométrie > Figures planes >
  constructions (nœud des quatre points) ; 8 tags posés (09 : CM1-097, CM2-087 ; 10, 11, 12 : CM1-104,
  CM2-094), aucun niveau ni statut changé, aucun nœud créé.
- Test `questions-cm1-lot9c-rangement-tags.test.ts` : 20/20 vert ; corps neutralisé (`select 1;`) : 9 échecs,
  7 sautés. `types:cliquet` tenu. Seule migration en attente (`migration list --linked`).
- `security-auditor` : aucun finding bloquant (diff avec le 9ab limité aux données ; policies et état « avant »
  vérifiés au MCP). #2897 mergée (CI verte du premier coup). `migration list --linked` : seule 20261119165723 en
  attente (20261119165705 = lot 14b du CM2, déjà sur `main` et jouée) ; `db:migrate` passé ; vérifié au MCP :
  4 brouillons sur « constructions », 8 tags, `updated_at` préservé.
- Page `page-a-cocher.ts --dir scripts/questions/cm1-9c` : 4 fiches (8 exemples) ; 4 alertes « solution non
  dessinée » (segment, rectangle, carré, triangle, cercle : vérifications non dessinées par la page), solutions
  vues dans l'aperçu local (§ 26 sexies). Publiée : https://claude.ai/artifact/M3j3FBF47PAATrDk2cgwcf
  (`verdicts`, capacité `db`), base vide à la publication.
- Verdicts : 4 « ok » sur 4, sans commentaire (ids = ceux des 4 fichiers). David a lancé la simulation,
  `garde-niveaux-tags` et `publier-lot --publier` ; vérifié au MCP : les 4 `published`, `grades` CM1 + CM2.

### 26 octies. Recompte de clôture (2026-11-19)

- MCP : 171 points CM1 non archivés, **168 avec un modèle publié** ; sans modèle : 105, 114, 140 (D, § 26 bis).
  Aucun point n'a de modèle en brouillon.
- Modèles `grades ∋ CM1` : 219 publiés, tous rangés et tagués ; 8 brouillons sans tag ni point (`cda36cc2`,
  `08fbcd26`, `09f22a2f`, `17a3c039`, `61baef92`, `fe9df9ba`, `4ee04b22`, `5d4dfd32`) = ceux du § 5.4, dépubliés
  au lot 0 (§ 5.6), voulus.
- Découpage : lots 0 à 9c tous publiés (§ 3, 4 bis, 14 bis, 16 bis, 20 bis, 26 bis) ; 53 PR mergées, 1 fermée
  (#2887), aucune ouverte.
- Reste de la décision du § 26 bis : 105 ajouté aux outils manquants (n° 45, figure composée).

### 26 nonies. Clôture (2026-11-19)

- Versé dans `docs/systeme/programmes/bornes/cycle3.md` (§ CM1, « Couverture en modèles de questions ») et dans
  `docs/pratiques/couvrir-un-niveau.md` § 9 (pièges du CM1, modèles communs à deux niveaux). Journal archivé.
- 08 (`1dd68bdd`, CM1-130) : David veut le voir sur la sous-notion « quatrième proportionnelle » (à côté du
  `5343077e` du CM2) ; déplacement par une migration de rangement, hors de ce journal.
