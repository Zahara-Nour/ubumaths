# Parsing & Serialization

Converting between text formats and MathAST.

## Overview

MathAST supports bidirectional conversion between two text formats:

```
LaTeX  <───────>  MathAST  <───────>  Custom Syntax
        parse                toCustom
       toLatex              parseCustom
```

## LaTeX Parsing

### Basic API

```typescript
import { parseLatex, parseLatexSafe, validateLatex } from '$lib/mathAST';

// Parse LaTeX to AST (throws on error)
const ast = parseLatex('x^2 + 3x - 5');

// Safe parsing (returns result object)
const result = parseLatexSafe('x^2 + 3x - 5');
if (result.ast) {
	// Use result.ast
} else {
	console.error(result.errors);
}

// Validation only
const isValid = validateLatex('\\frac{a}{b}'); // true
```

### Parser Options

```typescript
interface LatexParserOptions {
	mode: 'strict' | 'tolerant';
	parser?: 'pratt' | 'rd';
	genericFunctions?: GenericFunctionConfig;
}

// Strict mode (default): errors on invalid input
parseLatex('x^', { mode: 'strict' }); // throws

// Tolerant mode: best-effort parsing
parseLatex('x^', { mode: 'tolerant' }); // returns partial result

// Choose parser implementation
parseLatex('x^2', { parser: 'pratt' }); // Pratt parser (default)
parseLatex('x^2', { parser: 'rd' }); // Recursive descent
```

### Generic Functions

Configure custom function names:

```typescript
import { parseLatex, DEFAULT_GENERIC_FUNCTIONS } from '$lib/mathAST';

// Default generic functions: f, g, h
const ast = parseLatex('f(x) + g(y)');

// Custom function names
parseLatex('u(x) + v(y)', {
	genericFunctions: {
		names: ['u', 'v', 'w'],
		allowDerivatives: true, // u'(x) allowed
		allowInverse: true // u^{-1}(x) allowed
	}
});
```

### Supported LaTeX Syntax

**Numbers and Variables:**

```latex
42                  % Integer
3.14                % Decimal
-5                  % Negative
1.5e10              % Scientific notation
x                   % Single variable
velocity            % Multi-character (auto-mathit)
```

**Greek Letters:**

```latex
\pi                 % pi
\alpha              % alpha
\beta               % beta
\gamma              % gamma
\theta              % theta
```

**Binary Operations:**

```latex
a + b               % Addition
a - b               % Subtraction
a \cdot b           % Dot multiplication
a \times b          % Cross multiplication
ab                  % Implicit multiplication
\frac{a}{b}         % Fraction
a / b               % Inline division
a : b               % Ratio
```

**Unary Operations:**

```latex
-x                  % Negation
+x                  % Positive
```

**Powers and Subscripts:**

```latex
x^2                 % Simple power
x^{10}              % Complex power
x_i                 % Subscript
x_{n+1}             % Complex subscript
x_i^2               % Combined
```

**Functions:**

```latex
\sin(x)             % Trig functions
\cos(x)
\tan(x)
\arcsin(x)          % Inverse trig
\ln(x)              % Natural log
\log(x)             % Common log
\log_2(x)           % Log with base
\sqrt{x}            % Square root
\sqrt[3]{x}         % Nth root
|x|                 % Absolute value
\left| x \right|    % Delimited abs
f(x)                % Generic function
f'(x)               % Derivative
f''(x)              % Second derivative
f^{-1}(x)           % Inverse
f^2(x)              % Power
```

**Relations:**

```latex
a = b               % Equality
a < b               % Less than
a > b               % Greater than
a \le b             % Less or equal
a \ge b             % Greater or equal
a \ne b             % Not equal
a \approx b         % Approximate
a \equiv b          % Congruent
a \in b             % Element of
a \subset b         % Subset
a \implies b        % Implies
a \iff b            % If and only if
```

**Grouping and Delimiters:**

```latex
(a + b)             % Parentheses
\left( a \right)    % Scaled parentheses
```

**Colors (for educational highlighting):**

```latex
\textcolor{red}{x}        % Colored content
\textcolor{blue}{2x + 3}  % Nested expressions
```

### Parser Implementation

Two parser implementations are available:

**Pratt Parser** (`parser-pratt.ts`):

- Top-Down Operator Precedence parsing
- Cleaner handling of infix operators
- Default and recommended

**Recursive Descent** (`parser-rd.ts`):

- Traditional approach
- Same capabilities
- Alternative implementation

Both use the same tokenizer:

```typescript
// Token types
type TokenType =
	| 'NUMBER'
	| 'LETTER'
	| 'COMMAND'
	| 'WHITESPACE'
	| 'PLUS'
	| 'MINUS'
	| 'STAR'
	| 'SLASH'
	| 'CARET'
	| 'UNDERSCORE'
	| 'TILDE'
	| 'LBRACE'
	| 'RBRACE'
	| 'LPAREN'
	| 'RPAREN'
	| 'LBRACKET'
	| 'RBRACKET'
	| 'PIPE'
	| 'EQUALS'
	| 'LESS'
	| 'GREATER'
	| 'COMMA'
	| 'COLON'
	| 'SEMICOLON'
	| 'EXCLAMATION'
	| 'AMPERSAND'
	| 'PRIME'
	| 'EOF';
```

### Operator Precedence

```typescript
const enum BP {
	NONE = 0,
	RELATION = 10, // =, <, >, etc.
	ADDITION = 20, // +, -
	COMPOSITION = 25, // \circ
	MULTIPLY = 30, // *, implicit, \cdot, \times
	UNARY = 40, // prefix -, +
	POWER = 50, // ^ (right-associative)
	SUBSCRIPT = 50 // _ (same as POWER)
}
```

## Custom Syntax Parsing

A simpler, human-readable syntax without LaTeX backslashes.

### API

```typescript
import { parseCustom, parseCustomSafe } from '$lib/mathAST';

// Parse custom syntax
const ast = parseCustom('x^2 + 3x - 5');

// Safe parsing
const result = parseCustomSafe('sin(x) + cos(y)');
```

### Custom Syntax Format

**Numbers and Variables:**

```
42                  # Integer
3.14                # Decimal
x                   # Variable
velocity            # Multi-character variable
```

**Greek Letters (5 supported):**

```
pi                  # pi
alpha               # alpha
beta                # beta
gamma               # gamma
theta               # theta
```

**Operations:**

```
a + b               # Addition
a - b               # Subtraction
a * b               # Multiplication (dot)
ab                  # Implicit multiplication
a / b               # Division (fraction)
a // b              # Inline division
a : b               # Ratio
a ^ b               # Power
-x                  # Negation
```

**Functions:**

```
sin(x)              # Trig functions
cos(x)
tan(x)
ln(x)               # Natural log
log(x)              # Common log
log_2(x)            # Log with base
sqrt(x)             # Square root
cbrt(x)             # Cube root
abs(x)              # Absolute value
f(x)                # Generic function
f'(x)               # Derivative
f^-1(x)             # Inverse
```

**Colors:**

```
@color{red}{x}      # Colored expression
@color{blue}{2x+3}  # Nested
```

**Units:**

```
5 [m]               # 5 meters
10 [km/h]           # 10 km per hour
v [m/s]             # velocity in m/s
```

**Relations:**

```
a = b
a < b
a > b
a <= b
a >= b
a != b
a ~= b              # Approximate
a <=> b             # If and only if
```

### Custom vs LaTeX Comparison

| Feature     | Custom           | LaTeX                |
| ----------- | ---------------- | -------------------- |
| Sine        | `sin(x)`         | `\sin(x)`            |
| Fraction    | `a/b`            | `\frac{a}{b}`        |
| Square root | `sqrt(x)`        | `\sqrt{x}`           |
| Cube root   | `cbrt(x)`        | `\sqrt[3]{x}`        |
| Greek pi    | `pi`             | `\pi`                |
| Color       | `@color{red}{x}` | `\textcolor{red}{x}` |
| Unit        | `5 [m]`          | `5~\unit{m}`         |

## LaTeX Generation

### Basic API

```typescript
import { toLatex, LatexGenerator } from '$lib/mathAST';

// Quick conversion
const latex = toLatex(ast);

// With options
const latexFr = toLatex(ast, { frenchDecimals: true });
// "3,14" instead of "3.14"

// Using generator class
const generator = new LatexGenerator({
	renderMetadata: true // Include color/style
});
const latex = generator.generate(ast);
```

### Generator Options

```typescript
interface LatexGeneratorOptions {
	frenchDecimals?: boolean; // Use comma as decimal separator
	renderMetadata?: boolean; // Render color and style
}
```

### Output Examples

