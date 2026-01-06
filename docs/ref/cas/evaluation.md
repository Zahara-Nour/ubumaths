# Expression Evaluation

## Overview

MathAST supports two evaluation modes:

1. **Exact Mode** - Rational arithmetic with BigInt for arbitrary precision
2. **Decimal Mode** - Floating-point evaluation for transcendental functions

## Basic Usage

### Using Exp API

```typescript
import { Exp } from '$lib/mathAST';

// Simple evaluation
const result = Exp.parse('2 + 3').eval();
// { value: { n: 5n, d: 1n }, exact: true, node: NumberNode('5') }

// With variable substitution
const expr = Exp.parse('x^2 + 1');
const evaluated = expr.evalWith({ x: 3 });
// { value: { n: 10n, d: 1n }, exact: true, node: ... }

// Just substitute (no evaluation)
const substituted = expr.substitute({ x: 3 });
console.log(substituted.latex); // "3^{2} + 1"
```

### Direct Function Calls

```typescript
import { evaluate, substitute } from '$lib/mathAST/eval';
import { parseLatex } from '$lib/mathAST/parser';

const ast = parseLatex('\\frac{1}{3} + \\frac{1}{6}');
const result = evaluate(ast);
// { value: { n: 1n, d: 2n }, exact: true, node: NumberNode('1/2') }
```

## Evaluation Modes

### Exact Mode (Default)

Uses rational arithmetic to avoid floating-point errors:

```typescript
// Exact: 1/3 + 1/6 = 1/2
const result = Exp.parse('\\frac{1}{3} + \\frac{1}{6}').eval();
// value: { n: 1n, d: 2n } (exactly 1/2)

// Exact: 0.1 + 0.2 = 0.3
const decimal = Exp.parse('0.1 + 0.2').eval();
// value: { n: 3n, d: 10n } (exactly 0.3, no floating-point error)
```

### Decimal Mode

Required for transcendental functions:

```typescript
const result = Exp.parse('\\sqrt{2}').eval({ mode: 'decimal' });
// value: 1.4142135623730951, exact: false

const trig = Exp.parse('\\sin(\\pi/4)').eval({ mode: 'decimal' });
// value: 0.7071067811865476, exact: false
```

## Evaluation Options

```typescript
interface EvalOptions {
	// 'exact' uses rational arithmetic, 'decimal' uses floats
	mode?: 'exact' | 'decimal';

	// Decimal precision (default: 15)
	precision?: number;
}

// High precision decimal
const precise = Exp.parse('\\pi').eval({
	mode: 'decimal',
	precision: 50
});
```

## Evaluation Result

```typescript
interface EvalResult {
    // The computed value (Rational for exact, number for decimal)
    value: Rational | number;

    // Whether the result is exact
    exact: boolean;

    // The result as a MathNode
    node: MathNode;
}

// Exact result
{
    value: { n: 5n, d: 3n },  // 5/3
    exact: true,
    node: { type: 'division', ... }  // Fraction node
}

// Decimal result
{
    value: 1.6666666666666667,
    exact: false,
    node: { type: 'number', value: '1.6666666666666667' }
}
```

## Variable Substitution

### Binding Types

```typescript
type EvalBindings = Record<string, number | string | MathNode>;

// Number binding
expr.evalWith({ x: 5 });

// String binding (parsed as LaTeX)
expr.evalWith({ x: 'a + b' });

// MathNode binding
expr.evalWith({ x: parseLatex('\\sqrt{2}') });
```

### Greek Letters

Greek letters can be substituted by name:

```typescript
const expr = Exp.parse('\\alpha^2 + \\beta');
const result = expr.evalWith({
	alpha: 5,
	beta: 3
});
// value: { n: 28n, d: 1n } (25 + 3 = 28)
```

### Partial Substitution

```typescript
const expr = Exp.parse('x + y + z');
const partial = expr.substitute({ x: 1, y: 2 });
console.log(partial.latex); // "1 + 2 + z"
```

## Arithmetic Operations

### Rational Arithmetic (Exact Mode)

```typescript
// Addition: a/b + c/d = (ad + bc) / bd
const sum = Exp.parse('\\frac{1}{2} + \\frac{1}{3}').eval();
// = 5/6

// Multiplication: (a/b) * (c/d) = (ac) / (bd)
const product = Exp.parse('\\frac{2}{3} * \\frac{3}{4}').eval();
// = 1/2

// Division: (a/b) / (c/d) = (ad) / (bc)
const quotient = Exp.parse('\\frac{1}{2} / \\frac{1}{4}').eval();
// = 2

// Power: (a/b)^n
const power = Exp.parse('(\\frac{2}{3})^3').eval();
// = 8/27
```

