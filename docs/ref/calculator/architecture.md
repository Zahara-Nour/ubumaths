# Calculator Architecture

## System Overview

The calculator follows a layered architecture separating UI, state management, and computation:

```
┌─────────────────────────────────────────────────────────────┐
│                         UI Layer                             │
│  ┌─────────────┐ ┌──────────────┐ ┌────────────────────┐   │
│  │ UnifiedInput│ │ResultDisplay │ │CalculatorKeyboard │   │
│  └──────┬──────┘ └──────┬───────┘ └─────────┬──────────┘   │
│         │               │                    │               │
│  ┌──────┴───────────────┴────────────────────┴──────────┐   │
│  │              CalculatorContainer                      │   │
│  └───────────────────────┬──────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                    State Layer                               │
│  ┌───────────────────────┴──────────────────────────────┐   │
│  │                  calculatorStore                      │   │
│  │  - history: CalculationResult[]                       │   │
│  │  - isLoading: boolean                                 │   │
│  │  - execute(input): Promise<void>                      │   │
│  └───────────────────────┬──────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────┘
                           │
┌──────────────────────────┼──────────────────────────────────┐
│                 Computation Layer                            │
│  ┌───────────────────────┴──────────────────────────────┐   │
│  │                  WebReplEngine                        │   │
│  │  - Command Registry                                   │   │
│  │  - Expression Parser                                  │   │
│  │  - Evaluator                                          │   │
│  │  - Unit System                                        │   │
│  └───────────────────────┬──────────────────────────────┘   │
│                          │                                   │
│  ┌───────────┬───────────┴───────────┬───────────────┐     │
│  │  Parser   │     Evaluator         │  Commands     │     │
│  └───────────┴───────────────────────┴───────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow

### Expression Evaluation

```
User Input → UnifiedInput → calculatorStore.execute()
                                    │
                                    ▼
                            WebReplEngine.execute()
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
               Expression       Command        Equivalence
                  Parse          Parse            Parse
                    │               │               │
                    ▼               ▼               ▼
                Evaluate      Command.execute()   Compare
                    │               │               │
                    └───────────────┴───────────────┘
                                    │
                                    ▼
                         ReplExecutionResult
                                    │
                                    ▼
                     CalculationResult (stored in history)
                                    │
                                    ▼
                          ResultDisplay (UI update)
```

### Command Execution Flow

```
".diff x^2" → WebReplEngine.executeCommand()
                        │
                        ▼
            CommandRegistry.get('diff')
                        │
                        ▼
            DiffCommand.execute(context)
                        │
                        ▼
              Parse argument "x^2"
                        │
                        ▼
            differentiate(ast, 'x')
                        │
                        ▼
              toLatex(result) → "2*x"
```

## Component Hierarchy

```
+page.svelte
└── CalculatorContainer
    ├── Tabs.Root
    │   ├── Tabs.Content[calc]
    │   │   ├── UnifiedInput
    │   │   │   ├── MathField (MathLive)
    │   │   │   └── CommandInput (conditional)
    │   │   ├── History Actions (Share, Export, Clear)
    │   │   ├── ResultDisplay[] (for each history entry)
    │   │   │   └── StepsDisplay (collapsible)
    │   │   └── CalculatorKeyboard
    │   │       ├── Scientific Keys
    │   │       ├── Extended Functions (collapsible)
    │   │       └── Numpad Grid
    │   └── Tabs.Content[graph]
    │       └── GrapheurContainer
    └── Toast Notifications
```

## State Management

### Calculator Store (Svelte 5 Runes)

```typescript
class CalculatorStore {
	// Reactive State
	history = $state<CalculationResult[]>([]);
	historyIndex = $state(-1);
	isLoading = $state(false);

	// Derived State
	hasHistory = $derived(this.history.length > 0);
	lastResult = $derived(this.history[0]);

	// Engine Instance
	private engine: WebReplEngine;

