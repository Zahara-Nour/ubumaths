# Differentiation & Taylor Series

Symbolic calculus operations for MathAST expressions.

## Overview

The calculus subsystem provides:

- **Symbolic differentiation**: Compute derivatives using standard rules
- **Higher-order derivatives**: f''(x), f'''(x), etc.
- **Taylor series expansion**: Approximate functions as polynomials
- **Maclaurin series**: Taylor series centered at 0

## Differentiation

### Basic API

```typescript
import { differentiate, differentiateN } from '$lib/mathAST/differentiation';
import { parseLatex, toLatex } from '$lib/mathAST';

// Single derivative
const expr = parseLatex('x^3');
const derivative = differentiate(expr, 'x');
toLatex(derivative); // "3 x^2"

// Second derivative
const second = differentiateN(expr, 'x', 2);
toLatex(second); // "6 x"

// Third derivative
const third = differentiateN(expr, 'x', 3);
toLatex(third); // "6"
```

### Supported Differentiation Rules

**Power Rule:**

```typescript
differentiate(parseLatex('x^n'), 'x');
// n * x^{n-1}

differentiate(parseLatex('x^5'), 'x');
// 5x^4
```

**Sum/Difference Rule:**

```typescript
differentiate(parseLatex('x^2 + 3x'), 'x');
// 2x + 3
```

**Product Rule:**

```typescript
differentiate(parseLatex('x * \\sin(x)'), 'x');
// sin(x) + x * cos(x)
```

**Quotient Rule:**

```typescript
differentiate(parseLatex('\\frac{x}{x+1}'), 'x');
// (1*(x+1) - x*1) / (x+1)^2 = 1/(x+1)^2
```

**Chain Rule:**

```typescript
differentiate(parseLatex('\\sin(x^2)'), 'x');
// cos(x^2) * 2x

differentiate(parseLatex('(x+1)^3'), 'x');
// 3 * (x+1)^2 * 1 = 3(x+1)^2
```

**Trigonometric Functions:**

```typescript
differentiate(parseLatex('\\sin(x)'), 'x'); // cos(x)
differentiate(parseLatex('\\cos(x)'), 'x'); // -sin(x)
differentiate(parseLatex('\\tan(x)'), 'x'); // 1/cos(x)^2 = sec^2(x)
```

**Exponential and Logarithmic:**

```typescript
differentiate(parseLatex('e^x'), 'x'); // e^x
differentiate(parseLatex('\\ln(x)'), 'x'); // 1/x
differentiate(parseLatex('a^x'), 'x'); // a^x * ln(a)
```

**Inverse Trigonometric:**

```typescript
differentiate(parseLatex('\\arcsin(x)'), 'x'); // 1/sqrt(1-x^2)
differentiate(parseLatex('\\arccos(x)'), 'x'); // -1/sqrt(1-x^2)
differentiate(parseLatex('\\arctan(x)'), 'x'); // 1/(1+x^2)
```

### Options

```typescript
interface DifferentiationOptions {
	simplify?: boolean; // Apply simplification rules (default: true)
}

// Without simplification (raw result)
differentiate(expr, 'x', { simplify: false });
```

### Error Handling

```typescript
import { differentiate, DifferentiationError } from '$lib/mathAST/differentiation';

try {
	const result = differentiate(expr, 'x');
} catch (e) {
	if (e instanceof DifferentiationError) {
		console.error('Cannot differentiate:', e.message);
	}
}
```

### Multiple Variables

```typescript
const expr = parseLatex('x^2 * y^3');

// Partial derivative with respect to x
differentiate(expr, 'x'); // 2x * y^3

// Partial derivative with respect to y
differentiate(expr, 'y'); // x^2 * 3y^2

// Mixed partial derivative
const dx = differentiate(expr, 'x');
const dxdy = differentiate(dx, 'y'); // 6xy^2
```

## Taylor Series

### Basic API

```typescript
import { taylorExpand, maclaurin } from '$lib/mathAST/taylor';
import { parseLatex, toLatex } from '$lib/mathAST';

// Taylor expansion of sin(x) around 0, 5 terms
const sinX = parseLatex('\\sin(x)');
const taylor = taylorExpand(sinX, { variable: 'x', center: 0, terms: 5 });

toLatex(taylor);
// "x - x^3/6 + x^5/120"

// Maclaurin series (Taylor at 0, shorthand)
const mac = maclaurin(sinX, 5);
// Same as taylorExpand with center: 0
```

### Taylor Expansion Options

```typescript
interface TaylorOptions {
	variable: string; // Variable to expand in
	center: number; // Point to expand around (default: 0)
	terms: number; // Number of terms to compute
}

// Expansion of e^x around 0
taylorExpand(parseLatex('e^x'), { variable: 'x', center: 0, terms: 4 });
// 1 + x + x^2/2 + x^3/6

// Expansion of ln(x) around 1
taylorExpand(parseLatex('\\ln(x)'), { variable: 'x', center: 1, terms: 4 });
// (x-1) - (x-1)^2/2 + (x-1)^3/3 - (x-1)^4/4
```

### Common Series

```typescript
// Exponential: e^x = 1 + x + x^2/2! + x^3/3! + ...
maclaurin(parseLatex('e^x'), 5);
// 1 + x + x^2/2 + x^3/6 + x^4/24

// Sine: sin(x) = x - x^3/3! + x^5/5! - ...
maclaurin(parseLatex('\\sin(x)'), 4);
// x - x^3/6 + x^5/120 - x^7/5040

// Cosine: cos(x) = 1 - x^2/2! + x^4/4! - ...
maclaurin(parseLatex('\\cos(x)'), 4);
// 1 - x^2/2 + x^4/24 - x^6/720

// Natural log: ln(1+x) = x - x^2/2 + x^3/3 - ...
maclaurin(parseLatex('\\ln(1+x)'), 4);
// x - x^2/2 + x^3/3 - x^4/4

// Geometric: 1/(1-x) = 1 + x + x^2 + x^3 + ...
maclaurin(parseLatex('\\frac{1}{1-x}'), 5);
// 1 + x + x^2 + x^3 + x^4

// Binomial: (1+x)^n = 1 + nx + n(n-1)x^2/2! + ...
// (For general n, requires symbolic binomial coefficients)
```

### Numerical Approximation

Use Taylor series for numerical approximation:

```typescript
import { taylorExpand, evaluate } from '$lib/mathAST';

// sin(0.1) using 5 terms
const sinTaylor = taylorExpand(parseLatex('\\sin(x)'), {
	variable: 'x',
	center: 0,
	terms: 5
});

const approx = evaluate(sinTaylor, { variables: { x: 0.1 } });
// approx.value ≈ 0.0998334 (very close to actual sin(0.1))
```

## Combined Example

```typescript
import { differentiate, taylorExpand, DifferentiationError } from '$lib/mathAST';
import { parseLatex, toLatex, evaluate } from '$lib/mathAST';

// Analyze a function
function analyzeFunction(latexExpr: string, variable: string = 'x') {
	const expr = parseLatex(latexExpr);

	// Compute derivatives
	const f = expr;
	const fPrime = differentiate(f, variable);
	const fDoublePrime = differentiate(fPrime, variable);

	// Taylor expansion
	const taylor = taylorExpand(f, { variable, center: 0, terms: 4 });

	return {
		original: toLatex(f),
		firstDerivative: toLatex(fPrime),
		secondDerivative: toLatex(fDoublePrime),
		taylorExpansion: toLatex(taylor)
	};
}

const analysis = analyzeFunction('e^x * \\sin(x)');
console.log(analysis);
// {
//   original: "e^x \\sin(x)",
//   firstDerivative: "e^x \\sin(x) + e^x \\cos(x)",
//   secondDerivative: "2 e^x \\cos(x)",
//   taylorExpansion: "x + x^2 + x^3/3"
// }
```

## Finding Critical Points

```typescript
import { differentiate, normalize, polynomialsEqual } from '$lib/mathAST';

function findCriticalPoints(expr: MathNode, variable: string): string[] {
	const derivative = differentiate(expr, variable);

	// For polynomial derivatives, can solve analytically
	// This is a simplified example
	const normalized = normalize(derivative);

	// ... solve for roots ...
	return [];
}

// For quadratic f(x) = x^2 - 4x + 3
const expr = parseLatex('x^2 - 4x + 3');
const derivative = differentiate(expr, 'x');
// derivative = 2x - 4

// Critical point: 2x - 4 = 0 => x = 2
```

## Integration with Evaluation

```typescript
import { differentiate, evaluate, substitute } from '$lib/mathAST';

// Numerical derivative verification
const expr = parseLatex('x^3');
const derivative = differentiate(expr, 'x');

// Evaluate both at x = 2
const originalAt2 = evaluate(expr, { variables: { x: 2 } });
// 8

const derivativeAt2 = evaluate(derivative, { variables: { x: 2 } });
// 12 (which is 3 * 2^2)

// Numerical approximation of derivative
const h = 0.0001;
const numerical =
	(evaluate(expr, { variables: { x: 2 + h } }).value -
		evaluate(expr, { variables: { x: 2 } }).value) /
	h;
// ≈ 12.0001
```

## Limitations

**Not Supported:**

- Implicit differentiation
- Derivatives of piecewise functions
- Complex analysis (Cauchy-Riemann)
- Differential equations

**Limited Support:**

- Custom function derivatives (need explicit definition)
- Very high-order derivatives (performance)

For custom function derivatives, use function bindings:

```typescript
import { differentiate, substitute } from '$lib/mathAST';

// Define f(x) = x^3 and f'(x) = 3x^2
const fDef = {
	expression: parseLatex('x^3'),
	parameters: ['x'],
	derivative: parseLatex('3x^2')
};

// When differentiating f(2x), use chain rule with known derivative
```

## See Also

- [Evaluation](./evaluation.md) - Numeric computation
- [Pattern Matching](./patterns.md) - Symbolic rules
- [Normalization](./normalization.md) - Simplification
