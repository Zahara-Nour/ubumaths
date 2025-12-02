# MathAST CLI

Command-line interface for parsing and displaying mathematical expressions.

## Quick Start

```bash
# Parse expression (shows AST tree + LaTeX)
pnpm math "x^2 + 3x - 5"

# Start interactive REPL
pnpm math
```

## Commands

### Parse (default)

Parse an expression and display both AST tree and LaTeX output.

```bash
pnpm math "x^2 + 3x - 5"
pnpm math parse "x^2 + 3x - 5"
pnpm math p "x^2 + 3x - 5"
```

**Output:**

```
Addition
├─ left:
│  └─ Superscript
│     ├─ base:
│     │  └─ Variable: x
│     └─ exponent:
│        └─ Number: 2
└─ right:
   └─ Multiplication [implicit]
      ├─ left:
      │  └─ Number: 3
      └─ right:
         └─ Variable: x

LaTeX: x^2 + 3 x - 5
```

### Tree

Display only the AST tree.

```bash
pnpm math tree "\frac{a}{b}"
pnpm math t "\frac{a}{b}"

# Disable colors
pnpm math tree "\frac{a}{b}" --no-colors
```

### LaTeX

Output only the LaTeX representation.

```bash
pnpm math latex "\sqrt{x^2 + 1}"
pnpm math l "\sqrt{x^2 + 1}"

# Include metadata (colors, styles)
pnpm math latex "\sqrt{x}" --metadata
```

### REPL

Start an interactive Read-Eval-Print Loop.

```bash
pnpm math
pnpm math repl
```

**REPL Session:**

```
MathAST REPL
Enter LaTeX expressions to parse. Commands: .help, .quit

math> x^2 + 3x
[AST tree output]
LaTeX: x^2 + 3 x

math> \frac{a+b}{c}
[AST tree output]
LaTeX: \frac{a + b}{c}

math> .help
MathAST CLI - Available Commands

  parse (p)
    Parse expression and display AST + LaTeX
  tree (t, ast)
    Display the AST as a tree
  latex (l, tex)
    Output LaTeX representation
  help (h, ?)
    Show available commands

In REPL, prefix commands with . (e.g., .help, .tree)

math> .quit
Goodbye!
```

**REPL Commands:**

| Command  | Action                               |
| -------- | ------------------------------------ |
| `.help`  | Show available commands              |
| `.quit`  | Exit REPL                            |
| `.exit`  | Exit REPL (alias)                    |
| `.tree`  | Show AST of last parsed expression   |
| `.latex` | Show LaTeX of last parsed expression |

## Supported LaTeX Syntax

### Basic

| Type          | Examples                              |
| ------------- | ------------------------------------- |
| Numbers       | `42`, `3.14`, `.5`                    |
| Variables     | `x`, `y`, `velocity`                  |
| Greek letters | `\alpha`, `\beta`, `\Delta`, `\Omega` |
| Symbols       | `\infty`, `\partial`, `\nabla`        |

### Operations

| Type           | Examples                                            |
| -------------- | --------------------------------------------------- |
| Addition       | `x + y`                                             |
| Subtraction    | `x - y`                                             |
| Multiplication | `x * y`, `x \cdot y`, `x \times y`, `xy` (implicit) |
| Division       | `x / y`, `\frac{x}{y}`                              |
| Power          | `x^2`, `x^{n+1}`                                    |
| Subscript      | `x_1`, `x_{ij}`                                     |

### Functions

| Type                | Examples                         |
| ------------------- | -------------------------------- |
| Trigonometric       | `\sin(x)`, `\cos(x)`, `\tan(x)`  |
| Inverse trig        | `\arcsin(x)`, `\arccos(x)`       |
| Logarithmic         | `\ln(x)`, `\log(x)`, `\log_2(x)` |
| Exponential         | `\exp(x)`                        |
| Square root         | `\sqrt{x}`, `\sqrt[3]{x}`        |
| Powers of functions | `\sin^2(x)`, `\cos^{-1}(x)`      |

### Relations

