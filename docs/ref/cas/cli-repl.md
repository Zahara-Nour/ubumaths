# CLI and REPL System

## Overview

MathAST includes a comprehensive REPL (Read-Eval-Print Loop) system for interactive mathematical computation. It's available both as a CLI tool and as a web component.

## Web REPL

### Location

- **Engine**: `src/lib/mathAST/cli/web/`
- **UI Components**: `src/lib/components/cas/`
- **Store**: `src/lib/stores/repl.svelte.ts`
- **Page**: `src/routes/(public)/cas/+page.svelte`

### Components

```svelte
<!-- ReplContainer.svelte -->
<script>
	import { replStore } from '$lib/stores/repl.svelte';
	import ReplInput from './ReplInput.svelte';
	import ReplOutput from './ReplOutput.svelte';
</script>

<div class="repl">
	<ReplOutput variant={activeTab} />
	<ReplInput variant={activeTab === 'terminal' ? 'terminal' : 'mathfield'} />
</div>
```

### Display Modes

| Mode         | Description                        |
| ------------ | ---------------------------------- |
| **Terminal** | Classic terminal-style output      |
| **Modern**   | Card-based UI with labels          |
| **Hybrid**   | Terminal input + card-style output |

### Exact/Decimal Toggle

For expressions where exact and decimal representations differ, a toggle button appears next to the result:

```
1/3         →  1/3  [⇄]     (click to toggle)
            →  ≈ 0.333...

1/2 [m]     →  1/2 m  [⇄]
            →  ≈ 0.5 m

1/2+1/3     →  5/6  [⇄]
            →  ≈ 0.833...
```

The toggle is per-result and doesn't change the global evaluation mode.

## Commands

### Command Registry

```typescript
import { createDefaultRegistry } from '$lib/mathAST/cli/commands';

const registry = createDefaultRegistry();
// Registers all default commands with aliases
```

### Available Commands

#### Core Commands

| Command  | Aliases  | Description                        |
| -------- | -------- | ---------------------------------- |
| `parse`  | `p`      | Parse expression and show AST type |
| `tree`   | `t`      | Show AST as tree diagram           |
| `latex`  | `l`      | Convert to LaTeX notation          |
| `custom` | `c`      | Convert to custom notation         |
| `help`   | `h`, `?` | Show help information              |

#### Normalization Commands

| Command    | Aliases | Description                         |
| ---------- | ------- | ----------------------------------- |
| `simplify` | `s`     | Simplify expression                 |
| `normal`   | `n`     | Show canonical normal form          |
| `hash`     | -       | Show canonical hash                 |
| `equiv`    | `eq`    | Test equivalence of two expressions |

#### Evaluation Commands

| Command | Aliases | Description                         |
| ------- | ------- | ----------------------------------- |
| `eval`  | `e`     | Evaluate expression numerically     |
| `let`   | -       | Define variable binding             |
| `vars`  | `v`     | Show all variable bindings          |
| `unset` | -       | Remove variable binding             |
| `clear` | `clr`   | Clear all bindings                  |
| `mode`  | `m`     | Set evaluation mode (exact/decimal) |

#### Function Commands

| Command     | Aliases | Description                     |
| ----------- | ------- | ------------------------------- |
| `def`       | `d`     | Define a function               |
| `def-deriv` | `dd`    | Define function with derivative |
| `inv`       | -       | Define inverse function         |
| `fns`       | `f`     | List all functions              |
| `undef`     | -       | Remove function definition      |

#### Calculus Commands

| Command  | Aliases | Description              |
| -------- | ------- | ------------------------ |
| `diff`   | -       | Differentiate expression |
| `taylor` | -       | Taylor series expansion  |

#### Unit Commands

| Command    | Aliases | Description                         |
| ---------- | ------- | ----------------------------------- |
| `convert`  | -       | Convert last result to target unit  |
| `unitmode` | -       | Set conversion mode (first/si/best) |

## Command Syntax

### Basic Expression Input

```
> 2 + 3
5

> x^2 + 3x - 5
x² + 3x - 5
```

### Command Invocation

Commands are prefixed with `.` (dot):

```
> .parse x^2
ParseResult { type: 'superscript', ... }

> .tree x^2
superscript
├── base: variable "x"
└── superscript: number "2"

> .latex sin(x)
\sin(x)
```

