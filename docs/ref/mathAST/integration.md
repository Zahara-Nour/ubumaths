# Integration Module

Technical reference for the symbolic integration system in mathAST.

---

## Overview

The integration module provides symbolic computation of indefinite and definite integrals. It uses a decision tree approach with multiple specialized integrators tried in priority order.

**Key features:**

- Symbolic integration with step-by-step explanations
- Support for indefinite and definite integrals
- Multiple integration techniques (basic rules, u-substitution, parts, partial fractions, trig substitution)
- Numeric fallback using adaptive Simpson's rule
- French-language pedagogical descriptions

**Location:** `src/lib/mathAST/integration/`

---

## Quick Start

```typescript
import { integrate, integrateDefinite } from '$lib/mathAST/integration';
import { parseLatex } from '$lib/mathAST';

// Indefinite integral
const expr = parseLatex('x^2');
const result = integrate(expr);
// result.antiderivative = x³/3

// Definite integral
const definite = integrateDefinite(parseLatex('x^2'), number('0'), number('1'));
// definite.value = 1/3

// With detailed steps
const detailed = integrate(expr, { verbosity: 'detailed' });
detailed.steps.forEach((step) => console.log(step.description));
```

---

## Architecture

### Module Structure

```
src/lib/mathAST/integration/
├── index.ts              # Public API exports
├── integrate.ts          # Main integrate() function
├── types.ts              # Type definitions
├── classify.ts           # Integrand classification
├── patterns.ts           # Pattern matching (u-substitution)
├── rules.ts              # Basic integration rules
├── step-recorder.ts      # Pedagogical step recording
├── descriptions-fr.ts    # French descriptions
├── numeric.ts            # Simpson's rule
└── integrators/
    ├── index.ts          # Integrator registry
    ├── select.ts         # Integrator selection (lazy)
    ├── basic.ts          # Power, trig, exp rules
    ├── u-substitution.ts # Chain rule patterns
    ├── parts.ts          # Integration by parts
    ├── partial-fractions.ts # Rational functions
    └── trig-substitution.ts # Radical patterns
```

### Decision Tree

The `integrate()` function follows this decision tree:

```
1. Simplify expression (preprocess)
2. Unwrap grouping delimiters
3. Is constant? → ∫c dx = cx
4. Is sum/difference? → Linearity: ∫(f±g) = ∫f ± ∫g
5. Is negation? → ∫(-f) = -∫f
6. Has constant factor? → ∫cf = c∫f
7. Try integrators in priority order:
   - Basic (priority 0)
   - U-substitution (priority 10)
   - Parts (priority 20)
   - Partial fractions (priority 30)
   - Trig substitution (priority 40)
8. Return unsupported
```

---

## Types

### IntegrateResult

```typescript
interface IntegrateResult {
	variable: string; // Integration variable
	status: 'exact' | 'approximate' | 'unsupported';
	antiderivative: MathNode | null; // F(x) such that F'(x) = f(x)
	integrandType: IntegrandType;
	technique: IntegrationTechnique;
	steps: readonly IntegrateStep[]; // Pedagogical steps
	error?: string; // Error message if unsupported
	constantNote?: string; // "+ C" reminder
}
```

### IntegrandType

Classification of the integrand for technique selection:

| Type            | Examples               | Description             |
| --------------- | ---------------------- | ----------------------- |
| `polynomial`    | `x², 3x+1, 5`          | Polynomial in variable  |
| `rational`      | `1/x, (x+1)/(x²+1)`    | Ratio of polynomials    |
| `trigonometric` | `sin(x), cos²(x)`      | Trigonometric functions |
| `exponential`   | `e^x, 2^x`             | Exponential functions   |
| `logarithmic`   | `ln(x), log₂(x)`       | Logarithmic functions   |
| `inverse-trig`  | `arctan(x), arcsin(x)` | Inverse trig functions  |
| `radical`       | `√x, √(1-x²)`          | Root expressions        |
| `product`       | `x·e^x, x·sin(x)`      | Product of functions    |
| `composite`     | `sin(x²), e^(cos(x))`  | Composition f(g(x))     |
| `mixed`         | `x + sin(x)`           | Combination of types    |
| `unknown`       | (unrecognized)         | Cannot classify         |

