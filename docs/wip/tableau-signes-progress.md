---
status: en cours
---

# Chantier « tableau-signes » — tableau de signes à compléter

> Outil n° 8 de [outils-manquants.md](outils-manquants.md) : cases dans le bloc ` ```variation `.
> Points servis : 2-268, 426, 330, 446, 337, 449-451 (2de), puis 1re et Tle. Ouvert le 2026-11-02.

## Reprendre ici

_Mis à jour le 2026-11-04, PR #2358 ouverte (tableau resserré au téléphone)._

- **État** : #2335, #2338 en prod (0.68.0) ; #2353 (`clavier-mathlive`) mergée, pas déployée. #2358 :
  2-330 à 390 px passe de 565 à 396 px (308 de place), ombre du bord qui défile, pas de bouton clavier
  dans les cases sur écran tactile.
- **Prochaine action** : merger #2358 (CI verte) ; puis essais iPhone de David (#2287, #2297, 2-330, 2-446 ;
  #2353 et #2358 après `deploy:prod`), notés dans `verifications-manuelles.md` ; puis verser le chantier.
- **En attente de David** : juger au doigt les 88 px qui défilent encore (deux racines) ; un tableau à
  une racine devrait tenir (non mesuré).
- **Pièges en cours** : `delay` n'est plus une garde d'`update-published-questions.ts` ; Chrome n'atteint
  pas `localhost` → Playwright (`devices['iPhone 13']` = `pointer: coarse`) ; worktree neuf →
  `svelte-kit sync` ; lire `question_templates` en pages (plafond 1000 lignes).
- **Worktree / branche** : `../ubumaths-wt-tableau-signes` · `fix/tableau-signes-mobile`.

---

## Existant (2026-11-02)

- Bloc ` ```variation ` : `domain:`, lignes `sign:` (une ou plusieurs), marques `z`, `||`, `|h|`, `d` ; parseur
  `src/lib/ubumark/parser/variation-table-parser.ts`, rendu `VariationTable.svelte`, PDF `variation-table-typst.ts`.
- Cases dans un tableau markdown (`| $?$ |`) : chantier `trous-dans-tableau`, livré. Pas dans ` ```variation `.
- 2de : « cases sous le tableau » en attendant l'outil (`questions-2de` l. 214-220).
- Modèle à suivre : ` ```operation ` (réponse attendue tirée du bloc, jamais écrite dans `blanks`).

## Phase 0 (validée par David le 2026-11-02 : « je suis tes recos »)

**Nominal**

1. L'auteur écrit le tableau **juste** et préfixe d'un `?` chaque cellule cachée : `domain: -inf, ?-3, 2, +inf`,
   `-inf,-3: ?-`, `-3: ?z`. Réponse attendue tirée du bloc ; rien dans `blanks`.
2. Cachables : **valeur de x** (hors ±∞), **signe**, **marque** (0, double barre, rien).
3. Saisie : valeur de x = petite case MathLive dans la cellule ; signe = deux boutons + / − au toucher ;
   marque = choix 0 / ‖ / rien. Utilisable au doigt à 390 px.
4. Chaque cellule cachée = **une case**, jugée seule, numérotée dans l'ordre de lecture ; valeur de x jugée par
   équivalence (`3/2` = `1,5`).
5. Corrigé : cellules fausses marquées, bonne valeur dans la cellule. Fiche PDF : cellule vide à l'énoncé, remplie au
   corrigé.
6. Page à cocher : cellules cachées dessinées ; `question:specs` les accepte.

**Limite**

7. Plusieurs lignes `sign:` (produit, quotient) : n'importe quelle cellule de n'importe quelle ligne.
8. Tableau sans `?` : rendu inchangé (écran, PDF).
9. `?` devant une valeur tirée de variables (`?{{r}}`).

**Erreur**

10. `?` sur ±∞, une étiquette de ligne ou une ligne `variation:` → échec de génération, message situé.
11. Réponse écrite dans `blanks` pour une cellule du tableau → refusée (comme `operation`).

