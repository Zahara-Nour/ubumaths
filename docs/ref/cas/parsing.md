# Expression Parsing

## Overview

MathAST supports two parsing formats:

1. **LaTeX Parser** - Parses standard LaTeX math notation
2. **Custom Parser** - Parses a simplified custom notation

Both parsers use a **Pratt parser** (Top-Down Operator Precedence) implementation for efficient expression parsing.

## LaTeX Parser

### Location

`src/lib/mathAST/parser/latex/`

### Usage

```typescript
import { parseLatex } from '$lib/mathAST/parser';

const ast = parseLatex('x^2 + 3x - 5');
const fraction = parseLatex('\\frac{a}{b}');
const trig = parseLatex('\\sin(x) + \\cos(y)');
```

### Supported LaTeX Syntax

#### Numbers

```latex
42          → NumberNode('42')
3.14        → NumberNode('3.14')
-5          → OppositeNode(NumberNode('5'))
```

#### Variables

```latex
x           → VariableNode('x')
abc         → VariableNode('abc')
```

#### Greek Letters

```latex
\pi         → GreekLetterNode('pi')
\alpha      → GreekLetterNode('alpha')
\beta       → GreekLetterNode('beta')
\gamma      → GreekLetterNode('gamma')
\theta      → GreekLetterNode('theta')
```

#### Arithmetic Operations

```latex
a + b       → AdditionNode(a, b)
a - b       → SubtractionNode(a, b)
a \cdot b   → MultiplicationNode(a, b, 'dot')
a \times b  → MultiplicationNode(a, b, 'cross')
ab          → MultiplicationNode(a, b, 'implicit')
\frac{a}{b} → DivisionNode(a, b, 'fraction')
a / b       → DivisionNode(a, b, 'inline')
```

#### Powers and Subscripts

```latex
x^2         → SuperscriptNode(x, 2)
x^{n+1}     → SuperscriptNode(x, n+1)
a_1         → SubscriptNode(a, 1)
a_{ij}      → SubscriptNode(a, ij)
x_1^2       → SuperscriptNode(SubscriptNode(x, 1), 2)
```

#### Functions

```latex
\sin(x)     → FunctionNode('sin', [x])
\cos(x)     → FunctionNode('cos', [x])
\tan(x)     → FunctionNode('tan', [x])
\ln(x)      → FunctionNode('ln', [x])
\log(x)     → FunctionNode('log', [x])
\log_2(x)   → FunctionNode('log', [x], base: 2)
\exp(x)     → FunctionNode('exp', [x])
\sqrt{x}    → FunctionNode('sqrt', [x])
|x|         → FunctionNode('abs', [x])
f(x)        → FunctionNode('f', [x])
f'(x)       → FunctionNode('f', [x], derivativeOrder: 1)
f''(x)      → FunctionNode('f', [x], derivativeOrder: 2)
f^{-1}(x)   → FunctionNode('f', [x], isInverse: true)
\sin^2(x)   → FunctionNode('sin', [x], power: 2)
```

#### Relations

```latex
a = b       → RelationNode('=', a, b)
a < b       → RelationNode('<', a, b)
a > b       → RelationNode('>', a, b)
a \leq b    → RelationNode('<=', a, b)
a \geq b    → RelationNode('>=', a, b)
a \neq b    → RelationNode('!=', a, b)
a \approx b → RelationNode('≈', a, b)
a \in A     → RelationNode('∈', a, A)
```

#### Grouping

```latex
(a + b)     → DelimiterNode('parentheses', a+b)
\left(x\right)
{a + b}     → Grouping (not visible)
```

### Parser Options

```typescript
interface LatexParserOptions {
	// Throw on parse errors (default: false, returns error node)
	strict?: boolean;

	// Allow multi-character variable names (default: true)
	multiCharIdentifiers?: boolean;

	// Parse colors from \textcolor (default: true)
	parseColors?: boolean;
}

const ast = parseLatex('\\sin(x)', { strict: true });
```

## Custom Parser

### Location

`src/lib/mathAST/parser/custom/`

### Usage

```typescript
import { parseCustom } from '$lib/mathAST/parser';

const ast = parseCustom('x^2 + 3*x - 5');
```

### Syntax Differences from LaTeX

| Operation      | LaTeX               | Custom    |
| -------------- | ------------------- | --------- |
| Multiplication | `\cdot` or implicit | `*`       |
| Division       | `\frac{a}{b}`       | `a/b`     |
| Square root    | `\sqrt{x}`          | `sqrt(x)` |
| Greek pi       | `\pi`               | `pi`      |
| Greek alpha    | `\alpha`            | `alpha`   |

## Tokenization

### Token Types