### IntegrationTechnique

```typescript
type IntegrationTechnique =
	| 'basic-rule' // Direct application of basic rules
	| 'u-substitution' // u = g(x) substitution
	| 'parts' // Integration by parts
	| 'partial-fractions' // Partial fraction decomposition
	| 'trig-substitution' // Trigonometric substitution
	| 'numeric'; // Numerical approximation
```

### IntegrateOptions

```typescript
interface IntegrateOptions {
	variable?: string; // Variable to integrate (auto-detect if omitted)
	verbosity?: 'result' | 'summarized' | 'detailed';
	maxDepth?: number; // Max recursion depth (default: 10)
	allowNumeric?: boolean; // Numeric fallback (default: true)
	simpsonIntervals?: number; // Simpson intervals (default: 100)
	simplify?: boolean; // Simplify result (default: true)
	normalizeResult?: boolean; // Normalize final result (default: true)
}
```

---

## Integrators

### Basic Integrator (Priority 0)

Handles direct application of elementary integration rules.

**Supported patterns:**

| Pattern        | Result          | Rule        |
| -------------- | --------------- | ----------- |
| `c` (constant) | `cx`            | Constant    |
| `x`            | `x²/2`          | Power (n=1) |
| `x^n` (n≠-1)   | `x^(n+1)/(n+1)` | Power       |
| `1/x`          | `ln\|x\|`       | Ln          |
| `e^x`          | `e^x`           | Exponential |
| `e^(ax)`       | `e^(ax)/a`      | Exponential |
| `sin(x)`       | `-cos(x)`       | Sine        |
| `cos(x)`       | `sin(x)`        | Cosine      |
| `tan(x)`       | `-ln\|cos(x)\|` | Tangent     |
| `1/(1+x²)`     | `arctan(x)`     | Arctan      |
| `1/√(1-x²)`    | `arcsin(x)`     | Arcsin      |
| `1/√(a²-x²)`   | `arcsin(x/a)`   | Arcsin      |

**Implementation:** `integrators/basic.ts`

### U-Substitution Integrator (Priority 10)

Handles chain rule patterns: `∫ f(g(x)) · g'(x) dx = F(g(x))`

**Pattern detection:**

1. Find u-candidates (function arguments, exponents, denominators)
2. Compute du = derivative of u
3. Check if remaining integrand is proportional to du
4. Extract constant factor if needed

**Proportionality detection:**

Uses the normalization system to detect when `expr₁ = c · expr₂`:

```typescript
// All these are detected as proportional to x:
// x       → factor 1
// 2x      → factor 2
// x*2     → factor 2
// -x      → factor -1
// x/2     → factor 0.5
```

**Expression normalization:**

Before recursive integration, transforms expressions for compatibility:

- `sqrt(u)` → `u^(1/2)`
- `1/u^n` → `u^(-n)`

**Examples:**

| Integrand       | u        | du       | Factor | Result       |
| --------------- | -------- | -------- | ------ | ------------ |
| `2x·cos(x²)`    | `x²`     | `2x`     | 1      | `sin(x²)`    |
| `x·e^(x²)`      | `x²`     | `2x`     | 0.5    | `e^(x²)/2`   |
| `x/(1+x²)`      | `1+x²`   | `2x`     | 0.5    | `ln(1+x²)/2` |
| `sin(x)·cos(x)` | `sin(x)` | `cos(x)` | 1      | `sin²(x)/2`  |
| `x/√(1-x²)`     | `1-x²`   | `-2x`    | -0.5   | `-√(1-x²)`   |

**Implementation:** `integrators/u-substitution.ts`, `patterns.ts`

### Parts Integrator (Priority 20)

Integration by parts: `∫ u dv = uv - ∫ v du`

**LIATE rule for choosing u:**

1. **L**ogarithmic (ln, log)
2. **I**nverse trigonometric (arctan, arcsin, ...)
3. **A**lgebraic (polynomials, x^n)
4. **T**rigonometric (sin, cos, tan, ...)
5. **E**xponential (e^x, a^x)

