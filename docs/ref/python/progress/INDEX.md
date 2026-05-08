# Python — Index chronologique des progressions

Récapitulatif chronologique des jalons de l'écosystème Python d'UbuMaths (~68 commits, 2025-12-04 → 2026-05-08).

> Pour la vue thématique par sous-système, voir [../README.md](../README.md).

---

## 2025-12-04 — Playground MVP (Phase 1-7)

Mise en place initiale du playground : Pyodide + Web Worker + CodeMirror + erreurs pédagogiques.

| Commit      | Description                                           |
| ----------- | ----------------------------------------------------- |
| `d59b2d4a0` | Phase 1 — UI foundation                               |
| `8b02eedcb` | Pyodide Web Worker for code execution                 |
| `cf2ffe032` | CodeMirror 6 editor with lazy loading                 |
| `738ec122e` | Output component with pedagogic errors and loading UX |
| `10707ca6c` | 77 tests (45 store + 36 output)                       |
| `b24e3b4fb` | Fix : dynamic import for Pyodide in ES module worker  |
| `804b9acd0` | Fix : suppress matplotlib AGG backend warning         |

→ [python-playground-progress.md](./python-playground-progress.md) (Phases 1-7)
→ [python-playground-phase1-progress.md](./python-playground-phase1-progress.md)
→ [python-playground-phase2-progress.md](./python-playground-phase2-progress.md)
→ [python-playground-phase2-summary.md](./python-playground-phase2-summary.md) (récap implementation)

---

## 2025-12-05 — Playground 8 améliorations + Cloud + Settings

10 features ajoutées : toolbar, partage URL, fullscreen, splitter, LaTeX SymPy, autocomplétion, erreurs ligne, font size. Cloud storage, thèmes éditeur, Service Worker.

| Commit      | Description                                                                    |
| ----------- | ------------------------------------------------------------------------------ |
| `c2d7a09a7` | Phase 1 — modification tracking + plot download                                |
| `ba51656bf` | 8 améliorations (Ctrl+S, share URL, fullscreen, splitter, LaTeX, autocomplete) |
| `a5514ddc0` | Fix : SyntaxError display                                                      |
| `d88bb5be3` | Fix : Python syntax errors and tracebacks display                              |
| `5aae73b1d` | Fix : extract correct line number from user code in traceback                  |
| `7ff47aef7` | Visual error line highlighting in CodeMirror                                   |
| `43089d5ce` | Fix : last line number from traceback for error location                       |
| `8480d0bb4` | Fix : errorLineEffectType reactive with $state                                 |
| `99bcbd6bb` | Fix : set errorLineEffectType after editor creation                            |
| `a451fd6e9` | Fix : `$state.raw` for editor reactivity tracking                              |
| `76b8530e5` | Fix : shorten traceback display to essential message only                      |
| `5a744b8d7` | Adjustable font size control in editor                                         |
| `223a80b9a` | Lazy loading packages + Plotly support + CSP headers                           |
| `0e231892c` | Service Worker for CDN caching                                                 |
| `1fb69e596` | Cloud storage with file management and class assignments                       |
| `8229e9770` | Fix : CSP for Google profile images and file loading                           |
| `7506b9324` | Editor theme settings with 12 CodeMirror themes                                |
| `0cd7b263f` | Persist playground settings to database for logged-in users                    |
| `523488815` | Docs : python_settings column in database schema                               |
| `ea0e316de` | Fix : allow theme extensions to apply their own backgrounds                    |
| `e383b53a1` | Fix : separate theme backgrounds from base theme                               |

→ [python-playground-improvements.md](./python-playground-improvements.md) (8 phases)
→ [python-phase3-url-sharing.md](./python-phase3-url-sharing.md)
→ [python-autocomplete-progress.md](./python-autocomplete-progress.md)
→ [python-lazy-loading-plan.md](./python-lazy-loading-plan.md)
→ [python-files-progress.md](./python-files-progress.md)
→ [python-playground-phase4-progress.md](./python-playground-phase4-progress.md)

---

## 2025-12-06 — Notebook Sprint 2-3 + Exercises + Refactor

Refactor majeur : pattern executor + multi-context worker. Notebook MVP, exercises API, ipynb import/export, sharing, readonly, autosave.

| Commit      | Description                                          |
| ----------- | ---------------------------------------------------- |
| `174fb7cbe` | Shared types for notebook and validation             |
| `4ea054ff3` | Multi-context support to worker                      |
| `2bcce5b9e` | **Refactor : extract base executor pattern**         |
| `3226db755` | **Refactor : decouple editor from store singleton**  |
| `57e545924` | Fix : add delete and destroy methods to PyProxy type |
| `420ad770a` | Exercise validation system (3 stratégies)            |
| `4dac46946` | **Python Notebook MVP (Sprint 3)**                   |
| `f3ea33a10` | ipynb import/export                                  |
| `3d7f6911e` | Readonly mode for student viewing                    |
| `e9fc38468` | Notebook sharing (with classes)                      |
| `8e23c7f7e` | Autosave with debouncing and visual indicators       |
| `3dab21eb2` | Keyboard shortcuts help and reset kernel             |

