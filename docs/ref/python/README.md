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
| MathLive       | v0.109.1 | Rendu LaTeX (SymPy)                 |
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

→ Voir [executor-pattern.md](./executor-pattern.md) (API, hooks, décisions de design) · refactor d'origine : [progress/python-executor-pattern.md](./progress/python-executor-pattern.md)

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
- [executor-pattern.md](./executor-pattern.md) — `BasePythonExecutor` + `PlaygroundExecutor` + `NotebookExecutor`
- [worker.md](./worker.md) — Web Worker Pyodide, multi-context, validation V2, debugger
- [store.md](./store.md) — store réactif (`pythonPlayground.svelte.ts`)
- [components.md](./components.md) — composants Svelte 5 documentés

### Progression

- [progress/python-playground-progress.md](./progress/python-playground-progress.md) — MVP (Phase 1-7)
- [progress/python-playground-improvements.md](./progress/python-playground-improvements.md) — 10 améliorations (toolbar, partage, fullscreen, splitter, LaTeX, autocomplétion, erreurs, font size)
- [progress/python-playground-phase1-progress.md](./progress/python-playground-phase1-progress.md) → [phase2](./progress/python-playground-phase2-progress.md) → [phase4](./progress/python-playground-phase4-progress.md)
- [progress/python-phase3-url-sharing.md](./progress/python-phase3-url-sharing.md)
- [progress/python-autocomplete-progress.md](./progress/python-autocomplete-progress.md)
- [progress/python-lazy-loading-plan.md](./progress/python-lazy-loading-plan.md)

---

## 2. Notebook

**Route** : `/python-notebook` (protégée), `/python-notebook/[id]` (notebook unique), `/python-notebook/[id]/present` (mode présentation), `/python-notebook/[id]/results` (dashboard prof)

Interface Jupyter/Colab-like avec cellules code+markdown+checkpoint, exécution séquentielle, partage classe, export PDF, templates clonables, mode présentation plein écran.

| Fonctionnalité        | Détails                                                                          |
| --------------------- | -------------------------------------------------------------------------------- |
| Cellules              | Code (CodeMirror) + Markdown (`MarkdownEditor` split-view) + Checkpoint          |
| Exécution             | File d'attente séquentielle, contexte persistant (`notebook_${id}`)              |
| Raccourcis            | Shift+Enter, Ctrl+Enter, Alt+Enter, Ctrl+S, Escape                               |
| Statuts               | `[In ]`, `[In *]`, `[In N]` style Jupyter                                        |
| Outputs               | stream / error+traceback / display_data / execute_result + PNG matplotlib        |
| Reset kernel          | Vide le namespace Python (avec confirmation)                                     |
| Autosave              | Debounce 5s, defer pendant exécution, undo toast sur delete (5s)                 |
| Multi-tab sync        | BroadcastChannel — édition d'un même notebook dans 2 onglets reste cohérente     |
| Partage               | `ShareNotebookDialog` enseignant→classes, toggle readonly                        |
| Mode readonly         | Étudiants : lecture seule (mais exécution OK)                                    |
| Import/Export         | Format `.ipynb` Jupyter natif, 59 tests round-trip                               |
| **PDF export**        | Pipeline Typst (LaTeX + custom math + outputs + checkpoints), 4 options          |
| **Mode présentation** | Plein écran cellule-par-cellule via UbuSlides (`scaleContent:false`)             |
| **Templates**         | Gallery + clone + save-as (notebooks marqués `is_template`)                      |
| **Vue élève prof**    | Toggle `previewMode` — le prof teste sans polluer les résultats                  |
| **Sommaire**          | Outline auto à partir des headings markdown, navigation rapide                   |
| **Drag-and-drop**     | Réordonnance des cellules par glisser-déposer (`svelte-dnd-action`)              |
| **Dirty indicator**   | Point bleu dans la gouttière à côté de `[In N]` après édition post-exécution     |
| **Timer**             | Badge "Exécution… Ns" pour les cellules de plus de 2s                            |
| **Output fold**       | Sorties >20 lignes pliées (head+tail), bouton "Afficher N lignes masquées"       |
| Limites               | 200 cellules/notebook, 100 outputs/cellule, 50 notebooks/user (templates inclus) |

### V2 — Checkpoint cells (2026-06)

Cellules de vérification d'exercice intégrées au flux notebook. Le prof crée un checkpoint, l'élève clique « Vérifier » et obtient un verdict immédiat sans quitter la page.

| Mode             | Vérification                                                                      |
| ---------------- | --------------------------------------------------------------------------------- |
| `assert`         | Exécute un bloc Python d'assertions contre le namespace de l'élève                |
| `unit_test`      | Appelle `function_name(*args)` sur N cas de test, compare avec `_chiphre_compare` |
| `variable_check` | Vérifie la valeur de variables du namespace (`expected_vars: { x: 6 }`)           |

Le worker réutilise `validateExercise(code, config, contextId)` côté NotebookExecutor (la même brique que les exercices Python). Persistance des verdicts dans `python_notebook_checkpoint_runs` (PK `(notebook_id, user_id, cell_id)`, latest only, UPSERT via `ON CONFLICT DO UPDATE`).

