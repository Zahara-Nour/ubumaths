# CLI & REPL

Command-line interface and interactive Read-Eval-Print Loop.

## Overview

MathAST includes:

- **REPL**: Interactive expression evaluation
- **Web REPL**: Browser-based interface
- **Commands**: 20+ specialized commands

## REPL Commands

### Expression Parsing

```
.parse <expr>     Parse expression and show AST
.tree <expr>      Show AST as tree visualization
.mode [mode]      Set input mode (latex|custom|auto)
```

**Examples:**

```
> .parse x^2 + 3x
{ type: 'addition', left: {...}, right: {...} }

> .tree sin(x)
Function: sin
└── Variable: x

> .mode latex
Input mode set to: latex
```

### Output Generation

```
.latex <expr>     Convert expression to LaTeX
.custom <expr>    Convert expression to custom syntax
```

**Examples:**

```
> .latex x^2 + 3x
x^{2} + 3 x

> .custom \frac{a}{b}
a/b
```

### Evaluation

```
.eval <expr>      Evaluate expression numerically
.let <var>=<val>  Set variable value
.vars             List defined variables
.clear            Clear all variables
```

**Examples:**

```
> .let x = 3
x = 3

> .eval x^2 + 1
10

> .let y = 2
> .eval x + y
5

> .vars
x = 3
y = 2

> .clear
Variables cleared
```

### Functions

```
.def <name>(x)=<expr>      Define function
.def-deriv <name>'(x)=<e>  Define derivative
.inv <name>^-1(x)=<e>      Define inverse
.fns                       List defined functions
```

**Examples:**

```
> .def f(x) = x^2 + 1
f(x) = x^2 + 1

> .eval f(3)
10

> .def-deriv f'(x) = 2x
f'(x) = 2x

> .inv f^-1(x) = sqrt(x - 1)
f^{-1}(x) = sqrt(x - 1)

> .fns
f(x) = x^2 + 1
f'(x) = 2x
f^{-1}(x) = sqrt(x - 1)
```

### Calculus

```
.diff <expr>      Differentiate with respect to x
.diff <expr> <v>  Differentiate with respect to variable
.taylor <expr>    Taylor expansion (default 5 terms)
.taylor <e> <n>   Taylor expansion with n terms
.domain <expr>    Compute domain of definition
.domain <e> <v>   Compute domain for variable
```

**Examples:**

```
> .diff x^3
3 x^2

> .diff x^2 * y^3 y
3 x^2 y^2

> .taylor sin(x) 5
x - x^3/6 + x^5/120

> .taylor e^x 4
1 + x + x^2/2 + x^3/6

> .domain sqrt(x)
Expression : sqrt(x)
Domaine : [0, +∞[
Condition : x >= 0

> .domain ln(x) + sqrt(1-x)
Expression : ln(x) + sqrt(1-x)
Contraintes :
  • ln(x) requiert x > 0
  • sqrt(1-x) requiert x <= 1
Domaine : ]0, 1]
Condition : 0 < x <= 1
```

### Simplification & Normalization

```
.simplify <expr>  Apply simplification rules
.normal <expr>    Convert to normal form
.hash <expr>      Compute canonical hash
.equiv <e1> <e2>  Check if expressions are equivalent
```

**Examples:**

```
> .simplify (x + 0) * 1
x

> .normal x + x
2x

> .equiv x^2 + 2x + 1 (x+1)^2
true: expressions are equivalent

> .hash x + y
a7b3c2d1...
```

### Utility

```
.help             Show all commands
.help <command>   Help for specific command
.quit             Exit REPL
```

## Web REPL

Browser-based REPL with Svelte integration:

### Store Usage

```typescript
// src/lib/stores/repl.svelte.ts
import { replStore } from '$lib/stores/repl.svelte';

// Execute command
const result = await replStore.execute('2 + 3');

// Access history
const history = replStore.history;

// Clear state
replStore.clear();
```

### Component Integration