Higher in list = better choice for u (differentiate it).

**Special cases:**

- **Tabular method:** For `polynomial × exp` or `polynomial × trig`
- **Cyclic case:** For `e^x · sin(x)` or `e^x · cos(x)` (solves algebraically)

**Examples:**

| Integrand    | u        | dv       | Result                 |
| ------------ | -------- | -------- | ---------------------- |
| `x·e^x`      | `x`      | `e^x dx` | `xe^x - e^x`           |
| `x·sin(x)`   | `x`      | `sin dx` | `-x·cos(x) + sin(x)`   |
| `ln(x)`      | `ln(x)`  | `dx`     | `x·ln(x) - x`          |
| `x²·e^x`     | `x²`     | `e^x dx` | `e^x(x² - 2x + 2)`     |
| `e^x·sin(x)` | (cyclic) |          | `e^x(sin(x)-cos(x))/2` |

**Implementation:** `integrators/parts.ts`

### Partial Fractions Integrator (Priority 30)

Decomposes rational functions `P(x)/Q(x)` into simpler fractions.

**Steps:**

1. Factor denominator into linear and irreducible quadratic factors
2. Set up partial fraction decomposition
3. Solve for coefficients
4. Integrate each term

**Supported decompositions:**

| Denominator  | Decomposition                   |
| ------------ | ------------------------------- |
| `(x-a)(x-b)` | `A/(x-a) + B/(x-b)`             |
| `(x-a)²`     | `A/(x-a) + B/(x-a)²`            |
| `x(x²+1)`    | `A/x + (Bx+C)/(x²+1)`           |
| `(x²+a²)`    | `(Ax+B)/(x²+a²)` → arctan terms |

**Examples:**

| Integrand    | Result                   |
| ------------ | ------------------------ |
| `1/(x²-1)`   | `(1/2)ln\|(x-1)/(x+1)\|` |
| `1/(x(x+1))` | `ln\|x\| - ln\|x+1\|`    |
| `1/(x²+1)`   | `arctan(x)`              |
| `x/(x²+1)`   | `(1/2)ln(x²+1)`          |

**Implementation:** `integrators/partial-fractions.ts`

### Trig Substitution Integrator (Priority 40)

Handles integrands containing `√(a²-x²)`, `√(a²+x²)`, or `√(x²-a²)`.

**Substitutions:**

| Pattern    | Substitution   | Identity used       |
| ---------- | -------------- | ------------------- |
| `√(a²-x²)` | `x = a·sin(θ)` | `1 - sin²θ = cos²θ` |
| `√(a²+x²)` | `x = a·tan(θ)` | `1 + tan²θ = sec²θ` |
| `√(x²-a²)` | `x = a·sec(θ)` | `sec²θ - 1 = tan²θ` |

**Examples:**

| Integrand   | Result                     |
| ----------- | -------------------------- |
| `1/√(1-x²)` | `arcsin(x)`                |
| `√(1-x²)`   | `(x√(1-x²) + arcsin(x))/2` |
| `1/√(1+x²)` | `ln\|x + √(1+x²)\|`        |
| `1/√(x²-1)` | `ln\|x + √(x²-1)\|`        |

**Implementation:** `integrators/trig-substitution.ts`

---

## Pattern Matching

### U-Candidate Detection

The `findUCandidates()` function identifies potential u-substitutions:

```typescript
// Candidates for cos(x²) + x/(1+x²):
// - x² (function argument)
// - 1+x² (denominator)
```

**Candidate sources:**

1. Arguments of functions (sin, cos, exp, ln, etc.)
2. Exponents in e^u
3. Denominators in fractions
4. Arguments of sqrt

### Proportionality Detection

The `findProportionalityConstant()` function uses algebraic normalization:

```typescript
findProportionalityConstant(expr1, expr2);
// Returns c if expr1 = c * expr2, else null
```

**How it works:**

1. Normalize both expressions to canonical form
2. Check both are single terms (not sums)
3. Compare monomials (variables and exponents)
4. Compute coefficient ratio

