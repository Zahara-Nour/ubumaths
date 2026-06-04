# Python Ecosystem - Architecture

Detailed architecture documentation for the Python ecosystem (Playground, Notebook, Debugger).

> **Cette doc couvre l'architecture transversale.** Pour les détails du Playground spécifiquement, voir [components.md](./components.md), [store.md](./store.md), [worker.md](./worker.md). Pour la vue ecosystem, voir [README.md](./README.md).

## System Design

### Design Principles

1. **Non-blocking execution**: Python runs in a Web Worker to keep UI responsive
2. **Type safety**: Full TypeScript with Zod validation for worker messages
3. **Reactive state**: Svelte 5 runes for automatic UI updates
4. **Progressive enhancement**: Fallback textarea if CodeMirror fails to load
5. **Offline-capable**: Pyodide cached by browser after first load (Service Worker)
6. **Single Pyodide, multiple namespaces**: Multi-context worker partage un seul Pyodide entre playground et notebooks
7. **Reusable executor**: Pattern `BasePythonExecutor` permet de réutiliser la logique d'exécution dans différents contextes (playground vs notebook)

## Executor Pattern (refactor 2025-12-06)

Pour mutualiser la logique entre Playground et Notebook (et pouvoir greffer le Debugger), un pattern d'executor a été extrait :

```
                    ┌─────────────────────────┐
                    │   BasePythonExecutor    │
                    │       (abstract)        │
                    │                         │
                    │ - initPyodide()         │
                    │ - execute(code)         │
                    │ - cancel()              │
                    │ - requestCompletion()   │
                    │ - startDebugSession()   │
                    │ - debugStep()           │
                    │ - destroy()             │
                    │ - onDebugSnapshot()  ◄──┼─ hooks protégés
                    │ - onDebugPaused()    ◄──┼─ pour sous-classes
                    │ - onDebugFinished()  ◄──┘
                    └────────────┬────────────┘
                                 │
                ┌────────────────┴────────────────┐
                │                                 │
    ┌───────────▼───────────┐         ┌───────────▼───────────┐
    │  PlaygroundExecutor   │         │   NotebookExecutor    │
    │                       │         │                       │
    │ contextId: undefined  │         │ contextId:            │
    │ (reset entre exec)    │         │   notebook_${id}      │
    │                       │         │ (variables persistent)│
    │                       │         │                       │
    │ onDebugSnapshot →     │         │ resetKernel() vide    │
    │   debugStore.push()   │         │   le namespace        │
    └───────────────────────┘         └───────────────────────┘
```

**Avantages** :

- Le debugger fonctionne **dans le playground** sans dupliquer la logique
- Le notebook a sa propre logique de cellules tout en réutilisant l'init Pyodide / autocomplete
- Les stores (`pythonPlayground.svelte`, `notebookStore.svelte`) wrappent leur executor

