# Python Ecosystem — Composants

Documentation des composants Svelte 5 de `src/lib/components/python/`. Tous utilisent **Svelte 5 runes** + Shadcn-svelte + Tailwind + MathLive.

> Les composants du notebook sont dans `src/lib/components/notebook/` (`NotebookView`, `NotebookCell`, `CodeCell`, `MarkdownCell`, `NotebookToolbar`, `NotebookStatusBar`, `CellGutter`, `CellOutputs`, `KeyboardShortcutsHelp`, `ShareNotebookDialog`).

---

## Arborescence

```
src/lib/components/python/
├── index.ts                          # Re-exports : Playground, Toolbar, Editor, Output, Splitter
├── PythonPlayground.svelte           # Container principal
├── PythonToolbar.svelte              # Barre d'actions
├── PythonEditor.svelte               # CodeMirror 6 + autocomplete Pyodide
├── PythonOutput.svelte               # stdout/stderr/plot/latex/plotly
├── PythonSplitter.svelte             # Splitter draggable horizontal
├── PythonSettings.svelte             # Modale paramètres (thème, font, errors)
├── PythonFileManager.svelte          # Dialog "Mes fichiers / Assignés / Bibliothèque"
├── PythonSaveDialog.svelte           # Dialog sauvegarde cloud (titre, public)
├── PythonMigrationPrompt.svelte      # Bandeau "Migrer ton localStorage vers le cloud"
├── LockedPythonEditor.svelte         # Éditeur "fill-in-the-blanks" (locked zones)
├── editor-theme.ts                   # Résolution thème + lazy-load CodeMirror
├── editor-theme.test.ts
├── debug/                            # Sous-système debugger
│   ├── index.ts
│   ├── DebugToolbar.svelte
│   ├── DebugPanel.svelte
│   ├── VariablesPanel.svelte
│   ├── VariablesHistory.svelte
│   ├── CallStackPanel.svelte
│   ├── FramesPanel.svelte
│   ├── HeapPanel.svelte
│   ├── MemoryDiagramView.svelte
│   ├── LoopIndicator.svelte
│   ├── heap-utils.ts
│   └── heap-utils.test.ts
├── exercises/                        # Système d'exercices (création + résultat)
│   ├── ASTRequirementsPanel.svelte
│   ├── ExerciseForm.svelte
│   ├── ExerciseStrategyEditor.svelte
│   ├── ExerciseValidationResult.svelte
│   ├── ExerciseValidationResult.svelte.test.ts
│   └── form-mapping.ts
└── library/
    └── LibraryBrowser.svelte         # Bibliothèque d'exemples (100 fichiers .py)
```

---

## Composants principaux

### `PythonPlayground.svelte`

Container du playground complet.

```typescript
{
  user?: User | null,
  profile?: Profile | null
}
```

Orchestre :

- `PythonToolbar` + `PythonEditor` + `PythonOutput` + `PythonSplitter`
- Modales : `PythonSaveDialog`, `PythonFileManager`, `PythonSettings`, `PythonMigrationPrompt`
- Mode debug : `DebugToolbar` + `DebugPanel` quand `debugStore.isDebugging === true`
- Bouton Run intelligent : `execute` ↔ `continue` ↔ `start-debug` selon l'état
- Fullscreen + splitter persisté en localStorage (`ubumaths-python-splitter`)
- Au mount : `pythonStore.initPyodide()` + `pythonStore.initWithProfile(profile)`

### `PythonToolbar.svelte`

Barre d'actions. ~15 boutons : Run, Toggle Debug, Clear, Copy, Share, Reset, font ±, New File, Open Files, Save Cloud, Settings, Fullscreen. Indicateur de statut (`Prêt` / `Chargement…`), nom du fichier cloud actif, indicateur `*` modifié.