| Type          | Examples                                 |
| ------------- | ---------------------------------------- |
| Equality      | `x = 5`                                  |
| Inequalities  | `x < y`, `x > y`, `x \leq y`, `x \geq y` |
| Not equal     | `x \neq y`                               |
| Approximation | `x \approx y`                            |

### Delimiters

| Type           | Examples                      |
| -------------- | ----------------------------- | --- | --------- | -------- | --- |
| Parentheses    | `(x + y)`, `\left( x \right)` |
| Absolute value | `                             | x   | `, `\left | x \right | `   |

## Examples

### Simple Expressions

```bash
pnpm math "x + y"
pnpm math "2x + 3"
pnpm math "x^2 - 1"
```

### Fractions

```bash
pnpm math "\frac{1}{2}"
pnpm math "\frac{x+1}{x-1}"
pnpm math "\frac{a}{b} + \frac{c}{d}"
```

### Functions

```bash
pnpm math "\sin(x)"
pnpm math "\cos^2(x) + \sin^2(x)"
pnpm math "\log_2(8)"
pnpm math "\sqrt{x^2 + y^2}"
```

### Complex Expressions

```bash
pnpm math "x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}"
pnpm math "\int_0^1 x^2 dx"
pnpm math "\sum_{i=1}^n i^2"
```

## Programmatic Usage

```typescript
import { parse, createDefaultRegistry, startRepl } from '$lib/mathAST/cli';

// Parse expression
const result = parse('x^2 + y');
if (result.ast) {
	console.log('Parsed successfully');
	console.log('Format:', result.inputFormat);
}

// Handle errors
if (result.errors.length > 0) {
	for (const err of result.errors) {
		console.error(`Error: ${err.message} at position ${err.position}`);
	}
}

// Use commands programmatically
const registry = createDefaultRegistry();
const treeCmd = registry.get('tree');

if (treeCmd && result.ast) {
	const output = treeCmd.execute({
		ast: result.ast,
		input: 'x^2 + y',
		format: 'latex',
		options: { colors: false },
		isRepl: false
	});
	console.log(output.output);
}

// Start REPL programmatically
startRepl();
```

## Architecture

```
cli/
├── index.ts           # Public exports
├── types.ts           # Type definitions
├── cli.ts             # Commander entry point
├── repl.ts            # Interactive REPL
├── core/
│   ├── input-detector.ts   # LaTeX detection
│   ├── pipeline.ts         # Parse pipeline
│   ├── output-formatter.ts # Chalk formatting
│   └── command-registry.ts # Command registry
└── commands/
    ├── base-command.ts     # Abstract base class
    ├── parse.command.ts    # Parse + display
    ├── tree.command.ts     # AST tree output
    ├── latex.command.ts    # LaTeX output
    └── help.command.ts     # Help command
```

## Adding New Commands

1. Create a new command file:

```typescript
// commands/simplify.command.ts
import { BaseCommand } from './base-command';
import type { CommandContext, CommandResult } from '../types';

export class SimplifyCommand extends BaseCommand {
	readonly name = 'simplify';
	readonly aliases = ['s', 'simp'] as const;
	readonly description = 'Simplify mathematical expression';
	readonly usage = 'simplify <expression>';

	execute(ctx: CommandContext): CommandResult {
		if (!ctx.ast) {
			return {
				success: false,
				output: '',
				error: { code: 'NO_AST', message: 'No expression to simplify' }
			};
		}

		// Implement simplification logic
		const simplified = simplify(ctx.ast);

		return {
			success: true,
			output: toLatex(simplified),
			ast: simplified
		};
	}
}
```

2. Export from `commands/index.ts`:

```typescript
export { SimplifyCommand } from './simplify.command';
```

3. Register in `createDefaultRegistry()`:

```typescript
import { SimplifyCommand } from './simplify.command';

export function createDefaultRegistry(): CommandRegistry {
	const registry = new CommandRegistry();
	// ... existing commands ...
	registry.register(new SimplifyCommand());
	return registry;
}
```

The new command is now available:

- CLI: `pnpm math simplify "x + x"`
- REPL: `.simplify` or `.s`
