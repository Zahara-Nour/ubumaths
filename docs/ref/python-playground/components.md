# Python Playground - Components

Detailed documentation for all Svelte 5 components in the Python Playground.

## Component Overview

| Component          | File                                                | Purpose           |
| ------------------ | --------------------------------------------------- | ----------------- |
| `+page.svelte`     | `src/routes/(public)/python/+page.svelte`           | Route entry point |
| `PythonPlayground` | `src/lib/components/python/PythonPlayground.svelte` | Main container    |
| `PythonEditor`     | `src/lib/components/python/PythonEditor.svelte`     | CodeMirror editor |
| `PythonToolbar`    | `src/lib/components/python/PythonToolbar.svelte`    | Action buttons    |
| `PythonOutput`     | `src/lib/components/python/PythonOutput.svelte`     | Results display   |
| `PythonSplitter`   | `src/lib/components/python/PythonSplitter.svelte`   | Resize handle     |

---

## +page.svelte

**Location**: `src/routes/(public)/python/+page.svelte`

Route entry point for `/python`. Handles URL code loading.

### Responsibilities

1. Load shared code from URL parameter on mount
2. Clean URL after loading (remove `?code=` parameter)
3. Set page metadata (title, description)
4. Render `PythonPlayground` component

### Code

```svelte
<script lang="ts">
	import PythonPlayground from '$lib/components/python/PythonPlayground.svelte';
	import { pythonStore } from '$lib/stores/pythonPlayground.svelte';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	onMount(() => {
		if (browser && window.location.search.includes('code=')) {
			const url = new URL(window.location.href);
			const loaded = pythonStore.loadFromUrl(url);
			if (loaded) {
				window.history.replaceState({}, '', window.location.pathname);
			}
		}
	});
</script>

<svelte:head>
	<title>Python Playground - UbuMaths</title>
</svelte:head>

<main class="container mx-auto p-4">
	<h1>Python Playground</h1>
	<PythonPlayground />
</main>
```

---

## PythonPlayground.svelte

**Location**: `src/lib/components/python/PythonPlayground.svelte`

Main container component that orchestrates the entire playground.

### Props

None (uses `pythonStore` singleton directly)

### State

```typescript
// Derived from store
let canExecute = $derived(pythonStore.isReady);
let isExecuting = $derived(pythonStore.isExecuting);
let isModified = $derived(pythonStore.isModified);

// Local state
let isFullscreen = $state(false);
let leftPanelWidth = $state(50); // Splitter position (%)
let containerRef: HTMLDivElement | null = $state(null);
```

### Event Handlers

| Handler                      | Action                                 |
| ---------------------------- | -------------------------------------- |
| `handleExecute()`            | `pythonStore.execute()`                |
| `handleClear()`              | `pythonStore.clearOutput()`            |
| `handleCopy()`               | Copy code to clipboard                 |
| `handleReset()`              | `pythonStore.resetCode()`              |
| `handleSave()`               | `pythonStore.saveCode()` + toast       |
| `handleShare()`              | Generate share URL + copy to clipboard |
| `toggleFullscreen()`         | Toggle fullscreen mode                 |
| `handleKeydown(e)`           | Escape key exits fullscreen            |
| `handleSplitterDrag(deltaX)` | Update panel widths                    |
| `resetSplitterWidth()`       | Double-click resets to 50%             |

### Lifecycle

```typescript
onMount(() => {
	pythonStore.initPyodide();
	// Load splitter width from localStorage
});

onDestroy(() => {
	pythonStore.destroy();
});

// Body scroll lock in fullscreen
$effect(() => {
	if (isFullscreen) {
		document.body.style.overflow = 'hidden';
	} else {
		document.body.style.overflow = '';
	}
});
```

### Layout

**Mobile (`< lg`)**: Stacked vertically

```
┌─────────────────┐
│    Toolbar      │
├─────────────────┤
│    Editor       │
│  (Code Python)  │
├─────────────────┤
│    Output       │
│    (Sortie)     │
└─────────────────┘
```

**Desktop (`>= lg`)**: Side-by-side with splitter