### Command Options

```
> .diff x^3
3x²

> .diff x*y --var y
x

> .eval 1/3 --mode decimal
0.3333333333333333

> .equiv x+y, y+x
true (equivalent)
```

## Variable Bindings

### Setting Variables

```
> .let x = 5
x = 5

> .let y = 2*pi
y = 2π

> x + y
5 + 2π

> .eval x + 1
6
```

### Inline Assignment Syntax

```
> x = 5          # equivalent to .let x = 5
x = 5
```

### Listing Variables

```
> .vars
Variables:
  x = 5
  y = 2π
```

### Clearing

```
> .unset x
Variable x removed

> .clear
All bindings cleared
```

## Function Definitions

### Simple Definition

```
> .def f(x) = x^2 + 1
Function f defined

> f(3)
10

> .diff f(x)
2x
```

### Inline Definition Syntax

```
> f(x) = x^2 + 1    # equivalent to .def f(x) = x^2 + 1
Function f defined
```

### With Derivative

```
> .def' f(x) = sin(x), f'(x) = cos(x)
Function f defined with derivative

> .diff f(x)
cos(x)
```

### With Inverse

```
> .inv f(x) = x^2, f^{-1}(x) = sqrt(x)
Function f defined with inverse

> f^{-1}(9)
3
```

### Listing Functions

```
> .fns
Functions:
  f(x) = x² + 1
  g(x) = sin(x)  [derivative: cos(x)]
```

## Evaluation Modes

### Exact Mode (Default)

```
> .mode exact      # or simply: .exact
Mode set to: exact

> 1/3 + 1/6
1/2

> sqrt(16)
4
```

### Decimal Mode

```
> .mode decimal    # or simply: .decimal
Mode set to: decimal

> 1/3
≈ 0.333...

> sqrt(2)
≈ 1.414...

> sin(pi/4)
≈ 0.707...
```

## Units

### Unit Syntax

Units can be specified using bracket notation or LaTeX `\unit{}`:

```
> 5[m]              # 5 meters
5 m

> 1/2 [km]          # half a kilometer (with space)
1/2 km

> 3~\unit{m/s}      # LaTeX-style unit
3 m/s

> 5[km] + 300[m]    # Unit arithmetic
5.3 km
```

### Unit Conversion

```
> 5[km]
5 km

> .convert m        # Convert last result to meters
5000 m

> .unitmode si      # Always convert to SI units
> .unitmode first   # Use first operand's unit (default)
> .unitmode best    # Choose best readable unit
```

## Keyboard Shortcuts

| Shortcut  | Action                               |
| --------- | ------------------------------------ |
| `↑` / `↓` | Navigate command history             |
| `Ctrl+R`  | Search command history               |
| `Ctrl+S`  | Previous search result (in search)   |
| `Escape`  | Cancel history navigation/search     |
| `Enter`   | Execute input / Select search result |

### History Search (Ctrl+R)

Press `Ctrl+R` to activate reverse search mode. Type to filter history entries:

```
(search): sin        # Shows entries containing "sin"
                     # Press Ctrl+R again for next match
                     # Press Enter to select and edit
                     # Press Escape to cancel
```

## Inline Syntax Shortcuts

These shortcuts provide a more natural syntax without dot-commands:

| Syntax       | Equivalent Command |
| ------------ | ------------------ |
| `x = 5`      | `.let x = 5`       |
| `f(x) = x^2` | `.def f(x) = x^2`  |
| `a === b`    | `.equiv a, b`      |

## REPL Engine Architecture

### WebReplEngine

```typescript
class WebReplEngine {
	private registry: CommandRegistry;
	private state: EvalState;

	async execute(input: string): Promise<ReplExecutionResult> {
		// Parse input
		const parsed = this.parseInput(input);

		// Check for command
		if (parsed.isCommand) {
			return this.executeCommand(parsed);
		}

		// Evaluate expression
		return this.evaluateExpression(parsed);
	}
}
```

### Command Interface

```typescript
interface Command {
	name: string;
	aliases: string[];
	description: string;
	options: OptionDefinition[];

	execute(context: CommandContext): CommandResult;
}

interface CommandContext {
	input: string;
	ast?: MathNode;
	format: 'latex' | 'custom';
	options: Record<string, unknown>;
	isRepl: boolean;
	state: EvalState;
}

interface CommandResult {
	success: boolean;
	output?: string;
	ast?: MathNode;
	error?: string;
}
```