**Décisions** : Q1 tableau de **signes** d'abord ; tableau de variations = suite du même chantier. Q2 valeurs de x,
signes, marques (pas les étiquettes). Q3 syntaxe `?` devant la valeur. Q4 une case par cellule. Q5 tableau construit
entièrement par l'élève (nombre de colonnes) : hors chantier.

**Q6 (David, 2026-11-02, « je valide »)** : après l'outil, **réécrire 330 et 446** (tableau de signes d'un produit /
quotient : le tableau EST la compétence) ; **laisser** 268, 426, 337, 449-451 (réponse = ensemble de solutions ou signe).

## Plan technique (pedagogy-expert, 2026-11-02)

- **AST** : `SignValue` et `VariationMarker` inchangés (unions lues partout en `sign | marker`) ; ajouts
  `DomainPoint.hidden`, `cases?: HiddenCell[]` (`{ index, row, key, kind: valeur|signe|marque, answer }`, ordre de
  LECTURE — domaine, puis lignes `sign:` par colonne, pas l'ordre de la `Map`), `caseIndex` (ligne `case: N` posée par le
  générateur), `source` brut. `values` garde la vraie valeur (corrigé, page à cocher).
- **Indexation** : marquage calqué sur `markBuildBlocks` (plusieurs cases par bloc), blocs délimités par
  `findVariationBlocks` ; `variationBlanks` ; valeur = case `math`, signe/marque = `text` + `InstanceBlank.cellule`.
- **Jugement** : signe/marque en égalité exacte (comme `ranger`), avant `isChoiceBlank` ; « rien » = jeton `rien`
  (une case vide est `empty`) ; `0` ramené à `z`. Valeur : juge ordinaire — vérifier `1,5` contre `\frac{3}{2}`.
- **Évaluation notée (risque)** : l'énoncé envoyé contient les réponses, les CLÉS d'intervalles aussi
  (`-inf,-3`) → masquage dans `masked-statement.ts` (`??n` pour une valeur, `?` seul pour signe/marque) +
  `findUnmaskedAnswers` ; refusés dans un modèle.
- **Corrigé** : nouvelle `ExpectedLine` `sign-table` (sinon une ligne `expected-only` par case) ; Typst
  `hiddenCells: blank|filled` ; éditeur riche : importer depuis `node.source` (`convertVariationTable` perdrait les `?`).
- **PR** : 1 ubumark (AST, parseur, éditeur, Typst) · 2 génération, jugement, masquage (revue Opus + `security-auditor`)
  · 3 saisie (`VariationTable.svelte`, `FillBlanksInput.svelte`) · 4 corrigé, page à cocher, testSpecs. Docs :
  `ubumark.md`, `questions.md`, `fiches-exercices.md`, `outils-manquants.md`.
- **Pièges** : décimal `?1,5` coupé aux virgules du domaine (écrire une fraction) ; messages d'erreur du parseur en
  anglais (« Unknown sign value ») → messages français situés.
- **Tranché (David, 2026-11-02, « je valide »)** : (a) marque « rien » cachée = `?rien` ; (b) `?|h|`, `?d`, signe
  caché sur un point → refusés avec message.

## PR 1 — ubumark (2026-11-02)

