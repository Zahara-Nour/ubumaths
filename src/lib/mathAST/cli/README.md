# MathAST CLI

Command-line interface for parsing and displaying mathematical expressions. Supports both LaTeX and custom syntax input.

## Quick Start

```bash
# Parse expression (shows AST tree + LaTeX + custom syntax)
pnpm math "x^2 + 3x - 5"

# Parse with specific input format
pnpm math --format=latex "\frac{a}{b}"
pnpm math --format=custom "a/b"

# Start interactive REPL
pnpm math
```

## Commands

### Parse (default)

Parse an expression and display AST tree, LaTeX, and custom syntax output.

```bash
pnpm math "x^2 + 3x - 5"
pnpm math parse "x^2 + 3x - 5"
pnpm math p "x^2 + 3x - 5"

# Force input format
pnpm math parse --format=latex "\frac{a}{b}"
pnpm math parse --format=custom "a/b"
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

LaTeX:  x^2 + 3 x - 5
Custom: x^2+3x-5
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

# Parse custom syntax, output LaTeX
pnpm math latex --format=custom "sqrt(x^2+1)"
```

### Custom

Output only the custom syntax representation.

```bash
pnpm math custom "\frac{a}{b}"
pnpm math c "\frac{a}{b}"
# Output: a/b

# Include metadata (colors)
pnpm math custom "\sqrt{x}" --metadata

# Parse custom syntax, output custom
pnpm math custom --format=custom "2x^2+3x+1"
```

### Simplify

Simplify a mathematical expression and display the canonical form.

```bash
pnpm math simplify "2x + 3x"
pnpm math s "2x + 3x"
pnpm math simp "x^2 - x^2 + 5"
```

**Output:**

```
Simplified: 5x
LaTeX:  5 x
Custom: 5x
Hash:   V(x)*5
```

### Normal

Display the detailed normal form structure of an expression, including a simplified human-readable version.

```bash
pnpm math normal "2x + 3x"
pnpm math n "x^2 + 2x + 1"
pnpm math norm "(a+b)^2"
```

**Output:**

```
NormalForm:
  Numerator:
    Term 1: coefficient=5, monomial=[x^1]
  Denominator: [1]

Simplified: 5x
Hash:       5*V(x)
```

### Hash

Compute the canonical hash of an expression. Equivalent expressions have identical hashes.

```bash
pnpm math hash "2x + 3x"
pnpm math h "5x"
```

**Output:**

```
Hash: V(x)*5
```

### Equiv

Check if two mathematical expressions are equivalent. Supports two syntaxes:

```bash
# Two argument syntax
pnpm math equiv "2x + 3x" "5x"
pnpm math eq "x^2 - 1" "(x+1)(x-1)"

# === operator syntax (single argument)
pnpm math "2x + 3x === 5x"
pnpm math "(a+b)^2 === a^2 + 2ab + b^2"
```

**Output:**

```
Equivalent: true

Expression 1: 2x + 3x
  Hash: V(x)*5

Expression 2: 5x
  Hash: V(x)*5
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
Enter expressions to parse (LaTeX or custom syntax).
Mode commands: .latex, .custom, .auto | Other: .help, .quit

math> x^2 + 3x
[AST tree output]
LaTeX:  x^2 + 3 x
Custom: x^2+3x

math> \frac{a+b}{c}
[AST tree output]
LaTeX:  \frac{a + b}{c}
Custom: {a+b}/c

math> .custom
Input mode: Custom syntax

math[custom]> 2x^2+3x+1
[AST tree output]
LaTeX:  2 x^2 + 3 x + 1
Custom: 2x^2+3x+1

math[custom]> .auto
Input mode: Auto-detect

math> .quit
Goodbye!
```

**REPL Commands:**

| Command                  | Action                                  |
| ------------------------ | --------------------------------------- |
| `.help`                  | Show available commands                 |
| `.quit`                  | Exit REPL                               |
| `.exit`                  | Exit REPL (alias)                       |
| `.latex`                 | Switch to LaTeX input mode              |
| `.custom`                | Switch to custom syntax input mode      |
| `.auto`                  | Switch to auto-detect input mode        |
| `.tree`                  | Show AST of last parsed expression      |
| `.latex`                 | Show LaTeX of last parsed expression    |
| `.custom`                | Show custom of last parsed expression   |
| `.simplify`              | Simplify the last parsed expression     |
| `.normal`                | Show normal form of last expression     |
| `.hash`                  | Show hash of last parsed expression     |
| `.equiv`                 | Check equivalence (use with === syntax) |
| `.eval` or `.e`          | Evaluate expression with variables      |
| `.let <name>=<expr>`     | Define a variable binding               |
| `.vars` or `.v`          | List all defined variables              |
| `.clear` or `.clr`       | Clear all variable bindings             |
| `.unset <name>`          | Remove a single variable                |
| `.mode [exact\|decimal]` | Show or set evaluation mode             |

## Variable Bindings

The REPL supports defining and using variables through an evaluation state system. Variables can be defined, listed, evaluated, and removed during your REPL session.