→ [python-shared-types.md](./python-shared-types.md)
→ [python-worker-multicontext.md](./python-worker-multicontext.md)
→ [python-executor-pattern.md](./python-executor-pattern.md)
→ [python-validation-implementation.md](./python-validation-implementation.md)
→ [python-exercises-api-progress.md](./python-exercises-api-progress.md)
→ [python-notebook-complete.md](./python-notebook-complete.md) (vue d'ensemble Sprint 2-4)
→ [notebook-implementation.md](./notebook-implementation.md) (types, store, executor)
→ [notebook-ui-complete.md](./notebook-ui-complete.md) (8 composants)
→ [notebook-ui-progress.md](./notebook-ui-progress.md)
→ [python-notebooks-migration.md](./python-notebooks-migration.md) (DB)
→ [python-notebooks-routes-progress.md](./python-notebooks-routes-progress.md) (API)
→ [notebook-import-implementation.md](./notebook-import-implementation.md)
→ [notebook-export-implementation.md](./notebook-export-implementation.md)
→ [notebook-sharing-implementation.md](./notebook-sharing-implementation.md)
→ [notebook-readonly-mode-progress.md](./notebook-readonly-mode-progress.md)
→ [notebook-test-enhancement-summary.md](./notebook-test-enhancement-summary.md)

---

## 2025-12-09 — Sécurité

| Commit      | Description                         |
| ----------- | ----------------------------------- |
| `2302ff89e` | UUID validation to route parameters |

---

## 2025-12-20 → 2025-12-23 — Debugger (Phase 1-3)

Mise en place du débogueur step-by-step : tracer générateur, store, executor extensions.

| Commit      | Description                                          |
| ----------- | ---------------------------------------------------- |
| `cf488043c` | Fix : CommonMark syntax in block-first list examples |
| `cd504cd4f` | Debug store and executor extensions (Phase 3)        |

→ [python-debugger-progress.md](./python-debugger-progress.md) (Phases 1-6 globales)

---

## 2026-01-03 — Fix divers

| Commit      | Description                                           |
| ----------- | ----------------------------------------------------- |
| `186352255` | Fix : status='active' filter on class members queries |

---

## 2026-05-02 — Debugger Phase 6 : Heap Visualization

Visualisation mémoire complète style Python Tutor : Frames + Heap + flèches SVG cubic-Bezier.

| Commit      | Description                                              |
| ----------- | -------------------------------------------------------- |
| `77a99b81d` | Docs : import Python playground & notebook documentation |
| `41dc33455` | Fix : 'default' theme follow app dark mode               |
| `80f5d987e` | Phase 1 — tracer + types + schemas                       |
| `665615ddb` | Phase 2 — FramesPanel + HeapPanel                        |
| `2e3697a38` | Phase 3 — MemoryDiagramView + arrows                     |
| `98b937a30` | Phase 4 — DebugPanel integration                         |
| `6b4ab0757` | Phase 5 — quality checks + docs                          |

→ [python-debugger-progress.md](./python-debugger-progress.md) (Phase 6)

---

## 2026-05-03 — Sidebar + branding

| Commit      | Description                                            |
| ----------- | ------------------------------------------------------ |
| `a3dd2c8a0` | "Le Serpentarium" hero banner on `/python` page        |
| `ae4102f78` | Sidebar : Python playground link for students/teachers |
| `4977c8ef9` | Sidebar : Python link visible to all users             |

---

## 2026-05-07 — Debugger UX polish

| Commit      | Description                                            |
| ----------- | ------------------------------------------------------ |
| `6f0e25b1d` | Fix : drop duplicate "Exécuter" button in DebugToolbar |
| `aafec3cf3` | Refactor : unify Run/Debug controls in PythonToolbar   |

---

## 2026-05-08 — Examples Library (100 exemples)

Bibliothèque d'exemples curés intégrée au playground.

| Commit      | Description                                          |
| ----------- | ---------------------------------------------------- |
| `259bfa1c2` | Schema + filter utilities                            |
| `6a6a95a54` | 30 curated examples across 9 categories              |
| `7c6f2e0f2` | Library tab in PythonFileManager                     |
| `990a0c06a` | Load with confirmation when editor is modified       |
| `b0d1874e1` | Replace plotly with scatter+regression example       |
| `26b388183` | Fix : drop misleading hardcoded module list in error |
| `641f961b3` | **Expand catalog to 100 examples + hasard category** |
| `8c5b57310` | Docs : finalize python-examples-library progress doc |

→ [python-examples-library-progress.md](./python-examples-library-progress.md)

---

## Récap par thème

| Thème              | Docs principaux                                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Playground         | playground-progress, playground-improvements, phase1-4                                                           |
| Sub-systems        | autocomplete, lazy-loading, phase3-url-sharing, files                                                            |
| Refactor commun    | executor-pattern, worker-multicontext, shared-types, validation                                                  |
| Notebook (12 docs) | notebook-complete, implementation, ui-\*, migration, routes, import, export, sharing, readonly, test-enhancement |
| Debugger           | debugger-progress (Phases 1-6, heap viz incluse)                                                                 |
| Exercises          | exercises-api-progress, validation-implementation                                                                |
| Examples Library   | examples-library-progress                                                                                        |

---

## Métriques

- **Commits totaux** : ~68 (depuis 2025-12-04)
- **Migrations DB** : 4
- **Tests** : 350+ (45 store + 36 output + 124+ debug + 25 library + 59 import/export + autres)
- **Exemples curés** : 100 (10 catégories)
- **Composants Svelte** : ~25 (playground + notebook + debug)
- **API endpoints** : ~20
