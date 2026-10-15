# Atelier — tableur intégré : journal du chantier

Phase 0 validée : [atelier-tableur-phase0.md](atelier-tableur-phase0.md) (option C ; Q1-Q5, T1-T9,
P1-P2 décidées le 2026-10-15).

## PR 1 du lot 1 — le modèle et la grille simple (`feat/atelier-grille-modele`)

Worktree `../ubumaths-wt-tableur`.

### Choix de construction (défauts de Claude, dans le cadre de la phase 0)

- **Un seul propriétaire par cellule.** Une colonne NOMMÉE garde ses cellules dans la définition de
  sa liste : une entrée par ligne (`12 ; ; 15` = ligne 2 vide), cases vides finales retirées. Les
  colonnes sans nom gardent les leurs dans la grille de l'`Atelier`. Nommer une colonne y crée la
  liste avec ses cellules ; retirer le nom les rend à la grille.
- Conséquence : sauvegarde, lien, fusion, suppression en cascade et son « Annuler », `L = …`,
  `.simuler`, `.filtrer` gardent leur chemin ; la liste porte en plus sa colonne (`column`).
- **Format rangé en version 2** : la colonne des listes, les cellules des colonnes sans nom. Une
  version 1 se relit (listes placées en A, B… dans l'ordre des cartes). Sans la version 2, un
  onglet resté sur l'ancien code relirait l'état en jetant la grille, puis l'enregistrerait.
- Une entrée vide n'est plus comptée « valeur ignorée » (`12 ; ; 15` : 0 ignorée) : c'est une case
  vide. Un `;` final ne l'était pas non plus de façon voulue.

### Avancement

- [x] tests du modèle (rouges : module absent ; case vide prouvée rouge sans le correctif de lecture)
- [x] modèle (grid.ts, Atelier : colonnes, cellules sans nom, nommer / retirer le nom, v2, fusion T7)
- [x] vue Données en grille (28 tests navigateur ; captures Playwright 1280 et 390 px)
- [x] refus de `A2` dans Calcul (sur un calcul qui échoue seulement)
- [x] doc système (atelier.md : section « La grille », v2, fusion, invariant 13)

### Constats en route (hors périmètre)

- Téléphone (390 px) : le haut de l'atelier se chevauche (« Mes objets », « Partager… », onglets,
  boutons de création) — déjà vrai dans la vue Calcul, avant ce chantier.
- `pnpm test:client src/lib/atelier src/lib/components/atelier` d'un seul coup : le navigateur de
  test se ferme en route (« rpc is closed »), 8 à 13 fichiers jamais lancés ; en deux lots, 51/51.

## PR 2 du lot 1 — coller, copier, CSV, titres (`feat/atelier-grille-coller`)

- [x] tests rouges (modèle : `grille-coller.test.ts` ; vue : 9 tests dans `DataView.svelte.test.ts`)
- [x] `readTable` (tabulations, « ; » multiligne, guillemets d'Excel), `hasTitleRow`, `exportText`
      (décimal à virgule, apostrophe devant `=+-@` : injection de formule), `tableText`, `csvText`
- [x] `Atelier.pasteTable` (tout ou rien, refus avec la taille), `titleOf` / `setTitle` ; titres
      rangés (`grid.titles`), suivent la fusion ; supprimer une liste vide son titre (T3)
- [x] vue : zone (Maj + flèche, Maj + clic, glisser), Suppr sur la zone, Ctrl/⌘+C et V par un
      relais hors écran (Safari), titre dans l'en-tête, « Télécharger en CSV », note sur `=`
      (oubli de la PR 1, phase 0 §lot 1)
- [x] vrai presse-papiers de Chromium éprouvé (Ctrl+C puis Ctrl+V au clavier) ; capture Playwright
- [x] revue (code-reviewer) : 8 findings corrigés, test rouge d'abord — **bloquant** : la frappe était
      perdue en cliquant ailleurs (`pointerdown` passe avant le `blur`) ; coller dans la barre
      remplaçait la cellule ; « 3;4 » collé devenait le nombre 3,4 ; copier-coller interne perdait
      l'exactitude (`1/3` → `0,333…`, type `application/x-chiphre-grille`) ; guillemet non fermé ;
      lignes vides d'un tableau de page web ; relais coincé (Ctrl sur Mac) ; titre collé tronqué.
- ⚠️ Le hook pre-commit (`oxlint --fix`, `unicorn/no-useless-spread`) a réécrit `[...bytes.slice()]`
  en `bytes.slice()` dans un test, qui comparait alors un `Uint8Array` à un tableau : relancer les
  tests APRÈS le commit.

## PR 3a du lot 1 — annuler dans la grille, T6 (`feat/atelier-grille-annuler`)

La PR 3 est coupée en deux : 3a (annuler), 3b (appariement par ligne, P1 — une dizaine de
consommateurs : nuage, ajustement dans la carte ET `.ajustement L : M` dans Calcul, effectifs,
diagramme avec effectifs, tableau croisé, `.simuler` ; `.filtrer` et `.croiser` refusent déjà une
liste trouée en citant l'entrée).

- [x] tests rouges : `grille-annuler.test.ts` (11), 3 tests de vue
- [x] `undoGrid` / `redoGrid`, gestes groupés (`#grouped` : un collage = cases + titres), refus si
      une case a changé ailleurs, historique oublié à la relecture, `MAX_GRID_UNDO` = 100
- [x] vue : Ctrl/⌘+Z, Ctrl/⌘+Maj+Z, Ctrl+Y ; boutons ; le geste s'arrête à la cellule (sinon
      l'atelier tentait aussi d'annuler la dernière suppression de carte — test prouvé rouge sans)
- [x] revue : 2 findings corrigés, tests rouges d'abord — **important** : annuler un geste de grille
      plus ancien qu'une suppression de carte rendait la suppression impossible à annuler (objets
      perdus) → une suppression ferme l'historique de la grille, et Ctrl+Z ne s'arrête à la grille
      que si elle a de quoi annuler ; mineur : une case écrite deux fois dans un geste.