### Defining Variables with `.let`

Use the `.let` command to define a variable binding:

```
math> .let x=5
Defined: x = 5

math> .let y = 2+3
Defined: y = 2+3

math> .let velocity = sqrt(2*9.81*10)
Defined: velocity = sqrt(2*9.81*10)
```

**Syntax:**

- `.let <name>=<expression>` - Define a variable
- Variable names must start with a letter or underscore
- Variable names can contain letters, numbers, and underscores
- Spaces around `=` are optional
- The expression is parsed but NOT evaluated (stored as AST)

### Inline Variable Assignment

You can also define variables without the `.let` command using inline syntax:

```
math> x = 5
x = 5

math> y = x * 2
y = x * 2

math> result = x^2 + y
result = x^2 + y
```

The REPL automatically detects assignment syntax (pattern: `name = expression`) and treats it as `.let`.

### Listing Variables with `.vars`

Use `.vars` (or `.v` or `.variables`) to list all defined variables:

```
math> .vars
Variables:
  result = x^2 + y
  velocity = sqrt(2*9.81*10)
  x = 5
  y = x * 2
```

Variables are displayed in alphabetical order with their stored expressions (not evaluated values).

### Removing Variables

**Remove one variable:**

```
math> .unset x
Removed variable: x

math> .unset velocity
Removed variable: velocity
```

Aliases: `.del`, `.delete`

**Clear all variables:**

```
math> .clear
Cleared 4 variable(s)

math> .vars
No variables defined
```

Alias: `.clr`

### Variable Scope

Variables are session-scoped:

- Defined variables persist throughout your REPL session
- Variables are NOT shared between different REPL sessions
- Exiting the REPL clears all variables
- Variables can be redefined (overwritten) at any time

## Evaluation

The REPL includes a powerful evaluation engine that can substitute variables and compute numeric results.

### Evaluating Expressions with `.eval`

Use `.eval` (or `.e`) to evaluate an expression with variable substitution:

```
math> .let x=5
Defined: x = 5

math> .let y=3
Defined: y = 3

math> .eval x^2 + y
Result: 28 (exact)
Mode:   exact

math> .eval sin(x) + cos(y)
Result: -1.8488724885405782 (approximate)
Mode:   exact
```

**How it works:**

1. Substitutes all defined variables in the expression
2. Evaluates the resulting expression numerically
3. Shows whether the result is exact or approximate
4. Respects the current evaluation mode (exact or decimal)

### Auto-Evaluation

If you enter an expression that contains only defined variables, the REPL automatically evaluates it:

```
math> x = 5
x = 5

math> y = 3
y = 3

math> x + y
Evaluating with: {x: 5, y: 3}
Result: 8 (exact)
LaTeX:  8
```

Auto-evaluation only triggers when ALL variables in the expression are defined. If any variable is undefined, the expression is displayed without evaluation:

```
math> x = 5
x = 5

math> x + z
[AST tree output]
LaTeX:  x + z
Custom: x+z
```

### Evaluation Modes

The evaluation system supports two modes: **exact** (default) and **decimal**.

**Exact Mode** (default):

- Preserves exact values when possible
- Fractions remain as fractions: `1/2` stays `1/2`
- Square roots remain symbolic: `sqrt(2)` stays `sqrt(2)`
- Rational arithmetic is exact

**Decimal Mode**:

- Converts results to decimal approximations
- `1/2` becomes `0.5`
- `sqrt(2)` becomes `1.4142135623730951`
- Useful for numeric approximations

**Switching modes:**

```
math> .mode
Current mode: exact

math> .mode decimal
Mode set to: decimal

math> .eval 1/3
Result: 0.3333333333333333 (approximate)
Mode:   decimal

math> .mode exact
Mode set to: exact

math> .eval 1/3
Result: 1/3 (exact)
Mode:   exact
```

Alias: `.m`

### Evaluation Examples

**Arithmetic with variables:**

```
math> x = 10
math> y = 20
math> .eval x + y * 2
Result: 50 (exact)
```

**Trigonometric functions:**

```
math> angle = 0
math> .eval sin(angle)
Result: 0 (exact)
```

**Complex expressions:**

```
math> a = 2
math> b = 3
math> c = 4
math> .eval sqrt(a^2 + b^2 + c^2)
Result: 5.385164807134504 (approximate)
```

**Undefined variables:**

```
math> .eval x + undefined_var
Result: 5 + undefined_var (partial evaluation)
```

## Inline Syntax

The REPL supports convenient inline syntax for common operations without needing explicit commands.

### Variable Assignment: `x = 5`

Any input matching the pattern `<name> = <expression>` is automatically treated as a variable definition:

```
math> x = 5
x = 5

math> velocity = 100 * 0.277778
velocity = 100 * 0.277778
```

**Equivalent to:** `.let x=5`

**Detection rules:**

- Variable name must start with a letter or underscore
- Variable name can contain letters, numbers, underscores
- Optional spaces around `=`
- Everything after `=` is parsed as an expression

