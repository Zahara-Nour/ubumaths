# Python Examples Library — progression

## Statut : Catalogue étendu à 100 exemples (extension v2)

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

## Extension v2 (2026-05-08) : 30 → 100 exemples

Catégorie `hasard` (nouvelle) ajoutée. Schéma étendu avec tags supplémentaires :
`graphe`, `arbre`, `complexite`, `match`, `decorateurs`, `generators`, `encapsulation`,
`simulation`, `3d`. 70 nouveaux fichiers `.py`.

| Catégorie              | v1     | Extension v2 | Total   |
| ---------------------- | ------ | ------------ | ------- |
| Bases                  | 8      | +9           | 17      |
| Fonctions              | 4      | +7           | 11      |
| OOP                    | 3      | +5           | 8       |
| Strings                | 2      | +5           | 7       |
| Exceptions             | 2      | +3           | 5       |
| I/O                    | 2      | +3           | 5       |
| Maths                  | 4      | +9           | 13      |
| Visualisation          | 3      | +6           | 9       |
| Algorithmes            | 2      | +12          | 14      |
| **Hasard** _(nouveau)_ | 0      | +11          | 11      |
| **Total**              | **30** | **+70**      | **100** |

## Récap commits

1. `259bfa1c2` — feat(python/examples): schema + filter utilities
2. `6a6a95a54` — feat(python/examples): 30 curated examples across 9 categories
3. `7c6f2e0f2` — feat(python/examples): library tab in PythonFileManager
4. `990a0c06a` — feat(python/examples): load with confirmation when editor is modified
5. `b0d1874e1` — feat(python/examples): replace plotly with scatter+regression example
6. `26b388183` — fix(python/output): drop misleading hardcoded module list in error
7. `641f961b3` — feat(python/examples): expand catalog to 100 examples + hasard category

## Tests

- 25 tests verts (`pnpm test:server src/lib/data/python-examples/`)
- `pnpm check:incremental` : pas de régression (mêmes 9 erreurs/46 warnings préexistantes)
- ESLint : propre sur tous les fichiers modifiés
- Svelte autofixer : aucune issue sur `LibraryBrowser.svelte` ni `PythonFileManager.svelte`

## À tester en navigateur (port 5175)

- [ ] Onglet "Bibliothèque" visible dans le dialog "Ouvrir un fichier"
- [ ] Recherche full-text fonctionne (titre, description, tag)
- [ ] Chips de tags toggleables (active/inactive en couleurs distinctes)
- [ ] Aperçu côté droit affiche bien le code de l'exemple sélectionné
- [ ] Bouton "Charger" sur un éditeur vide → chargement direct, dialog se ferme
- [ ] Bouton "Charger" avec code modifié → modal de confirmation, charge si confirmé, annule si refusé
- [ ] Modal de confirmation fermée par X/Escape → `pendingExample` clearé (pas de chargement fantôme)
- [ ] Onglet "Mes fichiers" toujours fonctionnel (régression)
- [ ] Onglet "Fichiers assignés" (pour élève) toujours fonctionnel (régression)
