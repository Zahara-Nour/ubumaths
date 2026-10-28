---
title: Figure manipulable partout et case « choix » (QCM réécrit en cases)
date: 2026-10-26
status: lot 1 terminé (#1816, #1822), lot 2 à faire
---

# Chantier « figure-et-choix »

## Reprendre ici

_Mis à jour le 2026-10-28, après #1938 (lot 5a mergé)._

- **État** : lots 1 à 4 EN PROD ; 5b (#1924) et 5a (#1938) MERGÉS, pas encore en prod : le type
  `multiple_choice` n'existe plus dans le code (revues opus + sécurité sans bloquant, § 2.13). Worktree retiré.
- **Prochaine action** : rien avant le `deploy:prod` (décision de David). Après : migration destructive
  (contrainte `question_templates_type_check`, tables `migration_tracking` / `migration_edits` exportées en JSON
  dans `data/` avant, colonne `multiple_answers`, `options - 'shuffleChoices'` sur 3 brouillons) :
  s'arrêter et expliquer à David ce qui sera perdu. Ensuite lot 6.
- **En attente de David** : essais à l'écran (QCM migrés, CP-058) ; avis sur les séries PDF ; publication de CP-058.
- **Pièges en cours** : `questions-1spe` repart de `main` (sources `1spe-0-*`, `logique-1spe/B-02`, `B-04`
  réécrites). Entre `deploy:prod` et la migration, les 3 brouillons à `shuffleChoices` ne se dupliquent plus
  (400). 6 modèles `cp-b2` : `level` prod ≠ source. Test `corrections.test.ts` (R-PASS) instable en CI (5 s).
- **Worktree / branche** : aucun (nouvelle branche pour la migration d'après deploy).

---

## Historique

- 2026-10-28 — **#1938 mergée** (lot 5a) : QCM retiré du code, tests portés, revues sans bloquant.
- 2026-10-26 — **#1842 mergée** (restes, phase 0 suivie) : `withBlockCases` réaligne un modèle à
  variables quand l'énoncé brut compte comme le résolu (pas de variable dans un ```operation, mêmes
  cases avec chaque `{{…}}` = `1`) — forme de CP-058 couverte ; `<<expr:…>>` jamais (format de réponse
  `?/?`, constat de la revue sonnet). Choix rendus dans l'éditeur de tests. Espaces de bord : sondés,
  non prouvés (seul un espace de tête disparaît du champ, sans effet) → laissés.

- 2026-10-26 — **#1840 mergée** (lot 3) : CP-058 réécrit, 10 specs, simulation verte ; démo
  `/dev/carte-question` alignée ; fait depuis un worktree frère (le premier figé par l'essai du lot 2).
- 2026-10-26 — **#1836 mergée** : vu par David à l'essai du lot 2, « Remplissez les blancs avec vos
  réponses » sous un choix seul. `FillBlanksInput` ne l'affiche plus que s'il y a une case à écrire (ni
  choix, ni figure, ni collection/monnaie à construire) ; règle ajoutée à `docs/systeme/questions.md`.
- 2026-10-26 — **#1833 mergée** : trouvé par David à l'essai du lot 2 (énoncé collé, formulaire parti d'une
  entrée → pas de carte pour le choix, « aucune bonne réponse »). `withBlockCases` réaligne comme le
  générateur ; revue sonnet : réalignement à l'ouverture (formulaire « modifié ») et sur énoncé brut à
  variables (division `{{a}} ÷ 7` = 2 cases résolues) → corrigés avant merge.

- 2026-10-26 — **#1826 mergée** (lot 2, figure de travail) : phase 0 § 2.9 (recos suivies). Un seul point de
  retrait (`gradedPart`) prouvé rouge sans lui ; trou trouvé en route : `QuestionCard` exigeait toutes les
  cases en évaluation (corrigé, `workFigure` public). Revue opus : 4 mineurs, 3 corrigés (message de choix
  en double, R1 perdu, message du modèle), le 4ᵉ préexistant noté. Conflit avec la case à construire de
  `main` (#1825) résolu : sa ligne `build` puis la figure de travail en dernier.

- 2026-10-26 — **#1816 mergée** (PR 1a) : bloc ` ```choix `, case `type: 'choice'`, notation = QCM, envoi en
  positions affichées ramenées aux indices d'origine par le serveur (400 si illisible), choix à leur place
  dans la correction, PDF de fiche. Revues : code (2 mineurs corrigés), sécurité (rien). CI : garde
  `block-css-vars` (couleurs `--expected-*` admises comme crochets à repli) ; conflit avec la case
  « collection à construire » de `main` résolu.

## 1. Origine et décisions de David (2026-10-26)

Né de l'essai de CP-058 (« Points alignés ? », chantier `geometrie-validation`, § 13 de son journal) : la figure
y est une case notée alors qu'on veut seulement que l'élève PUISSE vérifier, et le oui / non est une case texte
tapée parce qu'une question est QCM **ou** à cases (`src/lib/questions/types.ts`, `getQuestionType`).

1. **Deux usages d'une figure, au choix du modèle** : « Tu peux vérifier en traçant… » → figure de **travail**
   (tracés possibles, rien de noté, réponse à côté) ; « Montre comment tu vérifies que… » → figure **réponse**,
   notée (le `figure-a-completer` d'aujourd'hui). Outils limités par l'auteur (ex. droites seules).
2. **Figure déplaçable utilisable partout** : revient sur la spécification du 2026-10-13 qui réservait
   `deplacable:` (et `rendu:`) aux figures stockées (`geometry_figures`, ADR 0027 ;
   `src/lib/ubumark/__tests__/figure/figure-reglages-interactifs.test.ts`).
3. **QCM = une case « choix »** (idée de David), option **B** « le plus propre possible, même si c'est plus de
   travail » : TOUS les QCM réécrits en questions à cases, QCM en prod migrés, type `multiple_choice` retiré.
   Écarté : A (case « choix » à côté des QCM gardés).
4. **Tracé sur une figure de travail : GARDÉ, non noté** (reco suivie) : à l'entraînement, visible à côté de la
   correction (rien d'enregistré, comme aujourd'hui) ; en évaluation, enregistré avec la réponse (`test_answers`)
   et montré dans la copie corrigée et le PDF, sans vert ni rouge.

## 2. Phase 0 (écrite et validée le 2026-10-26)

### 2.0 L'existant, en bref (lu le 2026-10-26)

- **QCM** : `choices[{content, isCorrect}]` dans la variation ou `shared`, bonne réponse par `isCorrect` ou
  `correctChoiceIndex` (peut être dynamique, `{{eval:…}}`), `multipleAnswers` au niveau du MODÈLE, mélange
  `options.shuffleChoices` (activé par défaut, consomme la graine en fin de génération). Type DÉDUIT
  (`getQuestionType`), mais aussi écrit dans `question_templates.type` (filtres admin). Notation : 1 / ½ (bons
  choix seulement, pas tous) / 0. Réponse stockée = `number[]` d'indices d'origine, les cases = `string[]` :
  on ne les distingue que par le type JS (`[]` ambigu).
- **Prod (2026-10-26)** : 178 QCM (80 publiés, 98 brouillons) ; 2 à plusieurs réponses ; 88 avec des maths
  dans les choix, 4 avec un bloc (` ```courbe `) dans un choix ; 86 non mélangés ; **aucun ne mêle choix et
  cases** ; **0 réponse de QCM dans `test_answers`** (rien à convertir). ~110 fichiers `scripts/questions/**`
  portent `"choices"`.
- **Figure à compléter** : une case (`type: 'graphical'`) ; `outils:` UN seul outil (droite ou segment) ;
  `verifier:` OBLIGATOIRE ; tout-ou-rien ; figure vide → « Tu n'as pas tout complété », 0 point. Copie corrigée :
  vert si juste, sinon traits de l'élève + bonne figure en pointillés ; aucun rendu « neutre ». PDF (fiche) :
  la figure de départ seule.
- **`deplacable:` / `rendu:`** : refusés hors figure enregistrée (`figure-parser.ts:300`). Surtout : une figure
  de question est un SVG statique (`FigureBlockView`, `figureToSvg`) ; seul `StoredFigurePreview` passe par
  `GeometryCanvas`. Ouvrir les clés = brancher `GeometryCanvas` dans le rendu des blocs, pas seulement le
  parseur. La fenêtre n'est facultative qu'en mode interactif.
- **Pas de PDF de copie corrigée d'évaluation** trouvé ; le seul PDF est celui des fiches (énoncé + corrigé).

### 2.1 La case « choix »

Proposition : une **case choix** est une case comme les autres (`blanks[i]`, positionnelle), marquée dans
l'énoncé par un bloc :

````
Les points sont-ils alignés ?

```choix
- Oui
- Non
```
````

la bonne réponse étant portée par la case (`blanks[i].expectedAnswer: "1"` ou `"{{eval:…}}"`, indices
d'origine en chaîne, ou `"0;2"` à plusieurs), et ses réglages aussi : `plusieurs: oui`, `melanger: non`.
Un choix reste de l'ubumark (maths, blocs comme aujourd'hui).

**Nominal**

- L'élève voit l'énoncé, puis les choix à l'endroit du bloc (lettres A, B, C, ronds ou carrés comme
  aujourd'hui), et coche. Il peut y avoir d'autres cases avant ou après (texte, maths, figure).
- Notation de la case : juste / fausse / vide ; à plusieurs réponses, « bons choix seulement, pas tous »
  = forme non optimale (½). Une question réduite à une case choix est donc notée **exactement** comme le QCM
  d'aujourd'hui (1 / ½ / 0).
- Question mêlant choix et autres cases : barème actuel des cases (`statusFromBlankStatuses`), la case choix
  comptant comme une case.
- Réponse stockée : une chaîne dans `values[]`, comme toute case (`"1"`, `"0;2"`), en indices d'origine :
  plus de `number[]`, plus d'ambiguïté.
- Copie corrigée : la liste des choix, cochés par l'élève, bons choix marqués (rendu `choices` actuel, à sa
  place dans l'énoncé). PDF de fiche : `**a)** … **b)** …` dans l'énoncé, `Réponse : **b)** …` au corrigé.
- Écriture : l'éditeur de cases gagne « case choix » (liste de choix, bonne(s) réponse(s), Vrai / Faux) ;
  le mode QCM de l'éditeur disparaît au lot du retrait.

**Limite**

- Deux cases choix dans une question : permis, chacune son mélange.
- Un seul choix, ou un choix vide → erreur à l'écriture (« au moins 2 choix »).
- Choix contenant `?` ou `[_]` : pas une case (une case dans un choix est refusée avec message).
- Mélange : la graine reste celle de l'instance ; l'ordre des QCM migrés **changera** pour une même graine
  (sans conséquence : aucune réponse stockée, les instances enregistrées gardent leur ordre).

**Erreur**

- Bonne réponse hors des choix, ou 0 / plusieurs bonnes sans `plusieurs: oui` → erreur située à l'écriture
  (règles de `choice-answer-count.ts`, reprises).
- Réponse reçue illisible (`"x"`, indice hors bornes, doublon) → 400 côté serveur (Zod), case fausse côté
  navigateur.

### 2.2 Migration des QCM et retrait de `multiple_choice`

- Script de migration (données, pas de schéma) : pour chaque QCM, ajouter le bloc ` ```choix ` en fin
  d'énoncé, déplacer `choices` / `correctChoiceIndex` / `multipleAnswers` / `shuffleChoices` dans la case,
  `type` → `fill_in_blanks`. Mêmes `id` : les contrôles, chapitres et révisions SRS qui pointent vers ces
  modèles ne bougent pas. Vérification : chaque modèle migré génère, et ses `test_specs` (réécrits :
  `selectedChoices` → `answers`) passent. Copie de sauvegarde des 178 lignes avant écriture.
- Mêmes réécritures dans `scripts/questions/**` (sources des modèles).
- Ordre imposé : code qui lit la case choix → `deploy:prod` → migration des données → code sans
  `multiple_choice` → `deploy:prod` → migration SQL de la contrainte `question_templates_type_check`
  (retrait de la valeur, destructive au sens « ne peut plus être écrite » : arrêt et explication avant).
- Hors champ : le QCM des énigmes (`riddles/`, indépendant) et l'ancien format de migration
  (`src/lib/migration/`, à décider : 2.6 Q7).

### 2.3 La figure de travail

Proposition : un bloc distinct ` ```figure-de-travail `, même en-tête que ` ```figure-a-completer `
(fenêtre, `outils:`…), **sans `verifier:`** (refusé s'il est écrit). C'est une case non notée.

**Nominal**

- L'élève trace avec l'outil permis ; la réponse est ailleurs (case choix, texte…).
- Notation : la figure de travail n'entre pas dans le barème ; vide, elle ne bloque pas « Valider » et ne
  déclenche pas « Tu n'as pas tout complété ».
- Entraînement : après correction, ses traits restent visibles, **gris, sans vert ni rouge**, à côté de la
  correction ; rien d'enregistré (comme aujourd'hui).
- Évaluation : le tracé est enregistré avec la réponse (`values[]`, même chaîne `droite(…)|…`), montré dans la
  copie corrigée de l'élève et du prof, en gris.
- PDF de fiche : la figure de départ (comme une figure à compléter).

**Limite**

- Figure de travail vide en évaluation : enregistrée vide, copie « aucun tracé ».
- Outils : un seul par figure aujourd'hui (droite ou segment) — 2.6 Q4.

**Erreur**

- `verifier:` dans une figure de travail, outil inconnu → erreur située à l'écriture.
- Tracé reçu illisible ou trop long (bornes actuelles : 1000 car., 20 objets) → 400 / ignoré.

### 2.4 `deplacable:` (et `rendu:`) partout

- Une figure de question (bloc ` ```figure `) peut porter `deplacable: oui` / `rendu: croquis|mixte` ;
  elle s'affiche alors dans la toile (`GeometryCanvas`) au lieu du SVG statique.
- Limite : PDF → figure statique (clés ignorées) ; sans `deplacable:` → SVG statique comme aujourd'hui
  (rien ne change pour les figures existantes).
- Erreur : valeur inconnue → erreur située (messages actuels).
- À cadrer avec David (2.6 Q5) : où « partout » (questions, cours, fiches à l'écran…) et si une figure à
  compléter / de travail peut aussi être déplaçable.

### 2.5 Ordre des lots (proposé)

1. **Case choix** (lecture, notation, rendu, copie, PDF, éditeur), à côté des QCM existants.
2. **Figure de travail**.
3. **CP-058 réécrit** (figure de travail + case choix oui / non), essai par David, puis publication.
4. **Migration des 178 QCM** (après `deploy:prod` des lots 1-2).
5. **Retrait de `multiple_choice`** du code, puis (après `deploy:prod`) de la contrainte SQL.
6. **`deplacable:` partout**.

Le gros risque (correction des réponses) est dans les lots 1, 4, 5 → revue `code-reviewer` opus ;
lot 4 touche des données en prod → question d'accès (aucun accès nouveau : contenu des modèles seulement).

Termes `CONTEXT.md` (dans le lot 1-2) : **Case choix** (remplace **QCM** ; « QCM » reste le nom courant d'une
question réduite à une case choix), **Figure de travail** (≠ figure à compléter, qui est la « figure
réponse »). ADR : « Le QCM est une case » (révise la séparation QCM / cases de `getQuestionType`).

### 2.6 Questions à David — toutes tranchées le 2026-10-26 (recos suivies)

1. **Syntaxe** : bloc ` ```choix ` à liste `- …` dans l'énoncé (fence ` ```` ` si un choix contient un bloc) ;
   bonne réponse portée par la case (`expectedAnswer`, indice d'origine, dynamique possible), cochée dans
   l'éditeur. Écartés : marqueur `[choix]` + champ à part ; `- [x]` dans la liste.
2. **Plusieurs réponses** : réglage de la CASE (`plusieurs: oui`) ; ½ pour « bons choix seulement, pas tous »
   (forme non optimale) ; un mauvais choix coché → 0.
3. **Mélange** : activé par défaut, `melanger: non` (oui / non, vrai / faux, ordre signifiant) ; préréglage
   Vrai / Faux = `melanger: non`.
4. **Outils de la figure de travail** : un seul outil (droite pour CP-058) ; `outils:` lu comme une liste pour
   ouvrir plus tard un sélecteur d'outil sans changer la syntaxe.
5. **`deplacable:`** : les **énoncés de questions** d'abord (cours et fiches à l'écran plus tard) ; une figure
   à compléter ou de travail n'est **jamais** déplaçable (refus situé si `deplacable:` y est écrit).
6. **Ordre des lots** : celui de 2.5.
7. **PDF** : fiche PDF = figure de départ seule ; un futur PDF de copie corrigée montrera le tracé en gris.
   **Import TinyMath terminé** → `src/lib/migration/` et sa page admin **retirés au lot 5**.

### 2.7 Lot 1 : découpage

- **PR 1a — moteur** (tests d'abord) : bloc ` ```choix ` lu par `assignBlankIndices` (case `type: 'choice'`),
  génération (choix résolus, mélange par case), validation du modèle (≥ 2 choix, compte de bonnes réponses),
  notation (statut de case ; ½ = `unoptimal_form`), Zod de la réponse (`"1"`, `"0;2"`), rendu élève dans
  `FillBlanksInput`, carte flash, résultat attendu / copie corrigée, PDF de fiche.
  Docs : `CONTEXT.md` (Case choix, Figure de travail), ADR « Le QCM est une case », `docs/systeme/questions.md`.
  Revue : `code-reviewer` opus (correction des réponses).
- **PR 1b — éditeur** : « case choix » dans l'éditeur de cases (liste, bonne(s) réponse(s), Vrai / Faux),
  `test_specs` d'une case choix. Revue : `code-reviewer` sonnet.

### 2.8 PR 1b : phase 0 validée par David (2026-10-26)

- La carte « Case N : choix » lit le bloc dans l'énoncé effectif (variation, sinon partagé) et le
  **réécrit** à chaque modification (choix, `plusieurs:`, `melanger:`) ; bonne réponse cochée → `expectedAnswer`.
- « Ajouter une case choix » / « Vrai / Faux » : bloc ajouté **en fin d'énoncé** (case dernière).
- Réponse calculée : champ de texte + « Cocher à la main » ; bloc mal écrit : messages, champ seul, jamais réécrit.
- Énoncé partagé (revue) : carte en lecture seule, pas d'ajout de case — option A, David suit la reco.
- Tests : une case choix se coche (`"0;2"`). Éditeur riche : bloc gardé en code `choix` (clôture ```` si besoin).

### 2.9 Lot 2 (figure de travail) : phase 0 validée par David (2026-10-26, recos suivies)

Comportements du § 2.3, plus :

- **Q1 — un seul point de retrait** : une fonction rend « les cases notées » (instance sans ses figures de
  travail, réponse sans leurs tracés) ; la notation du serveur (`grading.ts`) et celle de l'élève
  (`answer-validator.ts`) l'appellent EN PREMIER. Rien d'autre (cases vides, appariement libre, « figure
  vide → 0 », « Tu n'as pas tout complété », ½ des cases vides) ne voit la figure de travail. Le tracé garde
  sa place dans `values[]` (enregistré en évaluation, sans migration). Tests : figure de travail + case choix
  (juste/vide, juste/tracée, faux, choix vide) et + deux cases texte en appariement libre, serveur ET élève.
- **Q2 — (b) partout** : la carte de correction (`CorrectionCard`) est commune à l'entraînement, la Course et
  la copie → une ligne « Ta figure de travail » (prof : « Sa figure de travail ») dans le résultat attendu,
  APRÈS les réponses notées : figure de départ + traits en gris, ni vert ni rouge ni pointillés ; vide →
  « aucun tracé ». Jamais listée parmi les réponses attendues.
- **Q3 — (a)** : carte « Figure de travail — non notée » en lecture seule dans l'éditeur, sans numéro de
  case, avec son outil ; erreurs (`verifier:`, `deplacable:`, outil inconnu, figure de travail seule) sur
  la carte ; rien dans l'éditeur de tests (valeur vide, ignorée).
- Une question dont la seule case est une figure de travail est refusée à l'écriture (« il faut au moins
  une case notée »). Pas de numéro de case pour l'élève.

### 2.10 Lot 3 : CP-058 réécrit (2026-10-26)

Fait depuis un worktree frère (`../ubumaths-wt-figure-et-choix-cp058`) : celui du chantier est figé tant que
David essaie le lot 2 sur 5179.

- `docs/wip/geometrie-validation/modele-cp058.py` → `scripts/questions/cp-figure/03-points-alignes.json` :
  « Tu **peux** tracer la droite (AB) pour vérifier. » + ` ```figure-de-travail ` (outil droite, sans
  `verifier:`) + ` ```choix ` `melanger: non` « Oui / Non ». `blanks[]` écrit la figure (réponse vide) avant
  le choix (`0` = Oui, `1` = Non) pour que l'éditeur aligne ses cartes sur un modèle à variables (reste
  connu de #1833). Reste du modèle inchangé (deux variations, tirages, lettres, delay 60 s).
- 10 specs, `create-questions` en simulation vert (« à créer ») : la figure ne compte jamais (tracée ou non,
  juste ou non) ; droite tracée et rien coché → `empty`, pas `incorrect`.
- Changé par la décision du lot 2 (attendu) : Valider n'est plus grisé sans droite ; « temps écoulé sans
  droite, réponse juste » vaut désormais le point (avant : 0).
- `/dev/carte-question`, « Points alignés ? (CP-058) » : même forme (instance écrite à la main, comme le
  générateur la rend).
- **Publication** : seulement après le `deploy:prod` des lots 1-2 (le code en prod ne lit ni ` ```choix ` ni
  ` ```figure-de-travail `), puis David lance `create-questions --dir scripts/questions/cp-figure --publier`.

### 2.11 Lot 4 : migration des QCM, phase 0 (validée par David le 2026-10-26)

Préparé avant le `deploy:prod` des lots 1-3 (décision de David) : rien n'est écrit en prod avant ce
déploiement. Worktree `../ubumaths-wt-figure-et-choix-qcm`, branche `feat/figure-et-choix-migration-qcm`.

**Relevé en prod (lecture seule, 2026-10-26)** : 178 QCM (80 publiés, 98 brouillons), 639 variations. Toutes
ont un `statement` et une `correctChoiceIndex` (637 en tableau). Choix dans la variation (337) ou dans
`shared.choices` (les autres). 118 bonnes réponses calculées (`{{g}}`, `{{eval:…}}`, `{{if:a>0|0|1}}`),
5 à plusieurs bonnes réponses (2 modèles `multiple_answers`, brouillons). Aucun `isCorrect`, aucun `blanks`.
`options.shuffleChoices` : `false` 86, absent 54, `true` 38. 7 variations ont un choix qui contient un
bloc, 9 un choix sur plusieurs lignes. Tous ont des `test_specs`. 110 fichiers sous `scripts/questions/`.

**Ce que fait la migration (une fonction, les mêmes règles pour la base et pour `scripts/questions/**`)**

- Par variation : bloc ` ```choix ` ajouté **en fin d'énoncé** de la variation (choix = ceux de la variation,
  sinon ceux de `shared`), `plusieurs: oui` si `multiple_answers`, `melanger: non` si
  `shuffleChoices === false` ; clôture ```` si un choix contient un bloc, suite d'un choix en retrait de
  2 espaces. `blanks: [{ expectedAnswer }]` = les indices de `correctChoiceIndex` joints par `;`
  (calculés gardés tels quels). `choices` et `correctChoiceIndex` retirés (variation et `shared`),
  `options.shuffleChoices` et `multiple_answers` retirés, `type` → `fill_in_blanks`. Mêmes `id`.
- `test_specs` : `selectedChoices: [0, 2]` → `answers: ["0;2"]`.
- **Garde avant toute écriture, modèle par modèle** : pour 50 graines, l'ancien modèle et le nouveau tirent
  les mêmes choix (même texte), la même bonne réponse, et le nouveau n'a qu'**une** case, la case choix ;
  ses `test_specs` réécrits passent. Un seul écart → le modèle n'est pas migré, il va au rapport.
- Script `scripts/migrer-qcm-en-cases.ts` : par défaut **essai** (lit la prod, écrit le rapport et la copie
  de sauvegarde des 178 lignes, n'écrit rien) ; `--ecrire`, lancé par David avec `!` après le
  `deploy:prod` (le classifieur refuse les écritures en prod).

**Question d'accès** : aucun accès nouveau ; seul le contenu des modèles change (mêmes lignes, mêmes `id`,
mêmes policies).

**Limites trouvées au relevé (à trancher)**

- Q1. `?` dans une formule d'énoncé (« Déterminer le signe d'un facteur » : `$$(-a)*?=b$$`, ~10 variations
  publiées). Aujourd'hui le QCM l'affiche tel quel ; une fois migré, il deviendrait une case à remplir.
- Q2. Bonnes réponses calculées qui se répètent (2 brouillons à plusieurs réponses :
  `["0","{{f1}}","{{eval:2*f2}}",…]`, où un choix faux rend `0`). La case choix refuse aujourd'hui un indice
  répété dans la bonne réponse (« illisible »).

**Tranché par David (2026-10-26)** : Q1 → « … » (comme les autres QCM : « 1 m = … cm », « f … g ») ;
Q2 → doublon admis dans la bonne réponse de l'auteur (un indice répété compte une fois), toujours refusé dans
la réponse d'un élève. Phase 0 validée.

**Fait (2026-10-27)**

- `scripts/lib/qcm-en-cases.ts` (conversion + garde `compareMigration`), `scripts/migrer-qcm-en-cases.ts`
  (essai par défaut, `--ecrire`, `--fichiers`), tests `scripts/__tests__/qcm-en-cases.test.ts` (dont 4 où
  la garde doit dire non : bonne réponse, case de trop, choix, correction).
- `readExpectedChoices` : indice répété admis dans la bonne réponse (test rouge puis vert).
- Trouvé à l'essai à blanc (135 / 178 au premier passage) :
  - `\ldots` casse la notation maison (`(-a)*\ldots=b` reste brute, `*` affiché) → caractère « … »
    (U+2026), converti comme avant (`\left( -30 \right) \times … = 66`) ;
  - variable `expression…` : dans une question à cases elle porte une case (« = ? »), dans un QCM elle
    ne fait qu'afficher → renommée `expr…` partout (`{{…}}`, conditions, specs) ; marque `<<expr:…>>`
    retirée à l'affichage d'un QCM, donc ignorée par la garde ;
  - énoncé vide d'une variation (« Parité ») : celui de `shared`, comme le générateur (`||`) ;
  - choix sans `{{…}}` : non résolus dans un QCM, résolus avec l'énoncé dans le bloc (`(u_n)` →
    `\left( u_n \right)`, `e` → `\exponentialE`, 16 brouillons) : admis par la garde s'ils valent l'ancien
    choix passé par la même résolution.
- **Essai à blanc en prod (lecture seule)** : 178 / 178 migrables, 31 950 tirages comparés (639 variations
  × 50 graines), contrôle d'import sans refus nouveau. Sources : 110 / 110, 21 300 tirages, 110 fichiers
  réécrits.
- Revue opus (#1855) : rien qui change la notation ou l'écran aujourd'hui ; corrigé : la garde contrôle le
  mélange (« fixe ou mélangé » : la graine ne reproduit pas l'ordre), 500 tirages quand la bonne réponse est
  calculée (branche rare → indice que la case refuse), doublon admis seulement si la bonne réponse est
  calculée (en dur : faute de frappe, comme l'éditeur), bilan d'écriture qui compte les échecs (exit 1).
  Essai à blanc refait : 178 / 178, 85 050 tirages. Laissé : rendu des 16 brouillons à choix normalisés
  (vérification à l'œil) ; séries PDF : les choix d'une case mélangée s'impriment dans l'ordre mélangé (avant :
  ordre de l'auteur, bonne réponse souvent en a)), signalé à David.
- Piège : les sources de `scripts/questions/**` sont réécrites dès le merge, la base seulement après
  `--ecrire` ; d'ici là `create-questions` voit « CONTENU DIFFÉRENT » sur ces modèles (sans écrire).

### 2.12 Lot 5 : phase 0 (validée par David le 2026-10-28, recos suivies)

Constat : aucune instance de QCM dans les copies enregistrées en prod (`evaluation_attempt_questions`,
`test_answers`, `worksheet_instances`, `game_challenge_attempts`) → aucun affichage ancien à préserver.

- **Nominal** : types `fill_in_blanks` et `course_card` seuls ; mode QCM de l'éditeur retiré (case choix /
  Vrai / Faux) ; notation, copie corrigée, carte flash, aperçu, PDF : chemin de la case choix seul (note
  inchangée 1 / ½ / 0). QCM des énigmes (`riddles/`) hors champ.
- **Limite** : `type: 'multiple_choice'` reçu → 400 avec message (« case choix ») ; champs QCM de modèle
  (`choices`, `correctChoiceIndex`, `multipleAnswers`, `shuffleChoices`) retirés des types et de Zod, reçus
  → 400 (pas de retrait silencieux).
- **Découpage** : PR 5a = retrait de `multiple_choice` (revue `code-reviewer` opus) ; PR 5b = retrait de
  l'import TinyMath (page admin, `/api/migration/*`, `components/migration/`, `server/migration/`,
  transformateur, anciens types, scripts d'import, `relecture:*`, modes `--index/--file/--lot` de
  `question:specs`, `data/tinymath/`, `data/relecture/`) ; `check-template` et `template-insert-row`
  passent sous `src/lib/questions/`.
- **Après `deploy:prod`** : une migration retire la valeur de `question_templates_type_check` et supprime
  `migration_tracking` (633 lignes) et `migration_edits` (632), export JSON commité dans `data/` avant ;
  destructif → arrêt et explication.

### 2.13 Lot 5a : fin des tests et revues (2026-10-28)

- Restes retirés : badge et filtre « QCM » de l'admin, enum OpenAPI, « Choix non mélangés » de la fiche.
- 8 fichiers de tests client encore au format QCM portés (`CorrectionCard`, `FlashCard-resultat-attendu`,
  `QuestionCard-allegee`, `-mots-cliquables`, `-pending`, `QuestionPreviewTabs`, `fonctions-declarees`,
  `TestInteractive`). Piège : la suite client complète s'arrête en silence (navigateur fermé, `wrapDynamicImport`)
  et n'exécute que 169 à 262 fichiers sur 400 → la lancer par `--shard=i/4` et vérifier « 100 (100) ».
- `security-auditor` : aucun bloquant. `code-reviewer` opus : prêt pour PR. Suites données :
  - 3 brouillons en prod (`6c3ee9e6`, `55341e85`, `f98164b1`, logique 1re spé) ont `options.shuffleChoices:
false` sans bloc ```choix : sources nettoyées ici ; en base, à retirer dans la migration d'après deploy.
  - Champ QCM reçu à `null` : admis (éditeur ouvert avant) mais n'est plus écrit (`.transform(() => undefined)`).
- Laissés (mineurs) : `shared.choices: null` refusé là où la variation l'admet ; `answerValueSchema` des tests
  accepte encore `number` ; aperçu `/dev/apercu-question` montre `$$0;2$$` pour une case choix ;
  `multiple_answers` reste dans les types de réponse (colonne encore là).