→ Voir [executor-pattern.md](./executor-pattern.md) (référence à jour) · [progress/python-executor-pattern.md](./progress/python-executor-pattern.md) (refactor d'origine)

## Multi-Context Worker

Un seul Pyodide est chargé en mémoire. Chaque "contexte" (playground, notebook A, notebook B) a son propre **namespace Python isolé** :

```
┌─────────────────────────────────────────────────────────────┐
│                      pyodide.worker.ts                      │
│                                                             │
│   Pyodide instance (~10MB initial, +5-8MB par package)      │
│                                                             │
│   contexts: Map<contextId, PyDict>                          │
│   ├─ undefined          → playground namespace              │
│   ├─ notebook_abc-123   → cellules notebook abc-123         │
│   └─ notebook_def-456   → cellules notebook def-456         │
│                                                             │
│   execute(code, contextId) :                                │
│     ns = contexts.get(contextId) || createNew()             │
│     pyodide.runPython(code, { globals: ns })                │
└─────────────────────────────────────────────────────────────┘
```

**Avantages** :

- 1 seule init Pyodide, peu importe le nombre de notebooks ouverts
- Variables persistent entre cellules d'un même notebook
- Cancel/timeout par execution, pas par contexte
- `resetKernel(contextId)` recrée juste le namespace, pas Pyodide

→ Voir [progress/python-worker-multicontext.md](./progress/python-worker-multicontext.md)

### Technology Choices

#### Why Pyodide?

- **Full CPython**: Real Python 3.12+, not a subset
- **Scientific stack**: NumPy, Matplotlib, SymPy work out of the box
- **No server**: Everything runs client-side
- **WebAssembly**: Near-native performance for computation

#### Why Web Worker?

- **Non-blocking**: Python execution doesn't freeze the UI
- **Timeout handling**: Can interrupt runaway code
- **Memory isolation**: Python memory separate from main thread
- **Clean messaging**: Structured postMessage communication

#### Why CodeMirror 6?

- **Modern architecture**: Modular, tree-shakeable
- **Excellent Python support**: Syntax highlighting, indentation
- **Extensible**: Custom autocompletion integration
- **Performance**: Virtual rendering for large files

## Data Flow

### Bidirectional Communication

```
┌─────────────────────────────────────────────────────────────────┐
│                        MAIN THREAD                              │
│                                                                 │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   Editor    │◄──►│   Store     │◄──►│      Output         │  │
│  │ (CodeMirror)│    │  (pythonStore)   │   (Results)         │  │
│  └─────────────┘    └──────┬──────┘    └─────────────────────┘  │
│                            │                                    │
│                            │ postMessage                        │
└────────────────────────────┼────────────────────────────────────┘
                             │
                     ┌───────▼───────┐
                     │  MessagePort  │
                     └───────┬───────┘
                             │
┌────────────────────────────┼────────────────────────────────────┐
│                            │                                    │
│                     WEB WORKER                                  │
│                                                                 │
│  ┌─────────────────────────▼─────────────────────────────────┐  │
│  │                   Message Handler                          │  │
│  │   switch(message.type) {                                   │  │
│  │     case 'init': initializePyodide()                       │  │
│  │     case 'execute': executeCode()                          │  │
│  │     case 'cancel': cancelExecution()                       │  │
│  │     case 'autocomplete': handleAutocomplete()              │  │
│  │   }                                                        │  │
│  └─────────────────────────┬─────────────────────────────────┘  │
│                            │                                    │
│  ┌─────────────────────────▼─────────────────────────────────┐  │
│  │                      Pyodide                               │  │
│  │   ┌─────────┐ ┌─────────────┐ ┌─────────────┐             │  │
│  │   │  NumPy  │ │ Matplotlib  │ │   SymPy     │             │  │
│  │   └─────────┘ └─────────────┘ └─────────────┘             │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Message Types

> Définitions complètes dans `src/lib/shared/python/types.ts`. Tableau récapitulatif et détails dans [`worker.md § Protocole de messages`](./worker.md#protocole-de-messages).

#### Main Thread → Worker

```typescript
type ToWorkerMessage =
	// Initialisation et exécution
	| { type: 'init' }
	| { type: 'execute'; code: string; id: string; contextId?: string }
	| { type: 'cancel'; id: string }
	| { type: 'autocomplete'; code: string; cursor: number; id: string; contextId?: string }
	// Multi-context (notebook)
	| { type: 'create-context'; contextId: string; persistent: boolean }
	| { type: 'destroy-context'; contextId: string }
	| { type: 'reset-context'; contextId: string }
	// Validation
	| { type: 'validate'; code: string; config: ValidationConfig; id: string }
	| { type: 'validate-exercise'; code: string; config: ExerciseValidationConfig; id: string }
	// Debugger
	| { type: 'debug-start'; code: string; id: string; breakpoints: WorkerBreakpoint[] }
	| { type: 'debug-step'; id: string; action: DebugStepAction }
	| { type: 'debug-stop'; id: string };
```

#### Worker → Main Thread

```typescript
type FromWorkerMessage =
	// Loading
	| { type: 'loading-progress'; percent: number; stage: string }
	| { type: 'pyodide-ready' }
	| { type: 'packages-loading'; packages: string[]; id: string }
	| { type: 'packages-loaded'; packages: string[]; id: string }
	// Output
	| { type: 'stdout'; data: string; id: string }
	| { type: 'stderr'; data: string; id: string }
	| { type: 'plot'; imageData: string; id: string } // Matplotlib PNG base64
	| { type: 'plotly'; jsonSpec: string; id: string } // Plotly JSON spec
	| { type: 'latex'; latex: string; id: string } // SymPy LaTeX
	// Exécution
	| { type: 'error'; message: string; line?: number; id: string }
	| { type: 'complete'; id: string; duration: number }
	| { type: 'timeout'; id: string }
	| { type: 'autocomplete-result'; completions: CompletionItem[]; id: string }
	// Multi-context acks
	| { type: 'context-created'; contextId: string }
	| { type: 'context-destroyed'; contextId: string }
	| { type: 'context-reset'; contextId: string }
	// Validation
	| { type: 'validation-result'; result: ValidationResult; id: string }
	| { type: 'validation-exercise-result'; result: ExerciseValidationResult; id: string }
	// Debugger
	| { type: 'debug-snapshot'; id: string; snapshot: DebugSnapshot }
	| { type: 'debug-paused'; id: string; reason: DebugPauseReason }
	| { type: 'debug-finished'; id: string; duration: number };
```

Total : **13 types entrants**, **21 types sortants** — discriminés par `type`, validés Zod aux deux extrémités (`fromWorkerMessageSchema`, `toWorkerMessageSchema`).

### Execution ID System

Every execution has a unique ID to prevent race conditions:

```typescript
const executionId = `exec-${Date.now()}-${Math.random().toString(36).slice(2)}`;
```

This ensures:

- Messages from old executions are ignored
- Cancellation targets the correct execution
- Timeout handling is precise

## Component Architecture

### Hierarchy

```
+page.svelte
│
└── PythonPlayground.svelte (container)
    │
    ├── PythonToolbar.svelte
    │   └── Action buttons with event handlers
    │
    ├── PythonEditor.svelte
    │   ├── CodeMirror 6 instance
    │   ├── Error line highlighting
    │   └── Autocompletion integration
    │
    ├── PythonSplitter.svelte (desktop only)
    │   └── Draggable resize handle
    │
    └── PythonOutput.svelte
        ├── stdout display
        ├── stderr display (with pedagogic messages)
        ├── Plot display (with download)
        └── LaTeX display (MathLive)
```

### Props Flow

```
                    pythonStore (singleton)
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
    ┌──────────────┐ ┌──────────┐ ┌────────────┐
    │ Toolbar      │ │ Editor   │ │ Output     │
    │              │ │          │ │            │
    │ canExecute   │ │ value    │ │ stdout     │
    │ isExecuting  │ │ errorLine│ │ stderr     │
    │ isModified   │ │ fontSize │ │ plotData   │
    │ fontSize     │ │          │ │ latexOutput│
    └──────────────┘ └──────────┘ └────────────┘
```

## State Management

### Store Class (Svelte 5 Runes)

```typescript
class PythonPlaygroundStore {
	// Reactive state
	state = $state<PlaygroundState>('initial');
	code = $state(DEFAULT_CODE);
	stdout = $state('');
	stderr = $state('');
	plotData = $state<string | null>(null);
	latexOutput = $state<string | null>(null);
	fontSize = $state(14);
	errorLine = $state<number | null>(null);

	// Derived state
	isReady = $derived(this.state === 'ready');
	isExecuting = $derived(this.state === 'executing');
	isLoading = $derived(this.state === 'loading-pyodide' || this.state === 'loading-packages');
	hasOutput = $derived(this.stdout.length > 0 || this.stderr.length > 0 || this.plotData !== null);
}

export const pythonStore = new PythonPlaygroundStore();
```

### State Transitions

```
initial ──initPyodide()──► loading-pyodide
                               │
                               ▼
                         loading-packages
                               │
                               ▼
ready ◄─────complete/error/timeout──── executing
  │                                        ▲
  └────────────execute()───────────────────┘
```

## Error Handling

### Layer 1: Worker Errors

```typescript
this.worker.onerror = (event: ErrorEvent) => {
	this.state = 'error';
	this.stderr = `Erreur du worker: ${event.message}`;
};
```

### Layer 2: Python Errors

```python
def _ubumaths_reformat_exception():
    """Extract concise error message from Python traceback."""
    # Returns: "File '<exec>', line 5\nNameError: name 'x' is not defined"
```

### Layer 3: Timeout Protection

```typescript
// Main thread timeout (backup)
this.executionTimeout = setTimeout(() => {
	this.stderr = "Délai d'exécution dépassé (30 secondes)";
	this.state = 'ready';
	this.postToWorker({ type: 'cancel', id: executionId });
}, PYODIDE_CONFIG.TIMEOUT_MS + TIMEOUT_BUFFER_MS);

// Worker timeout (primary)
executionTimeout = setTimeout(() => {
	postMessage({ type: 'timeout', id });
}, PYODIDE_CONFIG.TIMEOUT_MS);
```

### Layer 4: Pedagogic Messages

```typescript
const ERROR_TRANSLATIONS = {
	syntaxError: {
		pattern: /SyntaxError:\s*(.+)/i,
		message: 'Erreur de syntaxe : vérifiez la ponctuation...'
	},
	nameError: {
		pattern: /NameError:\s*name\s+'([^']+)'\s+is not defined/i,
		message: "Variable non définie : '$1' n'existe pas..."
	}
	// ... 11 more error types
};
```

## URL Sharing System

### Compression

Uses LZ-String for efficient URL-safe compression:

```typescript
import LZString from 'lz-string';

