# Chantier « questions-ce2 » — couvrir les points du CE2 en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Chantiers de référence : le CP ([questions-progress.md](questions-progress.md)), le CE1
> ([questions-ce1-progress.md](questions-ce1-progress.md)).

## Reprendre ici

_Mis à jour le 2026-11-06, après #2426._

- **État** : lots 1 à 9 en prod et publiés ; lot 10 (solides) : 7 modèles mergés (#2426), pas encore en prod.
- **Prochaine action** : David lance `create-questions --dir scripts/questions/ce2-10 --publier` ; relevé MCP, ids
  commités sur une branche ; puis migration nœud + tag, page à cocher ; puis `collection` `centaines:` (001, 002, 005) en chantier à part.
- **En attente de David** : `create-questions --publier` du lot 10.
- **Pièges en cours** : jamais de variable `e` (Euler) ; `{{eval:}}` non entier = fraction LaTeX, refusée en
  coordonnée de figure (`demi()`) ; réponse de spec ≤ 133 caractères ; commitlint : corps ≤ 100 caractères par ligne ;
  `create-questions --publier` lancé depuis le dépôt principal y écrit les ids : les porter sur une branche ;
  `publier-lot` (même en simulation) et `garde-niveaux-tags.ts` refusés à Claude par le classifieur : David les lance.
- **Worktree / branche** : `../ubumaths-wt-questions-ce2` (branche `feat/questions-ce2-lot10` mergée, à recréer pour
  la migration).

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

### Lot 2 — les 2 « à revoir » (2026-10-29)

- Instantané `docs/wip/questions-ce2/etat-prod-2026-10-29/` (`export-question-templates`) : `b4dd4008` et
  `8c5c7d70` en prod = fichiers du dépôt (variations et specs identiques), brouillons.
- `b4dd4008` (03), variation 4 : « Décompose le nombre. » jugé trop vague → « Décompose le nombre en milliers,
  centaines, dizaines et unités, comme $2\,513=2\,000+500+10+3$. » (l'exemple montre la forme attendue).
  `question:specs` : 10/10, 200 tirages.
- `8c5c7d70` (06) : l'outil « étiquettes à ranger » (```ranger, #1943, chantier `reponses-a-placer` clos) est en
  prod depuis v0.55.0 → réécrit avec le bloc : étiquettes dans le bon ordre, mélangées au tirage (variables
  `o`, `x1…x5` et les 5 cases retirées). Specs en positions affichées (depuis 0), lues sur l'instance tirée :
  6/6, 100 tirages.
- 2026-10-29 : #1956 mergée (CI verte, revue : aucune, contenu) ; worktree retiré.

## 7. Lot 3 — vocabulaire des opérations (phase 0 validée le 2026-10-29)

Points CE2-015 (terme, somme, différence), CE2-017 (facteur, produit), CE2-091 (multiple), sans modèle au relevé
MCP du 2026-10-29. Phase 0 proposée puis validée (« je te suis ») avec l'option recommandée : **réponses en nombres
seulement** ; les réponses par un mot (« c'est la somme ou la différence ? », « 24 est-il un multiple de 6 ? » en
oui / non) attendent le lot à QCM (§ 4 bis, 6). Question d'accès : personne ne lit rien de plus (brouillons neufs,
la migration nœud + tag ne change aucune règle). « Espaces dès 4 chiffres » : toujours en attente, hors de ce lot
(nombres < 1 000).

**Nœuds** (relevé MCP) : les trois points sont rangés au niveau de la **notion**, sans sous-notion :
CE2-015 → « Nombres et calculs > Entiers : addition et soustraction » ; CE2-017 et CE2-091 → « Nombres et calculs >
Entiers : multiplication ». Les modèles iront sur ces nœuds (la règle refuse un tag hors du nœud du point).

**Catégories et niveaux** (places libres relevées en prod le 2026-10-29) : Additionner › Sens 1-5, Soustraire ›
Différence 1-15, Multiplier › Sens 1-2 pris.

| Fichier                      | Point   | Catégorie · niveau           | Variations                                                                           |
| ---------------------------- | ------- | ---------------------------- | ------------------------------------------------------------------------------------ |
| `01-la-somme`                | CE2-015 | Additionner › Sens · 6       | somme de 2 nombres (11-89) ; de 3 nombres (11-49) ; la somme de 12 et de ? est 37    |
| `02-la-difference`           | CE2-015 | Soustraire › Différence · 16 | différence entre 60 et 37 ; entre dizaines entières (≤ 900) ; 60 − ? = 23            |
| `03-termes-somme-difference` | CE2-015 | Additionner › Sens · 7       | termes de a + b = s ; termes de a − b = d ; la somme ; la différence (sans ordre)    |
| `04-le-produit`              | CE2-017 | Multiplier › Sens · 3        | tables (2-9) ; a × dizaine entière ; a × 25 ; facteur manquant                       |
| `05-facteurs-et-produit`     | CE2-017 | Multiplier › Sens · 4        | facteurs de a × b = p (sans ordre) ; le produit ; le produit dans p = a × b          |
| `06-les-multiples`           | CE2-091 | Multiplier › Sens · 5        | multiple de b entre bk − 2 et bk + 2 ; de 25 entre 25k − 10 et 25k + 10 ; 24 = 6 × ? |

Case seule, aucun QCM ; `orderIndependent` sur 03 et 05 (termes, facteurs dans n'importe quel ordre) ; 06 par
règles (`multiple` + `range`, toute réponse juste acceptée).

### Lot 3 — écriture (2026-10-29)

- Script `docs/wip/questions/lot-ce2-3.py` → `scripts/questions/ce2-3/` (6 JSON, 49 specs : justes et erreurs
  typiques — somme prise pour produit, différence à l'envers, résultat pris pour un terme, multiple hors intervalle).
- `create-questions` en simulation (prod) : 6 « à créer », tout vert. `question:specs --instances 200` : 49/49 specs,
  4 000 tirages réussis, aucun avertissement.
- Base locale : 6 brouillons créés ; aperçu admin joué : 03 (termes 27 et 40 donnés à l'envers → « Juste »), 06
  (26 pour un multiple de 5 entre 23 et 27 → « Faux », réponse possible 25, correction affichée).

### Lot 3 — en prod : brouillons et migration (2026-10-29)

- David a lancé `create-questions --publier` : 6 brouillons, relus au MCP (draft, niveaux justes, sans nœud ni tag) :
  `1076ebed` (01), `b461cd02` (02), `0ada6949` (03), `c9bd997c` (04), `baec0070` (05), `376a2264` (06).
- Migration `20261029234500_questions_ce2_lot3_rangement_tags` (calquée sur le lot 2, nœuds = notions) + test
  d'intégration : rouge sans le corps de la migration (5/9), vert avec (9/9). `security-auditor` : aucun finding
  bloquant.
- ⚠️ `db:migrate` **bloqué** par la collision d'horodatage `20261029213000` sur `main` (questions_5_lot3 jouée,
  questions_ce1_lot3_niveaux non jouée) : la session ce1 doit renommer la sienne (voir journal questions-3). La CI
  est rouge pour la même raison (`migrations-horodatage-unique`, `migration-versions`, garde SECURITY DEFINER).
  Le `db:migrate` jouera aussi `20261029233000` (questions-3, qui l'attend).
- 2026-10-29 : collision réglée (#1972) ; #1975 mergée (CI verte, revue : `security-auditor` seul, migration de
  contenu) ; `db:migrate` lancé par David : `234500` et `235500` (CM1, ses 4 conditions écrites dans son journal ;
  session cm1 prévenue). MCP : les 6 modèles CE2 et les 10 CM1 ont un nœud et un seul point. Page à cocher :
  https://claude.ai/artifact/GQKRkFMPrLg2Yt26db62gn (6 fiches, aucune alerte).
- 2026-10-29 : relecture de David, 6/6 « OK » sans commentaire ; `publier-lot.ts --publier` (David) : 6/6
  publiés, statut relu au MCP.

## 8. Lot 4 — fractions (phase 0 validée le 2026-10-29)

Points CE2-011 (égalités), CE2-013 (comparer), CE2-014 (+), CE2-089 (−), sans modèle au relevé MCP du 2026-10-29.
Nœuds déjà posés (sous-notions) : 011 → « Fractions : sens et écritures › égalité de fractions » ; 013 → « … ›
ordre » ; 014 et 089 → « Fractions : calculs › addition et soustraction ». Question d'accès : personne ne lit rien
de plus (brouillons neufs ; la migration nœud + tag ne change aucune règle).

**Décisions (David, « tes recos ? » puis « ok », 2026-10-29)** :

1. `reducedFractions` coupé sur les 10 modèles, comme au CE1 : 6/8 juste pour 3/4, 4/4 comme 1 (la simplification
   n'est pas du CE2).
2. Case « choix » dès ce lot (en prod depuis v0.56.0, la condition du § 4 bis, 6 est remplie) : comparer en < = >
   non mélangé, comme au CE1 ; la fraction égale parmi quatre. « Lesquelles valent 1/2 ? » (plusieurs réponses)
   attend le lot à QCM.
3. « Espaces dès 4 chiffres » **confirmé** tel quel (numération seulement : 4500 = ½ point avec message, affichage
   4 500 ; comme au CM2).

| Fichier                                | Point | Catégorie · niveau                       | Variations                                                                |
| -------------------------------------- | ----- | ---------------------------------------- | ------------------------------------------------------------------------- |
| `01-numerateur-manquant`               | 011   | Apprivoiser › Egalité de fractions · 6   | 1/2 = ?/8 ; 6/8 = ?/4 ; 1 = ?/d                                           |
| `02-denominateur-manquant`             | 011   | Egalité de fractions · 7                 | 1/2 = 4/? ; 6/8 = 3/?                                                     |
| `03-fraction-egale`                    | 011   | Egalité de fractions · 8                 | choix parmi 4 (leurres : +k en haut et en bas, dénominateur seul × k, +1) |
| `04-comparer-meme-denominateur`        | 013   | Apprivoiser › Comparer · 11              | d de 3 à 12, numérateurs < d                                              |
| `05-comparer-meme-numerateur`          | 013   | Comparer · 12                            | 5/12 et 5/8 (numérateur ≥ 2)                                              |
| `06-comparer-denominateur-multiple`    | 013   | Comparer · 13                            | 7/12 et 5/6, la petite à gauche ou à droite                               |
| `07-additionner-meme-denominateur`     | 014   | Calculer › Addition et Soustraction · 14 | 5/12 + 4/12 ; somme = 1 (3/4 + 1/4)                                       |
| `08-additionner-denominateur-multiple` | 014   | Addition et Soustraction · 18            | 1/2 + 1/4 ; 1/4 + 1/2 (d × k ≤ 12)                                        |
| `09-soustraire-meme-denominateur`      | 089   | Addition et Soustraction · 19            | 3/4 − 1/4 ; 1 − 5/9                                                       |
| `10-soustraire-denominateur-multiple`  | 089   | Addition et Soustraction · 20            | 2/3 − 1/6 ; 3/4 − 1/2                                                     |

### Lot 4 — écriture (2026-10-29)

- Script `docs/wip/questions/lot-ce2-4.py` → `scripts/questions/ce2-4/` (10 JSON, 78 specs : justes, non simplifiées
  justes, erreurs typiques — dénominateurs ajoutés, numérateurs ajoutés sans réécrire, même nombre ajouté en haut et
  en bas, « 12 > 8 donc 5/12 > 5/8 »).
- `question:specs --instances 300` : 78/78 specs, 5 400 tirages réussis. `create-questions` en simulation (prod) :
  10 « à créer », tout vert.
- Base locale : 10 brouillons ; aperçu admin : 08 (3/16 pour 2/12 + 1/4 → « Faux », attendu 5/12), 03 (2/4 pour
  1/2 → « Juste »).
- ⚠️ **Défaut trouvé (hors lot)** : sur la carte de correction, un choix écrit `$$…$$` s'affiche en LaTeX brut
  (`$$\frac{2}{3}$$`) : `ChoiceList.svelte` passe le choix à `InlineMarkdown`, qui ne dessine pas `$$`. La saisie est
  juste, seule la correction est touchée. **15 modèles publiés** concernés (CP, CE1, CE2, CM1, 5e, 1re et Tle spé ;
  relevé MCP). Le lot garde `$$` (même écriture que le CE1) : le correctif du composant le couvrira.
- 2026-10-30 : #1996 mergée (CI verte, revue : aucune, contenu) ; worktree retiré.

### Lot 4 — en prod : brouillons (2026-10-30)

- `create-questions --publier` (lancé par Claude à la demande de David) : 10 brouillons, relus au MCP (draft, CE2,
  niveaux justes, `reducedFractions` coupé, sans nœud ni tag, aucun niveau en double) : `e0aaf18f` (01), `176b6b93`
  (02), `51b95890` (03), `788a22c7` (04), `75ec78a1` (05), `c21fe20b` (06), `b892331e` (07), `c73dfcd0` (08),
  `1f6fb2c2` (09), `de7d9cf3` (10).

### Lot 4 — migration nœud + tag (2026-10-30)

- Relevé MCP du 2026-10-30 : les 10 brouillons toujours sans nœud ni tag ; nœuds des points = sous-notions
  (011 « égalité de fractions », 013 « ordre », 014 et 089 « addition et soustraction »).
- Migration `20261030161000_questions_ce2_lot4_rangement_tags` (calquée sur le lot 3 ; horodatage après le max de
  la prod `20261030150000` et les `160000`/`160100` réservés par les worktrees questions-4 et questions-2de) + test
  d'intégration : rouge sans le corps (5/9), vert avec (9/9).
- `security-auditor` : aucun finding (corps SQL identique au lot 3, gardes et rollback vérifiés, relevé MCP refait).
- 2026-10-30 : #2020 mergée (1er passage de CI rouge : collision `20261030140000` sur `main`, réglée par #2017
  et #2018 ; branche remise à jour par merge, CI verte). Revue : `security-auditor` seul (migration de contenu).
  Worktree retiré. Relevé MCP : seule `20261030161000` en attente en prod. Les 4 conditions du `db:migrate` sont
  réunies (accès tranché, test vérifié rouge, audit sans finding, migration additive avec rollback).
- 2026-10-30 : `20261030161000` jouée en prod par le `db:migrate` d'une autre session (dry-run de David : « up to
  date »). Relevé MCP : les 10 modèles sur leur sous-notion, un point chacun, `updated_at` inchangé, draft.
- Page à cocher : https://claude.ai/artifact/Qs3HjpvSQV2MUMt631y9oJ (10 fiches ; alertes « homonyme d'un autre
  niveau écarté » sur 04, 07, 09 : les fiches gardées sont bien les ids du lot).
- 2026-10-31 : relecture de David, 10/10 « OK » sans commentaire (base `verdicts` comptée). `publier-lot`
  (simulation) : ⛔ 08, niveau 18 de « Fractions › Calculer › Addition et Soustraction » occupé par `884908d3`
  (CM1, publié après la création du lot) ; niveaux 1-20 tous pris, 21 libre. `choix-correction` : aucune trace
  (branche, PR, journal, worktree) ; `ChoiceList.svelte` passe toujours le choix à `InlineMarkdown`.
- 2026-11-01 : recos de David validées : niveaux 08 → 19, 09 → 20, 10 → 21 (ordre de la phase 0 gardé) ; publier sans
  attendre `choix-correction`. ⚠️ `create-questions --mettre-a-jour` ne peut PAS changer un niveau (la clé contient
  le niveau : il créerait des doublons) → migration `20261101090000_questions_ce2_lot4_niveaux` (calquée sur
  1spe géométrie repérée). Accès : personne (David, 2026-11-01). Test d'intégration : vert 7/7, rouge sans le
  corps (3 échecs, 3 sautés). `security-auditor` : aucun finding (index d'unicité partiel sur `published` : les
  brouillons peuvent se croiser). Fichiers `scripts/questions/ce2-4/` et `docs/wip/questions/lot-ce2-4.py` aux
  mêmes niveaux (régénération identique).
- 2026-11-01 : #2051 mergée (CI verte ; revue : `security-auditor` seul, contenu). `db:migrate` (David) :
  `20261101090000` jouée (avec `20261101120100` d'une session questions-5). Relevé MCP : 08/09/10 en 19/20/21,
  draft, `updated_at` inchangé. `publier-lot` simulation : 10/10 ; `--publier` (David) : **10 modèles
  `published`** relus au MCP. Worktree retiré.

## 9. Lot 5 — problèmes (phase 0 validée le 2026-11-01)

Points CE2-029, 079, 030, 031, 032, 033, 034, sans modèle au relevé MCP du 2026-11-01. Nœuds existants sous
« Problèmes arithmétiques » (parties-tout, comparaison, en deux étapes ou plus, multiplicatifs, produits
cartésiens) : aucun à créer. Niveaux libres relevés : Parties-tout 7+, Deux étapes 7+, Multiplicatifs 9+,
Comparaison 2+, Produits cartésiens neuve. Nombres jusqu'à 10 000 ; plus de deux étapes : < 100 ; quantité
totale ≤ 1 000 pour le nombre de parts. Question d'accès : personne ne lit rien de plus (brouillons neufs).

**Décisions (David, « tes recos ? » puis « je te suis », 2026-11-01)** :

1. Produit cartésien : on demande le nombre de façons ; tableau ou arbre montré dans la correction.
2. « Fois plus / fois moins » rangé dans « comparaison » (niveau 3) ; le modèle mêle « de plus » et « fois plus ».
3. Un seul modèle en fractions de même dénominateur (029), `reducedFractions` coupé.
4. Un seul lot de 12 modèles.
5. Régulation (« ce résultat est-il possible ? ») en case choix dans quelques variations de 01 et 05.

| Fichier                      | Point | Catégorie · niveau                                   | Variations                                                          |
| ---------------------------- | ----- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| `01-parties-tout`            | 029   | Parties-tout · 7                                     | tout, partie ou départ inconnu, 1 000 à 10 000 ; régulation         |
| `02-parties-tout-prix`       | 029   | Parties-tout · 8                                     | prix à virgule : achats, prix manquant, monnaie                     |
| `03-parties-tout-fractions`  | 029   | Addition et Soustraction · 22 (Fractions · Calculer) | fraction qui reste, même dénominateur                               |
| `04-comparaison`             | 079   | Comparaison · 2                                      | plus grand, plus petit, écart ; entiers ≤ 10 000 et prix            |
| `05-deux-etapes`             | 030   | Deux étapes · 7                                      | ajouts et retraits enchaînés ≤ 10 000 ; achats ; régulation         |
| `06-comparaison-deux-etapes` | 030   | Deux étapes · 8                                      | Léo 188 billes, Lucie 75 de plus, en tout                           |
| `07-multiplicatifs-tout`     | 031   | Multiplicatifs · 9                                   | valeur du tout, champ étendu (8 paquets de 125, 6 × 1,50 €)         |
| `08-nombre-de-parts`         | 031   | Multiplicatifs · 10                                  | total ≤ 1 000 ; reste → arrondi au-dessus ou en dessous             |
| `09-valeur-d-une-part`       | 031   | Multiplicatifs · 11                                  | 72 € pour 6 dictionnaires (tables)                                  |
| `10-fois-plus-fois-moins`    | 033   | Comparaison · 3                                      | trottinette 4 fois plus chère que le casque à 32 € ; « fois moins » |
| `11-problemes-mixtes`        | 032   | Deux étapes · 9                                      | 4 tables de 6 + 7 tables de 4 ; plus de deux étapes : nombres < 100 |
| `12-produit-cartesien`       | 034   | Produits cartésiens · 1                              | tableau (3 × 7) ; arbre à trois ensembles (2 × 3 × 2)               |

### Lot 5 — écriture (2026-11-01)

- Script `docs/wip/questions/lot-ce2-5.py` → `scripts/questions/ce2-5/` (12 JSON, 117 specs : justes, erreurs
  typiques — « de plus » lu addition, « fois moins » lu soustraction, dénominateurs ajoutés, reste oublié, une
  partie plus grande que le tout acceptée). `question:specs --instances 300` : 117/117 specs, 13 500 tirages
  réussis. `create-questions` en simulation (prod) : 12 « à créer ».
- **Écart à la phase 0** : le modèle 03 (fractions) est rangé en `Fractions · Calculer · Addition et Soustraction · 22`
  (comme « Lucie », CE1), non en `Parties-tout · 9` : c'est une catégorie `Entiers`. Niveaux relevés au MCP le
  2026-11-01 : Fractions › Addition et Soustraction jusqu'à 21.
- **Réponses sous 10 000** : « 10000 » sans espace est jugé non optimal (comme en numération) ; toutes les sommes
  sont donc tirées < 10 000.
- **Défauts trouvés à la relecture des tirages** (invisibles aux specs) : billet de 10 € pour 11,26 d'achats (monnaie
  négative, condition ajoutée) ; « il reste 1 œufs » ; phrase commençant par une espace.
- **Produit cartésien** : le tableau / l'arbre n'est dessiné que par des phrases (sa taille change à chaque tirage) ;
  si David veut un vrai dessin, c'est un outil neuf.

### Lot 5 — brouillons en prod et migration (2026-11-01)

- 12 brouillons créés en prod par David (`08cac7de`, `a2bee082`, `4f47f8d6`, `10f05004`, `28988062`, `4948acaf`,
  `fe26e846`, `37a715c4`, `059b8bba`, `0f5d9ad8`, `43b40fc7`, `837d027b`), relus au MCP : `draft`, niveaux voulus,
  sans nœud ni tag, 117 specs enregistrées.
- Migration `20261101180100_questions_ce2_lot5_rangement_tags` (max de la prod, de `main`, des worktrees et des branches distantes `180000` + 1 min ; renumérotée depuis `160300`, qui passait avant la `160400` de `main`) et son test :
  rouge sans (5 échecs sur 9), vert 9/9. Nœuds relevés : 029 → parties-tout (y compris le modèle des fractions,
  `4f47f8d6`), 079 et 033 → comparaison, 030 et 032 → en deux étapes ou plus, 031 → multiplicatifs, 034 → produits
  cartésiens. `check:incremental` 0 erreur, cliquet tenu.
- 2026-11-01 : #2090 mergée (CI verte au 3e passage : garde « doc à jour » → `Doc-inchangée` dans un commit ;
  horodatage `160300` → `180100`, la `160400` de `main` passait avant). `db:migrate` (David) : `180100` seule jouée.
  Relevé MCP : 12 modèles `draft`, nœuds et points voulus, `updated_at` inchangé. Page à cocher générée (3 alertes
  « homonyme » = les modèles CE1 de même titre, écartés à raison).
- 2026-11-01 : page à cocher publiée en artefact (`claude.ai/artifact/L87bEJ4MzgAjWAQfbmaRZ1`, capacité `db`), 12
  verdicts « OK » lus en base et comptés. `publier-lot` simulation : 12/12, sans collision de niveau ; `--publier`
  (David) : **12 modèles `published`** relus au MCP (nœuds et points intacts). **Lot 5 clos.**

## 10. Lot 6 — grandeurs (phase 0 validée le 2026-11-01)

Points CE2-035, 036, 037, 038 (longueurs), 045, 046, 047, 048 (masses), 052, 053 (contenances), 060 (durées), sans
modèle au relevé MCP du 2026-11-01 (la base n'a que du CP, du CE1 et de la 6e sur les grandeurs). Nœuds existants,
aucun à créer : Longueurs et Masses « unités et conversions » (occupés par CP/CE1, niveaux 2, 4-7 et 1-2),
Contenances « unités et conversions » (vide), Durées « calcul de durées » (11 modèles de 6e, niveaux 1 à 8).
Niveaux libres relevés juste avant la publication. Question d'accès : personne ne lit rien de plus (brouillons neufs).

**Décisions (David, « tes recos ? » puis « ok », 2026-11-01)** :

1. Deux lots : **6a** longueurs et masses (modèles 01-09), **6b** contenances et durées (modèles 10-13).
2. Durées CE2 rangées dans le nœud existant « calcul de durées », aux niveaux libres (pas de nœud neuf).
3. Références / estimations (040, 041, 049, 050) et périmètre (042) hors lot, dans le lot des QCM.

| #   | Point | Modèle                                 | Variations                                                                 |
| --- | ----- | -------------------------------------- | -------------------------------------------------------------------------- |
| 01  | 035   | Unités de longueur : m, dm, cm, mm, km | symbole ↔ unité, ranger de la plus grande à la plus petite                 |
| 02  | 036   | Relations m · dm · cm · mm             | 16 m = ? cm = ? dm ; 1 600 cm = ? dm ; 1 cm = ? mm ; entiers, sans tableau |
| 03  | 036   | Relations km · m                       | 5 km + 750 m = ? m ; 5 750 m = ? km + ? m                                  |
| 04  | 037   | Quelle unité pour mesurer… ?           | choix parmi m, dm, cm, mm, km (case choix)                                 |
| 05  | 038   | Comparer des longueurs                 | unités différentes (2 m / 185 cm), ranger 3 ou 4 longueurs                 |
| 06  | 045   | Unités de masse : g, kg, t             | symbole ↔ unité, ordre                                                     |
| 07  | 046   | Quelle unité pour peser… ?             | choix parmi g, kg, t (case choix)                                          |
| 08  | 047   | Relations g · kg · t                   | 5 462 g = 5 kg + 462 g ; 5 350 kg = 5 t + 350 kg ; pas de g–t              |
| 09  | 048   | Comparer des masses                    | 3 ou 4 objets, en g, kg ou t                                               |
| 10  | 052   | Unités de contenance : L, dL, cL       | (lot 6b)                                                                   |
| 11  | 053   | 1 L = 10 dL = 100 cL                   | (lot 6b) 780 cL = 7 L + 80 cL                                              |
| 12  | 060   | Durées à une étape                     | (lot 6b) axe chronologique                                                 |
| 13  | 060   | Durées à deux étapes                   | (lot 6b) 7 h 10 + 1 h 30 + 40 min                                          |

Réponses en case de saisie, sauf 04 et 07 (case choix, en prod). Le niveau monte avec la difficulté (un type de
conversion, puis le mélange, puis l'unité à déduire).

### Lot 6a — écriture (2026-11-01)

- Script `docs/wip/questions/lot-ce2-6a.py` → `scripts/questions/ce2-6a/` : 9 modèles (01-05 longueurs, 06-09 masses),
  122 specs, simulation verte. Niveaux posés d'après le relevé MCP du jour (à relire avant la publication) :
  Longueurs Unités 8 (01), 9 (04), 10 (02), 11 (03) ; Comparaison et mesure 4 ; Masses Unités 3, 4, 5 ; Comparaison 3.
- « Comparer » : signe à deux valeurs + bloc `ranger` (3 ou 4 longueurs / masses), plus « le plus lourd / le plus
  léger » (case choix, bonne réponse en premier). Positions affichées du `ranger` lues par essai des permutations
  (stables d'une valeur à l'autre).
- Choix d'unité : 04 en 5 unités (mm, cm, dm, m, km), 07 en 3 (g, kg, t) ; réponses numériques en case.

### Lot 6b — écriture (2026-11-01)

- Script `docs/wip/questions/lot-ce2-6b.py` → `scripts/questions/ce2-6b/` : 4 modèles, 74 specs, simulation verte.
  Niveaux posés d'après le relevé MCP du jour (à relire avant la publication) : Contenances / Unités 1 (10) et 2 (11) ;
  Durées / Durée écoulée 3 (12) et 4 (13), après les 1-2 du CE1.
- 10 : symbole, sens, plus grande / plus petite, choix de l'unité (L, dL, cL). 11 : relations, 780 cL = 7 L + 80 cL.
- 12-13 : l'axe chronologique n'est pas un bloc (énoncé en texte, repères dans le corrigé). Réponses en deux cases
  (h, min) ; 13 pose `u = t - 6 floor(t/6)` pour éviter `mod` en condition.
- Brouillons créés le 2026-11-01 : 10 `186f05a4`, 11 `cda9c7de`, 12 `ea1a0929`, 13 `ba8f2f75` (préfixes). Rangement :
  10 → CE2-052 et 11 → CE2-053 sur Contenances / unités et conversions ; 12 et 13 → CE2-060 sur Durées / calcul de durées.

## 11. Lot 7a — calcul posé et monnaie (phase 0 validée le 2026-11-02)

Ordre rappelé (décision 7 du § 4 bis) : lots à outils existants avant le lot QCM ; le lot 7 est découpé par outil :
**7a** `operation` + `monnaie` (ce lot), **7b** `horloge` + `line` (057, 059, 094, 010, 058), **7c** statistiques,
puis `figure` / images fixes, puis QCM (040, 041, 042, 049, 050, 063, 064, 067, 069), puis outils neufs.

Points CE2-016, 090, 019, 055, 056, 054, 080, sans modèle au relevé MCP du 2026-11-02. Nœuds existants, aucun à créer :
« Entiers : addition et soustraction › calcul posé » (016, 090 ; occupé : addition CP 1 et CE1 2, soustraction CE1 1
cassage et 2 compensation), « Entiers : multiplication › calcul posé » (019 ; occupé : CM1 niveau 1,
`Poser une multiplication de deux nombres entiers`), « Monnaie › euros et centimes » (055, 056 ; CE1 1 et 2),
« Monnaie › pièces et billets » (054 ; CP 1 à 7, CE1 8 à 11 **en brouillon**), « Monnaie › rendre la monnaie » (080 ;
CP 1 et 2, CE1 3 et 4 **en brouillon**). Outils : ` ```operation ` (`calcul:` avec virgule, `cases: résultat | aucune`,
`retenues:`, `méthode: cassage | compensation`), ` ```monnaie ` avec centimes, billets de 200 / 500 € et `construire:`
(**en prod depuis v0.62.0**). Bornes (`cycle2.json`) : 016 et 090, entiers ≤ 10 000 ; 019, 2 ou 3 chiffres × 1 ou 2
chiffres, produit ≤ 10 000 ; 055 et 056, écriture à virgule, centimes à 2 décimales, jusqu'à 3 termes, unités mêlées
(43,45 € + 68 centimes ; 143 € + 3,67 € + 54 centimes) ; 054, simuler des achats avec pièces et billets fictifs ;
080, rendre par ajouts (5 € pour 3,68 € : 32 c puis 1 €).

| Fichier                           | Point | Catégorie · niveau               | Variations                                                                                                                                               |
| --------------------------------- | ----- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-addition-posee`               | 016   | Addition · Calcul posé · 3       | 4 + 3 chiffres ; 4 + 4 chiffres (somme ≤ 10 000) ; 3 termes ; retenues en chaîne (999 + 1 001) ; `retenues: oui`                                         |
| `02-soustraction-cassage`         | 090   | Soustraction · Calcul posé · 3   | 4 − 3 chiffres ; 4 − 4 chiffres ; zéros (5 002 − 1 847, 3 000 − 478) ; `méthode: cassage`                                                                |
| `03-soustraction-compensation`    | 090   | Soustraction · Calcul posé · 4   | mêmes nombres, `méthode: compensation`                                                                                                                   |
| `04-multiplication-un-chiffre`    | 019   | Multiplication · Calcul posé · 2 | 2 ou 3 chiffres × 1 chiffre (548 × 6) ; zéro au milieu (305 × 7) ; produit ≤ 10 000                                                                      |
| `05-multiplication-deux-chiffres` | 019   | Multiplication · Calcul posé · 3 | 2 chiffres × 2 chiffres (37 × 48) ; 3 chiffres × 2 chiffres (16 × 548 = 8 768, le plus long en haut) ; × 10, × 20 (une seule ligne) ; produit ≤ 10 000   |
| `06-addition-de-montants`         | 055   | Monnaie · Euros et centimes · 3  | 4,56 € + 15,30 € ; 3 termes ; unités mêlées (43,45 € + 68 centimes, 143 € + 3,67 € + 54 centimes) : texte, l'élève convertit puis pose                   |
| `07-soustraction-de-montants`     | 056   | Monnaie · Euros et centimes · 4  | 74,56 € − 15,30 € ; 143,45 € − 68 € ; 74,36 € − 12,50 € ; retenue sur les centimes                                                                       |
| `08-simule-tes-achats`            | 054   | Monnaie · Pièces et billets · 12 | `construire:` le total de 2 ou 3 articles (< 100 €, centimes) ; réserve limitée (pas de pièce de 1 €) ; « peut-il acheter ? » en case choix              |
| `09-rends-la-monnaie-par-ajouts`  | 080   | Monnaie · Rendre la monnaie · 5  | 3,68 € payé 5 € : « 3,68 € + [_] c = 4 € puis 4 € + [_] € = 5 € » ; payé 10 €, 20 €, 50 € (billet), prix 1,05 à 48,90 € ; total rendu en euros à virgule |
| `10-pose-la-monnaie-rendue`       | 080   | Monnaie · Rendre la monnaie · 6  | mêmes situations, l'élève pose le rendu (`construire:`, réserve 1, 2, 5, 10, 20 € et 10, 20, 50 c)                                                       |

Erreurs typiques dans les `testSpecs` : retenue oubliée (4 758 + 3 645) ; plus petit chiffre ôté du plus grand
(5 002 − 1 847) ; zéro mal échangé ; ligne de produit partiel mal décalée (37 × 48) ; virgule oubliée dans la somme de
montants (4,56 + 15,30 = 1986) ; 43,45 + 68 lu 111,45 (68 centimes pris pour 68 €) ; rendu calculé sur 4 € au lieu de 5 €.

Dépendances : la publication des niveaux CE2 de la monnaie vient **après** les brouillons CE1 du lot 8 (niveaux
8-11 et 3-4), qui n'ont pas encore été publiés : relever les catégories **juste avant la publication**.

**Question d'accès** : personne ne lit rien de plus — modèles neufs en brouillon (admin seul) ; la migration nœud + tag
ne change aucune règle.

### Questions à David

1. **Soustraction : deux modèles** (cassage, compensation), comme au CE1, le prof choisit la méthode de sa classe ?
   Recommandation : oui (10 modèles au lot).
2. **Multiplication : niveaux 2 et 3** sur le nœud, au-dessus du seul modèle CM1 (niveau 1, 876 × 208), sans toucher
   au publié ? L'ordre de difficulté n'est alors pas parfait entre CE2 et CM1. Recommandation : oui, écart noté,
   le publié ne bouge pas (décision 1 du § 4 bis).
3. **Montants à unités mêlées** (055) : pas de bloc, l'élève convertit 68 centimes en 0,68 € puis pose ? Un bloc
   `operation` montrerait déjà la conversion. Recommandation : texte seul, réponse en case ; l'opération posée,
   résolue (`cases: aucune`), dans le corrigé.
4. **Un seul lot de 10 modèles** (7 points) plutôt que deux (opérations 01-05, monnaie 06-10) ? Recommandation : un seul.
5. **Rendre la monnaie par ajouts** : la case guide les deux ajouts (32 c puis 1 €), puis une variation demande
   seulement le total rendu ? Recommandation : oui, les deux dans 09.

Réponse de David (« tes recos ? » puis « ok », 2026-11-02) : les cinq recommandations.

### Lot 7a — écriture (2026-11-02)

- Script `docs/wip/questions/lot-ce2-7a.py` → `scripts/questions/ce2-7a/` : 10 modèles, 81 specs, `question:specs`
  vert (200 tirages par variation, 7 400 réussis), `create-questions` en simulation (prod) : 10 « à créer ».
  Catégories posées d'après le relevé MCP du jour (**à relire avant la publication**, les brouillons CE1 du lot 8 sont
  encore à publier) : Addition / Calcul posé 3 ; Soustraction / Calcul posé 3 (cassage), 4 (compensation) ;
  Entiers · Multiplier · Calcul posé 2, 3 ; Monnaie / Euros et centimes 3, 4 ; Pièces et billets 12 ; Rendre la
  monnaie 5, 6.
- Écart à la décision 3 : le corrigé des unités mêlées (06, variations 3 et 4) écrit l'opération en formule, **sans
  bloc `operation` résolu** (aucun précédent de bloc dans une étape de correction ; rendu non vérifié).
- Corrigés des soustractions : colonne par colonne, générés (chiffres `x0..x3`, `y0..y3`, emprunts `f0..f3`) ; cas du
  zéro à casser géré (« il n'y a rien à casser ici… il reste 9 »), relu à l'aperçu. Case posée sans `expectedAnswer`.
- Prix des corrigés de monnaie en centimes entiers, `zeros: off` (2,2 juste pour 2,20 €). Rendu : condition
  `floor(p/100)+1 < B` (sinon « de 5 € à 5 €, il faut 0 € »).

### Lot 7a — brouillons en prod et migration (2026-11-02)

- `security-auditor` : aucun finding (2026-11-02). `create-questions --publier` (David) : 10 brouillons, relus au MCP (draft, CE2, catégories et niveaux attendus, 81 specs, sans
  nœud ni tag) : 01 `3d1856ac`, 02 `89698b69`, 03 `b0740746`, 04 `d1fc9daa`, 05 `c25f80f0`, 06 `4954edb5`, 07 `8c90be06`,
  08 `e05931f9`, 09 `91805d1e`, 10 `52206066` (préfixes). Rangement : 01 → CE2-016 ; 02, 03 → CE2-090 (Entiers : addition et
  soustraction › calcul posé) ; 04, 05 → CE2-019 (Entiers : multiplication › calcul posé) ; 06 → CE2-055 et 07 → CE2-056
  (Monnaie › euros et centimes) ; 08 → CE2-054 (pièces et billets) ; 09, 10 → CE2-080 (rendre la monnaie).
- Migration `20261102053224_questions_ce2_lot7a_rangement_tags` (additive, rollback en commentaire) et test
  `tests/integration/questions-ce2-lot7a-rangement-tags.test.ts` : rouge sans le corps de la migration (5 échecs sur 9),
  vert avec (9/9).
- #2200 mergée (CI verte après ajout de la ligne `Doc-inchangée:` dans un commit : la garde ne lit pas le corps de la PR) ;
  `check:migrations` ok ; `db:migrate --include-all` (dry-run : seule la mienne) joué depuis le dépôt principal ; MCP : les 10
  modèles rangés, un point chacun, toujours `draft`. Worktree et branche supprimés.
- Page à cocher publiée : https://claude.ai/artifact/B9LcfMmL6dzr6RN6axdsyG (capacité `db`, collection `verdicts` vide).
  ⚠ 7 fiches (les blocs `operation`) ne sont pas dessinées par la page : à jouer dans l'aperçu admin
  (`/dashboard/admin/questions/<id>/preview`, base locale ou prod) ; à vérifier aussi : corrigé des unités mêlées (06).

### Lot 7a — relecture et publication (2026-11-02)

- Page à cocher : 10 verdicts « OK » (comptés), **posés en 5 s** (06:16:31 à 06:16:36) : relecture non prouvée, surtout pour
  les 7 fiches `operation` que la page ne dessine pas. David a répondu « j'ai relu » ; à vérifier dans l'aperçu admin si un
  doute revient (grille posée, corrigé des unités mêlées du 06).
- `publier-lot` : simulation 10/10 (niveaux libres, aucune collision), puis `--publier` lancé par David : 10/10 `published`,
  relu au MCP (rangés, un point chacun). Lot 7a clos.

## 12. Lot 7b — horloge et droite graduée (phase 0 validée le 2026-11-02)

Points CE2-057, 058, 059, 094, 010, sans modèle au relevé MCP du 2026-11-02. Nœuds existants, aucun à créer :
« Durées › lecture de l'heure » (057, 058 ; CP 1-2, CE1 2-4 publiés), « Durées › calcul de durées » (059, 094 ; CE1 1-2,
CE2 3-4 du lot 6b, 6e 1-8), « Entiers : numération › droite graduée » (010 ; CE1 niveau 1, 20 images fixes). Outils en
prod : ` ```horloge ` (`heure:`, `placer:`, `cadran: 24`, `graduations: minutes`, horloges à 3 cm dans un choix),
` ```line ` (`points:`, `placer: A=? ; B=?`, début ≠ 0, `step` 1 / 10 / 100 / 1000).

| Fichier                          | Point | Nœud · niveau          | Variations                                                                                                  |
| -------------------------------- | ----- | ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| `01-lire-l-heure-minutes`        | 057   | Lecture de l'heure · 5 | minutes visibles, graduations ; 5 min près puis à la minute ; deux cases (h, min)                           |
| `02-lire-l-heure-en-mots`        | 057   | Lecture de l'heure · 6 | cadran → « sept heures moins le quart » = 6 h 45 ; moins vingt, quart, demie, midi ; `cadran: 24` (15 h 42) |
| `03-place-les-aiguilles-minutes` | 058   | Lecture de l'heure · 7 | `placer:` heures entières, multiples de 5, toute minute (6 h 18) ; chiffres, mots, 24 h (13 h 20)           |
| `04-quelle-horloge-indique`      | 058   | Lecture de l'heure · 8 | choix de 3-4 horloges ; aiguilles permutées, 20 / 40 min, moins le quart / et quart                         |
| `05-duree-entre-deux-horloges`   | 059   | Calcul de durées · 5   | 8 h 30 → 8 h 50 ; passage de l'heure (15 h 40 → 16 h 05) ; minutes ou h et min                              |
| `06-minutes-dans-une-duree`      | 059   | Calcul de durées · 6   | minutes dans 2 h 20 (140) ; durée lue sur deux cadrans puis en minutes                                      |
| `07-comparer-deux-durees`        | 094   | Calcul de durées · 7   | 4 horloges, case choix « la plus longue », puis écart en minutes                                            |
| `08-lire-sur-la-droite-graduee`  | 010   | Droite graduée · 2     | `points: A=…`, pas 1 / 10 / 100 / 1 000, portion de droite (début ≠ 0)                                      |
| `09-place-sur-la-droite-graduee` | 010   | Droite graduée · 3     | `placer: A=? ; B=?` (1 à 3 points), mêmes pas                                                               |

Erreurs typiques des `testSpecs` : aiguilles inversées ; chiffre du cadran lu comme des minutes (8 pour 40) ; « moins le
quart » lu 15 ; passage de l'heure mal compté (15 h 40 → 16 h 05 = 65) ; 2 h 20 lu 220 min ; pas de 10 lu comme un pas de 1.

**Question d'accès** : personne ne lit rien de plus (brouillons, admin seul) ; la migration nœud + tag ne change aucune règle.

Décisions (David, « tes recos ? » puis « ok », 2026-11-02) : niveaux partagés ci-dessus (écart avec le 6e sur le calcul
de durées noté, publiés intacts) ; horloge « digitale » = texte + `cadran: 24`, pas de bloc numérique ; 058 en deux modèles
(03 et 04) ; 094 en case choix puis écart ; un seul lot de 9 modèles.

- 2026-11-02 : #2221 mergée (CI verte, revue : aucune, contenu) ; worktree retiré. 9 modèles écrits (130 specs), simulation
  verte, sonde 0 problème (300 tirages × 9). Aperçu local : 01, 04, 09 bien rendus ; 09 réponse juste → « Juste ».
- 2026-11-05 : les 9 brouillons sont en prod (créés pendant le chantier `automaths-arbre`) ; relevé MCP : `draft`, CE2,
  niveaux 5, 6, 7, 8, 5, 6, 7, 2, 3, sans nœud ni point. Points 057, 058 → « Durées › lecture de l'heure » ; 059, 094 →
  « Durées › calcul de durées » ; 010 → « Entiers : numération › droite graduée » (relevé du jour). Migration
  `20261105054151_questions_ce2_lot7b_rangement_tags` (gabarit 7a) et test
  `tests/integration/questions-ce2-lot7b-rangement-tags.test.ts` : rouge sans le corps (5 échecs sur 9), vert avec (9/9).
- 2026-11-05 : `security-auditor` : aucun finding. #2387 mergée (CI verte après relance : un test client de la démo diaporama
  tombé sur « Browser connection was closed », sans lien avec la PR) ; `check:migrations --pr 2387` ok ; `db:migrate`
  depuis le worktree (dry-run : seule la mienne ; le dépôt principal avait des fichiers modifiés d'une autre session) ;
  relevé MCP : les 9 rangés, un point chacun, `draft`, `updated_at` du 2026-11-02 inchangé.
- 2026-11-05 : relevé MCP suivant : les 9 sont `published` (même `updated_at`, 07:07:34, quatre minutes après le merge),
  sans que 02, 03, 05-08 aient été joués à l'écran. Page à cocher publiée après coup :
  https://claude.ai/artifact/JdCbHActB2vzgTsasDxN4b (capacité `db`, 9 fiches ; alerte « bloc `line` non dessiné » sur 08 et
  09). Worktree et branche supprimés.

## 13. Lot 7c — statistiques (phase 0, proposée le 2026-11-05, à valider)

Points CE2-074, 075, 076, 083, 096, 097, sans modèle au relevé MCP du 2026-11-05 ; **082 aussi** (classé « outil neuf :
barres à monter » au § 3, mais l'outil est en prod depuis le 2026-10-28 : `placer:` du bloc `barres`, et `axe: à choisir`
pour l'échelle adaptée du BO). Nœuds existants, aucun à créer :
« Représenter des données › tableaux » (074 ; CP 1, CE1 2, 6e 1 et 3, 5e 3-5), « › tableau à double entrée » (075, 096 ;
CP 1-2, CE1 3-4), « › diagrammes en barres » (083, 097, 082 ; CE1 1-3, 5e 4-5), « Statistiques › Représenter des données »
(076 : son point est sur le nœud parent ; 2de 1-2). Le CE1 (lot `ce1-7`) a déjà la cantine et le sport préféré : le CE2
monte les nombres, gradue l'axe de 2 en 2, 5 en 5, 10 en 10, et ajoute les totaux.

| Fichier                               | Point | Nœud · niveau               | Variations                                                                                |
| ------------------------------------- | ----- | --------------------------- | ----------------------------------------------------------------------------------------- |
| `01-ranger-les-donnees-en-tableau`    | 074   | Tableaux · 3                | liste de 15 à 25 réponses (frères et sœurs, âge) → effectifs du tableau en cases `$?$`    |
| `02-lire-un-tableau-double-entree`    | 075   | Tableau double entrée · 5   | 3 × 4, nombres jusqu'à 200 ; une case nommée par sa ligne et sa colonne                   |
| `03-interpreter-un-tableau`           | 096   | Tableau double entrée · 6   | le jour où il y a le plus / le moins (case choix), combien de plus, sans totaux           |
| `04-completer-un-tableau-avec-totaux` | 076   | Représenter des données · 1 | `totaux: oui`, cases cachées : une case, un total, une case retrouvée par le total        |
| `05-completer-une-barre-par-le-total` | 076   | Représenter des données · 2 | total donné (175 élèves, BO) ; barre manquante à construire (`placer:`), puis à calculer  |
| `06-lire-un-diagramme-gradue`         | 083   | Diagrammes en barres · 4    | axe de 2 en 2, 5 en 5, 10 en 10 ; barre sur une graduation, puis entre deux (5 en 5 → 35) |
| `07-comparer-sur-un-diagramme`        | 097   | Diagrammes en barres · 5    | combien de plus (BO : foot / basket), combien en tout, le plus choisi (case choix)        |
| `08-construire-un-diagramme-echelle`  | 082   | Diagrammes en barres · 6    | tableau donné, effectifs jusqu'à 60 ; `axe: à choisir` puis barres à monter               |

Erreurs typiques des `testSpecs` : graduation lue comme un pas de 1 (axe de 5 en 5 : 7 pour 35) ; total de ligne pris pour
une case ; écart lu comme la plus grande barre ; échelle trop fine (barres qui ne rentrent pas).

**Question d'accès** : personne ne lit rien de plus (brouillons, admin seul) ; la migration nœud + tag ne change aucune règle.

Décisions (David, « je suis tes recos », 2026-11-05) : niveaux partagés (diagrammes 4-6 avec la 5e ; 076 aux niveaux 1-2
avec la 2de, sur le nœud parent) ; 082 dans ce lot (outil en prod) plutôt qu'en « outils neufs ».

- 2026-11-05 : 8 modèles écrits (`docs/wip/questions/lot-ce2-7c.py`, gabarit `lot-ce1-7.py`, sans theme / domain /
  subdomain), simulation verte (76 specs). Essai en base locale (`.env.local`, copie du dossier pour ne pas écrire les `id`
  locaux dans les fichiers), aperçu admin : 05 barre du basket montée à 45 → « Juste » ; 08 échelle 5 → axe 0-50 ; 04 deux cases
  cachées (ligne Bus, total des filles) bien rendues ; 06 « entre deux traits » : une barre de 5 sur un axe de 100 illisible →
  effectifs 15 à 75, axe 0-80. 08 : la plus grande barre était toujours la première → toutes tirées, condition sur `max`.
- 2026-11-05 : #2393 mergée (CI verte ; revue : aucune, contenu).
- 2026-11-05 : relecture de David sur la page à cocher (`UMiJFDZijXarjtMGoZZXPg`) : 8 verdicts « OK », sans
  commentaire (base `verdicts` comptée), posés en 9 s (12:12:29 à 12:12:38). Simulation `publier-lot` refusée à Claude
  par le classifieur du mode auto (accès prod) : à lancer par David.
- 2026-11-05 : simulation puis `--publier` (David) : 8/8 publiés ; relevé MCP : 8 `published`, `grades` CE2, rangés, un
  point chacun (074, 075, 096, 076 ×2, 083, 097, 082). Worktree retiré. **Lot 7c clos.**

## 14. Relevé après le lot 7c et lot 8 — figures planes et symétrie (phase 0 validée le 2026-11-05)

Relevé MCP (prod, 2026-11-05) : **28 points CE2 sans modèle** — 001, 002 (`collection` `centaines:`, outil C) ;
D : 086, 039, 043, 051, 065, 070 ; longueurs et masses : 012, 040, 041, 042, 044, 049, 050 ; solides : 061, 062,
063, 064, 066 ; figures planes : 067, 068, 095, 069, 071, 081 ; symétrie : 072, 073.

Outils depuis le § 4 bis : case `choix` en prod (les QCM ne sont plus bloqués, décision 6 remplie) ; contrôle
`symetrique par d` de ` ```figure-a-completer ` en prod (0.69.0, quadrillage `grille:`) → **073 passe de C à B**.
Pas de papier pointé (quadrillage seul).

Découpage proposé : **lot 8 figures planes et symétrie** (8 points) → lot 9 longueurs, fraction de l'unité et masses
(012, 040, 041, 042, 044, 049, 050) → lot 10 solides (061 à 064, 066) → chantier à part `collection` `centaines:`
(001, 002, matériel de 005).

Rangement (prod) : 067, 068, 095, 069, 081 sur « Géométrie › Figures planes › propriétés » (niveaux 1 à 5 pris, CP et
CE1) ; 071 sur « … › angles droits » (1, 2 pris, CE1) ; 072, 073 sur la notion « Géométrie › Symétrie axiale » (aucun
modèle, aucune sous-notion ; 8 points de CE2 à 6e y sont attachés ; 153 modèles de la base sont déjà rangés sur une
notion).

| Fichier                           | Point   | Catégorie · niveau              | Variations                                                                                                                                                                                                                 |
| --------------------------------- | ------- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-quelle-est-cette-figure`      | CE2-068 | Figures planes · propriétés · 6 | carré, rectangle, triangle, triangle rectangle, **losange** (choix) ; losange sur la pointe, carré sur la pointe (angles droits codés), losange presque carré, rectangle allongé                                           |
| `02-decrire-la-figure`            | CE2-095 | propriétés · 7                  | côtés, sommets, angles droits des 5 figures, losange compris (0) → [_] ; « qui suis-je ? » (4 côtés égaux, aucun angle droit → losange) (choix)                                                                            |
| `03-carre-rectangle-losange`      | CE2-069 | propriétés · 8                  | phrase vraie (choix) : côtés égaux, côtés opposés égaux, 4 angles droits ; figure codée (côtés et angles) → son nom (choix) ; ce qui manque au losange pour être un carré (choix)                                          |
| `04-le-bon-mot`                   | CE2-067 | propriétés · 9                  | élément en couleur : diagonale, rayon, diamètre, centre, milieu, longueur / largeur du rectangle (choix) ; nombre de côtés → triangle, quadrilatère, pentagone, hexagone (choix)                                           |
| `05-le-code-des-longueurs`        | CE2-081 | propriétés · 10                 | quels segments ont la même longueur ? (choix) ; rectangle codé : [AB] = 6 cm, [CD] = ? → [_] ; quelle figure est bien codée ? (choix de dessins)                                                                           |
| `06-utiliser-le-code-angle-droit` | CE2-071 | angles droits · 3               | quadrilatère aux angles codés : lesquels sont droits (choix des sommets) ; angle qui « a l'air » droit mais non codé ; codes de longueurs et d'angles → nom de la figure (choix)                                           |
| `07-est-ce-un-axe`                | CE2-072 | Symétrie axiale · 1             | figure + droite tracée : est-ce un axe de symétrie ? oui / non — losange et sa diagonale (oui), rectangle et sa diagonale (non, piège), cerf-volant, lettres A, H, N, flèche ; quelle figure a un axe ? (choix de dessins) |
| `08-combien-d-axes`               | CE2-072 | Symétrie axiale · 2             | carré 4, rectangle 2, losange 2, cerf-volant 1, triangle à deux côtés égaux 1, triangle aux trois côtés égaux 3 (montrés, jamais nommés), parallélogramme 0 → [_]                                                          |
| `09-complete-par-symetrie`        | CE2-073 | Symétrie axiale · 3             | quadrillage, axe vertical ou horizontal ; la moitié d'une figure (maison, sapin, flèche, vase, 3 à 6 segments) contre l'axe → l'élève trace l'autre moitié (`symetrique par d`) ; v1 : figure écartée de l'axe             |

Erreurs typiques des `testSpecs` : losange pris pour un carré (et l'inverse) ; triangle rectangle → « rectangle » ;
diagonale / côté, rayon / diamètre confondus ; diagonale du rectangle prise pour un axe ; carré à 2 axes (médianes
seules) ; figure glissée au lieu de retournée (message du juge).

**Question d'accès** : personne ne lit rien de plus — modèles neufs en brouillon (admin seul) ; la migration nœud +
tag ne change aucune règle.

### Questions à David

1. **Noms au 068** : même convention qu'au CE1 — le nom le plus précis est seul juste ; « rectangle » et « losange »
   restent des leurres d'un carré, jamais « triangle » avec « triangle rectangle ». Recommandation : oui.
2. **Symétrie axiale** : modèles rangés sur la notion elle-même (niveaux 1 à 3), là où sont les points ; pas de
   sous-notion créée (le CM1, le CM2 et la 6e prendront 4 et suivants). Recommandation : oui.
3. **Papier pointé** (073) : absent ; quadrillage seul, sans outil neuf. Recommandation : oui.
4. **Figures du 072** : cœur, pique, trèfle (courbes) non dessinés ; figures à côtés droits (carreau = losange,
   cerf-volant, rectangle, panneaux, lettres en segments). Recommandation : oui.
5. **Découpage** : lot 8 ici, puis 9 (longueurs, masses), 10 (solides), puis `collection` `centaines:`. Recommandation : oui.

Réponse de David (« je te suis », 2026-11-05) : les cinq recommandations.

### Lot 8 — écriture (2026-11-05)

- Script `docs/wip/questions/lot-ce2-8.py` → `scripts/questions/ce2-8/` : 9 modèles, 105 specs ; `create-questions`
  en simulation (prod) : 9 « à créer » ; `question:specs` 200 tirages par variation, verts, 0 `\textcolor` hors `$` ;
  `sonde-figures` : 0 problème. 9 brouillons en base locale, joués dans l'aperçu admin (symétrique de la flèche tracé
  au segment : « Juste »).
- Rendu relu (page d'essai locale + aperçu) ; corrigé en route : un dessin dans un choix est rapetissé et le code de
  l'angle droit y devient invisible (`arcRadiusPx` sans effet) → « Quel triangle est rectangle ? » en **une figure à
  trois triangles numérotés** ; dessins des choix en fenêtre serrée et `taille: grande` ; trapèze codé : codes sur
  ses côtés obliques égaux (et non sur deux côtés visiblement inégaux) ; parallélogramme du 08 plus franc.
- Pièges : la page à cocher n'affiche pas l'italique `_…_` (l'appli oui, vu dans l'aperçu) ; la sonde ne passe pas les
  figures d'un choix (seul le rendu les voit) ; `{{if}}` autour d'un bloc `choix` refusé (« bloc non fermé ») : faire
  varier le contenu d'une figure, jamais le bloc.
- CI #2408 rouge : la garde `answer-complexity-corpus` veut chaque réponse de spec ≤ 133 caractères (limite 400,
  marge × 3) ; le château du 09 (11 segments, 189 caractères) → une tour de 6 segments (105 au plus).
- 2026-11-05 : #2408 mergée (CI verte après la correction).
- 2026-11-05 : `create-questions --publier` (David) : 9 brouillons en prod, relus au MCP (draft, CE2, niveaux 6 à 10,
  3, 1 à 3 ; specs complètes ; sans nœud ni tag ; `updated_at` = `created_at`) ; ids commités. Migration
  `20261105201824_questions_ce2_lot8_rangement_tags` + test : rouge sans le corps (6 échecs sur 10), vert 10/10 ;
  `security-auditor` : aucun finding bloquant (diff avec la 7c : valeurs seules ; chemins et points vérifiés en prod).
- 2026-11-05 : #2409 mergée (CI verte, intégration comprise ; `check:migrations --pr 2409` OK) ; `db:migrate` depuis le
  dépôt principal (dry-run : la seule migration du lot) ; relevé MCP : 9/9 sur le nœud de leur point, un point chacun,
  brouillons, `updated_at` intact. Page à cocher publiée (https://claude.ai/artifact/AkuQcXN5U1GitVZzWRbGsF), une
  alerte attendue (09 non dessiné : le jouer dans l'aperçu), base `verdicts` vide.
- 2026-11-05 : relecture de David sur la page à cocher : 9 verdicts « OK », sans commentaire (base `verdicts` comptée,
  posés de 22:55:55 à 22:56:01). `publier-lot --publier` (David, depuis le dépôt principal) ; relevé MCP : 9
  `published`, rangés, un point chacun. **Lot 8 clos.**

## 15. Lot 9 — longueurs, fraction de l'unité, masses (phase 0 validée le 2026-11-06)

Relevé MCP (prod, 2026-11-06) : 012, 040, 041, 042, 044, 049, 050 toujours sans modèle. Rangement : 012 → « Fractions :
sens et écritures › droite graduée » (1 à 11 pris par CM1, CM2, 6e ; aucun CE2) ; 040, 041 → « Longueurs ›
comparaison et mesure » (CE2 : 4) ; 042, 044 → « Périmètres » (un modèle de 2de) ; 049, 050 → « Masses › comparaison
et mesure » (CE2 : 3). Aucun outil neuf : règle graduée en ` ```figure ` (CE1 `01-mesure-a-la-regle`), case « choix ».

| Fichier                         | Point | Rangement · niveau CE2                | Variations                                                                                                                     |
| ------------------------------- | ----- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `01-regle-en-quarts`            | 012   | Fractions › droite graduée · 1        | unité u en 4 ou 8 ; segment → « [_] u + [_] u » (2 u + 1/4 u ; 7/8 u ; 1 u + 5/8 u)                                            |
| `02-regle-en-dixiemes`          | 012   | droite graduée · 2                    | unité en 10 : segment juste (1 u + 3/10 u) ; bout entre deux graduations → encadrer entre deux dixièmes                        |
| `03-longueurs-de-reference`     | 040   | Longueurs › comparaison et mesure · 5 | « mesure environ… ? » (choix) : 1 mm, 1 cm, 1 dm, 1 m, 2 m, 1 km (¼ h à pied), 100 km (1 h d'autoroute), ~1 000 km (la France) |
| `04-estimer-une-longueur`       | 041   | comparaison et mesure · 6             | « plutôt… » : 3 choix au même chiffre (30 cm / 30 m / 30 km) ; objets et distances, mm à km                                    |
| `05-qu-est-ce-que-le-perimetre` | 042   | Périmètres · 1                        | phrase juste (« longueur du tour ») ; tour en couleur / intérieur grisé ; deux figures sur quadrillage : le plus grand tour    |
| `06-perimetre-a-la-regle`       | 044   | Périmètres · 2                        | polygone « démonté » : chaque côté (3 à 5) sur sa règle, au 0 puis non ; mesures puis périmètre ; aucune formule               |
| `07-masses-de-reference`        | 049   | Masses › comparaison et mesure · 4    | « pèse environ… ? » (choix) : 1 g trombone, 100 g tablette, 1 kg bouteille d'1 L, 10 kg seau d'eau, 1 t voiture                |
| `08-estimer-une-masse`          | 050   | comparaison et mesure · 5             | objets du BO (feuille, pomme, dictionnaire, seau d'eau, voiture ≈ 1 000 kg) ; 3 choix au même chiffre, g ou kg                 |

Erreurs typiques des `testSpecs` : graduations comptées au lieu des parts ; 1/4 pris pour 1/8 ; encadrement renversé ;
estimation à × 10 près ; périmètre pris pour l'intérieur ; côté oublié ou compté deux fois, départ de la règle non retiré.

**Question d'accès** : personne ne lit rien de plus — modèles neufs en brouillon (admin seul) ; la migration nœud +
tag ne change aucune règle.

**Décisions (David, « tes recos ? » puis « ok », 2026-11-06)** :

1. 044 : polygone démonté, chaque côté sur sa règle dessinée (pas de quadrillage).
2. 040 : repères indépendants de l'école (¼ h à pied, 1 h d'autoroute, traversée de la France), pas « vers Paris ».
3. 050 : g et kg seulement (voiture ≈ 1 000 kg) ; la tonne au 049.
4. 012 : réponse « [_] u + [_] u », fraction dans la seconde case ; simplification coupée (2/8 juste pour 1/4).
5. Un seul lot de 8 modèles, puis le lot 10.

### Lot 9 — écriture (2026-11-06)

- Script `docs/wip/questions/lot-ce2-9.py` → `scripts/questions/ce2-9/` : 8 modèles, 86 specs ; `create-questions` en
  simulation (prod) : 8 « à créer » ; `question:specs` 200 tirages par variation, verts, 0 `\textcolor` hors `$` ;
  `sonde-figures` : 0 problème. 8 brouillons en base locale (copies du dossier dans le scratchpad, pour ne pas écrire
  d'id local dans les fichiers), rendu relu sur la page à cocher locale et dans l'aperçu.
- Piège : `{{eval:…}}` rend un non-entier en fraction LaTeX (`\dfrac{9}{2}`), refusée comme coordonnée de figure →
  helper `demi()` qui écrit « partie entière . 0 ou 5 » ; l'encadrement en dixièmes écrit ses centièmes de même.
- Piège : la sonde exige une fenêtre de figure de rapport hauteur / largeur ≥ 1/4 (règles graduées : hauteur 3,6).
- Corrigé en route : 05, dessins du choix « où voit-on le périmètre ? » — contour `gris` invisible sur fond sombre →
  `noir` (suit le thème), tour, intérieur et côté en rouge.
- 2026-11-06 : #2414 mergée (CI verte ; merge retardé par un `deploy:prod` en cours).
- 2026-11-06 : `create-questions --publier` (David) : 8 brouillons en prod, relus au MCP (draft, CE2, niveaux 1, 2, 5,
  6, 1, 2, 4, 5 ; specs complètes ; sans nœud ni tag ; `updated_at` = `created_at`) ; ids commités (les fichiers du
  dépôt principal, où le script les avait écrits, rendus propres). Migration
  `20261106050331_questions_ce2_lot9_rangement_tags` + test : rouge sans le corps (6 échecs sur 10), vert 10/10 ;
  résolution des 8 chemins vérifiée en prod (nœud = celui du point). « Périmètres » a trois sous-notions (carré,
  rectangle, disque) : admises par la garde, 042 et 044 vont sur la notion, où sont leurs points.
- 2026-11-06 : `security-auditor` : aucun finding bloquant (diff avec le lot 8 : valeurs et sous-notions admises de « Périmètres » seulement ; rollback, gardes et octets de « carré » vérifiés en prod).
- 2026-11-06 : #2418 mergée (CI verte, intégration comprise ; `check:migrations --pr 2418` OK) ; `db:migrate` depuis le
  dépôt principal (dry-run : la seule migration du lot) ; relevé MCP : 8/8 sur le nœud de leur point, un point chacun,
  brouillons, `updated_at` intact. Page à cocher publiée (https://claude.ai/artifact/Nkr73iMhHLraV8WjW4U7Qq), aucune
  alerte, rendu vérifié à 390 px, base `verdicts` vide.
- 2026-11-06 : relecture de David sur la page à cocher : 8 verdicts « ok », sans commentaire (base `verdicts` comptée).
  Simulation `publier-lot` refusée à Claude par le classifieur ; simulation puis `--publier` (David) ; relevé MCP :
  8/8 `published`, `grades` CE2. **Lot 9 clos.**

## 16. Lot 10 — solides (phase 0 proposée le 2026-11-06, à valider)

Relevé MCP (prod, 2026-11-06) : 061, 062, 063, 064, 066 sans modèle (065 reste en D). Existant sur « Solides ›
propriétés » : CP 1 à 6 (dont 5 « Combien de faces ? » = 6 pour cube et pavé, 6 « toutes des carrés / toutes des
rectangles », solides dessinés en ` ```figure `), CE1 7 (« Où est le solide ? », cylindre compris) et 8 (« Nommer un
solide », **sans cylindre**). « Solides › patrons » : vide. Aucun outil neuf : ` ```solide ` (arêtes cachées en
tirets, `marquer: face | arete | sommet`, nom accessible sans le nom du solide ; pyramide carrée, rectangle,
triangle) et ` ```patron ` (cube : 11 vrais patrons, 8 faux, grille libre ; options d'un choix).

| Fichier                       | Point | Rangement · niveau CE2   | Variations                                                                                                                                   |
| ----------------------------- | ----- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-nomme-le-solide`          | 061   | Solides › propriétés · 9 | un solide dessiné → 6 choix (cube, pavé, boule, cône, pyramide, **cylindre**) ; pièges : pavé presque cube, cylindre couché, cône / pyramide |
| `02-face-arete-sommet`        | 062   | propriétés · 10          | cube, pavé ou pyramide, un élément marqué (face grisée, arête épaisse, sommet pointé) → « C'est une face / une arête / un sommet »           |
| `03-compter-faces-aretes`     | 062   | propriétés · 11          | « Combien de sommets ? d'arêtes ? de faces ? » → [_] : cube, pavé (8, 12, 6), pyramide carrée (5, 8, 5), à base triangle (4, 6, 4)           |
| `04-faces-du-cube-et-du-pave` | 063   | propriétés · 12          | cube, pavé quelconque, pavé à base carrée : « [_] faces, dont [_] carrés » ; la face ABCD grisée est un carré / un rectangle                 |
| `05-faces-de-la-pyramide`     | 064   | propriétés · 13          | pyramide carrée, rectangle, triangle : les faces de côté sont des… (triangles) ; la base est un… ; « [_] faces triangulaires »               |
| `06-se-plie-en-cube`          | 066   | Solides › patrons · 1    | un assemblage de 6 carrés (vrai 1 à 11 / faux 1 à 8, tourné, retourné) → « Se plie en cube : oui / non »                                     |
| `07-lequel-est-un-patron`     | 066   | patrons · 2              | « Lequel se plie en cube ? » : 3 assemblages, un vrai, deux faux (dont un à 5 carrés ou à 7 : le nombre de faces)                            |

Erreurs typiques des `testSpecs` : faces cachées oubliées (3 au lieu de 6) ; arêtes cachées oubliées (9 au lieu de 12) ;
sommet et arête inversés ; pyramide comptée comme un cube ; base de la pyramide prise pour un triangle ; pavé presque
cube nommé cube ; cylindre nommé pavé ; faux patron 1-4-1 décalé jugé bon.

**Question d'accès** : personne ne lit rien de plus — modèles neufs en brouillon (admin seul) ; la migration nœud +
tag ne change aucune règle.

**Questions à David** :

1. 063, « dont [_] carrés » : un carré est aussi un rectangle. Recommandation : ne jamais demander « combien de
   rectangles ? », seulement « combien de carrés ? » et « la face grisée est un carré / un rectangle » sur un pavé
   quelconque (aucune face carrée), pour ne pas trancher la question à la place du maître.
2. 066 : le geste `completer:` (ajouter la case qui manque) ou `designer: opposee` (face opposée) ? Recommandation :
   pas au CE2 (l'exemple de réussite du BO = dire si c'est un patron) ; oui / non et « lequel ? » seulement.
3. 062 et 063 : arêtes cachées toujours en tirets (comme le BO : « à identifier »). Recommandation : oui, jamais
   `cachees: non`.
4. Un seul lot de 7 modèles, puis le chantier à part `collection` `centaines:`.

**Décisions (David, « tes recos ? » puis « je te suis », 2026-11-06)** :

1. 063 : jamais « combien de rectangles ? » ; « combien de carrés ? », et « carré ou rectangle ? » sur un pavé
   sans face carrée seulement.
2. 066 : oui / non et « lequel ? » ; ni `completer:` ni `designer:`.
3. Arêtes cachées toujours en tirets (jamais `cachees: non`).
4. Un seul lot de 7 modèles, puis le chantier à part `collection` `centaines:`.

### Lot 10 — écriture (2026-11-06)

- Script `docs/wip/questions/lot-ce2-10.py` → `scripts/questions/ce2-10/` : 7 modèles, 72 specs ; `create-questions` en
  simulation (prod) : 7 « à créer » ; `question:specs` 200 tirages par variation, verts, 0 `\textcolor` hors `$` ;
  `sonde-cubes` : 3 600 blocs d'espace, 0 problème. 7 brouillons en base locale (copie du dossier dans le scratchpad),
  rendu relu sur la page à cocher locale (solides) et dans l'aperçu (patrons, que la page à cocher ne dessine pas).
- Corrigé en route : 02, l'arête marquée (trait épais) se distingue à peine → l'élément est aussi nommé dans la question
  (« qu'est-ce que $AE$ ? ») ; 04, « dessinée penchée » faux pour la face de devant → phrase selon la face ; 05, base
  carrée : plus de renvoi aux cotes (une seule cote de base).
- Piège : la page à cocher ne dessine pas ` ```patron ` (06, 07) : David les joue dans l'aperçu admin.
- 2026-11-06 : #2426 mergée (CI verte ; revue : aucune, contenu).