## PR 3b du lot 1 — deux colonnes appariées par ligne, P1 (`feat/atelier-grille-lignes`)

- [x] tests rouges : `grille-lignes.test.ts` (11) + 1 test de vue (note sous le diagramme)
- [x] `ListObject.rows` (ligne de chaque valeur, lue par `parseDefinition`) ; `pairs.ts`
      (`commonRows`, `valuesOn`, `categoriesOn`, `droppedNote`, `firstMismatch`, `lawMismatchMessage`)
- [x] par ligne + « N lignes incomplètes écartées » : nuage (desk + plot-sync), ajustement (carte et
      `.ajustement L : M` dans Calcul, enveloppe `withListsByRow`), effectifs (desk, diagramme,
      raison de la carte), `.croiser` ; refus seulement sans ligne commune
- [x] loi (`lawFractions`, action « Loi avec probabilités ») : refus qui cite la ligne incomplète
- [x] 8 tests existants décrivaient la règle « même longueur » (croiser, filtrer→croiser, loi,
      simuler, effectifs, nuage) : réécrits vers P1, avec le motif dans le test
- ⚠️ Incident : un `commit --allow-empty` raté puis `reset --soft HEAD~1` a reculé la branche d'un
  commit de main ; pointeur remis sur `origin/main` (`reset --soft`), rien perdu, dit à David.
- [x] revue : 6 findings corrigés, tests rouges d'abord — **importants** : `.stats L ; M` (réunion de
      deux séries) perdait des valeurs → seule la forme `A : B` s'apparie ; `.croiser` proposait une
      piste `.filtrer` refusée ensuite → piste masquée quand une ligne est écartée. Mineurs : raison
      du bouton « Loi » = celle de la commande ; nuage / ajustement / diagramme sans ligne commune
      → « L et M n’ont aucune ligne remplie en commun. » (bouton et clic) ; écho de Calcul rétabli ;
      deux JSDoc remises au-dessus de leur fonction.

## Lot 2 — les formules (phase 0 : `atelier-tableur-lot2-phase0.md`, validée le 2026-10-15)

### PR 1 — le moteur de formules (`feat/atelier-formules-moteur`)

- [x] tests rouges : `formules.test.ts` (41, dont l'oracle « même réponse que Calcul » sur 17
      expressions), 3 tests de vue
- [x] `formula.ts` : références marquées `ω_k` (sonde : `ω_12` se lit comme une variable indicée),
      `computeGrid` (profondeur, cycles, repli ≈ après 20 ms, refus en français), `plainValue`
- [x] `engine.ts` : `gridContext` (liaisons préparées une fois par recalcul)
- [x] `Atelier` : `cellValue`, `#recomputeGrid` (empreinte), listes à formules (`#formulaList`,
      `formulaErrors`), T2 dans `update`, `=a2` → `=A2`, pas de P2 après `=`
