# Calculator Components

## Overview

The calculator UI is built with Svelte 5 components using runes for reactivity.

```
CalculatorContainer
├── UnifiedInput
├── ResultDisplay
│   └── StepsDisplay
└── CalculatorKeyboard
```

---

## CalculatorContainer

**File**: `src/lib/components/calculator/CalculatorContainer.svelte`

Main container component managing tabs, history display, and child coordination.

### Features

- Tab navigation (Calcul / Graphique)
- History display with actions (Share, Export, Clear)
- URL sharing and import
- Virtual keyboard toggle (desktop)
- Grapheur integration

### Props

None (self-contained)

### State

```typescript
let activeTab = $state('calc'); // 'calc' | 'graph'
let showKeyboard = $state(false); // Desktop keyboard toggle
let mathFieldElement = $state<MathfieldElement | null>(null);
let windowWidth = $state(browser ? window.innerWidth : 0);
let isMobile = $derived(windowWidth < 768);
let shareUrlProcessed = $state(false); // Run-once flag
```

### Key Functions

```typescript
// Submit expression or command
async function handleSubmit(input: {
	type: 'expression' | 'command';
	command?: string;
	expression: string;
}) {
	await calculatorStore.execute(input);
}

// Plot expression in grapheur
function handlePlot(expression: string) {
	grapheurStore.addFunction(expression);
	activeTab = 'graph';
}

// Share last result via URL
async function handleShare() {
	const encoded = btoa(
		encodeURIComponent(
			JSON.stringify({
				expr: lastResult.input,
				result: lastResult.output
			})
		)
	);
	const shareUrl = `${page.url.origin}/calc?share=${encoded}`;
	await navigator.clipboard.writeText(shareUrl);
}

// Export history to LaTeX
function handleExportLatex() {
	const latex = `\\begin{align*}\n${lines.join('\n')}\n\\end{align*}`;
	downloadFile('calculs.tex', latex, 'text/plain');
}
```

### Usage

```svelte
<script>
	import CalculatorContainer from '$lib/components/calculator/CalculatorContainer.svelte';
</script>

<CalculatorContainer />
```

---

## UnifiedInput

**File**: `src/lib/components/calculator/UnifiedInput.svelte`

Intelligent input field combining MathLive for visual math entry and text input for commands.

### Features

- MathLive integration for visual math input
- Command mode triggered by typing `.` at start
- Command autocomplete with keyboard navigation
- Seamless mode switching

### Props

```typescript
interface Props {
	onSubmit: (input: SubmitInput) => void; // Callback on submit
	disabled?: boolean; // Disable input
	mathFieldElement?: MathfieldElement | null; // Bindable ref
}

interface SubmitInput {
	type: 'expression' | 'command';
	command?: string;
	expression: string;
}
```

### State

```typescript
let mode = $state<'mathfield' | 'command'>('mathfield');
let mathValue = $state('');
let commandValue = $state('');
let selectedSuggestionIndex = $state(-1);

// Available commands for autocomplete
const commands = ['.diff', '.simplify', '.eval', '.normal', '.taylor', '.let', '.def', '.clear'];

// Derived: filtered suggestions
let suggestions = $derived(
	commandValue.length > 0 ? commands.filter((c) => c.startsWith(commandValue)) : commands
);
```

### Keyboard Shortcuts

| Key           | Context             | Action                    |
| ------------- | ------------------- | ------------------------- |
| `.`           | Empty mathfield     | Switch to command mode    |
| `Enter`       | Any                 | Submit expression/command |
| `Backspace`   | Command mode, empty | Return to mathfield mode  |
| `Tab`/`Space` | Command mode        | Focus mathfield           |
| `↑`/`↓`       | Command mode        | Navigate suggestions      |

### Usage

```svelte
<UnifiedInput onSubmit={handleSubmit} bind:mathFieldElement={mf} />
```

---

## ResultDisplay

**File**: `src/lib/components/calculator/ResultDisplay.svelte`

Displays a calculation result with actions and optional step-by-step breakdown.

### Features

- Error/success display styling
- Copy to clipboard
- Plot button for expressions with `x`
- Collapsible step-by-step explanation
- School level adaptation

### Props

```typescript
interface Props {
	result: CalculationResult;
	onCopy?: () => void;
	onPlot?: (expression: string) => void;
	schoolLevel?: SchoolLevel; // 'primaire' | 'college' | 'lycee' | 'superieur'
}
```

### State

```typescript
let showSteps = $state(false);
let stepsResult = $state<StepGenerationResult | null>(null);
let stepsError = $state<string | null>(null);
let isGeneratingSteps = $state(false);
```

### Key Functions

