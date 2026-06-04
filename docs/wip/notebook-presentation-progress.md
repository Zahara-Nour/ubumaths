# Mode présentation notebook — progression

> Plan validé le 2026-06-04, auto-mode (CLAUDE.md auto-mode-progress-docs).

## Décisions techniques

1. **Layout** : `scaleContent: false` (déjà supporté nativement par `Deck.svelte`) — slide remplit le container, scroll natif, pas de transform CSS
2. **Pyodide** : nouveau contexte au mount du mode présentation (l'onglet édition n'est pas perturbé)
3. **Outputs** : affichage des outputs sauvegardés au load + re-exécution possible
4. **Fragments markdown** : activés (syntaxe `->` en fin de ligne)
5. **Annotation layer** : laissé activé en V1 (option `<Deck config={{ annotations: ... }}>`)

## Infrastructure réutilisée

- `$lib/slides` (UbuSlides) — Deck + Slide + UbuMarkSlide + Controls + Progress + keyboard/swipe + hash nav + transitions
- `MarkdownRenderer` (déjà utilisé par UbuMarkSlide et par MarkdownCell)
- `CodeCell` / `CheckpointCell` (réutilisés en lecture)
- `NotebookExecutor` — instancié pour la session présentation

## Phases

| Phase                            | Statut   | Fichiers                         |
| -------------------------------- | -------- | -------------------------------- |
| 1 — Route /present + load server | ✅       | `+page.server.ts`                |
| 2 — NotebookCodeSlide            | ✅       | `NotebookCodeSlide.svelte`       |
| 3 — NotebookCheckpointSlide      | ✅       | `NotebookCheckpointSlide.svelte` |
| 4 — Deck + mapping               | ✅       | `+page.svelte`                   |
| 5 — Bouton toolbar               | ✅       | `NotebookToolbar.svelte`         |
| 6 — Review + commit              | en cours | —                                |

## Code review — fixes appliqués

Le code-reviewer a relevé 3 points actionables :

1. **Esc double-trigger** — `<svelte:window onkeydown>` + Deck's keyboard action sur Escape. Fix : skip si `e.defaultPrevented` (le Deck consomme Escape pour exit overview).
2. **Empty notebook stuck loader** — `cells.length === 0` tombait dans la branche par défaut « Chargement… » ad vitam. Fix : branche `{:else if notebookLoaded && cells.length === 0}` avec message dédié.
3. **Naming `isInitialized` → `notebookLoaded`** — plus précis (le store est chargé, Pyodide peut encore charger en arrière-plan, géré par le pill du header).

Items polish non-corrigés en V1 :

- Cast `cell as CheckpointCell` ligne 121 — refactor du type union potentiellement large, reporté
- Reset kernel button dans header présentation — V2

## Quality checks finaux

- `pnpm check:incremental` : 1642 fichiers, 9/46 — **baseline maintenue**
- `svelte-autofixer` : 1 warning sur `goto()` sans `resolve()` (pattern existant dans les 2 autres routes notebook → cohérence projet)

## Comportements TDD validés

14 comportements listés dans la conversation. Tests manuels uniquement (le mode présentation est très UI-driven, les tests unitaires apportent peu).

## Fichiers attendus

```
src/routes/(protected)/python-notebook/[id]/present/
  +page.server.ts                            (nouveau)
  +page.svelte                               (nouveau)

src/lib/components/notebook/presentation/
  NotebookCodeSlide.svelte                   (nouveau)
  NotebookCheckpointSlide.svelte             (nouveau)

src/lib/components/notebook/
  NotebookToolbar.svelte                     (modifié — bouton)
```
