# Python Debugger - Progression

## Statut actuel

**Phase** : 4 - Composants UI - Terminee
**Derniere mise a jour** : 2024-12-23

## Phases

| Phase  | Description                      | Statut     |
| ------ | -------------------------------- | ---------- |
| 1      | Types et Messages                | Termine    |
| 2      | Python Tracer (Worker)           | Termine    |
| 3      | Store et Executor                | Termine    |
| 4      | Composants UI                    | Termine    |
| 5      | Integration                      | En attente |
| 6      | Visualisation Heap (Optionnelle) | En attente |
| Finale | Quality Checks                   | En attente |

---

## Phase 1 : Types et Messages

### Fichiers crees

- [x] `src/lib/shared/python/debug/types.ts`
- [x] `src/lib/shared/python/debug/types.test.ts` (30 tests)
- [x] `messages.ts` modifie avec schemas debug
- [x] `messages.debug.test.ts` (53 tests)

### Decisions prises

- Types bases sur le plan approuve
- Schemas Zod suivent le pattern existant dans messages.ts
- DebugVariable avec serialisation JSON pour valeurs complexes

---

## Phase 2 : Python Tracer (Worker)

### Fichiers modifies/crees

- [x] `src/lib/workers/pyodide.worker.ts` - Tracer Python avec generateur
- [x] `src/lib/shared/python/types.ts` - Types messages debug
- [x] `src/lib/workers/pyodide.worker.debug.test.ts` (41 tests)
- [x] `docs/wip/debug-tracer-testing-guide.md` - Guide de test

### Decisions prises

- **Approche generateur** au lieu de sys.settrace()
- Serialisation des valeurs avec limites (depth=5, items=50, string=200)
- Execution statement-par-statement via AST

---

## Phase 3 : Store et Executor

### Fichiers crees

- [x] `src/lib/stores/pythonDebug.svelte.ts` - Store debug avec Svelte 5 runes
- [x] `src/lib/stores/pythonDebug.svelte.test.ts` (114 tests)

### Fichiers modifies

- [x] `src/lib/shared/python/execution/base-executor.svelte.ts`
  - Methodes debug : startDebugSession(), debugStep(), stopDebugSession()
  - Handlers : debug-snapshot, debug-paused, debug-finished
  - Hooks proteges pour sous-classes
- [x] `src/lib/shared/python/types.ts` - Types messages To/From worker
- [x] `src/lib/shared/python/index.ts` - Exports
- [x] `src/lib/shared/python/debug/types.ts` - Re-export WorkerBreakpoint

### Decisions prises

- Store singleton avec pattern classe (comme pythonPlayground.svelte.ts)
- Buffer circulaire pour snapshots (max 10 via DEBUG_CONFIG.MAX_HISTORY_SIZE)
- Machine a etats : idle -> running -> paused -> stepping -> finished -> idle
- Derived states : isDebugging, isPaused, canStepBack, currentSnapshot
- Breakpoints avec conditions optionnelles
- Cleanup explicite dans destroy()

### Tests

- 114 tests pour pythonDebug store
- Couvre : mode, breakpoints, snapshots, session state, derived states
- Tests client (Svelte runes) necessitent Playwright

---

## Phase 4 : Composants UI

### Fichiers crees

- [x] `src/lib/components/python/debug/DebugToolbar.svelte`
  - Mode switch Execute/Debug
  - Controles debug : Step, Step Over, Step Out, Continue, Run to End
  - Navigation historique : Step Back/Forward
  - Indicateur de statut (running, paused, finished)
- [x] `src/lib/components/python/debug/VariablesPanel.svelte`
  - Accordion pour variables locales/globales
  - Badges de type colores par categorie Python
  - Indicateurs de changement (jaune=modifie, vert=nouveau)
- [x] `src/lib/components/python/debug/CallStackPanel.svelte`
  - Affichage pile d'appels (bottom=oldest, top=current)
  - Indicateur frame courante avec fleche
  - Selection de frame pour inspection
- [x] `src/lib/components/python/debug/LoopIndicator.svelte`
  - Affichage boucles actives avec type (for/while)
  - Barre de progression si max iterations connu
  - Animation pulse pour while sans max
- [x] `src/lib/components/python/debug/DebugPanel.svelte`
  - Container combinant tous les panels
  - Header avec info pause/ligne courante
  - Layout responsive (grid 2 colonnes sur md+)
- [x] `src/lib/components/python/debug/index.ts` - Exports

### Fichiers modifies

- [x] `src/lib/stores/pythonDebug.svelte.ts`
  - `historyIndex` rendu public (etait `_historyIndex`)
  - Necessaire pour afficher position dans toolbar

### Decisions prises

- Svelte 5 runes ($state, $derived, $props) partout
- Shadcn-svelte components (Button, Switch, Accordion, Badge, Progress)
- Labels UI en francais
- Accessibilite : aria-labels, aria-current, focus-visible
- Icons Lucide cohérents
- Dark mode support via Tailwind dark: variants

### Code Review (Issues fixes)

1. **History index** : `_historyIndex` rendu public pour toolbar
2. **ARIA labels** : Ajoutes sur Accordion.Content
3. **MODULE_NAME constant** : Extrait magic string dans CallStackPanel
4. **Keyboard shortcut hints** : Retires (implementation Phase 5)

---

## Notes de reprise

En cas de crash, reprendre a partir de :

- Verifier quels fichiers ont ete crees
- Continuer la phase en cours
- Consulter ce document pour l'etat actuel

Phase suivante : Phase 5 - Integration
