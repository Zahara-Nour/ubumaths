# Symbolic Differentiation

## Overview

MathAST provides a complete symbolic differentiation engine supporting:

- Standard calculus rules (sum, product, quotient, chain)
- Transcendental functions (sin, cos, tan, exp, ln, log)
- Inverse trigonometric functions
- Hyperbolic functions
- User-defined functions with custom derivatives
- Higher-order derivatives

## Basic Usage

### Using Exp API

```typescript
import { Exp } from '$lib/mathAST';

// Simple derivative
const expr = Exp.parse('x^2');
const derivative = expr.differentiate();
console.log(derivative.latex); // "2 x"

// With respect to different variable
const multiVar = Exp.parse('x*y^2');
const dy = multiVar.differentiate('y');
console.log(dy.latex); // "2 x y"

// Higher-order derivatives
const third = Exp.parse('x^4').nthDerivative(3);
console.log(third.latex); // "24 x"
```

### Using Direct Function

```typescript
import { differentiate, differentiateN } from '$lib/mathAST/differentiation';
import { parseLatex } from '$lib/mathAST/parser';

const ast = parseLatex('\\sin(x)');
const derivative = differentiate(ast);
// Returns cos(x)

// Higher order
const secondDerivative = differentiateN(ast, 2);
// Returns -sin(x)
```

## Differentiation Rules

### Constant Rule

```
d/dx(c) = 0
```

```typescript
// Number, Greek letters (except differentiation variable), symbols
differentiate(parseLatex('5')); // → 0
differentiate(parseLatex('\\pi')); // → 0
```

### Variable Rule

```
d/dx(x) = 1
d/dx(y) = 0  (when differentiating with respect to x)
```

```typescript
differentiate(parseLatex('x')); // → 1
differentiate(parseLatex('y')); // → 0
```

### Sum Rule

```
d/dx(f + g) = f' + g'
d/dx(f - g) = f' - g'
```

```typescript
differentiate(parseLatex('x^2 + 3x')); // → 2x + 3
```

### Product Rule

```
d/dx(f · g) = f' · g + f · g'
```

```typescript
differentiate(parseLatex('x \\cdot \\sin(x)'));
// → sin(x) + x · cos(x)
```

### Quotient Rule

```
d/dx(f/g) = (f' · g - f · g') / g²
```

```typescript
differentiate(parseLatex('\\frac{x}{\\sin(x)}'));
// → (sin(x) - x · cos(x)) / sin²(x)
```

### Chain Rule

```
d/dx(f(g(x))) = f'(g(x)) · g'(x)
```

```typescript
differentiate(parseLatex('\\sin(x^2)'));
// → cos(x²) · 2x = 2x · cos(x²)
```

### Power Rule

```
d/dx(x^n) = n · x^(n-1)     (constant exponent)
d/dx(f^n) = n · f^(n-1) · f'
```

```typescript
differentiate(parseLatex('x^3')); // → 3x²
differentiate(parseLatex('(2x)^3')); // → 3(2x)² · 2 = 24x²
```

### General Power Rule

```
d/dx(f^g) = f^g · (g' · ln(f) + g · f'/f)
```

```typescript
differentiate(parseLatex('x^x'));
// → x^x · (ln(x) + 1)
```

## Transcendental Functions

### Trigonometric

```
d/dx(sin(u)) = cos(u) · u'
d/dx(cos(u)) = -sin(u) · u'
d/dx(tan(u)) = (1/cos²(u)) · u' = sec²(u) · u'
```

```typescript
differentiate(parseLatex('\\sin(x)')); // → cos(x)
differentiate(parseLatex('\\cos(x)')); // → -sin(x)
differentiate(parseLatex('\\tan(x)')); // → 1/cos²(x)
differentiate(parseLatex('\\sin(2x)')); // → 2·cos(2x)
```

### Inverse Trigonometric

```
d/dx(arcsin(u)) = u' / √(1 - u²)
d/dx(arccos(u)) = -u' / √(1 - u²)
d/dx(arctan(u)) = u' / (1 + u²)
```

```typescript
differentiate(parseLatex('\\arcsin(x)')); // → 1/√(1-x²)
differentiate(parseLatex('\\arctan(x)')); // → 1/(1+x²)
```

### Exponential and Logarithmic

```
d/dx(e^u) = e^u · u'
d/dx(ln(u)) = u' / u
d/dx(log_a(u)) = u' / (u · ln(a))
```

```typescript
differentiate(parseLatex('\\exp(x)')); // → exp(x)
differentiate(parseLatex('\\ln(x)')); // → 1/x
differentiate(parseLatex('\\log_2(x)')); // → 1/(x·ln(2))
```

### Hyperbolic

```
d/dx(sinh(u)) = cosh(u) · u'
d/dx(cosh(u)) = sinh(u) · u'
d/dx(tanh(u)) = (1/cosh²(u)) · u'
```

## User-Defined Functions

### Function Bindings

