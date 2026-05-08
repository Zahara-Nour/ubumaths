# Python Examples Library — progression

## Statut : Phase 4 terminée — Phase 5 (QA navigateur) à démarrer

## Objectif

Ajouter une bibliothèque d'exemples Python statiques (read-only) accessible via le bouton "Ouvrir un fichier" du Python playground, en complément de "Mes fichiers".

## Décisions actées

- Stockage : fichier statique TS + `.py` importés via Vite `?raw` (pas de DB)
- 30 exemples au lot initial, 9 catégories
- Niveaux via tags : `college`, `lycee`, `nsi`, `superieur`
- UI : nouvel onglet dans `PythonFileManager.svelte`, layout split (liste + aperçu)
- Confirmation modale si éditeur a des modifications non sauvegardées
- Tests : schéma Zod + filtre/recherche

## Phases

1. **Schéma + utils** (en cours) — `types.ts`, `utils.ts`, tests TDD
2. Authoring 30 exemples
3. UI onglet Bibliothèque
4. Loading + modal de confirmation
5. Quality checks final

## Fichiers modifiés / créés

### Phase 1 (commit 259bfa1c2)

- `src/lib/data/python-examples/types.ts` — schéma + Zod
- `src/lib/data/python-examples/utils.ts` — filterExamples, getAllTagsFromExamples, validateExamples, groupByCategory
- `src/lib/data/python-examples/utils.test.ts` — 20 tests

### Phase 2

- `src/lib/data/python-examples/files/{bases,fonctions,oop,strings,exceptions,io,maths,visualisation,algorithmes}/*.py` — 30 fichiers .py
- `src/lib/data/python-examples/index.ts` — catalogue avec imports `?raw` + métadonnées
- `src/lib/data/python-examples/index.test.ts` — validation runtime du catalogue (4 tests)

### Phase 3

- `src/lib/components/python/library/LibraryBrowser.svelte` — UI bibliothèque (search + chips + split list/preview)
- `src/lib/components/python/PythonFileManager.svelte` — onglet "Bibliothèque" ajouté, dialog élargi à `sm:max-w-4xl`
- `src/lib/stores/pythonPlayground.svelte.ts` — méthode `loadExample(code)` ajoutée
- `src/lib/data/python-examples/utils.ts` — `filterExamples` étend la recherche aux tags
- `src/lib/data/python-examples/utils.test.ts` — +1 test (recherche par tag)

### Phase 4

- `src/lib/components/python/PythonFileManager.svelte` :
  - `handleLoadExample` checke `pythonStore.isModified` → confirmation modale via ConfirmDialog
  - State `pendingExample` + `confirmLoadOpen`
  - `$effect` qui clear `pendingExample` quand le dialog se ferme par n'importe quel chemin (X, Escape, overlay)
  - Garde anti double-click sur "Charger"
- `src/lib/components/python/library/LibraryBrowser.svelte` : bandeau "Aperçu — lecture seule" + `aria-readonly` sur le `<pre>`
