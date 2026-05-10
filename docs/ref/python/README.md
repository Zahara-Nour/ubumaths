# Python Ecosystem — UbuMaths

Documentation technique de l'écosystème Python d'UbuMaths : playground, notebook, debugger, exercices et bibliothèque d'exemples.

L'ensemble fonctionne **100% client-side** via Pyodide (CPython 3.12 compilé en WebAssembly), s'exécute dans un Web Worker isolé et partage une infrastructure commune (executor pattern + multi-context worker).

---

## Vue d'ensemble — 6 sous-systèmes

| Sous-système                            | Route               | Description                                                        | Statut |
| --------------------------------------- | ------------------- | ------------------------------------------------------------------ | ------ |
| [Playground](#1-playground)             | `/python`           | Éditeur + REPL Python type "Le Serpentarium"                       | ✅     |
| [Notebook](#2-notebook)                 | `/python-notebook`  | Cellules code/markdown façon Jupyter/Colab                         | ✅     |
| [Debugger](#3-debugger)                 | _(dans Playground)_ | Step-by-step + heap visualization style Python Tutor               | ✅     |
| [Exercises](#4-exercises)               | `/python-exercises` | API + UI exercices avec validation V2 (AST + behavior orthogonaux) | ✅     |
| [Examples Library](#5-examples-library) | _(dans Playground)_ | 100 exemples curés en 10 catégories                                | ✅     |
| [Cloud Files](#6-cloud-files)           | _(dans Playground)_ | Sauvegarde DB + assignation enseignant→classe                      | ✅     |

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

**Routes** : `/python-exercises` (landing public), `/python-exercises/new` (création teacher), `/python-exercises/mine` (mes exos teacher avec liens éditer/copier/supprimer), `/python-exercises/[id]` (consultation publique avec soumission élève), `/python-exercises/[id]/edit` (édition teacher author-only), `/python-exercises/[id]/results` (suivi élèves teacher : auteur OU prof ayant assigné), `/python-exercises/[id]/results/[student_id]` (drill-down sur les soumissions d'un élève précis : code + verdict détaillé), `/python-exercises/students/[student_id]` (vue cross-exos pour un élève donné : tous les exos pertinents pour ce prof), `/python-exercises/my-progress` (dashboard élève : tous les exos sur lesquels j'ai une trace — submission, mastery, ou assignment).

Système d'exercices Python complet : création teacher, soumission élève (assignée + libre), validation côté client via Pyodide isolé, persistance des tentatives, mastery sticky, dashboards prof (résultats par exo, drill-down soumissions, vue par élève cross-exos) et dashboard élève ("Ma progression").

> **État (2026-05-09)** : module pédagogiquement complet. Les éléments de la section TODO sont du backlog low-priority à reprendre après feedback prof réel — pas de nouvelle pédagogie à débloquer.

### Validation V2 — couches orthogonales (refactor 2026-05-10)

`ValidationConfig` combine **deux axes indépendants**. Au moins l'un des deux doit être présent.

1. **`ast_requirements?`** — pré-check structurel sans exécution (`uses_loop`, `uses_recursion`, `defines_function`, `defines_class`, `uses_list_comprehension`, `no_global_variables`, `no_print`, `uses_import`).
2. **`behavior?`** — comportement runtime, discriminated union sur `kind` :
   - **`'output'`** — comparer `stdout` à une référence avec une stratégie expressive (`comparison`) :
     - `exact` : octet-pour-octet
     - `text` : whitespace souple, casse optionnelle
     - `numeric` : tolérance abs+rel, shapes flat/lines/grid, support virgule décimale
     - `custom` : _special judge_ — fonction Python `compare(expected, actual, stdin)` exécutée en namespace isolé pour chaque test case
     - 8 presets nommés + panneau "Personnaliser"
   - **`'unit_test'`** — appel positionnel d'une fonction nommée, comparé via égalité Python `==`

**Pipeline** : si AST échoue → on s'arrête (`failed_layer: 'ast'`) ; sinon on exécute le behavior (`failed_layer: 'behavior'` ou `null` si tout passe). `ValidationResult.behavior_kind` indique quel kind a tourné.

**Avant V2** (jusqu'au 2026-05-09) : 3 stratégies mutuellement exclusives (`output` | `unit_test` | `ast`), avec `ast + output_tests` comme seule combinaison possible. Le V2 supprime cette asymétrie : `ast + unit_test` est maintenant possible (cas typique : exo Bac avec fonction + défense `uses_loop`).

→ Voir [../../wip/python-validation-refactor-spec.md](../../wip/python-validation-refactor-spec.md) et [../../wip/python-validation-refactor-progress.md](../../wip/python-validation-refactor-progress.md)

### Tests cachés

Chaque test case (`output` ou `unit_test`) supporte un flag `hidden?: boolean`. Quand `true`, le worker redacte `input`/`expected`/`actual`/`diff` avant de renvoyer le résultat — l'élève voit le verdict mais pas l'oracle. Anti-hardcoding et anti-reverse-engineering. Zod refuse une config dont tous les test_cases sont cachés (au moins 1 visible obligatoire).

### Soumissions

- **Mode assigné** : un teacher assigne un exo à une classe ou un élève via `POST /[id]/assign` (`due_date`, `max_attempts`). L'élève soumet via le bouton "Soumettre" qui consomme une tentative.
- **Mode libre** : tout élève authentifié peut soumettre sur un exo `is_public: true` sans assignment (`assignment_id: null`). Trace persistée mais pas de `max_attempts` ni `due_date`.
- **Anonyme** : bouton "Soumettre" grisé avec tooltip _"Connecte-toi pour suivre tes progrès"_. Bouton "Vérifier" reste actif (Pyodide local, pas de trace).
- **Teacher** : bouton "Soumettre" caché ; testing via "Vérifier".

Sur la page consultation, un panneau historique repliable affiche les 10 dernières tentatives de l'élève (icône succès/échec + numéro + date relative + badge "Libre" si applicable + bouton "Charger ce code").

### Mastery automatique (Bloc B)

Statut sticky `mastered` (au moins 1 soumission correcte) ou `needs_review` (a essayé sans réussir), absence de row = `not_worked`. Auto-dérivé via trigger DB sur INSERT dans `python_exercise_submissions` (UPSERT `ON CONFLICT DO UPDATE WHERE status != 'mastered'` — sticky-mastered : une fois acquis, jamais reverti). Endpoints `GET /mastery` (global) et `GET /[id]/mastery` (par exo). Badge "Maîtrisé" / "À retravailler" sur la page consultation.

### Page résultats prof (Bloc C)

Route `/python-exercises/[id]/results` accessible aux profs auteur **OU** ayant assigné cet exo (le `eq('assigned_by', user.id)` est le seul gate authz côté load). Compose 4 sources DB en `StudentRow[]` : assignments + class_members + submissions + mastery. UI : 4 cards stats (élèves concernés / mastered / needs_review / not_started + % maîtrise), filtre par classe (MySelect, visible si >1 classe), table sortable par nom / tentatives / dernière activité, badges colorés.

Mapping mastery à 3 valeurs alignées sur la DB : `mastered` (sticky DB) / `needs_review` ("À retravailler", DB row OR submissions sans row) / `not_started` (rien). Mêmes mots et mêmes couleurs côté élève (page consultation) que côté prof. Bouton "Voir les résultats" sur la page consultation, visible uniquement aux profs avec accès (`canViewResults` calculé au load).

### Tags normalisation (math + Python)

Les colonnes `tags TEXT[]` ont été remplacées par des tables de jonction N-N : `exercise_tags(exercise_id, tag_id)` et `python_exercise_tags(...)`. Catalogues `tags` et `python_tags` deviennent référentiels (FK CASCADE/RESTRICT). Le contrat API reste `tags: string[]` (résolution serveur via `tags-resolution.ts`). Auto-create silencieux des tags absents du catalogue à l'INSERT/UPDATE. Échec de sync junction → rollback INSERT (math + Python POST) ou 500 sur UPDATE (PUT).

### Endpoints

| Endpoint                                        | Action                                                                            |
| ----------------------------------------------- | --------------------------------------------------------------------------------- |
| `POST /api/python-exercises`                    | Créer (teacher)                                                                   |
| `GET /api/python-exercises`                     | Lister (filtres : level, tags, is_public, author_id, pagination)                  |
| `GET/PUT/DELETE /api/python-exercises/[id]`     | Auteur full ; autres : sans `solution_code` (RLS + strip API)                     |
| `POST /api/python-exercises/[id]/assign`        | Assigner classe ou élève (due_date, max_attempts)                                 |
| `POST /api/python-exercises/[id]/submit`        | Soumettre solution (mode assigné OU libre si `is_public: true`)                   |
| `GET /api/python-exercises/[id]/my-submissions` | Soumissions de l'élève (RLS filtre : student → ses propres ; teacher → vue large) |
| `GET /api/python-exercises/[id]/results`        | Résultats agrégés (teacher)                                                       |
| `GET /api/python-exercises/mastery`             | Mastery globale de l'élève sur tous les exos                                      |
| `GET /api/python-exercises/[id]/mastery`        | Mastery de l'élève sur un exo                                                     |
| `GET/POST /api/python-tags`                     | Vocabulaire des tags Python (séparé des math `tags`)                              |

### Sécurité

- Triggers DB : `auto_submission_attempt_number`, `enforce_max_attempts`, `submission_rate_limit`
- Submissions immutables (no UPDATE)
- Étudiants ne voient jamais `solution_code` (RLS + strip API)
- Validation 100% Zod (UUID, output comparison discriminated union, hidden refine "au moins 1 visible")
- Isolation namespace Pyodide : chaque validation tourne dans un dict Python neuf (commit `4d39ceaf5`)
- Tests cachés : redaction côté worker avant `postMessage` (les fields ne traversent pas la frontière)

### Composants UI

- `ExerciseForm.svelte` — formulaire réutilisable création + édition (props `initialForm`, `mode: 'create' | 'edit'`, `cancelHref?`, `onSubmit`). Possède son propre executor Pyodide pour le bouton "Vérifier" et clone `initialForm` au mount pour éviter l'aliasing parent. Exporte `ExerciseFormState` + `emptyExerciseForm()` depuis son `<script module>`. Inclut un champ `source` libre (200 chars) pour indiquer l'origine de l'exercice (ex : "Bac Polynésie 09/2024 Q2.b").
- `ExerciseStrategyEditor.svelte` — éditeur teacher unifié pour la config V2 (deux sections orthogonales : AST requirements + Behavior). Pour `output` : sélecteur preset + panneau personnalisé. Pour `unit_test` : JSON drafts pour args/expected.
- `ExerciseValidationResult.svelte` — affichage du résultat (banner + AST issues + détails `<details>` par test case, mode opaque pour les tests cachés). Adapté V2 : surface `failed_layer` (`'ast'` / `'behavior'` / `null`) et `behavior_kind`.
- **Panneau "Tester ma fonction"** (page consultation `/python-exercises/[id]`) — visible quand `behavior?.kind === 'unit_test'`. L'élève appelle la fonction avec des args personnalisés sans écrire de `print()`. Les args sont parsés en JSON après wrap `[...]` (donc `4` ou `1, 2` ou `[1,2,3]` marchent). Historique des 5 derniers appels. Implémenté en réutilisant `executor.validateExercise()` avec un test case unique à `expected: null` pour lire `actual` (zéro changement worker).
- **Bouton "Copier le lien"** sur la page consultation, visible aux teachers : copie l'URL publique de l'exo.
- Composants Pyodide partagés : `PythonEditor`, `PythonOutput`, `PlaygroundExecutor`

### Progression

- [progress/python-exercises-api-progress.md](./progress/python-exercises-api-progress.md) — endpoints initiaux + sécurité
- [progress/python-validation-implementation.md](./progress/python-validation-implementation.md) — runner client
- [progress/python-shared-types.md](./progress/python-shared-types.md) — types partagés
- [../../wip/python-exercises-executor-progress.md](../../wip/python-exercises-executor-progress.md) — exposition `validateExercise`
- [../../wip/python-exercises-namespace-isolation-progress.md](../../wip/python-exercises-namespace-isolation-progress.md) — fix isolation
- [../../wip/output-comparison-v2-progress.md](../../wip/output-comparison-v2-progress.md) — refonte API output (presets + tolérance numérique)
- [../../wip/hidden-tests-progress.md](../../wip/hidden-tests-progress.md) — tests cachés
- [../../wip/free-practice-submissions-progress.md](../../wip/free-practice-submissions-progress.md) — bouton Soumettre + soumissions libres + historique
- [../../wip/custom-comparator-progress.md](../../wip/custom-comparator-progress.md) — comparateur Python custom (special-judge)
- [../../wip/tags-normalization-progress.md](../../wip/tags-normalization-progress.md) — colonnes `tags TEXT[]` → tables de jonction (math + Python)
- [../../wip/python-exercises-results-page-progress.md](../../wip/python-exercises-results-page-progress.md) — page résultats prof (Bloc C)
- [../../wip/python-exercises-drill-down-progress.md](../../wip/python-exercises-drill-down-progress.md) — drill-down soumissions par élève
- [../../wip/python-exercises-per-student-progress.md](../../wip/python-exercises-per-student-progress.md) — vue par élève cross-exos

### Backlog (low priority — attendre feedback prof)

- [ ] **Export CSV** des résultats — utile en réunion parents, ratio valeur/effort moyen
- [ ] **Realtime** sur `python_exercise_submissions` — gadget UX, F5 fait l'affaire
- [ ] **Tests API filtres GET list** (`tags`/`is_public`/`author_id`/`level`) — qualité technique pure, à traiter si bug remonte
- [ ] **Custom comparator V2** — étendre `custom` à `unit_test`, server-side validation pour tests vraiment cachés. Niche : profs Python avancés avec besoin custom (logique non-equality)

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

## Schémas DB (8 migrations principales)

| Migration                                                                   | Tables / changes                                                                                                       |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `20251205100000_create_python_files.sql`                                    | `python_files`, `python_file_assignments`                                                                              |
| `20251205160000_add_python_settings_to_profiles.sql`                        | `profiles.python_settings` (JSONB)                                                                                     |
| `20251206010000_create_python_exercises.sql`                                | `python_exercises`, `python_exercise_assignments`, `python_exercise_submissions` (avec triggers)                       |
| `20251206020000_create_python_notebooks.sql`                                | `python_notebooks`, `python_notebook_assignments`                                                                      |
| `20260508114655_python_exercise_assignments_unique.sql`                     | Unique constraints sur assignments (class XOR student)                                                                 |
| `20260508125858_python_exercises_public_anon.sql`                           | RLS : anon peut lire les exos `is_public: true`                                                                        |
| `20260508154124_drop_difficulty.sql` + `155447_add_level.sql`               | Refonte `difficulty` → `level` (college/lycee/nsi/etudiant)                                                            |
| `20260508162152_create_python_tags.sql`                                     | `python_tags` (vocabulaire Python séparé des math `tags`)                                                              |
| `20260508163407_seed_python_exercises_samples.sql`                          | 5 exos seed (1 par stratégie + ast+output_tests)                                                                       |
| `20260508180000_update_seeds_for_output_v2.sql`                             | Adapte les seeds à la nouvelle API `comparison`                                                                        |
| `20260509002840_allow_public_python_submissions.sql`                        | RLS : élève peut soumettre librement sur exos publics (sans assignment)                                                |
| `20260509091440_create_python_exercise_mastery.sql`                         | `python_exercise_mastery` (sticky `mastered`/`needs_review`) + trigger UPSERT auto sur INSERT                          |
| `20260509094828_normalize_exercise_tags.sql`                                | Jonctions `exercise_tags` + `python_exercise_tags` (drop `tags TEXT[]` des deux tables d'exos)                         |
| `20260509104544_fix_exercise_functions_after_tag_normalization.sql`         | Reconstruction des 4 RPC `get\_\*\_exercise[s                                                                          | \_assignments]`(refs`e.tags`+`e.difficulty`) |
| `20260510071340_seed_terminale_seuil_exercises.sql`                         | 3 exos seuil terminale spé (suite arithmético-géométrique, géométrique, somme partielle ζ(2))                          |
| `20260510073029_seed_pyramide_bac_polynesie_2024.sql`                       | Exo Bac Polynésie 09/2024 (somme des carrés via boucle for)                                                            |
| `20260510093300_add_source_to_python_exercises.sql`                         | Colonne `source TEXT` (max 200, nullable) — origine de l'exercice                                                      |
| `20260510093301_backfill_source_seeded_exercises.sql`                       | Backfill `source` sur les 4 exos déjà seedés                                                                           |
| `20260510094757_seed_croisement_populations_bac_centres_etrangers_2025.sql` | Bac Centres étrangers 06/2025 (script module-level avec `print(2025+n)`)                                               |
| `20260510095758_seed_posidonie_bac_metropole_2025.sql`                      | Bac Métropole 06/2025 (algo de seuil sur la posidonie)                                                                 |
| `20260510130000_refactor_python_validation_config.sql`                      | **Refactor V2** : convertit les `validation_config` JSONB legacy (`{type: 'ast'                                        | 'output'                                     | 'unit_test'}`) vers la forme orthogonale (`{ast_requirements, behavior}`) via CASE/WHEN. 12 rows migrées. |
| `20260510130100_seed_briggs_bac_amerique_nord_2025.sql`                     | Bac Amérique du Nord 05/2025 (premier exo nativement V2 : AST `defines_function` + `uses_loop` + `behavior.unit_test`) |

Helpers `SECURITY DEFINER` partagés : `is_teacher_of_student`, `is_student_in_class`, `is_teacher_of_class`, `is_admin`, `is_file_assigned_to_student`, `is_notebook_assigned_to_student`, `count_user_python_files`, `count_user_notebooks`.

---

## Index chronologique

→ Voir [progress/INDEX.md](./progress/INDEX.md) pour le récap chronologique de tous les jalons (~100+ commits, 2025-12-04 → 2026-05-09).

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
- [ ] Exercices : export CSV, realtime, custom comparator V2
- [ ] Drag-and-drop cellules notebook (boutons up/down seulement actuellement)
- [ ] a11y SVG canvas debug : 25 warnings supprimés via `svelte-ignore`, vraie accessibilité clavier/screen-reader pas implémentée — voir `docs/ref/warning-svelte.md`
- [ ] Tests composants notebook (existent pour utils import/export, pas pour les `.svelte`)
- [ ] Cell collapse/expand pour outputs longs
- [ ] Variable inspector sidebar dans notebook
- [ ] Notebook search (find in cells)