```typescript
type TokenType =
	| 'NUMBER'
	| 'IDENTIFIER'
	| 'PLUS'
	| 'MINUS'
	| 'STAR'
	| 'SLASH'
	| 'CARET'
	| 'UNDERSCORE'
	| 'LPAREN'
	| 'RPAREN'
	| 'LBRACE'
	| 'RBRACE'
	| 'BACKSLASH'
	| 'EQUALS'
	| 'LESS'
	| 'GREATER'
	| 'COMMA'
	| 'SEMICOLON'
	| 'PIPE'
	| 'PRIME'
	| 'EOF';
```

### Tokenizer Flow

```
Input: "x^2 + 3"
    │
    ▼
┌───────────┐
│ Tokenizer │
└─────┬─────┘
      │
      ▼
Token Stream:
  [IDENTIFIER('x'), CARET, NUMBER('2'), PLUS, NUMBER('3'), EOF]
```

## Pratt Parser

### Operator Precedence

```typescript
const PRECEDENCE = {
	LOWEST: 0,
	RELATION: 10, // =, <, >, <=, >=, !=
	SUM: 20, // +, -
	PRODUCT: 30, // *, ·, ×, implicit
	PREFIX: 40, // -x, +x
	POWER: 50, // ^
	POSTFIX: 60, // %, ', ''
	SUBSCRIPT: 70, // _
	CALL: 80 // f(x)
};
```

### Parser Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      Pratt Parser                          │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌─────────────────┐    ┌─────────────────┐              │
│  │ Prefix Parselets│    │ Infix Parselets │              │
│  ├─────────────────┤    ├─────────────────┤              │
│  │ NUMBER → number │    │ PLUS → addition │              │
│  │ IDENT → variable│    │ MINUS → subtract│              │
│  │ MINUS → opposite│    │ STAR → multiply │              │
│  │ LPAREN → group  │    │ SLASH → divide  │              │
│  │ BACKSLASH → cmd │    │ CARET → power   │              │
│  │ PIPE → abs      │    │ UNDERSCORE→sub  │              │
│  └─────────────────┘    │ LPAREN → call   │              │
│                         │ EQUALS → equals │              │
│                         └─────────────────┘              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Parsing Algorithm

```typescript
function parseExpression(precedence: number): MathNode {
	// Get prefix parselet for current token
	const prefix = getPrefixParselet(currentToken);
	if (!prefix) throw new Error(`Unexpected token: ${currentToken}`);

	let left = prefix.parse(this, currentToken);

	// Keep parsing infix operations with higher precedence
	while (precedence < getNextPrecedence()) {
		const infix = getInfixParselet(currentToken);
		left = infix.parse(this, left, currentToken);
	}

	return left;
}
```

## Color Support

The parser preserves color information from `\textcolor`:

```typescript
const ast = parseLatex('\\textcolor{red}{x} + \\textcolor{blue}{y}');

// Results in:
{
    type: 'addition',
    left: { type: 'variable', name: 'x', metadata: { color: 'red' } },
    right: { type: 'variable', name: 'y', metadata: { color: 'blue' } }
}
```

### Color Stack

Colors are managed via a stack for nested colors:

```typescript
class ColorStack {
	push(color: string): void;
	pop(): void;
	current(): string | undefined;
}
```

## Error Handling

### Non-Strict Mode (Default)

Returns an error node that can be rendered:

```typescript
const ast = parseLatex('x +');  // Incomplete expression

// Returns:
{
    type: 'error',
    message: 'Unexpected end of input',
    input: 'x +'
}
```

### Strict Mode

Throws an exception:

```typescript
try {
	parseLatex('x +', { strict: true });
} catch (e) {
	console.error(e.message); // "Unexpected end of input"
}
```

## Integration with MathLive

MathLive produces LaTeX that the parser can handle:

```svelte
<script>
	import { parseLatex } from '$lib/mathAST/parser';

	function handleChange(event: CustomEvent) {
		const latex = event.target.value;
		const ast = parseLatex(latex);
		// Process AST...
	}
</script>

<math-field on:change={handleChange}></math-field>
```

## Performance Considerations

### Single-Pass Tokenization

The tokenizer processes input in a single pass:

```typescript
class Tokenizer {
	private pos = 0;
	private tokens: Token[] = [];

	tokenize(input: string): Token[] {
		while (this.pos < input.length) {
			this.scanToken();
		}
		this.tokens.push({ type: 'EOF' });
		return this.tokens;
	}
}
```

### O(n) Parsing

The Pratt parser has O(n) complexity for well-formed expressions:

```typescript
// Each token is visited at most twice:
// 1. As the start of a prefix expression
// 2. As the start of an infix expression
```

## Testing

Parser tests are located in:

```
src/lib/mathAST/parser/latex/__tests__/
├── tokenizer.test.ts
├── parser-pratt.test.ts
├── parser-rd.test.ts
├── color-stack.test.ts
├── textcolor-transparent.test.ts
└── integration.test.ts

src/lib/mathAST/parser/custom/__tests__/
├── parser-pratt.test.ts
├── parser-rd.test.ts
└── integration.test.ts
```

Run tests:

```bash
pnpm test:client src/lib/mathAST/parser
```
