# Python Examples Library — progression

## Statut : Phase 1 en cours

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

_(à compléter au fur et à mesure)_