```svelte
<script lang="ts">
	import { replStore } from '$lib/stores/repl.svelte';

	let input = $state('');

	async function handleSubmit() {
		const result = await replStore.execute(input);
		// result contains output or error
		input = '';
	}
</script>

<form on:submit|preventDefault={handleSubmit}>
	<input bind:value={input} placeholder="Enter expression..." />
</form>

{#each replStore.history as entry}
	<div class="input">&gt; {entry.input}</div>
	<div class="output">{entry.output}</div>
{/each}
```

### WebReplEngine

Direct engine usage:

```typescript
import { WebReplEngine } from '$lib/mathAST/cli/web';

const engine = new WebReplEngine();

// Execute expressions
const result1 = engine.execute('x^2 + 1');
const result2 = engine.execute('.let x = 3');
const result3 = engine.execute('.eval x^2 + 1');

// Access state
engine.getVariables(); // { x: 3 }
engine.getFunctions(); // {...}
engine.getMode(); // 'auto'

// Reset
engine.clear();
```

## REPL Architecture

### Input Detection

Auto-detects input type:

```typescript
// src/lib/mathAST/cli/core/input-detector.ts

type InputType = 'command' | 'latex' | 'custom' | 'auto';

// Commands start with '.'
'.parse x^2'  -> 'command'

// Auto-detection based on syntax
'\frac{1}{2}' -> 'latex'
'1/2'         -> 'custom'
'x^2 + 1'     -> 'auto' (works in both)
```

### Pipeline

Processing pipeline:

```
Input -> Detect Type -> Parse -> Execute -> Format Output
         |                         |
         v                         v
      Command               Expression
         |                    Eval
         v                      |
      Execute                   v
       Command              Result
```

### State Management

```typescript
// src/lib/mathAST/cli/core/eval-state.ts

interface EvalState {
	variables: Map<string, number>;
	functions: Map<string, FunctionDefinition>;
	mode: 'latex' | 'custom' | 'auto';
}
```

## Command Implementation

Commands are modular:

```typescript
// src/lib/mathAST/cli/commands/eval.command.ts

export const evalCommand: Command = {
	name: 'eval',
	aliases: ['e'],
	description: 'Evaluate expression numerically',
	usage: '.eval <expression>',

	execute(args: string, state: EvalState): CommandResult {
		const ast = parse(args, state.mode);
		const result = evaluate(ast, {
			variables: Object.fromEntries(state.variables),
			functions: Object.fromEntries(state.functions)
		});
		return {
			success: true,
			output: String(result.value)
		};
	}
};
```

### Available Commands

| Command      | Aliases | Description          |
| ------------ | ------- | -------------------- |
| `.parse`     | `.p`    | Parse and show AST   |
| `.tree`      | `.t`    | Show AST tree        |
| `.latex`     | `.l`    | Convert to LaTeX     |
| `.custom`    | `.c`    | Convert to custom    |
| `.eval`      | `.e`    | Evaluate numerically |
| `.let`       | -       | Set variable         |
| `.vars`      | `.v`    | List variables       |
| `.def`       | -       | Define function      |
| `.def-deriv` | -       | Define derivative    |
| `.inv`       | -       | Define inverse       |
| `.fns`       | `.f`    | List functions       |
| `.diff`      | `.d`    | Differentiate        |
| `.taylor`    | -       | Taylor series        |
| `.domain`    | `.dom`  | Domain of definition |
| `.simplify`  | `.s`    | Simplify             |
| `.normal`    | `.n`    | Normalize            |
| `.hash`      | -       | Compute hash         |
| `.equiv`     | -       | Check equivalence    |
| `.mode`      | `.m`    | Set input mode       |
| `.clear`     | -       | Clear state          |
| `.help`      | `.h`    | Show help            |
| `.quit`      | `.q`    | Exit                 |

## Interactive Session Example