```typescript
// Check if expression can be plotted
function isPlottable(): boolean {
	if (result.isError) return false;
	// Match 'x' as standalone variable
	return /(?<![a-zA-Z])x(?![a-zA-Z])/.test(result.output);
}

// Generate and toggle steps
async function toggleSteps() {
	if (!stepsResult && !stepsError) {
		const parseResult = parseCustomSafe(result.input);
		if (canGenerateSteps(parseResult.ast)) {
			const level = schoolLevel || suggestLevel(parseResult.ast);
			stepsResult = generateSteps(parseResult.ast, { level });
		}
	}
	showSteps = !showSteps;
}
```

### Usage

```svelte
{#each calculatorStore.history as result (result.id)}
	<ResultDisplay {result} onPlot={handlePlot} schoolLevel="college" />
{/each}
```

---

## StepsDisplay

**File**: `src/lib/components/calculator/StepsDisplay.svelte`

Recursive component for displaying calculation steps with collapsible sub-steps.

### Features

- Numbered step list
- Level indicator badge
- Collapsible sub-steps
- French descriptions

### Props

```typescript
interface Props {
	steps: readonly CalculationStep[];
	level: SchoolLevel;
	class?: string;
}
```

### State

```typescript
// Track expanded sub-steps using SvelteSet
let expandedSteps = new SvelteSet<number>();
```

### Recursion

The component renders itself for sub-steps:

```svelte
{#if step.subSteps && step.subSteps.length > 0}
	{#if expandedSteps.has(step.index)}
		<StepsDisplay steps={step.subSteps} {level} class="gap-2" />
	{/if}
{/if}
```

### Usage

```svelte
<StepsDisplay steps={stepsResult.steps} level={stepsResult.level} />
```

---

## CalculatorKeyboard

**File**: `src/lib/components/calculator/CalculatorKeyboard.svelte`

Virtual keyboard with scientific functions and numpad.

### Features

- Scientific function row (sin, cos, tan, log, ln, sqrt, etc.)
- Expandable extended functions (arcsin, arccos, arctan, etc.)
- Standard numpad with operators
- Action buttons (backspace, clear, all clear, submit)

### Props

```typescript
interface Props {
	onInput: (value: string) => void;
	onSubmit: () => void;
	onBackspace: () => void;
	onClear: () => void;
	onAllClear: () => void;
	visible?: boolean;
}
```

### Key Layout

**Scientific Row**:

```
sin | cos | tan | log | ln | sqrt | ^ | pi | e | [More...]
```

**Extended Functions** (when expanded):

```
arcsin | arccos | arctan | ( | ) | |x| | x^2 | x^3 | infinity
```

**Numpad Grid** (5 columns):

```
7 | 8 | 9 | div | backspace
4 | 5 | 6 | mul | C
1 | 2 | 3 | -   | AC
0 | . | x | +   | =
```

### Key Definitions

```typescript
type KeyDefinition = {
	label: string; // Display text
	value?: string; // LaTeX to insert
	action?: 'submit' | 'backspace' | 'clear' | 'allClear' | 'more';
	variant?: 'default' | 'secondary' | 'outline' | 'destructive';
};

// Example keys
const scientificKeys: KeyDefinition[] = [
	{ label: 'sin', value: '\\sin(' },
	{ label: 'sqrt', value: '\\sqrt{' },
	{ label: 'pi', value: '\\pi' }
];
```

### Usage

```svelte
<CalculatorKeyboard
	visible={isMobile || showKeyboard}
	onInput={handleKeyboardInput}
	onSubmit={handleKeyboardSubmit}
	onBackspace={handleBackspace}
	onClear={handleClear}
	onAllClear={handleAllClear}
/>
```

---

## Component Communication

### Event Flow

```
CalculatorKeyboard
    │ onInput(value)
    ▼
CalculatorContainer.handleKeyboardInput()
    │ mathFieldElement.executeCommand(['insert', value])
    ▼
MathField (in UnifiedInput)
    │ 'input' event
    ▼
UnifiedInput.mathValue updated
    │ Enter key
    ▼
UnifiedInput.handleSubmit()
    │ onSubmit(input)
    ▼
CalculatorContainer.handleSubmit()
    │ calculatorStore.execute(input)
    ▼
calculatorStore.history updated
    │ reactive
    ▼
{#each calculatorStore.history as result}
    ▼
ResultDisplay renders
```

### Shared References

```typescript
// CalculatorContainer owns the MathField reference
let mathFieldElement = $state<MathfieldElement | null>(null);

// Passed to UnifiedInput via bindable prop
<UnifiedInput bind:mathFieldElement />

// Used by keyboard to inject input
function handleKeyboardInput(value: string) {
  mathFieldElement?.executeCommand(['insert', value]);
}
```