	// Methods
	async execute(input: CalculatorInput): Promise<void>;
	navigateHistory(direction: 'up' | 'down'): string | null;
	clearHistory(): void;
	getCommands(): CommandInfo[];
}
```

### WebReplEngine State

```typescript
class WebReplEngine {
	// Internal State
	private registry: CommandRegistry; // Command registry
	private inputMode: ReplInputMode; // latex | custom | auto
	private lastAst: MathNode | undefined; // Last parsed AST
	private evalState: EvalState; // Variable bindings
	private unitConversionMode: UnitConversionMode;
	private lastUnitResult: EvalResultWithUnit;

	// Methods
	execute(input: string): ReplExecutionResult;
	setInputMode(mode: ReplInputMode): void;
	getCommands(): CommandInfo[];
	getFunctions(): WebFunctionInfo[];
}
```

## Persistence

### localStorage Schema

```typescript
// Key: 'ubumaths-calc-history'
interface SerializedHistory {
	entries: Array<{
		id: string; // UUID
		input: string; // Max 1000 chars
		output: string; // Max 1000 chars
		isError: boolean;
		errorMessage?: string;
		timestamp: number; // Unix ms
	}>;
}

// Constraints:
// - Max 100 entries
// - Max 100KB total size
// - outputHtml NOT stored (security)
```

### URL Sharing Schema

```typescript
// URL: /calc?share=<base64>
interface SharedCalc {
	expr: string; // Max 200 chars, whitelist validated
	result?: string; // Max 200 chars
}

// Encoding: btoa(encodeURIComponent(JSON.stringify(data)))
// Max encoded length: 400 chars
```

## Service Worker Caching

```javascript
// Cached CDN hosts:
const CACHEABLE_HOSTS = [
	'cdn.jsdelivr.net', // Pyodide, Typst, MathLive
	'cdn.plot.ly', // Plotly.js
	'unpkg.com' // MathLive fallback
];

// Strategy: Cache-first for CDN resources
// Cache name: 'ubumaths-cache-v3'
```

## Error Handling

### Error Propagation

```
WebReplEngine Error
       │
       ▼
ReplExecutionResult.error = {
  code: 'PARSE_ERROR' | 'MATH_ERROR' | ...,
  message: string
}
       │
       ▼
calculatorStore.execute()
       │
       ▼
CalculationResult.isError = true
CalculationResult.errorMessage = string
       │
       ▼
ResultDisplay (error UI)
```

### Error Codes

| Code                 | Description                      |
| -------------------- | -------------------------------- |
| `PARSE_ERROR`        | Expression parsing failed        |
| `NO_AST`             | No AST available for command     |
| `UNKNOWN_COMMAND`    | Command not found                |
| `INVALID_OPTIONS`    | Invalid command arguments        |
| `MATH_ERROR`         | Mathematical error (div by zero) |
| `DIMENSION_MISMATCH` | Unit dimension mismatch          |
| `UNKNOWN_UNIT`       | Unknown unit symbol              |

## Integration Points

### Grapheur Integration

```typescript
// In CalculatorContainer.svelte
function handlePlot(expression: string) {
	grapheurStore.addFunction(expression);
	activeTab = 'graph';
}

// ResultDisplay detects plottable expressions (contains 'x')
function isPlottable(): boolean {
	return /(?<![a-zA-Z])x(?![a-zA-Z])/.test(result.output);
}
```

### Step Generator Integration

```typescript
// In ResultDisplay.svelte
async function toggleSteps() {
	const parseResult = parseCustomSafe(result.input);
	if (canGenerateSteps(parseResult.ast)) {
		const level = suggestLevel(parseResult.ast);
		stepsResult = generateSteps(parseResult.ast, { level });
	}
}
```

## Performance Considerations

1. **Lazy Loading**: MathLive loaded dynamically on first use
2. **Step Generation**: On-demand, not precomputed
3. **History Limit**: Capped at 100 entries
4. **CDN Caching**: Service worker caches MathLive assets
5. **Evaluation Depth**: Limited to 100 levels (DoS prevention)
6. **Stats Values**: Limited to 1000 values (DoS prevention)