Commit 09feb3888 : AST (`hidden`, `HiddenCell`, `cases`, `caseIndex`, `source`), parseur (`?`, `??n`, `case: N`, ordre
de lecture, 9 refus en français « Ligne N : »), Typst `hiddenCells`, éditeur riche depuis `source`. 29 tests (25 rouges
avant) ; `test:server src/lib/ubumark src/lib/components/rich-text` 6333 verts ; `check:incremental` 0. Refus = nœud
nul (bloc rendu en source). PDF compilé par le compilateur de prod (`compile-prod.mjs`, fiche d'essai du scratchpad) :
valeurs et signes cachés = case vide bordée ; marque cachée = trait nu, sans « 0 » — pas de fuite (vartable trace un
trait à chaque colonne), mais pas de repère « à compléter » (piège ci-dessus).

Revue (`code-reviewer` Sonnet) : `?` refusé partout dans une étiquette ou une valeur `variation:` → refusé seulement en
tête (régression évitée) ; valeur de x répétée avec cases → refusée ; `open: undefined` retiré. 6 tests (4 rouges).
CI verte, mergée (#2267).

## PR 2 — génération, jugement, masquage (2026-11-03)

Branche `feat/tableau-signes-generation`, worktree `../ubumaths-wt-tableau-signes`.

- Repérage : `findVariationsToFill` (parseur ; seul le préfixe de la fence est retiré, le retrait des
  cellules compte) ; `markVariationBlocks` (`assign-blank-indices.ts`) → `variationBlanks` (texte, rang
  de la cellule), `variationErrors` (bloc cité / en liste / dans un choix, non fermé). Valeur = case
  `math`, signe/marque = `text`.
- Génération : `questions/sign-table-case.ts` (`readSignTableCases`) ; `InstanceBlank.cellule` ; refus :
  parseur (« Ligne N : »), `case:` écrit, `??n` / `?` seul, ordre indifférent, réponse dans `blanks`,
  bloc illisible à l'écran. `template-validator` : tableau à compléter sans `blanks[]` accepté.
- Juge : signe/marque `isSignCellCorrect` (jeton, `0` = `z`, vide jamais juste) ; valeur : juge ordinaire
  avec **`acceptDecimal` forcé** — sans lui, `1,5` contre `\frac{3}{2}` = `bad_form` (piège vérifié).
  `3/2` en texte brut reste `bad_form` (MathLive écrit `\frac`).
- Masquage : `maskVariation` (`??n` dans `domain:` et dans les clés de TOUTES les lignes, `?` seul pour
  signe/marque) ; garde `findUnmaskedAnswers` → `variation` si une case a une réponse ou une clé hors du
  domaine. Parseur : clé `??n` acceptée dans une ligne `variation:` (refusée avant).
- Lecteurs des cases de bloc mis à jour : `choice-case-editor`, `choice-answer-count`, `figure-name-check`.
  ⚠️ Écart vu, hors périmètre : `choice-answer-count` et `figure-name-check` ignorent déjà `buildBlanks`.
- Tests : `generation-tableau-signes.test.ts` (24, rouges avant), parseur +1 ; suites `questions`,
  `ubumark`, `utils`, `rich-text`, `worksheets` : 14 339 verts ; `check:incremental` 0.
- Rien de visible pour l'élève tant que la PR 3 (saisie) n'est pas là : ne pas écrire de modèle avant.
- Revues : `security-auditor` sans bloquant ; 3 fuites de forme fermées par refus d'auteur (valeur cachée
  écrite `f(-3)` dans une ligne `variation:`, toute erreur d'un bloc à cases — domaine répété, ligne
  libre —, cellule écrite deux fois). Non traité (au modèle de l'éviter) : déduction par un 2e tableau,
  par `||` d'une ligne `variation:`, par l'étiquette `sign: x+3`. `code-reviewer` Opus : une valeur de x
  héritait de `blankDefaults` (`answerKind: 'intervalles'` → `-3` jugé faux) → case de tableau construite
  à part, sans héritage. ⚠️ Cas frère non vérifié : les cases ```operation suivent le chemin d'héritage.

## PR 3 — saisie (2026-11-03)

Branche `feat/tableau-signes-saisie`, worktree `../ubumaths-wt-tableau-signes`.

- **Tranché (David, 2026-11-03)** : signe / marque = **case + menu** (une case en pointillés, un toucher
  ouvre juste dessous + / −, ou 0 / ‖ / rien) plutôt que des boutons posés dans la cellule : le tableau
  garde sa taille à 390 px. Au clavier : `+` `-` `0` `z` `|` `r`, Retour arrière vide.
- `VariationTable.svelte` : cellule cachée **vide par défaut** (`hiddenCells: 'blank'`) — un renderer
  ordinaire ne montre jamais la réponse ; `'filled'` (éditeur riche, bonne réponse) ; snippet `cell`
  pour la saisie. Lignes de signes repérées par leur rang dans `rows`.
- `SignCellPicker.svelte` (Popover bits-ui) : jetons `+` `-` `z` `||` `rien`, `data-etat` juste/fausse,
  libellé « Case N : signe, moins, fausse ».
- `FillBlanksInput.svelte` : valeur de x = `MathPrompt` `\placeholder[N]{}` ; signe / marque dans un
  `data-construire-case` (Entrée → première case vide). Flash : vide ; bonne réponse : rempli.
- Tests : `FillBlanksInput-tableau-signes` (14), `VariationTable-cases` (4), énoncé masqué +1 (même
  écran, ids `bits-cN` normalisés).
- Revue (`code-reviewer` Sonnet) : rien de bloquant. Corrigés : bonne réponse lue dans `blanks` (énoncé masqué
  → cases vides sinon), `onkeydown` de bits-ui gardé, `aria-label` « à compléter », 0 en graisse normale.
  Laissés : case ≈ 35 px (menu 44 px), pas de position dans le libellé (elle donnerait la valeur cachée),
  Entrée sur une case signe ouvre le menu. Vu au clic dans Chrome ; 390 px non vérifiable (fenêtre bloquée
  à 1568 px). CI verte, mergée (#2287).

## PR 4 — corrigé, série PDF, page à cocher (2026-11-03)

Branche `feat/tableau-signes-corrige`, worktree `../ubumaths-wt-tableau-signes`.

- **Corrigé** : `ExpectedLine` `sign-table` (`expected-result.ts`) — le bloc sort de l'énoncé rempli
  (`withoutSignTableCases`, aussi dans `instructionOf`), une ligne par tableau : `source` sans `case:`,
  `cells` (case, nature, attendu lu dans `blanks`, réponse de l'élève — jeton pour signe/marque, `0` → `z`,
  sinon texte neutralisé —, statut). Tableau juste / forme à améliorer / faux ; tout vide → « Tu n'as rien
  rempli dans le tableau. ». Écran : `SignTableAnswer.svelte` (cellule fausse barrée, bonne valeur
  dessous ; vide : bonne valeur en pointillés ; libellé `sr-only` « Case 2, ta réponse : moins, faux,
  attendu : plus »). Vue concise de la carte : rien (comme une case à construire) → détaillée.
- **Série d'automatismes (PDF)** : chaque cellule cachée compte pour une case ; énoncé = bloc sans
  `case:` (cellules vides) ; corrigé = `revealVariationBody` (parseur) : bloc sans `?` ni `case:`,
  `?rien` → ligne retirée.
- **Page à cocher** : cellules cachées encadrées en pointillés (`vt-cache`), remplies de la réponse,
  « rien » écrit.
- **testSpecs** : déjà pris en charge (`question:specs` sur un modèle d'essai : 3/3 vertes, 5 tirages).
- **Repère PDF d'une marque cachée : non fait.** vartable 0.2.1 (source lue) ne dessine en un point
  qu'un trait, un « 0 » ou une double barre : aucun contenu libre. Reste le trait nu. Options : patcher
  vartable (paquet local), ou accepter le trait nu (usage courant des fiches). → David.
- **Cas frère ``operation / `blankDefaults`** : confirmé dans le code (cases d'opération et à
construire héritent d'`answerKind`, unité, précision, `requiredForm`), mais **aucun des 18 modèles
``operation de prod** n'a de `blankDefaults`, `requiredForm` ni précision (requête du 2026-11-03).
  Non corrigé (pas de cas réel).
- Vu en passant (hors périmètre) : `domain: ]a[, +inf` est mal découpé par le parseur (un seul point
  `a[, +inf`), avec ou sans `?`.
- Revue (`code-reviewer` Opus) : rien de bloquant ; corrigés : ordre de l'énoncé (case APRÈS le tableau :
  énoncé rempli découpé autour des tableaux, `statementPieces`), tableau tout vide sans « faux », remarques
  des cases gardées, `(?-3` révélé, cellule retrouvée par son numéro de case (repli `expected-only`), `Map`
  pour les jetons (`constructor`), plus de `title` doublon, fraction lue « 3 sur 2 », tableau illisible en
  liste, message d'erreur de série situé.
- Tests : `expected-result-tableau-signes` (12), `variation-table-reveal` (5), `SignTableAnswer` (7),
  `serie-automatismes-tableau-signes` (2), `page-a-cocher` +1 ; suites `questions`, `ubumark`,
  `worksheets`, `utils` : 14 053 verts ; client `components/questions`, `markdown`, `question-inputs` :
  1 065 verts (par dossier : la suite d'un bloc perd son navigateur, panne d'environnement) ;
  `check:incremental` 0.
- Vu dans Chrome : impossible (l'extension n'atteint pas `localhost:5177`, page d'erreur) ; serveur de la
  branche laissé sur 5177.

## Réécriture de 2-330 et 2-446 (2026-11-03)

Branche `feat/tableau-signes-modeles`, worktree `../ubumaths-wt-tableau-signes`.

- **Phase 0 validée par David** : variations « dresser » = **tout caché** (valeurs de x, 9 signes, 6 marques ;
  `?rien` là où un facteur ne s'annule pas : 17 cases), étiquettes données ; k(ax + b) = **trois lignes**
  (k, facteur, produit : 10 cases) ; « lire » = ligne du produit / quotient seule (5 cases) ; plus de case
  sous le tableau ni de `blanks` ; **180 s** (au lieu de 90) ; titre, catégorie, niveau, variables,
  conditions, corrigés inchangés.
- Prod relue (MCP) : f0163416 (2-330) et 9c7ab1c7 (2-446) **publiés** ; empreintes md5 de `variations`,
  `test_specs`, `shared` identiques aux fichiers du dépôt → instantanés construits depuis eux.
- Script `docs/wip/tableau-signes/reecrire-330-446.py` (source lue au commit 2d2343108) : le tableau du
  corrigé, préfixé de `?` → énoncé ; specs réécrites en cases (−b/a, ordre, signe de a seul, 0 du mauvais
  facteur, constante oubliée, 0 sous la valeur interdite, zéro et valeur interdite échangés, double barre
  dans la ligne du dénominateur, `0` tapé = `z`). Sorties : `scripts/questions/2de-signes-b/01`, `02` et
  `scripts/questions/2de-tableau-signes-existants/<id8>.json`.
- `update-published-questions.ts` : lot `tableau-signes-2de` ; **`delay` passe des champs figés aux champs
  écrits** (il était comparé, donc le 180 s aurait arrêté le script).
- `question:specs` : 17/17 et 10/10, 500/500 tirages. Preuve rouge (nouvelles specs, ancien contenu) :
  toutes les specs « correct » rouges (10/17 et 6/10 vertes = les « incorrect »).
- Base locale : `create-questions --publier --mettre-a-jour` (brouillons locaux 7bee0067, 39c39209).
- Revue (`code-reviewer` Sonnet) : specs recalculées à la main, toutes justes ; aucune fuite. Corrigés :
  9c7ab1c7 retiré du lot `textcolor-2de` (son instantané de 90 s, cases sous le tableau, aurait défait la
  réécriture, `delay` n'étant plus une garde) ; description d'une spec. ⚠️ `delay` n'est plus comparé pour
  aucun lot : relancer un ancien lot réécrit le temps de son instantané.
- Vu à 390 px (Playwright, Chrome n'atteint pas `localhost`) : tableau juste, mais 513 px pour 308 de place
  → défilement horizontal, +∞ hors écran ; cases de valeur 117 px (MathLive + bouton clavier). → David
  (à juger aux essais iPhone).
- **#2308 mergée** (CI verte), le 2026-11-03.
- **Écrit en prod par David** (`--lot tableau-signes-2de --publier`, 2026-11-03) après simulation (17 et 10
  specs vertes ; preuve rouge 10/17 et 6/10 sur l'ancien contenu). MCP : f0163416 et 9c7ab1c7 `published`,
  niveaux 3 et 4, `delay` 180, 6 et 4 variations à tableau à compléter, aucune `blanks`, 17 et 10 specs.

## Page à cocher (2026-11-03)

- `page-a-cocher.ts` sur 01 et 02 de `2de-signes-b` (copiés seuls dans le scratchpad), base prod : 2 fiches,
  aucune alerte. Artefact `76pRvYk72EuRYtV9nto4Ly` (capacité `db`).
- À 390 px, `table.vt` débordait (442 px, page entière qui défile) : corrigé dans la page publiée
  (`display: block; width: fit-content; max-width: 100%; overflow-x: auto`), pas encore dans le gabarit.
- Relue par David : **2/2 OK**, sans commentaire (collection `verdicts` lue).
- Vu en passant : le corrigé de 2-330 écrit « −1x − 3 = 0 » et « 1x − 3 = 0 » (étape 2). → David.
- David valide (2026-11-03) : « 1x » à corriger (diagnostic d'abord : moteur ou contenu), PR du gabarit,
  défilement jugé aux essais iPhone.

## PR — gabarit de la page à cocher (2026-11-03)

- `.vt` en `display: block; width: fit-content; max-width: 100%; overflow-x: auto` : seul le tableau défile.
  Page régénérée (2 fiches) : 390 px → page à 390 px, 18 tableaux sur 20 défilent dedans ; 1280 px → aucun.
  Test `page-a-cocher` : 63 verts. Revue : aucune (CSS, < 30 lignes).
- **#2335 mergée** (CI verte), le 2026-11-03.

## PR — `cleanCoefficients` et formules à liens logiques (2026-11-03)

- Cause du « −1x − 3 = 0 » du corrigé de 2-330 : `$-1x-3=0\iff x=-3$` ne se lit pas en entier (`\iff`),
  `customToLatex` rend `null`, la formule reste brute ; chaque morceau, lui, se lit.
- Correctif (`content-resolver.ts`, `cleanLogicalPieces`) : découpe sur `\iff`, `\Leftrightarrow`,
  `\Longleftrightarrow`, `\implies`, `\Rightarrow`, `\Longrightarrow` ; morceau nettoyé seulement s'il a
  un chiffre et si le rendu nettoyé diffère du rendu brut ; sinon à l'octet près. Option absente : rien.
- Tests : 8 dans `content-resolver.test.ts` (rouges d'abord : 5/7) ; `src/lib/questions` 6091 verts ;
  `check:incremental` 0 ; cliquet tenu. Doc : `docs/systeme/questions.md` (piège 11).
- Avant/après sur la prod (script scratchpad `avant-apres.mts`, même graine, 1875 publiés lus en pages) :
  33 modèles, 912 tirages → 15 changent, dans 2 modèles (2-330 ; « Fonction affine : variations, signe et
  droite »), tous des « 1x » corrigés. Première version : `(E)\iff y'=…` → `E\iff …` (règle des
  parenthèses) → garde « au moins un chiffre ».
- Revue `code-reviewer` Opus : rien de bloquant (47 formules sondées) ; intégrés : doc (6 liens, pas 4),
  3 tests (`\Rightarrow`/`\Long…`, `$$` multi-lignes, marqueur `<<expr:expressionA>>`).
- Conflit du journal avec `main` (mon commit de #2335) : la CI ne démarrait pas ; fusion de `origin/main`,
  les deux côtés gardés. **#2338 mergée** (CI verte, 16 checks), le 2026-11-03.

## PR — tableau à compléter au téléphone (2026-11-04)

- Mesure d'abord (Playwright, iPhone 13, base locale, brouillon 7bee0067 = 2-330, CSS injecté) : 565 px
  pour 308 ; bouton clavier de chaque case de valeur = 64 px (case 124 px) ; sans lui 437 ; marges de
  moitié 412. Cases de signe 31 px : pas plus petit (Apple conseille 44). Toucher la case sans bouton
  ouvre le clavier (« Fermer le clavier » de #2353 présent).
- David : « lance la PR ». `VariationTable.svelte` : `pointer: coarse` → plus de
  `virtual-keyboard-toggle` dans `.vt-case` ; ≤ 30rem et `:has(.vt-case)` → `--vt-cell-padding: 0.25em`,
  math-field `padding: 2px 4px` ; défilement dans `.vt-defilement`, ombres `data-deborde-gauche/droite`
  (attachement `watchOverflow` : scroll + ResizeObserver). Ombre gauche ajoutée en plus de la droite.
- Tests : `VariationTable-telephone.svelte.test.ts`, 6, rouges d'abord (5/6) ; 11 fichiers qui montent
  le tableau : 95 verts. Rendu réel après : 396 px, ombre droite puis gauche, ordinateur inchangé.
- **#2358 ouverte**.