generateShareUrl(): string {
  const compressed = LZString.compressToEncodedURIComponent(this.code);
  if (compressed.length > 2000) {
    throw new Error('Le code est trop long pour être partagé via URL');
  }
  const url = new URL(window.location.href);
  url.searchParams.set('code', compressed);
  return url.toString();
}

loadFromUrl(url: URL): boolean {
  const codeParam = url.searchParams.get('code');
  const decompressed = LZString.decompressFromEncodedURIComponent(codeParam);
  this.code = decompressed;
  return true;
}
```

### URL Structure

```
https://ubumaths.fr/python?code=NobwRAxg9gJgpmAXGA9CgBAFQBYEsDO...
                          └─────────────────────────────────────┘
                               LZ-String compressed Python code
```

## Autocompletion System

### Flow

```
1. User types in editor
       │
2. CodeMirror calls pythonCompletions()
       │
3. Match word before cursor: /[\w.]+/
       │
4. Debounce 150ms
       │
5. Send to worker: { type: 'autocomplete', code, cursor }
       │
6. Worker: Python introspection
   - For "np.": dir(np) + getattr() for types
   - For "pri": globals() + builtins + keywords
       │
7. Return completions with types
       │
8. Map to CodeMirror format
```

### Python Introspection

```python
def _ubumaths_get_completions(code, cursor_pos):
    """Get completions at cursor position."""

    # For "np.lin" → complete np attributes starting with "lin"
    if '.' in word:
        obj = eval(base_path)
        return [
            {'label': attr, 'type': get_type(getattr(obj, attr))}
            for attr in dir(obj)
            if attr.startswith(prefix)
        ]

    # For "prin" → complete from globals + builtins + keywords
    else:
        return [
            {'label': name, 'type': get_type(globals().get(name))}
            for name in all_names
            if name.startswith(prefix)
        ]
