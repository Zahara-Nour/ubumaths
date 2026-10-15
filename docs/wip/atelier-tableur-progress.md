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