```typescript
import { differentiate } from '$lib/mathAST/differentiation';
import { parseLatex } from '$lib/mathAST/parser';

const functions = {
	f: {
		expression: parseLatex('x^2'),
		parameters: ['x']
	}
};

// d/dx[f(x)] = d/dx[x²] = 2x
const result = differentiate(parseLatex('f(x)'), {
	variable: 'x',
	functions
});
```

### With Pre-computed Derivatives

```typescript
const functions = {
	f: {
		expression: parseLatex('x^2'),
		parameters: ['x'],
		derivative: parseLatex('2x') // Pre-computed
	}
};

// Uses the pre-computed derivative directly
differentiate(parseLatex('f(x)'), { functions });
```

### With Inverse Functions

```typescript
const functions = {
	f: {
		expression: parseLatex('x^2'),
		parameters: ['x'],
		inverse: parseLatex('\\sqrt{x}')
	}
};

// d/dx[f^{-1}(x)]
differentiate(parseLatex('f^{-1}(x)'), { functions });
```

## Derivative Notation

### Prime Notation

```typescript
// Parsing f'(x)
const fPrime = parseLatex("f'(x)");
// FunctionNode with derivativeOrder: 1

// Differentiating gives f''(x)
const fDoublePrime = differentiate(fPrime);
// FunctionNode with derivativeOrder: 2
```

### Creating Derivative Functions

```typescript
import { derivativeFunc, variable } from '$lib/mathAST/factory';

// f'(x)
const fPrime = derivativeFunc('f', [variable('x')], 1);

// f''(x)
const fDoublePrime = derivativeFunc('f', [variable('x')], 2);

// f'''(x)
const fTriplePrime = derivativeFunc('f', [variable('x')], 3);
```

## Options

```typescript
interface DifferentiationOptions {
	// Variable to differentiate with respect to (default: 'x')
	variable?: string;

	// Whether to simplify the result (default: true)
	simplify?: boolean;

	// User-defined function bindings
	functions?: FunctionBindings;
}

differentiate(ast, {
	variable: 'y',
	simplify: true,
	functions: myFunctions
});
```

## Simplification

With `simplify: true` (default), results are simplified:

```typescript
// d/dx(x + 0) with simplification
differentiate(parseLatex('x + 0'));
// → 1 (not 1 + 0)

// d/dx(x * 1)
differentiate(parseLatex('x \\cdot 1'));
// → 1 (not 1 · 1 + x · 0)
```

## Error Handling

Some expressions cannot be differentiated:

```typescript
import { DifferentiationError } from '$lib/mathAST/differentiation';

try {
	// Relations cannot be differentiated
	differentiate(parseLatex('x = 5'));
} catch (e) {
	if (e instanceof DifferentiationError) {
		console.log(e.message); // "Cannot differentiate a relation"
		console.log(e.nodeType); // "relation"
		console.log(e.hint); // "Differentiation is only defined for expressions..."
	}
}
```

### Non-Differentiable Cases

| Expression | Error                                           |
| ---------- | ----------------------------------------------- |
| `x = 5`    | Cannot differentiate a relation                 |
| `5 km`     | Cannot differentiate expressions with units     |
| `f ∘ g`    | Cannot directly differentiate composition nodes |
| `\|x\|`    | Cannot differentiate absolute value             |
| `floor(x)` | Not differentiable at integer points            |

## Implementation Details

### Rule Implementation

```typescript
// rules.ts

export function sinRule(u: MathNode, du: MathNode, simplify: boolean): MathNode {
	// d/dx(sin(u)) = cos(u) · u'
	const cosU = func('cos', [u]);

	if (isZero(du)) return zero();
	if (isOne(du)) return cosU;

	return simplify ? simplifiedMultiply(cosU, du) : multiply(cosU, du, 'implicit');
}

export function productRule(
	f: MathNode,
	g: MathNode,
	df: MathNode,
	dg: MathNode,
	simplify: boolean
): MathNode {
	// d/dx(f·g) = f'·g + f·g'

	// Handle zero cases
	if (isZero(df) && isZero(dg)) return zero();
	if (isZero(df)) return simplifiedMultiply(f, dg);
	if (isZero(dg)) return simplifiedMultiply(df, g);

	const term1 = simplifiedMultiply(df, g);
	const term2 = simplifiedMultiply(f, dg);

	return simplify ? simplifiedAdd(term1, term2) : add(term1, term2);
}
```

### Checking Variable Containment

```typescript
function containsVariable(node: MathNode, variable: string): boolean {
	if (node.type === 'variable' && node.name === variable) {
		return true;
	}

	// Recursively check children
	const children = getChildren(node);
	return children.some((child) => containsVariable(child, variable));
}
```

## Testing

```bash
pnpm test:client src/lib/mathAST/differentiation
pnpm test:client src/lib/mathAST/cli/__tests__/commands/diff.command.test.ts
```

Test categories:

```
src/lib/mathAST/differentiation/__tests__/
├── differentiate.test.ts      # Core differentiation
├── rules.test.ts              # Individual rules
├── chain-rule.test.ts         # Chain rule cases
├── higher-order.test.ts       # nth derivatives
└── user-functions.test.ts     # Function bindings
```