```

## Responsive Design

### Breakpoints

```css
/* Mobile (< lg) */
flex-direction: column;
/* Editor on top, Output below */

/* Desktop (>= lg) */
flex-direction: row;
/* Editor left, Splitter, Output right */
```

### Splitter Constraints

```typescript
const MIN_WIDTH = 20; // Left panel minimum 20%
const MAX_WIDTH = 80; // Left panel maximum 80%
const DEFAULT_WIDTH = 50;
```

## Memory Management

### Worker Cleanup

```python
def _ubumaths_cleanup():
    """Clean up after execution."""
    plt.close('all')  # Close matplotlib figures
    gc.collect()      # Force garbage collection
```

### Main Thread Cleanup

```typescript
destroy(): void {
  this.worker?.terminate();
  this.clearExecutionTimeout();
  // Reject pending autocomplete requests
  for (const pending of this.pendingCompletions.values()) {
    pending.reject(new Error('Worker destroyed'));
  }
}
```

## Loading Stages

### Initial Pyodide Load

```typescript
const LOADING_STAGES = [
	{ percent: 0, stage: 'Initialisation...' },
	{ percent: 20, stage: 'Téléchargement de Python...' },
	{ percent: 100, stage: 'Prêt !' }
];
```

### Lazy Package Loading

When code imports numpy, matplotlib, or sympy:

```typescript
// Sent to main thread
{ type: 'packages-loading', packages: ['numpy'] }
// After loading
{ type: 'packages-loaded', packages: ['numpy'] }
```

Packages are cached after first load (no re-download on subsequent executions).

### Plotly Loading

Plotly.js is loaded from CDN on-demand when `plotlyData` message is received:

```typescript
const PLOTLY_CDN = 'https://cdn.plot.ly/plotly-2.27.0.min.js';

