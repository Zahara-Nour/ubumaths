# Chantier « questions-ce2 » — couvrir les points du CE2 en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Chantiers de référence : le CP ([questions-progress.md](questions-progress.md)), le CE1
> ([questions-ce1-progress.md](questions-ce1-progress.md)).

## Reprendre ici

_Mis à jour le 2026-10-28, après #1937 et `db:migrate`._

- **État** : lot 1 en prod en BROUILLON, rangé et tagué, 2 OK sur 5 (60, × 4, × 8 sans verdict). Lot 2 en prod en BROUILLON, rangé et tagué (migration `20261029003200` jouée, vérifiée au MCP : 9 nœuds, 1 point chacun, `updated_at` intact) ; page à cocher publiée, 0 verdict.
- **Prochaine action** : compter les verdicts (`ArtifactData list verdicts`) — lot 1 : https://claude.ai/artifact/TVCyuAznqrAuopDJaPXyP4 ; lot 2 : https://claude.ai/artifact/KLQGsdQYbft3hoQt5yHnCL. Lot tout OK → `pnpm tsx scripts/questions/publier-lot.ts --dir scripts/questions/ce2-<n>` (simulation), puis David `--publier`. « À revoir » → corriger (couvrir-un-niveau § 7), remettre le verdict à zéro. Puis lot 3.
- **En attente de David** : relecture du lot 1 (60, × 4, × 8) et du lot 2 (9 fiches) ; confirmer « espaces dès 4 chiffres » (4500 sans espace = ½ point).
- **Pièges en cours** : horodatage = max de la PROD + 1 min, re-vérifier juste avant `db:migrate` (la prod avance vite : #1932 → renommage #1937) ; CI : `corrections.test.ts` « cas rare » > 5 s et client `wrapDynamicImport` intermittents → relancer le job ; commitlint refuse un sujet en majuscule ; page à cocher APRÈS `db:migrate`.
- **Worktree / branche** : aucun (retirés après #1937).

## 1. Relevé (prod, MCP lecture seule, 2026-10-27)

97 points CE2 ; **13 avec au moins un modèle tagué** : 006 (4), 007, 018, 021 (5), 085 (5), 022,
092, 023, 024, 025 (2), 026 (2), 027, 028 (5). **84 sans modèle.**

69 modèles `grades ∋ CE2`, tous publiés, tous rangés sur un nœud ; 30 tagués, 39 sans tag (dont
les 4 venus du CE1 : `810f1824`, `7d2d412b`, `579d0b00`, `de71495c`).

## 2. Vérification de l'existant (bornes `cycle2.json`, CE2)

La passe de l'arbre des notions (`docs/archive/wip/arbre-notions/analyse/cycle2.csv`, 2026-10-18)
fait foi. Ses six « MODIFIER » sont **faits en prod** (vérifié le 2026-10-27) : tables × 6 à × 9
en a = 2..10, `e6ddf5d7` écrit « ÷ », `a565fa02` en −19 / −29 / −39 seulement, `73258d60` départ
< 100 (`question:specs --apercu 5` : 5 + 19, 32 + 19, 72 + 19), `68775a97` en « a … b » avec
<, =, >.

### Tagués, dans les bornes, mais plages étroites

- **CE2-026** (n × 4, n < 100, ex. 4 × 37) : `4988fdac` (n = 0..9) et `56b2737d` (10..50, dizaines
  entières). **Le cas visé (4 × 37) n'a aucun modèle.**
- **CE2-023** (× 10 jusqu'à n ≤ 1 000, × 100 jusqu'à n ≤ 100) : `2c3a18e7` × 100 seulement
  (n < 100). Pas de × 10.
- **CE2-024** (+ 8, 9, 18, 19, 28, 29, 38, 39) : `73258d60` + 9 et + 19 seulement.
- **CE2-027** (chiffre × dizaines 10 à 90) : `0e39dbfb` × 20 seulement.
- **CE2-028** (11 à 99 × chiffre) : `bc760fa1`, `43c7fa4f`, `6a7f461d`, `72b8d989`, `59004d6b`
  = × 13, 21, 22, 18, 19 seulement.
- **CE2-022** doubles (`61093b4f` : 1-20, 25, 30, 40, 50, 60, 100) : manquent 35, 45, 75 et 150 à 600.
- **CE2-092** moitiés (`824a8b26` : pairs ≤ 40, 50, 60, 100) : manquent 70 à 90, 120, 150, 200 à 1 200.

### Non tagués (39)

- **Jumeaux sur le nœud addition** (mêmes nombres, corrigé additif) : `427c735c` (moitié, jumeau
  `824a8b26`), `44c46578` (double, jumeau `61093b4f`). Au CE1, David a gardé le corrigé
  **multiplicatif** et dépublié l'autre.
- **Triple / tiers / quart** (aucun point au cycle 2) : `0061c3bc`, `0ea36630`, `369a668f`,
  `cefb9dde`, `eeb834fe` — et deux paires de jumeaux addition / multiplication parmi les triples.
- **Venus du CE1 (décision du 2026-10-26)**, mais **aucun point de calcul mental du CE2 ne les
  décrit** : `810f1824`, `7d2d412b` (4 chiffres − 3 chiffres, sans retenue), `579d0b00`,
  `de71495c` (abc + f × 10^d). Le CE2 ne nomme que + 8 / + 9… et − 9 / − 19… en calcul mental.
- **Cycle 3 (division euclidienne, diviseurs)** : `14a51794`, `15ed5af4`, `59a07a94`,
  `3d4c45e5`, `49777a0f`, `bd21a9d7`, `6ca01910`, `8d6d79a2`.
- **Sans point CE2** : sommes et différences ≤ 100 ou à 4 chiffres (`83c1feb9`, `5706769f`,
  `df3cb8ad`, `e6df0a85`, `ed5f5f52`, `5f78bd0e`, `a0cae721`, `18b7cc5c`, `22b8da83`,
  `9f4cbd66`), compléments à 100 / 1 000 (`ff427b27`, `d186d4ef`, `115745fe`), regroupements
  (`850fc524`), produit astucieux (`fbd02016`), × 20 à 2 chiffres (`8d6f283f`, `31c3963e`,
  `9c32b3cc`), espaces des milliers (`906252f8`).

## 3. Les 84 points sans modèle

- **A. Texte / formule seuls (46)** :
  - nombres : 003 (relations entre unités : « combien de centaines dans 4 300 ? », lots de 100),
    004 (suivant, écriture en lettres), 005 (décompositions non canoniques : 3 d 46 c 5 u),
    087 (encadrer), 088 (intercaler), 008 (ranger jusqu'à 5 nombres), 009 (vocabulaire) ;
  - fractions : 011 (égalités, ?/8 = 1/2), 013 (comparer, 3 cas), 014, 089 (+ et −, même
    dénominateur ou multiple) ;
  - opérations : 015 (terme, somme, différence), 017 (facteur, produit), 091 (multiple) ;
  - calcul mental : 020 (tables d'addition), 084 (terme manquant), 077 (multiples de 25),
    078 (décompositions de 60), 093 (n × 8) ;
  - problèmes : 029, 079, 030, 031, 032, 033, 034 (produit cartésien en tableau ou arbre) ;
  - longueurs : 035, 036, 037, 038 (longueurs données) ; masses : 045, 046, 047, 048 ;
    contenances : 052, 053 ; durées : 060 (problèmes) ;
  - références et estimations, en QCM de texte : 040, 041, 049, 050 ;
  - solides et figures, vocabulaire : 063, 064, 067, 069 ; périmètre : 042.
- **B. Outil existant (28)** :
  - `operation` : 016 (addition posée), 090 (soustraction), 019 (multiplication, produit
    ≤ 10 000), 055 et 056 (montants à virgule) ;
  - `monnaie` : 054 (`construire:`), 080 (rendre la monnaie, par ajouts) ;
  - `horloge` : 057 (lire), 059 et 094 (durées entre deux cadrans), 058 (QCM de cadrans, comme
    au CP-CE1) ;
  - `line` : 010 (de 1 en 1 à 1 000 en 1 000) ;
  - `figure` : 012 (unité partagée en quarts / dixièmes, à vérifier), 044 (côtés mesurés),
    068, 095, 071 (codage de l'angle droit), 081 (codage des longueurs), 072 (axes de
    symétrie, QCM de figures) ;
  - images fixes : 061 (nommer les solides), 062 (perspective), 066 (patron de cube ou non) ;
  - statistiques : 075, 096 (`tableau-croise`), 083, 097 (`barres`), 076 (tableau à totaux à
    compléter, barre à partir d'un total), 074 (tableau à compléter, `$?$`).
- **C. Outil neuf (4)** :
  1. `collection` : **`centaines:`** (plaques de cent) **et milliers** (gros cubes) → 001, 002, et
     la partie « matériel » de 005 ; même outil que celui décidé au CE1.
  2. **Barres à monter** → 082 (déjà décidé au CE1, pour CE1-088).
  3. **Figure à compléter par symétrie** → 073 : la case « figure » de `figure-et-choix`
     convient peut-être (quadrillage, axe vertical ou horizontal) ; à voir après sa mise en prod.
- **D. Non évaluables sans manipulation (6)** : 086 (suite orale), 039 (tracer un segment),
  043 (compas), 065 (construire un solide), 070 (construire des figures), 051 (transvaser) —
  039 et 070 après la case « figure », comme CE1-072 / 074.

## 4. Questions à David

1. **Plages étroites** (§ 2) : élargir par des modèles **neufs** dans les lots (4 × 37, × 10,
   - 28 / + 38, × 30 à × 90, 11-99 × chiffre, doubles et moitiés manquants), sans toucher aux
     modèles publiés ? Reco : oui, modèles neufs.
2. **Jumeaux addition** `427c735c`, `44c46578` : même décision qu'au CE1 (corrigé
   multiplicatif gardé, l'autre dépublié) ?
3. **Les 4 venus du CE1** (`810f1824`, `7d2d412b`, `579d0b00`, `de71495c`) : aucun point du CE2
   ne les décrit. Laisser en CE2 sans tag (entraînement), ou les borner autrement ?
4. **Outils neufs** : `centaines:` + milliers de `collection` en premier (sert CE1 et CE2),
   puis barres à monter ? Lancés comme chantiers à part, ou après les lots de texte ?
5. **Points D** : laissés sans modèle ; 039 et 070 après la case « figure » ?
6. **QCM** (040, 041, 049, 050, 058, 066, 072) : attendre la case « choix » en prod, ou les écrire
   dès maintenant en case choix, en brouillon jusqu'au `deploy:prod` ?
7. **Ordre des lots** — reco : 1 calcul mental (020, 084, 077, 078, 093 + 026 en 4 × 37) →
   2 numération (003, 004, 005, 087, 088, 008, 009) → 3 vocabulaire des opérations (015, 017, 091) → 4 fractions (011, 013, 014, 089) → 5 problèmes → 6 grandeurs (longueurs, masses,
   contenances, durées) → lots à outils existants (`operation`, `monnaie`, `horloge`, `line`,
   statistiques, figures) → lots à QCM.

## 4 bis. Décisions (David, 2026-10-28)

« tes recos ? » puis « ok » : toutes les recommandations du § 4 et du § 5 validées.

1. Plages étroites : modèles **neufs** dans les lots ; les publiés ne bougent pas.
2. Jumeaux addition `427c735c`, `44c46578` : **dépubliés** (repassés en brouillon, jamais supprimés), comme au CE1.
3. Les 4 venus du CE1 : **restent en CE2, sans tag**.
4. Outils neufs : `centaines:` + milliers de `collection`, puis barres à monter, en chantiers à part,
   **après les lots de texte 1 à 4**.
5. Points D sans modèle ; 039 et 070 après la case « figure ».
6. QCM : **après la case « choix » en prod**.
7. Lots : 1 calcul mental → 2 numération → 3 vocabulaire des opérations → 4 fractions →
   5 problèmes → 6 grandeurs → lots à outils existants → lots à QCM.

## 5. Lot 1 — calcul mental (phase 0 validée le 2026-10-28)

Niveaux relevés le 2026-10-27 parmi les publiés de chaque catégorie (`Entiers`) : Additionner /
Tables 1-9, Additionner / A trou 1-13, Multiplier / Décomposition 1, Multiplier / Quadruple et
quart 1-5, Multiplier / Produits astucieux 1-2.

| #   | Point   | Sous-notion (nœud du point)       | Modèle                    | Variations et plages                                                                         | Catégorie, niveau                  |
| --- | ------- | --------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------- |
| 1   | CE2-020 | addition et soustraction > tables | Tables d'addition         | a + b, a et b de 2 à 10, toutes tables mêlées                                                | Additionner / Tables, 10           |
| 2   | CE2-084 | addition et soustraction > tables | Trouver le terme manquant | V1 a + ? = s ; V2 ? + a = s (a et le terme de 2 à 10)                                        | Additionner / A trou, 14           |
| 3   | CE2-078 | multiplication > décomposition    | Les décompositions de 60  | V1 k × ? = 60 ; V2 60 = ? × k (1 × 60, 2 × 30, 3 × 20, 4 × 15, 5 × 12, 6 × 10)               | Multiplier / Décomposition, 2      |
| 4   | CE2-026 | multiplication > calcul astucieux | Multiplier par 4          | 4 × n : V1 n de 11 à 24, V2 de 26 à 99, jamais multiple de 10 ; corrigé « double du double » | Multiplier / Quadruple et quart, 6 |
| 5   | CE2-093 | multiplication > calcul astucieux | Multiplier par 8          | mêmes plages ; corrigé « double du double du double »                                        | Multiplier / Produits astucieux, 3 |

Une case par question, aucun QCM. CE2-077 : `03675b9b` (CE1) réutilisé, niveau CE2 et tag CE2-077
ajoutés par migration (lot 0). Question d'accès (nœuds, tags, niveaux, statuts) : **personne** ne
gagne d'accès, aucune règle ne change ; « Les multiples de 25 » est aussi proposé aux CE2 (David,
2026-10-28).

### Lot 1 — écriture (2026-10-28)

- Script `docs/wip/questions/lot-ce2-1.py` → `scripts/questions/ce2-1/` (5 JSON). Plages exactes
  de la phase 0 : n dans `11..19|21..24` puis `26..29|31..39|…|91..99` (ni 25 ni multiple de 10).
- Simulation `create-questions` (prod, lecture) : 5/5 verts, 32 specs. Base locale : 5 brouillons,
  `question:specs --apercu` : specs vertes, 450 tirages réussis, corrections relues.
- PR #1889 mergée (CI verte à la 2ᵉ tentative : deux échecs sans rapport, cf. Pièges).

### Lots 0 et 1 — en prod (2026-10-28)

- Brouillons créés par David (`create-questions --publier`) : `0c9071d1` (tables), `e7763a96`
  (terme manquant), `2cdbac43` (60), `df4f2372` (× 4), `32c0d191` (× 8).
- Migration nœud + tag + lot 0 (#1894), test d'intégration 19 verts, rouge sans la migration ;
  `security-auditor` : aucun bloquant (commentaire d'accès précisé : le prof lit encore les
  brouillons ; test du nœud archivé ajouté). Renommée `20261028130100` (#1897), jouée en prod.
- Page à cocher publiée : https://claude.ai/artifact/TVCyuAznqrAuopDJaPXyP4 (capacité `db`,
  collection `verdicts` vide au départ). Rendu à 390 px non vérifié (extension Chrome muette).

### Lot 1 — relecture (2026-10-28)

Page à cocher : 2 OK, 3 « À revoir ». × 4 et × 8 : « bien séparer les 2 étapes » → un double par
ligne, puis « Donc … ». Décompositions de 60 : « quel est l'intérêt de 1 × 60 ? » → 1 et 60
retirés des tirages (validé par David). Corrigés dans #1903.

## 6. Lot 2 — numération (phase 0 validée le 2026-10-28)

Relevé MCP du 2026-10-28 : 003, 004, 005, 008, 009, 087, 088 sans modèle ; nœuds « Nombres et calculs >
Entiers : numération > » décomposition (003), écritures (004, 005), ordre (008, 009, 087, 088). Forme du lot 2
du CE1, nombres ≤ 10 000. Recommandations suivies (« tes recos ? » puis « je valide ») :

1. Nombres en lettres : **orthographe rectifiée** (traits d'union partout), comme au CP ; seulement lettres →
   chiffres (case) ; chiffres → lettres attend la case « choix » (lot à QCM).
2. **Lots de 100 dans un modèle à part** (arrondi au lot supérieur), sur CE2-003 ; le lot passe à 9 modèles.
3. **Question d'accès** : personne ne lit rien de plus (brouillons neufs ; la migration nœud + tag ne change
   aucune règle).
4. Partie « matériel » de 005 : avec l'outil `collection` (centaines, milliers), décidé au § 4 bis.

| Fichier                                | Point   | Sous-notion   | Catégorie · niveau | Variations                                                                                 |
| -------------------------------------- | ------- | ------------- | ------------------ | ------------------------------------------------------------------------------------------ |
| `01-milliers-centaines-dizaines`       | CE2-003 | décomposition | Décomposition · 18 | m milliers → c ; c → milliers ; milliers → d ; centaines en tout dans 4 357                |
| `02-lots-de-100`                       | CE2-003 | décomposition | Décomposition · 20 | 1 235 filtres par lots de 100 (13) ; crayons par boîtes de 10                              |
| `03-unites-non-canoniques`             | CE2-005 | écritures     | Décomposition · 19 | 3 d, 46 c et 5 u ; 17 u, 8 d, 32 c et 2 milliers ; (4 × 1 000) + … ; 4 635 = ? + ? + ? + ? |
| `04-suite-jusqu-a-10000`               | CE2-004 | écritures     | Ecriture · 17      | suit (sans passage, …9, …99 / …999 et 9 999) ; précède (…0, …00, …000, 10 000)             |
| `05-lire-un-nombre-en-lettres`         | CE2-004 | écritures     | Ecriture · 18      | 22 nombres qui piègent (zéros intérieurs, 70-99, mille, cents)                             |
| `06-ranger-cinq-nombres`               | CE2-008 | ordre         | Comparer · 10      | comme 5 229, 6 234, 6 239, 6 243, 6 300 : croissant ; décroissant                          |
| `07-superieur-inferieur-compris`       | CE2-009 | ordre         | Comparer · 11      | supérieur ; inférieur ; compris entre a et a + 10 ; supérieur et inférieur                 |
| `08-encadrer-dizaine-centaine-millier` | CE2-087 | ordre         | Encadrer · 11      | juste avant / après ; dizaines ; centaines ; milliers entiers                              |
| `09-intercaler-jusqu-a-10000`          | CE2-088 | ordre         | Encadrer · 12      | a < ? < b ; bande à trous (dizaine, centaine) ; passage du millier                         |

Case seule, aucun QCM. **Espaces dès 4 chiffres** (`options.constraints.spacesFromFourDigits`, comme le lot 1 du
CM2) : règle de l'école en numération, `4500` sans espace = « forme à améliorer » (½ point), affichage `4 500`.

### Lot 2 — écriture (2026-10-28)

- Script `docs/wip/questions/lot-ce2-2.py` → `scripts/questions/ce2-2/` (9 JSON).
- `question:specs --file` : 90 specs vertes, 1 450 tirages réussis ; `create-questions` (prod, lecture) : 9/9 « à créer ».
- Base locale : 9 brouillons ; aperçu admin : « Ranger » (4 justes + `4500` → ½ point, « Les chiffres sont mal
  espacés »), « Lire en lettres » (mille-un, réponse fausse → faux, corrigé `1 001`).
- 2026-10-28 : #1920 mergée (CI verte, revue : aucune, contenu) ; worktree retiré.

### Lot 2 — en prod (2026-10-28)

- `create-questions --publier` (David) : 9 brouillons — `5258350a` (milliers, centaines, dizaines), `78d3ff5b`
  (lots de 100), `b4dd4008` (unités non canoniques), `692d237e` (suit / précède), `3dd3b738` (lettres → chiffres),
  `8c5c7d70` (ranger cinq), `d6753aef` (supérieur, inférieur, compris), `41dd05bc` (encadrer), `f8fd9552` (intercaler).
- Relevé MCP : 9 brouillons [CE2], sans nœud ni tag ; points sous « Nombres et calculs > Entiers : numération »
  (003 décomposition ; 004, 005 écritures ; 008, 009, 087, 088 ordre). Dernière migration en prod : `20261028233000` ; renommée `20261029003200` après #1932 (deux migrations d'autres sessions jouées entre-temps, `db push` refusait sans `--include-all`).
- Migration `20261029003200_questions_ce2_lot2_rangement_tags.sql` (gabarit `20261028233000_questions_5_lot1_08`,
  tout ou rien sur 9) ; test `tests/integration/questions-ce2-lot2-rangement-tags.test.ts` : 9 verts ; corps de la
  migration retiré → 5 rouges (nœud, tag, tout ou rien, déjà rangé, point archivé).
- 2026-10-28 : #1932 mergée, `db push` refusé (`20261028234500` et `20261029003100` d'autres sessions jouées entre-temps) ;
  renommage #1937 mergé ; `db:migrate` (seule la mienne au `--dry-run`) ; vérifié au MCP. Page à cocher :
  https://claude.ai/artifact/KLQGsdQYbft3hoQt5yHnCL (9 fiches, aucune alerte). Worktree retiré.
