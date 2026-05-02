# Python Debugger - Progression

## Statut actuel

**Phase** : Finale - Quality Checks - Terminee
**Derniere mise a jour** : 2024-12-23

## Phases

| Phase  | Description                      | Statut     |
| ------ | -------------------------------- | ---------- |
| 1      | Types et Messages                | Termine    |
| 2      | Python Tracer (Worker)           | Termine    |
| 3      | Store et Executor                | Termine    |
| 4      | Composants UI                    | Termine    |
| 5      | Integration                      | Termine    |
| 6      | Visualisation Heap (Optionnelle) | En attente |
| Finale | Quality Checks                   | Termine    |

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

## Phase 5 : Integration

### Fichiers modifies

- [x] `src/lib/components/python/PythonPlayground.svelte`
  - Import DebugToolbar et DebugPanel
  - Import debugStore et DebugStepAction type
  - Derived state : isDebugging, isDebugActive
  - Handlers : handleDebugRun, handleDebugStep, handleDebugStop
  - Keyboard shortcuts : F5 (Continue/Start), F10 (Step Over), F11 (Step Into), Shift+F11 (Step Out), Shift+F5 (Stop)
  - DebugToolbar below PythonToolbar
  - Output/Debug panel switch based on isDebugActive
- [x] `src/lib/shared/python/execution/playground-executor.svelte.ts`
  - Override onDebugSnapshot() -> debugStore.pushSnapshot()
  - Override onDebugPaused() -> debugStore.pauseSession()
  - Override onDebugFinished() -> debugStore.finishSession()

### Architecture

```
PythonPlayground
├── PythonToolbar (existing)
├── DebugToolbar (new - mode switch + debug controls)
├── Editor panel
│   └── PythonEditor
└── Output/Debug panel (conditional)
    ├── DebugPanel (when debugging active)
    │   ├── LoopIndicator
    │   ├── VariablesPanel
    │   └── CallStackPanel
    └── PythonOutput (when not debugging)
```

### Keyboard Shortcuts

| Raccourci | Action         |
| --------- | -------------- |
| F5        | Continue/Start |
| Shift+F5  | Stop debug     |
| F10       | Step over      |
| F11       | Step into      |
| Shift+F11 | Step out       |

### TODO (follow-up)

- [ ] Breakpoint gutter in PythonEditor (CodeMirror integration)
- [ ] F9 key handler for toggle breakpoint at cursor
- [ ] Visual current line highlight in editor during debug

### Flow

1. User toggle mode Execute -> Debug
2. User ajoute breakpoints (TODO: click gutter, not yet implemented)
3. User clique Run/F5 -> debug session starts
4. Worker executes statement, sends snapshot
5. PlaygroundExecutor.onDebugSnapshot() -> debugStore.pushSnapshot()
6. PlaygroundExecutor.onDebugPaused() -> debugStore.pauseSession()
7. UI updates: DebugPanel shows variables, stack, position
8. User step/continue -> handleDebugStep() -> debugStore.resumeSession() + executor.debugStep()
9. Repeat until finished
10. PlaygroundExecutor.onDebugFinished() -> debugStore.finishSession()

---

## Phase Finale : Quality Checks

### Tests executes

| Test suite                   | Tests    | Statut   |
| ---------------------------- | -------- | -------- |
| types.test.ts                | 30       | Pass     |
| messages.debug.test.ts       | 53       | Pass     |
| pyodide.worker.debug.test.ts | 41       | Pass     |
| pythonDebug.svelte.test.ts   | 114      | N/A\*    |
| **Total**                    | **124+** | **Pass** |

\*Tests Svelte runes necessitent Playwright (pas installe)

### ESLint

- Debug-related files : 0 errors, 0 warnings

### Notes

- Pre-existing TypeScript errors non lies au debugger :
  - `WeekConfig` export missing from database types
  - `SchoolTimetable` export missing from database types
  - Test file Map constructor type issues

---

## Resume du projet

Le Python Debugger est maintenant integre dans UbuMaths avec :

### Fonctionnalites implementees

1. **Mode Debug** : Toggle Execute/Debug dans le playground
2. **Step-by-step** : Step, Step Over, Step Out, Continue, Run to End
3. **Historique** : Buffer circulaire de 10 snapshots, Step Back/Forward
4. **Variables** : Panel avec locals/globals, indicateurs de changement
5. **Call Stack** : Visualisation pile d'appels
6. **Loops** : Indicateur d'iteration avec barre de progression
7. **Keyboard shortcuts** : F5, F10, F11, Shift+F11, Shift+F5
8. **Highlight ligne courante** : Fond jaune + fleche dans gutter

### TODO (follow-up)

- [ ] Breakpoint gutter dans PythonEditor (CodeMirror)
- [ ] F9 key handler pour toggle breakpoint
- [x] Highlight ligne courante dans editeur (jaune + fleche)
- [ ] Phase 6 : Visualisation Heap (optionnelle)

### Fichiers crees

```
src/lib/shared/python/debug/
├── types.ts
└── types.test.ts

src/lib/stores/
├── pythonDebug.svelte.ts
└── pythonDebug.svelte.test.ts

src/lib/components/python/debug/
├── CallStackPanel.svelte
├── DebugPanel.svelte
├── DebugToolbar.svelte
├── LoopIndicator.svelte
├── VariablesPanel.svelte
└── index.ts

src/lib/workers/
└── pyodide.worker.debug.test.ts

src/lib/utils/
└── codemirror-debug-marker.ts

docs/wip/
├── debug-tracer-testing-guide.md
└── python-debugger-progress.md
```

### Fichiers modifies

```
src/lib/shared/python/worker/messages.ts
src/lib/shared/python/types.ts
src/lib/shared/python/index.ts
src/lib/workers/pyodide.worker.ts
src/lib/shared/python/execution/base-executor.svelte.ts
src/lib/shared/python/execution/playground-executor.svelte.ts
src/lib/components/python/PythonPlayground.svelte
src/lib/components/python/PythonEditor.svelte
```