```
┌────────────────────────────────────────┐
│              Toolbar                   │
├──────────────┬───┬─────────────────────┤
│   Editor     │ S │     Output          │
│              │ P │                     │
│  Code Python │ L │     Sortie          │
│              │ I │                     │
│              │ T │                     │
└──────────────┴───┴─────────────────────┘
```

### Splitter Persistence

```typescript
const STORAGE_KEY = 'ubumaths-python-splitter';
const MIN_WIDTH = 20;
const MAX_WIDTH = 80;

$effect(() => {
	localStorage.setItem(STORAGE_KEY, String(leftPanelWidth));
});
```

---

## PythonEditor.svelte

**Location**: `src/lib/components/python/PythonEditor.svelte`

CodeMirror 6 editor with Python syntax highlighting and intelligent autocompletion.

### Props

```typescript
let {
	value = $bindable(''), // Code content (two-way binding)
	errorLine = null as number | null, // Line to highlight red
	disabled = false, // Read-only mode
	fontSize = 14, // Font size in pixels
	onExecute = () => {}, // Ctrl+Enter callback
	onSave = () => {} // Ctrl+S callback
} = $props();
```

### Features

1. **Syntax highlighting**: Python language support
2. **Line numbers**: With active line gutter highlight
3. **Bracket matching**: Auto-close and highlight matching brackets
4. **History**: Undo/redo support
5. **Autocompletion**: Python-aware completions via Pyodide
6. **Error highlighting**: Red background + gutter marker on error line
7. **Theme switching**: Light/dark mode support (oneDark theme)
8. **Keyboard shortcuts**: Ctrl+Enter (execute), Ctrl+S (save)

### CodeMirror Extensions

```typescript
const extensions = [
	lineNumbers(),
	highlightActiveLineGutter(),
	highlightActiveLine(),
	history(),
	bracketMatching(),
	closeBrackets(),
	autocompletion({
		override: [pythonCompletions],
		activateOnTyping: true,
		maxRenderedOptions: 30
	}),
	indentOnInput(),
	python(),
	syntaxHighlighting(defaultHighlightStyle),
	errorLineFieldDef, // Custom error highlighting
	errorGutter,
	keymap.of([
		...defaultKeymap,
		...historyKeymap,
		{
			key: 'Ctrl-Enter',
			run: () => {
				onExecute();
				return true;
			}
		},
		{
			key: 'Ctrl-s',
			run: () => {
				onSave();
				return true;
			}
		}
	])
];
```

### Error Line Highlighting

Custom StateField and StateEffect for error display:

```typescript
// Effect to set/clear error line
const effectType = StateEffect.define<number | null>();

// Decoration for red background
const errorLineMark = Decoration.line({ class: 'cm-errorLine' });

// Gutter marker (red dot)
class ErrorGutterMarker extends GutterMarker {
	toDOM() {
		const marker = document.createElement('div');
		marker.className = 'cm-errorGutterMarker';
		marker.textContent = '●';
		return marker;
	}
}
```

### Python Autocompletion

```typescript
async function pythonCompletions(context: CompletionContext): Promise<CompletionResult | null> {
	const { pos, state } = context;
	const code = state.doc.toString();
	const word = context.matchBefore(/[\w.]+/);

	if (!word) return null;

	// Skip if in comment
	const lineText = state.doc.sliceString(lineStart, pos);
	if (lineText.includes('#')) return null;

	const completions = await pythonStore.requestCompletion(code, pos);

	return {
		from: word.from,
		options: completions.map((c) => ({
			label: c.label,
			type: mapCompletionType(c.type) // function, variable, class, keyword, etc.
		})),
		validFor: /^[\w.]*$/
	};
}
```

### Theme Observer

Watches for dark mode changes and reinitializes editor:

```typescript
$effect(() => {
	const observer = new MutationObserver(async () => {
		const newIsDark = checkDarkMode();
		if (newIsDark !== isDark) {
			isDark = newIsDark;
			// Reinitialize editor with new theme
			editor.destroy();
			await initEditor();
		}
	});

	observer.observe(document.documentElement, {
		attributes: true,
		attributeFilter: ['class']
	});
});
```

### Styling