### State Management

```typescript
interface EvalState {
	// Variable bindings
	variables: Map<string, MathNode>;

	// Function definitions
	functions: FunctionBindings;

	// Evaluation mode
	mode: 'exact' | 'decimal';

	// Input format preference
	format: 'latex' | 'custom';
}
```

## Output Formatting

### HTML Output (Web)

```typescript
import {
	formatSuccessHtml,
	formatErrorHtml,
	formatTreeHtml,
	formatHashHtml
} from '$lib/mathAST/cli/web';

// Success with LaTeX
formatSuccessHtml('x^2', '\\frac{d}{dx} x^2 = 2x');

// Error message
formatErrorHtml('Division by zero');

// Tree visualization
formatTreeHtml(astNode);
```

### Terminal Output

```typescript
import { formatSuccess, formatError } from '$lib/mathAST/cli/core';

formatSuccess('Result: 42');
formatError('Invalid input');
```

## History Management

### REPL Store

```typescript
// src/lib/stores/repl.svelte
interface ReplStore {
	// History entries
	history: ReplHistoryEntry[];

	// Current tab style
	activeTab: TabStyle;

	// Input mode (latex/custom)
	inputMode: ReplInputMode;

	// Actions
	execute(input: string): Promise<void>;
	clearHistory(): void;
}

interface ReplHistoryEntry {
	id: string;
	input: string;
	inputMode: ReplInputMode;
	result: ReplExecutionResult;
	isCommand: boolean;
	timestamp: number;
}

interface ReplExecutionResult {
	success: boolean;
	output: string;
	outputHtml?: string;
	latex?: string;
	error?: { code: string; message: string };
	// Toggle support (exact/decimal)
	exactOutput?: string;
	exactOutputHtml?: string;
	decimalOutput?: string;
	decimalOutputHtml?: string;
	canToggle?: boolean;
}
```

### Usage

```svelte
<script>
	import { replStore } from '$lib/stores/repl.svelte';

	async function handleSubmit(input: string) {
		await replStore.execute(input);
	}
</script>

{#each replStore.history as entry}
	<div class="entry">
		<div class="input">{entry.input}</div>
		<div class="output">{entry.result.output}</div>
	</div>
{/each}
```

## Input Detection

### Automatic Format Detection

```typescript
function detectInputFormat(input: string): 'latex' | 'custom' {
	// Check for LaTeX markers
	if (input.includes('\\') || input.includes('{')) {
		return 'latex';
	}
	return 'custom';
}

// Unit detection pattern (bracket notation)
// Matches: 5[m], 1/2 [km], x[m/s], (a+b)[N]
const UNIT_PATTERN = /[\d\w)]\s*\[[a-zA-Z][a-zA-Z0-9^/*-]*\]/;
```

### Command Detection

```typescript
function parseInput(input: string): ParsedInput {
	const trimmed = input.trim();

	// Commands start with .
	if (trimmed.startsWith('.')) {
		const [command, ...args] = trimmed.slice(1).split(/\s+/);
		return { isCommand: true, command, args };
	}

	return { isCommand: false, expression: trimmed };
}
```

## Creating Custom Commands

```typescript
import { BaseCommand } from '$lib/mathAST/cli/commands';

class MyCommand extends BaseCommand {
	constructor() {
		super({
			name: 'mycommand',
			aliases: ['mc'],
			description: 'My custom command',
			options: [{ name: 'flag', alias: 'f', type: 'boolean' }]
		});
	}

	execute(context: CommandContext): CommandResult {
		// Implementation
		return {
			success: true,
			output: 'Command executed!'
		};
	}
}

// Register
registry.register(new MyCommand());
```

## Testing

```bash
pnpm test:client src/lib/mathAST/cli
```

Test files:

```
src/lib/mathAST/cli/__tests__/
├── pipeline.test.ts
├── input-detector.test.ts
├── repl.test.ts
└── commands/
    ├── parse.command.test.ts
    ├── simplify.command.test.ts
    ├── eval.command.test.ts
    ├── diff.command.test.ts
    └── ... (all commands)
```
