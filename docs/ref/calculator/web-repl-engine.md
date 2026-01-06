# WebReplEngine API

## Overview

The WebReplEngine is the browser-compatible evaluation engine powering the calculator. It handles expression parsing, command execution, variable bindings, and unit-aware calculations.

**File**: `src/lib/mathAST/cli/web/web-repl-engine.ts`

## Import

```typescript
import { WebReplEngine } from '$lib/mathAST/cli/web';
import type { ReplExecutionResult, ReplInputMode, WebFunctionInfo } from '$lib/mathAST/cli/web';
```

---

## Constructor

```typescript
const engine = new WebReplEngine();
```

Creates a new engine instance with:

- Default command registry
- Auto input mode
- Empty variable bindings
- 'first' unit conversion mode

---

## Types

### ReplExecutionResult

```typescript
interface ReplExecutionResult {
	readonly success: boolean; // Execution succeeded
	readonly output: string; // Plain text output
	readonly outputHtml?: string; // HTML formatted output
	readonly latex?: string; // LaTeX for MathLive
	readonly ast?: MathNode; // Parsed AST
	readonly highlightRanges?: Array<{
		// For bidirectional linking
		nodeId: string;
		start: number;
		end: number;
	}>;
	readonly error?: {
		code: string;
		message: string;
		position?: number;
	};
}
```

### ReplInputMode

```typescript
type ReplInputMode = 'latex' | 'custom' | 'auto';
```

- `'latex'`: Force LaTeX parsing
- `'custom'`: Force custom syntax parsing
- `'auto'`: Auto-detect format (default)

### WebFunctionInfo

```typescript
interface WebFunctionInfo {
	readonly name: string;
	readonly parameters: readonly string[];
	readonly expression: string;
	readonly derivative?: string;
	readonly inverse?: string;
}
```

---

## Methods

### `execute(input)`

Execute a REPL input (command or expression).

```typescript
execute(input: string): ReplExecutionResult
```

**Input Types**:

- Expressions: `'2 + 3'`, `'x^2 + 1'`
- Commands: `'.diff x^2'`, `'.simplify'`
- Equivalence: `'x + 1 === 1 + x'`
- Assignment: `'a = 5'`

**Examples**:

```typescript
// Expression
const r1 = engine.execute('2 + 3 * 4');
console.log(r1.output); // "14"

// Command
const r2 = engine.execute('.diff x^3');
console.log(r2.output); // "3*x^2"

// Equivalence check
const r3 = engine.execute('(x+1)^2 === x^2 + 2*x + 1');
console.log(r3.output); // "true"

// Variable assignment
const r4 = engine.execute('a = 5');
console.log(r4.output); // "a = 5"
```

### `setInputMode(mode)`

Set the input parsing mode.

```typescript
setInputMode(mode: ReplInputMode): void
```

### `getInputMode()`

Get the current input mode.

```typescript
getInputMode(): ReplInputMode
```

### `getLastAst()`

Get the last successfully parsed AST.

```typescript
getLastAst(): MathNode | undefined
```

### `getEvalState()`

Get the current evaluation state (variable bindings).

```typescript
getEvalState(): EvalState
```

### `getCommands()`

Get all registered commands for help/autocomplete.

```typescript
getCommands(): ReadonlyArray<{
  name: string;
  aliases: readonly string[];
  description: string;
}>
```

### `getFunctions()`

Get all user-defined functions.

```typescript
getFunctions(): WebFunctionInfo[]
```

**Example**:

```typescript
engine.execute('.def f(x) = x^2');
engine.execute('.def-deriv f 2*x');

const functions = engine.getFunctions();
// [{
//   name: 'f',
//   parameters: ['x'],
//   expression: 'x^2',
//   derivative: '2*x'
// }]
```

---

## Supported Operations

### Expressions

| Operation  | Example          | Result |
| ---------- | ---------------- | ------ |
| Arithmetic | `2 + 3 * 4`      | `14`   |
| Powers     | `2^10`           | `1024` |
| Functions  | `sin(pi/2)`      | `1`    |
| Variables  | `x^2` (symbolic) | `x^2`  |

### Built-in Functions

| Function                     | Description           |
| ---------------------------- | --------------------- |
| `sin`, `cos`, `tan`          | Trigonometric         |
| `arcsin`, `arccos`, `arctan` | Inverse trig          |
| `log`, `ln`                  | Logarithms            |
| `sqrt`, `abs`                | Square root, absolute |
| `exp`                        | Exponential           |
| `floor`, `ceil`, `round`     | Rounding              |

### Statistical Functions

| Function     | Description        | Example                       |
| ------------ | ------------------ | ----------------------------- |
| `mean`       | Average            | `mean(1, 2, 3, 4)` → `2.5`    |
| `median`     | Median value       | `median(1, 2, 3, 4, 5)` → `3` |
| `stdev`      | Standard deviation | `stdev(1, 2, 3, 4, 5)`        |
| `variance`   | Variance           | `variance(1, 2, 3, 4, 5)`     |
| `min`, `max` | Extrema            | `min(1, 5, 3)` → `1`          |
| `sum`        | Sum                | `sum(1, 2, 3)` → `6`          |