```css
:global(.cm-editor) {
	height: 100%;
	font-size: var(--editor-font-size, 14px) !important;
}

:global(.cm-errorLine) {
	background-color: rgba(239, 68, 68, 0.15) !important;
}

:global(.cm-errorGutterMarker) {
	color: #ef4444;
	font-size: 12px;
}
```

---

## PythonToolbar.svelte

**Location**: `src/lib/components/python/PythonToolbar.svelte`

Toolbar with action buttons and status indicators.

### Props

```typescript
let {
	onExecute, // Execute button click
	onClear, // Clear output button click
	onCopy, // Copy code button click
	onReset, // Reset code button click
	onShare, // Share button click
	onToggleFullscreen, // Fullscreen toggle click
	onIncreaseFontSize, // Font size + button click
	onDecreaseFontSize, // Font size - button click
	canExecute, // Enable/disable execute button
	isExecuting, // Show loading spinner
	isModified = false, // Show unsaved indicator (*)
	isFullscreen = false, // Toggle fullscreen icon
	fontSize = 14 // Current font size display
} = $props();
```

### Buttons

| Button     | Icon                  | Action            | Aria Label                      |
| ---------- | --------------------- | ----------------- | ------------------------------- |
| Execute    | Play / Loader2        | Run code          | -                               |
| Clear      | Trash2                | Clear output      | "Effacer la sortie"             |
| Copy       | Copy                  | Copy to clipboard | "Copier le code"                |
| Share      | Share2                | Generate URL      | "Partager le code"              |
| Reset      | RotateCcw             | Reset to default  | "Réinitialiser le code"         |
| Font -     | Minus                 | Decrease font     | "Réduire la taille de police"   |
| Font +     | Plus                  | Increase font     | "Augmenter la taille de police" |
| Fullscreen | Maximize2 / Minimize2 | Toggle            | "Mode plein écran"              |

### Status Indicator

```svelte
<Circle
	class="size-2 {canExecute ? 'fill-green-500 text-green-500' : 'fill-yellow-500 text-yellow-500'}"
/>
<span>{canExecute ? 'Prêt' : 'Chargement...'}</span>
```

### Modified Indicator

```svelte
{#if isModified}
	<span class="text-destructive">*</span>
{/if}
```

---

## PythonOutput.svelte

**Location**: `src/lib/components/python/PythonOutput.svelte`

Display component for execution results.

### Props

```typescript
let {
	stdout = '',
	stderr = '',
	plotData = null as string | null, // Matplotlib base64 PNG data URL
	plotlyData = null as string | null, // Plotly JSON specification
	latexOutput = null as string | null, // SymPy LaTeX string
	errorLine = null as number | null, // Error line number
	executionTime = 0, // Milliseconds
	showPedagogicErrors = true // French error explanations
} = $props();
```

### Output Sections

1. **stdout**: Standard output

   ```svelte
   <pre class="whitespace-pre-wrap">{stdout}</pre>
   ```

2. **LaTeX** (SymPy results):

   ```svelte
   <math-span class="block text-lg">{latexOutput}</math-span>
   ```

3. **stderr**: Error output with pedagogic message

   ```svelte
   {#if pedagogicMessage}
   	<div class="border-amber-500">{pedagogicMessage}</div>
   {/if}
   <pre class="text-destructive">{stderr}</pre>
   ```

4. **Matplotlib Plot**: Static PNG image with download

   ```svelte
   <img src={plotData} alt="Graphique matplotlib" />
   <Button onclick={downloadPlot}>Télécharger</Button>
   ```

5. **Plotly Chart**: Interactive chart rendered via Plotly.js

   ```svelte
   {#if plotlyData}
   	<div id="plotly-chart" bind:this={plotlyContainer}></div>
   {/if}
   ```

   **Rendering**:
   - Plotly.js v2.27.0 loaded from CDN
   - JSON spec passed from worker to `Plotly.newPlot()`
   - Chart cleanup on unmount via `Plotly.purge()`

### Pedagogic Error Messages

French translations for common Python errors:

```typescript
const ERROR_TRANSLATIONS = {
	syntaxError: {
		pattern: /SyntaxError:\s*(.+)/i,
		message: 'Erreur de syntaxe : vérifiez la ponctuation...'
	},
	nameError: {
		pattern: /NameError:\s*name\s+'([^']+)'\s+is not defined/i,
		message: "Variable non définie : '$1' n'existe pas..."
	},
	typeError: {
		pattern: /TypeError:\s*(.+)/i,
		message: "Erreur de type : vous essayez d'utiliser une valeur d'un mauvais type"
	},
	indexError: {
		pattern: /IndexError:\s*(.+)/i,
		message: "Index invalide : vous essayez d'accéder à un élément qui n'existe pas"
	},
	keyError: {
		pattern: /KeyError:\s*(.+)/i,
		message: "Clé introuvable : cette clé n'existe pas dans le dictionnaire"
	},
	valueError: {
		pattern: /ValueError:\s*(.+)/i,
		message: "Valeur invalide : la valeur fournie n'est pas acceptable"
	},
	zeroDivision: {
		pattern: /ZeroDivisionError/i,
		message: 'Division par zéro : impossible de diviser par zéro'
	},
	indentationError: {
		pattern: /IndentationError:\s*(.+)/i,
		message: "Erreur d'indentation : vérifiez l'alignement de votre code"
	},
	importError: {
		pattern: /ImportError:\s*(.+)/i,
		message: "Erreur d'import : le module demandé n'a pas pu être chargé"
	},
	moduleNotFound: {
		pattern: /ModuleNotFoundError:\s*No module named '([^']+)'/i,
		message: "Module non trouvé : '$1' n'est pas disponible. Modules: numpy, matplotlib, sympy"
	},
	attributeError: {
		pattern: /AttributeError:\s*(.+)/i,
		message: 'Attribut non trouvé : cet objet ne possède pas cette propriété ou méthode'
	},
	recursionError: {
		pattern: /RecursionError/i,
		message: "Récursion infinie : votre fonction s'appelle elle-même indéfiniment"
	},
	memoryError: {
		pattern: /MemoryError/i,
		message: 'Mémoire insuffisante : votre programme utilise trop de mémoire'
	}
};
```

### Plot Download

```typescript
function downloadPlot(): void {
	const link = document.createElement('a');
	link.href = plotData;
	link.download = 'python-plot.png';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}
```

---

## PythonSplitter.svelte

**Location**: `src/lib/components/python/PythonSplitter.svelte`

Draggable vertical splitter for resizing panels.

### Props

```typescript
let {
	onDrag, // (deltaX: number) => void - Called during drag
	onDoubleClick // () => void - Reset to default
} = $props();
```

### Pointer Events

Uses Pointer Events API for unified mouse/touch handling:

```typescript
function handlePointerDown(e: PointerEvent) {
	isDragging = true;
	startX = e.clientX;
	(e.target as HTMLElement).setPointerCapture(e.pointerId);
}

function handlePointerMove(e: PointerEvent) {
	if (!isDragging) return;
	const deltaX = e.clientX - startX;
	startX = e.clientX;
	onDrag(deltaX);
}

function handlePointerUp(e: PointerEvent) {
	isDragging = false;
	(e.target as HTMLElement).releasePointerCapture(e.pointerId);
}
```

### Accessibility

```svelte
<div
	role="separator"
	aria-orientation="vertical"
	aria-label="Redimensionner les panneaux"
	tabindex="0"
></div>
```

### Styling

```css
.splitter {
	width: 6px;
	cursor: ew-resize;
	background: hsl(var(--border));
	touch-action: none;
	flex-shrink: 0;
}

.splitter:hover,
.splitter.dragging {
	background: hsl(var(--primary) / 0.5);
}

.splitter:focus-visible {
	outline: 2px solid hsl(var(--primary));
}
```

---

## Component Testing

### Store Tests

```bash
pnpm test:client src/lib/stores/pythonPlayground.svelte.test.ts
```

45 tests covering:

- State management
- Execution flow
- localStorage persistence
- URL sharing
- Autocompletion

### Output Component Tests

```bash
pnpm test:client src/lib/components/python/PythonOutput.svelte.test.ts
```

Tests for pedagogic error translation.
