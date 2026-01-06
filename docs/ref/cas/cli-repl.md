# CLI and REPL System

## Overview

MathAST includes a comprehensive REPL (Read-Eval-Print Loop) system for interactive mathematical computation. It's available both as a CLI tool and as a web component.

## Web REPL

### Location

- **Engine**: `src/lib/mathAST/cli/web/`
- **UI Components**: `src/lib/components/cas/`
- **Store**: `src/lib/stores/repl.svelte`
- **Page**: `src/routes/(public)/cas/+page.svelte`

### Components

```svelte
<!-- ReplContainer.svelte -->
<script>
	import { replStore } from '$lib/stores/repl.svelte';
	import ReplInput from './ReplInput.svelte';
	import ReplOutput from './ReplOutput.svelte';
	import AstDrawer from './AstDrawer.svelte';
</script>

<div class="repl">
	<ReplOutput history={replStore.history} />
	<ReplInput onSubmit={replStore.execute} />
</div>
<AstDrawer ast={selectedAst} />
```

### Display Modes

| Mode         | Description                          |
| ------------ | ------------------------------------ |
| **Terminal** | Classic terminal-style output        |
| **Modern**   | LaTeX-rendered mathematical notation |
| **Hybrid**   | Combined terminal and LaTeX display  |

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

## Command Syntax

### Basic Expression Input

```
> 2 + 3
5

> x^2 + 3x - 5
x² + 3x - 5
```

### Command Invocation

```
> :parse x^2
ParseResult { type: 'superscript', ... }

> :tree x^2
superscript
├── base: variable "x"
└── superscript: number "2"

> :latex sin(x)
\sin(x)
```

### Command Options

```
> :diff x^3
3x²

> :diff x*y --var y
x

> :eval 1/3 --mode decimal
0.3333333333333333

> :equiv x+y, y+x
true (equivalent)
```

## Variable Bindings

### Setting Variables

```
> :let x = 5
x = 5

> :let y = 2*pi
y = 2π

> x + y
5 + 2π

> :eval x + 1
6
```

### Listing Variables

```
> :vars
Variables:
  x = 5
  y = 2π
```

### Clearing

```
> :unset x
Variable x removed

> :clear
All bindings cleared
```

## Function Definitions

### Simple Definition

```
> :def f(x) = x^2 + 1
Function f defined

> f(3)
10

> :diff f(x)
2x
```

### With Derivative

```
> :def-deriv f(x) = sin(x), f'(x) = cos(x)
Function f defined with derivative

> :diff f(x)
cos(x)
```

### With Inverse

```
> :inv f(x) = x^2, f^{-1}(x) = sqrt(x)
Function f defined with inverse

> f^{-1}(9)
3
```

### Listing Functions

```
> :fns
Functions:
  f(x) = x² + 1
  g(x) = sin(x)  [derivative: cos(x)]
```

## Evaluation Modes

### Exact Mode (Default)

```
> :mode exact
Mode set to: exact

> 1/3 + 1/6
1/2

> sqrt(16)
4
```

### Decimal Mode

```
> :mode decimal
Mode set to: decimal

> 1/3
0.3333333333333333

> sqrt(2)
1.4142135623730951

> sin(pi/4)
0.7071067811865476
```

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
	result: ReplExecutionResult;
	timestamp: number;
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
```

### Command Detection

```typescript
function parseInput(input: string): ParsedInput {
	const trimmed = input.trim();

	// Commands start with :
	if (trimmed.startsWith(':')) {
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
