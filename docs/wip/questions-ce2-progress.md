# Chantier « questions-ce2 » — couvrir les points du CE2 en modèles de questions

> Démarche : [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`).
> Chantiers de référence : le CP ([questions-progress.md](questions-progress.md)), le CE1
> ([questions-ce1-progress.md](questions-ce1-progress.md)).

## Reprendre ici

_Mis à jour le 2026-10-27, relevé et état des lieux faits._

- **État** : relevé prod (§ 1), vérification de l'existant (§ 2) et classement des 84 points sans modèle (§ 3) écrits ; rien codé.
- **Prochaine action** : réponses de David aux questions du § 4, puis lot 0 (corrections) ou lot 1 selon sa réponse.
- **En attente de David** : les 7 questions du § 4.
- **Pièges en cours** : niveaux à relever parmi les publiés de la catégorie AVANT l'écriture (CE1 lot 1) ; case « choix » sur `main` mais pas en prod → demander la forme au premier QCM ; `collection` sans `centaines:`.
- **Worktree / branche** : aucun ; le premier lot partira d'un worktree neuf `../ubumaths-wt-questions-ce2` depuis `origin/main`.

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
