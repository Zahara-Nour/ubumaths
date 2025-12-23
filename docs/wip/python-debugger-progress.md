# Python Debugger - Progression

## Statut actuel

**Phase** : 3 - Store et Executor - Terminee
**Derniere mise a jour** : 2024-12-23

## Phases

| Phase  | Description                      | Statut     |
| ------ | -------------------------------- | ---------- |
| 1      | Types et Messages                | Termine    |
| 2      | Python Tracer (Worker)           | Termine    |
| 3      | Store et Executor                | Termine    |
| 4      | Composants UI                    | En attente |
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

## Notes de reprise

En cas de crash, reprendre a partir de :

- Verifier quels fichiers ont ete crees
- Continuer la phase en cours
- Consulter ce document pour l'etat actuel

Phase suivante : Phase 4 - Composants UI
