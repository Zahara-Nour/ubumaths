# CLI & REPL

Command-line interface and interactive Read-Eval-Print Loop.

## Overview

MathAST includes:

- **REPL**: Interactive expression evaluation
- **Web REPL**: Browser-based interface
- **Commands**: 17+ specialized commands

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

## See Also

- [Evaluation](./evaluation.md) - Underlying evaluation system
- [Parsing](./parsing.md) - Expression parsing
- [Pattern Matching](./patterns.md) - Simplification rules
