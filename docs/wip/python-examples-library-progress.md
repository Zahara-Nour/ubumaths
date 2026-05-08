# Python Examples Library — progression

## Statut : Phase 2 terminée — Phase 3 à démarrer

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