// Loaded and cached in browser
// No additional messages - renders directly in component
```

## Zod Validation

All messages are validated with Zod schemas:

```typescript
// Worker → Main validation
const fromWorkerMessageSchema = z.discriminatedUnion('type', [
	z.object({ type: z.literal('loading-progress'), percent: z.number(), stage: z.string() }),
	z.object({ type: z.literal('pyodide-ready') }),
	z.object({ type: z.literal('stdout'), data: z.string(), id: z.string() })
	// ... more message types
]);

// In message handler
const validation = fromWorkerMessageSchema.safeParse(event.data);
if (!validation.success) {
	console.error('Invalid worker message:', validation.error.issues);
	return;
}
```

## Locked Zones (exercices "fill-in-the-blanks")

Mode d'édition d'exercice où le teacher déclare des marqueurs `{{id | "default"}}` dans `starter_code`. L'éditeur élève rend ces zones surlignées + éditables, et **verrouille tout le reste**. Orthogonal aux 5 stratégies de validation (cumulable avec n'importe laquelle).

### Pipeline

```
       teacher écrit                      élève voit
   ┌────────────────────────┐        ┌─────────────────────────┐
   │ # à compléter          │        │ # à compléter           │
   │ x = {{val | "0"}}      │ ────► │ x = ▓0▓                 │   ← zone éditable surlignée
   │ print(x)               │        │ print(x)  ░░░░░░░░░░░░░ │   ← reste read-only
   └────────────────────────┘        └─────────────────────────┘
       template stocké en DB              reconstructCode()
                                          envoyé au worker
