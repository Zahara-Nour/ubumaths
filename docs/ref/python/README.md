# Python Ecosystem — UbuMaths

Documentation technique de l'écosystème Python d'UbuMaths : playground, notebook, debugger, exercices et bibliothèque d'exemples.

L'ensemble fonctionne **100% client-side** via Pyodide (CPython 3.12 compilé en WebAssembly), s'exécute dans un Web Worker isolé et partage une infrastructure commune (executor pattern + multi-context worker).

---

## Vue d'ensemble — 6 sous-systèmes

| Sous-système                            | Route               | Description                                          | Statut                   |
| --------------------------------------- | ------------------- | ---------------------------------------------------- | ------------------------ |
| [Playground](#1-playground)             | `/python`           | Éditeur + REPL Python type "Le Serpentarium"         | ✅                       |
| [Notebook](#2-notebook)                 | `/python-notebook`  | Cellules code/markdown façon Jupyter/Colab           | ✅                       |
| [Debugger](#3-debugger)                 | _(dans Playground)_ | Step-by-step + heap visualization style Python Tutor | ✅                       |
| [Exercises](#4-exercises)               | `/api/python-...`   | API exercices avec 3 stratégies de validation        | ⚠️ API only (UI à faire) |
| [Examples Library](#5-examples-library) | _(dans Playground)_ | 100 exemples curés en 10 catégories                  | ✅                       |
| [Cloud Files](#6-cloud-files)           | _(dans Playground)_ | Sauvegarde DB + assignation enseignant→classe        | ✅                       |

---

## Stack commune

| Brique         | Version  | Rôle                                |
| -------------- | -------- | ----------------------------------- |
| Pyodide        | v0.26.2  | Python 3.12 en WebAssembly          |
| CodeMirror     | v6.x     | Éditeur de code (12 thèmes)         |
| MathLive       | v0.108.2 | Rendu LaTeX (SymPy)                 |
| Plotly.js      | v2.27.0  | Graphes interactifs (CDN, lazy)     |
| LZ-String      | v1.5.0   | Compression URL pour partage        |
| Web Worker     | natif    | Isolation thread d'exécution        |
| Service Worker | natif    | Cache CDN Pyodide                   |
| Supabase       | -        | Cloud storage (fichiers, notebooks) |

### Packages Python (lazy-loaded)

- **Standard library** Python 3.12 (chargée d'office)
- **NumPy** — calcul numérique (à l'import)
- **Matplotlib** — visualisation, backend AGG (à l'import)
- **SymPy** — calcul symbolique + LaTeX (à l'import)
- **Plotly** — graphes interactifs (CDN à l'usage)

---

## Architecture transversale

### Executor pattern (refactor 2025-12-06)

```
BasePythonExecutor (abstrait)
├── PlaygroundExecutor   → context: undefined (reset entre exécutions)
└── NotebookExecutor     → context: notebook_${id} (variables persistantes)
```

→ Voir [progress/python-executor-pattern.md](./progress/python-executor-pattern.md)

### Multi-context Pyodide worker

Un seul Pyodide chargé, **namespaces isolés par `contextId`**. Le playground et chaque notebook ouvert ont leur propre namespace.

→ Voir [progress/python-worker-multicontext.md](./progress/python-worker-multicontext.md)

### Sécurité commune

- Web Worker isolé (pas de FS, pas de network depuis Python)
- Timeout 30 secondes par exécution
- 100% Zod validation sur les messages worker ↔ main
- 100% Zod validation sur les API REST
- RLS Supabase avec helpers `SECURITY DEFINER`
- CSP headers (Pyodide CDN, Plotly CDN, Google profile images)
- Étudiants ne voient jamais `solution_code` des exercices

### Bug critique résolu — Safari/WebKit TDZ

L'import statique de `@supabase/ssr` dans `+layout.ts` cassait sur iPad. Solution : import dynamique dans le `load()`. → Voir `docs/ref/safari-webkit-tdz.md`.

---

## 1. Playground

**Route** : `/python` (publique, "Le Serpentarium")

REPL Python complet en navigateur avec éditeur CodeMirror, sortie multi-format, autocomplétion intelligente.

| Fonctionnalité         | Détails                                                        |
| ---------------------- | -------------------------------------------------------------- |
| Éditeur                | CodeMirror 6, 12 thèmes, taille de police ajustable            |
| Autocomplétion         | Introspection Python (`dir()`, `getattr()`), debounce 150ms    |
| Sorties                | stdout / stderr / plots PNG / Plotly / LaTeX SymPy             |
| Erreurs pédagogiques   | 13 patterns traduits en français                               |
| Highlight ligne erreur | StateField CodeMirror (rouge + gutter marker)                  |
| Partage                | URL avec code compressé LZ-String (~2000 chars)                |
| Modes                  | Plein écran, splitter redimensionnable (20-80%)                |
| Persistance            | localStorage (anonyme) + DB JSONB (`profiles.python_settings`) |
| Service Worker         | Cache Pyodide CDN après 1er chargement                         |

### Documentation détaillée

- [architecture.md](./architecture.md) — design système, data flow, message types
- [components.md](./components.md) — composants Svelte 5 documentés
- [store.md](./store.md) — store réactif (`pythonPlayground.svelte.ts`)
- [worker.md](./worker.md) — Web Worker Pyodide, autocomplétion, erreurs

### Progression

- [progress/python-playground-progress.md](./progress/python-playground-progress.md) — MVP (Phase 1-7)
- [progress/python-playground-improvements.md](./progress/python-playground-improvements.md) — 10 améliorations (toolbar, partage, fullscreen, splitter, LaTeX, autocomplétion, erreurs, font size)
- [progress/python-playground-phase1-progress.md](./progress/python-playground-phase1-progress.md) → [phase2](./progress/python-playground-phase2-progress.md) → [phase4](./progress/python-playground-phase4-progress.md)
- [progress/python-phase3-url-sharing.md](./progress/python-phase3-url-sharing.md)
- [progress/python-autocomplete-progress.md](./progress/python-autocomplete-progress.md)
- [progress/python-lazy-loading-plan.md](./progress/python-lazy-loading-plan.md)

---

## 2. Notebook

**Route** : `/python-notebook` (protégée), `/python-notebook/[id]` (notebook unique)

Interface Jupyter/Colab-like avec cellules code+markdown, exécution séquentielle, partage classe.

| Fonctionnalité | Détails                                                       |
| -------------- | ------------------------------------------------------------- |
| Cellules       | Code (CodeMirror) + Markdown (édition double-clic)            |
| Exécution      | File d'attente séquentielle, contexte persistant              |
| Raccourcis     | Shift+Enter, Ctrl+Enter, Alt+Enter, Ctrl+S, Escape            |
| Statuts        | `[In ]`, `[In *]`, `[In N]` style Jupyter                     |
| Outputs        | stream / error+traceback / display_data / execute_result      |
| Reset kernel   | Vide le namespace Python (avec confirmation)                  |
| Autosave       | Debounce 2s, indicateurs visuels                              |
| Partage        | `ShareNotebookDialog` enseignant→classes, toggle readonly     |
| Mode readonly  | Étudiants : lecture seule (mais exécution OK)                 |
| Import/Export  | Format `.ipynb` Jupyter natif, 59 tests round-trip            |
| Limites        | 200 cellules/notebook, 100 outputs/cellule, 50 notebooks/user |

### Composants (`src/lib/components/notebook/`)

`NotebookView`, `NotebookToolbar`, `NotebookStatusBar`, `NotebookCell`, `CodeCell`, `MarkdownCell`, `CellGutter`, `CellOutputs`, `KeyboardShortcutsHelp`, `ShareNotebookDialog`.

### Progression

- [progress/python-notebook-complete.md](./progress/python-notebook-complete.md) — récap Sprint 2-4
- [progress/notebook-implementation.md](./progress/notebook-implementation.md) — types, store, executor
- [progress/notebook-ui-complete.md](./progress/notebook-ui-complete.md) — 8 composants
- [progress/notebook-ui-progress.md](./progress/notebook-ui-progress.md)
- [progress/python-notebooks-migration.md](./progress/python-notebooks-migration.md) — schéma DB
- [progress/python-notebooks-routes-progress.md](./progress/python-notebooks-routes-progress.md) — API REST
- [progress/notebook-import-implementation.md](./progress/notebook-import-implementation.md) — import .ipynb
- [progress/notebook-export-implementation.md](./progress/notebook-export-implementation.md) — export .ipynb
- [progress/notebook-sharing-implementation.md](./progress/notebook-sharing-implementation.md) — partage classes
- [progress/notebook-readonly-mode-progress.md](./progress/notebook-readonly-mode-progress.md) — mode étudiant
- [progress/notebook-test-enhancement-summary.md](./progress/notebook-test-enhancement-summary.md)

---

## 3. Debugger

**Intégré dans le Playground** (toggle Execute/Debug).

Système complet de débogage step-by-step avec **visualisation mémoire style Python Tutor**.

| Fonctionnalité     | Détails                                                                                |
| ------------------ | -------------------------------------------------------------------------------------- |
| Approche           | Tracer **par générateur** (pas `sys.settrace`), AST statement-par-statement            |
| Contrôles          | Step Into, Step Over, Step Out, Continue, Run-to-End                                   |
| Historique         | Buffer circulaire de 10 snapshots, Step Back/Forward                                   |
| Variables          | Locals/globals, badges type colorés, indicateurs new/modified                          |
| Call Stack         | Visualisation pile, sélection frame                                                    |
| Loops              | Indicateur d'itération avec barre de progression                                       |
| Heap Visualization | Frames + Heap + flèches SVG cubic-Bezier (style Python Tutor)                          |
| Highlight ligne    | Fond jaune + flèche dans le gutter de l'éditeur                                        |
| Raccourcis         | F5 (Continue), F10 (Step Over), F11 (Step Into), Shift+F11 (Step Out), Shift+F5 (Stop) |

### Périmètre Heap

- **Sur la heap** : containers (list, dict, set, tuple, frozenset) + instances de classes utilisateur
- **Inline** : primitives (int, float, str, bool, None, complex, bytes)
- Cycles gérés via pré-insertion placeholder avant récursion

### Composants (`src/lib/components/python/debug/`)

`DebugToolbar`, `DebugPanel`, `VariablesPanel`, `VariablesHistory`, `CallStackPanel`, `LoopIndicator`, `FramesPanel`, `HeapPanel`, `MemoryDiagramView`.

### Progression

- [progress/python-debugger-progress.md](./progress/python-debugger-progress.md) — Phases 1-6 (heap viz incluse)

### TODO follow-up

- Breakpoint gutter dans CodeMirror (clic pour toggle)
- Touche F9 pour toggle breakpoint au curseur
- Pas encore de cache des dérivées secondes

---

## 4. Exercises

**API REST complète, UI à construire.**

Système d'exercices Python pour enseignants avec 3 stratégies de validation côté client.

### Stratégies de validation

1. **Output match** — comparer `stdout` à une référence
2. **Unit test** — exécuter des tests pytest-style
3. **AST analysis** — vérifier la structure du code (présence de boucle, fonction, etc.)

### Endpoints

| Endpoint                     | Action                                                                |
| ---------------------------- | --------------------------------------------------------------------- |
| `POST /api/python-exercises` | Créer (enseignant)                                                    |
| `GET /api/python-exercises`  | Lister (filtres : difficulty, tags, is_public, author_id, pagination) |
| `GET/PUT/DELETE /[id]`       | Auteur uniquement, étudiants sans `solution_code`                     |
| `POST /[id]/assign`          | Assigner classe ou élève (due_date, max_attempts)                     |
| `POST /[id]/submit`          | Soumettre solution (rate limit 10/min via trigger)                    |
| `GET /[id]/results`          | Résultats agrégés par élève                                           |

### Sécurité

- Triggers DB : `auto_submission_attempt_number`, `enforce_max_attempts`, `submission_rate_limit`
- Submissions immutables (no UPDATE)
- Étudiants ne voient jamais `solution_code`
- Validation 100% Zod (UUID, structures de validation, résultats)

### Progression

- [progress/python-exercises-api-progress.md](./progress/python-exercises-api-progress.md) — endpoints + sécurité
- [progress/python-validation-implementation.md](./progress/python-validation-implementation.md) — runner client
- [progress/python-shared-types.md](./progress/python-shared-types.md) — types partagés

### TODO

- [ ] Frontend : formulaire création exercice (enseignant)
- [ ] Frontend : liste exercices + assignation
- [ ] Frontend : UI soumission élève
- [ ] Frontend : dashboard résultats enseignant
- [ ] Tests endpoints (0% couverture actuelle)

---

## 5. Examples Library

**Intégrée dans le Playground** via l'onglet "Bibliothèque" du dialog "Ouvrir un fichier".

100 exemples curés en 10 catégories, stockage statique (fichiers `.py` importés via Vite `?raw`).

### Catalogue

| Catégorie              | v1     | Extension v2 | Total   |
| ---------------------- | ------ | ------------ | ------- |
| Bases                  | 8      | +9           | **17**  |
| Fonctions              | 4      | +7           | **11**  |
| OOP                    | 3      | +5           | **8**   |
| Strings                | 2      | +5           | **7**   |
| Exceptions             | 2      | +3           | **5**   |
| I/O                    | 2      | +3           | **5**   |
| Maths                  | 4      | +9           | **13**  |
| Visualisation          | 3      | +6           | **9**   |
| Algorithmes            | 2      | +12          | **14**  |
| **Hasard** _(nouveau)_ | 0      | +11          | **11**  |
| **Total**              | **30** | **+70**      | **100** |

### Niveaux (tags)

`college`, `lycee`, `nsi`, `superieur`.

### UI

- Onglet "Bibliothèque" dans `PythonFileManager`
- Layout split : liste filtrée + aperçu lecture seule
- Recherche full-text (titre, description, **tags**)
- Chips taggables (active/inactive)
- Modal de confirmation si éditeur modifié non sauvegardé

### Progression

- [progress/python-examples-library-progress.md](./progress/python-examples-library-progress.md) — 7 commits, 25 tests

---

## 6. Cloud Files

**Intégrée dans le Playground** via la toolbar (Nouveau / Ouvrir / Sauvegarder).

Stockage Supabase des fichiers Python avec assignation enseignant→classe.

### Tables

- `python_files` — fichiers utilisateur (50 max par user, trigger d'enforcement)
- `python_file_assignments` — assignations classe (RLS via helpers `SECURITY DEFINER`)

### Endpoints

| Endpoint                         | Action                                |
| -------------------------------- | ------------------------------------- |
| `POST /api/python-files`         | Créer fichier                         |
| `GET /api/python-files`          | Lister (mes fichiers + assignés)      |
| `GET/PUT/DELETE /[id]`           | CRUD                                  |
| `POST /[id]/assign`              | Assigner à des classes                |
| `GET /api/python-files/students` | Vue enseignant des fichiers étudiants |

### UI

- `PythonFileManager` — dialog avec onglets Mes fichiers / Assignés / Bibliothèque
- `PythonSaveDialog` — sauvegarde/mise à jour
- `PythonMigrationPrompt` — migration localStorage → cloud (au login)

### Progression

- [progress/python-files-progress.md](./progress/python-files-progress.md) — DB + API + UI

---

## Schémas DB (4 migrations)

| Migration                                            | Tables                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `20251205100000_create_python_files.sql`             | `python_files`, `python_file_assignments`                                                        |
| `20251205160000_add_python_settings_to_profiles.sql` | `profiles.python_settings` (JSONB)                                                               |
| `20251206010000_create_python_exercises.sql`         | `python_exercises`, `python_exercise_assignments`, `python_exercise_submissions` (avec triggers) |
| `20251206020000_create_python_notebooks.sql`         | `python_notebooks`, `python_notebook_assignments`                                                |

Helpers `SECURITY DEFINER` partagés : `is_teacher_of_student`, `is_student_in_class`, `is_teacher_of_class`, `is_admin`, `is_file_assigned_to_student`, `is_notebook_assigned_to_student`, `count_user_python_files`, `count_user_notebooks`.

---

## Index chronologique

→ Voir [progress/INDEX.md](./progress/INDEX.md) pour le récap chronologique de tous les jalons (~68 commits, 2025-12-04 → 2026-05-08).

---

## Tests

```bash
# Store playground (45 tests)
pnpm test:client src/lib/stores/pythonPlayground.svelte.test.ts

# Output component (36 tests)
pnpm test:client src/lib/components/python/PythonOutput.svelte.test.ts

# Debugger (124+ tests)
pnpm test:server src/lib/shared/python/debug/
pnpm test:server src/lib/shared/python/worker/messages.debug.test.ts

# Examples library (25 tests)
pnpm test:server src/lib/data/python-examples/

# Notebook import/export (59 tests round-trip)
pnpm test:server src/lib/utils/notebook-import.test.ts
pnpm test:server src/lib/utils/notebook-export.test.ts
```

---

## Performance

| Scénario             | Initial (MB) | Temps | Notes                       |
| -------------------- | ------------ | ----- | --------------------------- |
| **Initial load**     | ~10          | 2-4s  | Pyodide + stdlib uniquement |
| **First NumPy**      | +5           | +1-2s | Lazy à l'import             |
| **First Matplotlib** | +8           | +2-3s | Lazy à l'import             |
| **First Plotly**     | +3           | +1s   | CDN, cache navigateur       |

**Avant lazy loading** : ~26MB / 5-10s (tous packages préchargés).

Service Worker active : 0 réseau au 2e chargement.

---

## Lacunes connues / TODO

- [ ] Breakpoints gutter CodeMirror (clic pour toggle, F9 raccourci)
- [ ] Frontend complet exercices (formulaire, liste, soumission, dashboard)
- [ ] Drag-and-drop cellules notebook (boutons up/down seulement actuellement)
- [ ] a11y SVG canvas debug : 25 warnings supprimés via `svelte-ignore`, vraie accessibilité clavier/screen-reader pas implémentée — voir `docs/ref/warning-svelte.md`
- [ ] Tests composants notebook (existent pour utils import/export, pas pour les `.svelte`)
- [ ] Cell collapse/expand pour outputs longs
- [ ] Variable inspector sidebar dans notebook
- [ ] Notebook search (find in cells)