### Automatic Reduction

Results are always reduced to lowest terms:

```typescript
Exp.parse('\\frac{6}{8}').eval();
// value: { n: 3n, d: 4n } (reduced from 6/8)

Exp.parse('\\frac{12}{4}').eval();
// value: { n: 3n, d: 1n } (simplified to integer)
```

## Function Evaluation

### Built-in Functions

| Function | Exact Mode                   | Decimal Mode |
| -------- | ---------------------------- | ------------ |
| sqrt(n)  | If perfect square            | Always       |
| sin(x)   | Only sin(0), sin(pi), etc.   | Always       |
| cos(x)   | Only cos(0), cos(pi), etc.   | Always       |
| tan(x)   | Only tan(0), tan(pi/4), etc. | Always       |
| ln(x)    | Only ln(1), ln(e)            | Always       |
| exp(x)   | Only exp(0), exp(1)          | Always       |
| abs(x)   | Always                       | Always       |

```typescript
// Exact: sqrt(16) = 4
Exp.parse('\\sqrt{16}').eval();
// value: { n: 4n, d: 1n }, exact: true

// Requires decimal: sqrt(2)
Exp.parse('\\sqrt{2}').eval({ mode: 'decimal' });
// value: 1.414..., exact: false

// Known values work in exact mode
Exp.parse('\\sin(0)').eval();
// value: { n: 0n, d: 1n }, exact: true
```

### User-Defined Functions

```typescript
const functions = {
	f: {
		expression: parseLatex('x^2 + 1'),
		parameters: ['x']
	}
};

// f(3) = 3² + 1 = 10
const result = evaluate(parseLatex('f(3)'), {
	functions
});
```

## Error Handling

### Unsubstituted Variables

```typescript
try {
	Exp.parse('x + 1').eval();
} catch (e) {
	// Error: Cannot evaluate expression with unsubstituted variables: x
}
```

### Division by Zero

```typescript
try {
	Exp.parse('1 / 0').eval();
} catch (e) {
	// Error: Division by zero
}
```

### Invalid Operations

```typescript
try {
	Exp.parse('\\sqrt{-1}').eval({ mode: 'decimal' });
} catch (e) {
	// Error: Cannot compute square root of negative number
}
```

## Implementation Details

### Rational Type

```typescript
interface Rational {
	n: bigint; // Numerator (can be negative)
	d: bigint; // Denominator (always positive)
}

// Helpers
function rational(n: bigint, d: bigint): Rational;
function fromInteger(n: number | bigint): Rational;
function addRational(a: Rational, b: Rational): Rational;
function mulRational(a: Rational, b: Rational): Rational;
function divRational(a: Rational, b: Rational): Rational;
function powRational(base: Rational, exp: number): Rational;
function reduceRational(r: Rational): Rational;
```

### GCD for Reduction

```typescript
function gcd(a: bigint, b: bigint): bigint {
	a = a < 0n ? -a : a;
	b = b < 0n ? -b : b;
	while (b !== 0n) {
		[a, b] = [b, a % b];
	}
	return a;
}

function reduceRational(r: Rational): Rational {
	const g = gcd(r.n, r.d);
	return {
		n: r.n / g,
		d: r.d / g
	};
}
```

### Decimal Conversion

```typescript
function rationalToDecimal(r: Rational): number {
	return Number(r.n) / Number(r.d);
}

function decimalToRational(x: number): Rational {
	// Handle terminating decimals exactly
	const str = x.toString();
	if (str.includes('.')) {
		const [int, dec] = str.split('.');
		const d = 10n ** BigInt(dec.length);
		const n = BigInt(int + dec);
		return reduceRational({ n, d });
	}
	return fromInteger(x);
}
```

## Testing

```bash
pnpm test:client src/lib/mathAST/eval
pnpm test:client src/lib/mathAST/cli/__tests__/commands/eval.command.test.ts
```

Test files:

```
src/lib/mathAST/eval/__tests__/
├── evaluate.test.ts      # Core evaluation
├── substitute.test.ts    # Variable substitution
├── rational.test.ts      # Rational arithmetic
└── functions.test.ts     # Function evaluation
```