```typescript
{
  onExecute, onToggleDebug, onClear, onCopy, onReset, onShare,
  onToggleFullscreen, onIncreaseFontSize, onDecreaseFontSize,
  onSaveToCloud?, onOpenFiles?, onNewFile?, onOpenSettings?,
  canExecute: boolean,
  isExecuting: boolean,
  isDebugging?, isDebugPaused?, isDebugRunning?: boolean,
  isModified?, isFullscreen?: boolean,
  fontSize?: number,                       // 14 par défaut
  isLoggedIn?: boolean,                    // grise les actions cloud
  currentFileName?: string | null,
  isModifiedFromCloud?, isSaving?: boolean
}
```

### `PythonEditor.svelte`

CodeMirror 6, lazy-loadé. Auto-complétion via Pyodide (debounce 150 ms). Highlight rouge sur `errorLine`, jaune sur `debugLine`. Theme observer qui réinitialise l'éditeur au toggle dark mode.

```typescript
{
  value: string,                          // $bindable
  errorLine?: number | null,
  debugLine?: number | null,
  disabled?: boolean,
  fontSize?: number,                      // 14 par défaut
  theme?: EditorTheme,                    // 'default' par défaut
  executor?: CompletionProvider | null,   // pour autocomplete contexte-aware (notebook)
  onExecute?: () => void,                 // Ctrl+Entrée
  onSave?: () => void                     // Ctrl+S
}
```

Extensions installées : `lineNumbers`, `highlightActiveLine`, `history`, `bracketMatching`, `closeBrackets`, `autocompletion`, `indentOnInput`, `python()`, `syntaxHighlighting`, custom error/debug gutters, raccourcis Ctrl+Entrée / Ctrl+S.

### `LockedPythonEditor.svelte`

Éditeur "fill-in-the-blanks" pour les exercices avec marqueurs `{{id | "default"}}`. Le `value` exposé est le **code reconstruit** (`reconstructCode(template, zones)`), prêt pour le worker Pyodide. Utilise `EditorState.transactionFilter` pour bloquer toute édition hors des zones (et toute insertion contenant `\n`, single-line only en V1).

```typescript
{
  template: string,                       // avec marqueurs {{id | "default"}}
  value: string,                          // $bindable, code reconstruit
  onExecute?: () => void,
  fontSize?: number,
  resetAll?: (() => void) | null,         // $bindable, exposé au parent
  hasUnmodifiedZones?: boolean            // $bindable, true tant que ≥ 1 zone = défaut
}
```

Utilitaires purs : `parseTemplate`, `reconstructCode`, `renderDefaults` dans `src/lib/utils/locked-zones.ts` (38 tests).

### `PythonOutput.svelte`

Affichage 5-en-1 : stdout, stderr (+ message pédagogique français basé sur 13 patterns regex), figure matplotlib (avec bouton Télécharger), expression SymPy en LaTeX (MathLive), graphe Plotly interactif. Plotly est lazy-loadé depuis `https://cdn.plot.ly/plotly-2.27.0.min.js` au premier usage et purgé à l'unmount.

```typescript
{
  stdout?: string,
  stderr?: string,
  plotData?: string | null,
  latexOutput?: string | null,
  plotlyData?: string | null,
  errorLine?: number | null,
  executionTime?: number,
  showPedagogicErrors?: boolean
}
```

### `PythonSplitter.svelte`

Splitter vertical 6 px draggable (Pointer Events API). Double-clic → callback de reset (50 % par défaut). Accessible : `role="separator"`, `aria-orientation`, `tabindex`.

```typescript
{
  onDrag: (deltaX: number) => void,
  onDoubleClick?: () => void
}
```

---

## Dialogs cloud

### `PythonSettings.svelte`

Modale paramètres éditeur : sélecteur de thème (`MySelect` sur `EDITOR_THEMES`), boutons font ±, switch "Messages d'erreur en français". Les changements appellent les setters du store qui persistent localStorage + DB.

```typescript
{
	open: boolean;
} // $bindable
```

### `PythonFileManager.svelte`

Dialog 3-onglets : `my-files`, `assigned-files` (étudiants), `library` (`LibraryBrowser`). Liste paginée, recherche, suppression avec `ConfirmDialog`. Le clic sur un fichier appelle `pythonStore.loadCloudFile()` (cloud) ou `pythonStore.loadExample()` (lib) avec confirmation si l'éditeur a des changements non sauvegardés.