```

### Composants

| Pièce                                       | Rôle                                                                                             |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `src/lib/utils/locked-zones.ts`             | `parseTemplate`, `reconstructCode`, `renderDefaults` — utilitaires purs (38 tests)               |
| `LockedPythonEditor.svelte`                 | CodeMirror 6 + `EditorState.transactionFilter` qui rejette tout insert hors zones (et tout `\n`) |
| `ExerciseForm.svelte` (preview)             | Rendu live côté teacher (debounce 500 ms) + banner rouge si marqueurs malformés                  |
| `createExerciseSchema.superRefine` côté Zod | Server gate qui refuse les marqueurs malformés au save                                           |

### Contraintes V1

- **Single-line uniquement** : `\n` rejeté par le filter (couvre 100 % des `# à compléter` actuels du corpus Bac).
- **Anti-bypass UI-only** : free-tier Vercel pas de validation serveur de la zone modifiée. Acceptable car aucun résultat n'a de poids académique.
- **Stockage inline** : marqueurs dans `starter_code` (TEXT), aucun schéma DB additionnel.
- **Compatibilité** : exo sans marqueurs = `PythonEditor` classique (rétro-compat).

### Hooks dans le worker

Le worker n'a **rien à savoir** des locked zones : il reçoit le code reconstruit (`reconstructCode(template, currentZones)`) exactement comme un code normal. Toute la logique est côté main thread.

---

## Notebook V2 (2026-06)

Trois pipelines additionnels ont été greffés sur le notebook ; aucun ne touche au worker Pyodide ni à l'executor pattern.

### Pipeline export PDF (Typst)

```
notebook.content.cells[]
       │
       ▼
NotebookGenerator (src/lib/typst/generators/notebook-generator.ts)
       │   ├─ markdown cell → parseMarkdown(source) + generateTypst(ast)  (UbuMark)
       │   ├─ code cell     → #raw(block:true, lang:"python", "<escaped>")
       │   ├─ output stream → #raw block coloré (gray/red)
       │   ├─ output PNG    → #image("/notebook/cell-X/output-Y.png")
       │   └─ checkpoint    → #block ambré + spec mode + hint si includeHints
       │
       ▼
extractInlineImages(notebook) → Map<virtualPath, Uint8Array>
       │
       ▼
service.mapShadowBatch(map)
       │
       ▼
generatePdfFromTypst(() => typstContent)
       │   ├─ getTypstService().compile(typst, { format: 'pdf' })
       │   ├─ Typst WASM compile (queue + cache)
       │   └─ resetShadow() au cleanup
       ▼
Uint8Array PDF → Blob + download
```

**Sécurité d'injection** : `escapeTypstBrackets` sur tout contenu utilisateur interpolé dans un bloc `[...]` (titres, hints, error names). Code source dans `#raw(...)` plutôt qu'un fence markdown → pas de breakout via ` ``` `. `escapeRawTypst` escape `\` et `"` pour les string literals Typst.

**Math** : `markdownToTypst` gère les 4 syntaxes UbuMark (`$..$`, `$$..$$`, `~..~`, `~~..~~`) via la branche `node.syntax === 'custom' ? expressionToLatex(...) : toFrenchDecimal(...)` puis `convertLatexToTypstMath` — partagé avec le pipeline worksheet, **0 duplication**.

→ Voir `src/lib/typst/notebook-pdf.ts` (wrapper) + `src/lib/typst/generators/notebook-generator.ts` (générateur) + `docs/wip/notebook-pdf-export-progress.md`.

### Mode présentation (UbuSlides)

Route `/python-notebook/[id]/present` → mount d'une nouvelle `NotebookStore` (Pyodide isolé) + boucle sur cells qui mappe chaque type vers une slide.

```
<Deck config={{ scaleContent: false, ... }}>
  {#each cells as cell (cell.id)}
    {#if cell.type === 'markdown'} <UbuMarkSlide content={cell.source} />
    {:else if cell.type === 'code'} <Slide><NotebookCodeSlide ... /></Slide>
    {:else if cell.type === 'checkpoint'} <Slide><NotebookCheckpointSlide ... /></Slide>
    {/if}
  {/each}
</Deck>
```