- [x] vue minimale : valeur dans la case, mot d'erreur, phrase sous la barre ; copie externe et CSV =
      valeurs (l'écriture mathématique et la carte d'une liste à formules : PR 2)
- Choix de construction : graphe de dépendances écrit dans `formula.ts` (parcours en profondeur,
  ~30 lignes) plutôt que celui du tableur du prof — le reprendre aurait demandé de modifier
  `src/lib/spreadsheet/` ; écart avec la phrase de la phase 0, sans effet sur le comportement.
- [x] revue : 1 bloquant, 3 importants, mineurs — corrigés, tests rouges d'abord. **Bloquant** :
      `=2^A1`, `=1,05^A2` montraient « ω n’est pas défini » (la marque s'accrochait à
      l'exposant) → marque `(ω_k)`, `2^-A1` réécrit. Importants : `=f(b)` passait le contrôle
      d'intervalle → contrôle après les valeurs de l'atelier ; intérêts composés recopiés gelaient
      l'onglet → valeur exacte > 24 caractères citée en décimal ; recalcul de toute la grille à
      chaque changement → recalcul ciblé (`GridState`, `lastGridComputed`). Mineurs : `\pi` /
      `sqrt` jamais affichés (≈ en attendant la PR 2), `1e5`, messages (non réel, logarithme,
      unité, rang de suite, `f′`), terme de récurrence marqué approché.
- ⚠️ Un test qui gèle (le cas des intérêts composés avant correctif) bloque toute la suite :
  lancer `test:server` avec une garde de temps et tuer les vitest orphelins du worktree.

### PR 2 — l'affichage (`feat/atelier-formules-affichage`)

- [x] tests rouges : 4 de modèle (`latex`, `exactLatex`, `citingCells`), 4 de vue
- [x] case en écriture mathématique (MathLive, `isSafeLatex`, cache), étiquette lue en français ;
      « Valeur exacte » sous la barre ; carte d'une liste à formules (valeurs, « calculée dans la
      grille ») ; confirmation de suppression d'une liste citée par des cellules
- [x] capture Playwright : `2/3` en fraction, `2√2`, `3π`, `≈ 0,1429` + valeur exacte, « erreur »
- [x] revue : 4 mineurs corrigés (cache du rendu borné ; « Valeur exacte » aussi pour `√2`, `π`,
      dont le texte lu est `≈` ; la confirmation compte les cases qui se videront, en chaîne,
      sans celles déjà vides ; la carte écrit les valeurs comme la grille, `1/3`, « erreur »).
- ⚠️ Incident : l'agent de revue a lancé `pnpm` dans une copie liée au `node_modules` du worktree
  et y a installé ~160 paquets hors lockfile. Réparé avec l'accord de David
  (`pnpm install --frozen-lockfile --prefer-offline --force` : sans `--force`, pnpm se croyait à
  jour) ; liens de premier niveau comparés à ceux du dépôt principal : identiques. Consigne aux
  revues : sonde dans une copie SANS lien vers `node_modules`.

### PR 3 — recopier (`feat/atelier-formules-recopie`)

- [x] tests rouges : `formules-recopie.test.ts` (13), 6 de vue
- [x] `shiftFormula`, `fillDown`, `pasteTable(…, origin)`, presse-papiers `{ origin, cells }`,
      Ctrl/⌘+D, poignée, « Recopier vers le bas… » ; `toRelative` / `fromRelativeText` pour le
      lien ; `remapColumns` pour un atelier reçu