### Units

| Example          | Result                        |
| ---------------- | ----------------------------- |
| `5 km + 3000 m`  | `8 km`                        |
| `100 km/h * 2 h` | `200 km`                      |
| `.convert m`     | Convert last result to meters |

---

## Commands

### Core Commands

| Command   | Aliases    | Description              |
| --------- | ---------- | ------------------------ |
| `.parse`  | `.p`       | Show parse info          |
| `.tree`   | `.t`       | Show AST tree            |
| `.latex`  | `.l`       | Convert to LaTeX         |
| `.custom` | `.c`       | Convert to custom syntax |
| `.help`   | `.h`, `.?` | Show help                |

### Normalization

| Command     | Aliases | Description         |
| ----------- | ------- | ------------------- |
| `.simplify` | `.s`    | Simplify expression |
| `.normal`   | `.n`    | Normal form         |
| `.hash`     |         | Semantic hash       |
| `.equiv`    | `.eq`   | Check equivalence   |

### Evaluation

| Command  | Aliases | Description          |
| -------- | ------- | -------------------- |
| `.eval`  | `.e`    | Evaluate numerically |
| `.let`   |         | Define variable      |
| `.vars`  | `.v`    | List variables       |
| `.unset` |         | Remove variable      |
| `.clear` |         | Clear all variables  |
| `.mode`  | `.m`    | Set eval mode        |

### Functions

| Command      | Aliases | Description       |
| ------------ | ------- | ----------------- |
| `.def`       |         | Define function   |
| `.def-deriv` |         | Define derivative |
| `.inv`       |         | Define inverse    |
| `.fns`       | `.f`    | List functions    |
| `.undef`     |         | Remove function   |

### Calculus

| Command   | Description   | Example              |
| --------- | ------------- | -------------------- |
| `.diff`   | Differentiate | `.diff x^2` → `2*x`  |
| `.taylor` | Taylor series | `.taylor sin(x) 0 5` |

### Statistics

| Command   | Description         | Example                 |
| --------- | ------------------- | ----------------------- |
| `.stats`  | Statistical summary | `.stats 1, 2, 3, 4, 5`  |
| `.linreg` | Linear regression   | `.linreg 1,2,3 : 2,4,6` |

### Units

| Command     | Description         | Example        |
| ----------- | ------------------- | -------------- |
| `.convert`  | Convert units       | `.convert m`   |
| `.unitmode` | Set conversion mode | `.unitmode si` |

---

## Unit Conversion Modes

| Mode    | Description                               |
| ------- | ----------------------------------------- |
| `first` | Convert to first operand's unit (default) |
| `si`    | Convert to SI base units                  |
| `best`  | Choose most appropriate unit              |

---

## Error Handling

```typescript
const result = engine.execute('1/0');

if (!result.success) {
	console.log(result.error?.code); // 'MATH_ERROR'
	console.log(result.error?.message); // 'Division by zero'
}
```

### Error Codes

| Code                 | Description                  |
| -------------------- | ---------------------------- |
| `PARSE_ERROR`        | Expression parsing failed    |
| `NO_AST`             | No AST available for command |
| `UNKNOWN_COMMAND`    | Command not found            |
| `INVALID_OPTIONS`    | Invalid command arguments    |
| `MATH_ERROR`         | Mathematical error           |
| `DIMENSION_MISMATCH` | Unit dimension mismatch      |
| `UNKNOWN_UNIT`       | Unknown unit symbol          |

---

## Security Limits

| Limit            | Value             |
| ---------------- | ----------------- |
| Evaluation depth | 100 levels        |
| Stats values     | 1000 max          |
| Linreg values    | 1000 max per axis |

---

## Full Example

```typescript
import { WebReplEngine } from '$lib/mathAST/cli/web';

const engine = new WebReplEngine();

// Define a function
engine.execute('.def f(x) = x^2 + 1');

// Define its derivative
engine.execute('.def-deriv f 2*x');

// Evaluate at a point
engine.execute('.let a = 3');
const result = engine.execute('f(a)');
console.log(result.output); // "10"

// Differentiate
const diff = engine.execute('.diff f(x)');
console.log(diff.output); // "2*x"

// Taylor expansion
const taylor = engine.execute('.taylor f(x) 0 3');
console.log(taylor.output); // "1 + x^2"

// Statistics
const stats = engine.execute('.stats 1, 2, 3, 4, 5');
console.log(stats.output);
// "Moyenne: 3, Mediane: 3, Ecart-type: 1.58..."

// Units
engine.execute('5 km + 3000 m');
const converted = engine.execute('.convert m');
console.log(converted.output); // "8000 m"

// Get all defined functions
const fns = engine.getFunctions();
console.log(fns);
// [{ name: 'f', parameters: ['x'], expression: 'x^2 + 1', derivative: '2*x' }]
```