**NormalForm structure:**

```typescript
// 2x normalized:
{
  numerator: [{
    coefficient: { terms: [{ rational: { n: 2n, d: 1n }, radicals: [] }] },
    monomial: [{ base: variable('x'), exponent: { n: 1n, d: 1n } }]
  }],
  denominator: [{ coefficient: 1, monomial: [] }]
}
```

---

## Step Recording

### Verbosity Levels

| Level        | Description                 |
| ------------ | --------------------------- |
| `result`     | No steps, only final result |
| `summarized` | Key steps only (default)    |
| `detailed`   | All intermediate steps      |

### Step Structure

```typescript
interface IntegrateStep {
	id: number;
	rule: string; // e.g., 'power-rule', 'u-substitution'
	description: string; // French description
	before: MathNode;
	after: MathNode;
	operand?: MathNode; // e.g., u value
	verbosityLevel: 'result' | 'summarized' | 'detailed';
	technicalNote?: string; // e.g., "u = x², du = 2x dx"
}
```

### Rule Keys

| Key                     | Description                 |
| ----------------------- | --------------------------- |
| `constant-rule`         | Integration of constant     |
| `power-rule`            | Power rule x^n              |
| `ln-rule`               | ∫1/x = ln\|x\|              |
| `exp-rule`              | ∫e^x = e^x                  |
| `sin-rule`              | ∫sin = -cos                 |
| `cos-rule`              | ∫cos = sin                  |
| `linearity-sum`         | ∫(f+g) = ∫f + ∫g            |
| `constant-multiple`     | ∫cf = c∫f                   |
| `identify-substitution` | u = ... identified          |
| `apply-substitution`    | Substitution applied        |
| `substitute-back`       | Back-substitution u → g(x)  |
| `identify-parts`        | Parts: u and dv chosen      |
| `apply-parts-formula`   | ∫u dv = uv - ∫v du          |
| `partial-fractions`     | Decomposition set up        |
| `trig-substitution`     | Trig sub pattern identified |

---

## Numeric Integration

When symbolic integration fails and `allowNumeric: true`, falls back to adaptive Simpson's rule.

### Simpson's Rule

```typescript
// Basic Simpson's rule
const value = simpson((x) => x * x, 0, 1, 100);
// ≈ 0.333333...

// Adaptive Simpson (auto error control)
const result = adaptiveSimpson((x) => x * x, 0, 1, 1e-6);
// { value: 0.333333..., error: < 1e-6 }
```

### Options

```typescript
interface NumericIntegrateOptions {
	tolerance?: number; // Default: 1e-6
	maxDepth?: number; // Default: 15
	method?: 'simpson' | 'adaptive-simpson';
	intervals?: number; // Default: 100
}
```

---

## Usage Examples

### Basic Integration

```typescript
import { integrate } from '$lib/mathAST/integration';
import { parseLatex } from '$lib/mathAST';

// Simple polynomial
const result1 = integrate(parseLatex('x^3'));
// x⁴/4

// Trigonometric
const result2 = integrate(parseLatex('\\sin(x)'));
// -cos(x)

// Exponential
const result3 = integrate(parseLatex('e^{2x}'));
// e^(2x)/2
```

### Definite Integration

```typescript
import { integrateDefinite } from '$lib/mathAST/integration';
import { number } from '$lib/mathAST/factory';

// ∫₀¹ x² dx = 1/3
const result = integrateDefinite(parseLatex('x^2'), number('0'), number('1'));

console.log(result.value); // 1/3
console.log(result.approximate); // 0.333...
```

### With Steps

```typescript
const result = integrate(parseLatex('x \\cdot e^x'), {
	verbosity: 'detailed'
});

result.steps.forEach((step) => {
	console.log(`${step.rule}: ${step.description}`);
	// identify-parts: Application de l'intégration par parties
	// choose-u-dv: On pose u = x et dv = e^x dx
	// ...
});
```

### Custom Variable

```typescript
// Integrate with respect to t
const result = integrate(parseLatex('t^2 + 2t'), { variable: 't' });
```