`scaleContent: false` désactive le scaling 1920×1080 par défaut d'UbuSlides — la slide remplit le container avec scroll natif. Choix justifié par : live coding outputs imprévisibles, cellules code potentiellement longues, cohérence avec l'éditeur.

`notebook.previewMode = true` → skip du POST `/checkpoint-runs` (sinon RLS refuse pour le prof sur son propre notebook + on ne veut pas polluer le dashboard avec des essais de démo en classe).

Navigation : `Deck` route ←/→ via `actions/keyboard.ts`, hash URL `#/N` via `navigation/hash.ts` (avec `replaceState` depuis `$app/navigation` pour ne pas faire warner SvelteKit), Esc remonté au `<svelte:window>` de la page (avec `e.defaultPrevented` guard pour ne pas conflicter avec le Deck overview).

→ Voir `docs/wip/notebook-presentation-progress.md`.

### Templates (clone + save-as)

Schéma : `python_notebooks += is_template boolean NOT NULL DEFAULT false + template_category text` + index partiel `WHERE is_template = true`. Les policies RLS existantes (own + public+teacher + assigned) couvrent tout — aucune nouvelle policy.

3 endpoints :

| Endpoint                                                | Action                                             |
| ------------------------------------------------------- | -------------------------------------------------- |
| `GET /api/python-notebook-templates`                    | Liste own + public, 403 students                   |
| `POST /api/python-notebooks/from-template/[templateId]` | Clone, régénère cell IDs, défaut `is_public=false` |
| `POST /api/python-notebooks/[id]/save-as-template`      | CRÉE une copie marquée template (source intact)    |

Régénération des cell IDs au clone via le même pattern `cell-${Date.now()}-${rand}` que le store. Outputs/execution_count/state wipés ; metadata `last_executed_source` strippé (sinon faux « modified » dot dans la gouttière).

Défense en profondeur :

- Gallery query `narrower than RLS` (`.or(own | public)`) — pas de path roundabout via assignments
- `/api/python-notebooks/[id]/share` refuse `is_template = true` (cloner d'abord)
- `GET /api/python-notebooks` filtre `is_template = false` (templates n'apparaissent pas dans la liste classique)

→ Voir `docs/wip/notebook-templates-progress.md`.

### Checkpoint cells

Cellules de vérification d'exercice intégrées au flux notebook. Réutilisent `validateExercise(code, config, contextId)` côté NotebookExecutor (la même brique que les exercices Python). 3 modes : `assert`, `unit_test`, `variable_check` — `CheckpointConfig` est un discriminated union.

Persistance via `python_notebook_checkpoint_runs` (PK `(notebook_id, user_id, cell_id)`, latest only, UPSERT `ON CONFLICT DO UPDATE`).

**Hint feature** : champ optionnel `hint?: string` sur la cellule (pas dans `checkpoint`, pour ne pas alourdir le payload de validation). Le compteur d'échecs `notebook.checkpointFailedAttempts: Record<cellId, number>` est volontairement **in-memory** — un reload remet à 0, matche le framing « gagner l'indice ».

**Bug postMessage important** : `cell.checkpoint.test_cases` / `expected_vars` sont des proxies `$state` Svelte 5. Le structured clone du Worker refuse les Proxy → `$state.snapshot(...)` est appliqué dans `checkpointConfigToValidationConfig` avant le post au worker. Toucher les deux endpoints (clone notebook + save-as-template) sans ce fix produit `[object Array] could not be cloned`.

→ Voir `docs/wip/notebook-checkpoints-progress.md`.

---

## Pointeurs

- Vue d'ensemble fonctionnelle → [`README.md`](./README.md)
- Worker (protocole + multi-context + validation) → [`worker.md`](./worker.md)
- Executor pattern → [`executor-pattern.md`](./executor-pattern.md)
- Store playground → [`store.md`](./store.md)
- Composants Svelte → [`components.md`](./components.md)