- [x] **trouvé en route** : une formule à « ; » (`=max(1 ; A1)`) dans une colonne NOMMÉE était coupée
      en deux cases (la définition d'une liste sépare ses entrées par « ; ») → `FORMULA_SEMICOLON`
- [x] capture : la poignée tirée jusqu'à la ligne 8 recopie deux colonnes ; les fractions en maths
      débordaient de la ligne → un nombre exact s'écrit en texte, les maths seulement avec des lettres
- [x] revue (2 importants, 4 mineurs, tous corrigés test rouge d'abord) : formule à « ; » d'une
      cellule SANS nom perdue au stockage et dans le lien (`storedCellText`) ; un objet renommé à
      l'arrivée suivi dans les formules reçues (`=f(3)` calculait avec la f locale) ; un texte `{0:1}`
      réécrit par le lien ; poignée relâchée hors fenêtre ou `pointercancel` ; Ctrl/⌘+D pendant la
      frappe (favoris) ; origine du presse-papiers bornée par Zod

## Lot 3 — Tabuler (phase 0 : `atelier-tableur-lot3-phase0.md`, VALIDÉE le 2026-10-15)

- [x] lot 2 complet : #1421, #1422, #1424 mergées
- [x] phase 0 rédigée : Q-L3-1 à Q-L3-5 posées à David (mesuré : abscisses en fractions, `-3/2`)
- [x] validation de David (« ok » : les cinq recos)

### PR 1 — modèle, `.tabuler`, affichage décimal (`feat/atelier-tabuler`)

- [x] tests rouges : `tabuler.test.ts` (31) ; 2 de vue (« Valeur exacte » d'un décimal fini)
- [x] `tabulate.ts` (`planTabulation`, `tabulationDefaults`, `readTabulationCommand`,
      `tabulateCommand`), `Atelier.tabulate` (un geste), `.tabuler` dans `SIMULATIONS`
- [x] Q-L3-2 : `finiteDecimal` (entiers longs) dans `shownValue`, `shownExact` pour la barre ; deux
      attentes du lot 2 changées en connaissance de cause (`1/2` → `0,5`, `5/2` → `2,5`)
- [x] décor des exemples de commandes : `stageExampleSetup` (`f(x)` → une fonction)
- [x] 55 500 tests serveur, 290 + 318 navigateur, check, lint, cliquet, gardes de doc
- [x] revue (1 bloquant, 2 importants, 5 mineurs ; tous corrigés test rouge d'abord sauf le décor
      `stageExampleSetup`, gardé : l'aide transmet ce décor) : `=f_1(3)` donnait une valeur FAUSSE
      dans la grille (défaut du lot 2, `f₁ × 3`) → refus ; réciproque et fonction en attente
      refusées ; pas par défaut entier ; note écrite comme la case ; conseil qui garde le pas
- [ ] PR, CI, merge
- [x] PR 1 mergée : #1426

### PR 2 — la carte (`feat/atelier-tabuler-carte`)

- [x] tests rouges : `tabuler-carte.svelte.test.ts` (6), action câblée / grisée (`actions.test.ts`)
- [x] formulaire « de / à / pas » dans la carte, `handleTabulate`, `initialZone` de `DataView`
- [x] capture : formulaire, grille A1:B11 sélectionnée, −1,5 / 6,75 ; la phrase en `<p>` prenait la
      taille de `main p` → `<span>`
- [x] revue (2 importants, 3 mineurs, tous corrigés test rouge d'abord) : zone resélectionnée à
      chaque retour sur Données ; deux Entrée = deux tableaux (focus resté dans la carte) ;
      formulaire qui survivait à la carte refermée ; phrase périmée après Ctrl+Z ; double annonce
- [x] PR 2 mergée : #1427 — **lot 3 complet** (pas en prod)

## Lot 4 — les fonctions du tableur (phase 0 : `atelier-tableur-lot4-phase0.md`, VALIDÉE le 2026-10-15)

- [x] mesuré : `=C1:C2` vaut 0,6 en silence (`:` lu comme une division) ; aucun nom français lu ;
      ni guillemets ni comparaisons ; `=pi` lu `p × i`
- [x] phase 0 rédigée : Q-L4-1 à Q-L4-7 posées à David
- [x] validation de David (« je valide tes recos »)

### PR 1 — plages et statistiques (`feat/atelier-plages`)

- [x] tests rouges : `formules-tableur.test.ts` (40) ; 3 attentes du lot 2 en capitales (`MAX(`)
- [x] `grid-functions.ts` + couche dans `formula.ts` (`readBody`, `readCall`, `callValue`, `deps`)
- [x] **trouvé en route** : une somme de 200 cases levait une exception (garde de profondeur 100
      de mathAST) → arbres équilibrés + `safely` (une case ne fait jamais tomber la grille)
- [x] mesuré : 600 formules à plages 285 ms, recalcul complet 250 ms
- [x] revue (2 importants, 4 mineurs, tous corrigés test rouge d'abord) : `=a:b` (division) réécrit
      `=A:B` et refusé → `A:A` seulement en argument ; ECARTYPE en n² (750 ms) → moyenne une fois ;
      `=2SOMME(…)` ; case seule en argument = plage d'une case ; ligne 0 ; message qui cite sqrt…
- [ ] PR, CI, merge