### Handling Unsupported

```typescript
const result = integrate(parseLatex('e^{x^2}'));

if (result.status === 'unsupported') {
	console.log(result.error);
	// "Impossible d'intégrer cette expression..."

	// Try numeric for definite integral
	const numeric = integrateDefinite(parseLatex('e^{x^2}'), number('0'), number('1'), {
		allowNumeric: true
	});
	console.log(numeric.approximate); // ≈ 1.4627...
}
```

---

## Extending the Module

### Adding a New Integrator

1. Create `integrators/my-technique.ts`:

```typescript
import type {
	Integrator,
	IntegrateResult,
	IntegrateOptions,
	IntegrateStepRecorder
} from '../types';

export const myIntegrator: Integrator = {
	name: 'my-technique',
	priority: 25, // Between parts (20) and partial fractions (30)

	canIntegrate(expr: MathNode, variable: string): boolean {
		// Return true if this integrator can handle the expression
		return myPatternMatches(expr, variable);
	},

	integrate(
		expr: MathNode,
		variable: string,
		options: Required<Omit<IntegrateOptions, 'variable'>>,
		recorder: IntegrateStepRecorder,
		depth: number
	): IntegrateResult {
		// Implement integration logic
		// Use recorder.recordStep() for pedagogy
		// Return IntegrateResult
	}
};
```

2. Register in `integrators/index.ts`:

```typescript
import { myIntegrator } from './my-technique';

export const ALL_INTEGRATORS: readonly Integrator[] = [
	basicIntegrator,
	uSubstitutionIntegrator,
	partsIntegrator,
	myIntegrator, // Add here based on priority
	partialFractionsIntegrator,
	trigSubstitutionIntegrator
];
```

### Adding New Basic Rules

In `integrators/basic.ts`:

1. Add pattern detector:

```typescript
function isMyPattern(expr: MathNode, variable: string): { ... } | null {
  // Return match info or null
}
```

2. Add to `canIntegrate`:

```typescript
if (isMyPattern(expr, variable)) return true;
```

3. Add to `integrate`:

```typescript
const myMatch = isMyPattern(expr, variable);
if (myMatch) {
  // Apply rule
  recorder.recordStepByRule('my-rule', expr, result, 'summarized');
  return { ... };
}
```

4. Add description in `descriptions-fr.ts`:

```typescript
export const RULE_DESCRIPTIONS: Record<IntegrationRule, string> = {
	// ...
	'my-rule': 'Application de la règle de ...'
};
```

---

## Limitations

### Not Supported

- Non-elementary integrals: `e^(x²)`, `sin(x)/x`, `1/ln(x)`
- Special functions: erf, Bessel, Gamma (except through definitions)
- Improper integrals (infinite bounds or discontinuities)
- Multi-variable integration
- Complex integration

### Known Issues

1. **Deep recursion:** Very complex expressions may hit maxDepth
2. **Simplification:** Results may not be in simplest form
3. **Numerical precision:** Numeric fallback has finite precision

---

## Testing

```bash
# Run all integration tests
pnpm test:server src/lib/mathAST/integration --run

# Run specific test file
pnpm test:server src/lib/mathAST/integration/__tests__/u-substitution.test.ts --run

# With watch mode
pnpm test:server src/lib/mathAST/integration
```

**Test coverage:** 324 tests across 9 test files

| Test File                   | Tests |
| --------------------------- | ----- |
| `rules.test.ts`             | 66    |
| `parts.test.ts`             | 44    |
| `integrate.test.ts`         | 37    |
| `partial-fractions.test.ts` | 37    |
| `trig-substitution.test.ts` | 35    |
| `step-recorder.test.ts`     | 35    |
| `numeric.test.ts`           | 34    |
| `u-substitution.test.ts`    | 33    |
| `euler-exponential.test.ts` | 3     |

---

## See Also

- [Calculus Module](calculus.md) - Differentiation
- [Normalization](normalization.md) - Canonical form used by patterns
- [Factory & Transforms](factory-transforms.md) - Creating math nodes
- [Types Reference](types.md) - MathNode types