```typescript
{
  open: boolean,                          // $bindable
  profile: Profile | null,
  onFileOpened?: () => void
}
```

### `PythonSaveDialog.svelte`

Dialog "Sauvegarder / Mettre à jour". Quand `pythonStore.currentFile !== null`, pré-remplit avec `title` / `description` / `is_public` et bascule en mode "Mettre à jour" (PUT). Sinon crée un nouveau fichier (POST).

```typescript
{
  open: boolean,                          // $bindable
  onSaved?: () => void
}
```

### `PythonMigrationPrompt.svelte`

Bandeau qui s'affiche au login si `pythonStore.hasLocalCodeToMigrate()` (code localStorage ≠ `DEFAULT_CODE`). Dismissed → `sessionStorage` (`ubumaths-python-migration-dismissed`), apparaît plus jusqu'au prochain onglet.

```typescript
{
  isLoggedIn: boolean,
  onSaveToCloud?: () => void,
  onDismiss?: () => void
}
```

---

## Sous-système Debug (`debug/`)

Tous les composants debug consomment le store `debugStore` (`src/lib/stores/pythonDebug.svelte.ts`) qui maintient l'historique (buffer circulaire 10 snapshots), les frames, le heap, les loops, etc.

| Composant           | Props                                                         | Rôle                                                                     |
| ------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `DebugToolbar`      | `onStep`, `onStop`, `disabled?`                               | Boutons Step Into/Over/Out/Continue/Stop + F5/F10/F11/Shift+F5/Shift+F11 |
| `DebugPanel`        | `onSelectFrame?`, `class?`                                    | Container avec onglets : Variables, History, Stack, Loops, Memory        |
| `VariablesPanel`    | `locals`, `globals`, `class?`                                 | Tables locals/globals avec badges type + new/modified                    |
| `VariablesHistory`  | `class?`                                                      | Historique des changements de variables (lit `debugStore`)               |
| `CallStackPanel`    | `callStack`, `onSelectFrame`, `class?`                        | Liste des frames, click → frame active                                   |
| `FramesPanel`       | `callStack`, `hoveredObjectId?`, `onVariableHover?`, `class?` | Frames + variables (style Python Tutor)                                  |
| `HeapPanel`         | `heap`, `hoveredObjectId?`, `onObjectHover?`, `class?`        | Objets sur la heap (lists, dicts, instances)                             |
| `MemoryDiagramView` | `callStack`, `heap`, `class?`                                 | Diagramme Frames + Heap + flèches SVG cubic-Bezier                       |
| `LoopIndicator`     | `loops`, `class?`                                             | Barre de progression d'itération                                         |

Helpers : `heap-utils.ts` (24 tests).

> ⚠️ Dette a11y : les `MemoryDiagramView` / `FramesPanel` / `HeapPanel` utilisent des SVG sans support clavier ni description screen-reader. ≈ 25 warnings supprimés via `svelte-ignore`. Voir `docs/ref/warning-svelte.md`.

---

## Sous-système Exercices (`exercises/`)