### Auto-Evaluation: Expressions with Known Variables

If all variables in an expression are defined, the REPL automatically evaluates it:

```
math> x = 5
x = 5

math> y = 3
y = 3

math> x^2 + 2*x*y + y^2
Evaluating with: {x: 5, y: 3}
Result: 64 (exact)
LaTeX:  64
```

**When auto-evaluation triggers:**

- Expression contains one or more variables
- ALL variables are defined in the current state
- Expression is not a command (doesn't start with `.`)
- Not an assignment (doesn't contain `=`)

**When auto-evaluation does NOT trigger:**

- Expression contains undefined variables
- Expression is purely numeric: `2+3` (just displays AST)
- Empty bindings (no variables defined)

### Mixed Usage Example

```
math> # Define variables
math> x = 10
x = 10

math> y = 5
y = 5

math> # Auto-evaluates (all vars defined)
math> x + y
Evaluating with: {x: 10, y: 5}
Result: 15 (exact)

math> # Explicit evaluation
math> .eval x * y
Result: 50 (exact)
Mode:   exact

math> # New expression with undefined var
math> x + z
[AST tree - z is undefined, no evaluation]

math> # Define missing var
math> z = 3
z = 3

math> # Now auto-evaluates
math> x + z
Evaluating with: {x: 10, z: 3}
Result: 13 (exact)
```

### Workflow Example

Complete workflow showing variable bindings and evaluation:

```
MathAST REPL
Enter expressions to parse (LaTeX or custom syntax).
Mode commands: .latex, .custom, .auto | Other: .help, .quit

math> # Set up a physics problem
math> g = 9.81
g = 9.81

math> h = 10
h = 10

math> # Calculate velocity
math> v = sqrt(2*g*h)
v = sqrt(2*g*h)

math> # Check our variables
math> .vars
Variables:
  g = 9.81
  h = 10
  v = sqrt(2*g*h)

math> # Evaluate velocity (exact mode)
math> .eval v
Result: sqrt(196.2) (exact)
Mode:   exact

math> # Switch to decimal for numeric result
math> .mode decimal
Mode set to: decimal

math> .eval v
Result: 14.007141035914502 (approximate)
Mode:   decimal

math> # Use in another calculation
math> kinetic_energy = 0.5 * 2 * v^2
kinetic_energy = 0.5 * 2 * v^2

math> kinetic_energy
Evaluating with: {kinetic_energy: 0.5 * 2 * v^2, v: sqrt(2*g*h), g: 9.81, h: 10}
Result: 196.20000000000002 (approximate)

math> # Clean up
math> .clear
Cleared 4 variable(s)

math> .quit
Goodbye!
```

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

## Supported Custom Syntax

Custom syntax is an ASCII Math-style format that's easier to type.

> **Auto-detection**: Functions like `sqrt(x)`, `sin(x)`, `cos(x)`, `ln(x)`, etc. are automatically detected as custom syntax and don't require the `.custom` mode.

### Basic

| Type          | Examples                  |
| ------------- | ------------------------- |
| Numbers       | `42`, `3.14`              |
| Variables     | `x`, `y`                  |
| Greek letters | `\pi`, `\alpha`, `\theta` |

### Operations

| Type           | Examples                |
| -------------- | ----------------------- |
| Addition       | `x + y`                 |
| Subtraction    | `x - y`                 |
| Multiplication | `2x`, `x*y`             |
| Fraction       | `a/b` (tight binding)   |
| Inline div     | `a:/b` (multiplicative) |
| Ratio          | `a:b`                   |
| Power          | `x^2`, `x^{n+1}`        |
| Subscript      | `x_1`, `x_{ij}`         |

### Functions

| Type          | Examples                      |
| ------------- | ----------------------------- |
| Trigonometric | `sin(x)`, `cos(x)`, `tan(x)`  |
| Logarithmic   | `ln(x)`, `log(x)`, `log_2(x)` |
| Square root   | `sqrt(x)`, `sqrt[3](x)` (nth) |
| Absolute      | `\|x\|`                       |
| Powers        | `sin^2(x)`                    |

### Colors and Units

| Type   | Examples                       |
| ------ | ------------------------------ |
| Colors | `@red{x}`, `@#FF0000{x}`       |
| Units  | `5[m]`, `10[m/s]`, `v[kg*m/s]` |

### Grouping

Use `{...}` for transparent grouping:

```
{a+b}/c    # (a+b)/c as a fraction
x^{n+1}    # x to the power of n+1
```

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
    ├── base-command.ts       # Abstract base class
    ├── parse.command.ts      # Parse + display
    ├── tree.command.ts       # AST tree output
    ├── latex.command.ts      # LaTeX output
    ├── custom.command.ts     # Custom syntax output
    ├── simplify.command.ts   # Simplify expression
    ├── normal.command.ts     # Normal form display
    ├── hash.command.ts       # Canonical hash
    ├── equiv.command.ts      # Equivalence check
    └── help.command.ts       # Help command
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