**Hint feature** : optional `hint?: string` sur la cellule, révélé après **2 échecs** de Vérifier (compteur `checkpointFailedAttempts` en mémoire, reset au reload). Le prof écrit l'indice dans un textarea dédié de `CheckpointEditor`. Côté élève, bouton Lightbulb + panneau ambré. Défense en profondeur : le PDF locked pour les étudiants (cf. PDF export).

**Sécurité du verdict** : compteur in-memory volontairement (un reload = nouvelle chance — matche le framing « gagner l'indice »). Les essais persistés (passed/failed) n'incluent pas le compteur.

### V2 — Export PDF via Typst (2026-06)

Bouton **PDF** dans la toolbar → modal d'options → téléchargement.

| Bloc rendu               | Stratégie                                                                                                                                               |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cellule markdown         | Délégation à `parseMarkdown` + `generateTypst` de UbuMark — **rend les 4 syntaxes math : `$..$`, `$$..$$`, `~..~`, `~~..~~`** (LaTeX + custom UbuMaths) |
| Cellule code             | `#raw(block: true, lang: "python", "...")` — Typst raw, pas de fence breakout                                                                           |
| Output stream            | Bloc gris `Out:` (stdout) ou rouge clair `Stderr:` (stderr)                                                                                             |
| Output error             | Bloc rouge avec `ename: evalue` + traceback (ANSI stripped)                                                                                             |
| Output PNG inline        | `service.mapShadowBatch(map)` pré-mapping vers `/notebook/cell-X/output-Y.png` puis `#image(...)`                                                       |
| Output text/html         | Fallback `text/plain` si présent, sinon mention « (sortie HTML non rendue) »                                                                            |
| Cellule checkpoint       | Encadré ambré + titre + spec selon le mode + indice optionnel                                                                                           |
| Troncature longs outputs | 50 lignes max (30 head + 15 tail), pattern matche `foldOutput` à l'écran                                                                                |

**4 options dialog** : `includeOutputs`, `includeCheckpoints`, `includeHints`, `includeCoverPage`.

**Sécurité hints** : la checkbox `includeHints` est **disabled pour les non-teachers** (UI), ET le générateur force `includeHints && canRevealHints` (defense in depth — un étudiant ne peut pas extraire l'indice via DevTools).

**Sécurité injection Typst** : `escapeTypstBrackets` sur toute valeur interpolée dans un bloc `[...]` (titre, hint, error name/value, label code) → bloque le breakout via `]`.

**Filename** : `{title_sanitized}_{YYYY-MM-DD}.pdf` avec NFD + strip diacritiques.

### V2 — Mode présentation via UbuSlides (2026-06)

Route `/python-notebook/[id]/present` → plein écran cellule-par-cellule via `Deck` du module `$lib/slides`. Bouton **Présentation** dans la toolbar.

| Type cellule | Slide                                                                                   |
| ------------ | --------------------------------------------------------------------------------------- |
| markdown     | `UbuMarkSlide` (rend LaTeX + custom math + variation tables + tables + fragments `->` ) |
| code         | `NotebookCodeSlide` (PythonEditor read-only + bouton ▶ pour exécution live)            |
| checkpoint   | `NotebookCheckpointSlide` (wrapper léger autour de `CheckpointCell`)                    |

**`scaleContent: false`** (Option A) — slide remplit le container avec scroll natif, pas de scaling CSS 1920×1080. Choix justifié par : live coding avec outputs imprévisibles + cellules code potentiellement longues + cohérence avec l'éditeur.

**Pyodide isolé** : nouvelle `NotebookStore` au mount de la présentation → contexte Pyodide neuf (l'onglet éditeur, s'il est ouvert, n'est pas perturbé). `previewMode = true` → pas de POST des essais checkpoint (RLS refuserait de toute façon pour le prof sur son propre notebook).

**Navigation** : ←/→ ou swipe pour cellules, Esc pour quitter (avec guard `e.defaultPrevented` pour ne pas conflicter avec le Deck overview), Space pour exécuter, `o` pour overview, `f` pour fullscreen, URL hash `#/N` deep-linkable (1-indexed via `hashOneBasedIndex: true`).

### V2 — Tentatives élève sur dashboard Résultats (2026-06)

Le dashboard `/python-notebook/[id]/results` distingue maintenant « réussi du 1er coup » de « 12 essais avec indice révélé ».

| Colonne ajoutée à `python_notebook_checkpoint_runs` | Sticky | Description                                         |
| --------------------------------------------------- | ------ | --------------------------------------------------- |
| `attempt_count INTEGER NOT NULL DEFAULT 1`          | ✓      | Compteur total cross-session, jamais décrémenté     |
| `first_attempted_at TIMESTAMPTZ`                    | ✓      | Premier clic Vérifier, jamais modifié ensuite       |
| `succeeded_at TIMESTAMPTZ`                          | ✓      | Premier passing run, jamais effacé (sticky-success) |
| `hint_revealed BOOLEAN NOT NULL DEFAULT FALSE`      | ✓      | Transition unique false → true via PATCH dédié      |

**Compteur hybride** : `attempt_count` DB pour stats prof (cross-session), `checkpointFailedAttempts` in-memory inchangé pour le seuil indice (préserve la sémantique « gagner l'indice après 2 échecs en session »).

**2 fonctions SQL atomiques** (SECURITY INVOKER → RLS continue de s'appliquer) :

- `upsert_checkpoint_run(notebook_id, cell_id, status, error_message)` — INSERT initial avec timestamps OU UPDATE avec `attempt_count + 1` et COALESCE pour préserver les timestamps stickys. PostgREST `.upsert()` ne peut pas exprimer `attempt_count = attempt_count + 1` dans la conflict clause — d'où la RPC.
- `mark_checkpoint_hint_revealed(notebook_id, cell_id)` — idempotent false → true. Si la row n'existe pas encore (cas limite UI), insère un placeholder `attempt_count = 0, status = 'failed'` → le dashboard le détecte et affiche « Indice révélé sans essai » plutôt qu'un faux échec.

**API** :

- `POST /api/python-notebooks/[id]/checkpoint-runs` (modifié) — délègue à la RPC, incrémente atomiquement
- `PATCH /api/python-notebooks/[id]/checkpoint-runs/[cell_id]/hint-revealed` (nouveau) — best-effort depuis `CheckpointCell.handleRevealHint`, skip en `previewMode`

**Dashboard UI** :

- 6 stat cards (+ « Essais moyens sur checkpoints réussis » + « % Indices révélés »)
- Filtre **« Voir uniquement ceux qui ont galéré »** (> 5 essais)
- Par cellule : `N essais` inline + 💡 Lightbulb si `hint_revealed` + tooltip timing
- Placeholder `attempt_count === 0` → `CircleDashed` + « Indice révélé sans essai »

→ Voir `docs/wip/notebook-attempts-dashboard-progress.md`.

### V2 — Templates (2026-06)

Notebooks marqués `is_template = true` — réutilisables via clonage.

| Action           | Endpoint                                                            |
| ---------------- | ------------------------------------------------------------------- |
| Liste templates  | `GET /api/python-notebook-templates` (own + public, teacher only)   |
| Clone            | `POST /api/python-notebooks/from-template/[templateId]`             |
| Save as template | `POST /api/python-notebooks/[id]/save-as-template` (création copie) |

**Gallery** : `/dashboard/teacher/contenu/notebooks/templates` avec 3 sections (Mes templates / Templates partagés / Templates UbuMaths — vide en V1). `TemplateCard` avec bouton « Utiliser » → POST + redirect vers l'éditeur du clone.

**Schema** : ajout `is_template boolean NOT NULL DEFAULT false` + `template_category text` + index partiel sur `is_template = true`. RLS existante (own + public+teacher) couvre les accès templates sans nouvelle policy.

**Cell IDs régénérés** au clone via `cell-${Date.now()}-${rand}` ; outputs/execution_count/state wipés ; metadata `last_executed_source` strippé (évite faux « modified » dot).

**Défense en profondeur** :

- Étudiants → 403 sur tous les endpoints templates
- Gallery query narrower than RLS (`.or(own | public)`)
- Clone défaut `is_public = false` (sharing opt-in)
- `/share` refuse d'assigner un template à une classe (cloner d'abord)
- « Save as template » = COPIE, pas conversion (le notebook source reste utilisable)

### V2 — MarkdownEditor upgrade (2026-06)

Édition des cellules markdown via `$lib/components/markdown/MarkdownEditor` (le même composant que `ExerciseMarkdownEditor`).

- **Toolbar markdown** (bold, italic, headings, lists, tables, math)
- **Live preview** dans un split-view (raw à gauche, rendu à droite)
- **MathLive** : rendu LaTeX `$..$` ET custom `~..~` en preview
- View mode (non-édition) reste sur `MarkdownRenderer` léger
- Double-clic pour entrer en édition, Escape pour sortir
- V1 sans upload image bucket — les `![alt](url)` avec URL hébergées fonctionnent natively via le transpiler

### Composants (`src/lib/components/notebook/`)

**Base** : `NotebookView`, `NotebookToolbar`, `NotebookStatusBar`, `NotebookCell`, `CodeCell`, `MarkdownCell`, `CellGutter`, `CellOutputs`, `KeyboardShortcutsHelp`, `NotebookOutline`, `ShareNotebookDialog`, `NotebookPdfDialog`.

**Checkpoints** : `CheckpointCell` (vue élève + bouton Vérifier + reveal indice), `CheckpointEditor` (édition prof avec 3 modes + textarea indice).

**Présentation** (`presentation/`) : `NotebookCodeSlide`, `NotebookCheckpointSlide`.

**Templates** (`templates/`) : `TemplateGallery`, `TemplateCard`, `SaveAsTemplateDialog`.

### Progression

**Base** :

- [progress/python-notebook-complete.md](./progress/python-notebook-complete.md) — récap Sprint 2-4
- [progress/notebook-implementation.md](./progress/notebook-implementation.md) — types, store, executor
- [progress/notebook-ui-complete.md](./progress/notebook-ui-complete.md) — 8 composants
- [progress/notebook-ui-progress.md](./progress/notebook-ui-progress.md)
- [progress/python-notebooks-migration.md](./progress/python-notebooks-migration.md) — schéma DB initial
- [progress/python-notebooks-routes-progress.md](./progress/python-notebooks-routes-progress.md) — API REST initiale
- [progress/notebook-import-implementation.md](./progress/notebook-import-implementation.md) — import .ipynb
- [progress/notebook-export-implementation.md](./progress/notebook-export-implementation.md) — export .ipynb
- [progress/notebook-sharing-implementation.md](./progress/notebook-sharing-implementation.md) — partage classes
- [progress/notebook-readonly-mode-progress.md](./progress/notebook-readonly-mode-progress.md) — mode étudiant
- [progress/notebook-test-enhancement-summary.md](./progress/notebook-test-enhancement-summary.md)

**V2 (2026-06)** :

- [../../wip/notebook-checkpoints-progress.md](../../wip/notebook-checkpoints-progress.md) — checkpoints V1 (3 modes) + hint feature
- [../../wip/notebook-pdf-export-progress.md](../../wip/notebook-pdf-export-progress.md) — pipeline Typst
- [../../wip/notebook-presentation-progress.md](../../wip/notebook-presentation-progress.md) — mode présentation UbuSlides
- [../../wip/notebook-templates-progress.md](../../wip/notebook-templates-progress.md) — templates V1
- [../../wip/notebook-ui-references.md](../../wip/notebook-ui-references.md) — benchmark Colab/Deepnote/Marimo + backlog UX
- [../../wip/checkform-unified-progress.md](../../wip/checkform-unified-progress.md) — cosmetic AST transformers (réutilisé par les checkpoints)

---

## 3. Debugger

**Intégré dans le Playground** (mode Debug via le toggle Execute/Debug).

Outil de **visualisation d'exécution style Python Tutor**, en **enregistrer-puis-rejouer** : en mode
Debug l'exécution est enregistrée automatiquement (mode live), puis l'élève **navigue** librement
dans la trace (avant/arrière) via un scrubber.

| Fonctionnalité     | Détails                                                                                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Moteur             | Tracer **`sys.settrace`** (`_chiphre_record_trace`) — **entre dans les fonctions** user (vraies frames, récursion, events `call`/`return`), ignore les libs (filtre `co_filename`) |
| Modèle             | **Enregistrer-puis-rejouer** : record de toute la trace, puis navigation. Plus de step live                                                                                        |
| Mode live          | Auto-record à l'entrée en Debug + ré-enregistrement débouncé (600 ms) à chaque modif du code                                                                                       |
| Trace              | Immuable, complète (budget `STEP_BUDGET = 1000` pas ; au-delà = tronquée)                                                                                                          |
| Scrubber           | Slider sur toute la trace + play/pause (autoplay) + compteur « pas i/N »                                                                                                           |
| Marqueurs          | Verts (appel) / bleus (retour) / rouges (exception) sur la timeline, dérivés de la profondeur de pile                                                                              |
| Navigation         | ◄ ► pas précédent/suivant (**entre** dans les fonctions) · ►► **enjamber** (step-over) · saut au point d'arrêt précédent/suivant                                                   |
| Points d'arrêt     | **Gouttière cliquable** dans l'éditeur (point rouge) → saut au prochain/précédent dans la trace                                                                                    |
| Variables / Frames | Locals/globals par frame, badges type, indicateurs new/modified ; panneau _Frames_ réel                                                                                            |
| Heap Visualization | Frames + Heap + flèches SVG cubic-Bézier (style Python Tutor), couleur stable par `id()`                                                                                           |
| Highlight ligne    | Fond jaune de la ligne courante ; **ne déplace pas le curseur** ; scroll seulement si l'éditeur n'a pas le focus                                                                   |
| Raccourcis         | F5 (forcer un ré-enregistrement) · F10 / F11 (pas suivant / précédent dans la trace)                                                                                               |

### Périmètre Heap

- **Sur la heap** : containers (list, dict, set, tuple, frozenset) + instances de classes utilisateur
- **Inline** : primitives (int, float, str, bool, None, complex, bytes)
- Cycles gérés via pré-insertion placeholder avant récursion

### Composants (`src/lib/components/python/debug/`)

`DebugToolbar`, `DebugPanel`, `VariablesPanel`, `VariablesHistory`, `CallStackPanel`, `LoopIndicator` (inutilisé — `loops` vide en settrace V1), `FramesPanel`, `HeapPanel`, `MemoryDiagramView`.

### Progression

- [progress/python-debugger-progress.md](./progress/python-debugger-progress.md) — Phases 1-6 (heap viz incluse)
- [../../wip/python-debugger-scrubber-progress.md](../../wip/python-debugger-scrubber-progress.md) — scrubber + moteur settrace + mode live
- [../../wip/python-debugger-improvements-roadmap.md](../../wip/python-debugger-improvements-roadmap.md) — **roadmap des améliorations** (#1→#7)

### Dette / suites (settrace V1)

- **Indicateur de boucle** (`LoopIndicator`) : `loops` vide depuis le passage à `sys.settrace` — à réimplémenter si besoin.
- **Code mort** : l'ancien interpréteur AST (`_chiphre_debug_generator` legacy, après `return`) — à retirer.
- **Perf** : record-then-replay pilote ~1000 aller-retours `postMessage` — optimisable en un message `debug-record`.

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
   - **`'unit_test'`** — appel positionnel d'une fonction nommée, comparé via une fonction Python récursive `_chiphre_compare` :
     - tuple ↔ list (la fonction peut retourner un tuple, l'attendu est une liste JSON — comparaison structurelle)
     - dict ↔ dict (clés + valeurs récursives)
     - numérique : tolérance configurable via le champ optionnel `tolerance: { eps_abs, eps_rel }` (compare avec `|a-b| ≤ max(eps_abs, eps_rel * max(|a|, |b|))`). Indispensable pour les algorithmes utilisant des transcendantales (`math.exp`, `math.log`) qui ne sont **pas** mandatées correctly-rounded par IEEE 754 — Pyodide et l'environnement de référence peuvent diverger de quelques ULP.
     - sinon `==` strict (string, bool, None)
   - **`'variable_check'`** — vérifie la valeur de variables du namespace après exécution du code de l'élève, sans imposer `print(...)`. Le teacher déclare `expected_vars: { x: 6, y: 7 }`, l'élève écrit `x = 2 * 3; y = x + 1` et c'est tout. Comparateur JS pur récursif (`validation/variable-compare.ts`) avec tolérance numérique, types stricts pour scalaires (`True ≠ 1`), tuple ≡ list au niveau JSON. Surface volontairement minimaliste : pas de stdin, pas de `setup_vars`, pas de `test_cases` multiples (utiliser `unit_test` pour ça). 42 tests unit + 13 tests Pyodide réels.
   - **`'reference_solution'`** — test différentiel : le teacher fournit une solution de référence cachée (`reference_code`), et le worker compare la fonction de l'élève contre elle sur un mix de **cas fixes** (sentinelles teacher-curated, `expected` hardcodé) et de **cas générés aléatoirement** (couverture large, reproductible via `seed`). Au moins un des deux doit être présent. Cas fixes : toutes les erreurs remontées. Cas générés : stop au 1er échec (focus contre-exemple style Hypothesis). Args deep-copiés via `copy.deepcopy` avant chaque appel pour ne pas que reference et student se contaminent mutuellement. 13 tests Pyodide réels.

**Pipeline** : si AST échoue → on s'arrête (`failed_layer: 'ast'`) ; sinon on exécute le behavior (`failed_layer: 'behavior'` ou `null` si tout passe). `ValidationResult.behavior_kind` indique quel kind a tourné (`'output' | 'unit_test' | 'variable_check' | 'reference_solution'`).

**Avant V2** (jusqu'au 2026-05-09) : 3 stratégies mutuellement exclusives (`output` | `unit_test` | `ast`), avec `ast + output_tests` comme seule combinaison possible. Le V2 supprime cette asymétrie : `ast + unit_test` est maintenant possible (cas typique : exo Bac avec fonction + défense `uses_loop`).

**Évolutions V2.1-V2.2** (2026-05-12 → 2026-05-13) : ajout de `variable_check` (4ème stratégie, anti-`print` boilerplate) puis `reference_solution` (5ème stratégie, test différentiel avec generator reproductible). Les deux suivent le même pattern orthogonal : combinables avec `ast_requirements`, types Zod + tests serveur + tests Pyodide réels.

### Locked zones — mode d'édition (orthogonal aux 5 stratégies)

**Ajouté 2026-05-13**. Mode d'édition où le teacher déclare des marqueurs `{{id | "default"}}` dans `starter_code` ; l'éditeur élève (`LockedPythonEditor.svelte` basé sur CodeMirror 6) rend ces zones surlignées + éditables, et **verrouille tout le reste** via `EditorState.transactionFilter`. Anti-triche paresseuse type `return 7` sur les exos `seuil()` parameterless.

| Élément                          | Description                                                                                                             |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Parser (`utils/locked-zones.ts`) | `parseTemplate`, `reconstructCode`, `renderDefaults` — utilitaires purs, 38 tests                                       |
| Composant élève                  | `LockedPythonEditor.svelte` — read-only outside zones, undo/redo passthrough, toast sur paste rejeté, bouton ↺ par zone |
| Composant teacher                | Preview live dans `ExerciseForm.svelte` (debounce 500ms), aide à la syntaxe, banner rouge si marqueurs malformés        |
| Server gate                      | `superRefine` sur `createExerciseSchema` + `updateExerciseSchema` — refuse les marqueurs malformés au save              |
| Stockage                         | Marqueurs inline dans `starter_code` (TEXT) — aucun schéma DB additionnel                                               |
| Single-line uniquement (V1)      | Le `transactionFilter` rejette les inserts contenant `\n`. Couvre 100% des `# à compléter` actuels du corpus Bac.       |
| Anti-bypass                      | UI uniquement (free-tier Vercel : pas de validation serveur). Acceptable car aucun résultat n'a de poids académique.    |
| Compatibilité                    | Orthogonal aux 5 stratégies. Exo sans marqueurs = `PythonEditor` classique (rétro-compat).                              |

→ Voir [../../wip/python-locked-zones-progress.md](../../wip/python-locked-zones-progress.md)

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
- **Bouton "Appeler" dans la toolbar de l'éditeur** (page consultation `/python-exercises/[id]`, exos `behavior?.kind === 'unit_test'`) — l'élève appelle la fonction avec des args personnalisés sans écrire de `print()`. Le formulaire vit au-dessus de l'éditeur Python : `funcname(` + input + `)` + ▶ icône, mais le `funcname(...)` n'est rendu **que si au moins un test case déclare des args positionnels** (`callTakesArgs`). Pour les fonctions parameterless, seule l'icône ▶ est affichée — le `title` du bouton porte « Appeler funcname ». Args parsés en JSON après wrap `[...]` (donc `4` ou `1, 2` ou `[1,2,3]` marchent). Implémenté en réutilisant `executor.validateExercise()` avec un test case unique à `expected: null` pour lire `actual` (zéro changement worker).
- **Panneau "Tester ma fonction"** (sous l'éditeur) — n'apparaît que lorsque l'élève a déjà appelé la fonction au moins une fois (résultat, erreur, ou historique non vide). Affiche le retour courant, l'éventuelle erreur runtime, et un `<details>` "Historique" listant les 5 derniers appels.
- **Bouton "Copier le lien"** sur la page consultation, visible aux teachers : copie l'URL publique de l'exo.
- Composants Pyodide partagés : `PythonEditor`, `PythonOutput`, `PlaygroundExecutor`

### Module `form-mapping.ts`

`src/lib/components/python/exercises/form-mapping.ts` centralise les transformations DB row ↔ ExerciseFormState ↔ PUT body (`buildInitialForm`, `buildSubmitBody`, `emptyExerciseForm`). Les pages create/edit et le script de round-trip importent les **mêmes fonctions** — pas de duplication, pas de drift silencieux possible.

Sémantique trim (vue par le test de round-trip) :

- `title`, `source` : single-line, `.trim()` (espaces accidentels coupés)
- `description`, `instructions`, `starter_code` : multi-line, **préservés byte-for-byte** (les newlines finaux des codes Python sont conservés). Seul le check vide → `null` utilise `.trim() === ''`.
- `solution_code` : préservé byte-for-byte, jamais touché.

### Test de round-trip — `scripts/test-exercise-round-trip.ts`

Script lecture-seule qui :

1. Lit chaque exercice (admin Supabase) + tags du junction
2. Sauvegarde la row dans `/tmp/exo-<UUID>-backup-<timestamp>.json`
3. Simule la chaîne `buildInitialForm → buildSubmitBody`
4. Diff la row originale vs ce qui serait sauvegardé champ par champ

```bash
pnpm tsx scripts/test-exercise-round-trip.ts          # tous les exos
pnpm tsx scripts/test-exercise-round-trip.ts <UUID>   # un seul
```

Une diff vide garantit qu'éditer-puis-sauvegarder-sans-changement ne mute pas la DB. Cas surface attrapé par cette protection : un `.trim() || null` qui grignotait les `\n` finaux du `starter_code` (commit `77235b4a7`).

### Corpus seedé

À ce jour, **30+ exercices Bac** sont seedés en DB via les migrations `20260510*_seed_*.sql` — couvre les principales académies françaises (Métropole, Polynésie, Asie, Centres étrangers, Amérique du Nord/Sud, Madagascar, Nouvelle Calédonie) sur 2021-2025. Type d'algorithmes couverts : suites arithmético-géométriques, suites quadratiques, sommes partielles, séries, intégrales, suites entrelacées, modèles compartimentaux. Tous les exos passent le round-trip test.

**Migrations de stratégies (2026-05-12 → 2026-05-13)** :

- `20260512234300_convert_bac_output_to_variable_check.sql` puis correctif `20260512235348_restore_tuple_exos_to_unit_test.sql` — convertit `panneaux` (script module-level) vers `variable_check`, restaure `ln(2)` et `termes` en `unit_test` (un overshoot du premier coup).
- `20260513112515_convert_bac_strong_to_reference_solution.sql` — convertit les 19 Bac avec fonction-à-paramètres de `unit_test` vers `reference_solution` (fixed cases conservés en sentinelles + generator adapté au domaine).
- `20260513215211_add_locked_zones_to_bac.sql` — wrap automatique des `# à compléter` de 27 Bac avec des marqueurs `{{id | "default"}}` (5 patterns regex : `while`, `var =`, `return`, `for ... in range()`, `...` orphelin).

**Scripts d'audit utilisables** :

- `scripts/audit-bac-exercises-for-reference-solution.ts` — classifie chaque Bac en STRONG/WEAK/NO candidate pour `reference_solution`.
- `scripts/audit-bac-locked-zones-candidates.ts` — détecte les exos avec `# à compléter` dans leur starter (candidats locked-zones).
- `scripts/generate-bac-reference-solution-migration.ts` + `scripts/generate-bac-locked-zones-migration.ts` — émettent leurs migrations à partir de la DB live.

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

## Schémas DB

### Migrations structurelles (DDL + RLS + RPC)

| Migration                                                           | Tables / changes                                                                                                                                                                         |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20251205100000_create_python_files.sql`                            | `python_files`, `python_file_assignments`                                                                                                                                                |
| `20251205160000_add_python_settings_to_profiles.sql`                | `profiles.python_settings` (JSONB)                                                                                                                                                       |
| `20251206010000_create_python_exercises.sql`                        | `python_exercises`, `python_exercise_assignments`, `python_exercise_submissions` (avec triggers)                                                                                         |
| `20251206020000_create_python_notebooks.sql`                        | `python_notebooks`, `python_notebook_assignments`                                                                                                                                        |
| `20260508114655_add_python_exercise_assignment_unique.sql`          | Unique constraints sur assignments (class XOR student)                                                                                                                                   |
| `20260508125858_python_exercises_public_anon.sql`                   | RLS : anon peut lire les exos `is_public: true`                                                                                                                                          |
| `20260508154124_drop_python_exercises_difficulty.sql`               | Drop colonne `difficulty`                                                                                                                                                                |
| `20260508155447_add_python_exercises_level.sql`                     | Ajout `level` (college/lycee/nsi/etudiant) — remplace `difficulty`                                                                                                                       |
| `20260508162152_create_python_tags.sql`                             | `python_tags` (vocabulaire Python séparé des math `tags`)                                                                                                                                |
| `20260509002840_allow_public_python_submissions.sql`                | RLS : élève peut soumettre librement sur exos publics (sans assignment)                                                                                                                  |
| `20260509091440_create_python_exercise_mastery.sql`                 | `python_exercise_mastery` (sticky `mastered`/`needs_review`) + trigger UPSERT auto sur INSERT                                                                                            |
| `20260509094828_normalize_exercise_tags.sql`                        | Jonctions `exercise_tags` + `python_exercise_tags` (drop `tags TEXT[]` des deux tables d'exos)                                                                                           |
| `20260509104544_fix_exercise_functions_after_tag_normalization.sql` | Reconstruction des 4 RPC `get_*_exercise[s_assignments]` (refs `e.tags` + `e.difficulty`)                                                                                                |
| `20260510093300_add_source_to_python_exercises.sql`                 | Colonne `source TEXT` (max 200, nullable) — origine de l'exercice                                                                                                                        |
| `20260510130000_refactor_python_validation_config.sql`              | **Refactor V2** : convertit `validation_config` legacy (`{type: 'ast'\|'output'\|'unit_test'}`) vers la forme orthogonale `{ast_requirements, behavior}` via CASE/WHEN. 12 rows migrées. |
| `20260510211427_demote_python_exercise_instruction_headings.sql`    | Nettoyage instructions seedées (headings markdown rétrogradés)                                                                                                                           |

### Migrations de conversions de stratégies (post-refactor V2)

| Migration                                                           | Action                                                                                                                                                                                                            |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `20260510210004_migrate_tuple_exos_to_unit_test.sql`                | Migre les exos retournant des tuples de `output` vers `unit_test`                                                                                                                                                 |
| `20260510214434_add_unit_test_tolerance_to_transcendental_exos.sql` | Ajoute `tolerance` aux exos utilisant `math.exp`/`math.log` (divergences ULP entre Pyodide et ref)                                                                                                                |
| `20260512234300_convert_bac_output_to_variable_check.sql`           | Convertit les scripts module-level (`print(...)`) vers `variable_check` (anti-print boilerplate)                                                                                                                  |
| `20260512235348_restore_tuple_exos_to_unit_test.sql`                | Correctif : restaure `ln(2)` et `termes` en `unit_test` (overshoot de la migration précédente)                                                                                                                    |
| `20260513112515_convert_bac_strong_to_reference_solution.sql`       | Convertit 19 Bac avec fonction-à-paramètres de `unit_test` vers `reference_solution` (fixed + generator)                                                                                                          |
| `20260513215211_add_locked_zones_to_bac.sql`                        | Wrap les `# à compléter` de 27 Bac avec marqueurs `{{id \| "default"}}` (5 patterns regex)                                                                                                                        |
| `20260514010325_fix_locked_zones_while_default.sql`                 | Correctif default des marqueurs dans les `while ...:`                                                                                                                                                             |
| `20260514011041_restore_locked_zones_while_ellipsis_default.sql`    | Restaure le default `...` pour les marqueurs `while`                                                                                                                                                              |
| `20260603103958_create_notebook_checkpoint_runs.sql`                | **Notebook V2** : `python_notebook_checkpoint_runs` (PK notebook+user+cell, status passed/failed, latest only via UPSERT) + 4 policies RLS                                                                        |
| `20260604080553_python_notebook_templates.sql`                      | **Notebook V2** : `python_notebooks` += `is_template boolean NOT NULL DEFAULT false` + `template_category text` + index partiel sur `is_template = true`                                                          |
| `20260604085002_notebook_checkpoint_runs_attempts.sql`              | **Notebook V2** : `python_notebook_checkpoint_runs` += `attempt_count`, `first_attempted_at`, `succeeded_at`, `hint_revealed` + 2 RPC SECURITY INVOKER (`upsert_checkpoint_run`, `mark_checkpoint_hint_revealed`) |

### Seeds (data only)

| Migration                                                                   | Contenu                                                                                                        |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `20260508163407_seed_python_exercises_samples.sql`                          | 5 exos seed (1 par stratégie + `ast+output_tests`)                                                             |
| `20260510071340_seed_terminale_seuil_exercises.sql`                         | 3 exos seuil terminale spé (arithmético-géométrique, géométrique, ζ(2))                                        |
| `20260510073029_seed_pyramide_bac_polynesie_2024_exercise.sql`              | Bac Polynésie 09/2024 (somme des carrés via boucle `for`)                                                      |
| `20260510093301_backfill_source_seeded_exercises.sql`                       | Backfill `source` sur les 4 exos déjà seedés                                                                   |
| `20260510094757_seed_croisement_populations_bac_centres_etrangers_2025.sql` | Bac Centres étrangers 06/2025                                                                                  |
| `20260510095758_seed_posidonie_bac_metropole_2025.sql`                      | Bac Métropole 06/2025 (algo de seuil)                                                                          |
| `20260510130100_seed_briggs_bac_amerique_nord_2025.sql`                     | Bac Amérique du Nord 05/2025 (premier exo nativement V2)                                                       |
| `20260510134313` → `20260510162003` (22 migrations)                         | 22 Bac 2021-2024 (Métropole, Polynésie, Asie, Centres étrangers, Amérique N/S, Madagascar, Nouvelle Calédonie) |

→ Total : **28 exos Bac** seedés en DB. Liste complète : `ls supabase/migrations/2026051*seed*.sql`.

Helpers `SECURITY DEFINER` partagés : `is_teacher_of_student`, `is_student_in_class`, `is_teacher_of_class`, `is_admin`, `is_file_assigned_to_student`, `is_notebook_assigned_to_student`, `count_user_python_files`, `count_user_notebooks`.

---

## Index chronologique

→ Voir [progress/INDEX.md](./progress/INDEX.md) pour le récap chronologique de tous les jalons (~100+ commits, 2025-12-04 → 2026-05-09).

---

## Tests

```bash
# Store playground (61 tests)
pnpm test:client src/lib/stores/pythonPlayground.svelte.test.ts

# Output component (36 tests)
pnpm test:client src/lib/components/python/PythonOutput.svelte.test.ts

# Debugger (137 tests : 43 types + 70 protocole + 24 heap-utils)
pnpm test:server src/lib/shared/python/debug/types.test.ts
pnpm test:server src/lib/shared/python/worker/messages.debug.test.ts
pnpm test:client src/lib/components/python/debug/heap-utils.test.ts

# Examples library (25 tests : 4 index + 21 utils)
pnpm test:server src/lib/data/python-examples/

# Notebook import/export (59 tests round-trip : 37 import + 22 export)
pnpm test:server src/lib/utils/notebook-import.test.ts
pnpm test:server src/lib/utils/notebook-export.test.ts

# Notebook V2 (2026-06)
# CheckpointCell rendering + status + button + hint reveal (20 tests)
pnpm test:client src/lib/components/notebook/CheckpointCell.svelte.test.ts
# Zod schemas notebook content + checkpoint config + hint (14 tests)
pnpm test:server src/lib/server/validation/notebooks.test.ts
# Typst NotebookGenerator (markdown/code/checkpoint/outputs/security) (38 tests)
pnpm test:server src/lib/typst/generators/notebook-generator.test.ts
# PDF filename sanitization + date suffix (7 tests)
pnpm test:server src/lib/typst/notebook-pdf.test.ts
# Cosmetic AST transformers reused by checkpoint validation (47 tests)
pnpm test:server src/lib/mathAST/cosmetic-transforms.test.ts

# Executor + validation (138 tests : 14 base + 57 Pyodide réel + 50 output + 42 variable + 38 locked-zones)
pnpm test:client src/lib/shared/python/execution/base-executor.svelte.test.ts
pnpm test:client src/lib/shared/python/execution/exercise-validation-real.svelte.test.ts
pnpm test:server src/lib/shared/python/validation/output-compare.test.ts
pnpm test:server src/lib/shared/python/validation/variable-compare.test.ts
pnpm test:server src/lib/utils/locked-zones.test.ts
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
- [ ] a11y SVG canvas debug : 25 warnings supprimés via `svelte-ignore`, vraie accessibilité clavier/screen-reader pas implémentée — voir `docs/ref/warning-svelte.md`
- [ ] Tests composants notebook (CheckpointCell ✅ ; les autres `.svelte` non testés, manuels)
- [ ] Variable inspector sidebar dans notebook
- [ ] Notebook search (find in cells)

### Backlog Notebook V2 (post-V1 features 2026-06)

**Checkpoint cells / présentation** :

- [ ] « Run all above » sur les slides checkpoint (équivalent Jupyter)
- [ ] Reset kernel button dans le header présentation
- [ ] Refactor type union discriminée propre sur `NotebookCell` (élimine le cast `as CheckpointCell`)
- [x] **Affichage tentatives élève sur le dashboard Résultats** (livré 2026-06-04 commit `b636e4df0` — compteur hybride DB + in-memory)

**Templates V2** :

- [ ] Aperçu inline des 3-4 premières cellules dans `TemplateCard`
- [ ] Catégories prédéfinies via `MySelect` (dropdown + fallback texte libre)
- [ ] Templates système UbuMaths seedés par migration (TP intro Python, Stats descriptives, Tracé matplotlib)
- [ ] Compteur d'usages (`clone_count`) + tri "Plus utilisés"
- [ ] Édition d'un template depuis la gallery (sans rouvrir l'éditeur)
- [ ] Filtres/recherche dans la gallery

**PDF** :

- [ ] Page de garde personnalisable via templates Typst
- [ ] Export PDF par élève depuis dashboard résultats (avec statuts checkpoints)
- [ ] Batch zip "PDFs de toute la classe"
- [ ] Parser HTML pour les `text/html` DataFrames (au lieu du fallback text/plain)

**MarkdownCell V2** :

- [ ] Upload image vers bucket `notebook-images` (bucket dédié + RLS + service)
- [ ] Système de variables (paramétrisation par élève, comme exos)