```typescript
// Simple expression
toLatex(parseCustom('x^2 + 3x - 5'));
// "x^{2} + 3 x - 5"

// Fraction
toLatex(parseCustom('a/b'));
// "\frac{a}{b}"

// Function
toLatex(parseCustom('sin(x)'));
// "\sin\left( x \right)"

// With metadata
const colored = withMetadata(variable('x'), { color: 'red', style: 'bold' });
const generator = new LatexGenerator({ renderMetadata: true });
generator.generate(colored);
// "\textcolor{red}{\mathbf{x}}"

// Multi-character variable
toLatex(variable('velocity'));
// "\mathit{velocity}"
```

### French Decimals

For French-speaking audiences:

```typescript
const ast = MathAST.number('3.14');

toLatex(ast);
// "3.14"

toLatex(ast, { frenchDecimals: true });
// "3{,}14"  (comma in math mode)
```

## Custom Syntax Generation

### Basic API

```typescript
import { toCustom, CustomGenerator, SUPPORTED_GREEK, SUPPORTED_SYMBOLS } from '$lib/mathAST';

// Quick conversion
const custom = toCustom(ast);

// With options
const generator = new CustomGenerator();
const custom = generator.generate(ast);
```

### Output Examples

```typescript
// Fraction
toCustom(parseLatex('\\frac{a}{b}'));
// "a/b"

// Function
toCustom(parseLatex('\\sin(x)'));
// "sin(x)"

// Greek
toCustom(parseLatex('\\alpha + \\pi'));
// "alpha + pi"

// Colors
toCustom(withMetadata(variable('x'), { color: 'red' }));
// "@color{red}{x}"

// Units
toCustom(MathAST.quantity(MathAST.number('5'), 'm/s'));
// "5 [m/s]"
```

## Pretty Printing

Debug-friendly tree visualization:

```typescript
import { prettyPrint } from '$lib/mathAST';

const ast = parseLatex('x^2 + 3x - 5');
console.log(prettyPrint(ast));
```

Output:

```
Addition
├── Addition
│   ├── Superscript
│   │   ├── Variable: x
│   │   └── Number: 2
│   └── Multiplication (implicit)
│       ├── Number: 3
│       └── Variable: x
└── Opposite
    └── Number: 5
```

### Options

```typescript
interface PrettyPrintOptions {
	indent?: string; // Indentation characters
	showMetadata?: boolean; // Include metadata
}

prettyPrint(ast, {
	indent: '  ',
	showMetadata: true
});
```

## Roundtrip Behavior

AST can roundtrip through both syntaxes:

```typescript
const original = 'x^2 + 3x - 5';

// LaTeX roundtrip
const ast1 = parseLatex(original);
const latex = toLatex(ast1);
const ast2 = parseLatex(latex);
// ast1 and ast2 are semantically equivalent

// Cross-format conversion
const ast = parseLatex('\\frac{a+b}{c}');
const custom = toCustom(ast); // "(a+b)/c"
const ast3 = parseCustom(custom);
const latex2 = toLatex(ast3); // "\frac{a + b}{c}"
```

## Error Handling

```typescript
// Throwing parser
try {
	parseLatex('x^'); // Invalid syntax
} catch (e) {
	if (e instanceof PrattParseException) {
		console.error('Parse error:', e.message);
	}
}

// Safe parser
const result = parseLatexSafe('x^');
if (!result.ast) {
	for (const error of result.errors) {
		console.error(`Error at position ${error.position}: ${error.message}`);
	}
}
```

## Parser Internals

### Tokenizer

The tokenizer (`tokenizer.ts`) converts input to tokens:

```typescript
class Tokenizer {
	nextToken(): Token; // Get and consume next token
	peek(): Token; // Look at next without consuming
	peekAt(offset: number): Token; // Look ahead
	reset(): void; // Start over
	getPosition(): number; // Current position
}
```

### Pratt Parser

Uses binding power for precedence:

```typescript
// NUD (Null Denotation) - prefix/primary expressions
// LED (Left Denotation) - infix/postfix expressions

// Example: parsing x + y * z
// 1. Parse 'x' with NUD
// 2. See '+' with BP=20, parse RHS with BP=20
// 3. In RHS, parse 'y' with NUD
// 4. See '*' with BP=30 > 20, so parse z first
// 5. Result: x + (y * z)
```

### Color Stack

Handles nested `\textcolor`:

```typescript
\textcolor{red}{a + \textcolor{blue}{b} + c}
// a is red, b is blue, c is red (stack pops)
```

## See Also

- [Types & Nodes](./types.md) - Node definitions
- [Factory & Transforms](./factory-transforms.md) - Creating nodes programmatically
- [Evaluation](./evaluation.md) - Evaluating parsed expressions