| Composant                  | Rôle                                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ExerciseForm`             | Formulaire création + édition (réutilisable). Props : `initialForm`, `mode`, `cancelHref?`, `onSubmit`, `supabase`, `userId`. Embarque son propre `PlaygroundExecutor` pour le bouton "Vérifier". Clone `initialForm` au mount pour éviter l'aliasing parent. Exporte `ExerciseFormState` + `emptyExerciseForm()` depuis `<script module>`. |
| `ExerciseStrategyEditor`   | Éditeur teacher de la `ValidationConfig` V2. Props : `config` (`$bindable`). Sélecteur de behavior (`none` / `output` / `unit_test` / `variable_check` / `reference_solution`), panneau dédié par stratégie, JSON drafts pour args/expected, presets `output`.                                                                              |
| `ASTRequirementsPanel`     | Panneau "AST requirements" : 8 checkboxes (`uses_loop`, `defines_function`, …) + champ message par requirement. Props : `requirements`, `onchange`.                                                                                                                                                                                         |
| `ExerciseValidationResult` | Affichage du verdict côté élève. Props : `result`, `loading?`. Surface `failed_layer` (`'ast'` / `'behavior'` / `null`) et `behavior_kind`. Mode opaque pour les tests cachés.                                                                                                                                                              |
| `form-mapping.ts`          | Source unique pour `DB row ↔ ExerciseFormState ↔ PUT body` (`buildInitialForm`, `buildSubmitBody`, `emptyExerciseForm`). Utilisé par les pages create/edit + le script `scripts/test-exercise-round-trip.ts`.                                                                                                                             |

---

## Bibliothèque (`library/`)

| Composant        | Props    | Rôle                                                                                                                                                                                                                  |
| ---------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `LibraryBrowser` | `onLoad` | Liste filtrée 100 exemples × 10 catégories, recherche full-text, chips tags. Le clic propage l'exemple sélectionné au parent (`PythonFileManager`) qui demande confirmation puis appelle `pythonStore.loadExample()`. |

---

## Helper : `editor-theme.ts`

Gère les 12 thèmes CodeMirror disponibles. Deux fonctions exportées :

- `resolveEffectiveTheme(userTheme, dark)` — `'default'` + dark → `'oneDark'`, sinon retourne `userTheme`.
- `loadThemeExtension(name)` — lazy-load dynamique du package CodeMirror correspondant (`@codemirror/theme-one-dark`, `@uiw/codemirror-theme-dracula`, etc.), retourne `null` si nom inconnu.

Utilisé par `PythonEditor` ET `LockedPythonEditor`.

```typescript
export const DEFAULT_DARK_THEME: EditorTheme = 'oneDark';
export function resolveEffectiveTheme(userTheme: EditorTheme, dark: boolean): EditorTheme;
export function loadThemeExtension(name: EditorTheme): Promise<Extension | null>;
```

5 tests dans `editor-theme.test.ts`.

---

## Conventions communes

- **Svelte 5 runes uniquement** : `$state`, `$derived`, `$props`, `$bindable`, `$effect`. Aucun `let count = 0` réactif, aucun `$:`.
- **Lowercase event handlers** : `onExecute`, `onSave`, etc. (pas de `on:execute`).
- **Pas de `<select>` natif** : `MySelect` partout (voir `PythonSettings`, `ExerciseStrategyEditor`).
- **Pas d'`any`** : tous les types proviennent de `$lib/types/database`, `$lib/shared/python`, `$lib/types/python-exercises`.
- **Theme switching** : tous les composants éditeur observent `theme.svelte` (store global) et réinitialisent CodeMirror via `MutationObserver` sur `document.documentElement` (classe `dark`).
- **Messages en français** côté UI ; props et code en anglais.

---

## Tests

```bash
# Output component (translation des erreurs pédagogiques)
pnpm test:client src/lib/components/python/PythonOutput.svelte.test.ts          # 36 tests

# Heap utils (debug)
pnpm test:client src/lib/components/python/debug/heap-utils.test.ts             # 24 tests

# Editor theme
pnpm test:client src/lib/components/python/editor-theme.test.ts                 # 5 tests

# Exercise validation result
pnpm test:client src/lib/components/python/exercises/ExerciseValidationResult.svelte.test.ts
```

Composants sans tests (essentiellement des wrappers UI) : `PythonPlayground`, `PythonToolbar`, `PythonSplitter`, `PythonSettings`, `PythonFileManager`, `PythonSaveDialog`, `PythonMigrationPrompt`, `LockedPythonEditor`, la plupart des composants debug. Couverts indirectement par les tests E2E si applicable et par les tests des stores qu'ils consomment.

---

## Pointeurs

- Store → [`store.md`](./store.md)
- Executor pattern → [`executor-pattern.md`](./executor-pattern.md)
- Worker → [`worker.md`](./worker.md)
- Architecture transversale → [`architecture.md`](./architecture.md)
- Vue fonctionnelle → [`README.md`](./README.md)
- Locked zones (utilitaire) → `src/lib/utils/locked-zones.ts` + [`progress/python-locked-zones-progress.md`](../../wip/python-locked-zones-progress.md)