```
MathAST REPL v1.0
Type .help for commands, .quit to exit

> 2 + 3
5

> .let x = 5
x = 5

> x^2 - 10
15

> .def f(x) = x^2 + 1
f(x) = x^2 + 1

> .eval f(3)
10

> .diff f(x)
2x

> .taylor sin(x) 4
x - x^3/6 + x^5/120 - x^7/5040

> .equiv x+x 2x
true: expressions are equivalent

> .latex (a+b)^2
\left( a + b \right)^{2}

> .simplify (x+0)*(1)
x

> .quit
Goodbye!
```

## Testing

```bash
# Run CLI tests
pnpm test:server src/lib/mathAST/cli/

# Test specific command
pnpm test:server src/lib/mathAST/cli/commands/eval.command.test.ts
```

## Auto-Completion

The Web REPL includes built-in auto-completion that appears as you type.

### Usage

1. Start typing a function name, variable, or greek letter (e.g., `si`)
2. A dropdown appears with matching suggestions
3. Use keyboard or mouse to select:

| Key     | Action                           |
| ------- | -------------------------------- |
| `↑` `↓` | Navigate suggestions             |
| `Tab`   | Insert selected item             |
| `Enter` | Submit input (ignore completion) |
| `Esc`   | Close dropdown                   |

### What Gets Completed

- **Built-in functions**: `sin`, `cos`, `sqrt`, `ln`, `exp`, etc.
- **Constants**: `pi`, `e`, `infty`
- **Greek letters**: `alpha`, `beta`, `gamma`, `theta`, etc.
- **User variables**: Variables defined with `.let` or `:=`
- **User functions**: Functions defined with `.def` or `:=`

### CompletionProvider API

For programmatic use:

```typescript
import { CompletionProvider } from '$lib/mathAST/cli/completion';

const provider = new CompletionProvider();

// Get completions for a prefix
const completions = provider.getCompletions('sin');
// Returns: [
//   { label: 'sin', kind: 'function', insertText: 'sin(', signature: 'sin(x)', description: 'Sinus' },
//   { label: 'sinh', kind: 'function', insertText: 'sinh(', signature: 'sinh(x)', description: 'Sinus hyperbolique' }
// ]
```

### With Context

```typescript
// Provide variable and function context
const completions = provider.getCompletions('', {
	variables: ['x', 'y', 'myVar'],
	functions: ['f', 'g']
});

// Limit results
const top5 = provider.getCompletions('', undefined, { maxResults: 5 });
```

### Completion Types

```typescript
type CompletionKind = 'function' | 'variable' | 'command' | 'constant' | 'greek';

interface Completion {
	label: string; // Display name
	kind: CompletionKind; // Type of completion
	insertText: string; // Text to insert
	signature?: string; // Function signature
	description?: string; // Short description (French)
}
```

### Built-in Completions

**Functions:** `sin`, `cos`, `tan`, `arcsin`, `arccos`, `arctan`, `sinh`, `cosh`, `tanh`, `ln`, `log`, `exp`, `sqrt`, `lim`, `min`, `max`, `abs`, `gcd`, `lcm`

**Constants:** `pi`, `e`, `infty`

**Greek Letters:** `alpha`, `beta`, `gamma`, `theta`, `delta`, `epsilon`, `lambda`, `mu`, `sigma`, `omega`

### Integration Example

```svelte
<script lang="ts">
	import { CompletionProvider } from '$lib/mathAST/cli/completion';

	const provider = new CompletionProvider();
	let input = $state('');
	let completions = $state<Completion[]>([]);

	function updateCompletions() {
		const prefix = getCurrentWord(input);
		completions = provider.getCompletions(prefix, { variables: ['x', 'y'] });
	}
</script>

<input bind:value={input} oninput={updateCompletions} />

{#if completions.length > 0}
	<ul class="completions">
		{#each completions as c}
			<li>
				<span class="label">{c.label}</span>
				<span class="kind">{c.kind}</span>
			</li>
		{/each}
	</ul>
{/if}
```

## See Also

- [Evaluation](./evaluation.md) - Underlying evaluation system
- [Parsing](./parsing.md) - Expression parsing
- [Domain of Definition](./domain.md) - Domain computation system
- [Pattern Matching](./patterns.md) - Simplification rules
